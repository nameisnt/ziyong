import {
  getRegisteredPhoneApp,
  type PhoneItemTransferImportResult,
  type PhoneItemTransferPreview,
  type PhoneItemTransferProvider,
} from '@/core/appRegistry';
import { parsePrettified } from '@/util/zod';
import { klona } from 'klona';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';

export interface ItemTransferPayload {
  appId: string;
  data: unknown;
  exportedAt: string;
  format: 'sillytavern-phone-item-transfer';
  itemId: string;
  itemSchemaVersion: number;
  itemType: string;
  title: string;
  version: 1;
}

export type ItemTransferImportMode = 'copy' | 'replace';

const ItemTransferPayloadSchema = z.object({
  appId: z.string().min(1),
  data: z.unknown(),
  exportedAt: z.string().min(1),
  format: z.literal('sillytavern-phone-item-transfer'),
  itemId: z.string().min(1),
  itemSchemaVersion: z.number().int().positive(),
  itemType: z.string().min(1),
  title: z.string(),
  version: z.literal(1),
});

function getProvider(appId: string) {
  const app = getRegisteredPhoneApp(appId);
  const provider = app?.itemTransferProvider;
  if (!app || !provider) throw new Error(`App“${app?.name || appId}”不支持单条内容迁移`);
  return { app, provider };
}

function validatePayloadForProvider(
  appId: string,
  payload: ItemTransferPayload,
  provider: PhoneItemTransferProvider,
) {
  if (payload.version !== 1) throw new Error(`不支持的单条内容文件版本：${payload.version}`);
  if (payload.appId !== appId) throw new Error(`这份文件属于“${payload.appId}”，不能导入当前 App`);
  if (payload.itemType !== provider.itemType) throw new Error(`文件对象类型“${payload.itemType}”与当前 App 不一致`);
  if (payload.itemSchemaVersion > provider.schemaVersion) {
    throw new Error(`文件对象版本 ${payload.itemSchemaVersion} 高于当前支持版本 ${provider.schemaVersion}`);
  }
  const migrated =
    payload.itemSchemaVersion < provider.schemaVersion
      ? provider.migrateImport?.(payload.data, payload.itemSchemaVersion)
      : payload.data;
  if (typeof migrated === 'undefined') {
    throw new Error(`当前 App 没有提供从对象版本 ${payload.itemSchemaVersion} 升级的方法`);
  }
  return parsePrettified(provider.schema, klona(migrated));
}

export function cloneItemWithFreshIds<T>(value: T): T {
  const idMap = new Map<string, string>();
  const seed = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  function collect(entry: unknown) {
    if (Array.isArray(entry)) return void entry.forEach(collect);
    if (!entry || typeof entry !== 'object') return;
    Object.entries(entry as Record<string, unknown>).forEach(([key, item]) => {
      if (key === 'id' && typeof item === 'string' && item) idMap.set(item, `${item}_copy_${seed}_${idMap.size + 1}`);
      else collect(item);
    });
  }

  function replace(entry: unknown): unknown {
    if (Array.isArray(entry)) return entry.map(replace);
    if (!entry || typeof entry !== 'object') return typeof entry === 'string' ? (idMap.get(entry) ?? entry) : entry;
    return Object.fromEntries(
      Object.entries(entry as Record<string, unknown>).map(([key, item]) => [key, replace(item)]),
    );
  }

  collect(value);
  return replace(klona(value)) as T;
}

export function buildItemTransfer(appId: string, params: Record<string, string>): ItemTransferPayload {
  const { provider } = getProvider(appId);
  const exported = provider.exportItem(params);
  if (!exported) throw new Error('当前页面没有可导出的单条内容');
  const data = parsePrettified(provider.schema, klona(exported.data));
  return {
    appId,
    data,
    exportedAt: new Date().toISOString(),
    format: 'sillytavern-phone-item-transfer',
    itemId: exported.itemId,
    itemSchemaVersion: provider.schemaVersion,
    itemType: provider.itemType,
    title: exported.title,
    version: 1,
  };
}

export function downloadItemTransfer(appId: string, params: Record<string, string>) {
  const payload = buildItemTransfer(appId, params);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${payload.title.replace(/[\\/:*?"<>|]/g, '_') || payload.itemType}-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return payload;
}

export function parseItemTransfer(raw: string): ItemTransferPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('单条内容文件不是有效的 JSON');
  }
  return parsePrettified(ItemTransferPayloadSchema, parsed) as ItemTransferPayload;
}

export async function parseItemTransferFile(file: File) {
  return parseItemTransfer(await file.text());
}

export function previewItemTransfer(
  appId: string,
  payload: ItemTransferPayload,
  params: Record<string, string>,
): PhoneItemTransferPreview {
  const { provider } = getProvider(appId);
  const data = validatePayloadForProvider(appId, payload, provider);
  return provider.previewImport(data, params);
}

export async function importItemTransfer(
  appId: string,
  payload: ItemTransferPayload,
  options: { mode: ItemTransferImportMode; params: Record<string, string> },
): Promise<PhoneItemTransferImportResult> {
  const { provider } = getProvider(appId);
  const data = validatePayloadForProvider(appId, payload, provider);
  const preview = provider.previewImport(data, options.params);
  if (options.mode === 'replace' && !preview.conflict) throw new Error('目标中没有同 ID 内容，不能执行覆盖');
  const snapshot = provider.captureSnapshot();
  try {
    const result = await provider.importItem(klona(data), options);
    saveSettingsDebounced();
    return result;
  } catch (error) {
    try {
      provider.restoreSnapshot(snapshot);
      saveSettingsDebounced();
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], '单条内容导入失败，且回滚原数据失败');
    }
    throw error;
  }
}

