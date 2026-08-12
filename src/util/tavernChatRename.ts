import { migrateChatFloorBackupRename } from '@/util/chatFloorBackup';
import { migratePhoneChatRename, type TavernChatRenamedEvent } from '@/util/chatScopeRename';
import { getOptionalGlobalFunction } from '@/util/runtime';
// eslint-disable-next-line import-x/no-nodejs-modules
import { characters, getRequestHeaders } from '@sillytavern/script';

interface RenameTavernChatOptions {
  avatar: string;
  characterId: number;
  isCurrent: boolean;
  newName: string;
  oldName: string;
}

interface RenameTavernChatResponse {
  error?: boolean;
  ok?: boolean;
  sanitizedFileName?: string;
}

function normalizeChatName(value: string) {
  return value.trim().replace(/\.jsonl$/i, '');
}

async function updateCurrentCharacterChat(characterId: number, avatar: string, chatName: string) {
  const character = Array.isArray(characters) ? characters[characterId] : undefined;
  if (character && typeof character === 'object') {
    (character as Record<string, unknown>).chat = chatName;
  }

  const response = await fetch('/api/characters/merge-attributes', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ avatar, chat: chatName }),
  });
  if (!response.ok) {
    throw new Error('聊天文件已改名，但更新角色卡当前聊天指针失败。请暂时不要切换聊天并立即刷新档案。');
  }
}

export async function renameTavernCharacterChat(options: RenameTavernChatOptions) {
  const oldName = normalizeChatName(options.oldName);
  const requestedName = normalizeChatName(options.newName);
  if (!oldName || !requestedName) throw new Error('聊天名不能为空');
  if (oldName.localeCompare(requestedName, undefined, { sensitivity: 'accent' }) === 0) {
    throw new Error('新聊天名与原名相同');
  }

  const response = await fetch('/api/chats/rename', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      avatar_url: options.avatar,
      is_group: false,
      original_file: `${oldName}.jsonl`,
      renamed_file: `${requestedName}.jsonl`,
    }),
  });
  const result = (await response.json().catch(() => ({}))) as RenameTavernChatResponse;
  if (!response.ok || result.error) {
    throw new Error('酒馆未能改名：原聊天不存在，或新名称已经被占用');
  }

  const renamedName = normalizeChatName(result.sanitizedFileName || requestedName);
  if (!renamedName) throw new Error('酒馆返回了无效的新聊天名');

  if (options.isCurrent) {
    await updateCurrentCharacterChat(options.characterId, options.avatar, renamedName);
  }

  const event: TavernChatRenamedEvent = {
    avatarId: options.avatar,
    newFileName: `${renamedName}.jsonl`,
    oldFileName: `${oldName}.jsonl`,
  };
  migratePhoneChatRename(event);
  await migrateChatFloorBackupRename(event);

  if (options.isCurrent) {
    const reload = getOptionalGlobalFunction<() => Promise<void>>('reloadCurrentChat');
    await reload?.();
  }
  return renamedName;
}
