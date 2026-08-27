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
  diary: await readFile(new URL('../../src/apps/diary/DiaryEntryEditorPage.vue', import.meta.url), 'utf8'),
  extrasChapter: await readFile(new URL('../../src/apps/extras/ExtrasChapterEditorPage.vue', import.meta.url), 'utf8'),
  extrasSummary: await readFile(new URL('../../src/apps/extras/ExtrasSummaryEditorPage.vue', import.meta.url), 'utf8'),
  forum: await readFile(new URL('../../src/apps/forum/ForumThreadEditorPage.vue', import.meta.url), 'utf8'),
  letters: await readFile(new URL('../../src/apps/letters/LettersEntryEditorPage.vue', import.meta.url), 'utf8'),
  summary: await readFile(new URL('../../src/apps/summary/SummaryEntryEditorPage.vue', import.meta.url), 'utf8'),
  theater: await readFile(new URL('../../src/apps/theater/TheaterEntryEditorPage.vue', import.meta.url), 'utf8'),
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

    const pageClassList = source.match(/class="([^"]*\bpc-saved-content-editor-page\b[^"]*)"/u)?.[1].split(/\s+/u) ?? [];
    const localPageClass = pageClassList.find(className => className !== 'pc-saved-content-editor-page');
    if (localPageClass) {
      const escapedClass = localPageClass.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const localRule = new RegExp(`\\.${escapedClass}\\s*\\{([^}]*)\\}`, 'gu');
      for (const match of source.matchAll(localRule)) {
        if (/display:\s*grid|align-content:\s*start/u.test(match[1])) {
          failures.push(`${label} overrides the shared remaining-height page layout`);
        }
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('worldbook editor keeps its long body above a separate footer', () => {
  const source = files.worldbook;
  assert.match(source, /class="pc-worldbook-entry-editor-body"/u);
  assert.match(source, /\.pc-worldbook-entry-editor-body\s*\{[^}]*overflow-y:\s*auto/su);
  assert.match(source, /\.pc-worldbook-content-field\s*\{[^}]*min-height:\s*300px/su);
  assert.match(source, /\.pc-worldbook-entry-editor-actions\s*\{[^}]*flex:\s*0 0 auto/su);
  assert.ok(
    source.indexOf('class="pc-worldbook-entry-editor-body"') <
      source.indexOf('class="pc-form-actions pc-worldbook-entry-editor-actions"'),
    'worldbook footer must follow the scrollable editor body',
  );
});
