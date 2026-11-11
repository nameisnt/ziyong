/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { ScriptTarget, transpileModule } from 'typescript';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

function functionSource(fileSource, name) {
  const start = fileSource.indexOf(`function ${name}(`);
  // 同时兼容 LF 与 CRLF 检出，Windows 上工作区经常是 CRLF。
  const endMatch = /\r?\n\}\r?\n/u.exec(fileSource.slice(start));
  const end = endMatch && start >= 0 ? start + endMatch.index : -1;
  assert.ok(start >= 0 && end > start, `${name} is missing`);
  return fileSource.slice(start, end + (endMatch[0].length - 1));
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
  const reread = reader.search(/getChatMessagesSafe\((?:String\()?sourceMessageId\)?, \{ include_swipes: false \}\)\[0\]/u);
  const result = reader.indexOf('storedMessage?.message === nextRawText ? content : false');

  assert.ok(reread >= 0, 'reader Bagu does not reread the written Tavern floor');
  assert.ok(result > reread, 'reader Bagu returns success before verifying the written Tavern floor');
  assert.doesNotMatch(reader, /return true;/u);
});

test('reader Bagu accepts a written current swipe and rejects an unchanged floor', async () => {
  const handler = functionSource(await source('src/apps/reader/ReaderApp.vue'), 'applyReaderBaguContent');
  const compiled = transpileModule(`async ${handler}`, {
    compilerOptions: { target: ScriptTarget.ES2022 },
  }).outputText;

  for (const writeSucceeds of [true, false]) {
    let stored = 'before';
    const run = runInNewContext(`${compiled}\napplyReaderBaguContent`, {
      activeMessage: { value: { sourceMessageId: '2', rawText: 'before', sourceBody: 'before' } },
      isViewingActiveSwipe: { value: true },
      isReadingCurrentChat: { value: true },
      replaceReaderBodyInRaw: (_raw, _body, content) => content,
      setChatMessagesSafe: async ([message]) => {
        if (writeSucceeds) stored = message.message;
      },
      saveChatIfAvailable: async () => {},
      getChatMessagesSafe: (_id, options) => options.include_swipes
        ? [{ swipe_id: 1, swipes: ['another version', stored] }]
        : [{ message: stored }],
      loadCurrentChat: async () => {},
    });
    assert.equal(await run('after'), writeSucceeds ? 'after' : false);
  }
});
