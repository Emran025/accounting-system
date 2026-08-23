import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const [sourceDirectory, destinationDirectory, releaseTag] = process.argv.slice(2);
if (!sourceDirectory || !destinationDirectory || !releaseTag) {
  throw new Error(
    'usage: stage-desktop-release-assets.mjs <downloaded-artifacts-directory> <staging-directory> <desktop-vX.Y.Z>'
  );
}

const releaseVersion = versionFromTag(releaseTag);
const sourceRoot = resolve(sourceDirectory);
const destinationRoot = resolve(destinationDirectory);
const sourceFiles = await findFiles(sourceRoot);
const publishableFiles = sourceFiles.filter(isPublishableReleaseAsset);

if (publishableFiles.length === 0) {
  throw new Error('no publishable desktop release assets were found');
}

await rm(destinationRoot, { recursive: true, force: true });
await mkdir(destinationRoot, { recursive: true });

const stagedNames = new Map();
for (const sourceFile of publishableFiles.sort((left, right) => left.localeCompare(right))) {
  const stagedName = normalizeAssetName(sourceFile);
  const existingSource = stagedNames.get(stagedName);
  if (existingSource) {
    throw new Error(
      `release asset collision for ${stagedName}: ${existingSource} and ${sourceFile}`
    );
  }

  stagedNames.set(stagedName, sourceFile);
  await cp(sourceFile, join(destinationRoot, stagedName));
}

console.log(`Staged ${stagedNames.size} publishable desktop assets for ${releaseTag} in ${destinationRoot}.`);

function versionFromTag(tag) {
  const match = /^desktop-v([0-9]+(?:\.[0-9]+){2}(?:[-+][0-9A-Za-z.-]+)?)$/.exec(tag);
  if (!match) throw new Error(`desktop release tag must use desktop-v<semver>; received ${tag}`);
  return match[1];
}

function isPublishableReleaseAsset(file) {
  const name = basename(file).toLowerCase();
  const installerName = name.replace(/\.sig$/i, '');
  if (!productFromAssetName(installerName)) return false;
  return Boolean(assetExtension(installerName));
}

function productFromAssetName(name) {
  if (/accore(?:[ ._-]+erp)?[ ._-]+server[ ._-]+headless/i.test(name)) {
    return 'server-headless';
  }
  const match = /accore(?:[ ._-]+erp)?[ ._-]+(server|client)(?:[ ._-]+desktop)?/i.exec(name);
  return match?.[1].toLowerCase() ?? null;
}

function productAssetPrefix(product) {
  if (product === 'client') return 'ACCORE.ERP.Client.Desktop';
  if (product === 'server') return 'ACCORE.ERP.Server.Desktop';
  if (product === 'server-headless') return 'ACCORE.ERP.Server.Headless';
  throw new Error(`unsupported desktop release product ${product}`);
}

function normalizeAssetName(sourceFile) {
  const name = basename(sourceFile).replaceAll(' ', '.');
  const product = productFromAssetName(name);
  const target = releaseTargetFromAssetName(name, sourceFile);
  const signature = name.toLowerCase().endsWith('.sig') ? '.sig' : '';
  const installerName = signature ? name.slice(0, -signature.length) : name;
  const extension = assetExtension(installerName);
  if (!product || !target || !extension) {
    throw new Error(`could not normalize desktop release asset ${name}`);
  }

  const localeSuffix = extension === '.msi'
    ? (/_([a-z]{2}-[a-z]{2})\.msi$/i.exec(installerName)?.[1] ? `_${/_([a-z]{2}-[a-z]{2})\.msi$/i.exec(installerName)[1]}` : '')
    : '';
  return `${productAssetPrefix(product)}_${releaseVersion}_${target.platform}_${target.architecture}${localeSuffix}${canonicalExtension(extension)}${signature}`;
}

function assetExtension(name) {
  const lower = name.toLowerCase();
  for (const extension of ['.app.tar.gz', '.appimage', '.deb', '.rpm', '.msi', '.exe', '.dmg', '.pkg', '.tar.gz']) {
    if (lower.endsWith(extension)) return extension;
  }
  return null;
}

function canonicalExtension(extension) {
  return extension === '.appimage' ? '.AppImage' : extension;
}

function releaseTargetFromAssetName(name, sourceFile) {
  const installerName = name.replace(/\.sig$/i, '').toLowerCase();
  const architectureSource = `${installerName} ${sourceFile.toLowerCase()}`;
  const architecture =
    architectureSource.includes('aarch64') || architectureSource.includes('arm64')
      ? 'aarch64'
      : 'x86_64';

  if (
    installerName.endsWith('.appimage') ||
    installerName.endsWith('.deb') ||
    installerName.endsWith('.rpm') ||
    installerName.includes('_linux_')
  ) {
    return { platform: 'linux', architecture };
  }
  if (installerName.endsWith('.exe') || installerName.endsWith('.msi')) {
    return { platform: 'windows', architecture };
  }
  if (
    installerName.endsWith('.dmg') ||
    installerName.endsWith('.app.tar.gz') ||
    installerName.endsWith('.pkg')
  ) {
    return { platform: 'macos', architecture };
  }
  return null;
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
