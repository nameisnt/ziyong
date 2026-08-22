import {
  normalizeExternalProfilesData,
  resolveExternalProfilesApi,
  type ExternalProfileColumn,
  type ExternalProfileTable,
  type ExternalProfilesApi,
} from './externalBridge';
import type { ExternalProfileMapping } from './profileMappings';

export type ExternalProfilesCrudApi = ExternalProfilesApi & {
  deleteRow?: (tableName: string, rowIndex: number) => boolean | Promise<boolean>;
  insertRow?: (tableName: string, data: Record<string, unknown>) => number | Promise<number>;
  updateRow?: (tableName: string, rowIndex: number, data: Record<string, unknown>) => boolean | Promise<boolean>;
};

export type ExternalMappedRowValues = {
  displayValue?: unknown;
  fields?: Record<string, unknown>;
};

export type ExternalMappedInsertValues = ExternalMappedRowValues & {
  identityValue: string;
};

type ExternalProfilesCrudResolver = () => ExternalProfilesCrudApi | null;

function normalizedIdentity(value: string) {
  return value.trim();
}

function assertColumn(table: ExternalProfileTable, columnName: string) {
  const matches = table.columns.filter(column => column.sourceLabel === columnName);
  if (!matches.length) throw new Error(`映射列“${columnName}”已经不存在`);
  if (matches.length > 1) throw new Error(`映射列“${columnName}”在表中重复，无法安全写入`);
  return matches[0] as ExternalProfileColumn;
}

export function validateExternalProfileMapping(mapping: ExternalProfileMapping, tables: ExternalProfileTable[]) {
  const table = tables.find(candidate => candidate.key === mapping.sheetKey);
  if (!table) throw new Error(`映射目标表“${mapping.tableName}”已经不存在`);
  if (table.name !== mapping.tableName) throw new Error(`映射目标表已改名，请重新确认映射`);
  const sameNameTables = tables.filter(candidate => candidate.name === mapping.tableName);
  if (sameNameTables.length !== 1) throw new Error(`外部表名“${mapping.tableName}”重复，无法安全调用写入 API`);

  const identityColumn = assertColumn(table, mapping.identityColumn);
  const displayColumn = assertColumn(table, mapping.displayColumn);
  if (identityColumn.index === displayColumn.index) throw new Error('身份列和显示列必须使用不同列');

  const fieldColumns = new Map<string, ExternalProfileColumn>();
  const usedColumnIndices = new Set([identityColumn.index, displayColumn.index]);
  mapping.fields.forEach(field => {
    if (fieldColumns.has(field.key)) throw new Error(`业务字段标识“${field.key}”重复`);
    const column = assertColumn(table, field.column);
    if (usedColumnIndices.has(column.index)) throw new Error(`映射列“${field.column}”被重复使用`);
    usedColumnIndices.add(column.index);
    fieldColumns.set(field.key, column);
  });
  return { displayColumn, fieldColumns, identityColumn, table };
}

function resolveIdentityRow(
  table: ExternalProfileTable,
  identityColumn: ExternalProfileColumn,
  identityValue: string,
) {
  const normalized = normalizedIdentity(identityValue);
  if (!normalized) throw new Error('身份值不能为空');
  const rows = table.rows.filter(row => normalizedIdentity(row.cells[identityColumn.index] || '') === normalized);
  if (rows.length !== 1) {
    throw new Error(
      rows.length ? `身份值“${normalized}”命中 ${rows.length} 行，已阻止写入` : `身份值“${normalized}”不存在`,
    );
  }
  return rows[0];
}

function mapValues(
  mapping: ExternalProfileMapping,
  displayColumn: ExternalProfileColumn,
  fieldColumns: Map<string, ExternalProfileColumn>,
  values: ExternalMappedRowValues,
) {
  const data: Record<string, unknown> = {};
  if (typeof values.displayValue !== 'undefined') data[displayColumn.sourceLabel] = values.displayValue;
  Object.entries(values.fields ?? {}).forEach(([fieldKey, value]) => {
    const column = fieldColumns.get(fieldKey);
    if (!column) throw new Error(`未映射的业务字段“${fieldKey}”`);
    data[column.sourceLabel] = value;
  });
  if (!Object.keys(data).length) throw new Error(`映射“${mapping.name}”没有可写入的字段`);
  return data;
}

export function createExternalProfilesRepository(
  resolveApi: ExternalProfilesCrudResolver = resolveExternalProfilesApi,
) {
  function readCurrent() {
    const api = resolveApi();
    if (!api) throw new Error('未检测到外部数据库 API');
    return { api, tables: normalizeExternalProfilesData(api.exportTableAsJson()) };
  }

  function resolveCurrentMapping(mapping: ExternalProfileMapping) {
    const current = readCurrent();
    return { ...current, ...validateExternalProfileMapping(mapping, current.tables) };
  }

  async function updateMappedRow(
    mapping: ExternalProfileMapping,
    identityValue: string,
    values: ExternalMappedRowValues,
  ) {
    const { api, displayColumn, fieldColumns, identityColumn, table } = resolveCurrentMapping(mapping);
    if (typeof api.updateRow !== 'function') throw new Error('外部数据库没有提供 updateRow API');
    const row = resolveIdentityRow(table, identityColumn, identityValue);
    const data = mapValues(mapping, displayColumn, fieldColumns, values);
    if (!(await api.updateRow(table.name, row.index, data))) throw new Error('外部数据库更新行失败');
    return true;
  }

  async function insertMappedRow(mapping: ExternalProfileMapping, values: ExternalMappedInsertValues) {
    const { api, displayColumn, fieldColumns, identityColumn, table } = resolveCurrentMapping(mapping);
    if (typeof api.insertRow !== 'function') throw new Error('外部数据库没有提供 insertRow API');
    const identityValue = normalizedIdentity(values.identityValue);
    if (!identityValue) throw new Error('身份值不能为空');
    const duplicateCount = table.rows.filter(
      row => normalizedIdentity(row.cells[identityColumn.index] || '') === identityValue,
    ).length;
    if (duplicateCount) throw new Error(`身份值“${identityValue}”已存在，已阻止插入`);
    const data = {
      [identityColumn.sourceLabel]: identityValue,
      ...mapValues(mapping, displayColumn, fieldColumns, values),
    };
    const rowIndex = await api.insertRow(table.name, data);
    if (!Number.isInteger(rowIndex) || rowIndex < 1) throw new Error('外部数据库插入行失败');
    return rowIndex;
  }

  async function deleteMappedRow(mapping: ExternalProfileMapping, identityValue: string) {
    const { api, identityColumn, table } = resolveCurrentMapping(mapping);
    if (typeof api.deleteRow !== 'function') throw new Error('外部数据库没有提供 deleteRow API');
    const row = resolveIdentityRow(table, identityColumn, identityValue);
    if (!(await api.deleteRow(table.name, row.index))) throw new Error('外部数据库删除行失败');
    return true;
  }

  return {
    deleteMappedRow,
    insertMappedRow,
    updateMappedRow,
  };
}
