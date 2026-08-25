/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../../src/apps/recovery/model.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: 'model.ts',
}).outputText;
const recovery = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

function summary(fileName) {
  return recovery.normalizeBackupSummary({
    chat_items: 2,
    file_name: fileName,
    file_size: '2 KB',
    last_mes: '2026-08-11T10:00:00.000Z',
    mes: '最后一层',
  });
}

test('chat backups group by the normalized avatar stem and preserve unknown owners', () => {
  const characters = recovery.createRecoveryCharacters([
    { avatar: 'Nova Card.png', name: 'Nova' },
    { avatar: 'Zod.png', name: 'Zod' },
  ]);
  const groups = recovery.groupChatBackups(
    [summary('chat_nova_card_20260811-100000.jsonl'), summary('chat_deleted_20260811-100100.jsonl')],
    characters,
  );
  assert.equal(groups[0].kind, 'character');
  assert.equal(groups[0].character.name, 'Nova');
  assert.equal(groups[1].kind, 'unknown');
});

test('normalization collisions are marked as conflicts instead of selecting a target', () => {
  const characters = recovery.createRecoveryCharacters([
    { avatar: 'A B.png', name: '空格版' },
    { avatar: 'A-B.png', name: '横线版' },
  ]);
  const [group] = recovery.groupChatBackups([summary('chat_a_b_20260811-100000.jsonl')], characters);
  assert.equal(group.kind, 'conflict');
  assert.equal(group.character, null);
  assert.equal(group.conflictCharacters.length, 2);
});

test('metadata-only backups remain valid but expose zero readable messages', () => {
  const parsed = recovery.parseChatBackupJsonl(
    JSON.stringify({ chat_metadata: {}, character_name: 'Nova', user_name: 'User' }),
  );
  assert.equal(parsed.characterName, 'Nova');
  assert.equal(parsed.messages.length, 0);
});

test('cleanup threshold is inclusive and metadata-only belongs to threshold zero', () => {
  const metadataSummary = recovery.normalizeBackupSummary({
    chat_items: 0,
    file_name: 'chat_nova_20260811-100000.jsonl',
    file_size: '1 KB',
    last_mes: '2026-08-11T10:00:00.000Z',
  });
  assert.equal(recovery.isCleanupCandidate(metadataSummary, 0, 0), true);
  assert.equal(recovery.isCleanupCandidate(metadataSummary, 1, 0), false);
  assert.equal(recovery.isCleanupCandidate({ ...metadataSummary, chatItems: 2 }, 2, 2), true);
});

test('invalid or unknown summary counts are never normalized to metadata-only', () => {
  const base = {
    file_name: 'chat_nova_20260811-100000.jsonl',
    file_size: '1 KB',
    last_mes: '2026-08-11T10:00:00.000Z',
  };
  assert.equal(recovery.normalizeBackupSummary({ ...base, chat_items: 'unknown' }), null);
  assert.equal(recovery.normalizeBackupSummary({ ...base, chat_items: -1 }), null);
  assert.throws(() => recovery.assertCleanupThreshold(-1), /大于等于 0 的整数/);
  assert.throws(() => recovery.assertCleanupThreshold(1.5), /大于等于 0 的整数/);
});

test('message count comparison blocks a stale or changed backup summary', () => {
  assert.equal(recovery.describeBackupMessageCountMismatch(2, 2), '');
  assert.match(recovery.describeBackupMessageCountMismatch(3, 2), /列表记录 3 层.*实际解析到 2 层.*禁止导入/);
});

test('backup creation time comes from the backup filename instead of the last chat message', () => {
  const item = summary('chat_nova_20260811-123456.jsonl');
  const created = new Date(item.backupCreatedAt);
  assert.equal(created.getFullYear(), 2026);
  assert.equal(created.getMonth(), 7);
  assert.equal(created.getDate(), 11);
  assert.equal(created.getHours(), 12);
  assert.equal(created.getMinutes(), 34);
  assert.equal(created.getSeconds(), 56);
});

test('duplicate backup groups keep the newest exact file and never cross owner or hash boundaries', () => {
  const older = summary('chat_nova_20260811-100000.jsonl');
  const newest = summary('chat_nova_20260811-110000.jsonl');
  const otherOwner = summary('chat_zod_20260811-120000.jsonl');
  const changed = summary('chat_nova_20260811-130000.jsonl');
  const groups = recovery.createDuplicateBackupGroups([
    { actualChatItems: 2, byteLength: 2048, contentHash: 'same', headerHash: 'head', messageHashes: ['a', 'b'], summary: older },
    { actualChatItems: 2, byteLength: 2048, contentHash: 'same', headerHash: 'head', messageHashes: ['a', 'b'], summary: newest },
    { actualChatItems: 2, byteLength: 2048, contentHash: 'same', headerHash: 'head', messageHashes: ['a', 'b'], summary: otherOwner },
    { actualChatItems: 2, byteLength: 2048, contentHash: 'changed', headerHash: 'head', messageHashes: ['a', 'c'], summary: changed },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].keeper.summary.fileName, newest.fileName);
  assert.deepEqual(groups[0].duplicates.map(item => item.summary.fileName), [older.fileName]);
  assert.equal(groups[0].reclaimBytes, 2048);
});

test('unknown, mismatched, or empty fingerprints never become duplicate deletion groups', () => {
  const first = summary('chat_nova_20260811-100000.jsonl');
  const second = summary('chat_nova_20260811-110000.jsonl');
  assert.deepEqual(
    recovery.createDuplicateBackupGroups([
      { actualChatItems: 1, byteLength: 2048, contentHash: 'same', headerHash: 'head', messageHashes: ['a'], summary: first },
      { actualChatItems: 2, byteLength: 2048, contentHash: 'same', headerHash: 'head', messageHashes: ['a', 'b'], summary: second },
    ]),
    [],
  );
  assert.deepEqual(
    recovery.createDuplicateBackupGroups([
      { actualChatItems: 2, byteLength: 0, contentHash: '', headerHash: '', messageHashes: [], summary: first },
      { actualChatItems: 2, byteLength: 0, contentHash: '', headerHash: '', messageHashes: [], summary: second },
    ]),
    [],
  );
});

test('strict prefix containment keeps the longest continuation and rejects branches or metadata-only files', () => {
  const short = summary('chat_nova_20260811-100000.jsonl');
  const long = { ...summary('chat_nova_20260811-110000.jsonl'), chatItems: 4 };
  const branch = { ...summary('chat_nova_20260811-120000.jsonl'), chatItems: 4 };
  const empty = { ...summary('chat_nova_20260811-090000.jsonl'), chatItems: 0 };
  const groups = recovery.createContainedBackupGroups([
    { actualChatItems: 2, byteLength: 100, contentHash: 'short', headerHash: 'head', messageHashes: ['a', 'b'], summary: short },
    {
      actualChatItems: 4,
      byteLength: 200,
      contentHash: 'long',
      headerHash: 'head',
      messageHashes: ['a', 'b', 'c', 'd'],
      summary: long,
    },
    {
      actualChatItems: 4,
      byteLength: 210,
      contentHash: 'branch',
      headerHash: 'head',
      messageHashes: ['a', 'changed', 'c', 'd'],
      summary: branch,
    },
    { actualChatItems: 0, byteLength: 40, contentHash: 'empty', headerHash: 'head', messageHashes: [], summary: empty },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].keeper.summary.fileName, long.fileName);
  assert.deepEqual(groups[0].contained.map(item => item.summary.fileName), [short.fileName]);
});

test('strict prefix containment requires the same JSONL metadata header', () => {
  const short = {
    actualChatItems: 1,
    byteLength: 100,
    contentHash: 'short',
    headerHash: 'header-a',
    messageHashes: ['a'],
    summary: summary('chat_nova_20260811-100000.jsonl'),
  };
  const long = {
    actualChatItems: 2,
    byteLength: 200,
    contentHash: 'long',
    headerHash: 'header-b',
    messageHashes: ['a', 'b'],
    summary: { ...summary('chat_nova_20260811-110000.jsonl'), chatItems: 2 },
  };
  assert.equal(recovery.isStrictMessagePrefix(short, long), false);
});

test('similar backup groups expose older files with at least 90 percent matching message positions', () => {
  const newer = {
    actualChatItems: 10,
    byteLength: 200,
    contentHash: 'newer',
    headerHash: 'head',
    messageHashes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
    summary: { ...summary('chat_nova_20260811-120000.jsonl'), chatItems: 10 },
  };
  const older = {
    actualChatItems: 10,
    byteLength: 180,
    contentHash: 'older',
    headerHash: 'head',
    messageHashes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'changed'],
    summary: { ...summary('chat_nova_20260811-110000.jsonl'), chatItems: 10 },
  };
  const groups = recovery.createSimilarBackupGroups([older, newer], [], []);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].keeper.summary.fileName, newer.summary.fileName);
  assert.equal(groups[0].candidates[0].fingerprint.summary.fileName, older.summary.fileName);
  assert.equal(groups[0].candidates[0].similarity, 0.9);
});

test('settings snapshot summaries reject unrelated or empty backup files', () => {
  assert.deepEqual(
    recovery.normalizeSettingsSnapshotSummary({
      date: 1786500000000,
      name: 'settings_default-user_20260812-120000.json',
      size: 4096,
    }),
    {
      date: 1786500000000,
      name: 'settings_default-user_20260812-120000.json',
      size: 4096,
    },
  );
  assert.equal(
    recovery.normalizeSettingsSnapshotSummary({ date: 1786500000000, name: 'chat_test.jsonl', size: 4096 }),
    null,
  );
  assert.equal(
    recovery.normalizeSettingsSnapshotSummary({
      date: 1786500000000,
      name: 'settings_default-user_20260812-120000.json',
      size: 0,
    }),
    null,
  );
});

test('settings duplicate groups keep the newest byte-identical snapshot', () => {
  const older = { date: 100, name: 'settings_default-user_20260812-100000.json', size: 2048 };
  const newest = { date: 200, name: 'settings_default-user_20260812-110000.json', size: 2048 };
  const changed = { date: 300, name: 'settings_default-user_20260812-120000.json', size: 2050 };
  const groups = recovery.createSettingsDuplicateGroups([
    { contentHash: 'same', summary: older },
    { contentHash: 'same', summary: newest },
    { contentHash: 'changed', summary: changed },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].keeper.summary.name, newest.name);
  assert.deepEqual(groups[0].duplicates.map(item => item.summary.name), [older.name]);
  assert.equal(groups[0].reclaimBytes, older.size);
});

test('settings preview requires a JSON object and formats it for reading', () => {
  assert.equal(recovery.formatSettingsSnapshotJson('{"theme":"dark"}'), '{\n  "theme": "dark"\n}');
  assert.throws(() => recovery.formatSettingsSnapshotJson('[]'), /根节点不是 JSON 对象/);
  assert.throws(() => recovery.formatSettingsSnapshotJson('{broken'), /JSON/);
});

test('a damaged middle JSONL line is rejected with its exact line number', () => {
  const text = [
    JSON.stringify({ chat_metadata: {}, character_name: 'Nova', user_name: 'User' }),
    JSON.stringify({ is_user: true, mes: '正常楼层', name: 'User' }),
    '{damaged',
  ].join('\n');
  assert.throws(() => recovery.parseChatBackupJsonl(text), /第 3 行无法解析/);
});

test('the first JSONL line must contain a chat metadata object', () => {
  assert.throws(
    () => recovery.parseChatBackupJsonl(JSON.stringify({ character_name: 'Nova', mes: '这其实是一条消息' })),
    /第一行不是 SillyTavern 聊天 metadata/,
  );
});

test('single-flight import locking shares one request and unlocks after completion', async () => {
  const run = recovery.createSingleFlight();
  let requests = 0;
  let release;
  const task = () => {
    requests += 1;
    return new Promise(resolve => {
      release = resolve;
    });
  };
  const first = run(task);
  const second = run(task);
  assert.equal(first, second);
  assert.equal(requests, 1);
  release('done');
  await first;
  await run(async () => {
    requests += 1;
    return 'next';
  });
  assert.equal(requests, 2);
});
