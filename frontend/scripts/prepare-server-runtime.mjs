import { spawn } from 'node:child_process';
import { chmod, cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
  assertFrankenPhpRuntimeExtensions,
  assertFrankenPhpRuntimeVersion,
} from './frankenphp-runtime-policy.mjs';
import { removeInertFrankenPhpRpath, verifyMachOPayload } from './macos-macho.mjs';
import {
  macosMariaDbCmakeFlags,
  productionMariaDbCmakeFlags,
  pruneMariaDbNonRuntimePayload,
} from './mariadb-runtime-policy.mjs';
import { downloadVerifiedArchive } from './verified-download.mjs';

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
const sealedTransportRuntimeExtensions = ['sodium', 'openssl', 'gmp'];

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
  } else if (definition.mariadb.kind === 'source-build') {
    await buildMariaDbFromSource(definition.mariadb);
  } else {
    throw new Error(`unsupported MariaDB staging strategy for ${target}`);
  }

  await removeMariaDbNonRuntimePayload();
}

async function removeMariaDbNonRuntimePayload() {
  // MariaDB binary archives and source builds can expose upstream tests and
  // examples. The shared policy retains only runtime-relevant payload.
  await pruneMariaDbNonRuntimePayload(join(destinationRoot, definition.layout.mariadbRoot));
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
    if (process.env.ACCORE_RUNTIME_TEST_FIXTURE !== '1') {
      throw new Error(
        'ACCORE_MARIADB_PREFIX is restricted to an explicitly marked runtime test fixture and cannot bypass the production TLS build policy'
      );
    }
    await cp(resolve(prefixPath), installRoot, { recursive: true });
    return;
  }

  const sourceDirectory = join(sourceRoot, extractedDirectory);
  const mariaDbCmakeFlags =
    process.platform === 'darwin'
      ? macosMariaDbCmakeFlags(process.env.ACCORE_MACOS_OPENSSL_ROOT)
      : productionMariaDbCmakeFlags;
  const cmakeArgs = [
    '-S',
    sourceDirectory,
    '-B',
    buildRoot,
    '-DCMAKE_BUILD_TYPE=Release',
    `-DCMAKE_INSTALL_PREFIX=${installRoot}`,
    // Keep the shipped database deliberately small and self-contained.
    // InnoDB, Aria and MyISAM remain; the shared policy also blocks PAM test
    // installation and production payload retains no test/example artifacts.
    ...mariaDbCmakeFlags,
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
  if (definition.layout.mariadbPrintDefaults) {
    await assertFile(
      join(destinationRoot, definition.layout.mariadbRoot, 'bin', definition.layout.mariadbPrintDefaults)
    );
  }
  await verifyFrankenPhpRuntime();
  if (process.platform === 'darwin') await verifyMacosRuntimeLinkage();
}

async function verifyFrankenPhpRuntime() {
  const frankenPhp = join(destinationRoot, definition.layout.frankenPhp);
  const version = await runCapture(frankenPhp, ['--version']);
  assertFrankenPhpRuntimeVersion(version, definition.frankenPhp.version, target);

  const extensions = await runCapture(
    frankenPhp,
    ['php-cli', '-r', 'echo implode(PHP_EOL, get_loaded_extensions()), PHP_EOL;'],
    { cwd: destinationRoot }
  );
  assertFrankenPhpRuntimeExtensions(extensions, sealedTransportRuntimeExtensions, target);
}

async function verifyMacosRuntimeLinkage() {
  const frankenPhp = join(destinationRoot, definition.layout.frankenPhp);
  await removeInertFrankenPhpRpath(frankenPhp);
  await verifyMachOPayload(destinationRoot, 'embedded Server Desktop runtime', {
    // Laravel sources are data for FrankenPHP; scanning them as a filesystem
    // tree is expensive and they cannot be Mach-O dependencies.
    skipDirectory: (relativePath) => relativePath === 'app',
  });
}

async function downloadVerified(source) {
  return downloadVerifiedArchive(source, cacheRoot);
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

async function runCapture(command, args, options = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
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
        version: '1.12.7',
        url: 'https://github.com/php/frankenphp/releases/download/v1.12.7/frankenphp-windows-x86_64.zip',
        sha256: '52fb7d1d8ca785599189789f813dd5cd2c29892ed2eaa3fdaab07e938e551870',
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
        version: '1.12.7',
        url: 'https://github.com/php/frankenphp/releases/download/v1.12.7/frankenphp-linux-x86_64',
        sha256: '207f65229637ae698e816ef7cbac31dd2bb57322a95d280789cea93e32cdd4f9',
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
        mariadbPrintDefaults: 'my_print_defaults',
      },
    },
    'macos-aarch64': macDefinition(
      'arm64',
      'a44f6bcb1da73e09abfbadfbf3126f0454d9821c5576f89465ed060d8f9a5c50'
    ),
    'macos-x86_64': macDefinition(
      'x86_64',
      '283dc2821190e46703b7f67c1ed8955ec9f315f7a089473cad306288f2354281'
    ),
  };
}

function macDefinition(architecture, sha256) {
  return {
    frankenPhp: {
      id: 'frankenphp',
      version: '1.12.7',
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
      mariadbInstallDb: 'scripts/mariadb-install-db',
      mariadbPrintDefaults: 'my_print_defaults',
    },
  };
}
