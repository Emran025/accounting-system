import assert from 'node:assert/strict';
import test from 'node:test';
import {
  nonRelocatableBundleComponentPlist,
  relativeToAppContents,
} from './macos-app-bundle-policy.mjs';

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

test('creates a component policy that installs the application at its declared destination', () => {
  assert.equal(
    nonRelocatableBundleComponentPlist('Applications/ACCORE ERP Server Desktop.app'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
  <dict>
    <key>RootRelativeBundlePath</key>
    <string>Applications/ACCORE ERP Server Desktop.app</string>
    <key>BundleIsRelocatable</key>
    <false/>
  </dict>
</array>
</plist>
`
  );
});

test('rejects unsafe destination-root bundle paths', () => {
  for (const path of ['', '/Applications/ACCORE ERP Server Desktop.app', '../Desktop.app']) {
    assert.throws(() => nonRelocatableBundleComponentPlist(path), /safe destination-root/);
  }
});
