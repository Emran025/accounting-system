import { spawn } from 'node:child_process';
import { chmod, cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import {
  nonRelocatableBundleComponentPlist,
  relativeToAppContents,
} from './macos-app-bundle-policy.mjs';
import { verifyMachOPayload as verifyContainedMachOPayload } from './macos-macho.mjs';

const [target] = process.argv.slice(2);
const targetDefinition = targets()[target];
if (!targetDefinition) {
  throw new Error(
    `usage: build-server-desktop-macos-package.mjs <${Object.keys(targets()).join('|')}>`
  );
}
if (process.platform !== 'darwin') {
  throw new Error('macOS Server Desktop PKG generation must run on macOS');
}

const frontendRoot = resolve(import.meta.dirname, '..');
const version = JSON.parse(await readFile(join(frontendRoot, 'package.json'), 'utf8')).version;
const targetRoot = resolve(frontendRoot, 'src-tauri', 'target');
const outputRoot = resolve(targetRoot, 'server-desktop', target);
const stageRoot = resolve(targetRoot, 'server-desktop-stage', target);
const appSource = await findServerDesktopApp(targetRoot);
const appContract = await verifyAppBundle(appSource, target);
const packageName = `ACCORE.ERP.Server.Desktop_${version}_macos_${targetDefinition.architecture}.pkg`;
const packagePath = join(outputRoot, packageName);
const componentPlist = join(stageRoot, 'components.plist');

await rm(stageRoot, { recursive: true, force: true });
await rm(outputRoot, { recursive: true, force: true });
await mkdir(join(stageRoot, 'payload', 'Applications'), { recursive: true });
await mkdir(join(stageRoot, 'scripts'), { recursive: true });
await mkdir(outputRoot, { recursive: true });
await writeFile(
  componentPlist,
  nonRelocatableBundleComponentPlist(join('Applications', basename(appSource)))
);

const stagedApp = join(stageRoot, 'payload', 'Applications', basename(appSource));
await cp(appSource, stagedApp, { recursive: true, verbatimSymlinks: true });
await chmod(join(stagedApp, appContract.agentRelativePath), 0o755);
await writeInstallerScripts(appContract);
await run('pkgbuild', [
  '--root',
  join(stageRoot, 'payload'),
  '--component-plist',
  componentPlist,
  '--scripts',
  join(stageRoot, 'scripts'),
  '--ownership',
  'recommended',
  '--identifier',
  'com.accore.erp.server.desktop',
  '--version',
  version,
  '--install-location',
  '/',
  packagePath,
]);

await verifyPkgPayload(packagePath, target, appContract);
console.log(`Built and verified macOS Server Desktop PKG: ${packagePath}`);

async function findServerDesktopApp(root) {
  const candidates = (await findDirectories(root)).filter(
    (path) =>
      basename(path) === 'ACCORE ERP Server Desktop.app' &&
      path.replaceAll('\\', '/').includes('/bundle/macos/')
  );
  if (candidates.length !== 1) {
    throw new Error(
      `expected exactly one built Server Desktop app bundle, found ${candidates.length}: ${candidates.join(', ')}`
    );
  }
  return candidates[0];
}

async function verifyAppBundle(appRoot, runtimeTarget) {
  const expectedFiles = [
    join('Contents', 'Info.plist'),
    join('Contents', 'MacOS', 'accore-server'),
    join('Contents', 'Resources', 'resources', 'server-runtime', runtimeTarget, 'frankenphp'),
    join(
      'Contents',
      'Resources',
      'resources',
      'server-runtime',
      runtimeTarget,
      'mariadb',
      'bin',
      'mariadbd'
    ),
    join(
      'Contents',
      'Resources',
      'resources',
      'server-runtime',
      runtimeTarget,
      'mariadb',
      'bin',
      'mariadb-dump'
    ),
    join(
      'Contents',
      'Resources',
      'resources',
      'server-runtime',
      runtimeTarget,
      'mariadb',
      'scripts',
      'mariadb-install-db'
    ),
    join(
      'Contents',
      'Resources',
      'resources',
      'server-runtime',
      runtimeTarget,
      'mariadb',
      'bin',
      'my_print_defaults'
    ),
  ];
  for (const relativePath of expectedFiles) {
    await assertFile(join(appRoot, relativePath), `Server Desktop app payload ${relativePath}`);
  }
  const agentRelativePath = await discoverBundledAgent(appRoot);
  await assertExecutable(
    join(appRoot, agentRelativePath),
    `Server Desktop app sidecar ${agentRelativePath}`
  );
  await assertExecutable(
    join(
      appRoot,
      'Contents',
      'Resources',
      'resources',
      'server-runtime',
      runtimeTarget,
      'frankenphp'
    ),
    'embedded FrankenPHP'
  );
  await assertExecutable(
    join(
      appRoot,
      'Contents',
      'Resources',
      'resources',
      'server-runtime',
      runtimeTarget,
      'mariadb',
      'bin',
      'mariadbd'
    ),
    'embedded MariaDB'
  );
  await assertExecutable(
    join(
      appRoot,
      'Contents',
      'Resources',
      'resources',
      'server-runtime',
      runtimeTarget,
      'mariadb',
      'bin',
      'my_print_defaults'
    ),
    'embedded MariaDB defaults reader'
  );
  await verifyContainedMachOPayload(appRoot, 'Server Desktop .app bundle', {
    skipDirectory: (relativePath) => relativePath.endsWith('/app'),
  });
  return {
    agentRelativePath,
    agentContentsRelativePath: relativeToAppContents(agentRelativePath),
    runtimeRelativePath: join('Resources', 'resources', 'server-runtime', runtimeTarget),
  };
}

async function discoverBundledAgent(appRoot) {
  const macosRoot = join(appRoot, 'Contents', 'MacOS');
  const entries = await readdir(macosRoot, { withFileTypes: true });
  const candidates = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name === 'accore-server-agent' ||
          /^accore-server-agent-[a-z0-9_]+-apple-darwin$/.test(entry.name))
    )
    .map((entry) => join(macosRoot, entry.name));
  if (candidates.length !== 1) {
    throw new Error(
      `expected exactly one ACCORE Server Agent sidecar in ${macosRoot}, found ${candidates.length}: ${candidates.join(', ')}`
    );
  }
  return relative(appRoot, candidates[0]);
}

async function verifyPkgPayload(pkg, runtimeTarget, appContract) {
  await assertFile(pkg, 'Server Desktop PKG');
  const paths = (await runCapture('pkgutil', ['--payload-files', pkg]))
    .split('\n')
    .map((line) => line.trim().replace(/^\.\//, ''))
    .filter(Boolean);
  const applicationRoot = 'Applications/ACCORE ERP Server Desktop.app/Contents';
  const expected = [
    `${applicationRoot}/MacOS/accore-server`,
    `${applicationRoot}/${appContract.agentContentsRelativePath}`,
    `${applicationRoot}/Resources/resources/server-runtime/${runtimeTarget}/frankenphp`,
    `${applicationRoot}/Resources/resources/server-runtime/${runtimeTarget}/mariadb/bin/mariadbd`,
    `${applicationRoot}/Resources/resources/server-runtime/${runtimeTarget}/mariadb/bin/mariadb-dump`,
    `${applicationRoot}/Resources/resources/server-runtime/${runtimeTarget}/mariadb/bin/my_print_defaults`,
    `${applicationRoot}/Resources/resources/server-runtime/${runtimeTarget}/mariadb/scripts/mariadb-install-db`,
  ];
  for (const expectedPath of expected) {
    if (!paths.includes(expectedPath)) {
      throw new Error(`Server Desktop PKG is missing required payload file: ${expectedPath}`);
    }
  }
}

async function writeInstallerScripts(appContract) {
  const scriptsRoot = join(stageRoot, 'scripts');
  const preinstall = join(scriptsRoot, 'preinstall');
  const postinstall = join(scriptsRoot, 'postinstall');
  await writeFile(preinstall, desktopPreinstall());
  await writeFile(postinstall, desktopPostinstall(appContract));
  await chmod(preinstall, 0o755);
  await chmod(postinstall, 0o755);
}

function desktopPreinstall() {
  return `#!/bin/sh
set -eu
manifest='/Library/Application Support/ACCORE ERP/Server/server-instance.json'
label='im.accore.server-agent'
# Stop only a Desktop-owned daemon before replacing its .app. A Headless-owned
# daemon remains authoritative and must not be interrupted by installing its UI.
if [ -f "$manifest" ] && /usr/bin/grep -Eq '"ownerProduct"[[:space:]]*:[[:space:]]*"server-desktop"' "$manifest"; then
  /bin/launchctl bootout "system/$label" >/dev/null 2>&1 || true
fi
`;
}

function desktopPostinstall({ agentContentsRelativePath, runtimeRelativePath }) {
  const applicationRoot = '/Applications/ACCORE ERP Server Desktop.app/Contents';
  const agent = `${applicationRoot}/${agentContentsRelativePath}`;
  const runtime = `${applicationRoot}/${runtimeRelativePath.replaceAll('\\', '/')}`;
  return `#!/bin/sh
set -eu
agent='${agent}'
runtime='${runtime}'
headless_agent='/Library/ACCORE ERP/Server/accore-server-agent'
manifest='/Library/Application Support/ACCORE ERP/Server/server-instance.json'
[ -x "$agent" ] || { echo "ACCORE Server Desktop agent is missing: $agent" >&2; exit 1; }
[ -d "$runtime" ] || { echo "ACCORE Server Desktop runtime is missing: $runtime" >&2; exit 1; }
# A Headless package remains the service owner only when the protected manifest
# confirms it. A residual payload from a failed install must not suppress a
# Desktop runtime refresh.
if [ -x "$headless_agent" ] && [ -f "$manifest" ] && /usr/bin/grep -Eq '"ownerProduct"[[:space:]]*:[[:space:]]*"server-headless"' "$manifest"; then
  exec "$agent" attach --owner server-desktop
fi
exec "$agent" claim --owner server-desktop --runtime-root "$runtime"
`;
}

async function findDirectories(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const directories = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (!entry.isDirectory()) continue;
    directories.push(path, ...(await findDirectories(path)));
  }
  return directories;
}

async function assertFile(path, description) {
  const details = await stat(path).catch(() => null);
  if (!details?.isFile()) throw new Error(`${description} is missing: ${path}`);
}

async function assertExecutable(path, description) {
  await assertFile(path, description);
  const details = await stat(path);
  if ((details.mode & 0o111) === 0) throw new Error(`${description} is not executable: ${path}`);
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

function targets() {
  return {
    'macos-aarch64': { architecture: 'aarch64' },
    'macos-x86_64': { architecture: 'x86_64' },
  };
}
