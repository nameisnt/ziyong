/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const service = await readFile(new URL('../../src/core/generationService.ts', import.meta.url), 'utf8');

test('a throwing output parser becomes a failed draft instead of a generation failure', () => {
  assert.match(service, /let parsed: ReturnType<typeof adapter\.parse>;/u);
  assert.match(service, /try \{\s*parsed = adapter\.parse\(parseInput, prepared\.parsedConfig\);/u);
  assert.match(service, /parsed = \{\s*ok: false,\s*raw: rawOutput,/u);
  assert.match(service, /解析失败：\$\{error instanceof Error \? error\.message : String\(error\)\}/u);
});

test('the failed draft keeps the raw output and warnings for the draft page', () => {
  assert.match(service, /rawOutput,\s*rawOutputSemantics: 'original-v1',\s*source: prepared\.source\.selection,\s*warnings: parsed\.warnings,/u);
});

const forumParser = await readFile(new URL('../../src/util/generation.ts', import.meta.url), 'utf8');
const builtinPrompts = await readFile(new URL('../../src/apps/builtinPrompts.ts', import.meta.url), 'utf8');

test('the forum parser reads the original poster mark from the op_author tag and keeps older forms working', () => {
  assert.match(forumParser, /find\(item => item\.tagName === 'op_author'\)/u);
  assert.match(forumParser, /opAuthorElement \|\| authorElement\?\.hasAttribute\('is_op'\) \? 'true' : legacyFlag \|\| 'false'/u);
  assert.match(forumParser, /getDirectChildText\(reply, 'is_op'\)/u);
  assert.doesNotMatch(forumParser, /缺少 <is_op>/u);
});

test('the main post and the reply generator read reply authors through the same helper', () => {
  assert.match(forumParser, /function readForumReplyElement\(reply: Element\)/u);
  assert.equal((forumParser.match(/replyElements\.map\(readForumReplyElement\)/gu) ?? []).length, 2);
});

test('the builtin forum output format teaches the op_author tag', () => {
  assert.match(builtinPrompts, /<op_author>楼主本人回复的作者名<\/op_author>/u);
  assert.equal((builtinPrompts.match(/<op_author>楼主本人回复的作者名<\/op_author>/gu) ?? []).length, 2);
});
