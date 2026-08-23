import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadVerifiedArchive } from './verified-download.mjs';

function digest(payload) {
  return createHash('sha256').update(payload).digest('hex');
}

async function withServer(handler, run) {
  const server = createServer(handler);
  server.keepAliveTimeout = 1;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}/archive`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function withCache(run) {
  const cache = await mkdtemp(join(tmpdir(), 'accore-verified-download-'));
  try {
    await run(cache);
  } finally {
    await rm(cache, { recursive: true, force: true });
  }
}

test('resumes a verified archive from a matching HTTP range', async () => {
  const payload = Buffer.from('ACCORE resumable MariaDB payload');
  const prefix = payload.subarray(0, 10);
  const requests = [];
  await withServer(
    (request, response) => {
      requests.push(request.headers.range ?? 'none');
      const offset = Number(request.headers.range?.match(/bytes=(\d+)-/)?.[1] ?? 0);
      response.writeHead(offset ? 206 : 200, {
        'Content-Length': payload.length - offset,
        ...(offset
          ? { 'Content-Range': `bytes ${offset}-${payload.length - 1}/${payload.length}` }
          : {}),
      });
      response.end(payload.subarray(offset));
    },
    async (url) => {
      await withCache(async (cache) => {
        await writeFile(join(cache, 'mariadb.tar.gz.partial'), prefix);
        const archive = await downloadVerifiedArchive(
          { id: 'mariadb', archive: 'mariadb.tar.gz', url, sha256: digest(payload) },
          cache,
          { attempts: 1, warn: () => {} }
        );
        assert.deepEqual(await readFile(archive), payload);
        assert.deepEqual(requests, ['bytes=10-']);
      });
    }
  );
});

test('replaces a partial archive when the origin ignores Range', async () => {
  const payload = Buffer.from('ACCORE clean full archive');
  const requests = [];
  await withServer(
    (request, response) => {
      requests.push(request.headers.range ?? 'none');
      response.writeHead(200, { 'Content-Length': payload.length });
      response.end(payload);
    },
    async (url) => {
      await withCache(async (cache) => {
        await writeFile(join(cache, 'mariadb.tar.gz.partial'), Buffer.from('stale-prefix'));
        const archive = await downloadVerifiedArchive(
          { id: 'mariadb', archive: 'mariadb.tar.gz', url, sha256: digest(payload) },
          cache,
          { attempts: 1, warn: () => {} }
        );
        assert.deepEqual(await readFile(archive), payload);
        assert.deepEqual(requests, ['bytes=12-']);
      });
    }
  );
});

test('aborts a stream that makes no progress while retaining retry semantics', async () => {
  let requests = 0;
  await withServer(
    (_request, response) => {
      requests += 1;
      response.writeHead(200, { 'Content-Length': 4 });
      response.flushHeaders();
    },
    async (url) => {
      await withCache(async (cache) => {
        await assert.rejects(
          downloadVerifiedArchive(
            { id: 'mariadb', archive: 'mariadb.tar.gz', url, sha256: digest(Buffer.from('data')) },
            cache,
            {
              attempts: 1,
              firstResponseTimeoutMilliseconds: 200,
              idleTimeoutMilliseconds: 40,
              warn: () => {},
            }
          ),
          /idle progress timed out after 40ms/
        );
        assert.equal(requests, 1);
      });
    }
  );
});

test('does not retry a permanent HTTP client error', async () => {
  let requests = 0;
  await withServer(
    (_request, response) => {
      requests += 1;
      response.writeHead(404);
      response.end();
    },
    async (url) => {
      await withCache(async (cache) => {
        await assert.rejects(
          downloadVerifiedArchive(
            { id: 'mariadb', archive: 'mariadb.tar.gz', url, sha256: digest(Buffer.from('data')) },
            cache,
            { attempts: 4, retryDelayMilliseconds: () => 0, warn: () => {} }
          ),
          /HTTP 404/
        );
        assert.equal(requests, 1);
      });
    }
  );
});

test('resumes a partial file retained after an interrupted stream', async () => {
  const payload = Buffer.from('ACCORE transient network interruption payload');
  const requests = [];
  let firstRequest = true;
  await withServer(
    (request, response) => {
      requests.push(request.headers.range ?? 'none');
      const offset = Number(request.headers.range?.match(/bytes=(\d+)-/)?.[1] ?? 0);
      if (firstRequest) {
        firstRequest = false;
        response.writeHead(200, { 'Content-Length': payload.length });
        response.write(payload.subarray(0, 12));
        setTimeout(() => response.destroy(), 25);
        return;
      }
      response.writeHead(206, {
        'Content-Length': payload.length - offset,
        'Content-Range': `bytes ${offset}-${payload.length - 1}/${payload.length}`,
      });
      response.end(payload.subarray(offset));
    },
    async (url) => {
      await withCache(async (cache) => {
        const archive = await downloadVerifiedArchive(
          { id: 'mariadb', archive: 'mariadb.tar.gz', url, sha256: digest(payload) },
          cache,
          {
            attempts: 2,
            retryDelayMilliseconds: () => 0,
            idleTimeoutMilliseconds: 500,
            warn: () => {},
          }
        );
        assert.deepEqual(await readFile(archive), payload);
        assert.equal(requests[0], 'none');
        assert.match(requests[1], /^bytes=\d+-$/);
      });
    }
  );
});

test('clears an HTTP 416 partial archive before retrying from byte zero', async () => {
  const payload = Buffer.from('ACCORE clean retry after rejected range');
  const requests = [];
  await withServer(
    (request, response) => {
      requests.push(request.headers.range ?? 'none');
      if (request.headers.range) {
        response.writeHead(416, { 'Content-Range': `bytes */${payload.length}` });
        response.end();
        return;
      }
      response.writeHead(200, { 'Content-Length': payload.length });
      response.end(payload);
    },
    async (url) => {
      await withCache(async (cache) => {
        await writeFile(join(cache, 'mariadb.tar.gz.partial'), Buffer.from('stale partial bytes'));
        const archive = await downloadVerifiedArchive(
          { id: 'mariadb', archive: 'mariadb.tar.gz', url, sha256: digest(payload) },
          cache,
          { attempts: 2, retryDelayMilliseconds: () => 0, warn: () => {} }
        );
        assert.deepEqual(await readFile(archive), payload);
        assert.deepEqual(requests, ['bytes=19-', 'none']);
      });
    }
  );
});

test('replaces a corrupt completed cache entry with a SHA-verified archive', async () => {
  const payload = Buffer.from('ACCORE replacement of corrupt completed cache');
  let requests = 0;
  await withServer(
    (_request, response) => {
      requests += 1;
      response.writeHead(200, { 'Content-Length': payload.length });
      response.end(payload);
    },
    async (url) => {
      await withCache(async (cache) => {
        await writeFile(join(cache, 'mariadb.tar.gz'), Buffer.from('wrong completed bytes'));
        const archive = await downloadVerifiedArchive(
          { id: 'mariadb', archive: 'mariadb.tar.gz', url, sha256: digest(payload) },
          cache,
          { attempts: 1, warn: () => {} }
        );
        assert.deepEqual(await readFile(archive), payload);
        assert.equal(requests, 1);
      });
    }
  );
});
