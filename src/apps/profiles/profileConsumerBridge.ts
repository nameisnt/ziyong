import {
  normalizeExternalProfilesData,
  resolveExternalProfilesApi,
  type ExternalProfilesApi,
} from './externalBridge';
import { validateExternalProfileMapping } from './externalCrud';
import type { ExternalProfileMapping } from './profileMappings';

export type ExternalMappedProfileRow = {
  displayValue: string;
  fields: Record<string, string>;
  identityValue: string;
};

type ExternalProfilesReadResolver = () => ExternalProfilesApi | null;

export function assertExternalMappingFields(mapping: ExternalProfileMapping, requiredKeys: string[]) {
  const mappedKeys = new Set(mapping.fields.map(field => field.key));
  const missing = requiredKeys.filter(key => !mappedKeys.has(key));
  if (missing.length) throw new Error(`映射“${mapping.name}”缺少业务字段：${missing.join('、')}`);
}

export function readExternalMappedRows(
  mapping: ExternalProfileMapping,
  resolveApi: ExternalProfilesReadResolver = resolveExternalProfilesApi,
): ExternalMappedProfileRow[] {
  const api = resolveApi();
  if (!api) throw new Error('未检测到外部数据库 API');
  const tables = normalizeExternalProfilesData(api.exportTableAsJson());
  const { displayColumn, fieldColumns, identityColumn, table } = validateExternalProfileMapping(mapping, tables);
  const rows = table.rows.map(row => ({
    displayValue: row.cells[displayColumn.index] || '',
    fields: Object.fromEntries(
      [...fieldColumns.entries()].map(([fieldKey, column]) => [fieldKey, row.cells[column.index] || '']),
    ),
    identityValue: row.cells[identityColumn.index] || '',
  }));
  const identityCounts = new Map<string, number>();
  rows.forEach(row => {
    const identityValue = row.identityValue.trim();
    if (!identityValue) throw new Error(`映射“${mapping.name}”存在空身份值，已阻止读取`);
    identityCounts.set(identityValue, (identityCounts.get(identityValue) ?? 0) + 1);
  });
  const duplicateIdentity = [...identityCounts.entries()].find(([, count]) => count > 1);
  if (duplicateIdentity) {
    throw new Error(`身份值“${duplicateIdentity[0]}”命中 ${duplicateIdentity[1]} 行，已阻止读取`);
  }
  return rows;
}
