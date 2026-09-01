/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [apiSource, appSource, detailSource, editorSource] = await Promise.all([
  readFile(new URL('../../src/apps/worldbook-link/api.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/worldbook-link/WorldbookLinkApp.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/worldbook-link/pages/WorldbookDetailPage.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/worldbook-link/pages/WorldbookEntryEditorPage.vue', import.meta.url), 'utf8'),
]);

test('worldbook detail exposes an accessible copy action and opens copy mode', () => {
  assert.match(detailSource, /pc-worldbook-entry-copy-btn/u);
  assert.match(detailSource, /:aria-label="t`复制条目`"/u);
  assert.match(detailSource, /\$emit\('copy-entry', entry\)/u);
  assert.match(appSource, /phone\.pushPage\('copy', '复制世界书条目'/u);
  assert.match(appSource, /:copying="route\.page === 'copy'"/u);
  assert.match(editorSource, /copying \? '保存副本' : '保存'/u);
});

test('worldbook copy preserves source fields and assigns a new raw uid', () => {
  const duplicateStart = apiSource.indexOf('async function duplicateWorldbookEntryRaw');
  const updateStart = apiSource.indexOf('\nasync function updateWorldbookEntryRaw', duplicateStart);
  const duplicateSource = apiSource.slice(duplicateStart, updateStart);

  assert.match(duplicateSource, /structuredClone\(sourcePair\[1\]/u);
  assert.match(duplicateSource, /copy\.uid = nextUid/u);
  assert.match(duplicateSource, /rawEntries\.push\(copy\)/u);
  assert.match(duplicateSource, /createWorldbookEntries/u);
});

test('worldbook helper failures are verified before any raw fallback write', () => {
  assert.match(apiSource, /verifyRawWorldbookAfterFailure/u);
  assert.match(apiSource, /worldbookEntriesEqual\(before, after\)/u);
  assert.match(apiSource, /entryMatchesPatch\(additions\[0\], patch\)/u);
  assert.match(apiSource, /实际结果无法确认，已停止再次写入/u);
});
