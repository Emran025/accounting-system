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

/**
 * The encrypted transport remains disabled until its runtime preconditions are
 * proved on every distributed server platform. The input must be a line-based
 * `get_loaded_extensions()` result emitted by the embedded FrankenPHP binary.
 */
export function assertFrankenPhpRuntimeExtensions(output, requiredExtensions, target) {
  const loadedExtensions = new Set(
    output
      .split(/\r?\n/)
      .map((extension) => extension.trim().toLowerCase())
      .filter(Boolean)
  );
  const missingExtensions = requiredExtensions.filter(
    (extension) => !loadedExtensions.has(extension.toLowerCase())
  );
  if (missingExtensions.length === 0) return;

  throw new Error(
    `embedded FrankenPHP runtime for ${target} is missing required PHP extensions: ${missingExtensions.join(', ')}`
  );
}
