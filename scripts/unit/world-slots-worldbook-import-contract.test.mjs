/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/world-slots/store.ts', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../../src/apps/world-slots/WorldSlotsApp.vue', import.meta.url), 'utf8');

function sliceFunction(name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} should exist`);
  let depth = 0;
  let index = source.indexOf('{', start);
  const bodyStart = index;
  for (; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart, index + 1);
    }
  }
  return source.slice(bodyStart);
}

test('sync adopts world book entries that carry no plugin marker', () => {
  const body = sliceFunction('performSync');
  assert.match(body, /const importedSlotIds = new Set<string>\(\);/u);
  assert.match(body, /if \(!Number\.isFinite\(entryId\) \|\| claimedEntryIds\.has\(entryId\) \|\| getEntrySlotId\(entry\)\) return;/u);
  assert.match(body, /const duplicate = data\.value\.slots\.some/u);
  assert.match(body, /const slot = buildSlot\(fields, importTimestamp\);/u);
  assert.match(body, /entryIdBySlot\.set\(slot\.id, entryId\);/u);
  assert.match(body, /importedSlotIds\.add\(slot\.id\);/u);
  assert.match(body, /imported: importedSlotIds\.size,/u);
});

test('entries owned by another chat are skipped instead of being deleted', () => {
  const body = sliceFunction('performSync');
  const foreignBranch = body.match(/if \(!currentSlotIds\.has\(slotId\)\) \{[\s\S]*?\n {6}\}/u)?.[0] ?? '';
  assert.match(foreignBranch, /foreignSkipped \+= 1;/u);
  assert.match(foreignBranch, /removedSlotIds\.has\(slotId\)/u);
  assert.match(foreignBranch, /delete entries\[/u);
  assert.match(body, /foreignSkipped,/u);
});

test('a slot the user deleted still removes its world book entry', () => {
  const deleteBody = sliceFunction('deleteSlot');
  assert.match(deleteBody, /removedSlotIds\.add\(slotId\);/u);
  const body = sliceFunction('performSync');
  assert.match(body, /removedSlotIds\.clear\(\);/u);
});

test('a shared book with foreign entries still refreshes the local slots', () => {
  const body = sliceFunction('readWorldbookChanges');
  assert.doesNotMatch(body, /if \(Object\.values\(entries\)\.some[\s\S]*?\) return;/u);
  assert.match(body, /按标记逐个跳过/u);
});

test('the sync toast reports adopted entries and skipped foreign ones', () => {
  const body = appSource.match(/async function syncSlots[\s\S]*?\n\}/u)?.[0] ?? '';
  assert.match(body, /从世界书导入/u);
  assert.match(body, /result\.foreignSkipped/u);
  assert.match(body, /toastr\.warning/u);
});
