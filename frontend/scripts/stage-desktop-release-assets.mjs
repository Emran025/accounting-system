import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const [sourceDirectory, destinationDirectory] = process.argv.slice(2);
if (!sourceDirectory || !destinationDirectory) {
  throw new Error(
    'usage: stage-desktop-release-assets.mjs <downloaded-artifacts-directory> <staging-directory>'
  );
}

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

console.log(`Staged ${stagedNames.size} publishable desktop assets in ${destinationRoot}.`);

function isPublishableReleaseAsset(file) {
  const name = basename(file).toLowerCase();
  if (!productFromAssetName(name)) return false;

  return (
    name.endsWith('.appimage') ||
    name.endsWith('.appimage.sig') ||
    name.endsWith('.deb') ||
    name.endsWith('.deb.sig') ||
    name.endsWith('.rpm') ||
    name.endsWith('.rpm.sig') ||
    name.endsWith('.msi') ||
    name.endsWith('.msi.sig') ||
    name.endsWith('.exe') ||
    name.endsWith('.exe.sig') ||
    name.endsWith('.dmg') ||
    name.endsWith('.dmg.sig') ||
    name.endsWith('.app.tar.gz') ||
    name.endsWith('.app.tar.gz.sig') ||
    name.endsWith('.pkg') ||
    name.endsWith('.pkg.sig') ||
    name.endsWith('.tar.gz') ||
    name.endsWith('.tar.gz.sig')
  );
}

function productFromAssetName(name) {
  if (/accore(?:[ ._-]+erp)?[ ._-]+server[ ._-]+headless/i.test(name)) {
    return 'server-headless';
  }
  const match = /accore(?:[ ._-]+erp)?[ ._-]+(server|client)(?:[ ._-]+desktop)?/i.exec(name);
  return match?.[1].toLowerCase() ?? null;
}

function normalizeAssetName(sourceFile) {
  const name = basename(sourceFile).replaceAll(' ', '.');
  const target = releaseTargetFromAssetName(name, sourceFile);
  if (!target) return name;

  if (
    name.toLowerCase().endsWith('.app.tar.gz') ||
    name.toLowerCase().endsWith('.app.tar.gz.sig')
  ) {
    return name.replace(
      /\.app\.tar\.gz(\.sig)?$/i,
      `_${target.architecture}.app.tar.gz$1`
    );
  }

  const normalizedTarget = `_${target.platform}_${target.architecture}`.toLowerCase();
  if (name.toLowerCase().includes(normalizedTarget)) return name;

  const architecturePattern = /[_.-](aarch64|arm64|x86_64|x64)(?=[_.-])/i;
  if (architecturePattern.test(name)) {
    return name.replace(architecturePattern, `_${target.platform}_${target.architecture}`);
  }

  if (/\.(deb|rpm|pkg|appimage)$/i.test(name)) return name;

  throw new Error(`could not determine architecture placement for desktop release asset ${name}`);
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
