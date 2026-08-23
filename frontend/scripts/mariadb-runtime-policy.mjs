import { rm, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

export const productionMariaDbCmakeFlags = Object.freeze([
  '-DPLUGIN_ROCKSDB=NO',
  '-DPLUGIN_ARCHIVE=NO',
  '-DPLUGIN_MROONGA=NO',
  '-DPLUGIN_CONNECT=NO',
  '-DPLUGIN_SPIDER=NO',
  '-DPLUGIN_OQGRAPH=NO',
  '-DPLUGIN_SPHINX=NO',
  // Both PAM variants add the auth_pam testing subtree when present. ACCORE
  // does not expose a PAM service or PAM-authenticated local database users.
  '-DPLUGIN_AUTH_PAM=NO',
  '-DPLUGIN_AUTH_PAM_V1=NO',
  '-DWITH_WSREP=OFF',
  '-DWITH_MARIABACKUP=OFF',
  '-DWITH_EMBEDDED_SERVER=OFF',
  '-DWITH_UNIT_TESTS=OFF',
  '-DWITH_SSL=bundled',
  '-DWITH_PCRE=bundled',
  '-DWITH_ZLIB=bundled',
  // Must stay relative during cmake --install. An empty value makes plugin
  // test destinations such as "${INSTALL_MYSQLTESTDIR}/suite" root-relative.
  '-DINSTALL_MYSQLTESTDIR=mariadb-test',
]);

const nonRuntimeDirectories = ['mariadb-test', 'sql-bench'];
const nonRuntimeFiles = [
  'bin/mariadb-client-test',
  'bin/mariadb-test',
  'include/mysql/server/private/sql_test.h',
  'man/man1/mariadb-client-test-embedded.1',
  'man/man1/mariadb-client-test.1',
  'man/man1/mariadb-test-embedded.1',
  'man/man1/mariadb-test.1',
  'man/man1/mysql-stress-test.pl.1',
  'man/man1/mysql-test-run.pl.1',
  'man/man1/mysql_client_test.1',
  'man/man1/mysql_client_test_embedded.1',
  'man/man1/mysqltest.1',
  'man/man1/mysqltest_embedded.1',
  'share/mariadb_test_data_timezone.sql',
  'share/mariadb_test_db.sql',
];
const nonProductionPluginBases = [
  'ha_test_sql_discovery',
  'auth_test_plugin',
  'qa_auth_interface',
  'qa_auth_server',
  'qa_auth_client',
  'dialog_examples',
  'auth_0x0100',
  'libdaemon_example',
  'daemon_example',
  'ha_example',
  'test_sql_service',
  'test_versioning',
  'type_test',
  'func_test',
  'debug_key_management',
  'example_key_management',
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
}

async function assertAbsent(path, label) {
  const details = await stat(path).catch(() => null);
  if (details) throw new Error(`production MariaDB payload still contains ${label}`);
}
