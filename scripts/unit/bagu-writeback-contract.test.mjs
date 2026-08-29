/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

function functionSource(fileSource, name) {
  const start = fileSource.indexOf(`function ${name}(`);
  const end = fileSource.indexOf('\n}\n', start);
  assert.ok(start >= 0 && end > start, `${name} is missing`);
  return fileSource.slice(start, end + 2);
}

test('Bagu reports success only after the writeback returns the stored content', async () => {
  const panel = await source('src/components/BaguScanPanel.vue');
  const failureCheck = panel.indexOf('appliedContent === false || appliedContent.trim() !== nextContent.trim()');
  const successNotice = panel.indexOf('phone.noticeSuccess(successMessage)');

  assert.match(panel, /BaguWritebackResult \| Promise<BaguWritebackResult>/u);
  assert.ok(failureCheck >= 0, 'Bagu writeback does not compare the stored content');
  assert.ok(successNotice > failureCheck, 'Bagu success is reported before the stored content is verified');
});

test('stored-content Bagu handlers flush their chat scope and return the updated target', async () => {
  const handlers = [
    ['src/apps/diary/DiaryApp.vue', 'applyDiaryBaguContent', 'diary'],
    ['src/apps/summary/SummaryApp.vue', 'applySummaryBaguContent', 'summary'],
    ['src/apps/digest/DigestApp.vue', 'applyDigestBaguContent', 'digest'],
    ['src/apps/theater/TheaterApp.vue', 'applyTheaterBaguContent', 'theater'],
    ['src/apps/extras/ExtrasApp.vue', 'applyExtrasBaguContent', 'extras'],
    ['src/apps/forum/ForumApp.vue', 'applyForumBaguContent', 'forum'],
    ['src/apps/letters/LettersApp.vue', 'applyLettersBaguContent', 'letters'],
  ];

  for (const [file, functionName, store] of handlers) {
    const handler = functionSource(await source(file), functionName);
    assert.match(handler, new RegExp(`${store}\\.flushCurrentScope\\(\\)`, 'u'), file);
    assert.match(handler, /return [^;]*\.content/u, file);
    assert.doesNotMatch(handler, /return Boolean\(/u, file);
  }

  const chatScoped = await source('src/store/chatScoped.ts');
  assert.match(chatScoped, /flushCurrentScope: persistCurrentScope/u);
});

test('reader Bagu verifies the Tavern floor before reporting success', async () => {
  const reader = functionSource(await source('src/apps/reader/ReaderApp.vue'), 'applyReaderBaguContent');
  const reread = reader.indexOf('getChatMessagesSafe(sourceMessageId, { include_swipes: true })[0]');
  const result = reader.indexOf('storedMessage?.message === nextRawText ? content : false');

  assert.ok(reread >= 0, 'reader Bagu does not reread the written Tavern floor');
  assert.ok(result > reread, 'reader Bagu returns success before verifying the written Tavern floor');
  assert.doesNotMatch(reader, /return true;/u);
});
