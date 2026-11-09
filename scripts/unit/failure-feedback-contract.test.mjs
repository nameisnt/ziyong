/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { describeFailure, formatFailure } from '../../src/util/feedback.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourceRoot = resolve(root, 'src');

/** 已经迁移到 reportFailure 的 App：这里不允许再出现裸 error.message。 */
const migratedApps = [
  'src/apps/preset-manager',
  'src/apps/worldbook-link',
  'src/apps/archive',
  'src/apps/diary',
  'src/apps/theater',
];

/** 全库裸 error.message 反馈必须为 0：新增即失败，改用 reportFailure(action, error)。 */
const RAW_FEEDBACK_BASELINE = 0;

const rawFeedbackPattern =
  /(?:toastr\.(?:error|warning)|notice(?:Error|Warning))\(\s*\w+ instanceof Error \? \w+\.message/gu;

async function collectSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSources(full)));
    else if (/\.(ts|vue)$/.test(entry.name)) files.push(full);
  }
  return files;
}

async function countRawFeedback(directory) {
  const files = await collectSources(directory);
  const hits = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const matches = source.match(rawFeedbackPattern);
    if (!matches) continue;
    for (let index = 0; index < matches.length; index += 1) hits.push(relative(root, file));
  }
  return hits;
}

test('network, abort and HTTP failures turn into readable reasons', () => {
  assert.equal(describeFailure(new TypeError('Failed to fetch')), '网络请求失败，请检查网络或代理');
  assert.equal(describeFailure(new Error('Load failed')), '网络请求失败，请检查网络或代理');
  assert.equal(describeFailure(new DOMException('The operation was aborted.', 'AbortError')), '已取消');
  assert.equal(describeFailure(new Error('HTTP 500')), '酒馆后端出错（HTTP 500）');
  assert.equal(describeFailure(new Error('请求返回 401')), '请求返回 401', 'business Chinese is kept as written');
  assert.equal(describeFailure(new Error('HTTP 401 Unauthorized')), '登录状态失效或没有权限（HTTP 401）');
  assert.equal(describeFailure(new Error('HTTP 429 Too Many Requests')), '请求太频繁，请稍后再试（HTTP 429）');
  assert.equal(describeFailure(new Error('request timeout after 30s')), '等待超时，请稍后重试');
  assert.equal(
    describeFailure(new SyntaxError('Unexpected token < in JSON at position 0')),
    '返回内容不是有效的 JSON，可能被代理或错误页替换',
  );
  // V8 对残缺 JSON 的报错措辞不止一种，都要归到同一句人话。
  assert.equal(
    describeFailure(new SyntaxError("Expected property name or '}' in JSON at position 1 (line 1 column 2)")),
    '返回内容不是有效的 JSON，可能被代理或错误页替换',
  );
  assert.equal(
    describeFailure(new SyntaxError('Unexpected end of JSON input')),
    '返回内容不是有效的 JSON，可能被代理或错误页替换',
  );
  assert.equal(
    describeFailure(new SyntaxError("Expected ',' or '}' after property value in JSON at position 3")),
    '返回内容不是有效的 JSON，可能被代理或错误页替换',
  );
});

test('business messages written in Chinese are passed through untouched', () => {
  assert.equal(describeFailure(new Error('请先填写视角角色名')), '请先填写视角角色名');
  assert.equal(describeFailure('当前没有可重写的章节'), '当前没有可重写的章节');
});

test('unknown failures stay short instead of leaking a stack or a whole HTML page', () => {
  assert.equal(describeFailure(undefined), '');
  assert.equal(describeFailure({ weird: true }), '[object Object]');
  const longMessage = `x${'很长的错误信息'.repeat(60)}`;
  const described = describeFailure(new Error(longMessage));
  assert.ok(described.length <= 121, `expected a clamped reason, got ${described.length} chars`);
  assert.ok(described.endsWith('…'));
});

test('formatFailure puts the action in front of the reason', () => {
  assert.equal(formatFailure('保存预设', new Error('Failed to fetch')), '保存预设失败：网络请求失败，请检查网络或代理');
  assert.equal(formatFailure('生成', new Error('请先填写视角角色名')), '生成失败：请先填写视角角色名');
  assert.equal(formatFailure('保存预设', undefined), '保存预设失败');
  assert.equal(formatFailure('保存预设失败', undefined), '保存预设失败', 'not doubled');
  assert.equal(formatFailure('', new Error('Failed to fetch')), '网络请求失败，请检查网络或代理');
  assert.equal(formatFailure('', undefined), '操作失败');
});

test('migrated apps report failures through the shared helper', async () => {
  const offenders = [];
  for (const app of migratedApps) {
    offenders.push(...(await countRawFeedback(resolve(root, app))));
  }
  assert.deepEqual(
    offenders,
    [],
    `use reportFailure(action, error) instead of passing a bare error.message: ${offenders.join(', ')}`,
  );
});

test('the number of un-migrated raw failure sites only goes down', async () => {
  const hits = await countRawFeedback(sourceRoot);
  assert.ok(
    hits.length <= RAW_FEEDBACK_BASELINE,
    `raw error.message feedback grew from ${RAW_FEEDBACK_BASELINE} to ${hits.length}; `
      + 'use reportFailure(action, error) from @/util/feedback and lower the baseline',
  );
});
