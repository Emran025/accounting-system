import { chmod, cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { isLaravelSecretEnvironmentPath } from './laravel-runtime-payload-policy.mjs';
import { verifyMachOPayload } from './macos-macho.mjs';

const [target] = process.argv.slice(2);
if (!target || !getTargets()[target]) {
  throw new Error(
    `usage: build-server-headless-package.mjs <${Object.keys(getTargets()).join('|')}>`
  );
}

const frontendRoot = resolve(import.meta.dirname, '..');
const version = JSON.parse(await readFile(join(frontendRoot, 'package.json'), 'utf8')).version;
const outputRoot = resolve(frontendRoot, 'src-tauri', 'target', 'server-headless', target);
const stageRoot = resolve(frontendRoot, 'src-tauri', 'target', 'server-headless-stage', target);
const targetDefinition = getTargets()[target];
const agentSource = resolve(frontendRoot, 'src-tauri', 'binaries', targetDefinition.agentSource);
const runtimeSource = resolve(frontendRoot, 'src-tauri', 'resources', 'server-runtime', target);

await assertFile(agentSource, 'Server Headless Agent sidecar');
await assertFile(
  join(runtimeSource, targetDefinition.frankenPhp),
  'Server Headless FrankenPHP runtime'
);
await assertFile(
  join(runtimeSource, targetDefinition.mariadbRoot, 'bin', targetDefinition.mariadbd),
  'Server Headless MariaDB runtime'
);

await rm(stageRoot, { recursive: true, force: true });
await rm(outputRoot, { recursive: true, force: true });
await mkdir(stageRoot, { recursive: true });
await mkdir(outputRoot, { recursive: true });

if (targetDefinition.platform === 'linux') {
  await buildLinuxPackages();
} else {
  await buildMacPackage();
}

async function buildLinuxPackages() {
  const filesystemRoot = join(stageRoot, 'filesystem');
  const installationRoot = join(filesystemRoot, 'opt', 'accore-erp', 'server');
  const debianRoot = join(stageRoot, 'debian');
  const rpmRoot = join(stageRoot, 'rpm');

  await stageInstallation(installationRoot);
  await mkdir(debianRoot, { recursive: true });
  await cp(filesystemRoot, debianRoot, { recursive: true, verbatimSymlinks: true });
  await writeDebianControl(join(debianRoot, 'DEBIAN'));
  await run('dpkg-deb', [
    '--root-owner-group',
    '--build',
    debianRoot,
    join(outputRoot, `accore-erp-server-headless_${version}_amd64.deb`),
  ]);

  await mkdir(join(rpmRoot, 'BUILD'), { recursive: true });
  await mkdir(join(rpmRoot, 'BUILDROOT'), { recursive: true });
  await mkdir(join(rpmRoot, 'RPMS'), { recursive: true });
  await mkdir(join(rpmRoot, 'SOURCES'), { recursive: true });
  await mkdir(join(rpmRoot, 'SPECS'), { recursive: true });
  await cp(filesystemRoot, join(rpmRoot, 'SOURCES', 'root'), {
    recursive: true,
    verbatimSymlinks: true,
  });
  const specPath = join(rpmRoot, 'SPECS', 'accore-server-headless.spec');
  await writeFile(specPath, rpmSpec());
  await run('rpmbuild', ['--define', `_topdir ${rpmRoot}`, '-bb', specPath]);
  await copyProducedRpm(join(rpmRoot, 'RPMS'), outputRoot);

  const tarballRoot = join(stageRoot, 'tarball');
  await cp(filesystemRoot, tarballRoot, { recursive: true, verbatimSymlinks: true });
  await run('tar', [
    '-C',
    tarballRoot,
    '-czf',
    join(outputRoot, `accore-erp-server-headless_${version}_linux_x86_64.tar.gz`),
    '.',
  ]);
}

async function buildMacPackage() {
  const payloadRoot = join(stageRoot, 'payload');
  const installationRoot = join(payloadRoot, 'Library', 'ACCORE ERP', 'Server');
  const scriptsRoot = join(stageRoot, 'scripts');
  await stageInstallation(installationRoot);
  await verifyMacStagedPayload(installationRoot);
  await mkdir(scriptsRoot, { recursive: true });
  await writeFile(join(scriptsRoot, 'postinstall'), macPostinstall());
  await writeFile(join(scriptsRoot, 'preinstall'), macPreinstall());
  await chmod(join(scriptsRoot, 'postinstall'), 0o755);
  await chmod(join(scriptsRoot, 'preinstall'), 0o755);
  const packagePath = join(
    outputRoot,
    `ACCORE.ERP.Server.Headless_${version}_macos_${targetDefinition.architecture}.pkg`
  );
  await run('pkgbuild', [
    '--root',
    payloadRoot,
    '--scripts',
    scriptsRoot,
    '--ownership',
    'recommended',
    '--identifier',
    'com.accore.erp.server.headless',
    '--version',
    version,
    '--install-location',
    '/',
    packagePath,
  ]);
  await verifyMacPackage(packagePath);
}

async function verifyMacPackage(packagePath) {
  await assertFile(packagePath, 'Server Headless macOS PKG');
  const payloadFiles = (await runCapture('pkgutil', ['--payload-files', packagePath]))
    .split('\n')
    .map((line) => line.trim().replace(/^\.\//, ''))
    .filter(Boolean);
  const installationRoot = 'Library/ACCORE ERP/Server';
  const required = [
    `${installationRoot}/accore-server-agent`,
    `${installationRoot}/resources/server-runtime/${target}/Caddyfile`,
    `${installationRoot}/resources/server-runtime/${target}/frankenphp`,
    `${installationRoot}/resources/server-runtime/${target}/${targetDefinition.mariadbRoot}/bin/${targetDefinition.mariadbd}`,
    `${installationRoot}/resources/server-runtime/${target}/${targetDefinition.mariadbRoot}/bin/mariadb-dump`,
    `${installationRoot}/resources/server-runtime/${target}/${targetDefinition.mariadbRoot}/scripts/mariadb-install-db`,
  ];
  for (const relativePath of required) {
    if (!payloadFiles.includes(relativePath)) {
      throw new Error(
        `Server Headless macOS PKG is missing required payload file: ${relativePath}`
      );
    }
  }
  if (payloadFiles.some(isLaravelSecretEnvironmentPath)) {
    throw new Error('Server Headless macOS PKG must not contain a Laravel .env file');
  }
}

async function verifyMacStagedPayload(installationRoot) {
  const runtime = join(installationRoot, 'resources', 'server-runtime', target);
  const required = [
    join(installationRoot, targetDefinition.agentDestination),
    join(runtime, 'Caddyfile'),
    join(runtime, 'frankenphp'),
    join(runtime, targetDefinition.mariadbRoot, 'bin', targetDefinition.mariadbd),
    join(runtime, targetDefinition.mariadbRoot, 'bin', 'mariadb-dump'),
    join(runtime, targetDefinition.mariadbRoot, 'scripts', 'mariadb-install-db'),
  ];
  for (const path of required) await assertFile(path, 'Server Headless macOS staged payload');
  await verifyMachOPayload(installationRoot, 'Server Headless macOS staged payload', {
    skipDirectory: (relativePath) => relativePath.endsWith('/app'),
  });
}

async function stageInstallation(installationRoot) {
  await mkdir(installationRoot, { recursive: true });
  const agentDestination = join(installationRoot, targetDefinition.agentDestination);
  await cp(agentSource, agentDestination);
  await cp(runtimeSource, join(installationRoot, 'resources', 'server-runtime', target), {
    recursive: true,
    verbatimSymlinks: true,
  });
  if (targetDefinition.platform !== 'windows') await chmod(agentDestination, 0o755);
}

async function writeDebianControl(controlRoot) {
  await mkdir(controlRoot, { recursive: true });
  await writeFile(
    join(controlRoot, 'control'),
    `Package: accore-erp-server-headless\nVersion: ${version}\nSection: database\nPriority: optional\nArchitecture: amd64\nMaintainer: ACCORE ERP\nDescription: ACCORE ERP self-contained Server Headless runtime\n`
  );
  await writeFile(join(controlRoot, 'postinst'), linuxPostinstall());
  await writeFile(join(controlRoot, 'prerm'), linuxPrerm());
  await chmod(join(controlRoot, 'postinst'), 0o755);
  await chmod(join(controlRoot, 'prerm'), 0o755);
}

function rpmSpec() {
  return `%global _build_id_links none\nName: accore-erp-server-headless\nVersion: ${version}\nRelease: 1%{?dist}\nSummary: ACCORE ERP self-contained Server Headless runtime\nLicense: Proprietary\nBuildArch: x86_64\n\n%description\nACCORE ERP Server Headless runtime and supervised service.\n\n%install\nmkdir -p %{buildroot}\ncp -a %{_sourcedir}/root/* %{buildroot}/\n\n%post\n/opt/accore-erp/server/accore-server-agent install --owner server-headless || exit 1\n\n%preun\nif [ $1 -eq 0 ]; then\n  /opt/accore-erp/server/accore-server-agent uninstall --owner server-headless || exit 1\nfi\n\n%files\n/opt/accore-erp/server\n\n%changelog\n* Sat Aug 22 2026 ACCORE ERP <release@accore.local> - ${version}-1\n- Cross-platform Server Headless package\n`;
}

function linuxPostinstall() {
  return `#!/bin/sh\nset -eu\n/opt/accore-erp/server/accore-server-agent install --owner server-headless\n`;
}

function linuxPrerm() {
  return `#!/bin/sh\nset -eu\nif [ \"$1\" = \"remove\" ] || [ \"$1\" = \"deconfigure\" ]; then\n  /opt/accore-erp/server/accore-server-agent uninstall --owner server-headless\nfi\n`;
}

function macPostinstall() {
  return `#!/bin/sh\nset -eu\n/Library/ACCORE\\ ERP/Server/accore-server-agent install --owner server-headless\n`;
}

function macPreinstall() {
  return `#!/bin/sh\nset -eu\nmanifest='/Library/Application Support/ACCORE ERP/Server/server-instance.json'\nlabel='im.accore.server-agent'\n# Preserve config and database data during an in-place Headless upgrade. Only\n# the package that owns the active daemon may stop it before its agent changes.\nif [ -f "$manifest" ] && /usr/bin/grep -Eq '"ownerProduct"[[:space:]]*:[[:space:]]*"server-headless"' "$manifest"; then\n  /bin/launchctl bootout "system/$label" >/dev/null 2>&1 || true\nfi\n`;
}

async function copyProducedRpm(root, destination) {
  const files = await findFiles(root);
  const packageFile = files.find((file) => file.endsWith('.rpm'));
  if (!packageFile) throw new Error('rpmbuild did not produce an RPM');
  await cp(packageFile, join(destination, basename(packageFile)));
}

async function findFiles(root) {
  const entries = await (await import('node:fs/promises')).readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await findFiles(path)));
    else files.push(path);
  }
  return files;
}

async function assertFile(path, description) {
  const details = await stat(path).catch(() => null);
  if (!details?.isFile()) throw new Error(`${description} is missing: ${path}`);
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

function getTargets() {
  return {
    'linux-x86_64': {
      platform: 'linux',
      architecture: 'x86_64',
      agentSource: 'accore-server-agent-x86_64-unknown-linux-gnu',
      agentDestination: 'accore-server-agent',
      frankenPhp: 'frankenphp',
      mariadbRoot: 'mariadb-11.4.9-linux-systemd-x86_64',
      mariadbd: 'mariadbd',
    },
    'macos-aarch64': {
      platform: 'macos',
      architecture: 'aarch64',
      agentSource: 'accore-server-agent-aarch64-apple-darwin',
      agentDestination: 'accore-server-agent',
      frankenPhp: 'frankenphp',
      mariadbRoot: 'mariadb',
      mariadbd: 'mariadbd',
    },
    'macos-x86_64': {
      platform: 'macos',
      architecture: 'x86_64',
      agentSource: 'accore-server-agent-x86_64-apple-darwin',
      agentDestination: 'accore-server-agent',
      frankenPhp: 'frankenphp',
      mariadbRoot: 'mariadb',
      mariadbd: 'mariadbd',
    },
  };
}
