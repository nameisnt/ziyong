import type { PhoneItemTransferProvider } from '@/core/appRegistry';
import { parsePrettified } from '@/util/zod';
import { klona } from 'klona';
import { createExternalProfilesRepository } from './externalCrud';
import { readExternalMappedRows, type ExternalMappedProfileRow } from './profileConsumerBridge';
import { useExternalProfileMappingsStore, type ExternalProfileMapping } from './profileMappings';

const ExternalProfileTransferFieldSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

export const ExternalProfileTransferRecordSchema = z.object({
  item: z.object({
    displayValue: z.string(),
    fields: z.record(z.string(), z.string()),
    identityValue: z.string().trim().min(1),
  }),
  source: z.object({
    fields: z.array(ExternalProfileTransferFieldSchema),
    mappingName: z.string().trim().min(1),
    tableName: z.string().trim().min(1),
  }),
});

export type ExternalProfileTransferRecord = z.infer<typeof ExternalProfileTransferRecordSchema>;

type ExternalProfilesItemTransferDependencies = {
  createCopyIdentity?: (sourceIdentity: string, existing: Set<string>) => string;
  deleteMappedRow: (mapping: ExternalProfileMapping, identityValue: string) => Promise<boolean>;
  getMapping: (mappingId: string) => ExternalProfileMapping | null;
  insertMappedRow: (
    mapping: ExternalProfileMapping,
    values: { displayValue?: unknown; fields?: Record<string, unknown>; identityValue: string },
  ) => Promise<number>;
  readRows: (mapping: ExternalProfileMapping) => ExternalMappedProfileRow[];
  updateMappedRow: (
    mapping: ExternalProfileMapping,
    identityValue: string,
    values: { displayValue?: unknown; fields?: Record<string, unknown> },
  ) => Promise<boolean>;
};

function validateTransferRecord(record: ExternalProfileTransferRecord) {
  const sourceKeys = record.source.fields.map(field => field.key);
  if (new Set(sourceKeys).size !== sourceKeys.length) throw new Error('单条资料文件包含重复业务字段');
  const valueKeys = Object.keys(record.item.fields);
  const undeclared = valueKeys.filter(key => !sourceKeys.includes(key));
  if (undeclared.length) throw new Error(`单条资料文件包含未声明字段：${undeclared.join('、')}`);
  const missing = sourceKeys.filter(key => !Object.hasOwn(record.item.fields, key));
  if (missing.length) throw new Error(`单条资料文件缺少字段值：${missing.join('、')}`);
  return record;
}

function resolveTarget(
  record: ExternalProfileTransferRecord,
  params: Record<string, string>,
  dependencies: ExternalProfilesItemTransferDependencies,
) {
  const mapping = dependencies.getMapping(params.mappingId || '');
  if (!mapping) throw new Error('请先选择要导入到的外部资料映射');
  const targetKeys = new Set(mapping.fields.map(field => field.key));
  const missing = record.source.fields.filter(field => !targetKeys.has(field.key));
  if (missing.length) throw new Error(`目标映射缺少业务字段：${missing.map(field => field.label).join('、')}`);
  const rows = dependencies.readRows(mapping);
  return { mapping, rows };
}

export function createExternalProfileCopyIdentity(
  sourceIdentity: string,
  existing: Set<string>,
  timestamp = Date.now(),
  random = Math.random(),
) {
  const normalized = sourceIdentity.trim();
  const seed = Math.abs(Math.floor(random * 36 ** 5))
    .toString(36)
    .padStart(5, '0');
  const base = `${normalized}__import_${timestamp.toString(36)}_${seed}`;
  let candidate = base;
  let suffix = 2;
  while (existing.has(candidate)) candidate = `${base}_${suffix++}`;
  return candidate;
}

function createDefaultDependencies(): ExternalProfilesItemTransferDependencies {
  const repository = createExternalProfilesRepository();
  return {
    deleteMappedRow: (mapping, identityValue) => repository.deleteMappedRow(mapping, identityValue),
    getMapping: mappingId => useExternalProfileMappingsStore().getMapping(mappingId),
    insertMappedRow: (mapping, values) => repository.insertMappedRow(mapping, values),
    readRows: mapping => readExternalMappedRows(mapping),
    updateMappedRow: (mapping, identityValue, values) => repository.updateMappedRow(mapping, identityValue, values),
  };
}

function rollbackFailure(primaryError: unknown, rollbackError: unknown) {
  return new AggregateError([primaryError, rollbackError], '单条资料导入失败，且外部资料回滚失败');
}

export function createExternalProfilesItemTransferProvider(
  dependencies: ExternalProfilesItemTransferDependencies = createDefaultDependencies(),
): PhoneItemTransferProvider {
  return {
    exportItem(params) {
      const mapping = dependencies.getMapping(params.mappingId || '');
      if (!mapping) return null;
      const identityValue = (params.identityValue || '').trim();
      if (!identityValue) return null;
      const row = dependencies.readRows(mapping).find(candidate => candidate.identityValue.trim() === identityValue);
      if (!row) return null;
      const item = {
        displayValue: row.displayValue,
        fields: Object.fromEntries(mapping.fields.map(field => [field.key, row.fields[field.key] || ''])),
        identityValue,
      };
      return {
        data: {
          item,
          source: {
            fields: mapping.fields.map(field => ({ key: field.key, label: field.label })),
            mappingName: mapping.name,
            tableName: mapping.tableName,
          },
        },
        itemId: identityValue,
        title: item.displayValue || identityValue,
      };
    },
    async importItem(data, context) {
      const record = validateTransferRecord(
        parsePrettified(ExternalProfileTransferRecordSchema, data) as ExternalProfileTransferRecord,
      );
      const { mapping, rows } = resolveTarget(record, context.params, dependencies);
      const sourceIdentity = record.item.identityValue.trim();
      const conflict = rows.some(row => row.identityValue.trim() === sourceIdentity);
      if (context.mode === 'replace') {
        if (!conflict) throw new Error('目标映射没有同身份资料，不能覆盖');
        const snapshot = rows.find(row => row.identityValue.trim() === sourceIdentity) as ExternalMappedProfileRow;
        try {
          await dependencies.updateMappedRow(mapping, sourceIdentity, {
            displayValue: record.item.displayValue,
            fields: klona(record.item.fields),
          });
        } catch (error) {
          try {
            await dependencies.updateMappedRow(mapping, sourceIdentity, {
              displayValue: snapshot.displayValue,
              fields: klona(snapshot.fields),
            });
          } catch (rollbackError) {
            throw rollbackFailure(error, rollbackError);
          }
          throw error;
        }
        return {
          itemId: sourceIdentity,
          message: `已覆盖外部资料“${record.item.displayValue || sourceIdentity}”`,
          route: {
            page: 'row',
            params: { identityValue: sourceIdentity, mappingId: mapping.id, sheetKey: mapping.sheetKey },
            title: record.item.displayValue || sourceIdentity,
          },
          title: record.item.displayValue || sourceIdentity,
        };
      }

      const existing = new Set(rows.map(row => row.identityValue.trim()));
      const identityValue =
        dependencies.createCopyIdentity?.(sourceIdentity, existing) ??
        createExternalProfileCopyIdentity(sourceIdentity, existing);
      try {
        await dependencies.insertMappedRow(mapping, {
          displayValue: record.item.displayValue,
          fields: klona(record.item.fields),
          identityValue,
        });
      } catch (error) {
        let inserted = false;
        try {
          inserted = dependencies.readRows(mapping).some(row => row.identityValue.trim() === identityValue);
        } catch {
          inserted = true;
        }
        if (inserted) {
          try {
            await dependencies.deleteMappedRow(mapping, identityValue);
          } catch (rollbackError) {
            throw rollbackFailure(error, rollbackError);
          }
        }
        throw error;
      }
      return {
        itemId: identityValue,
        message: `已导入外部资料“${record.item.displayValue || sourceIdentity}”`,
        route: {
          page: 'row',
          params: { identityValue, mappingId: mapping.id, sheetKey: mapping.sheetKey },
          title: record.item.displayValue || sourceIdentity,
        },
        title: record.item.displayValue || sourceIdentity,
      };
    },
    importTransaction: 'provider-owned',
    itemLabel: '外部资料行',
    itemType: 'external-profile-row',
    previewImport(data, params) {
      const record = validateTransferRecord(
        parsePrettified(ExternalProfileTransferRecordSchema, data) as ExternalProfileTransferRecord,
      );
      const { mapping, rows } = resolveTarget(record, params, dependencies);
      const identityValue = record.item.identityValue.trim();
      return {
        conflict: rows.some(row => row.identityValue.trim() === identityValue),
        description: `来源：${record.source.mappingName} · ${record.source.tableName}`,
        itemId: identityValue,
        targetLabel: `${mapping.name} · ${mapping.tableName}`,
        title: record.item.displayValue || identityValue,
      };
    },
    schema: ExternalProfileTransferRecordSchema,
    schemaVersion: 1,
  };
}

export const profilesItemTransferProvider = createExternalProfilesItemTransferProvider();
