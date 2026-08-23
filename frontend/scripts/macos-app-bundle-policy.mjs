export function relativeToAppContents(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/');
  const prefix = 'Contents/';
  if (!normalized.startsWith(prefix) || normalized.length === prefix.length) {
    throw new Error(`expected a path beneath ${prefix}: ${relativePath}`);
  }
  return normalized.slice(prefix.length);
}

export function nonRelocatableBundleComponentPlist(rootRelativeBundlePath) {
  const normalized = rootRelativeBundlePath.replaceAll('\\', '/');
  if (
    !normalized ||
    normalized.startsWith('/') ||
    normalized.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error(`expected a safe destination-root bundle path: ${rootRelativeBundlePath}`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
  <dict>
    <key>RootRelativeBundlePath</key>
    <string>${normalized}</string>
    <key>BundleIsRelocatable</key>
    <false/>
  </dict>
</array>
</plist>
`;
}
