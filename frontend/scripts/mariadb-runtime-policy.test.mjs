import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix, win32 } from 'node:path';
import test from 'node:test';
import {
  assertMariaDbProductionPayload,
  macosMariaDbCmakeFlags,
  productionMariaDbCmakeFlags,
  pruneMariaDbNonRuntimePayload,
} from './mariadb-runtime-policy.mjs';

test('production CMake policy disables nonruntime features and keeps testdir relative', () => {
  for (const flag of [
    '-DPLUGIN_ARCHIVE=NO',
    '-DPLUGIN_BLACKHOLE=NO',
    '-DPLUGIN_FEDERATED=NO',
    '-DPLUGIN_FEDERATEDX=NO',
    '-DPLUGIN_AUTH_PAM=NO',
    '-DPLUGIN_AUTH_PAM_V1=NO',
    '-DPLUGIN_S3=NO',
    '-DWITH_WSREP=OFF',
    '-DWITH_MARIABACKUP=OFF',
    '-DCONC_WITH_SSL=OPENSSL',
    '-DOPENSSL_USE_STATIC_LIBS=TRUE',
    '-DINSTALL_MYSQLTESTDIR=mariadb-test',
  ]) {
    assert.ok(productionMariaDbCmakeFlags.includes(flag));
  }
  assert.ok(!productionMariaDbCmakeFlags.includes('-DINSTALL_MYSQLTESTDIR='));
});

test('macOS MariaDB policy requires an explicit OpenSSL root and preserves static TLS flags', () => {
  const openSslRoot = '/opt/homebrew/opt/openssl@3';
  assert.throws(() => macosMariaDbCmakeFlags(''), /ACCORE_MACOS_OPENSSL_ROOT/);

  const posixFlags = macosMariaDbCmakeFlags(openSslRoot, posix.resolve);
  assert.ok(posixFlags.includes(`-DOPENSSL_ROOT_DIR=${posix.resolve(openSslRoot)}`));

  // The production helper uses the host resolver on macOS. Explicitly testing
  // win32 here prevents a Windows runner from silently assuming POSIX output.
  const windowsFlags = macosMariaDbCmakeFlags(openSslRoot, win32.resolve);
  assert.ok(windowsFlags.includes(`-DOPENSSL_ROOT_DIR=${win32.resolve(openSslRoot)}`));

  assert.ok(posixFlags.includes('-DCONC_WITH_SSL=OPENSSL'));
  assert.ok(posixFlags.includes('-DOPENSSL_USE_STATIC_LIBS=TRUE'));
});

test('pruning removes test suites, disabled engines, PAM, WSREP, and backup payload', async () => {
  const root = await mkdtemp(join(tmpdir(), 'accore-mariadb-policy-'));
  try {
    const pluginRoot = join(root, 'lib', 'plugin');
    await Promise.all([
      mkdir(join(root, 'mariadb-test', 'suite'), { recursive: true }),
      mkdir(join(root, 'sql-bench'), { recursive: true }),
      mkdir(join(root, 'bin'), { recursive: true }),
      mkdir(join(root, 'lib'), { recursive: true }),
      mkdir(join(root, 'share', 'mroonga'), { recursive: true }),
      mkdir(join(root, 'support-files'), { recursive: true }),
      mkdir(pluginRoot, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(root, 'mariadb-test', 'suite', 'fixture'), 'test'),
      writeFile(join(root, 'sql-bench', 'fixture'), 'benchmark'),
      writeFile(join(root, 'bin', 'mariadb-test'), 'test binary'),
      writeFile(join(root, 'bin', 'mariadb-client-test'), 'test binary'),
      writeFile(join(root, 'bin', 'mariadb-backup'), 'backup utility'),
      writeFile(join(root, 'bin', 'mariabackup'), 'backup alias'),
      writeFile(join(root, 'bin', 'mysql_client_test'), 'test alias'),
      writeFile(join(root, 'bin', 'mysqltest'), 'test alias'),
      writeFile(join(root, 'bin', 'garbd'), 'galera utility'),
      writeFile(join(root, 'bin', 'wsrep_sst_rsync'), 'wsrep utility'),
      writeFile(join(root, 'bin', 'wsrep_sst_rsync_wan'), 'wsrep utility alias'),
      writeFile(join(root, 'lib', 'libgalera_smm.so'), 'galera library'),
      writeFile(join(root, 'share', 'mariadb_test_db.sql'), 'test SQL'),
      writeFile(join(root, 'share', 'mroonga', 'install.sql'), 'engine data'),
      writeFile(join(root, 'support-files', 'wsrep.cnf'), 'wsrep configuration'),
      writeFile(join(pluginRoot, 'ha_archive.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_blackhole.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_connect.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_federated.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_federatedx.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_mroonga.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_oqgraph.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_rocksdb.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_s3.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_spider.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'ha_sphinx.so'), 'disabled engine'),
      writeFile(join(pluginRoot, 'auth_pam.so'), 'disabled PAM plugin'),
      writeFile(join(pluginRoot, 'auth_pam_v1.so'), 'disabled PAM plugin'),
      writeFile(join(pluginRoot, 'wsrep_info.so'), 'disabled WSREP plugin'),
      writeFile(join(pluginRoot, 'qa_auth_client.so'), 'test plugin'),
      writeFile(join(pluginRoot, 'daemon_example.ini'), 'example configuration'),
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
        'bin/mariadb-backup',
        'bin/mariabackup',
        'bin/mysql_client_test',
        'bin/mysqltest',
        'bin/garbd',
        'bin/wsrep_sst_rsync',
        'bin/wsrep_sst_rsync_wan',
        'lib/libgalera_smm.so',
        'share/mariadb_test_db.sql',
        'share/mroonga',
        'support-files/wsrep.cnf',
        'lib/plugin/ha_archive.so',
        'lib/plugin/ha_blackhole.so',
        'lib/plugin/ha_connect.so',
        'lib/plugin/ha_federated.so',
        'lib/plugin/ha_federatedx.so',
        'lib/plugin/ha_mroonga.so',
        'lib/plugin/ha_oqgraph.so',
        'lib/plugin/ha_rocksdb.so',
        'lib/plugin/ha_s3.so',
        'lib/plugin/ha_spider.so',
        'lib/plugin/ha_sphinx.so',
        'lib/plugin/auth_pam.so',
        'lib/plugin/auth_pam_v1.so',
        'lib/plugin/wsrep_info.so',
        'lib/plugin/qa_auth_client.so',
        'lib/plugin/daemon_example.ini',
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
    await writeFile(join(root, 'bin', 'mariadb-backup'), 'residual backup binary');
    await assert.rejects(assertMariaDbProductionPayload(root), /bin\/mariadb-backup/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test(
  'production payload guard rejects dangling and outside symbolic links on Unix',
  { skip: process.platform === 'win32' },
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'accore-mariadb-policy-'));
    try {
      const bin = join(root, 'bin');
      await mkdir(bin, { recursive: true });
      await symlink('missing-target', join(bin, 'dangling-target'));
      await assert.rejects(assertMariaDbProductionPayload(root), /dangling symbolic link/);
      await rm(join(bin, 'dangling-target'));
      await symlink('/tmp', join(bin, 'outside-target'));
      await assert.rejects(assertMariaDbProductionPayload(root), /outside its root/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
);
