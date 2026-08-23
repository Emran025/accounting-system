function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Accept the two official FrankenPHP --version renderings observed for the
 * pinned v1.12.7 assets: "FrankenPHP v1.12.7 ..." and
 * "FrankenPHP 1.12.7 ...". The optional display prefix is not a trust
 * boundary; the verified archive SHA-256 is. The semantic version remains an
 * exact runtime contract.
 */
export function assertFrankenPhpRuntimeVersion(output, expectedVersion, target) {
  const pattern = new RegExp(
    `\\bFrankenPHP\\s+v?${escapeRegularExpression(expectedVersion)}\\b`,
    'm'
  );
  if (pattern.test(output)) return;

  const received = output.trim().replaceAll(/\s+/g, ' ');
  throw new Error(
    `unexpected FrankenPHP runtime identity for ${target}: expected FrankenPHP ${expectedVersion}, received ${received}`
  );
}
