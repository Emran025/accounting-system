import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertMariaDbProductionPayload,
  productionMariaDbCmakeFlags,
  pruneMariaDbNonRuntimePayload,
} from './mariadb-runtime-policy.mjs';

test('production CMake policy disables both PAM variants and keeps testdir relative', () => {
  assert.ok(productionMariaDbCmakeFlags.includes('-DPLUGIN_AUTH_PAM=NO'));
  assert.ok(productionMariaDbCmakeFlags.includes('-DPLUGIN_AUTH_PAM_V1=NO'));
  assert.ok(productionMariaDbCmakeFlags.includes('-DINSTALL_MYSQLTESTDIR=mariadb-test'));
  assert.ok(!productionMariaDbCmakeFlags.includes('-DINSTALL_MYSQLTESTDIR='));
});

test('pruning removes test suites, benchmarks, test files, and known test/example plugins', async () => {
  const root = await mkdtemp(join(tmpdir(), 'accore-mariadb-policy-'));
  try {
    const pluginRoot = join(root, 'lib', 'plugin');
    await mkdir(join(root, 'mariadb-test', 'suite'), { recursive: true });
    await mkdir(join(root, 'sql-bench'), { recursive: true });
    await mkdir(join(root, 'bin'), { recursive: true });
    await mkdir(join(root, 'share'), { recursive: true });
    await mkdir(pluginRoot, { recursive: true });
    await Promise.all([
      writeFile(join(root, 'mariadb-test', 'suite', 'fixture'), 'test'),
      writeFile(join(root, 'sql-bench', 'fixture'), 'benchmark'),
      writeFile(join(root, 'bin', 'mariadb-test'), 'test binary'),
      writeFile(join(root, 'bin', 'mariadb-client-test'), 'test binary'),
      writeFile(join(root, 'share', 'mariadb_test_db.sql'), 'test SQL'),
      writeFile(join(pluginRoot, 'qa_auth_client.so'), 'test plugin'),
      writeFile(join(pluginRoot, 'daemon_example.ini'), 'example plugin configuration'),
      writeFile(join(pluginRoot, 'ha_example.so'), 'example plugin'),
      writeFile(join(pluginRoot, 'test_versioning.so'), 'test plugin'),
      writeFile(join(pluginRoot, 'auth_ed25519.so'), 'required plugin'),
    ]);

    await pruneMariaDbNonRuntimePayload(root);
    await assertMariaDbProductionPayload(root);
    await Promise.all(
      [
        'mariadb-test',
        'sql-bench',
        'bin/mariadb-test',
        'bin/mariadb-client-test',
        'share/mariadb_test_db.sql',
        'lib/plugin/daemon_example.ini',
        'lib/plugin/ha_example.so',
        'lib/plugin/test_versioning.so',
      ].map((entry) => assert.rejects(stat(join(root, entry))))
    );
    const { readFile } = await import('node:fs/promises');
    assert.equal(
      (await readFile(join(pluginRoot, 'auth_ed25519.so'))).toString(),
      'required plugin'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('production payload guard rejects a residual nonproduction plugin or test binary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'accore-mariadb-policy-'));
  try {
    const pluginRoot = join(root, 'lib', 'plugin');
    await mkdir(pluginRoot, { recursive: true });
    await writeFile(join(pluginRoot, 'type_test.so'), 'residual test plugin');
    await assert.rejects(assertMariaDbProductionPayload(root), /type_test\.so/);
    await rm(join(pluginRoot, 'type_test.so'));
    await mkdir(join(root, 'bin'), { recursive: true });
    await writeFile(join(root, 'bin', 'mariadb-test'), 'residual test binary');
    await assert.rejects(assertMariaDbProductionPayload(root), /bin\/mariadb-test/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
