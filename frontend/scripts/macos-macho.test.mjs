import assert from 'node:assert/strict';
import test from 'node:test';
import { dynamicDependencyInstallNames, formatMachOVerificationFailures } from './macos-macho.mjs';

test('omits a dynamic library identity from otool dependencies but retains real loads', () => {
  const installNameId = '@rpath/libmariadb.3.dylib';
  const output = `
/fixture/libmariadb.3.dylib:
\t@rpath/libmariadb.3.dylib (compatibility version 3.0.0, current version 3.4.9)
\t@rpath/libmysqlclient.21.dylib (compatibility version 21.0.0, current version 21.0.0)
\t/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1351.0.0)
`;

  assert.deepEqual(dynamicDependencyInstallNames(output, installNameId), [
    '@rpath/libmysqlclient.21.dylib',
    '/usr/lib/libSystem.B.dylib',
  ]);
});

test('does not remove a dependency when no matching LC_ID_DYLIB is supplied', () => {
  const output = `
/fixture/executable:
\t@rpath/libmariadb.3.dylib (compatibility version 3.0.0, current version 3.4.9)
`;

  assert.deepEqual(dynamicDependencyInstallNames(output, null), ['@rpath/libmariadb.3.dylib']);
});

test('reports every Mach-O verification failure in one diagnostic', () => {
  const report = formatMachOVerificationFailures('staged MariaDB', [
    new Error('first external dependency'),
    new Error('second unresolved reference'),
  ]);

  assert.match(report, /staged MariaDB has 2 Mach-O verification failure\(s\)/);
  assert.match(report, /- first external dependency/);
  assert.match(report, /- second unresolved reference/);
});
