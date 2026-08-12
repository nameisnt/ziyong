import { getRegisteredPhoneApp, getRegisteredPhoneBackupDomains, type PhoneBackupDomain } from '@/core/appRegistry';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { parsePrettified } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';

export type ContentTransferMode = 'copy' | 'merge' | 'replace';

export interface ContentTransferPayload {
  category: PhoneBackupDomain['category'];
  data: unknown;
  domainKey: string;
  exportedAt: string;
  format: 'sillytavern-phone-content-transfer';
  schemaVersion: number;
  scope: PhoneBackupDomain['scope'];
  sourceScopeKey: string;
  version: 1;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function cloneEnvelope(value: unknown) {
  const record = asRecord(klona(value)) ?? {};
  const scopes = asRecord(record.scopes) ?? {};
  return { ...record, currentScope: typeof record.currentScope === 'string' ? record.currentScope : '', scopes };
}

function createIdMap(value: unknown, ids = new Map<string, string>()) {
  if (Array.isArray(value)) value.forEach(item => createIdMap(item, ids));
  else if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (key === 'id' && typeof entry === 'string' && entry) {
        ids.set(entry, `${entry}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      } else createIdMap(entry, ids);
    });
  }
  return ids;
}

function cloneAsCopy(value: unknown) {
  const ids = createIdMap(value);
  function visit(entry: unknown, topLevel = false): unknown {
    if (Array.isArray(entry)) return entry.map(item => visit(item, topLevel));
    if (!entry || typeof entry !== 'object') return typeof entry === 'string' ? (ids.get(entry) ?? entry) : entry;
    const result: Record<string, unknown> = {};
    Object.entries(entry as Record<string, unknown>).forEach(([key, item]) => {
      result[key] = visit(item);
    });
    if (topLevel) {
      if (typeof result.title === 'string') result.title = `${result.title} 副本`;
      else if (typeof result.name === 'string') result.name = `${result.name} 副本`;
    }
    return result;
  }
  if (!asRecord(value)) return visit(value);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      Array.isArray(entry) ? entry.map(item => visit(item, true)) : visit(entry),
    ]),
  );
}

function mergeArray(current: unknown[], incoming: unknown[], mode: Exclude<ContentTransferMode, 'replace'>) {
  const prepared = mode === 'copy' ? (cloneAsCopy(incoming) as unknown[]) : klona(incoming);
  const allHaveIds = [...current, ...prepared].every(item => typeof asRecord(item)?.id === 'string');
  if (!allHaveIds) return [...klona(current), ...prepared];
  const merged = new Map<string, unknown>();
  current.forEach(item => merged.set(String(asRecord(item)?.id), klona(item)));
  prepared.forEach(item => merged.set(String(asRecord(item)?.id), item));
  return [...merged.values()];
}

function mergeScopeData(current: unknown, incoming: unknown, mode: ContentTransferMode): unknown {
  if (mode === 'replace') return klona(incoming);
  if (Array.isArray(incoming)) return mergeArray(Array.isArray(current) ? current : [], incoming, mode);
  const incomingRecord = asRecord(incoming);
  if (!incomingRecord) return klona(incoming);
  const currentRecord = asRecord(current) ?? {};
  const result = klona(currentRecord);
  Object.entries(incomingRecord).forEach(([key, value]) => {
    result[key] = mergeScopeData(currentRecord[key], value, mode);
  });
  if (mode === 'copy') {
    if (typeof result.title === 'string' && result.title === incomingRecord.title)
      result.title = `${result.title} 副本`;
    else if (typeof result.name === 'string' && result.name === incomingRecord.name)
      result.name = `${result.name} 副本`;
  }
  return result;
}

function getTransferDomain(domainKey: string) {
  const domain = getRegisteredPhoneBackupDomains().find(item => item.key === domainKey && item.category !== 'draft');
  if (!domain) throw new Error(`未找到可迁移数据域“${domainKey}”`);
  return domain;
}

export function getAppContentTransferDomains(appId: string) {
  return (getRegisteredPhoneApp(appId)?.backupDomains ?? []).filter(domain => domain.category !== 'draft');
}

export function buildContentTransfer(domainKey: string, scopeKey = getCurrentChatScopeKey()): ContentTransferPayload {
  const domain = getTransferDomain(domainKey);
  const exported = domain.exportData(scopeKey);
  const data = domain.scope === 'chat' ? (cloneEnvelope(exported).scopes[scopeKey] ?? {}) : exported;
  return {
    category: domain.category,
    data: klona(data),
    domainKey,
    exportedAt: new Date().toISOString(),
    format: 'sillytavern-phone-content-transfer',
    schemaVersion: domain.schemaVersion,
    scope: domain.scope,
    sourceScopeKey: scopeKey,
    version: 1,
  };
}

export function parseContentTransfer(text: string): ContentTransferPayload {
  const raw = JSON.parse(text) as Partial<ContentTransferPayload>;
  if (raw.format !== 'sillytavern-phone-content-transfer' || raw.version !== 1 || !raw.domainKey) {
    throw new Error('这不是有效的手机内容迁移文件');
  }
  if (!Number.isInteger(raw.schemaVersion) || Number(raw.schemaVersion) < 1) throw new Error('迁移文件缺少版本信息');
  const domain = getTransferDomain(raw.domainKey);
  return {
    ...(raw as ContentTransferPayload),
    category: raw.category ?? domain.category,
    scope: raw.scope ?? domain.scope,
    sourceScopeKey: raw.sourceScopeKey || '',
  };
}

export function summarizeContentTransfer(data: unknown) {
  const record = asRecord(data);
  if (!record) return { collections: 0, items: 0 };
  const arrays = Object.values(record).filter(Array.isArray) as unknown[][];
  const collections = arrays.reduce<number>((sum, list) => sum + list.length, 0);
  const items = arrays.reduce<number>(
    (sum, list) =>
      sum +
      list.reduce<number>((itemSum, item) => {
        const value = asRecord(item);
        if (!value) return itemSum + 1;
        const nestedArrays = Object.values(value).filter(Array.isArray) as unknown[][];
        return (
          itemSum +
          Math.max(
            1,
            nestedArrays.reduce<number>((nested, children) => nested + children.length, 0),
          )
        );
      }, 0),
    0,
  );
  return { collections, items };
}

export async function importContentTransfer(
  payload: ContentTransferPayload,
  mode: ContentTransferMode,
  targetScopeKey = getCurrentChatScopeKey(),
) {
  const domain = getTransferDomain(payload.domainKey);
  if (payload.schemaVersion > domain.schemaVersion) throw new Error('迁移文件来自更高版本，请先升级插件');
  if (payload.scope !== domain.scope) throw new Error('迁移文件的数据范围与当前 App 不一致');
  const beforeRaw = klona(domain.exportData(targetScopeKey));
  let nextRaw: unknown;
  let resultData: unknown;
  if (domain.scope === 'chat') {
    const before = cloneEnvelope(beforeRaw);
    const importEnvelope = { currentScope: targetScopeKey, scopes: { [targetScopeKey]: payload.data } };
    const migrated = domain.migrateImport
      ? domain.migrateImport(importEnvelope, payload.schemaVersion)
      : importEnvelope;
    const incoming = cloneEnvelope(migrated).scopes[targetScopeKey] ?? {};
    const next = cloneEnvelope(before);
    next.currentScope = targetScopeKey;
    next.scopes[targetScopeKey] = mergeScopeData(before.scopes[targetScopeKey], incoming, mode);
    nextRaw = next;
    resultData = next.scopes[targetScopeKey];
  } else {
    const incoming = domain.migrateImport ? domain.migrateImport(payload.data, payload.schemaVersion) : payload.data;
    nextRaw = mergeScopeData(beforeRaw, incoming, mode);
    resultData = nextRaw;
  }
  const validated = parsePrettified(domain.schema, nextRaw);
  try {
    domain.importData(validated);
    domain.rehydrateFromSettings?.();
    await saveSettingsDebounced();
  } catch (error) {
    domain.importData(beforeRaw);
    domain.rehydrateFromSettings?.();
    await saveSettingsDebounced();
    throw error;
  }
  return summarizeContentTransfer(resultData);
}

export function downloadContentTransfer(payload: ContentTransferPayload, label: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${label.replace(/[\\/:*?"<>|]/g, '_') || payload.domainKey}-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
