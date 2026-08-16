/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const shellSource = await readFile(new URL('../../src/components/ReaderDetailShell.vue', import.meta.url), 'utf8');
const consumers = [
  ['diary', '../../src/components/diary/DiaryEntryDetailPage.vue'],
  ['extras', '../../src/components/extras/ExtrasChapterDetailPage.vue'],
  ['forum', '../../src/components/forum/ForumThreadDetailPage.vue'],
  ['letters', '../../src/components/letters/LettersEntryDetailPage.vue'],
  ['theater', '../../src/components/theater/TheaterEntryDetailPage.vue'],
];

test('reader shell owns one optional generation source label presentation', () => {
  assert.match(shellSource, /sourceLabel\?:\s*string;/u);
  assert.match(shellSource, /class="pc-reader-source-label"/u);
  assert.match(shellSource, /\.pc-reader-source-label\s*\{/u);
});

test('all five generated reading domains pass their persisted source to the shared shell', async () => {
  for (const [name, relativePath] of consumers) {
    const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    assert.match(source, /:source-label=/u, `${name} does not pass a source label`);
    assert.match(source, /replay\??\.source\.label/u, `${name} does not consume the persisted replay source`);
  }
});
