import assert from 'node:assert/strict';
import test from 'node:test';
import { isLaravelSecretEnvironmentPath } from './laravel-runtime-payload-policy.mjs';

test('recognizes only an exact .env path segment as a packaged Laravel secret', () => {
  assert.equal(isLaravelSecretEnvironmentPath('Library/ACCORE ERP/Server/app/.env'), true);
  assert.equal(isLaravelSecretEnvironmentPath('app\\.env'), true);
  assert.equal(isLaravelSecretEnvironmentPath('.env'), true);
});

test('accepts Laravel environment templates and similarly named normal files', () => {
  for (const path of ['app/.env.example', 'app/.environment', 'app/config/env.example']) {
    assert.equal(isLaravelSecretEnvironmentPath(path), false, path);
  }
});
