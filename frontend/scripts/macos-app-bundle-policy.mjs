export function relativeToAppContents(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/');
  const prefix = 'Contents/';
  if (!normalized.startsWith(prefix) || normalized.length === prefix.length) {
    throw new Error(`expected a path beneath ${prefix}: ${relativePath}`);
  }
  return normalized.slice(prefix.length);
}
