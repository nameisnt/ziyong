/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

function functionBody(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `未找到函数签名：${signature}`);
  const openParen = source.indexOf('(', start);
  assert.ok(openParen >= 0, `函数签名后缺少参数列表：${signature}`);
  let parenDepth = 0;
  let closeParen = -1;
  for (let index = openParen; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') parenDepth += 1;
    else if (char === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        closeParen = index;
        break;
      }
    }
  }
  assert.ok(closeParen > openParen, `参数列表未闭合：${signature}`);
  const openBrace = source.indexOf('{', closeParen);
  assert.ok(openBrace >= 0, `函数签名后缺少函数体：${signature}`);
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openBrace, index + 1);
    }
  }
  assert.fail(`函数体未闭合：${signature}`);
}

test('手机面板导航入口必须在内部收口守卫异常', () => {
  const source = read('src/store/phone.ts');
  assert.match(source, /async function canLeaveCurrentPage\(/u);
  for (const signature of [
    'async function closePhone(',
    'async function goHome(',
    'async function goBack(',
  ]) {
    const body = functionBody(source, signature);
    assert.match(body, /canLeaveCurrentPage\(/u, `${signature} 应通过 canLeaveCurrentPage 调用导航守卫`);
  }
  const guardBody = functionBody(source, 'async function canLeaveCurrentPage(');
  assert.match(guardBody, /catch \(/u, 'canLeaveCurrentPage 必须捕获导航守卫异常');
  assert.match(guardBody, /noticeError\(/u, 'canLeaveCurrentPage 必须把失败反馈给用户');
});

test('聊天范围切换与生成结果跳转不得抛出未处理的拒绝', () => {
  const source = read('src/store/phone.ts');
  for (const signature of ['async function syncCurrentTavernScope(', 'async function presentGeneratedPage(']) {
    const body = functionBody(source, signature);
    assert.match(body, /catch \(/u, `${signature} 必须捕获异常`);
    assert.match(body, /noticeError\(/u, `${signature} 必须把失败反馈给用户`);
  }
});

test('音频上下文恢复的失败不得逃逸', () => {
  const source = read('src/apps/game-2048/miniGameAudio.ts');
  assert.match(source, /void audioContext\.resume\(\)\.catch\(/u);
});
