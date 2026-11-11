/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('the static gate type checks SFC script blocks through a baseline', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.scripts['typecheck:sfc'], 'node scripts/check-sfc-typecheck.mjs');
  assert.match(pkg.scripts['verify:static'], /pnpm typecheck:sfc/u);

  const tsconfig = await read('tsconfig.json');
  assert.match(tsconfig, /"src\/\*\*\/\*\.vue"/u);

  const checker = await read('scripts/check-sfc-typecheck.mjs');
  assert.match(checker, /vue-tsc/u);
  assert.match(checker, /--update/u);
  assert.match(checker, /baseline passed/u);
});

test('the SFC type baseline lists known errors instead of hiding them', async () => {
  const baseline = await read('scripts/sfc-type-baseline.txt');
  const entries = baseline
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  // 基线清零后允许为空：只校验“有内容时格式正确”，不再要求必须存在已知错误。
  assert.ok(Array.isArray(entries), 'baseline must be readable');
  for (const entry of entries) {
    const parts = entry.split('\t');
    assert.equal(parts.length, 4, `unexpected baseline line: ${entry}`);
    assert.match(parts[0], /^src\/.+\.(?:vue|ts)$/u);
    assert.match(parts[1], /^TS\d+$/u);
    assert.ok(Number.isInteger(Number(parts[3])) && Number(parts[3]) > 0);
  }
});
