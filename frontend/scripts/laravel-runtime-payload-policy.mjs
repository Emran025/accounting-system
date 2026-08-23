export function isLaravelSecretEnvironmentPath(payloadPath) {
  return payloadPath.replaceAll('\\', '/').split('/').includes('.env');
}
