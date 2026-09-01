import { normalizeExternalProfilesData, resolveExternalProfilesApi, type ExternalProfilesApi } from './externalBridge';

export type ExternalProfilesCrudApi = ExternalProfilesApi & {
  deleteRow?: (tableName: string, rowIndex: number) => boolean | Promise<boolean>;
  insertRow?: (tableName: string, data: Record<string, unknown>) => number | Promise<number>;
  updateRow?: (tableName: string, rowIndex: number, data: Record<string, unknown>) => boolean | Promise<boolean>;
};

type ExternalProfilesCrudResolver = () => ExternalProfilesCrudApi | null;

export function createExternalProfilesRepository(
  resolveApi: ExternalProfilesCrudResolver = resolveExternalProfilesApi,
) {
  function readCurrent() {
    const api = resolveApi();
    if (!api) throw new Error('未检测到外部数据库 API');
    return { api, tables: normalizeExternalProfilesData(api.exportTableAsJson()) };
  }

  function resolveTable(sheetKey: string) {
    const current = readCurrent();
    const table = current.tables.find(candidate => candidate.key === sheetKey);
    if (!table) throw new Error('目标外部资料表已经不存在');
    return { ...current, table };
  }

  async function updateRow(sheetKey: string, rowIndex: number, values: Record<string, unknown>) {
    const { api, table } = resolveTable(sheetKey);
    if (typeof api.updateRow !== 'function') throw new Error('外部数据库没有提供 updateRow API');
    if (!(await api.updateRow(table.name, rowIndex, values))) throw new Error('外部数据库更新行失败');
  }

  async function insertRow(sheetKey: string, values: Record<string, unknown>) {
    const { api, table } = resolveTable(sheetKey);
    if (typeof api.insertRow !== 'function') throw new Error('外部数据库没有提供 insertRow API');
    const rowIndex = await api.insertRow(table.name, values);
    if (!Number.isInteger(rowIndex) || rowIndex < 1) throw new Error('外部数据库插入行失败');
    return rowIndex;
  }

  async function deleteRow(sheetKey: string, rowIndex: number) {
    const { api, table } = resolveTable(sheetKey);
    if (typeof api.deleteRow !== 'function') throw new Error('外部数据库没有提供 deleteRow API');
    if (!(await api.deleteRow(table.name, rowIndex))) throw new Error('外部数据库删除行失败');
  }

  return { deleteRow, insertRow, readCurrent, updateRow };
}
