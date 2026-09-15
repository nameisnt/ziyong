/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createSourceFile, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/util/chatFloorBackup.ts', import.meta.url), 'utf8');
const ast = createSourceFile('backup.ts', source, ScriptTarget.Latest, true);
const names = ['normalizeIdentityPart', 'buildChatFloorBackupKey', 'rebindChatFloorBackupForImport'];
const code = ast.statements
  .filter(node => names.includes(node.name?.getText(ast)))
  .map(node => node.getText(ast).replace(/^export /u, ''))
  .join('\n');
const { rebindChatFloorBackupForImport: rebind, buildChatFloorBackupKey: key } = runInNewContext(
  transpileModule(code, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText +
    '\n({ rebindChatFloorBackupForImport, buildChatFloorBackupKey })',
);
const target = {
  kind: 'char',
  aliases: ['fish.png', 'Fish'],
  avatar: 'fish.png',
  ownerId: '1',
  name: 'Fish',
  chatId: 'new-chat',
  chatTitle: 'New chat',
};
function backup(kind = 'char', stableId = 'fish.png') {
  return {
    key: key(kind, stableId, 'old-chat'),
    owner: { kind, stableId, displayName: 'Fish' },
    chat: { id: 'old-chat', title: 'Old chat' },
    messages: [{ message: 'Original', data: { score: 1 } }],
    createdAt: 'original-time',
  };
}
test('same character different chat is rebound without mutating source or floor data', () => {
  const original = backup();
  const before = structuredClone(original);
  const result = rebind(original, target);
  assert.equal(result.key, key('char', 'fish.png', 'new-chat'));
  assert.equal(result.chat.id, 'new-chat');
  assert.equal(result.chat.title, 'New chat');
  assert.deepEqual(result.messages, original.messages);
  assert.equal(result.createdAt, original.createdAt);
  assert.deepEqual(original, before);
});
test('same chat remains importable', () => {
  assert.equal(rebind(backup(), { ...target, chatId: 'old-chat' }).key, backup().key);
});
test('different character is rejected', () => {
  assert.throws(() => rebind(backup('char', 'other.png'), target), /角色卡或群组/u);
});
test('same group can import to a new chat but different groups cannot', () => {
  const groupTarget = { ...target, kind: 'group', avatar: '', ownerId: 'g1', aliases: ['g1'] };
  assert.equal(rebind(backup('group', 'g1'), groupTarget).key, key('group', 'g1', 'new-chat'));
  assert.throws(() => rebind(backup('group', 'g2'), groupTarget), /角色卡或群组/u);
});
test('matching text does not allow crossing character and group kinds', () => {
  assert.throws(() => rebind(backup('group', 'fish.png'), target), /角色卡或群组/u);
});
