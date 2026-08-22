/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/world-slots/WorldSlotsApp.vue', import.meta.url), 'utf8');

test('world slots root reuses the shared directory toolbar and keeps the add action last', () => {
  assert.match(source, /class="pc-compact-toolbar pc-directory-toolbar pc-world-root-toolbar"/u);
  assert.match(source, /<span class="pc-directory-count">\{\{ slots\.length \}\}/u);
  assert.match(
    source,
    /pc-world-root-toolbar[\s\S]*pc-directory-count[\s\S]*title="t`新增槽位`"/u,
  );
  assert.doesNotMatch(source, /\.pc-world-root-toolbar\s*\{[\s\S]*?justify-content:\s*space-between/u);
});

test('world slots root keeps compact book spacing and minimal slot-row semantics', () => {
  assert.match(source, /\.pc-world-card\s*\{[\s\S]*?padding:\s*4px 0 12px/u);
  const row = source.match(/<article[\s\S]*?v-for="slot in filteredSlots"[\s\S]*?<\/article>/u)?.[0] ?? '';
  assert.match(row, /pc-world-entry-lamp/u);
  assert.match(row, /<h3>\{\{ slot\.title \}\}<\/h3>/u);
  assert.match(row, /slot\.enabled \? t`启用` : t`关闭`/u);
  assert.doesNotMatch(row, /<p|slot\.content|slot\.keys/u);
});
