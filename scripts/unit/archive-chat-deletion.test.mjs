/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptTarget, transpileModule } from 'typescript';
const source = await readFile(new URL('../../src/apps/archive/chatDeletion.ts', import.meta.url), 'utf8');
const ast = createSourceFile('deletion.ts', source, ScriptTarget.Latest, true);
const extracted = ast.statements.filter(node => ['stripChatScopes', 'deleteArchivedChat'].includes(node.name?.getText(ast))).map(node => node.getText(ast).replace(/^export /u, ''));
const code = transpileModule(extracted.join('\n'), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
function fixture({ fail = false, busy = false, current = false, cleanupFail = false } = {}) {
  let exists = true;
  const calls = [];
  const native = { isGenerating: () => busy, async deleteCharacterChatByName() { calls.push('delete'); if (!fail) exists = false; }, async replaceCurrentChat() { calls.push('switch'); } };
  const { stripChatScopes, deleteArchivedChat } = runInNewContext(`${code}\n({stripChatScopes, deleteArchivedChat})`, {
    klona: structuredClone, nativeChats: async () => native,
    areChatScopeKeysEquivalent: () => current, getCurrentChatScopeKey: () => 'scope',
    useGenerationTaskStore: () => ({ activeTasks: [] }), listOwnedChats: async () => exists ? ['chat'] : [],
    characters: [{ avatar: 'test.png' }],
    cleanupContent() { calls.push('content'); if(cleanupFail) throw Error('cleanup test'); },
    async deleteChatFloorBackup() { calls.push('backup'); },
  });
  return { stripChatScopes, calls, run: options => deleteArchivedChat({kind:'char',avatar:'test.png'}, {key:'chat',scopeKey:'scope',title:'Test',floorBackup:{key:'backup'}}, options) };
}
for (const content of [false, true]) for (const backup of [false, true]) {
  test(`delete options content=${content} backup=${backup}`, async () => {
    const f=fixture(); const result=await f.run({content,backup});
    assert.equal(result.deleted,true); assert.equal(result.error,'');
    assert.deepEqual(f.calls,['delete',...(content?['content']:[]),...(backup?['backup']:[])]);
  });
}
test('native failure does not clean plugin data', async () => {
  const f=fixture({fail:true}); assert.equal((await f.run({content:true,backup:true})).deleted,false); assert.deepEqual(f.calls,['delete']);
});
test('current generation prevents deletion', async () => {
  const f=fixture({busy:true,current:true}); assert.equal((await f.run({content:true,backup:true})).deleted,false); assert.deepEqual(f.calls,[]);
});
test('current chat switches before cleanup', async () => {
  const f=fixture({current:true}); await f.run({content:true,backup:true}); assert.deepEqual(f.calls,['delete','switch','content','backup']);
});
test('cleanup failure reports partial success and still handles backup', async () => {
  const f=fixture({cleanupFail:true}); const result=await f.run({content:true,backup:true}); assert.equal(result.deleted,true); assert.match(result.error,/清理失败/u); assert.deepEqual(f.calls,['delete','content','backup']);
});
test('scope cleanup preserves unrelated scopes and does not mutate its source', () => {
  const original={__chatScoped:true,scopes:{a:{body:'a'},b:{body:'b'}},legacyScopeMigrations:{a:'b',old:'a',other:'b'}};
  const result=fixture().stripChatScopes(original,new Set(['a']));
  assert.deepEqual(result.scopes,{b:{body:'b'}}); assert.deepEqual(result.legacyScopeMigrations,{other:'b'}); assert.ok(original.scopes.a);
});
