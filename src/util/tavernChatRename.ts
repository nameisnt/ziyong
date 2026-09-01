import { migrateChatFloorBackupRename } from '@/util/chatFloorBackup';
import { migratePhoneChatRename, type TavernChatRenamedEvent } from '@/util/chatScopeRename';
import { getOptionalGlobalFunction } from '@/util/runtime';
import { phoneChatRenameRequestHeader } from '@/util/tavernChatRenameObserver';
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

async function refreshTavernWelcomeScreen() {
  const context = (
    globalThis as typeof globalThis & {
      SillyTavern?: { getContext?: () => { getCurrentChatId?: () => string | undefined } };
    }
  ).SillyTavern?.getContext?.();
  if (!context || context.getCurrentChatId?.() !== undefined) return;

  try {
    const modulePath = '/scripts/welcome-screen.js';
    const welcome = (await import(/* @vite-ignore */ modulePath)) as {
      openWelcomeScreen: (options: { force: boolean }) => Promise<void>;
    };
    await welcome.openWelcomeScreen({ force: true });
  } catch (error) {
    console.warn('[SillyTavern Phone] Failed to refresh recent chats after rename.', error);
  }
}

async function updateCurrentCharacterChat(characterId: number, avatar: string, chatName: string) {
  const response = await fetch('/api/characters/merge-attributes', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ avatar, chat: chatName }),
  });
  if (!response.ok) {
    throw new Error('聊天文件已改名，但更新角色卡当前聊天指针失败。请暂时不要切换聊天并立即刷新档案。');
  }

  const character = Array.isArray(characters) ? characters[characterId] : undefined;
  if (character && typeof character === 'object') {
    (character as Record<string, unknown>).chat = chatName;
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
    headers: {
      ...getRequestHeaders(),
      [phoneChatRenameRequestHeader]: '1',
    },
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

  const event: TavernChatRenamedEvent = {
    avatarId: options.avatar,
    newFileName: `${renamedName}.jsonl`,
    oldFileName: `${oldName}.jsonl`,
  };

  const followUps = [
    {
      label: '插件聊天数据迁移',
      run: () => Promise.resolve().then(() => migratePhoneChatRename(event)),
    },
    {
      label: '聊天楼层备份迁移',
      run: () => migrateChatFloorBackupRename(event),
    },
    ...(options.isCurrent
      ? [
          {
            label: '角色卡当前聊天指针更新',
            run: () => updateCurrentCharacterChat(options.characterId, options.avatar, renamedName),
          },
        ]
      : []),
  ];
  const followUpResults = await Promise.allSettled(followUps.map(item => item.run()));
  const failures = followUpResults.flatMap((result, index) =>
    result.status === 'rejected'
      ? [`${followUps[index].label}：${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
      : [],
  );

  const pointerUpdated = !options.isCurrent || followUpResults.at(-1)?.status === 'fulfilled';
  if (options.isCurrent && pointerUpdated) {
    const reload = getOptionalGlobalFunction<() => Promise<void>>('reloadCurrentChat');
    try {
      await reload?.();
    } catch (error) {
      failures.push(`当前聊天刷新：${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    await refreshTavernWelcomeScreen();
  }
  if (failures.length) {
    throw new Error(`聊天文件已改名为“${renamedName}”，但以下关联操作失败：\n${failures.join('\n')}`);
  }
  return renamedName;
}
