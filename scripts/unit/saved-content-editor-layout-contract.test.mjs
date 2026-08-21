/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const global = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const files = {
  customApp: await readFile(new URL('../../src/apps/app-builder/CustomAppHost.vue', import.meta.url), 'utf8'),
  digest: await readFile(new URL('../../src/apps/digest/DigestApp.vue', import.meta.url), 'utf8'),
  entryLibrary: await readFile(new URL('../../src/apps/entry-library/pages/EntryLibraryItemEditorPage.vue', import.meta.url), 'utf8'),
  worldbook: await readFile(new URL('../../src/apps/worldbook-link/pages/WorldbookEntryEditorPage.vue', import.meta.url), 'utf8'),
  worldSlots: await readFile(new URL('../../src/apps/world-slots/WorldSlotsApp.vue', import.meta.url), 'utf8'),
  diary: await readFile(new URL('../../src/components/diary/DiaryEntryEditorPage.vue', import.meta.url), 'utf8'),
  extrasChapter: await readFile(new URL('../../src/components/extras/ExtrasChapterEditorPage.vue', import.meta.url), 'utf8'),
  extrasSummary: await readFile(new URL('../../src/components/extras/ExtrasSummaryEditorPage.vue', import.meta.url), 'utf8'),
  forum: await readFile(new URL('../../src/components/forum/ForumThreadEditorPage.vue', import.meta.url), 'utf8'),
  letters: await readFile(new URL('../../src/components/letters/LettersEntryEditorPage.vue', import.meta.url), 'utf8'),
  summary: await readFile(new URL('../../src/components/summary/SummaryEntryEditorPage.vue', import.meta.url), 'utf8'),
  theater: await readFile(new URL('../../src/components/theater/TheaterEntryEditorPage.vue', import.meta.url), 'utf8'),
};

test('saved entity editors use the shared remaining-height body layout', () => {
  assert.match(global, /\.pc-saved-content-editor-page\s*\{[^}]*height:\s*100%/s);
  assert.match(global, /\.pc-saved-content-editor\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
  assert.match(global, /\.pc-saved-content-editor\s+\.pc-saved-content-area\s*\{[^}]*height:\s*100%[^}]*resize:\s*none/s);

  const failures = [];
  for (const [label, source] of Object.entries(files)) {
    if (!source.includes('pc-saved-content-editor-page')) failures.push(`${label} has no editor page layout`);
    if (!source.includes('pc-saved-content-editor')) failures.push(`${label} has no editor container layout`);
    if (!source.includes('pc-saved-content-area')) failures.push(`${label} body is not marked as saved content`);
  }
  assert.deepEqual(failures, []);
});
