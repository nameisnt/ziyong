/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readMaybe(url) {
  try {
    return await readFile(url, 'utf8');
  } catch {
    return '';
  }
}

const runnerSource = await readMaybe(new URL('../../src/composables/runSingleGeneration.ts', import.meta.url));
const diarySource = await readMaybe(new URL('../../src/apps/diary/DiaryApp.vue', import.meta.url));
const lettersSource = await readMaybe(new URL('../../src/apps/letters/LettersApp.vue', import.meta.url));
const theaterSource = await readMaybe(new URL('../../src/apps/theater/TheaterApp.vue', import.meta.url));

test('the shared runner keeps the task session wiring in one place', () => {
  assert.match(runnerSource, /export async function runSingleGeneration</u);
  assert.match(runnerSource, /task = options\.session\.create\(options\.createOverrides\);/u);
  assert.match(runnerSource, /options\.session\.fail\(task\.id, new Error\(validationMessage\)\);/u);
  assert.match(runnerSource, /lifecycle: options\.session\.lifecycle\(task\.id\),/u);
  assert.match(runnerSource, /catch \(error\) \{\s*options\.session\.fail\(task\.id, error\);/u);
  assert.match(runnerSource, /export function completeSingleGenerationFailedDraft/u);
});

test('apps route single-task generation through the shared runner', () => {
  for (const [name, source] of [
    ['diary', diarySource],
    ['letters', lettersSource],
    ['theater', theaterSource],
  ]) {
    if (!source.includes('runSingleGeneration')) continue;
    assert.match(source, /from '@\/composables\/runSingleGeneration';/u, `${name} must import the shared runner`);
    assert.doesNotMatch(
      source,
      /try \{\s*\w+GenerationSession\.create\(/u,
      `${name} must not keep its own task creation block`,
    );
  }
});

test('diary delegates its single generation to the shared flow', () => {
  assert.match(diarySource, /runContentGenerationFlow\(\{/u);
  assert.match(diarySource, /run: target =>\s*runSingleGeneration\(\{/u);
  assert.match(diarySource, /session: diaryGenerationSession,/u);
  assert.doesNotMatch(diarySource, /completeSingleGenerationFailedDraft\(\{/u);
});

test('letters and theater keep their explicit generation targets inside the flow snapshot', () => {
  assert.match(lettersSource, /captureTarget: \(\) => \{[\s\S]*targetEntryId: rewriteLetterEntry\.value\?\.id \|\| '',/u);
  assert.match(theaterSource, /captureTarget: \(\) => \{[\s\S]*entryId: rewriteTargetEntry\.value\?\.id \|\| '',/u);
  assert.match(lettersSource, /run: target =>\s*runSingleGeneration\(\{/u);
  assert.match(theaterSource, /run: target =>\s*runSingleGeneration\(\{/u);
});
