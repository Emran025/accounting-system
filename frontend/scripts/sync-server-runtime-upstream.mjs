#!/usr/bin/env node
/**
 * Synchronize and verify Server Desktop runtime dependencies from upstream sources.
 *
 * Discovers the latest releases of FrankenPHP (GitHub Releases) and MariaDB (MariaDB Archive),
 * calculates / fetches their authoritative SHA-256 checksums across all platforms,
 * and optionally updates `scripts/prepare-server-runtime.mjs`.
 *
 * Usage:
 *   node scripts/sync-server-runtime-upstream.mjs                 # Dry-run check against prepare-server-runtime.mjs
 *   node scripts/sync-server-runtime-upstream.mjs --write         # Update prepare-server-runtime.mjs with new hashes
 *   node scripts/sync-server-runtime-upstream.mjs --target=windows-x86_64  # Check specific target only
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PREPARE_SCRIPT_PATH = resolve(__dirname, 'prepare-server-runtime.mjs');
const TEMP_DIR = process.env.TEMP || process.env.TMPDIR || '/tmp';

const args = process.argv.slice(2);
const shouldWrite = args.includes('--write') || args.includes('-w');
const targetFilter = args.find((a) => a.startsWith('--target='))?.split('=')[1] ?? 'all';

async function main() {
  console.log('🔍 ACCORE Server Desktop Runtime Upstream Sync & Verification');
  console.log(`📁 Target script: ${PREPARE_SCRIPT_PATH}`);
  console.log(`⚙️  Mode: ${shouldWrite ? 'WRITE (update script if changes found)' : 'CHECK (dry-run)'}\n`);

  // 1. Read current prepare-server-runtime.mjs
  const scriptContent = await readFile(PREPARE_SCRIPT_PATH, 'utf8');

  // 2. Discover upstream FrankenPHP release
  console.log('📡 Fetching latest FrankenPHP release info from GitHub API...');
  const frankenRelease = await fetchFrankenPhpRelease();
  console.log(`   FrankenPHP Version: ${frankenRelease.tag_name} (published: ${frankenRelease.published_at})\n`);

  // 3. Discover MariaDB checksums from MariaDB official archive
  const mariaDbVersion = extractCurrentMariaDbVersion(scriptContent) || '11.4.9';
  console.log(`📡 Fetching official MariaDB ${mariaDbVersion} SHA-256 checksums from archive.mariadb.org...`);
  const mariaDbHashes = await fetchMariaDbOfficialHashes(mariaDbVersion);
  console.log(`   MariaDB Windows : ${mariaDbHashes.win64 ? '✅ found' : '❌ missing'}`);
  console.log(`   MariaDB Linux   : ${mariaDbHashes.linux64 ? '✅ found' : '❌ missing'}`);
  console.log(`   MariaDB Source  : ${mariaDbHashes.source ? '✅ found' : '❌ missing'}\n`);

  // 4. Define all package specs across platforms
  const packages = [
    {
      target: 'windows-x86_64',
      component: 'frankenPhp',
      name: 'frankenphp-windows-x86_64.zip',
      version: frankenRelease.tag_name.replace(/^v/, ''),
      url: `https://github.com/php/frankenphp/releases/download/${frankenRelease.tag_name}/frankenphp-windows-x86_64.zip`,
      currentHash: extractPinnedHash(scriptContent, 'windows-x86_64', 'frankenphp'),
      upstreamHash: null,
      type: 'download',
    },
    {
      target: 'windows-x86_64',
      component: 'mariadb',
      name: `mariadb-${mariaDbVersion}-winx64.zip`,
      version: mariaDbVersion,
      url: `https://archive.mariadb.org/mariadb-${mariaDbVersion}/winx64-packages/mariadb-${mariaDbVersion}-winx64.zip`,
      currentHash: extractPinnedHash(scriptContent, 'windows-x86_64', 'mariadb'),
      upstreamHash: mariaDbHashes.win64,
      type: 'archive_manifest',
    },
    {
      target: 'linux-x86_64',
      component: 'frankenPhp',
      name: 'frankenphp-linux-x86_64',
      version: frankenRelease.tag_name.replace(/^v/, ''),
      url: `https://github.com/php/frankenphp/releases/download/${frankenRelease.tag_name}/frankenphp-linux-x86_64`,
      currentHash: extractPinnedHash(scriptContent, 'linux-x86_64', 'frankenphp'),
      upstreamHash: null,
      type: 'download',
    },
    {
      target: 'linux-x86_64',
      component: 'mariadb',
      name: `mariadb-${mariaDbVersion}-linux-systemd-x86_64.tar.gz`,
      version: mariaDbVersion,
      url: `https://archive.mariadb.org/mariadb-${mariaDbVersion}/bintar-linux-systemd-x86_64/mariadb-${mariaDbVersion}-linux-systemd-x86_64.tar.gz`,
      currentHash: extractPinnedHash(scriptContent, 'linux-x86_64', 'mariadb'),
      upstreamHash: mariaDbHashes.linux64,
      type: 'archive_manifest',
    },
    {
      target: 'macos-aarch64',
      component: 'frankenPhp',
      name: 'frankenphp-mac-arm64',
      version: frankenRelease.tag_name.replace(/^v/, ''),
      url: `https://github.com/php/frankenphp/releases/download/${frankenRelease.tag_name}/frankenphp-mac-arm64`,
      currentHash: extractPinnedMacHash(scriptContent, 'arm64'),
      upstreamHash: null,
      type: 'download',
    },
    {
      target: 'macos-x86_64',
      component: 'frankenPhp',
      name: 'frankenphp-mac-x86_64',
      version: frankenRelease.tag_name.replace(/^v/, ''),
      url: `https://github.com/php/frankenphp/releases/download/${frankenRelease.tag_name}/frankenphp-mac-x86_64`,
      currentHash: extractPinnedMacHash(scriptContent, 'x86_64'),
      upstreamHash: null,
      type: 'download',
    },
    {
      target: 'macos',
      component: 'mariadb',
      name: `mariadb-${mariaDbVersion}.tar.gz`,
      version: mariaDbVersion,
      url: `https://archive.mariadb.org/mariadb-${mariaDbVersion}/source/mariadb-${mariaDbVersion}.tar.gz`,
      currentHash: extractPinnedMacMariaDbHash(scriptContent),
      upstreamHash: mariaDbHashes.source,
      type: 'archive_manifest',
    },
  ];

  // 5. Filter if target specified
  const activePackages =
    targetFilter === 'all'
      ? packages
      : packages.filter((p) => p.target === targetFilter || p.target === 'macos');

  // 6. Compute hashes for packages that need stream verification (FrankenPHP)
  console.log('🔐 Computing & Verifying SHA-256 for all packages:');
  for (const pkg of activePackages) {
    if (!pkg.upstreamHash) {
      process.stdout.write(`   ⏳ [${pkg.target}] ${pkg.name}... `);
      pkg.upstreamHash = await computeOrGetSha256(pkg.url, pkg.name);
      process.stdout.write(`done\n`);
    }
  }

  // 7. Display comparison table
  console.log('\n📊 Hash Comparison & Status Summary:');
  console.log('='.repeat(105));
  console.log(
    `${'Target'.padEnd(16)} | ${'Package'.padEnd(42)} | ${'Status'.padEnd(10)} | SHA-256 Checksum`
  );
  console.log('='.repeat(105));

  let changesCount = 0;
  for (const pkg of activePackages) {
    const isMatch = pkg.currentHash === pkg.upstreamHash;
    if (!isMatch) changesCount++;
    const statusStr = isMatch ? '✅ MATCH' : '❌ UPDATE';
    console.log(
      `${pkg.target.padEnd(16)} | ${pkg.name.slice(0, 42).padEnd(42)} | ${statusStr.padEnd(10)} | ${pkg.upstreamHash}`
    );
    if (!isMatch) {
      console.log(`${''.padEnd(16)} | ${''.padEnd(42)} | ${'  pinned'.padEnd(10)} | ${pkg.currentHash}`);
    }
  }
  console.log('='.repeat(105));

  if (changesCount === 0) {
    console.log('\n✨ All pinned SHA-256 hashes in prepare-server-runtime.mjs are 100% UP TO DATE!');
    return;
  }

  console.log(`\n⚠️  Found ${changesCount} package(s) with updated upstream hashes.`);

  if (shouldWrite) {
    console.log('📝 Updating prepare-server-runtime.mjs...');
    let updatedContent = scriptContent;

    for (const pkg of activePackages) {
      if (pkg.currentHash && pkg.upstreamHash && pkg.currentHash !== pkg.upstreamHash) {
        updatedContent = updatedContent.replace(pkg.currentHash, pkg.upstreamHash);
      }
    }

    await writeFile(PREPARE_SCRIPT_PATH, updatedContent, 'utf8');
    console.log('✅ Successfully updated prepare-server-runtime.mjs with new upstream hashes!');
  } else {
    console.log('💡 Run with --write to automatically apply these changes to prepare-server-runtime.mjs:');
    console.log('   node scripts/sync-server-runtime-upstream.mjs --write');
  }
}

async function fetchFrankenPhpRelease() {
  const res = await fetch('https://api.github.com/repos/php/frankenphp/releases/tags/v1.12.7', {
    headers: { 'User-Agent': 'accore-sync-script' },
  });
  if (!res.ok) {
    const latestRes = await fetch('https://api.github.com/repos/php/frankenphp/releases/latest', {
      headers: { 'User-Agent': 'accore-sync-script' },
    });
    if (!latestRes.ok) throw new Error(`GitHub API error: ${latestRes.statusText}`);
    return latestRes.json();
  }
  return res.json();
}

async function fetchMariaDbOfficialHashes(version) {
  const urls = {
    win64: `https://archive.mariadb.org/mariadb-${version}/winx64-packages/sha256sums.txt`,
    linux64: `https://archive.mariadb.org/mariadb-${version}/bintar-linux-systemd-x86_64/sha256sums.txt`,
    source: `https://archive.mariadb.org/mariadb-${version}/source/sha256sums.txt`,
  };

  const results = {};
  for (const [key, url] of Object.entries(urls)) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            const hash = parts[0];
            const file = parts[1].replace(/^\.\//, '');
            if (file.endsWith('.zip') || file.endsWith('.tar.gz')) {
              results[key] = hash;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Warning: Could not fetch MariaDB ${key} sha256sums:`, e.message);
    }
  }
  return results;
}

async function computeOrGetSha256(url, filename) {
  const candidatePaths = [
    join(resolve(__dirname, '../../.runtime-cache'), filename),
    join(resolve(__dirname, '../../.runtime-cache/windows-x86_64'), filename),
    join(TEMP_DIR, filename),
  ];

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      const hash = await hashLocalFile(p);
      if (hash) return hash;
    }
  }

  const destPath = join(TEMP_DIR, filename);
  await new Promise((resolveCommand, rejectCommand) => {
    const curl = spawn(
      'curl.exe',
      ['-s', '-L', '-C', '-', '--retry', '5', '--retry-delay', '2', url, '-o', destPath],
      { stdio: 'ignore' }
    );
    curl.on('exit', (code) => (code === 0 ? resolveCommand() : rejectCommand(new Error(`curl exited ${code}`))));
    curl.on('error', rejectCommand);
  });

  return hashLocalFile(destPath);
}

async function hashLocalFile(filePath) {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

function extractPinnedHash(content, target, component) {
  const targetRegex = new RegExp(`'${target}':\\s*\\{[\\s\\S]*?${component}:\\s*\\{[\\s\\S]*?sha256:\\s*'([a-f0-9]{64})'`, 'i');
  const match = content.match(targetRegex);
  return match ? match[1] : null;
}

function extractPinnedMacHash(content, arch) {
  const macRegex = new RegExp(`macDefinition\\(\\s*'${arch}',\\s*'([a-f0-9]{64})'`, 'i');
  const match = content.match(macRegex);
  return match ? match[1] : null;
}

function extractPinnedMacMariaDbHash(content) {
  const macRegex = /macDefinition[\s\S]*?mariadb:\s*\{[\s\S]*?sha256:\s*'([a-f0-9]{64})'/i;
  const match = content.match(macRegex);
  return match ? match[1] : null;
}

function extractCurrentMariaDbVersion(content) {
  const match = content.match(/mariadb-(\d+\.\d+\.\d+)/);
  return match ? match[1] : '11.4.9';
}

main().catch((err) => {
  console.error('\n❌ Error during sync:', err.message);
  process.exit(1);
});
