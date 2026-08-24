import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFrankenPhpRuntimeExtensions,
  assertFrankenPhpRuntimeVersion,
} from './frankenphp-runtime-policy.mjs';

test('accepts the official FrankenPHP version rendering with a v prefix', () => {
  assert.doesNotThrow(() =>
    assertFrankenPhpRuntimeVersion(
      'FrankenPHP v1.12.7 PHP 8.5.9 Caddy v2.11.4',
      '1.12.7',
      'macos-x86_64'
    )
  );
});

test('accepts the official FrankenPHP version rendering without a v prefix', () => {
  assert.doesNotThrow(() =>
    assertFrankenPhpRuntimeVersion(
      'FrankenPHP 1.12.7 PHP 8.5.9 Caddy v2.11.4',
      '1.12.7',
      'windows-x86_64'
    )
  );
});

test('rejects a different FrankenPHP version despite a matching-looking prefix', () => {
  assert.throws(
    () =>
      assertFrankenPhpRuntimeVersion(
        'FrankenPHP v1.12.70 PHP 8.5.9 Caddy v2.11.4',
        '1.12.7',
        'linux-x86_64'
      ),
    /expected FrankenPHP 1\.12\.7/
  );
});

test('rejects output without a FrankenPHP semantic version identity', () => {
  assert.throws(
    () => assertFrankenPhpRuntimeVersion('PHP 8.5.9', '1.12.7', 'windows-x86_64'),
    /unexpected FrankenPHP runtime identity/
  );
});

test('accepts all required encrypted transport PHP extensions from embedded runtime output', () => {
  assert.doesNotThrow(() =>
    assertFrankenPhpRuntimeExtensions(
      'Core\nOpenSSL\nSodium\ngmp\njson\n',
      ['sodium', 'openssl', 'gmp'],
      'linux-x86_64'
    )
  );
});

test('rejects a runtime missing a required encrypted transport PHP extension', () => {
  assert.throws(
    () =>
      assertFrankenPhpRuntimeExtensions(
        'Core\nopenssl\nsodium\n',
        ['sodium', 'openssl', 'gmp'],
        'macos-aarch64'
      ),
    /macos-aarch64.*gmp/
  );
});
