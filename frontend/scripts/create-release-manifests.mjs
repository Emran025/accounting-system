import { createHash, sign } from 'node:crypto';
import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const [assetsDirectory, outputDirectory] = process.argv.slice(2);
if (!assetsDirectory || !outputDirectory) {
  throw new Error('usage: create-release-manifests.mjs <assets-directory> <output-directory>');
}

const required = [
  'ACCORE_RELEASE_TAG',
  'ACCORE_SOURCE_REVISION',
  'ACCORE_MANIFEST_KEY_ID',
  'ACCORE_MANIFEST_PRIVATE_KEY',
];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`${key} must be provided by release automation`);
}

const tag = process.env.ACCORE_RELEASE_TAG;
const releaseVersion = tag.replace(/^desktop-v/, '');
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(releaseVersion)) {
  throw new Error(`desktop tag ${tag} does not contain a semantic version`);
}
await assertReleaseVersionMatchesDesktopSources(releaseVersion);

const sourceRevision = process.env.ACCORE_SOURCE_REVISION;
if (!/^[0-9a-f]{40,64}$/i.test(sourceRevision)) {
  throw new Error('ACCORE_SOURCE_REVISION must be an immutable Git revision');
}

const releaseBaseUrl =
  process.env.ACCORE_RELEASE_BASE_URL ??
  `https://github.com/${process.env.GITHUB_REPOSITORY}/releases/download/${tag}`;

const files = await findFiles(resolve(assetsDirectory));
const installers = files.filter(isDesktopInstaller);
if (installers.length === 0)
  throw new Error('no desktop installers were found to include in signed manifests');

const generatedAt = new Date().toISOString();
await mkdir(outputDirectory, { recursive: true });
for (const product of ['server', 'client', 'server-headless']) {
  const artifacts = (
    await Promise.all(
      installers
        .filter((file) => classifyProduct(file) === product)
        .map((file) => descriptor(file, product))
    )
  ).sort((left, right) => left.id.localeCompare(right.id));

  if (artifacts.length === 0) throw new Error(`no ${product} installer artifacts were found`);
  const unsigned = {
    schema_version: 1,
    channel: 'stable',
    product,
    release_version: releaseVersion,
    generated_at: generatedAt,
    source_revision: sourceRevision,
    artifacts,
  };
  const signature = sign(
    null,
    Buffer.from(JSON.stringify(unsigned)),
    process.env.ACCORE_MANIFEST_PRIVATE_KEY
  ).toString('base64');
  const manifest = {
    ...unsigned,
    signature: {
      key_id: process.env.ACCORE_MANIFEST_KEY_ID,
      ed25519: signature,
    },
  };
  await writeFile(
    join(outputDirectory, `accore-${product}-manifest.json`),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  if (product !== 'server-headless') {
    await writeTauriUpdaterManifest(product, files, outputDirectory, generatedAt);
  }
}

async function writeTauriUpdaterManifest(product, files, destination, generatedAt) {
  const signedArtifacts = files
    .filter(isTauriUpdaterSignature)
    .filter((signaturePath) => classifyProduct(signaturePath.slice(0, -4)) === product)
    .sort((left, right) => left.localeCompare(right));

  if (signedArtifacts.length === 0) {
    throw new Error(`no signed ${product} updater artifacts were found`);
  }

  const candidatesByPlatform = {};
  for (const signaturePath of signedArtifacts) {
    const artifactPath = signaturePath.slice(0, -4);
    const platform = updaterPlatformFromName(basename(artifactPath));
    const candidate = {
      artifactPath,
      signature: (await readFile(signaturePath, 'utf8')).trim(),
      url: `${releaseBaseUrl}/${encodeURIComponent(basename(artifactPath))}`,
    };
    (candidatesByPlatform[platform] ??= []).push(candidate);
  }

  const platforms = Object.fromEntries(
    Object.entries(candidatesByPlatform).map(([platform, candidates]) => {
      const [selected] = candidates.sort(
        (left, right) =>
          updaterArtifactPriority(left.artifactPath) -
            updaterArtifactPriority(right.artifactPath) ||
          basename(left.artifactPath).localeCompare(basename(right.artifactPath))
      );
      return [platform, { signature: selected.signature, url: selected.url }];
    })
  );

  const updater = {
    version: releaseVersion,
    notes: `Signed Accore ${product} release ${releaseVersion} built from ${sourceRevision}.`,
    pub_date: generatedAt,
    platforms,
  };
  await writeFile(
    join(destination, `accore-${product}-updater.json`),
    `${JSON.stringify(updater, null, 2)}\n`
  );
}

async function descriptor(file, product) {
  const bytes = await readFile(file);
  const name = basename(file);
  const { os, architecture } = platformFromName(name);
  const bundleFormat = bundleFormatFromName(name);
  return {
    id: `${product}-${product === 'server-headless' ? 'service' : 'desktop'}-${os}-${architecture}-${bundleFormat}`,
    kind: product === 'server-headless' ? 'server_headless_installer' : 'desktop_application',
    product,
    version: releaseVersion,
    os,
    architecture,
    download_url: `${releaseBaseUrl}/${encodeURIComponent(name)}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size_bytes: bytes.length,
    compatibility: {
      minimum_bootstrapper_version: '0.1.0',
      required_features: [],
    },
    dependencies: [],
  };
}

function isTauriUpdaterSignature(file) {
  const name = basename(file).toLowerCase();
  return (
    name.endsWith('.sig') &&
    productFromAssetName(name) !== null &&
    (name.endsWith('.appimage.sig') ||
      name.endsWith('.exe.sig') ||
      name.endsWith('.msi.sig') ||
      name.endsWith('.app.tar.gz.sig'))
  );
}

function updaterPlatformFromName(name) {
  const lower = name.toLowerCase();
  const architecture = lower.includes('aarch64') || lower.includes('arm64') ? 'aarch64' : 'x86_64';
  if (lower.endsWith('.appimage')) return `linux-${architecture}`;
  if (lower.endsWith('.exe') || lower.endsWith('.msi')) return `windows-${architecture}`;
  if (lower.includes('.app.tar.gz')) return `darwin-${architecture}`;
  throw new Error(`unsupported updater artifact ${name}`);
}

function updaterArtifactPriority(path) {
  const name = basename(path).toLowerCase();
  if (name.endsWith('-setup.exe') || name.endsWith('.appimage') || name.endsWith('.app.tar.gz')) {
    return 0;
  }
  if (name.endsWith('.msi')) return 1;
  return 2;
}

function isDesktopInstaller(file) {
  const name = basename(file).toLowerCase();
  const extension = extname(name);
  return (
    [
      '.deb',
      '.rpm',
      '.appimage',
      '.msi',
      '.exe',
      '.dmg',
      '.pkg',
    ].includes(extension) ||
    name.endsWith('.tar.gz')
  ) && productFromAssetName(name) !== null;
}

function classifyProduct(file) {
  const product = productFromAssetName(basename(file));
  if (product) return product;
  throw new Error(`cannot identify product for ${file}`);
}

function productFromAssetName(name) {
  if (/accore(?:[ ._-]+erp)?[ ._-]+server[ ._-]+headless/i.test(name)) {
    return 'server-headless';
  }
  const match = /accore(?:[ ._-]+erp)?[ ._-]+(server|client)(?:[ ._-]+desktop)?/i.exec(name);
  return match?.[1].toLowerCase() ?? null;
}

function bundleFormatFromName(name) {
  const extension = extname(name).toLowerCase();
  if (extension === '.appimage') return 'appimage';
  if (extension === '.deb') return 'deb';
  if (extension === '.rpm') return 'rpm';
  if (extension === '.msi') return 'msi';
  if (extension === '.exe') return 'nsis';
  if (extension === '.dmg') return 'dmg';
  if (extension === '.pkg') return 'pkg';
  if (name.toLowerCase().endsWith('.tar.gz')) return 'tar.gz';
  throw new Error(`unsupported installer extension for ${name}`);
}

function platformFromName(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.deb') || lower.endsWith('.rpm') || lower.endsWith('.appimage')) {
    return {
      os: 'linux',
      architecture: lower.includes('aarch64') || lower.includes('arm64') ? 'aarch64' : 'x86_64',
    };
  }
  if (lower.endsWith('.msi') || lower.endsWith('.exe'))
    return { os: 'windows', architecture: 'x86_64' };
  if (
    lower.endsWith('.dmg') ||
    lower.endsWith('.pkg') ||
    lower.includes('.app.tar.gz')
  )
    return {
      os: 'macos',
      architecture: lower.includes('aarch64') || lower.includes('arm64') ? 'aarch64' : 'x86_64',
    };
  if (lower.endsWith('.tar.gz') && lower.includes('_linux_'))
    return {
      os: 'linux',
      architecture: lower.includes('aarch64') || lower.includes('arm64') ? 'aarch64' : 'x86_64',
    };
  throw new Error(`unsupported installer extension for ${name}`);
}

async function findFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await findFiles(path)));
    else if ((await stat(path)).isFile()) files.push(path);
  }
  return files;
}

async function assertReleaseVersionMatchesDesktopSources(releaseVersion) {
  const [packageRaw, tauriRaw, cargoRaw] = await Promise.all([
    readFile(join(frontendRoot, 'package.json'), 'utf8'),
    readFile(join(frontendRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'),
    readFile(join(frontendRoot, 'src-tauri', 'Cargo.toml'), 'utf8'),
  ]);
  const packageVersion = JSON.parse(packageRaw).version;
  const tauriVersion = JSON.parse(tauriRaw).version;
  const cargoVersion = /^version\s*=\s*"([^"]+)"/m.exec(cargoRaw)?.[1];
  const sources = { package: packageVersion, tauri: tauriVersion, cargo: cargoVersion };
  const mismatchedSources = Object.entries(sources)
    .filter(([, version]) => version !== releaseVersion)
    .map(([source, version]) => `${source}=${version ?? 'missing'}`);

  if (mismatchedSources.length > 0) {
    throw new Error(
      `desktop tag ${tag} must match embedded package versions; found ${mismatchedSources.join(', ')}`
    );
  }
}
