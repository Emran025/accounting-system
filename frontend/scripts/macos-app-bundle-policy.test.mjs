import assert from 'node:assert/strict';
import test from 'node:test';
import { relativeToAppContents } from './macos-app-bundle-policy.mjs';

test('converts an app-root relative sidecar path to a Contents-relative path once', () => {
  assert.equal(
    relativeToAppContents('Contents/MacOS/accore-server-agent'),
    'MacOS/accore-server-agent'
  );
  assert.equal(
    relativeToAppContents('Contents\\MacOS\\accore-server-agent'),
    'MacOS/accore-server-agent'
  );
});

test('rejects a sidecar path outside the app Contents root', () => {
  assert.throws(() => relativeToAppContents('MacOS/accore-server-agent'), /Contents/);
});
