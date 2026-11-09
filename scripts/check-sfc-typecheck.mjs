/* eslint-disable import-x/no-nodejs-modules */
/**
 * SFC 类型检查基线闸门。
 *
 * `pnpm typecheck` 只跑 `tsc --noEmit`，不会进入 .vue 的 <script setup>，
 * 所以 SFC 内部真实的类型错误（例如把 StopHandle 当函数调用）拦不住。
 * 这里跑 vue-tsc，并把当前已知错误登记成基线：基线以内允许存在，
 * 新增错误（新位置/新条数）就失败，从而边清理边防止再漏。
 *
 * 用法：
 *   node scripts/check-sfc-typecheck.mjs            # 检查，超出基线即失败
 *   node scripts/check-sfc-typecheck.mjs --update   # 用当前错误覆盖基线（只应在错误减少时用）
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const baselinePath = path.join(root, 'scripts/sfc-type-baseline.txt');
const errorPattern = /^(src\/.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/u;
const separator = '\t';

function runVueTsc() {
  try {
    return execFileSync(process.execPath, [path.join(root, 'node_modules/vue-tsc/bin/vue-tsc.js'), '--noEmit'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

function collectErrors(output) {
  const counts = new Map();
  for (const line of output.split(/\r?\n/u)) {
    const match = line.trim().match(errorPattern);
    if (!match) continue;
    const key = [match[1], match[4], match[5]].join(separator);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function readBaseline() {
  const counts = new Map();
  for (const line of readFileSync(baselinePath, 'utf8').split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(separator);
    const count = Number(parts.at(-1));
    const key = parts.slice(0, -1).join(separator);
    if (!key || !Number.isFinite(count)) continue;
    counts.set(key, count);
  }
  return counts;
}

const current = collectErrors(runVueTsc());

if (process.argv.includes('--update')) {
  const lines = [...current.entries()].sort(([left], [right]) => left.localeCompare(right));
  const header = `# vue-tsc 已知错误基线（每行：文件<TAB>错误码<TAB>消息<TAB>条数）。修好就删，不要新增。\n`;
  writeFileSync(baselinePath, header + lines.map(([key, count]) => `${key}${separator}${count}`).join('\n') + '\n');
  console.log(`SFC type baseline updated: ${lines.length} known error kind(s).`);
  process.exit(0);
}

const baseline = readBaseline();
const added = [];
const removed = [];

for (const [key, count] of current) {
  const allowed = baseline.get(key) ?? 0;
  if (count > allowed) added.push(`${key.split(separator).slice(0, 2).join(' ')} (now ${count}, baseline ${allowed}) → ${key.split(separator)[2]}`);
}
for (const [key, count] of baseline) {
  const actual = current.get(key) ?? 0;
  if (actual < count) removed.push(`${key.split(separator).slice(0, 2).join(' ')} (now ${actual}, baseline ${count})`);
}

if (removed.length) {
  console.log(`SFC type baseline has ${removed.length} stale entr(y/ies) — run --update to shrink it.`);
}

if (added.length) {
  console.error(`SFC type check failed: ${added.length} error kind(s) beyond the baseline.`);
  for (const entry of added) console.error(`  + ${entry}`);
  process.exit(1);
}

console.log(`SFC type baseline passed: ${current.size}/${baseline.size} known error kind(s).`);
