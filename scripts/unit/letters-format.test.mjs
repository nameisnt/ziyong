/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRecentLettersContext,
  clampRecentEntryCount,
  formatDirection,
  formatLabel,
  formatParticipants,
} from '../../src/apps/letters/format.ts';

const entry = (id, format, title, content = `${title}内容`) => ({
  id,
  format,
  title,
  content,
  sender: { name: '甲' },
  receiver: { name: '乙' },
});

test('letters formats keep their labels and custom names', () => {
  assert.equal(formatLabel('sms'), '短信');
  assert.equal(formatLabel('formal'), '正式信');
  assert.equal(formatLabel('custom:纸条'), '纸条');
  assert.equal(formatLabel('custom:'), '自定义书信');
  assert.equal(formatLabel('email'), '邮件');
});

test('participants fall back when the list is empty', () => {
  assert.equal(formatParticipants([{ name: '甲' }, { name: '乙' }]), '甲、乙');
  assert.equal(formatParticipants([]), '未指定参与者');
  assert.equal(formatDirection('甲', '乙'), '甲 -> 乙');
});

test('recent entry count is clamped to the supported range', () => {
  assert.equal(clampRecentEntryCount(0), 0);
  assert.equal(clampRecentEntryCount(-3), 0);
  assert.equal(clampRecentEntryCount(2.6), 3);
  assert.equal(clampRecentEntryCount(99), 20);
  assert.equal(clampRecentEntryCount(Number.NaN), 0);
});

test('recent letters context keeps the selected entries in reverse order', () => {
  const entries = [entry('a', 'sms', '第一封'), entry('b', 'email', '第二封'), entry('c', 'note', '第三封')];
  const context = buildRecentLettersContext(entries, { count: 2 });
  assert.match(context, /^最近相关书信：/u);
  assert.match(context, /邮件 · 第二封/u);
  assert.match(context, /短信 · 第一封/u);
  assert.doesNotMatch(context, /第三封/u);
  assert.ok(context.indexOf('第二封') < context.indexOf('第一封'));
});

test('rewrite mode starts after the rewritten letter', () => {
  const entries = [entry('a', 'sms', '第一封'), entry('b', 'email', '第二封'), entry('c', 'note', '第三封')];
  assert.equal(buildRecentLettersContext(entries, { count: 2, rewriteEntryId: 'b' }), '最近相关书信：\n\n便签 · 第三封\n甲 -> 乙\n第三封内容');
  assert.doesNotMatch(buildRecentLettersContext(entries, { count: 3, rewriteEntryId: 'b' }), /第二封|第一封/u);
});

test('an unknown rewrite target is dropped from the context', () => {
  const entries = [entry('a', 'sms', '第一封'), entry('b', 'email', '第二封')];
  const context = buildRecentLettersContext(entries, { count: 5, rewriteEntryId: 'missing' });
  assert.match(context, /第二封/u);
  assert.match(context, /第一封/u);
});

test('no entries or a zero count yields no context block', () => {
  assert.equal(buildRecentLettersContext([], { count: 3 }), '');
  assert.equal(buildRecentLettersContext([entry('a', 'sms', '第一封')], { count: 0 }), '');
});
