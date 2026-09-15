/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { isDeepStrictEqual } from 'node:util';
import { createSourceFile, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/apps/world-slots/store.ts', import.meta.url), 'utf8');
const ast = createSourceFile('store.ts', source, ScriptTarget.Latest, true);
const names = new Set([
  'getEntrySlotId',
  'createWorldEntry',
  'readSlotFields',
  'nextEntryId',
  'cleanList',
  'performSync',
  'readWorldbookChanges',
  'markPending',
]);
const declarations = [];
function visit(node) {
  if (node.name && names.has(node.name.getText(ast))) declarations.push(node.getText(ast));
  node.forEachChild(visit);
}
visit(ast);
const constants = ast.statements.filter(
  node =>
    /^const worldInfo/u.test(node.getText(ast)) ||
    /^export const worldSlot(Logic|Role)Options/u.test(node.getText(ast)),
);
const code = transpileModule(
  [...constants.map(node => node.getText(ast).replace(/^export /u, '')), ...declarations].join('\n'),
  {
    compilerOptions: { target: ScriptTarget.ES2022 },
  },
).outputText;
const slot = {
  id: 'test-slot',
  title: 'Test title',
  content: 'Body',
  enabled: true,
  strategyType: 'constant',
  position: 'before_character_definition',
  role: 'system',
  selectiveLogic: 'and_any',
  keys: [],
  secondaryKeys: [],
  insertionOrder: 100,
  depth: 4,
  probability: 100,
  excludeRecursion: false,
  preventRecursion: false,
  sticky: null,
  cooldown: null,
  delay: null,
};

function fixture(entries, slots = [slot]) {
  // Exercise the actual sync function with JSON persistence, without touching Tavern data.
  let book = { name: 'Test book', entries: structuredClone(entries) };
  let saves = 0;
  const data = { value: { slots: structuredClone(slots) } };
  const api = {
    loadWorldInfo: async () => structuredClone(book),
    saveWorldInfo: async (_name, value) => {
      book = JSON.parse(JSON.stringify(value));
      saves += 1;
    },
    getGlobalWorldbookNames: () => ['Test book'],
    rebindGlobalWorldbooks: async () => {},
  };
  const conflicts = { value: [] };
  const scopeKey = { value: 'test-scope' };
  const methods = runInNewContext(`${code}\n({sync: performSync, pull: readWorldbookChanges, markPending})`, {
    WORLD_SLOTS_BOOK_NAME: 'Test book',
    exports: {},
    pendingFields: new Map(),
    pendingKey: id => id,
    writingBook: null,
    writtenScope: '',
    scopeKey,
    isCurrentChatScope: { value: true },
    conflicts,
    nowIso: () => new Date().toISOString(),
    toastr: { warning() {} },
    data,
    klona: structuredClone,
    _: { isEqual: (a, b) => isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))) },
    getOptionalGlobalFunction: name => api[name],
    isRequestCurrent: () => true,
  });
  return {
    sync: () => methods.sync(1, 'test-scope'),
    pull: methods.pull,
    markPending: methods.markPending,
    conflicts,
    scopeKey,
    data,
    book: () => book,
    saves: () => saves,
  };
}

test('new slot names contain only the title and persist their hidden identity', async () => {
  const f = fixture({});
  await f.sync();
  assert.equal(f.book().entries[0].comment, slot.title);
  assert.equal(f.book().entries[0].sillytavernPhoneSlotId, slot.id);
  assert.equal(f.book().entries[0].content, slot.content);
  assert.equal(f.book().entries[0].disable, false);
  await f.sync();
  assert.equal(f.saves(), 1);
  assert.equal(Object.keys(f.book().entries).length, 1);
});

for (const identity of ['prefix', 'field', 'extension']) {
  test(`legacy ${identity} identity updates in place without duplicating the entry`, async () => {
    const entry = { uid: 7, comment: `[sillytavern_phone_world_slot:${slot.id}] Old title` };
    if (identity === 'field') entry.sillytavernPhoneSlotId = slot.id;
    if (identity === 'extension') entry.extensions = { sillytavernPhoneSlotId: slot.id };
    const f = fixture({ 7: entry });
    const result = await f.sync();
    assert.equal(result.created, 0);
    assert.equal(result.updated, 1);
    assert.deepEqual(Object.keys(f.book().entries), ['7']);
    assert.equal(f.book().entries[7].comment, slot.title);
    assert.equal(f.book().entries[7].sillytavernPhoneSlotId, slot.id);
    assert.equal(f.data.value.slots[0].worldEntryId, 7);
    await f.sync();
    assert.equal(f.saves(), 1);
  });
}

test('renaming and toggling a slot preserves its entry id after prefix removal', async () => {
  const f = fixture({});
  await f.sync();
  f.data.value.slots[0].title = 'Renamed';
  f.data.value.slots[0].enabled = false;
  await f.sync();
  assert.deepEqual(Object.keys(f.book().entries), ['0']);
  assert.equal(f.book().entries[0].comment, 'Renamed');
  assert.equal(f.book().entries[0].disable, true);
});

test('scope cleanup removes owned entries but preserves unrelated entries with the same title', async () => {
  const unrelated = { uid: 5, comment: slot.title, content: 'Unrelated body' };
  const f = fixture({ 5: unrelated });
  await f.sync();
  assert.equal(Object.keys(f.book().entries).length, 2);
  f.data.value.slots = [];
  await f.sync();
  assert.deepEqual(f.book().entries, { 5: unrelated });
});

test('bound entry ID survives external editing and marker removal, including ID zero', async () => {
  for (const uid of [0, 7]) {
    const f = fixture({ [uid]: { uid, comment: 'Externally renamed', content: 'Edited' } }, [
      { ...slot, worldEntryId: uid },
    ]);
    const result = await f.sync();
    assert.equal(result.created, 0);
    assert.equal(result.updated, 1);
    assert.deepEqual(Object.keys(f.book().entries), [String(uid)]);
    assert.equal(f.data.value.slots[0].worldEntryId, uid);
    assert.equal(f.book().entries[uid].sillytavernPhoneSlotId, slot.id);
    assert.equal(f.book().entries[uid].content, slot.content);
    await f.sync();
    assert.equal(f.saves(), 1);
  }
});

test('explicit slot identity wins over a stale saved entry ID', async () => {
  const unrelated = { uid: 7, content: 'Unrelated' };
  const f = fixture({ 7: unrelated, 9: { uid: 9, sillytavernPhoneSlotId: slot.id } }, [{ ...slot, worldEntryId: 7 }]);
  assert.equal((await f.sync()).created, 0);
  assert.deepEqual(f.book().entries[7], unrelated);
  assert.equal(f.data.value.slots[0].worldEntryId, 9);
});

test('a bound ID cannot claim another current slot or be claimed twice', async () => {
  const other = { ...slot, id: 'other-slot', worldEntryId: 7 };
  for (const marker of [undefined, 'other-slot']) {
    const f = fixture({ 7: { uid: 7, sillytavernPhoneSlotId: marker } }, [{ ...slot, worldEntryId: 7 }, other]);
    await f.sync();
    assert.equal(Object.keys(f.book().entries).length, 2);
    const ids = f.data.value.slots.map(item => item.worldEntryId);
    assert.equal(new Set(ids).size, 2);
    if (marker) assert.equal(ids[1], 7);
  }
});

test('missing bound entry is recreated and the new ID is retained', async () => {
  const f = fixture({}, [{ ...slot, worldEntryId: 42 }]);
  assert.equal((await f.sync()).created, 1);
  assert.equal(f.data.value.slots[0].worldEntryId, 0);
  assert.equal((await f.sync()).created, 0);
});

test('external content, title and enabled state flow back without writing or looping', async () => {
  const f = fixture({});
  await f.sync();
  Object.assign(f.book().entries[0], { content: 'External body', comment: 'External title', disable: true });
  delete f.book().entries[0].sillytavernPhoneSlotId;
  await f.pull();
  assert.equal(f.data.value.slots[0].content, 'External body');
  assert.equal(f.data.value.slots[0].title, 'External title');
  assert.equal(f.data.value.slots[0].enabled, false);
  assert.equal(f.saves(), 1);
  await f.pull();
  assert.equal(f.saves(), 1);
});

test('pending local writes are not replaced by an unchanged worldbook', async () => {
  const f = fixture({});
  await f.sync();
  f.markPending(f.data.value.slots[0]);
  f.data.value.slots[0].content = 'Local change';
  await f.pull();
  assert.equal(f.data.value.slots[0].content, 'Local change');
  assert.equal(f.conflicts.value.length, 0);
  f.book().entries[0].content = 'External change';
  await f.pull();
  assert.equal(f.data.value.slots[0].content, 'Local change');
  assert.equal(f.conflicts.value.length, 1);
  assert.equal(f.book().entries[0].content, 'External change');
});

test('previous chat ownership prevents reverse import', async () => {
  const f = fixture({ 0: { uid: 0, content: 'Other chat', sillytavernPhoneSlotId: 'other-chat-slot' } }, [
    { ...slot, worldEntryId: 0 },
  ]);
  await f.pull();
  assert.equal(f.data.value.slots[0].content, slot.content);
  assert.equal(f.saves(), 0);
});
