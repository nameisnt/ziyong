/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { z } from 'zod';

async function loadProvider() {
  let source = await readFile(new URL('../../src/apps/profiles/itemTransfer.ts', import.meta.url), 'utf8');
  source = source
    .replace(/import type .*?;\r?\n/gu, '')
    .replace(
      "import { parsePrettified } from '@/util/zod';",
      'const parsePrettified = (schema, value) => schema.parse(value);',
    )
    .replace("import { klona } from 'klona';", 'const klona = structuredClone;')
    .replace(
      "import { createExternalProfilesRepository } from './externalCrud';",
      'const createExternalProfilesRepository = () => null;',
    )
    .replace(
      "import { readExternalMappedRows, type ExternalMappedProfileRow } from './profileConsumerBridge';",
      'const readExternalMappedRows = () => [];',
    )
    .replace(
      "import { useExternalProfileMappingsStore, type ExternalProfileMapping } from './profileMappings';",
      'const useExternalProfileMappingsStore = () => ({ getMapping: () => null });',
    );
  globalThis.__externalProfileTransferZod = z;
  const output = ts.transpileModule(`const z = globalThis.__externalProfileTransferZod;\n${source}`, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'profileItemTransfer.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const transfer = await loadProvider();

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

function record() {
  return {
    item: { displayValue: '李沐晨', fields: { birthDate: '2001-02-03' }, identityValue: 'person-1' },
    source: {
      fields: [{ key: 'birthDate', label: '出生日期' }],
      mappingName: '来源人物',
      tableName: '来源人物表',
    },
  };
}

function dependencies(initialRows = []) {
  const rows = structuredClone(initialRows);
  const calls = [];
  return {
    calls,
    provider: transfer.createExternalProfilesItemTransferProvider({
      createCopyIdentity: () => 'person-copy',
      deleteMappedRow: async (_mapping, identityValue) => {
        calls.push(['delete', identityValue]);
        const index = rows.findIndex(row => row.identityValue === identityValue);
        if (index < 0) throw new Error('missing rollback row');
        rows.splice(index, 1);
        return true;
      },
      getMapping: id => (id === 'mapping_people' ? mapping() : null),
      insertMappedRow: async (_mapping, values) => {
        calls.push(['insert', structuredClone(values)]);
        rows.push({
          displayValue: String(values.displayValue || ''),
          fields: Object.fromEntries(Object.entries(values.fields || {}).map(([key, value]) => [key, String(value)])),
          identityValue: values.identityValue,
        });
        return rows.length + 1;
      },
      readRows: () => structuredClone(rows),
      updateMappedRow: async (_mapping, identityValue, values) => {
        calls.push(['update', identityValue, structuredClone(values)]);
        const row = rows.find(candidate => candidate.identityValue === identityValue);
        if (!row) throw new Error('missing update row');
        row.displayValue = String(values.displayValue || '');
        row.fields = Object.fromEntries(
          Object.entries(values.fields || {}).map(([key, value]) => [key, String(value)]),
        );
        return true;
      },
    }),
    rows,
  };
}

test('external row export and preview use explicit mapping fields and stable identity', () => {
  const fixture = dependencies([
    { displayValue: '李沐晨', fields: { birthDate: '2001-02-03', secret: '不导出' }, identityValue: 'person-1' },
  ]);
  const exported = fixture.provider.exportItem({ identityValue: 'person-1', mappingId: 'mapping_people' });
  assert.equal(fixture.provider.itemType, 'external-profile-row');
  assert.equal(fixture.provider.importTransaction, 'provider-owned');
  assert.deepEqual(exported.data.item.fields, { birthDate: '2001-02-03' });
  assert.doesNotMatch(JSON.stringify(exported), /不导出|secret/u);
  const preview = fixture.provider.previewImport(exported.data, { mappingId: 'mapping_people' });
  assert.equal(preview.conflict, true);
  assert.equal(preview.targetLabel, '人物资料 · 人物表');
});

test('copy import always creates a new external identity and never overwrites the source identity', async () => {
  const fixture = dependencies([
    { displayValue: '旧资料', fields: { birthDate: '1999-01-01' }, identityValue: 'person-1' },
  ]);
  const result = await fixture.provider.importItem(record(), { mode: 'copy', params: { mappingId: 'mapping_people' } });
  assert.equal(result.itemId, 'person-copy');
  assert.equal(fixture.rows.length, 2);
  assert.equal(fixture.rows[0].displayValue, '旧资料');
  assert.equal(fixture.rows[1].displayValue, '李沐晨');
});

test('replace failure restores the original external row and keeps both errors when rollback also fails', async () => {
  const rows = [{ displayValue: '原资料', fields: { birthDate: '1999-01-01' }, identityValue: 'person-1' }];
  let updateCount = 0;
  const provider = transfer.createExternalProfilesItemTransferProvider({
    deleteMappedRow: async () => true,
    getMapping: () => mapping(),
    insertMappedRow: async () => 1,
    readRows: () => structuredClone(rows),
    updateMappedRow: async (_mapping, _identity, values) => {
      updateCount += 1;
      rows[0] = {
        displayValue: String(values.displayValue),
        fields: structuredClone(values.fields),
        identityValue: 'person-1',
      };
      if (updateCount === 1) throw new Error('primary update failure');
      return true;
    },
  });
  await assert.rejects(
    provider.importItem(record(), { mode: 'replace', params: { mappingId: 'mapping_people' } }),
    /primary update failure/u,
  );
  assert.deepEqual(rows[0], { displayValue: '原资料', fields: { birthDate: '1999-01-01' }, identityValue: 'person-1' });

  const brokenRollback = transfer.createExternalProfilesItemTransferProvider({
    deleteMappedRow: async () => true,
    getMapping: () => mapping(),
    insertMappedRow: async () => 1,
    readRows: () => [{ displayValue: '原资料', fields: { birthDate: '1999-01-01' }, identityValue: 'person-1' }],
    updateMappedRow: async () => {
      throw new Error('update failure');
    },
  });
  await assert.rejects(
    brokenRollback.importItem(record(), { mode: 'replace', params: { mappingId: 'mapping_people' } }),
    error => error instanceof AggregateError && error.errors.length === 2,
  );
});

test('target mapping must explicitly cover every source business field', () => {
  const fixture = dependencies();
  assert.throws(
    () =>
      fixture.provider.previewImport(
        {
          ...record(),
          item: { ...record().item, fields: { birthDate: '2001-02-03', details: '主角' } },
          source: {
            ...record().source,
            fields: [...record().source.fields, { key: 'details', label: '详情' }],
          },
        },
        { mappingId: 'mapping_people' },
      ),
    /目标映射缺少业务字段：详情/u,
  );
});
