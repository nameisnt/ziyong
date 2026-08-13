import {
  deletePluginPresetPrompt,
  duplicatePluginPresetPrompt,
  exportPluginPreset,
  normalizePluginPresetImport,
  patchPluginPresetPrompt,
  readPluginPreset,
  reorderPluginPresetPrompts,
  type PluginPresetRecord,
} from '@/apps/preset-manager/pluginPreset';
import type { TavernPresetPrompt, TavernPresetPromptCopyInput } from '@/apps/preset-manager/api';
import {
  BUILTIN_DIARY_PRESET_ID,
  createBuiltinDiaryPresetRecord,
} from '@/apps/preset-manager/builtinDiaryPreset';
// eslint-disable-next-line import-x/no-nodejs-modules
import { getRequestHeaders, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { klona } from 'klona';

export const pluginPresetField = 'sillytavern_phone_plugin_presets';

type StoredPluginPresetIndex = Omit<PluginPresetRecord, 'raw'> & {
  path: string;
  raw?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFilePath(path: string) {
  return String(path || '').replace(/^\/+/, '');
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function uploadRecordFile(record: PluginPresetRecord) {
  const revision = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const fileName = `phone-plugin-preset-${record.id}-${revision}.json`;
  const bytes = new TextEncoder().encode(JSON.stringify(record));
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ name: fileName, data: bytesToBase64(bytes) }),
  });
  if (!response.ok) throw new Error(`插件预设保存失败：HTTP ${response.status}`);
  const result = await response.json();
  return normalizeFilePath(result.path || `user/files/${fileName}`);
}

async function readRecordFile(path: string) {
  const response = await fetch(`/${normalizeFilePath(path)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`插件预设文件读取失败：HTTP ${response.status}`);
  const value = await response.json();
  if (!isRecord(value) || !isRecord(value.raw)) throw new Error('插件预设文件内容无效');
  return value as unknown as PluginPresetRecord;
}

async function deleteRecordFile(path: string) {
  if (!path) return;
  const response = await fetch('/api/files/delete', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ path: normalizeFilePath(path) }),
  });
  if (!response.ok && response.status !== 404) throw new Error(`插件预设文件删除失败：HTTP ${response.status}`);
}

function readStoredIndex(): StoredPluginPresetIndex[] {
  const raw = _.get(extension_settings, pluginPresetField, {});
  const items = isRecord(raw) && Array.isArray(raw.items) ? raw.items : [];
  return items.filter(isRecord).flatMap(item => {
    const id = String(item.id || '').trim();
    if (!id) return [];
    return [{
      builtIn: item.builtIn === true || id === BUILTIN_DIARY_PRESET_ID,
      createdAt: String(item.createdAt || new Date().toISOString()),
      id,
      name: String(item.name || '插件预设'),
      path: normalizeFilePath(String(item.path || '')),
      raw: isRecord(item.raw) ? klona(item.raw) : undefined,
      sourceFileName: String(item.sourceFileName || ''),
      sourceFormat: item.sourceFormat === 'legacy' ? 'legacy' as const : 'modern' as const,
      sourceRoot: item.sourceRoot === 'array' ? 'array' as const : 'object' as const,
      updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
    }];
  });
}

function createId() {
  return `plugin_preset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const usePluginPresetStore = defineStore('pluginPresets', () => {
  const items = ref<PluginPresetRecord[]>([createBuiltinDiaryPresetRecord()]);
  const paths = ref<Record<string, string>>({});
  const loading = ref(false);
  const loadError = ref('');

  function persistIndex() {
    const stored = items.value.map(item => ({
      builtIn: item.builtIn === true,
      createdAt: item.createdAt,
      id: item.id,
      name: item.name,
      path: paths.value[item.id] || '',
      sourceFileName: item.sourceFileName,
      sourceFormat: item.sourceFormat,
      sourceRoot: item.sourceRoot,
      updatedAt: item.updatedAt,
    }));
    _.set(extension_settings, pluginPresetField, { items: stored, version: 2 });
    void saveSettingsDebounced();
  }

  async function saveRecord(record: PluginPresetRecord) {
    const oldPath = paths.value[record.id] || '';
    const nextPath = await uploadRecordFile(record);
    paths.value[record.id] = nextPath;
    if (oldPath && oldPath !== nextPath) void deleteRecordFile(oldPath).catch(() => undefined);
    persistIndex();
  }

  function getById(id: string) {
    return items.value.find(item => item.id === id) ?? null;
  }

  function requireById(id: string) {
    const item = getById(id);
    if (!item) throw new Error('所选插件预设尚未载入或已经不存在');
    return item;
  }

  function uniqueName(requested: string, exceptId = '') {
    const base = requested.trim() || '插件预设';
    const names = new Set(items.value.filter(item => item.id !== exceptId).map(item => item.name));
    if (!names.has(base)) return base;
    let index = 2;
    while (names.has(`${base} ${index}`)) index += 1;
    return `${base} ${index}`;
  }

  async function importPreset(value: unknown, fileName = '') {
    const normalized = normalizePluginPresetImport(value);
    const baseName = fileName.replace(/\.json$/iu, '').trim() || '插件预设';
    const now = new Date().toISOString();
    const item: PluginPresetRecord = {
      createdAt: now,
      id: createId(),
      name: uniqueName(baseName),
      raw: normalized.raw,
      sourceFileName: fileName,
      sourceFormat: normalized.sourceFormat,
      sourceRoot: normalized.sourceRoot,
      updatedAt: now,
    };
    paths.value[item.id] = await uploadRecordFile(item);
    items.value.push(item);
    persistIndex();
    return item;
  }

  async function mutateRecord<T>(id: string, mutate: (record: PluginPresetRecord) => T) {
    const item = requireById(id);
    const backup = klona(item);
    try {
      const result = mutate(item);
      await saveRecord(item);
      return result;
    } catch (error) {
      Object.assign(item, backup);
      throw error;
    }
  }

  async function renamePreset(id: string, name: string) {
    const savedName = uniqueName(name, id);
    await mutateRecord(id, item => {
      item.name = savedName;
      item.updatedAt = new Date().toISOString();
    });
    return savedName;
  }

  async function deletePreset(id: string) {
    if (id === BUILTIN_DIARY_PRESET_ID) throw new Error('内置日记预设不能删除，可以编辑、改名或导出');
    const index = items.value.findIndex(item => item.id === id);
    if (index < 0) throw new Error('插件预设已经不存在');
    await deleteRecordFile(paths.value[id] || '');
    items.value.splice(index, 1);
    delete paths.value[id];
    persistIndex();
  }

  function exportRecords() {
    return klona(items.value);
  }

  async function replaceRecords(records: PluginPresetRecord[]) {
    const normalized: PluginPresetRecord[] = records.map(record => {
      const raw = klona(record.raw);
      const parsed = normalizePluginPresetImport(raw);
      return {
        builtIn: record.id === BUILTIN_DIARY_PRESET_ID,
        createdAt: String(record.createdAt || new Date().toISOString()),
        id: String(record.id || '').trim(),
        name: String(record.name || '插件预设').trim() || '插件预设',
        raw: parsed.raw,
        sourceFileName: String(record.sourceFileName || ''),
        sourceFormat: parsed.sourceFormat,
        sourceRoot: record.sourceRoot === 'array' ? 'array' : parsed.sourceRoot,
        updatedAt: String(record.updatedAt || record.createdAt || new Date().toISOString()),
      } satisfies PluginPresetRecord;
    });
    if (!normalized.some(record => record.id === BUILTIN_DIARY_PRESET_ID)) {
      normalized.unshift(createBuiltinDiaryPresetRecord());
    }
    if (normalized.some(record => !record.id) || new Set(normalized.map(record => record.id)).size !== normalized.length) {
      throw new Error('私有预设备份包含空 ID 或重复 ID');
    }

    const nextPaths: Record<string, string> = {};
    try {
      for (const record of normalized) nextPaths[record.id] = await uploadRecordFile(record);
    } catch (error) {
      await Promise.allSettled(Object.values(nextPaths).map(path => deleteRecordFile(path)));
      throw error;
    }

    const oldPaths = { ...paths.value };
    items.value = normalized;
    paths.value = nextPaths;
    persistIndex();
    await saveSettingsDebounced();
    await Promise.allSettled(Object.values(oldPaths).map(path => deleteRecordFile(path)));
  }

  async function updatePrompt(
    id: string,
    promptId: string,
    patch: Partial<Pick<TavernPresetPrompt, 'content' | 'enabled' | 'name' | 'role'>>,
  ) {
    await mutateRecord(id, item => patchPluginPresetPrompt(item, promptId, patch));
    return readPluginPreset(requireById(id));
  }

  async function reorderPrompts(id: string, promptIds: string[]) {
    await mutateRecord(id, item => reorderPluginPresetPrompts(item, promptIds));
    return readPluginPreset(requireById(id));
  }

  async function removePrompt(id: string, promptId: string) {
    await mutateRecord(id, item => deletePluginPresetPrompt(item, promptId));
    return readPluginPreset(requireById(id));
  }

  async function duplicatePrompt(id: string, promptId: string, input: TavernPresetPromptCopyInput) {
    const copiedPromptId = await mutateRecord(id, item => duplicatePluginPresetPrompt(item, promptId, input));
    return { copiedPromptId, preset: readPluginPreset(requireById(id)) };
  }

  async function reload() {
    loading.value = true;
    loadError.value = '';
    try {
      const stored = readStoredIndex();
      const loaded: PluginPresetRecord[] = [];
      const loadedPaths: Record<string, string> = {};
      const errors: string[] = [];
      for (const entry of stored) {
        try {
          let record: PluginPresetRecord;
          if (entry.raw) {
            record = {
              builtIn: entry.builtIn === true || entry.id === BUILTIN_DIARY_PRESET_ID,
              createdAt: entry.createdAt,
              id: entry.id,
              name: entry.name,
              raw: entry.raw,
              sourceFileName: entry.sourceFileName,
              sourceFormat: entry.sourceFormat,
              sourceRoot: entry.sourceRoot,
              updatedAt: entry.updatedAt,
            };
            loadedPaths[entry.id] = await uploadRecordFile(record);
          } else {
            record = await readRecordFile(entry.path);
            record.builtIn = entry.builtIn === true || entry.id === BUILTIN_DIARY_PRESET_ID;
            loadedPaths[entry.id] = entry.path;
          }
          loaded.push(record);
        } catch (error) {
          errors.push(`${entry.name}：${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (!loaded.some(record => record.id === BUILTIN_DIARY_PRESET_ID)) {
        const builtin = createBuiltinDiaryPresetRecord();
        loaded.unshift(builtin);
        if (!errors.length) {
          try {
            loadedPaths[builtin.id] = await uploadRecordFile(builtin);
          } catch (error) {
            errors.push(`日记（内置）：${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      items.value = loaded;
      paths.value = loadedPaths;
      if (errors.length) loadError.value = errors.join('\n');
      else persistIndex();
    } finally {
      loading.value = false;
    }
  }

  const initialLoad = reload();

  return {
    deletePreset,
    duplicatePrompt,
    exportRecords,
    exportPreset: (id: string) => exportPluginPreset(requireById(id)),
    getById,
    importPreset,
    items,
    loadError,
    loading,
    readPreset: (id: string) => readPluginPreset(requireById(id)),
    reload,
    replaceRecords,
    removePrompt,
    renamePreset,
    reorderPrompts,
    updatePrompt,
    whenReady: () => initialLoad,
  };
});
