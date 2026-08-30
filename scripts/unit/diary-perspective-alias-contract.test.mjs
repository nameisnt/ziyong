/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [app, store] = await Promise.all([
  readFile(new URL('../../src/apps/diary/DiaryApp.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/store/diary.ts', import.meta.url), 'utf8'),
]);

test('diary identity macros resolve before generation and persistence', () => {
  assert.match(app, /resolveGenerationIdentityAliases\(generationAliases\)/u);
  assert.match(app, /const generationPerspective = computed/u);
  assert.match(app, /const batchPerspective = computed/u);
  assert.match(app, /const reactionPerspective = computed/u);
  assert.match(app, /resolveDiaryPerspective\(draft\.context\.perspective as CharacterRef\)/u);
  assert.match(app, /resolveBatchTaskIdentity\(existingTask\)/u);
});

test('stored macro books repair in place without merging or deleting books', () => {
  const repairSource = store.slice(
    store.indexOf('function resolvePerspectiveAliases'),
    store.indexOf('function ensureBook'),
  );
  assert.match(store, /function resolvePerspectiveAliases/u);
  assert.match(repairSource, /if \(duplicate\) \{/u);
  assert.match(repairSource, /skipped \+= 1/u);
  assert.doesNotMatch(repairSource, /deleteBook\(/u);
  assert.match(app, /diary\.resolvePerspectiveAliases\(resolveDiaryIdentityName\)/u);
});
