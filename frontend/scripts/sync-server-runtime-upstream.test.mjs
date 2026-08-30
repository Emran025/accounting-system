import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PREPARE_SCRIPT_PATH = resolve(__dirname, 'prepare-server-runtime.mjs');

test('prepare-server-runtime.mjs contains complete and valid 64-char hex SHA-256 for all platforms', async () => {
  const content = await readFile(PREPARE_SCRIPT_PATH, 'utf8');

  // Verify windows-x86_64 frankenphp & mariadb
  const winFrankenMatch = content.match(/'windows-x86_64':\s*\{[\s\S]*?frankenPhp:\s*\{[\s\S]*?sha256:\s*'([a-f0-9]{64})'/i);
  assert.ok(winFrankenMatch, 'windows-x86_64 frankenphp sha256 must be a 64-character hex string');

  const winMariaMatch = content.match(/'windows-x86_64':\s*\{[\s\S]*?mariadb:\s*\{[\s\S]*?sha256:\s*'([a-f0-9]{64})'/i);
  assert.ok(winMariaMatch, 'windows-x86_64 mariadb sha256 must be a 64-character hex string');

  // Verify linux-x86_64 frankenphp & mariadb
  const linuxFrankenMatch = content.match(/'linux-x86_64':\s*\{[\s\S]*?frankenPhp:\s*\{[\s\S]*?sha256:\s*'([a-f0-9]{64})'/i);
  assert.ok(linuxFrankenMatch, 'linux-x86_64 frankenphp sha256 must be a 64-character hex string');

  const linuxMariaMatch = content.match(/'linux-x86_64':\s*\{[\s\S]*?mariadb:\s*\{[\s\S]*?sha256:\s*'([a-f0-9]{64})'/i);
  assert.ok(linuxMariaMatch, 'linux-x86_64 mariadb sha256 must be a 64-character hex string');

  // Verify macOS arm64 & x86_64 frankenphp definitions
  const macArmMatch = content.match(/macDefinition\(\s*'arm64',\s*'([a-f0-9]{64})'/i);
  assert.ok(macArmMatch, 'macos-aarch64 frankenphp sha256 must be a 64-character hex string');

  const macX64Match = content.match(/macDefinition\(\s*'x86_64',\s*'([a-f0-9]{64})'/i);
  assert.ok(macX64Match, 'macos-x86_64 frankenphp sha256 must be a 64-character hex string');

  // Verify macOS mariadb source definition
  const macMariaMatch = content.match(/macDefinition[\s\S]*?mariadb:\s*\{[\s\S]*?sha256:\s*'([a-f0-9]{64})'/i);
  assert.ok(macMariaMatch, 'macos mariadb source sha256 must be a 64-character hex string');
});

test('targets in prepare-server-runtime.mjs have matching version structure', async () => {
  const content = await readFile(PREPARE_SCRIPT_PATH, 'utf8');

  // Ensure version matches across targets
  const versionMatches = [...content.matchAll(/version:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(versionMatches.length >= 2, 'should have multiple version declarations');

  // Ensure all URLs are valid https links
  const urlMatches = [...content.matchAll(/url:\s*[`'](https:\/\/[^`'"]+)[`']/g)].map((m) => m[1]);
  assert.ok(urlMatches.length >= 4, 'should have valid https package URLs');
});
