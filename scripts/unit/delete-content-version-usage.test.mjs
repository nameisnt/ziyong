/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const consumers = [
  'src/apps/diary/DiaryApp.vue',
  'src/apps/letters/LettersApp.vue',
  'src/apps/theater/TheaterApp.vue',
  'src/apps/extras/useExtrasDeletionSession.ts',
  'src/apps/forum/useForumDeletionSession.ts',
];

test('every versioned app delegates single-version deletion to the shared flow', async () => {
  for (const path of consumers) {
    const source = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
    assert.match(source, /from '@\/util\/deleteContentVersion'/u, `${path} must import the shared deletion flow with confirmation`);
    assert.match(source, /deleteContentVersionWithConfirmation\(/u, `${path} must call the shared deletion flow with confirmation`);
    assert.doesNotMatch(
      source,
      /versions\.length <= 1\) return;/u,
      `${path} should leave the single-version guard to the shared flow`,
    );
    assert.doesNotMatch(
      source,
      /\(versionIndex - 1 \+ versions\.length\) % versions\.length/u,
      `${path} should leave the previous-version lookup to the shared flow`,
    );
  }
});
