/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const globalCss = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const consumers = [
  '../../src/components/extras/ExtrasChapterEditorPage.vue',
  '../../src/components/extras/ExtrasSummaryEditorPage.vue',
  '../../src/components/diary/DiaryEntryEditorPage.vue',
  '../../src/components/letters/LettersEntryEditorPage.vue',
  '../../src/components/forum/ForumThreadEditorPage.vue',
  '../../src/components/summary/SummaryEntryEditorPage.vue',
  '../../src/components/theater/TheaterEntryEditorPage.vue',
  '../../src/apps/entry-library/pages/EntryLibraryItemEditorPage.vue',
  '../../src/apps/worldbook-link/pages/WorldbookEntryEditorPage.vue',
  '../../src/apps/digest/DigestApp.vue',
  '../../src/apps/world-slots/WorldSlotsApp.vue',
];

test('saved editors override page-section grid after the shared page rule', async () => {
  const pageRuleIndex = globalCss.indexOf('.pc-phone-root .pc-page-section {');
  const combinedRuleIndex = globalCss.indexOf('.pc-phone-root .pc-page-section.pc-saved-content-editor {');

  assert.ok(pageRuleIndex >= 0, 'shared page-section rule is missing');
  assert.ok(combinedRuleIndex > pageRuleIndex, 'saved editor flex override must follow the page-section grid rule');
  assert.match(
    globalCss.slice(combinedRuleIndex),
    /^\.pc-phone-root \.pc-page-section\.pc-saved-content-editor\s*\{[^}]*display:\s*flex;/su,
  );
  assert.match(globalCss, /\.pc-phone-root \.pc-saved-content-editor > \.pc-form-actions\s*\{[^}]*flex:\s*0 0 auto;/su);

  const sources = await Promise.all(consumers.map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  for (const [index, source] of sources.entries()) {
    assert.match(source, /class="[^"]*\bpc-page-section\b[^"]*\bpc-saved-content-editor\b[^"]*"/u, consumers[index]);
  }
});
