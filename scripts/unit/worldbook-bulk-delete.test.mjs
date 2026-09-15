/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptTarget, transpileModule } from 'typescript';
const source = await readFile(new URL('../../src/apps/worldbook-link/api.ts', import.meta.url), 'utf8');
const ast = createSourceFile('api.ts', source, ScriptTarget.Latest, true);
const node = ast.statements.find(node => node.name?.getText(ast) === 'deleteWorldbookEntries');
const code = transpileModule(node.getText(ast).replace(/^export /u, ''), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
function fixture({ helper = true, array = false, throwsAfterSave = false } = {}) {
  let entries = [0, 1, 2].map(uid => ({ uid, name: 'Same name', content: String(uid) }));
  let writes = 0;
  const functions = {
    ...(helper ? { updateWorldbookWith: async (_name, updater) => {
      entries = updater(structuredClone(entries)); writes++;
      if (throwsAfterSave) throw Error('render failed');
      return entries;
    } } : {}),
    saveWorldInfo: async (_name, book) => { entries = Object.values(book.entries); writes++; },
  };
  const remove = runInNewContext(code + '\ndeleteWorldbookEntries', {
    getOptionalGlobalFunction: name => functions[name],
    loadRawWorldbook: async () => ({ entries: structuredClone(entries), book: { entries: array ? structuredClone(entries) : Object.fromEntries(entries.map(e => [String(e.uid), { ...e }])) } }),
    verifyRawWorldbookAfterFailure: async () => entries,
    worldbookEntriesEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    worldbookWriteUncertain: () => Error('partial'),
    rawEntryUid: entry => entry.uid,
    getWorldbookEntries: async () => entries,
  });
  return { run: ids => remove('Test', ids), writes: () => writes };
}
for (const options of [{ helper: true }, { helper: false }, { helper: false, array: true }]) {
  test(`one write deletes by UID including zero: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.deepEqual((await f.run([0, 2])).map(e => e.uid), [1]);
    assert.equal(f.writes(), 1);
  });
}
test('missing entry rejects without saving', async () => {
  const f = fixture();
  await assert.rejects(f.run([0, 99]), /已不存在/u);
  assert.equal(f.writes(), 0);
});
test('saved deletion is successful even if host rendering throws, without second write', async () => {
  const f = fixture({ throwsAfterSave: true });
  assert.deepEqual((await f.run([0, 1])).map(e => e.uid), [2]);
  assert.equal(f.writes(), 1);
});
