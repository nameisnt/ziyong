/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadConsumerBridge() {
  const externalBridgeSource = await readFile(
    new URL('../../src/apps/profiles/externalBridge.ts', import.meta.url),
    'utf8',
  );
  const externalBridge = ts.transpileModule(
    externalBridgeSource.replace(
      "import { getOptionalGlobalValue } from '@/util/runtime';",
      'const getOptionalGlobalValue = () => null;',
    ),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  globalThis.__profileConsumerBridge = await import(
    `data:text/javascript;base64,${Buffer.from(externalBridge).toString('base64')}`
  );

  const crudSource = await readFile(new URL('../../src/apps/profiles/externalCrud.ts', import.meta.url), 'utf8');
  const crud = ts.transpileModule(
    crudSource.replace(
      /import \{[\s\S]*?\} from '.\/externalBridge';/u,
      'const { normalizeExternalProfilesData } = globalThis.__profileConsumerBridge; const resolveExternalProfilesApi = () => null;',
    ),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  globalThis.__profileConsumerCrud = await import(`data:text/javascript;base64,${Buffer.from(crud).toString('base64')}`);

  const consumerSource = await readFile(
    new URL('../../src/apps/profiles/profileConsumerBridge.ts', import.meta.url),
    'utf8',
  );
  const consumer = ts.transpileModule(
    consumerSource
      .replace(
        /import \{[\s\S]*?\} from '.\/externalBridge';/u,
        'const { normalizeExternalProfilesData } = globalThis.__profileConsumerBridge; const resolveExternalProfilesApi = () => null;',
      )
      .replace(
        "import { validateExternalProfileMapping } from './externalCrud';",
        'const { validateExternalProfileMapping } = globalThis.__profileConsumerCrud;',
      ),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(consumer).toString('base64')}`);
}

const consumerBridge = await loadConsumerBridge();
const timekeeperStore = await readFile(new URL('../../src/apps/timekeeper/store.ts', import.meta.url), 'utf8');
const timekeeperIndex = await readFile(new URL('../../src/apps/timekeeper/index.ts', import.meta.url), 'utf8');
const timekeeperApp = await readFile(new URL('../../src/apps/timekeeper/TimekeeperApp.vue', import.meta.url), 'utf8');
const cardWriterApp = await readFile(new URL('../../src/apps/card-writer/CardWriterApp.vue', import.meta.url), 'utf8');
const profileImport = await readFile(new URL('../../src/apps/card-writer/profileImport.ts', import.meta.url), 'utf8');
const contentReceivers = await readFile(new URL('../../src/apps/contentReceivers.ts', import.meta.url), 'utf8');
const profilesIndex = await readFile(new URL('../../src/apps/profiles/index.ts', import.meta.url), 'utf8');

function mapping(fields = [{ column: '出生日期', key: 'birthDate', label: '出生日期' }]) {
  return {
    displayColumn: '姓名',
    fields,
    id: 'mapping_people',
    identityColumn: '唯一编号',
    name: '人物资料',
    sheetKey: 'sheet_people',
    tableName: '人物表',
  };
}

test('consumer bridge reads only explicitly mapped identity, display and business fields', () => {
  const rows = consumerBridge.readExternalMappedRows(mapping(), () => ({
    exportTableAsJson: () => ({
      mate: {},
      sheet_people: {
        content: [
          ['唯一编号', '姓名', '出生日期', '未映射秘密'],
          ['p-1', '李沐晨', '2001-02-03', '不得泄露'],
        ],
        name: '人物表',
      },
    }),
  }));
  assert.deepEqual(rows, [
    { displayValue: '李沐晨', fields: { birthDate: '2001-02-03' }, identityValue: 'p-1' },
  ]);
  assert.doesNotMatch(JSON.stringify(rows), /不得泄露/u);
});

test('consumer bridge rejects missing required logical fields instead of guessing columns', () => {
  assert.throws(() => consumerBridge.assertExternalMappingFields(mapping([]), ['birthDate']), /缺少业务字段.*birthDate/u);
});

test('consumer bridge blocks empty and duplicate external identities before a consumer can link them', () => {
  for (const [rows, expected] of [
    [[['', '无身份', '2001-02-03']], /空身份值/u],
    [
      [
        ['p-1', '甲', '2001-02-03'],
        ['p-1', '乙', '2002-03-04'],
      ],
      /身份值.*2 行/u,
    ],
  ]) {
    assert.throws(
      () =>
        consumerBridge.readExternalMappedRows(mapping(), () => ({
          exportTableAsJson: () => ({
            sheet_people: { content: [['唯一编号', '姓名', '出生日期'], ...rows], name: '人物表' },
          }),
        })),
      expected,
    );
  }
});

test('timekeeper persists external mapping identities and backup v2 migrates old snapshots', () => {
  assert.match(timekeeperStore, /personProfileMappingId:\s*z\.string\(\)\.default\(''\)/u);
  assert.match(timekeeperStore, /profileIdentityValue:\s*z\.string\(\)\.default\(''\)/u);
  assert.match(timekeeperStore, /calendarProfileIdentityValue:\s*z\.string\(\)\.default\(''\)/u);
  assert.match(timekeeperStore, /assertExternalMappingFields\(mapping, \['birthDate'\]\)/u);
  assert.match(timekeeperIndex, /migrateImport:\s*data\s*=>\s*data/u);
  assert.match(timekeeperIndex, /schemaVersion:\s*2/u);
  assert.doesNotMatch(timekeeperStore, /useProfilesStore/u);
  assert.doesNotMatch(timekeeperApp, /ProfileEntryPicker|useProfilesStore/u);
});

test('card writer imports candidates through selected mappings and stable source identities', () => {
  assert.doesNotMatch(cardWriterApp, /useProfilesStore|getProfileKindLabel|ProfileEntry/u);
  assert.doesNotMatch(profileImport, /apps\/profiles\/store/u);
  assert.match(cardWriterApp, /assertExternalMappingFields\(mapping, \['details'\]\)/u);
  assert.match(cardWriterApp, /return `\$\{importDocumentId\.value\}:\$\{candidate\.sourceKey\}`/u);
  assert.match(cardWriterApp, /profileRepository\.(?:insertMappedRow|updateMappedRow)/u);
  assert.match(cardWriterApp, /选择资料映射/u);
});

test('content conversion exposes only mapped business fields and inserts through external CRUD', () => {
  assert.doesNotMatch(contentReceivers, /useProfilesStore/u);
  assert.match(contentReceivers, /key:\s*'mappingId'/u);
  assert.match(contentReceivers, /const fieldOptions = \(mapping\?\.fields \?\? \[\]\)/u);
  assert.match(contentReceivers, /repository\.insertMappedRow/u);
  assert.match(contentReceivers, /page:\s*'table'.*sheetKey:\s*mapping\.sheetKey/su);
});

test('profiles no longer publishes legacy store rows as current favorites or statistics', () => {
  assert.doesNotMatch(profilesIndex, /contentStatsProvider:\s*createProfilesContentStats/u);
  assert.doesNotMatch(profilesIndex, /favoriteProvider:\s*createProfilesFavoriteItems/u);
  assert.doesNotMatch(profilesIndex, /function createProfiles(?:ContentStats|FavoriteItems)/u);
  assert.doesNotMatch(profilesIndex, /archiveProvider:\s*\{/u);
  assert.doesNotMatch(profilesIndex, /key:\s*'profiles',\s*\n\s*exportData/u);
  assert.doesNotMatch(profilesIndex, /useProfilesStore|profilesField/u);
  assert.match(profilesIndex, /generationRecoveryProvider/u);
});
