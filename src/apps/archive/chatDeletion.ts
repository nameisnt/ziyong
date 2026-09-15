import type { ArchiveChatRow, ArchiveOwner } from './useChatArchiveCatalogSession';
import { getRegisteredPhoneBackupDomains } from '@/core/appRegistry';
import {
  areChatScopeKeysEquivalent,
  buildChatScopeKey,
  getCurrentChatScopeKey,
  flushChatScopedDomains,
  reloadChatScopedDomains,
} from '@/store/chatScoped';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { deleteChatFloorBackup } from '@/util/chatFloorBackup';
import { normalizeChatArchiveId } from '@/util/chatArchive';
// eslint-disable-next-line import-x/no-nodejs-modules
import { characters, getPastCharacterChats, saveSettingsDebounced } from '@sillytavern/script';

export interface DeleteChatOptions {
  content: boolean;
  backup: boolean;
}
export interface DeleteChatResult {
  title: string;
  deleted: boolean;
  error: string;
}

type NativeChats = {
  isGenerating: () => boolean;
  deleteCharacterChatByName: (id: string, name: string) => Promise<void>;
  replaceCurrentChat: () => Promise<void>;
};
export type ArchiveGroup = { id: string; name: string; chats: string[]; chat_id: string };
type NativeGroups = {
  groups: ArchiveGroup[];
  getGroups: () => Promise<void>;
  deleteGroupChatByName: (id: string, name: string) => Promise<void>;
  deleteGroupChat: (id: string, name: string) => Promise<void>;
};
export async function nativeGroups(): Promise<NativeGroups> {
  const path = '/scripts/group-chats.js';
  return import(/* @vite-ignore */ path);
}
async function nativeChats(): Promise<NativeChats> {
  const path = '/script.js';
  return import(/* @vite-ignore */ path);
}
export async function nativeChatIsGenerating() {
  return (await nativeChats()).isGenerating();
}

export async function listOwnedChats(owner: ArchiveOwner) {
  if (owner.kind === 'group') {
    const groups = await nativeGroups();
    await groups.getGroups();
    return groups.groups.find(group => String(group.id) === owner.ownerId)?.chats ?? [];
  }
  const id = characters.findIndex(character => (character as { avatar?: string }).avatar === owner.avatar);
  if (id < 0) throw new Error('角色卡已不存在，无法核对聊天文件');
  const rows = await getPastCharacterChats(id);
  return (rows ?? [])
    .map(row => normalizeChatArchiveId(String((row as { file_name?: string }).file_name ?? '')))
    .filter(Boolean);
}

export function stripChatScopes(raw: unknown, keys: Set<string>) {
  if (!raw || typeof raw !== 'object' || !('__chatScoped' in raw) || !('scopes' in raw)) {
    throw new Error('聊天数据域不是作用域格式，停止清理');
  }
  const envelope = klona(raw) as {
    __chatScoped: true;
    scopes: Record<string, unknown>;
    legacyScopeMigrations?: Record<string, string>;
  };
  for (const key of keys) delete envelope.scopes[key];
  for (const [key, target] of Object.entries(envelope.legacyScopeMigrations ?? {})) {
    if (keys.has(key) || keys.has(target)) delete envelope.legacyScopeMigrations![key];
  }
  return envelope;
}

function cleanupContent(owner: ArchiveOwner, chat: ArchiveChatRow) {
  flushChatScopedDomains();
  const keys = new Set([...owner.aliases].map(alias => buildChatScopeKey(owner.kind, alias, chat.key)));
  keys.add(chat.scopeKey);
  const plans = getRegisteredPhoneBackupDomains()
    .filter(domain => domain.scope === 'chat')
    .map(domain => ({
      domain,
      value: domain.schema.parse(stripChatScopes(domain.exportData(getCurrentChatScopeKey()), keys)),
    }));
  plans.forEach(({ domain, value }) => domain.importData(value));
  reloadChatScopedDomains();
  useGenerationTaskStore().rehydrateFromSettings();
  void saveSettingsDebounced();
}

export async function deleteArchivedChat(
  owner: ArchiveOwner,
  chat: ArchiveChatRow,
  options: DeleteChatOptions,
): Promise<DeleteChatResult> {
  const result = { title: chat.title, deleted: false, error: '' };
  try {
    const native = await nativeChats();
    const current = areChatScopeKeysEquivalent(chat.scopeKey, getCurrentChatScopeKey());
    if (current && (native.isGenerating() || useGenerationTaskStore().activeTasks.length)) {
      throw new Error('当前聊天正在生成，不能删除');
    }
    if (!(await listOwnedChats(owner)).includes(chat.key)) throw new Error('聊天文件已不存在或已改名，请刷新');
    if (owner.kind === 'group') {
      const groups = await nativeGroups();
      if (current) await groups.deleteGroupChat(owner.ownerId, chat.key);
      else await groups.deleteGroupChatByName(owner.ownerId, chat.key);
    } else {
      const id = characters.findIndex(character => (character as { avatar?: string }).avatar === owner.avatar);
      await native.deleteCharacterChatByName(String(id), chat.key);
      if (!(await listOwnedChats(owner)).includes(chat.key)) {
        result.deleted = true;
        if (current) await native.replaceCurrentChat();
      }
    }
    if ((await listOwnedChats(owner)).includes(chat.key)) throw new Error('酒馆未删除聊天，已停止清理');
    result.deleted = true;
    const errors: string[] = [];
    if (options.content) {
      try {
        cleanupContent(owner, chat);
      } catch (error) {
        errors.push(`插件内容清理失败：${String(error)}`);
      }
    }
    if (options.backup && chat.floorBackup) {
      try {
        await deleteChatFloorBackup(chat.floorBackup.key);
      } catch (error) {
        errors.push(`楼层备份清理失败：${String(error)}`);
      }
    }
    result.error = errors.join('；');
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  return result;
}
