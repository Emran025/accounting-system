import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const [target = hostTarget(), destinationArgument] = process.argv.slice(2);
const definition = getTargets()[target];
if (!definition) {
  throw new Error(
    `unsupported Server Desktop runtime target ${target}; supported targets: ${Object.keys(getTargets()).join(', ')}`
  );
}

const frontendRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(frontendRoot, '..');
const destinationRoot = resolve(
  destinationArgument ?? join(frontendRoot, 'src-tauri', 'resources', 'server-runtime', target)
);
const cacheRoot = resolve(
  process.env.ACCORE_RUNTIME_DOWNLOAD_CACHE ?? join(repositoryRoot, '.runtime-cache', target)
);

await mkdir(cacheRoot, { recursive: true });
await rm(destinationRoot, { recursive: true, force: true });
await mkdir(destinationRoot, { recursive: true });

await stageFrankenPhp();
await stageMariaDb();
await stageApplication();
await stageRuntimeConfiguration();
await verifyRuntime();

await writeFile(
  join(destinationRoot, 'runtime-source.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      target,
      generatedAt: new Date().toISOString(),
      frankenPhp: definition.frankenPhp,
      mariadb: definition.mariadb,
    },
    null,
    2
  )}\n`
);

console.log(`Prepared verified Server Desktop runtime for ${target} in ${destinationRoot}`);

async function stageFrankenPhp() {
  const sourcePath = await downloadVerified(definition.frankenPhp);
  if (definition.frankenPhp.format) {
    await extractArchive(sourcePath, destinationRoot, definition.frankenPhp.format);
  } else {
    const destination = join(destinationRoot, definition.layout.frankenPhp);
    await cp(sourcePath, destination);
    if (process.platform !== 'win32') await chmod(destination, 0o755);
  }
}

async function stageMariaDb() {
  if (definition.mariadb.kind === 'archive') {
    const archivePath = await downloadVerified(definition.mariadb);
    await extractArchive(archivePath, destinationRoot, definition.mariadb.format);
    return;
  }

  if (definition.mariadb.kind === 'source-build') {
    await buildMariaDbFromSource(definition.mariadb);
    return;
  }

  throw new Error(`unsupported MariaDB staging strategy for ${target}`);
}

async function buildMariaDbFromSource(source) {
  const archivePath = await downloadVerified(source);
  const sourceRoot = join(cacheRoot, `${source.id}-source`);
  const buildRoot = join(cacheRoot, `${source.id}-build`);
  const installRoot = join(destinationRoot, definition.layout.mariadbRoot);
  await rm(sourceRoot, { recursive: true, force: true });
  await rm(buildRoot, { recursive: true, force: true });
  await mkdir(sourceRoot, { recursive: true });
  await extractArchive(archivePath, sourceRoot, source.format);

  const entries = await (
    await import('node:fs/promises')
  ).readdir(sourceRoot, { withFileTypes: true });
  const extractedDirectory = entries.find((entry) => entry.isDirectory())?.name;
  if (!extractedDirectory)
    throw new Error(`MariaDB source archive did not extract into a directory for ${target}`);

  const prefixPath = process.env.ACCORE_MARIADB_PREFIX;
  if (prefixPath) {
    await cp(resolve(prefixPath), installRoot, { recursive: true });
    return;
  }

  const sourceDirectory = join(sourceRoot, extractedDirectory);
  const cmakeArgs = [
    '-S',
    sourceDirectory,
    '-B',
    buildRoot,
    '-DCMAKE_BUILD_TYPE=Release',
    `-DCMAKE_INSTALL_PREFIX=${installRoot}`,
    // Keep the shipped database deliberately small and remove engines that
    // introduce optional native dependencies. InnoDB, Aria and MyISAM remain.
    '-DPLUGIN_ROCKSDB=NO',
    '-DPLUGIN_ARCHIVE=NO',
    '-DPLUGIN_MROONGA=NO',
    '-DPLUGIN_CONNECT=NO',
    '-DPLUGIN_SPIDER=NO',
    '-DPLUGIN_OQGRAPH=NO',
    '-DPLUGIN_SPHINX=NO',
    '-DWITH_WSREP=OFF',
    '-DWITH_MARIABACKUP=OFF',
    '-DWITH_EMBEDDED_SERVER=OFF',
    '-DWITH_UNIT_TESTS=OFF',
    // These source-tree implementations keep runtime TLS, regex and zlib
    // dependencies out of Homebrew and outside the installed client package.
    '-DWITH_SSL=bundled',
    '-DWITH_PCRE=bundled',
    '-DWITH_ZLIB=bundled',
  ];
  const buildEnvironment = {};
  if (process.platform === 'darwin') {
    const macSdkRoot = process.env.ACCORE_MACOS_SDKROOT ?? process.env.SDKROOT;
    if (macSdkRoot) cmakeArgs.push(`-DCMAKE_OSX_SYSROOT=${macSdkRoot}`);
    if (process.env.CC) cmakeArgs.push(`-DCMAKE_C_COMPILER=${process.env.CC}`);
    if (process.env.CXX) cmakeArgs.push(`-DCMAKE_CXX_COMPILER=${process.env.CXX}`);

    // Compile tools may be supplied by the hosted runner, but generated code
    // must discover headers and libraries only through the selected SDK or
    // MariaDB's bundled sources. Do not edit CMake-generated makefiles.
    Object.assign(buildEnvironment, {
      CFLAGS: '',
      CXXFLAGS: '',
      CPPFLAGS: '',
      LDFLAGS: '',
      CPATH: '',
      C_INCLUDE_PATH: '',
      CPLUS_INCLUDE_PATH: '',
      OBJC_INCLUDE_PATH: '',
      LIBRARY_PATH: '',
      CMAKE_PREFIX_PATH: '',
      CMAKE_INCLUDE_PATH: '',
      CMAKE_LIBRARY_PATH: '',
      CMAKE_FRAMEWORK_PATH: '',
      SDKROOT: macSdkRoot ?? '',
    });
  }
  await run('cmake', cmakeArgs, buildEnvironment);
  await run(
    'cmake',
    ['--build', buildRoot, '--parallel', process.env.ACCORE_RUNTIME_BUILD_JOBS ?? '3', '--verbose'],
    buildEnvironment
  );
  await run('cmake', ['--install', buildRoot], buildEnvironment);
}

async function stageApplication() {
  const applicationRoot = join(destinationRoot, 'app');
  await assertFile(join(repositoryRoot, 'backend', 'vendor', 'autoload.php'));
  await cp(join(repositoryRoot, 'backend'), applicationRoot, {
    recursive: true,
    filter: (source) => {
      const relative = source.slice(join(repositoryRoot, 'backend').length).replaceAll('\\', '/');
      return !['/.env', '/storage', '/tests', '/.phpunit.result.cache', '/node_modules'].some(
        (segment) => relative === segment || relative.startsWith(`${segment}/`)
      );
    },
  });
}

async function stageRuntimeConfiguration() {
  const caddyfile = `{
  auto_https off
  admin off
  frankenphp
}

http://127.0.0.1:8765 {
  root * "{env.ACCORE_APP_ROOT}/public"
  encode zstd gzip
  php_server
}
`;
  await writeFile(join(destinationRoot, 'Caddyfile'), caddyfile);

  if (definition.layout.phpExtensionsDirectory) {
    const phpExtensions = ['curl', 'fileinfo', 'mbstring', 'mysqli', 'openssl', 'pdo_mysql', 'zip'];
    for (const extension of phpExtensions) {
      await assertFile(
        join(destinationRoot, definition.layout.phpExtensionsDirectory, `php_${extension}.dll`)
      );
    }
    const phpProductionIni = await readFile(join(destinationRoot, 'php.ini-production'), 'utf8');
    await writeFile(
      join(destinationRoot, 'php.ini'),
      `${phpProductionIni}\n; ACCORE Server Desktop embedded runtime extensions\nextension_dir = "${definition.layout.phpExtensionsDirectory}"\n${phpExtensions.map((extension) => `extension=${extension}`).join('\n')}\n`
    );
  }
}

async function verifyRuntime() {
  await assertFile(join(destinationRoot, definition.layout.frankenPhp));
  await assertFile(
    join(destinationRoot, definition.layout.mariadbRoot, 'bin', definition.layout.mariadbd)
  );
  await assertFile(
    join(destinationRoot, definition.layout.mariadbRoot, 'bin', definition.layout.mariadb)
  );
  await assertFile(
    join(destinationRoot, definition.layout.mariadbRoot, 'bin', definition.layout.mariadbDump)
  );
  await assertFile(
    join(destinationRoot, definition.layout.mariadbRoot, definition.layout.mariadbInstallDb)
  );
  if (process.platform === 'darwin') await verifyMacosRuntimeLinkage();
}

async function verifyMacosRuntimeLinkage() {
  const mariaDbBin = join(destinationRoot, definition.layout.mariadbRoot, 'bin');
  const candidates = [
    join(destinationRoot, definition.layout.frankenPhp),
    join(mariaDbBin, definition.layout.mariadbd),
    join(mariaDbBin, definition.layout.mariadb),
    join(mariaDbBin, definition.layout.mariadbDump),
    ...(await collectDynamicLibraries(join(destinationRoot, definition.layout.mariadbRoot))),
  ];
  const rejectedPrefixes = [
    '/opt/homebrew/',
    '/usr/local/',
    '/Library/Developer/',
    '/Applications/Xcode',
  ];
  const allowedPrefixes = [
    '/usr/lib/',
    '/System/Library/',
    '@loader_path/',
    '@executable_path/',
    '@rpath/',
  ];
  for (const candidate of [...new Set(candidates)]) {
    const output = await runCapture('otool', ['-L', candidate]);
    for (const dependency of output.split('\n').slice(1)) {
      const installName = dependency.trim().split(' (')[0];
      if (!installName) continue;
      if (rejectedPrefixes.some((prefix) => installName.startsWith(prefix))) {
        throw new Error(
          `macOS runtime dependency points outside the package: ${candidate} -> ${installName}`
        );
      }
      if (!allowedPrefixes.some((prefix) => installName.startsWith(prefix))) {
        throw new Error(
          `macOS runtime dependency has an unsupported install name: ${candidate} -> ${installName}`
        );
      }
    }
    await verifyMacosRuntimeSearchPaths(candidate, rejectedPrefixes, allowedPrefixes);
  }
}

async function verifyMacosRuntimeSearchPaths(candidate, rejectedPrefixes, allowedPrefixes) {
  const lines = (await runCapture('otool', ['-l', candidate])).split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== 'cmd LC_RPATH') continue;
    const pathLine = lines
      .slice(index + 1, index + 5)
      .find((line) => line.trim().startsWith('path '));
    const match = pathLine?.trim().match(/^path (.+) \(offset \d+\)$/);
    if (!match) throw new Error(`could not parse macOS runtime search path in ${candidate}`);
    const runtimeSearchPath = match[1];
    if (rejectedPrefixes.some((prefix) => runtimeSearchPath.startsWith(prefix))) {
      throw new Error(
        `macOS runtime search path points outside the package: ${candidate} -> ${runtimeSearchPath}`
      );
    }
    if (!allowedPrefixes.some((prefix) => runtimeSearchPath.startsWith(prefix))) {
      throw new Error(
        `macOS runtime search path is unsupported: ${candidate} -> ${runtimeSearchPath}`
      );
    }
  }
}

async function collectDynamicLibraries(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const libraries = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) libraries.push(...(await collectDynamicLibraries(path)));
    else if (entry.isFile() && (entry.name.endsWith('.dylib') || entry.name.endsWith('.so'))) {
      libraries.push(path);
    }
  }
  return libraries;
}

async function downloadVerified(source) {
  const archivePath = join(cacheRoot, source.archive);
  if (await hasExpectedDigest(archivePath, source.sha256)) return archivePath;

  const temporaryPath = `${archivePath}.partial`;
  await rm(temporaryPath, { force: true });
  const response = await fetchWithRetries(source);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryPath));
  if (!(await hasExpectedDigest(temporaryPath, source.sha256))) {
    await rm(temporaryPath, { force: true });
    throw new Error(`SHA-256 mismatch for ${source.id}`);
  }
  await rename(temporaryPath, archivePath);
  return archivePath;
}

async function fetchWithRetries(source) {
  const maximumAttempts = 4;
  let lastError;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      const response = await fetch(source.url, { redirect: 'follow' });
      if (response.ok && response.body) return response;
      await response.body?.cancel();
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const error = new Error(`failed to download ${source.id}: HTTP ${response.status}`);
        error.permanent = true;
        throw error;
      }
      lastError = new Error(`failed to download ${source.id}: HTTP ${response.status}`);
    } catch (error) {
      if (error?.permanent) throw error;
      lastError = error;
    }

    if (attempt < maximumAttempts) {
      const delayMilliseconds = attempt * 5_000;
      console.warn(
        `download attempt ${attempt}/${maximumAttempts} failed for ${source.id}; retrying in ${delayMilliseconds}ms`
      );
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMilliseconds));
    }
  }

  throw new Error(`failed to download ${source.id} after ${maximumAttempts} attempts`, {
    cause: lastError,
  });
}

async function hasExpectedDigest(path, expected) {
  try {
    const digest = await new Promise((resolveDigest, rejectDigest) => {
      const hash = createHash('sha256');
      const stream = createReadStream(path);
      stream.once('error', rejectDigest);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.once('end', () => resolveDigest(hash.digest('hex')));
    });
    return digest === expected;
  } catch {
    return false;
  }
}

async function extractArchive(archivePath, destination, format) {
  if (format === 'zip') {
    const command = process.platform === 'win32' ? 'powershell.exe' : 'unzip';
    const commandArgs =
      process.platform === 'win32'
        ? [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${destination.replaceAll("'", "''")}' -Force`,
          ]
        : ['-q', archivePath, '-d', destination];
    await run(command, commandArgs);
    return;
  }
  if (format === 'tar.gz') {
    await run('tar', ['-xzf', archivePath, '-C', destination]);
    return;
  }
  throw new Error(`unsupported archive format ${format} for ${basename(archivePath)}`);
}

async function assertFile(path) {
  const details = await stat(path).catch(() => null);
  if (!details?.isFile()) throw new Error(`expected runtime executable is missing: ${path}`);
}

async function run(command, args, additionalEnvironment = {}) {
  await new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ...additionalEnvironment },
    });
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

function hostTarget() {
  if (process.platform === 'win32') return 'windows-x86_64';
  if (process.platform === 'darwin')
    return process.arch === 'arm64' ? 'macos-aarch64' : 'macos-x86_64';
  if (process.platform === 'linux' && process.arch === 'x64') return 'linux-x86_64';
  throw new Error(
    `cannot infer a Server Desktop runtime target for ${process.platform}/${process.arch}`
  );
}

function getTargets() {
  return {
    'windows-x86_64': {
      frankenPhp: {
        id: 'frankenphp',
        url: 'https://github.com/php/frankenphp/releases/download/v1.12.7/frankenphp-windows-x86_64.zip',
        sha256: 'c382cf6169d5175c30d918ba7a09d6eb8601c6c339470e7fbb87f0b40d9bf254',
        archive: 'frankenphp-windows-x86_64.zip',
        format: 'zip',
      },
      mariadb: {
        id: 'mariadb',
        kind: 'archive',
        url: 'https://archive.mariadb.org/mariadb-11.4.9/winx64-packages/mariadb-11.4.9-winx64.zip',
        sha256: '802f9f40a9dca774a3ba62f39c21093942954f178d6d7d458dc51453929bcdda',
        archive: 'mariadb-11.4.9-winx64.zip',
        format: 'zip',
      },
      layout: {
        frankenPhp: 'frankenphp.exe',
        mariadbRoot: 'mariadb-11.4.9-winx64',
        mariadbd: 'mariadbd.exe',
        mariadb: 'mariadb.exe',
        mariadbDump: 'mariadb-dump.exe',
        mariadbInstallDb: 'bin/mariadb-install-db.exe',
        phpExtensionsDirectory: 'ext',
      },
    },
    'linux-x86_64': {
      frankenPhp: {
        id: 'frankenphp',
        url: 'https://github.com/php/frankenphp/releases/download/v1.12.7/frankenphp-linux-x86_64',
        sha256: '3cbe9c51815182892aa625e40e8b83440b1d8c62cb39bf8d76538ece75449552',
        archive: 'frankenphp-linux-x86_64',
      },
      mariadb: {
        id: 'mariadb',
        kind: 'archive',
        url: 'https://archive.mariadb.org/mariadb-11.4.9/bintar-linux-systemd-x86_64/mariadb-11.4.9-linux-systemd-x86_64.tar.gz',
        sha256: 'c079403239fa74900c18ae0f2d99806625b3ae936c8983dd39a96c8b237072da',
        archive: 'mariadb-11.4.9-linux-systemd-x86_64.tar.gz',
        format: 'tar.gz',
      },
      layout: {
        frankenPhp: 'frankenphp',
        mariadbRoot: 'mariadb-11.4.9-linux-systemd-x86_64',
        mariadbd: 'mariadbd',
        mariadb: 'mariadb',
        mariadbDump: 'mariadb-dump',
        mariadbInstallDb: 'scripts/mariadb-install-db',
      },
    },
    'macos-aarch64': macDefinition(
      'arm64',
      'd5ac0ab9f7796ae1b55a244064c25d56e3a3bfdec266d08c9bf2c7d18a7ffcf2'
    ),
    'macos-x86_64': macDefinition(
      'x86_64',
      'dacae5e6cab284475c33afe5ab6f5b37e0b119215d2ce462ca149ea497d0448a'
    ),
  };
}

function macDefinition(architecture, sha256) {
  return {
    frankenPhp: {
      id: 'frankenphp',
      url: `https://github.com/php/frankenphp/releases/download/v1.12.7/frankenphp-mac-${architecture}`,
      sha256,
      archive: `frankenphp-mac-${architecture}`,
    },
    mariadb: {
      id: 'mariadb',
      kind: 'source-build',
      url: 'https://archive.mariadb.org/mariadb-11.4.9/source/mariadb-11.4.9.tar.gz',
      sha256: '8e481ca29b5a740444d45451c8ea2d93711cf525d6fa5d27bc9512cf8973b075',
      archive: 'mariadb-11.4.9.tar.gz',
      format: 'tar.gz',
    },
    layout: {
      frankenPhp: 'frankenphp',
      mariadbRoot: 'mariadb',
      mariadbd: 'mariadbd',
      mariadb: 'mariadb',
      mariadbDump: 'mariadb-dump',
      mariadbInstallDb: 'mariadb-install-db',
    },
  };
}
