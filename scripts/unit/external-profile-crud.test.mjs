/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadCrud() {
  const bridgeSource = await readFile(new URL('../../src/apps/profiles/externalBridge.ts', import.meta.url), 'utf8');
  let bridge = bridgeSource.replace(
    "import { getOptionalGlobalValue } from '@/util/runtime';",
    'const getOptionalGlobalValue = () => null;',
  );
  bridge = ts.transpileModule(bridge, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'externalBridge.ts',
  }).outputText;
  const bridgeModule = await import(`data:text/javascript;base64,${Buffer.from(bridge).toString('base64')}`);
  globalThis.__profileBridgeTest = bridgeModule;

  let source = await readFile(new URL('../../src/apps/profiles/externalCrud.ts', import.meta.url), 'utf8');
  source = source.replace(
    /import \{[\s\S]*?\} from '.\/externalBridge';/u,
    'const { normalizeExternalProfilesData } = globalThis.__profileBridgeTest; const resolveExternalProfilesApi = () => null;',
  );
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'externalCrud.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const crudModule = await loadCrud();
const mappingsSource = await readFile(new URL('../../src/apps/profiles/profileMappings.ts', import.meta.url), 'utf8');
const profilesIndex = await readFile(new URL('../../src/apps/profiles/index.ts', import.meta.url), 'utf8');
const profilesApp = await readFile(new URL('../../src/apps/profiles/ProfilesApp.vue', import.meta.url), 'utf8');

function mapping(overrides = {}) {
  return {
    displayColumn: '姓名',
    fields: [{ column: '出生日期', key: 'birthDate', label: '出生日期' }],
    id: 'mapping_people',
    identityColumn: '唯一编号',
    name: '人物资料',
    sheetKey: 'sheet_people',
    tableName: '人物表',
    ...overrides,
  };
}

function data(rows = [['p-1', '李沐晨', '2001-02-03']]) {
  return {
    mate: { type: 'chatSheets' },
    sheet_people: {
      content: [['唯一编号', '姓名', '出生日期'], ...rows],
      name: '人物表',
      uid: 'people',
    },
  };
}

test('mapped CRUD rereads before every operation and resolves current row index by identity', async () => {
  let current = data([
    ['p-0', '其他人', '1999-01-01'],
    ['p-1', '李沐晨', '2001-02-03'],
  ]);
  let exportCount = 0;
  const calls = [];
  const api = {
    deleteRow: async (...args) => calls.push(['delete', ...args]) > 0,
    exportTableAsJson: () => {
      exportCount += 1;
      return current;
    },
    insertRow: async (...args) => {
      calls.push(['insert', ...args]);
      return 3;
    },
    updateRow: async (...args) => calls.push(['update', ...args]) > 0,
  };
  const repository = crudModule.createExternalProfilesRepository(() => api);

  await repository.updateMappedRow(mapping(), 'p-1', {
    displayValue: '李沐晨·更新',
    fields: { birthDate: '2002-03-04' },
  });
  current = data([
    ['p-1', '李沐晨·更新', '2002-03-04'],
    ['p-0', '其他人', '1999-01-01'],
  ]);
  await repository.deleteMappedRow(mapping(), 'p-1');
  await repository.insertMappedRow(mapping(), {
    displayValue: '沈知遥',
    fields: { birthDate: '2000-05-06' },
    identityValue: 'p-2',
  });

  assert.equal(exportCount, 3);
  assert.deepEqual(calls[0], ['update', '人物表', 2, { 姓名: '李沐晨·更新', 出生日期: '2002-03-04' }]);
  assert.deepEqual(calls[1], ['delete', '人物表', 1]);
  assert.deepEqual(calls[2], [
    'insert',
    '人物表',
    { 唯一编号: 'p-2', 姓名: '沈知遥', 出生日期: '2000-05-06' },
  ]);
});

test('mapped CRUD rejects duplicate table names, duplicate identities and stale columns', async () => {
  const duplicateTables = data();
  duplicateTables.sheet_copy = { content: [['唯一编号'], ['other']], name: '人物表', uid: 'copy' };
  const duplicateIdentities = data([
    ['p-1', '甲', ''],
    ['p-1', '乙', ''],
  ]);
  const staleColumns = data();
  staleColumns.sheet_people.content[0] = ['唯一编号', '姓名', '生日'];

  for (const [raw, expected] of [
    [duplicateTables, /表名.*重复/u],
    [duplicateIdentities, /身份值.*2 行/u],
    [staleColumns, /出生日期.*不存在/u],
  ]) {
    const repository = crudModule.createExternalProfilesRepository(() => ({
      exportTableAsJson: () => raw,
      updateRow: async () => true,
    }));
    await assert.rejects(
      repository.updateMappedRow(mapping(), 'p-1', { fields: { birthDate: '2002-03-04' } }),
      expected,
    );
  }
});

test('insert rejects duplicate or empty identities and unknown logical fields', async () => {
  const repository = crudModule.createExternalProfilesRepository(() => ({
    exportTableAsJson: () => data(),
    insertRow: async () => 2,
  }));
  await assert.rejects(repository.insertMappedRow(mapping(), { identityValue: '', fields: {} }), /身份值不能为空/u);
  await assert.rejects(
    repository.insertMappedRow(mapping(), { identityValue: 'p-1', fields: {} }),
    /身份值.*已存在/u,
  );
  await assert.rejects(
    repository.insertMappedRow(mapping(), { identityValue: 'p-2', fields: { unknown: 'x' } }),
    /未映射的业务字段/u,
  );
});

test('profile mappings are chat-scoped, versioned and never persist row indices', () => {
  assert.match(mappingsSource, /profileMappingsField\s*=\s*'sillytavern_phone_profile_bridge_mappings'/u);
  assert.match(mappingsSource, /schemaVersion:\s*z\.literal\(1\)/u);
  assert.match(mappingsSource, /useChatScopedDomain/u);
  assert.doesNotMatch(mappingsSource, /rowIndex/u);
  assert.match(profilesIndex, /key:\s*'profile-bridge-mappings'/u);
  assert.match(profilesIndex, /createChatScopedBackupSchema\(ExternalProfileMappingsScopeDataSchema\)/u);
  assert.match(profilesIndex, /schemaVersion:\s*1[\s\S]*?scope:\s*'chat'/u);
});

test('Profiles App exposes mapping management without the deleted legacy store', () => {
  assert.match(profilesApp, /page === 'mappings'/u);
  assert.match(profilesApp, /page === 'mapping-editor'/u);
  assert.match(profilesApp, /资料映射/u);
  assert.doesNotMatch(profilesApp, /useProfilesStore|legacyProfiles|legacyFailedDrafts/u);
});
