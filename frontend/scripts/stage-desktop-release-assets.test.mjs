import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = resolve(dirname(fileURLToPath(import.meta.url)), 'stage-desktop-release-assets.mjs');

test('stages only distributable assets and preserves both macOS updater architectures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'accore-release-stage-'));
  const source = join(root, 'downloaded');
  const destination = join(root, 'staged');

  await writeFixture(source, 'accore-client-macos-arm64-assets/Accore Client.app.tar.gz');
  await writeFixture(source, 'accore-client-macos-arm64-assets/Accore Client.app.tar.gz.sig');
  await writeFixture(source, 'accore-client-macos-x64-assets/Accore Client.app.tar.gz');
  await writeFixture(source, 'accore-client-macos-x64-assets/Accore Client.app.tar.gz.sig');
  await writeFixture(source, 'accore-server-linux-x64-assets/Accore Server_1.0.0_amd64.AppImage');
  await writeFixture(source, 'accore-server-linux-x64-assets/Accore Server_1.0.0_amd64.deb');
  await writeFixture(source, 'accore-server-linux-x64-assets/data.tar.gz');
  await writeFixture(source, 'accore-server-linux-x64-assets/control.tar.gz');
  await writeFixture(
    source,
    'accore-server-headless-linux-x64-assets/accore-erp-server-headless_1.0.0_linux_x86_64.tar.gz'
  );
  await writeFixture(
    source,
    'accore-server-headless-linux-x64-assets/accore-erp-server-headless-1.0.0-1.x86_64.rpm'
  );
  await writeFixture(
    source,
    'accore-server-headless-macos-arm64-assets/ACCORE.ERP.Server.Headless_1.0.0_macos_aarch64.pkg'
  );
  await writeFixture(
    source,
    'accore-server-macos-x64-assets/ACCORE.ERP.Server.Desktop_1.0.0_macos_x86_64.pkg'
  );

  execFileSync(process.execPath, [script, source, destination], { stdio: 'pipe' });

  assert.deepEqual(
    (await readdir(destination)).sort(),
    [
      'Accore.Client_aarch64.app.tar.gz',
      'Accore.Client_aarch64.app.tar.gz.sig',
      'Accore.Client_x86_64.app.tar.gz',
      'Accore.Client_x86_64.app.tar.gz.sig',
      'Accore.Server_1.0.0_amd64.AppImage',
      'Accore.Server_1.0.0_amd64.deb',
      'ACCORE.ERP.Server.Desktop_1.0.0_macos_x86_64.pkg',
      'ACCORE.ERP.Server.Headless_1.0.0_macos_aarch64.pkg',
      'accore-erp-server-headless-1.0.0-1_linux_x86_64.rpm',
      'accore-erp-server-headless_1.0.0_linux_x86_64.tar.gz',
    ].sort()
  );
});

async function writeFixture(root, relativePath) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, 'fixture');
}
