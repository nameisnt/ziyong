/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { z } from 'zod';

globalThis.z = z;

async function source(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

async function loadGenerationAdapter() {
  let generationSource = await source('src/apps/profiles/generation.ts');
  generationSource = generationSource
    .replace(/import \{[\s\S]*?\} from '.\/store';/u, '')
    .replace(/import type \{[\s\S]*?\} from '@\/type\/generation';/u, '')
    .replace("import { parsePrettified } from '@/util/zod';", 'const parsePrettified = (_schema, value) => value;')
    .replace(
      "import { parseConfiguredOutput } from '@/util/outputParsing';",
      'const parseConfiguredOutput = (_id, _raw, _schema, fallback) => fallback();',
    )
    .replace(
      "import { parseTaggedOutputCandidates } from '@/util/parseCandidates';",
      'const parseTaggedOutputCandidates = (_raw, _tag, parser) => parser(_raw);',
    );
  const output = ts.transpileModule(generationSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'generation.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const [generation, generationStore, profilesIndex, profilesApp, workbenchStore, workbenchRunner, workbenchApp, workbenchIndex, generationType, generationService] =
  await Promise.all([
    loadGenerationAdapter(),
    source('src/apps/profiles/generationDrafts.ts').catch(() => ''),
    source('src/apps/profiles/index.ts'),
    source('src/apps/profiles/ProfilesApp.vue'),
    source('src/apps/workbench/store.ts'),
    source('src/apps/workbench/runner.ts'),
    source('src/apps/workbench/WorkbenchApp.vue'),
    source('src/apps/workbench/index.ts'),
    source('src/type/generation.ts'),
    source('src/core/generationService.ts'),
  ]);

function mapping() {
  return {
    displayColumn: '姓名',
    fields: [
      { column: '摘要', key: 'summary', label: '摘要' },
      { column: '标签', key: 'tags', label: '标签' },
      { column: '详情', key: 'details', label: '详细资料' },
    ],
    id: 'mapping_people',
    identityColumn: '唯一编号',
    name: '人物资料',
    sheetKey: 'sheet_people',
    tableName: '人物表',
  };
}

test('external profile generation builds mapped field instructions and writes a stable generation identity', async () => {
  const insertCalls = [];
  const adapter = generation.createProfileGenerationAdapter({
    getMapping: id => (id === 'mapping_people' ? mapping() : null),
    insertMappedRow: async (...args) => {
      insertCalls.push(args);
      return 7;
    },
  });

  const request = adapter.buildRequest({
    appPrompt: '整理资料',
    mappingId: 'mapping_people',
    outputFormat: '<result />',
    titleHint: '李沐晨',
    userRequirement: '',
  });
  assert.match(request.taskInstruction, /目标资料映射：人物资料/u);
  assert.match(request.taskInstruction, /目标外部表：人物表/u);
  assert.match(request.taskInstruction, /id=details/u);
  assert.doesNotMatch(request.taskInstruction, /资料类型/u);

  const saved = await adapter.save(
    {
      fields: { details: '人物详情', ignored: '不能写入' },
      summary: '一句话摘要',
      tags: ['主角', '学生'],
      title: '李沐晨',
    },
    {
      config: {
        appPrompt: '整理资料',
        mappingId: 'mapping_people',
        outputFormat: '<result />',
        titleHint: '李沐晨',
        userRequirement: '',
      },
      generationRecord: { id: 'record_123' },
    },
  );
  assert.equal(saved.entityId, 'profile-generation:record_123');
  assert.equal(adapter.preserveSaveFailure, true);
  assert.deepEqual(insertCalls, [
    [
      mapping(),
      {
        displayValue: '李沐晨',
        fields: { details: '人物详情', summary: '一句话摘要', tags: '主角、学生' },
        identityValue: 'profile-generation:record_123',
      },
    ],
  ]);
});

test('only adapters that opt in preserve parsed output when saving fails', () => {
  assert.match(generationType, /preserveSaveFailure\?:\s*boolean/u);
  assert.match(generationService, /if \(!adapter\.preserveSaveFailure\) throw error/u);
  assert.match(generationService, /`保存失败：\$\{error instanceof Error/u);
  assert.match(generationService, /options\.createFailedDraft/u);
});

test('external profile generation refuses a missing explicit mapping', () => {
  const adapter = generation.createProfileGenerationAdapter({
    getMapping: () => null,
    insertMappedRow: async () => 1,
  });
  assert.throws(
    () =>
      adapter.buildRequest({
        appPrompt: '',
        mappingId: '',
        outputFormat: '',
        titleHint: '',
        userRequirement: '',
      }),
    /资料映射/u,
  );
});

test('workbench persists an explicit mapping while retaining legacy targets only as unresolved data', () => {
  assert.match(workbenchStore, /profileMappingId:\s*z\.string\(\)\.default\(''\)/u);
  assert.match(workbenchStore, /profileTableId:\s*z\.string\(\)\.default\(''\)/u);
  assert.match(workbenchStore, /profileKind:/u);
  assert.match(workbenchRunner, /mappingId:\s*mapping\.id/u);
  assert.match(workbenchRunner, /useExternalProfileGenerationStore/u);
  assert.doesNotMatch(workbenchRunner, /useProfilesStore/u);
  assert.match(workbenchApp, /useExternalProfileMappingsStore/u);
  assert.match(workbenchApp, /旧资料目标待重新选择/u);
  assert.doesNotMatch(workbenchApp, /profileKindOptions|useProfilesStore/u);
  assert.match(workbenchIndex, /schemaVersion:\s*2/u);
  assert.match(workbenchIndex, /migrateImport:\s*data\s*=>\s*data/u);
});

test('external generation drafts remain in their separate chat-scoped backup domain after legacy deletion', () => {
  assert.match(generationStore, /externalProfileGenerationDraftsField/u);
  assert.match(generationStore, /useChatScopedDomain/u);
  assert.match(generationStore, /createFailedDraftCollection/u);
  assert.match(profilesIndex, /key:\s*'external-profile-generation-drafts'/u);
  assert.match(profilesIndex, /ExternalProfileGenerationScopeDataSchema/u);
  assert.match(profilesIndex, /useExternalProfileGenerationStore/u);
  assert.doesNotMatch(profilesIndex, /useProfilesStore|profilesField/u);
  assert.match(profilesApp, /FailedDraftRepairPage/u);
  assert.doesNotMatch(profilesApp, /旧资料目标待重新选择|旧资料生成失败草稿/u);
  assert.match(profilesApp, /保存到外部资料表/u);
  assert.match(profilesApp, /profile-generation:/u);
});
