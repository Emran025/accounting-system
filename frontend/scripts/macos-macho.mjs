import { lstat, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const SYSTEM_INSTALL_NAME_PREFIXES = ['/usr/lib/', '/System/Library/'];
const EXTERNAL_BUILD_PATH_PREFIXES = [
  '/opt/homebrew/',
  '/usr/local/',
  '/Library/Developer/',
  '/Applications/Xcode',
  '/private/var/',
  '/Users/',
  '/home/',
];

/**
 * Verify every Mach-O file in an installable payload. Dynamic library names are
 * accepted only when they are macOS system paths or resolve to an existing file
 * contained by the supplied payload. The resolver deliberately rejects absolute
 * package paths because they are deployment-location dependent.
 */
export async function verifyMachOPayload(root, description, options = {}) {
  const payloadRoot = await realpath(root).catch(() => {
    throw new Error(`${description} does not exist: ${root}`);
  });
  const candidates = await collectMachOFiles(payloadRoot, options.skipDirectory);
  if (candidates.length === 0) {
    throw new Error(`no Mach-O files found in ${description}: ${payloadRoot}`);
  }

  const executablePaths = candidates
    .filter((candidate) => /\bexecutable\b/i.test(candidate.fileDescription))
    .map((candidate) => candidate.path);

  for (const candidate of candidates) {
    await verifyMachOFile(candidate.path, payloadRoot, executablePaths, description);
  }

  console.log(`Verified ${candidates.length} Mach-O file(s) in ${description}`);
  return candidates.map((candidate) => candidate.path);
}

/**
 * FrankenPHP v1.12.7 for macOS has a known inert /usr/local/lib LC_RPATH. It
 * may be removed only when the binary has no @rpath dependency that could use
 * it. The caller must run the binary afterward and then run verifyMachOPayload.
 */
export async function removeInertFrankenPhpRpath(frankenPhp) {
  const dependencies = await dynamicInstallNames(frankenPhp);
  if (dependencies.some((dependency) => dependency.startsWith('@rpath/'))) {
    throw new Error(
      `refuse to remove FrankenPHP /usr/local/lib RPATH while @rpath dependencies exist: ${frankenPhp}`
    );
  }

  for (const searchPath of await machORuntimeSearchPaths(frankenPhp)) {
    if (searchPath === '/usr/local/lib') {
      await run('install_name_tool', ['-delete_rpath', searchPath, frankenPhp]);
    }
  }
}

async function verifyMachOFile(candidate, payloadRoot, executablePaths, description) {
  const candidateLabel = relative(payloadRoot, candidate) || candidate;
  const rpaths = await machORuntimeSearchPaths(candidate);
  for (const rpath of rpaths) {
    await assertRuntimeSearchPathResolves(
      rpath,
      candidate,
      executablePaths,
      payloadRoot,
      description
    );
  }

  for (const installName of await dynamicInstallNames(candidate)) {
    await assertInstallNameResolves(
      installName,
      candidate,
      rpaths,
      executablePaths,
      payloadRoot,
      description
    );
  }

  const installNameId = await dynamicLibraryId(candidate);
  if (installNameId) assertDynamicLibraryIdIsPortable(installNameId, candidate, description);

  if (rpaths.some((rpath) => isExternalBuildPath(rpath))) {
    throw new Error(`${description} retains an external LC_RPATH: ${candidateLabel}`);
  }
}

function assertDynamicLibraryIdIsPortable(installNameId, candidate, description) {
  // LC_ID_DYLIB is the library's advertised identity, not a load operation.
  // Its @rpath form is resolved by consumers' LC_RPATH values, which are
  // independently checked above. Reject only identities that hard-code an
  // external build or installation path.
  if (SYSTEM_INSTALL_NAME_PREFIXES.some((prefix) => installNameId.startsWith(prefix))) return;
  if (
    installNameId.startsWith('@loader_path') ||
    installNameId.startsWith('@executable_path') ||
    installNameId.startsWith('@rpath')
  ) {
    return;
  }
  if (isExternalBuildPath(installNameId) || installNameId.startsWith('/')) {
    throw new Error(`${description} has an external LC_ID_DYLIB: ${candidate} -> ${installNameId}`);
  }
  throw new Error(
    `${description} has an unsupported LC_ID_DYLIB: ${candidate} -> ${installNameId}`
  );
}

async function assertInstallNameResolves(
  installName,
  candidate,
  rpaths,
  executablePaths,
  payloadRoot,
  description
) {
  if (SYSTEM_INSTALL_NAME_PREFIXES.some((prefix) => installName.startsWith(prefix))) return;
  if (isExternalBuildPath(installName)) {
    throw new Error(`${description} loads an external dependency: ${candidate} -> ${installName}`);
  }

  if (installName === '@loader_path' || installName.startsWith('@loader_path/')) {
    await assertContainedExistingFile(
      payloadRoot,
      dirname(candidate),
      installName === '@loader_path' ? '' : installName.slice('@loader_path/'.length),
      `${candidate} -> ${installName}`
    );
    return;
  }

  if (installName === '@executable_path' || installName.startsWith('@executable_path/')) {
    const suffix =
      installName === '@executable_path' ? '' : installName.slice('@executable_path/'.length);
    await assertAnyContainedExistingFile(
      payloadRoot,
      executablePaths.map((path) => dirname(path)),
      suffix,
      `${candidate} -> ${installName}`
    );
    return;
  }

  if (installName.startsWith('@rpath/')) {
    const suffix = installName.slice('@rpath/'.length);
    const rpathBases = await resolveRpathBases(rpaths, candidate, executablePaths, payloadRoot);
    await assertAnyContainedExistingFile(
      payloadRoot,
      rpathBases,
      suffix,
      `${candidate} -> ${installName}`
    );
    return;
  }

  throw new Error(
    `${description} has an unsupported Mach-O install name: ${candidate} -> ${installName}`
  );
}

async function assertRuntimeSearchPathResolves(
  searchPath,
  candidate,
  executablePaths,
  payloadRoot,
  description
) {
  if (isExternalBuildPath(searchPath) || searchPath.startsWith('/')) {
    throw new Error(`${description} has an external LC_RPATH: ${candidate} -> ${searchPath}`);
  }
  const bases = await resolveRpathBases([searchPath], candidate, executablePaths, payloadRoot);
  if (bases.length === 0) {
    throw new Error(`${description} has an unresolved LC_RPATH: ${candidate} -> ${searchPath}`);
  }
}

async function resolveRpathBases(rpaths, candidate, executablePaths, payloadRoot) {
  const bases = [];
  for (const rpath of rpaths) {
    if (rpath === '@loader_path' || rpath.startsWith('@loader_path/')) {
      const base = await containedExistingDirectory(
        payloadRoot,
        dirname(candidate),
        rpath === '@loader_path' ? '' : rpath.slice('@loader_path/'.length)
      );
      if (base) bases.push(base);
      continue;
    }
    if (rpath === '@executable_path' || rpath.startsWith('@executable_path/')) {
      const suffix = rpath === '@executable_path' ? '' : rpath.slice('@executable_path/'.length);
      for (const executable of executablePaths) {
        const base = await containedExistingDirectory(payloadRoot, dirname(executable), suffix);
        if (base) bases.push(base);
      }
      continue;
    }
    if (rpath.startsWith('@rpath/')) {
      throw new Error(`nested @rpath is not a safe LC_RPATH policy: ${candidate} -> ${rpath}`);
    }
    if (rpath.startsWith('/')) {
      throw new Error(
        `absolute LC_RPATH is not portable or self-contained: ${candidate} -> ${rpath}`
      );
    }
    throw new Error(`relative LC_RPATH is not a safe package policy: ${candidate} -> ${rpath}`);
  }
  return [...new Set(bases)];
}

async function assertAnyContainedExistingFile(payloadRoot, bases, suffix, description) {
  for (const base of bases) {
    const found = await containedExistingFile(payloadRoot, base, suffix);
    if (found) return found;
  }
  throw new Error(`Mach-O reference does not resolve inside the payload: ${description}`);
}

async function assertContainedExistingFile(payloadRoot, base, suffix, description) {
  const found = await containedExistingFile(payloadRoot, base, suffix);
  if (!found)
    throw new Error(`Mach-O reference does not resolve inside the payload: ${description}`);
  return found;
}

async function containedExistingDirectory(payloadRoot, base, suffix) {
  const candidate = resolve(base, suffix);
  if (!isWithin(payloadRoot, candidate)) return null;
  const details = await stat(candidate).catch(() => null);
  if (!details?.isDirectory()) return null;
  const canonical = await realpath(candidate).catch(() => null);
  return canonical && isWithin(payloadRoot, canonical) ? canonical : null;
}

async function containedExistingFile(payloadRoot, base, suffix) {
  const candidate = resolve(base, suffix);
  if (!isWithin(payloadRoot, candidate)) return null;
  const details = await stat(candidate).catch(() => null);
  if (!details?.isFile()) return null;
  const canonical = await realpath(candidate).catch(() => null);
  return canonical && isWithin(payloadRoot, canonical) ? canonical : null;
}

async function collectMachOFiles(root, skipDirectory = () => false) {
  const candidates = [];
  await collect(root, root, skipDirectory, candidates);
  return candidates;
}

async function collect(root, directory, skipDirectory, candidates) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    const entryRelativePath = relative(root, path).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (!skipDirectory(entryRelativePath)) await collect(root, path, skipDirectory, candidates);
      continue;
    }
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;

    const details = await lstat(path);
    if (details.isSymbolicLink()) {
      const target = await realpath(path).catch(() => null);
      if (!target || !isWithin(root, target)) {
        throw new Error(`payload symbolic link escapes its root: ${path}`);
      }
      const targetDetails = await stat(target);
      if (!targetDetails.isFile()) continue;
    }

    const canonical = await realpath(path).catch(() => path);
    const fileDescription = await runCapture('file', ['-b', canonical]);
    if (fileDescription.includes('Mach-O')) candidates.push({ path: canonical, fileDescription });
  }
}

async function dynamicInstallNames(candidate) {
  return (await runCapture('otool', ['-L', candidate]))
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(' (')[0])
    .filter(Boolean);
}

async function dynamicLibraryId(candidate) {
  const lines = (await runCapture('otool', ['-D', candidate]))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 1 ? lines[1] : null;
}

async function machORuntimeSearchPaths(candidate) {
  const lines = (await runCapture('otool', ['-l', candidate])).split('\n');
  const paths = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== 'cmd LC_RPATH') continue;
    const pathLine = lines
      .slice(index + 1, index + 5)
      .find((line) => line.trim().startsWith('path '));
    const match = pathLine?.trim().match(/^path (.+) \(offset \d+\)$/);
    if (!match) throw new Error(`could not parse LC_RPATH in ${candidate}`);
    paths.push(match[1]);
  }
  return paths;
}

function isExternalBuildPath(value) {
  return EXTERNAL_BUILD_PATH_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function isWithin(root, candidate) {
  const difference = relative(root, candidate);
  return (
    difference === '' ||
    (!difference.startsWith(`..${sep}`) && difference !== '..' && !difference.startsWith('..'))
  );
}

async function run(command, args) {
  await new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.once('error', rejectCommand);
    child.once('exit', (code) =>
      code === 0
        ? resolveCommand()
        : rejectCommand(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    );
  });
}

async function runCapture(command, args) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', rejectCommand);
    child.once('exit', (code) => {
      if (code === 0) return resolveCommand(stdout);
      rejectCommand(
        new Error(`${command} ${args.join(' ')} exited with code ${code}: ${stderr.trim()}`)
      );
    });
  });
}
