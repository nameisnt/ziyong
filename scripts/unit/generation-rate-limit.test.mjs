/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

globalThis.window = globalThis;

async function loadGenerationRateLimit() {
  const source = await readFile(new URL('../../src/core/generationRateLimit.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: 'generationRateLimit.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const generationRateLimit = await loadGenerationRateLimit();
const generationRetry = await (async () => {
  const source = await readFile(new URL('../../src/core/generationRetry.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'generationRetry.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
})();

test('zero RPM does not delay a generation request', async () => {
  await generationRateLimit.waitForGenerationRateLimit(0);
});

test('an aborted generation request is rejected before rate-limit scheduling', async () => {
  const controller = new AbortController();
  const reason = new Error('stop requested');
  controller.abort(reason);

  await assert.rejects(generationRateLimit.waitForGenerationRateLimit(1, controller.signal), reason);
});

test('retry delay resolves immediately at zero and remains abortable', async () => {
  await generationRateLimit.waitForGenerationRetry(0);

  const controller = new AbortController();
  const reason = new Error('cancel retry');
  const waiting = generationRateLimit.waitForGenerationRetry(100, controller.signal);
  controller.abort(reason);
  await assert.rejects(waiting, reason);
});

test('rate-limited generation retries twice with exponential backoff before succeeding', async () => {
  const retryDelays = [];
  let rateLimitChecks = 0;
  let attempts = 0;
  const result = await generationRetry.runGenerationTaskWithRateLimitRetries({
    task: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('HTTP 429');
      return 'saved';
    },
    waitForRateLimit: async () => {
      rateLimitChecks += 1;
    },
    waitForRetry: async delayMs => {
      retryDelays.push(delayMs);
    },
  });

  assert.equal(result, 'saved');
  assert.equal(attempts, 3);
  assert.deepEqual(retryDelays, [2_000, 4_000]);
  assert.equal(rateLimitChecks, 3);
});

test('a third rate-limit failure and non-rate-limit failures are surfaced unchanged', async () => {
  let attempts = 0;
  await assert.rejects(
    generationRetry.runGenerationTaskWithRateLimitRetries({
      task: async () => {
        attempts += 1;
        throw new Error('Too many requests');
      },
      waitForRateLimit: async () => undefined,
      waitForRetry: async () => undefined,
    }),
    /Too many requests/,
  );
  assert.equal(attempts, 3);

  const original = new Error('invalid response');
  await assert.rejects(
    generationRetry.runGenerationTaskWithRateLimitRetries({
      task: async () => {
        throw original;
      },
      waitForRateLimit: async () => undefined,
      waitForRetry: async () => undefined,
    }),
    error => error === original,
  );
});
