/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/world-slots/WorldSlotsApp.vue', import.meta.url), 'utf8');

test('world slots root keeps add and sync inside one management menu', () => {
  assert.match(source, /class="pc-compact-toolbar pc-directory-toolbar pc-world-root-toolbar"/u);
  assert.match(source, /<span class="pc-directory-count">\{\{ slots\.length \}\}/u);
  assert.match(source, /<ActionMenu icon-only :label="t`管理`" icon="fa-solid fa-bars">/u);
  assert.match(source, /<button type="button" @click="openEditor\(\)">[\s\S]*t`新增槽位`/u);
  assert.match(source, /:disabled="isSyncing \|\| !isCurrentChatScope" @click="syncSlots"/u);
});

test('world slots keeps compact rows and the editor controls requested for narrow screens', () => {
  const row = source.match(/<article[\s\S]*?v-for="slot in filteredSlots"[\s\S]*?<\/article>/u)?.[0] ?? '';
  assert.match(row, /pc-world-entry-lamp/u);
  assert.match(row, /<h3>\{\{ slot\.title \}\}<\/h3>/u);
  assert.match(row, /class="pc-toggle"[\s\S]*@click\.stop/u);
  assert.match(row, /:checked="slot\.enabled"[\s\S]*@change="toggleSlot\(slot\.id, \$event\)"/u);
  assert.doesNotMatch(row, /<p|slot\.content|slot\.keys/u);
  assert.match(source, /worldSlots\.setSlotEnabled\(slotId, \(event\.target as HTMLInputElement\)\.checked\)/u);
  assert.match(source, /class="pc-world-slot-name-row"[\s\S]*v-model="draft\.title"[\s\S]*v-model="draft\.enabled"/u);
  assert.match(source, /v-model="draft\.strategyType"[\s\S]*class="pc-world-basic-grid"/u);
  assert.match(
    source,
    /class="pc-world-basic-grid"[\s\S]*v-model="draft\.position"[\s\S]*v-model="draft\.insertionOrderText"/u,
  );
  assert.match(source, /class="[^"]*pc-area-long[^"]*pc-saved-content-area[^"]*"/u);
});
