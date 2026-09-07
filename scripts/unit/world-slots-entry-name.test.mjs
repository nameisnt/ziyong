/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { isDeepStrictEqual } from 'node:util';
import { createSourceFile, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/apps/world-slots/store.ts', import.meta.url), 'utf8');
const ast = createSourceFile('store.ts', source, ScriptTarget.Latest, true);
const names = new Set(['getEntrySlotId', 'createWorldEntry', 'nextEntryId', 'cleanList', 'performSync']);
const declarations = [];
function visit(node) {
  if (node.name && names.has(node.name.getText(ast))) declarations.push(node.getText(ast));
  node.forEachChild(visit);
}
visit(ast);
const constants = ast.statements.filter(node => /^const worldInfo/u.test(node.getText(ast)));
const code = transpileModule([...constants.map(node => node.getText(ast)), ...declarations].join('\n'), {
  compilerOptions: { target: ScriptTarget.ES2022 },
}).outputText;
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
  const sync = runInNewContext(`${code}\nperformSync`, {
    WORLD_SLOTS_BOOK_NAME: 'Test book',
    data,
    klona: structuredClone,
    _: { isEqual: (a, b) => isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))) },
    getOptionalGlobalFunction: name => api[name],
    isRequestCurrent: () => true,
  });
  return { sync: () => sync(1, 'test-scope'), data, book: () => book, saves: () => saves };
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
