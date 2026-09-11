/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';

const source = await readFile(new URL('../../src/apps/recovery/settingsComparison.ts', import.meta.url), 'utf8');
const output = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const comparison = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
async function signature(value, date = 1, raw = JSON.stringify(value)) {
  const bytes = new TextEncoder().encode(raw).buffer;
  return comparison.createSettingsSignature(bytes, { name: `snapshot-${date}`, date, size: bytes.byteLength });
}

test('settings comparison ignores object order and whitespace but preserves raw deletion hashes', async () => {
  const a = await signature({ a: 1, b: 2 }, 1);
  const b = await signature(null, 2, '{ "b": 2, "a": 1 }');
  assert.equal(comparison.compareSettingsFields(a, b).similarity, 100);
  assert.notEqual(a.contentHash, b.contentHash);
  const [group] = comparison.createSimilarSettingsGroups([a, b], 100);
  assert.equal(group.keeper.summary.date, 2);
  assert.equal(group.reclaimBytes, a.summary.size);
  assert.equal(group.minimumSimilarity, 100);
  assert.equal('fields' in group.keeper, false);
});

test('settings fields preserve types, arrays, empty containers and escaped keys', async () => {
  for (const [a, b] of [
    [{ x: [] }, { x: {} }],
    [{ x: null }, {}],
    [{ x: 0 }, { x: false }],
    [{ x: [1, 2] }, { x: [2, 1] }],
    [{ 'a/b': 1 }, { a: { b: 1 } }],
  ]) {
    assert.ok(comparison.compareSettingsFields(await signature(a), await signature(b)).similarity < 100);
  }
  const a = await signature({ 'a/b~c': 1 });
  assert.ok(a.fields.has('/a~1b~0c'));
});

test('large values are digested rather than retained in all snapshot signatures', async () => {
  const a = await signature({ data: 'x'.repeat(1024 * 1024) });
  assert.ok(a.fields.get('/data').length < 100);
  const b = await signature({ data: 'x'.repeat(1024 * 1024 - 1) + 'y' });
  assert.notEqual(a.fields.get('/data'), b.fields.get('/data'));
});

test('threshold is inclusive, differences are bounded and grouping never chains below threshold', async () => {
  const a = await signature({ a: 0, b: 0, c: 0 }, 3);
  const b = await signature({ a: 1, b: 0, c: 0 }, 2);
  const c = await signature({ a: 0, b: 1, c: 0 }, 1);
  assert.equal(comparison.compareSettingsFields(a, b).similarity, 75);
  assert.equal(comparison.createSimilarSettingsGroups([a, b], 75.1).length, 0);
  const [group] = comparison.createSimilarSettingsGroups([a, b, c], 75);
  assert.equal(group.duplicates.length, 1);
  assert.deepEqual(group.differingPaths, ['/a']);
  const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`field${i}`, i]));
  assert.equal(comparison.compareSettingsFields(await signature(many), await signature({})).paths.length, 8);
});

test('every group requires exactly one valid keeper and can keep an older snapshot', async () => {
  const a = await signature({ a: 1 }, 1);
  const b = await signature({ a: 1 }, 2);
  const groups = comparison.createSimilarSettingsGroups([a, b], 100);
  const chosen = comparison.selectSettingsCleanup(groups, { [groups[0].id]: a.summary.name });
  assert.equal(chosen[0].keeper.summary.name, a.summary.name);
  assert.deepEqual(
    chosen[0].candidates.map(item => item.summary.name),
    [b.summary.name],
  );
  assert.throws(() => comparison.selectSettingsCleanup(groups, {}), /必须选择/);
  assert.throws(
    () => comparison.selectSettingsCleanup(groups, { [groups[0].id]: ['snapshot-1', 'snapshot-2'] }),
    /必须选择/,
  );
});

test('invalid roots and thresholds cannot produce cleanup candidates', async () => {
  for (const raw of ['null', '[]', 'true', '{broken']) await assert.rejects(signature(null, 1, raw));
  for (const threshold of [NaN, Infinity, 0, 101])
    assert.throws(() => comparison.createSimilarSettingsGroups([], threshold));
});
