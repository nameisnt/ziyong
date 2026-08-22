/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function source(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

async function loadReferenceCatalog() {
  let catalogSource = await source('src/apps/profiles/externalReferenceCatalog.ts');
  catalogSource = catalogSource
    .replace("import { readExternalMappedRows } from './profileConsumerBridge';", '')
    .replace(/import type .*?;\r?\n/gu, '')
    .replace(
      /export function createExternalProfileReferenceCatalog/u,
      'const readExternalMappedRows = (...args) => globalThis.__profileReferenceReadRows(...args);\nexport function createExternalProfileReferenceCatalog',
    );
  const output = ts.transpileModule(catalogSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'externalReferenceCatalog.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

async function loadGenerationReplay() {
  let replaySource = await source('src/util/generationReplay.ts');
  replaySource = replaySource
    .replace(
      "import { getRegisteredPhoneAppReferenceCatalog, type PhoneReferenceTreeNode } from '@/core/appRegistry';",
      'const getRegisteredPhoneAppReferenceCatalog = () => globalThis.__phoneReferenceCatalog;',
    )
    .replace(/import type .*?;\r?\n/gu, '');
  const output = ts.transpileModule(replaySource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'generationReplay.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

function mapping(overrides = {}) {
  return {
    displayColumn: '姓名',
    fields: [
      { column: '摘要', key: 'summary', label: '摘要' },
      { column: '详情', key: 'details', label: '人物详情' },
    ],
    id: 'mapping_people',
    identityColumn: '唯一编号',
    name: '人物资料',
    sheetKey: 'sheet_people',
    tableName: '人物表',
    updatedAt: '2026-08-22T00:00:00.000Z',
    ...overrides,
  };
}

test('external reference catalog uses mapping identity and only explicitly mapped fields', async () => {
  globalThis.__profileReferenceReadRows = () => [
    {
      displayValue: '李沐晨',
      fields: { details: '学生会成员', ignored: '不应进入引用', summary: '主角' },
      identityValue: 'person:001',
    },
  ];
  const catalog = await loadReferenceCatalog();
  const result = catalog.createExternalProfileReferenceCatalog([mapping()]);
  const root = result.nodes[0];
  const leaf = root.children[0].children[0];

  assert.equal(root.id, 'app:profiles');
  assert.equal(leaf.item.id, 'profiles:external:mapping_people:person%3A001');
  assert.deepEqual(leaf.item.sourcePath, ['资料表', '人物资料']);
  assert.match(leaf.item.content, /摘要：主角/u);
  assert.match(leaf.item.content, /人物详情：学生会成员/u);
  assert.doesNotMatch(leaf.item.content, /ignored|不应进入引用/u);
});

test('one invalid mapping reports a warning without hiding valid mappings', async () => {
  globalThis.__profileReferenceReadRows = current => {
    if (current.id === 'mapping_broken') throw new Error('身份值重复');
    return [{ displayValue: '李沐晨', fields: { summary: '主角' }, identityValue: 'person-1' }];
  };
  const catalog = await loadReferenceCatalog();
  const result = catalog.createExternalProfileReferenceCatalog([
    mapping(),
    mapping({ id: 'mapping_broken', name: '失效资料' }),
  ]);

  assert.equal(result.nodes[0].children.length, 1);
  assert.deepEqual(result.warnings, ['映射“失效资料”：身份值重复']);
});

test('shared reference catalog carries provider warnings and isolates provider failures', async () => {
  const registry = await source('src/core/appRegistry.ts');
  assert.match(registry, /PhoneReferenceProviderResult/u);
  assert.match(registry, /getRegisteredPhoneAppReferenceCatalog/u);
  assert.match(registry, /warnings/u);
  assert.match(registry, /catch \(error\)/u);
});

test('ReferencePicker exposes reference warnings and an explicit refresh action', async () => {
  const picker = await source('src/components/ReferencePicker.vue');
  assert.match(picker, /getRegisteredPhoneAppReferenceCatalog/u);
  assert.match(picker, /部分引用来源不可用/u);
  assert.match(picker, /刷新引用/u);
  assert.match(picker, /referenceCatalog\.warnings/u);
});

test('profile references use the external catalog and replay keeps historical content when unavailable', async () => {
  const [profilesIndex, replay] = await Promise.all([
    source('src/apps/profiles/index.ts'),
    source('src/util/generationReplay.ts'),
  ]);
  assert.match(profilesIndex, /createExternalProfileReferenceCatalog/u);
  assert.doesNotMatch(profilesIndex, /referenceProvider:\s*createProfilesReferenceTree/u);
  assert.match(replay, /getRegisteredPhoneAppReferenceCatalog/u);
  assert.match(replay, /const resolved = current \|\| reference/u);
  assert.match(replay, /unavailable:\s*!current/u);
});

test('reference replay refreshes a live external item and preserves a missing historical snapshot', async () => {
  const replay = await loadGenerationReplay();
  const saved = {
    content: '历史正文',
    id: 'profiles:external:mapping_people:person-1',
    sourcePath: ['资料表', '人物资料'],
    title: '李沐晨',
  };
  globalThis.__phoneReferenceCatalog = {
    nodes: [
      {
        id: saved.id,
        item: { ...saved, content: '当前外部正文' },
        kind: 'leaf',
      },
    ],
    warnings: [],
  };
  assert.deepEqual(replay.resolveSavedGenerationReferences([saved]), [
    { ...saved, content: '当前外部正文', sourcePath: ['资料表', '人物资料'], unavailable: false },
  ]);

  globalThis.__phoneReferenceCatalog = { nodes: [], warnings: ['资料表不可用'] };
  assert.deepEqual(replay.resolveSavedGenerationReferences([saved]), [
    { ...saved, sourcePath: ['资料表', '人物资料'], unavailable: true },
  ]);
});
