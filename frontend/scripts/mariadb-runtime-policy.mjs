import { lstat, readdir, realpath, readlink, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

export const productionMariaDbCmakeFlags = Object.freeze([
  '-DPLUGIN_ROCKSDB=NO',
  '-DPLUGIN_ARCHIVE=NO',
  '-DPLUGIN_BLACKHOLE=NO',
  '-DPLUGIN_FEDERATED=NO',
  '-DPLUGIN_FEDERATEDX=NO',
  '-DPLUGIN_MROONGA=NO',
  '-DPLUGIN_CONNECT=NO',
  '-DPLUGIN_SPIDER=NO',
  '-DPLUGIN_OQGRAPH=NO',
  '-DPLUGIN_S3=NO',
  '-DPLUGIN_SPHINX=NO',
  // Both PAM variants add the auth_pam testing subtree when present. ACCORE
  // does not expose a PAM service or PAM-authenticated local database users.
  '-DPLUGIN_AUTH_PAM=NO',
  '-DPLUGIN_AUTH_PAM_V1=NO',
  '-DWITH_WSREP=OFF',
  '-DWITH_MARIABACKUP=OFF',
  '-DWITH_EMBEDDED_SERVER=OFF',
  '-DWITH_UNIT_TESTS=OFF',
  // Server uses bundled wolfSSL; Connector/C uses static OpenSSL to prevent
  // the macOS build from retaining Homebrew GnuTLS or OpenSSL dependencies.
  '-DWITH_SSL=bundled',
  '-DCONC_WITH_SSL=OPENSSL',
  '-DOPENSSL_USE_STATIC_LIBS=TRUE',
  '-DWITH_PCRE=bundled',
  '-DWITH_ZLIB=bundled',
  // Must stay relative during cmake --install. An empty value makes plugin
  // test destinations such as "${INSTALL_MYSQLTESTDIR}/suite" root-relative.
  '-DINSTALL_MYSQLTESTDIR=mariadb-test',
]);

export function macosMariaDbCmakeFlags(openSslRoot) {
  const configuredRoot = openSslRoot?.trim();
  if (!configuredRoot) {
    throw new Error(
      'ACCORE_MACOS_OPENSSL_ROOT must point to a static openssl@3 installation for macOS MariaDB builds'
    );
  }
  return [...productionMariaDbCmakeFlags, `-DOPENSSL_ROOT_DIR=${resolve(configuredRoot)}`];
}

const nonRuntimeDirectories = [
  'mariadb-test',
  'sql-bench',
  'lib/galera',
  'lib/plugin/auth_pam_tool_dir',
  'share/mroonga',
];
const nonRuntimeFiles = [
  'bin/galera_new_cluster',
  'bin/galera_recovery',
  'bin/garbd',
  'bin/mariadb-backup',
  'bin/mariabackup',
  'bin/mariadb-client-test',
  'bin/mariadb-test',
  'bin/mysql_client_test',
  'bin/mysqltest',
  'bin/myrocks_hotbackup',
  'bin/sst_dump',
  'bin/wsrep_sst_backup',
  'bin/wsrep_sst_common',
  'bin/wsrep_sst_mariabackup',
  'bin/wsrep_sst_mysqldump',
  'bin/wsrep_sst_rsync',
  'bin/wsrep_sst_rsync_wan',
  'include/mysql/server/private/sql_test.h',
  'lib/libgalera_smm.so',
  'man/man1/galera_new_cluster.1',
  'man/man1/galera_recovery.1',
  'man/man1/mariabackup.1',
  'man/man1/mariadb-backup.1',
  'man/man1/mariadb-client-test-embedded.1',
  'man/man1/mariadb-client-test.1',
  'man/man1/mariadb-test-embedded.1',
  'man/man1/mariadb-test.1',
  'man/man1/myrocks_hotbackup.1',
  'man/man1/mysql-stress-test.pl.1',
  'man/man1/mysql-test-run.pl.1',
  'man/man1/mysql_client_test.1',
  'man/man1/mysql_client_test_embedded.1',
  'man/man1/mysqltest.1',
  'man/man1/mysqltest_embedded.1',
  'man/man1/wsrep_sst_backup.1',
  'man/man1/wsrep_sst_common.1',
  'man/man1/wsrep_sst_mariabackup.1',
  'man/man1/wsrep_sst_mysqldump.1',
  'man/man1/wsrep_sst_rsync.1',
  'man/man1/wsrep_sst_rsync_wan.1',
  'share/mariadb_test_data_timezone.sql',
  'share/mariadb_test_db.sql',
  'share/pam_user_map.so',
  'support-files/systemd/use_galera_new_cluster.conf',
  'support-files/wsrep.cnf',
  'support-files/wsrep_notify',
];
const nonProductionPluginBases = [
  'auth_0x0100',
  'auth_pam',
  'auth_pam_v1',
  'auth_test_plugin',
  'daemon_example',
  'debug_key_management',
  'dialog_examples',
  'example_key_management',
  'func_test',
  'ha_archive',
  'ha_blackhole',
  'ha_connect',
  'ha_example',
  'ha_federated',
  'ha_federatedx',
  'ha_mroonga',
  'ha_oqgraph',
  'ha_rocksdb',
  'ha_s3',
  'ha_spider',
  'ha_sphinx',
  'ha_test_sql_discovery',
  'libdaemon_example',
  'qa_auth_client',
  'qa_auth_interface',
  'qa_auth_server',
  'test_sql_service',
  'test_versioning',
  'type_test',
  'wsrep_info',
];
const nativePluginExtensions = ['.so', '.dylib', '.dll', '.ini'];

export async function pruneMariaDbNonRuntimePayload(mariadbRoot) {
  await Promise.all(
    nonRuntimeDirectories.map((entry) =>
      rm(join(mariadbRoot, entry), { recursive: true, force: true })
    )
  );
  await Promise.all(nonRuntimeFiles.map((entry) => rm(join(mariadbRoot, entry), { force: true })));
  const pluginRoot = join(mariadbRoot, 'lib', 'plugin');
  await Promise.all(
    nonProductionPluginBases.flatMap((base) =>
      nativePluginExtensions.map((extension) =>
        rm(join(pluginRoot, `${base}${extension}`), { force: true })
      )
    )
  );
  await assertMariaDbProductionPayload(mariadbRoot);
}

export async function assertMariaDbProductionPayload(mariadbRoot) {
  for (const entry of nonRuntimeDirectories) {
    await assertAbsent(join(mariadbRoot, entry), entry);
  }
  for (const entry of nonRuntimeFiles) {
    await assertAbsent(join(mariadbRoot, entry), entry);
  }
  const pluginRoot = join(mariadbRoot, 'lib', 'plugin');
  for (const base of nonProductionPluginBases) {
    for (const extension of nativePluginExtensions) {
      const candidate = join(pluginRoot, `${base}${extension}`);
      await assertAbsent(candidate, basename(candidate));
    }
  }
  await assertPayloadSymlinksAreContained(mariadbRoot);
}

async function assertAbsent(path, label) {
  const details = await lstat(path).catch(() => null);
  if (details) throw new Error(`production MariaDB payload still contains ${label}`);
}

async function assertPayloadSymlinksAreContained(mariadbRoot) {
  const root = await realpath(mariadbRoot);
  for (const link of await collectSymbolicLinks(root)) {
    const targetPath = resolve(dirname(link), await readlink(link));
    if (!isWithin(root, targetPath)) {
      throw new Error(
        `production MariaDB payload contains symbolic link outside its root: ${link}`
      );
    }
    const target = await realpath(targetPath).catch(() => null);
    if (!target) {
      throw new Error(`production MariaDB payload contains dangling symbolic link: ${link}`);
    }
    if (!isWithin(root, target)) {
      throw new Error(
        `production MariaDB payload symbolic link resolves outside its root: ${link}`
      );
    }
    await stat(target);
  }
}

async function collectSymbolicLinks(directory) {
  const links = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      links.push(path);
      continue;
    }
    if (entry.isDirectory()) links.push(...(await collectSymbolicLinks(path)));
  }
  return links;
}

function isWithin(root, candidate) {
  const difference = relative(root, candidate);
  return difference === '' || (!difference.startsWith('..') && !difference.startsWith('/'));
}
