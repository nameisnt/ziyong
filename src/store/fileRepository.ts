import { usePluginPresetStore } from '@/store/pluginPresets';
import type { PluginPresetRecord } from '@/apps/preset-manager/pluginPreset';
import { PhoneBackupSchema, type PhoneBackup } from '@/type/backup';
import { applyPhoneBackup, buildPhoneBackup } from '@/util/backup';
import { parsePrettified } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { getRequestHeaders, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const fileRepositoryField = 'sillytavern_phone_file_repository';

export interface FileRepositorySnapshot {
  checksum: string;
  createdAt: string;
  id: string;
  path: string;
  protected: boolean;
  reason: string;
  size: number;
}

interface FileRepositorySettings {
  autoEnabled: boolean;
  manifestPath: string;
  retention: number;
  snapshots: FileRepositorySnapshot[];
  version: 1;
}

interface FileRepositorySnapshotPayload {
  backup: PhoneBackup;
  checksum: string;
  createdAt: string;
  pluginPresets: PluginPresetRecord[];
  reason: string;
  repositorySchemaVersion: 1;
}

const DEFAULT_MANIFEST_PATH = 'user/files/phone-file-repository-manifest.json';
const AUTO_INTERVAL_MS = 2 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePath(path: string) {
  return String(path || '').replace(/^\/+/, '');
}

function normalizeSnapshot(value: unknown): FileRepositorySnapshot | null {
  if (!isRecord(value)) return null;
  const id = String(value.id || '').trim();
  const path = normalizePath(String(value.path || ''));
  if (!id || !path) return null;
  return {
    checksum: String(value.checksum || ''),
    createdAt: String(value.createdAt || new Date(0).toISOString()),
    id,
    path,
    protected: value.protected === true,
    reason: String(value.reason || '自动快照'),
    size: Math.max(0, Number(value.size) || 0),
  };
}

function normalizeSettings(value: unknown): FileRepositorySettings {
  const raw = isRecord(value) ? value : {};
  return {
    autoEnabled: raw.autoEnabled !== false,
    manifestPath: normalizePath(String(raw.manifestPath || DEFAULT_MANIFEST_PATH)),
    retention: Math.min(50, Math.max(3, Math.round(Number(raw.retention) || 10))),
    snapshots: Array.isArray(raw.snapshots) ? raw.snapshots.map(normalizeSnapshot).filter(Boolean) : [],
    version: 1,
  } as FileRepositorySettings;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function uploadJson(name: string, value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ data: bytesToBase64(bytes), name }),
  });
  if (!response.ok) throw new Error(`文件仓库写入失败：HTTP ${response.status}`);
  const result = await response.json();
  return { path: normalizePath(String(result.path || `user/files/${name}`)), size: bytes.byteLength };
}

async function deleteFile(path: string) {
  if (!path) return;
  const response = await fetch('/api/files/delete', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ path: normalizePath(path) }),
  });
  if (!response.ok && response.status !== 404) throw new Error(`仓库文件删除失败：HTTP ${response.status}`);
}

async function readJson(path: string) {
  const response = await fetch(`/${normalizePath(path)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`仓库文件读取失败：HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function checksumText(value: string) {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function snapshotId() {
  return `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizePayload(value: unknown): FileRepositorySnapshotPayload {
  if (!isRecord(value) || value.repositorySchemaVersion !== 1) throw new Error('不是受支持的插件文件仓库快照');
  const backup = parsePrettified(PhoneBackupSchema, value.backup);
  const pluginPresets = Array.isArray(value.pluginPresets)
    ? value.pluginPresets.filter(isRecord).map(record => structuredClone(record) as unknown as PluginPresetRecord)
    : [];
  return {
    backup,
    checksum: String(value.checksum || ''),
    createdAt: String(value.createdAt || backup.exportedAt),
    pluginPresets,
    reason: String(value.reason || '导入快照'),
    repositorySchemaVersion: 1,
  };
}

export const useFileRepositoryStore = defineStore('fileRepository', () => {
  const settings = ref(normalizeSettings(_.get(extension_settings, fileRepositoryField, {})));
  const busy = ref(false);
  const initialized = ref(false);
  const lastError = ref('');
  let intervalId: ReturnType<typeof window.setInterval> | null = null;
  let initialTimer: ReturnType<typeof window.setTimeout> | null = null;

  const snapshots = computed(() =>
    [...settings.value.snapshots].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  );

  function persistIndex() {
    _.set(extension_settings, fileRepositoryField, structuredClone(settings.value));
    void saveSettingsDebounced();
  }

  async function saveManifest() {
    const manifest = {
      autoEnabled: settings.value.autoEnabled,
      retention: settings.value.retention,
      snapshots: settings.value.snapshots,
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    const uploaded = await uploadJson('phone-file-repository-manifest.json', manifest);
    settings.value.manifestPath = uploaded.path;
    persistIndex();
  }

  async function initialize(force = false) {
    if (initialized.value && !force) return;
    initialized.value = true;
    if (settings.value.snapshots.length && !force) return;
    try {
      const raw = await readJson(settings.value.manifestPath || DEFAULT_MANIFEST_PATH);
      const manifest = normalizeSettings(raw);
      settings.value = { ...settings.value, ...manifest, manifestPath: settings.value.manifestPath || DEFAULT_MANIFEST_PATH };
      persistIndex();
    } catch (error) {
      // First use and a missing manifest are both normal; the first snapshot creates it.
      if (force) {
        lastError.value = error instanceof Error ? error.message : String(error);
        throw error;
      }
    }
  }

  async function pruneSnapshots() {
    const unprotected = [...settings.value.snapshots]
      .filter(snapshot => !snapshot.protected)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const removable = unprotected.slice(settings.value.retention);
    if (!removable.length) return;
    const ids = new Set(removable.map(snapshot => snapshot.id));
    settings.value.snapshots = settings.value.snapshots.filter(snapshot => !ids.has(snapshot.id));
    await saveManifest();
    await Promise.allSettled(removable.map(snapshot => deleteFile(snapshot.path)));
  }

  async function createSnapshot(reason = '手动快照', force = true) {
    if (busy.value) return null;
    busy.value = true;
    lastError.value = '';
    try {
      await initialize();
      const presetStore = usePluginPresetStore();
      await presetStore.whenReady();
      const backup = buildPhoneBackup();
      const pluginPresets = presetStore.exportRecords();
      const checksum = await checksumText(JSON.stringify({ data: backup.data, pluginPresets }));
      const latest = snapshots.value[0];
      if (!force && latest?.checksum === checksum) return latest;

      const id = snapshotId();
      const createdAt = new Date().toISOString();
      const payload: FileRepositorySnapshotPayload = {
        backup,
        checksum,
        createdAt,
        pluginPresets,
        reason,
        repositorySchemaVersion: 1,
      };
      const uploaded = await uploadJson(`phone-repository-${id}.json`, payload);
      const snapshot: FileRepositorySnapshot = {
        checksum,
        createdAt,
        id,
        path: uploaded.path,
        protected: false,
        reason,
        size: uploaded.size,
      };
      settings.value.snapshots.push(snapshot);
      await saveManifest();
      await pruneSnapshots();
      return snapshot;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      busy.value = false;
    }
  }

  async function readSnapshot(id: string) {
    const snapshot = settings.value.snapshots.find(item => item.id === id);
    if (!snapshot) throw new Error('快照记录已经不存在');
    return normalizePayload(await readJson(snapshot.path));
  }

  async function restoreSnapshot(id: string) {
    if (busy.value) return;
    busy.value = true;
    lastError.value = '';
    const presets = usePluginPresetStore();
    const previousPresets = presets.exportRecords();
    try {
      const payload = await readSnapshot(id);
      await presets.replaceRecords(payload.pluginPresets);
      try {
        await applyPhoneBackup(payload.backup);
      } catch (error) {
        await presets.replaceRecords(previousPresets);
        throw error;
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      busy.value = false;
    }
  }

  async function removeSnapshot(id: string) {
    const snapshot = settings.value.snapshots.find(item => item.id === id);
    if (!snapshot) return;
    if (snapshot.protected) throw new Error('受保护快照不能删除，请先取消保护');
    settings.value.snapshots = settings.value.snapshots.filter(item => item.id !== id);
    await saveManifest();
    await deleteFile(snapshot.path);
  }

  async function setProtected(id: string, value: boolean) {
    const snapshot = settings.value.snapshots.find(item => item.id === id);
    if (!snapshot) return;
    snapshot.protected = value;
    await saveManifest();
  }

  async function setAutoEnabled(value: boolean) {
    settings.value.autoEnabled = value;
    await saveManifest();
  }

  async function setRetention(value: number) {
    settings.value.retention = Math.min(50, Math.max(3, Math.round(value || 10)));
    await saveManifest();
    await pruneSnapshots();
  }

  async function exportSnapshot(id: string) {
    const payload = await readSnapshot(id);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `phone-repository-${payload.createdAt.replace(/[:.]/gu, '-')}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function importSnapshot(file: File) {
    const payload = normalizePayload(JSON.parse((await file.text()).replace(/^\uFEFF/u, '')));
    const checksum = payload.checksum || (await checksumText(JSON.stringify({ data: payload.backup.data, pluginPresets: payload.pluginPresets })));
    const id = snapshotId();
    const uploaded = await uploadJson(`phone-repository-${id}.json`, { ...payload, checksum });
    const snapshot: FileRepositorySnapshot = {
      checksum,
      createdAt: payload.createdAt,
      id,
      path: uploaded.path,
      protected: true,
      reason: '导入快照',
      size: uploaded.size,
    };
    settings.value.snapshots.push(snapshot);
    await saveManifest();
    return snapshot;
  }

  function startAutoSnapshots() {
    if (intervalId !== null) return;
    void initialize();
    initialTimer = window.setTimeout(() => {
      if (settings.value.autoEnabled) void createSnapshot('自动快照', false).catch(() => undefined);
    }, 15000);
    intervalId = window.setInterval(() => {
      if (!settings.value.autoEnabled || document.visibilityState === 'hidden') return;
      void createSnapshot('自动快照', false).catch(() => undefined);
    }, AUTO_INTERVAL_MS);
  }

  function stopAutoSnapshots() {
    if (initialTimer !== null) window.clearTimeout(initialTimer);
    if (intervalId !== null) window.clearInterval(intervalId);
    initialTimer = null;
    intervalId = null;
  }

  return {
    busy,
    createSnapshot,
    exportSnapshot,
    importSnapshot,
    initialize,
    lastError,
    readSnapshot,
    removeSnapshot,
    restoreSnapshot,
    setAutoEnabled,
    setProtected,
    setRetention,
    settings,
    snapshots,
    startAutoSnapshots,
    stopAutoSnapshots,
  };
});
