// eslint-disable-next-line import-x/no-nodejs-modules
import {
  characters,
  getCharacters,
  getPastCharacterChats,
  getRequestHeaders,
  importCharacterChat,
  name1,
} from '@sillytavern/script';
import {
  normalizeBackupSummary,
  normalizeSettingsSnapshotSummary,
  type ChatBackupSummary,
  type RecoveryCharacter,
  type SettingsSnapshotSummary,
} from '@/apps/recovery/model';

export class RecoveryApiUnavailableError extends Error {
  constructor() {
    super('当前 SillyTavern 版本不支持聊天备份书架');
    this.name = 'RecoveryApiUnavailableError';
  }
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    cache: 'no-cache',
    headers: getRequestHeaders(),
    method: 'POST',
  });
  if (response.status === 404 || response.status === 405) throw new RecoveryApiUnavailableError();
  if (!response.ok) throw new Error(`聊天备份接口请求失败（HTTP ${response.status}）`);
  return response;
}

async function postSettingsJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    cache: 'no-cache',
    headers: getRequestHeaders(),
    method: 'POST',
  });
  if (response.status === 404 || response.status === 405) {
    throw new Error('当前 SillyTavern 版本不支持设置快照管理');
  }
  if (!response.ok) throw new Error(`设置快照接口请求失败（HTTP ${response.status}）`);
  return response;
}

export async function listNativeChatBackups(): Promise<ChatBackupSummary[]> {
  const response = await postJson('/api/backups/chat/get', {});
  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) throw new Error('聊天备份列表响应格式无效');
  return raw.map(normalizeBackupSummary).filter((item): item is ChatBackupSummary => Boolean(item));
}

export async function downloadNativeChatBackup(summary: ChatBackupSummary) {
  if (!summary.fileName.toLowerCase().endsWith('.jsonl')) throw new Error('选择的备份不是 JSONL 文件');
  const response = await postJson('/api/backups/chat/download', { name: summary.fileName });
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) throw new Error('备份下载返回了网页内容，无法作为 JSONL 读取');
  const blob = await response.blob();
  if (!blob.size) throw new Error('下载到的聊天备份为空文件');
  return blob;
}

export async function deleteNativeChatBackup(summary: ChatBackupSummary) {
  if (!/^chat_.+\.jsonl$/i.test(summary.fileName)) throw new Error('选择的文件不是可删除的聊天备份');
  const response = await fetch('/api/backups/chat/delete', {
    body: JSON.stringify({ name: summary.fileName }),
    cache: 'no-cache',
    headers: getRequestHeaders(),
    method: 'POST',
  });
  if (response.status === 405) throw new RecoveryApiUnavailableError();
  if (response.status === 404) throw new Error('这份备份已经不存在，请刷新书架');
  if (!response.ok) throw new Error(`删除聊天备份失败（HTTP ${response.status}）`);
}

export async function listNativeSettingsSnapshots(): Promise<SettingsSnapshotSummary[]> {
  const response = await postSettingsJson('/api/settings/get-snapshots', {});
  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) throw new Error('设置快照列表响应格式无效');
  return raw
    .map(normalizeSettingsSnapshotSummary)
    .filter((item): item is SettingsSnapshotSummary => Boolean(item))
    .sort((a, b) => b.date - a.date || b.name.localeCompare(a.name));
}

export async function loadNativeSettingsSnapshot(name: string) {
  if (!/^settings_.+_\d{8}-\d{6}\.json$/i.test(name)) throw new Error('选择的文件不是设置快照');
  const response = await postSettingsJson('/api/settings/load-snapshot', { name });
  return response.text();
}

export async function makeNativeSettingsSnapshot() {
  await postSettingsJson('/api/settings/make-snapshot', {});
}

export async function restoreNativeSettingsSnapshot(name: string) {
  if (!/^settings_.+_\d{8}-\d{6}\.json$/i.test(name)) throw new Error('选择的文件不是设置快照');
  await postSettingsJson('/api/settings/restore-snapshot', { name });
}

interface DataMaidSettingsBackup {
  hash: string;
  name: string;
  size?: number;
}

export async function requestSettingsCleanupToken() {
  const response = await postSettingsJson('/api/data-maid/report', {});
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== 'object') throw new Error('酒馆清理报告响应格式无效');
  const record = raw as Record<string, unknown>;
  const token = typeof record.token === 'string' ? record.token : '';
  const report = record.report && typeof record.report === 'object' ? (record.report as Record<string, unknown>) : null;
  const settingsBackups = Array.isArray(report?.settingsBackups)
    ? report.settingsBackups.filter((item): item is DataMaidSettingsBackup => {
        if (!item || typeof item !== 'object') return false;
        const entry = item as Record<string, unknown>;
        return typeof entry.name === 'string' && typeof entry.hash === 'string';
      })
    : [];
  if (!token) throw new Error('酒馆没有返回可用的清理令牌');
  return { settingsBackups, token };
}

export async function deleteSettingsSnapshotsByHashes(token: string, hashes: string[]) {
  if (!token || !hashes.length) throw new Error('没有可删除的设置快照');
  await postSettingsJson('/api/data-maid/delete', { hashes, token });
}

export async function finalizeSettingsCleanupToken(token: string) {
  if (!token) return;
  await postSettingsJson('/api/data-maid/finalize', { token });
}

export async function refreshRecoveryCharacters() {
  await getCharacters();
  return characters as unknown[];
}

export async function importNativeCharacterBackup(blob: Blob, summary: ChatBackupSummary, target: RecoveryCharacter) {
  const file = new File([blob], summary.fileName, { type: blob.type || 'application/jsonl' });
  const formData = new FormData();
  formData.set('file_type', 'jsonl');
  formData.set('avatar', file);
  formData.set('avatar_url', target.avatar);
  formData.set('character_name', target.name);
  formData.set('user_name', typeof name1 === 'string' && name1.trim() ? name1 : 'User');
  const imported = await importCharacterChat(formData, { refresh: false });
  const fileName = Array.isArray(imported) ? imported.find(item => typeof item === 'string' && item.trim()) : '';
  if (!fileName) throw new Error('酒馆原生导入没有返回新聊天文件名');
  return fileName;
}

export async function confirmCharacterChatVisible(characterId: number, importedFileName: string) {
  const expected = importedFileName.replace(/\.jsonl$/i, '');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const chats = await getPastCharacterChats(characterId);
    const visible = (Array.isArray(chats) ? chats : []).some(raw => {
      if (!raw || typeof raw !== 'object') return false;
      const record = raw as Record<string, unknown>;
      const fileName = typeof record.file_name === 'string' ? record.file_name : '';
      return fileName.replace(/\.jsonl$/i, '') === expected;
    });
    if (visible) return true;
    await new Promise<void>(resolve => window.setTimeout(resolve, 200));
  }
  return false;
}
