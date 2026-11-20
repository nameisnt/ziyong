/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

async function source(relativePath) {
  return readFile(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

test('the shared flow snapshots the rewrite target before awaiting the generation', async () => {
  const flow = await source('../../src/composables/runContentGenerationFlow.ts');
  const capture = flow.indexOf('const target = options.captureTarget();');
  const run = flow.indexOf('const outcome = await options.run(target);');
  assert.ok(capture >= 0, 'flow must snapshot the target');
  assert.ok(run >= 0, 'flow must run the generation with the snapshot');
  assert.ok(capture < run, 'the snapshot must be taken before the await');
});

test('the shared flow owns the failed draft and preview branches', async () => {
  const flow = await source('../../src/composables/runContentGenerationFlow.ts');
  assert.match(flow, /completeSingleGenerationFailedDraft\(/u);
  assert.match(flow, /options\.session\.complete\(task\.id, \{\s*currentLabel: plan\.completeLabel,/u);
  assert.match(flow, /presentGeneratedPage\(/u);
});

test('the writing apps delegate their generate action to the shared flow', async () => {
  for (const file of [
    '../../src/apps/diary/DiaryApp.vue',
    '../../src/apps/letters/LettersApp.vue',
    '../../src/apps/theater/TheaterApp.vue',
  ]) {
    const app = await source(file);
    assert.match(app, /runContentGenerationFlow\(\{/u, `${file} must call the shared flow`);
    assert.doesNotMatch(
      app,
      /import \{[^}]*completeSingleGenerationFailedDraft/u,
      `${file} must not hand-roll the failed draft branch`,
    );
    assert.match(app, /captureTarget: \(\) =>/u, `${file} must capture its rewrite target`);
  }
});
