import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const DEFAULT_ATTEMPTS = 4;
const DEFAULT_FIRST_RESPONSE_TIMEOUT_MILLISECONDS = 30_000;
const DEFAULT_IDLE_TIMEOUT_MILLISECONDS = 120_000;

/**
 * Downloads a pinned archive into a durable cache. Interrupted transient downloads
 * preserve the partial file and resume only when the server proves it honored the
 * requested byte offset. A completed archive is accepted only after SHA-256
 * verification and an atomic rename.
 */
export async function downloadVerifiedArchive(source, cacheRoot, options = {}) {
  const archivePath = join(cacheRoot, source.archive);
  if (await hasExpectedDigest(archivePath, source.sha256)) return archivePath;

  // Remove a stale or corrupt completed file before the atomic promotion. This
  // keeps replacement semantics deterministic on Windows as well as Unix.
  await rm(archivePath, { force: true });
  const partialPath = `${archivePath}.partial`;
  await mkdir(cacheRoot, { recursive: true });
  await downloadWithRetries(source, partialPath, options);

  if (!(await hasExpectedDigest(partialPath, source.sha256))) {
    await rm(partialPath, { force: true });
    throw new Error(`SHA-256 mismatch for ${source.id}; discarded ${basename(partialPath)}`);
  }

  await rename(partialPath, archivePath);
  return archivePath;
}

export async function hasExpectedDigest(path, expected) {
  try {
    const digest = await new Promise((resolveDigest, rejectDigest) => {
      const hash = createHash('sha256');
      const stream = createReadStream(path);
      stream.once('error', rejectDigest);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.once('end', () => resolveDigest(hash.digest('hex')));
    });
    return digest === expected;
  } catch {
    return false;
  }
}

async function downloadWithRetries(source, partialPath, options) {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const firstResponseTimeoutMilliseconds =
    options.firstResponseTimeoutMilliseconds ?? DEFAULT_FIRST_RESPONSE_TIMEOUT_MILLISECONDS;
  const idleTimeoutMilliseconds =
    options.idleTimeoutMilliseconds ?? DEFAULT_IDLE_TIMEOUT_MILLISECONDS;
  const retryDelayMilliseconds = options.retryDelayMilliseconds ?? ((attempt) => attempt * 5_000);
  const warn = options.warn ?? console.warn;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await downloadAttempt(source, partialPath, {
        firstResponseTimeoutMilliseconds,
        idleTimeoutMilliseconds,
        warn,
      });
      return;
    } catch (error) {
      if (error?.permanent) throw error;
      lastError = error;
    }

    if (attempt < attempts) {
      const delay = retryDelayMilliseconds(attempt);
      warn(
        `download attempt ${attempt}/${attempts} failed for ${source.id}: ${lastError.message}; retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw new Error(
    `failed to download ${source.id} after ${attempts} attempts: ${lastError.message}`,
    {
      cause: lastError,
    }
  );
}

async function downloadAttempt(source, partialPath, options) {
  const offset = await fileSize(partialPath);
  const controller = new AbortController();
  let firstResponseTimedOut = false;
  const firstResponseTimeout = setTimeout(() => {
    firstResponseTimedOut = true;
    controller.abort(
      new Error(`first response timed out after ${options.firstResponseTimeoutMilliseconds}ms`)
    );
  }, options.firstResponseTimeoutMilliseconds);

  let response;
  try {
    response = await fetch(source.url, {
      redirect: 'follow',
      headers: offset > 0 ? { Range: `bytes=${offset}-` } : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    throw timeoutError(
      source,
      'first response',
      options.firstResponseTimeoutMilliseconds,
      firstResponseTimedOut,
      error
    );
  } finally {
    clearTimeout(firstResponseTimeout);
  }

  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => {});
    const error = new Error(`failed to download ${source.id}: HTTP ${response.status}`);
    if (
      response.status >= 400 &&
      response.status < 500 &&
      response.status !== 416 &&
      response.status !== 429
    ) {
      error.permanent = true;
    }
    if (response.status === 416 && offset > 0) {
      await rm(partialPath, { force: true });
      error.message = `partial download range was rejected for ${source.id}; cleared it for a clean retry`;
    }
    throw error;
  }

  const resume = offset > 0 && response.status === 206 && hasMatchingContentRange(response, offset);
  if (offset > 0 && response.status === 206 && !resume) {
    await response.body.cancel().catch(() => {});
    await rm(partialPath, { force: true });
    throw new Error(
      `partial download range did not match offset ${offset} for ${source.id}; cleared it for a clean retry`
    );
  }

  if (offset > 0 && !resume) {
    // A normal 200 response to a Range request means the origin ignored Range.
    // Replace, never append, so the completed SHA-256 still protects the cache.
    await rm(partialPath, { force: true });
  }

  const startOffset = resume ? offset : 0;
  options.warn(
    `${resume ? 'resuming' : 'downloading'} ${source.id} from byte ${startOffset}${
      response.headers.get('content-length')
        ? ` (${response.headers.get('content-length')} response bytes)`
        : ''
    }`
  );
  await streamResponseWithIdleTimeout(
    response.body,
    partialPath,
    resume,
    source,
    options,
    controller
  );
}

async function streamResponseWithIdleTimeout(
  body,
  partialPath,
  append,
  source,
  options,
  controller
) {
  let timedOut = false;
  let idleTimeout;
  const resetIdleTimeout = () => {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
      timedOut = true;
      controller.abort(
        new Error(`download made no progress for ${options.idleTimeoutMilliseconds}ms`)
      );
    }, options.idleTimeoutMilliseconds);
  };
  const progress = new Transform({
    transform(chunk, _encoding, callback) {
      resetIdleTimeout();
      callback(null, chunk);
    },
  });
  resetIdleTimeout();
  try {
    await pipeline(
      Readable.fromWeb(body),
      progress,
      createWriteStream(partialPath, { flags: append ? 'a' : 'w' })
    );
  } catch (error) {
    throw timeoutError(source, 'idle progress', options.idleTimeoutMilliseconds, timedOut, error);
  } finally {
    clearTimeout(idleTimeout);
  }
}

function hasMatchingContentRange(response, expectedOffset) {
  const contentRange = response.headers.get('content-range');
  const match = contentRange?.match(/^bytes (\d+)-(\d+)\/(\d+|\*)$/i);
  return match && Number(match[1]) === expectedOffset && Number(match[2]) >= expectedOffset;
}

function timeoutError(source, kind, milliseconds, timedOut, cause) {
  if (!timedOut) return cause;
  return new Error(`download ${kind} timed out after ${milliseconds}ms for ${source.id}`, {
    cause,
  });
}

async function fileSize(path) {
  try {
    return (await stat(path)).size;
  } catch (error) {
    if (error?.code === 'ENOENT') return 0;
    throw error;
  }
}

function sleep(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
