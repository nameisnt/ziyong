/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';

import { z } from 'zod';

// src/type/generation.ts 依赖自动导入的全局 z，Node 下需要先注入再动态载入。
globalThis.z = z;
const { ForumXmlResultSchema } = await import('../../src/type/generation.ts');

const buildResult = (isOriginalPoster) => ({
  board: '板块',
  title: '标题',
  author: '楼主',
  content: '主楼正文',
  replies: [{ author: '一楼', content: '回复正文', isOriginalPoster }],
});

test('is_op keeps real booleans untouched', () => {
  assert.equal(ForumXmlResultSchema.parse(buildResult(true)).replies[0].isOriginalPoster, true);
  assert.equal(ForumXmlResultSchema.parse(buildResult(false)).replies[0].isOriginalPoster, false);
});

test('is_op understands decorated text that models actually emit', () => {
  for (const value of ['true', 'TRUE', ' True ', 'yes', '1', '1.0', '是', '是（楼主）', '楼主', '【是】']) {
    assert.equal(
      ForumXmlResultSchema.parse(buildResult(value)).replies[0].isOriginalPoster,
      true,
      `expected true for ${JSON.stringify(value)}`,
    );
  }
  for (const value of ['false', 'FALSE', 'no', '0', '否', '不是楼主', '（否）']) {
    assert.equal(
      ForumXmlResultSchema.parse(buildResult(value)).replies[0].isOriginalPoster,
      false,
      `expected false for ${JSON.stringify(value)}`,
    );
  }
});

test('is_op does not fail the whole result on an unrecognized marker', () => {
  const parsed = ForumXmlResultSchema.parse(buildResult('大概是吧'));
  assert.equal(parsed.replies[0].isOriginalPoster, false);
});

test('is_op still requires a value', () => {
  assert.equal(ForumXmlResultSchema.safeParse(buildResult('')).success, false);
  const missing = buildResult('true');
  delete missing.replies[0].isOriginalPoster;
  assert.equal(ForumXmlResultSchema.safeParse(missing).success, false);
});
