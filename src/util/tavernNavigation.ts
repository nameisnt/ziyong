import { getOptionalGlobalFunction, getOptionalGlobalValue } from '@/util/runtime';

const CHAT_SWITCH_TIMEOUT_MS = 12_000;
const CHAT_SWITCH_POLL_MS = 80;

function getTavernWindow() {
  try {
    return window.parent && window.parent !== window ? window.parent : window;
  } catch {
    return window;
  }
}

function getTavernContext(tavernWindow = getTavernWindow()) {
  const record = tavernWindow as Window & Record<string, unknown>;
  const sillyTavern = record.SillyTavern;
  if (sillyTavern && typeof sillyTavern === 'object') {
    const getContext = (sillyTavern as Record<string, unknown>).getContext;
    if (typeof getContext === 'function') {
      try {
        const context = getContext();
        if (context && typeof context === 'object') return context as Record<string, unknown>;
      } catch {
        // fall through
      }
    }
  }
  return null;
}

function getTavernCharacters(tavernWindow = getTavernWindow()) {
  const record = tavernWindow as Window & Record<string, unknown>;
  if (Array.isArray(record.characters)) return record.characters;
  const context = getTavernContext(tavernWindow);
  return Array.isArray(context?.characters) ? context.characters : [];
}

function getCharacterAvatar(character: unknown) {
  if (!character || typeof character !== 'object') return '';
  const record = character as Record<string, unknown>;
  return typeof record.avatar === 'string' ? record.avatar : '';
}

function resolveCharacterIndex(input: { avatar?: string; characterId?: number | null; ownerName?: string }) {
  const characters = getTavernCharacters();
  if (input.avatar) {
    const byAvatar = characters.findIndex(character => getCharacterAvatar(character) === input.avatar);
    if (byAvatar >= 0) return byAvatar;
  }
  if (typeof input.characterId === 'number' && input.characterId >= 0) return input.characterId;
  if (input.ownerName) {
    const byName = characters.findIndex(character => {
      if (!character || typeof character !== 'object') return false;
      const name = (character as Record<string, unknown>).name;
      return typeof name === 'string' && name === input.ownerName;
    });
    if (byName >= 0) return byName;
  }
  return -1;
}

function normalizeChatFileName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\.jsonl$/i, '') : '';
}

function getCurrentCharacterId(tavernWindow = getTavernWindow()) {
  const record = tavernWindow as Window & Record<string, unknown>;
  const context = getTavernContext(tavernWindow);
  return record.this_chid ?? context?.characterId ?? getOptionalGlobalValue('this_chid');
}

function getCurrentChatId(tavernWindow = getTavernWindow()) {
  const record = tavernWindow as Window & Record<string, unknown>;
  const context = getTavernContext(tavernWindow);
  const candidates: Array<{ receiver: Record<string, unknown> | null; value: unknown }> = [
    { receiver: context, value: context?.getCurrentChatId },
    { receiver: record, value: record.getCurrentChatId },
  ];
  for (const candidate of candidates) {
    if (typeof candidate.value !== 'function') continue;
    try {
      return normalizeChatFileName(candidate.value.call(candidate.receiver));
    } catch {
      // Continue with the exposed state fields.
    }
  }
  return normalizeChatFileName(context?.chatId ?? record.chatId ?? getOptionalGlobalValue('chatId'));
}

function getCurrentGroupId(tavernWindow = getTavernWindow()) {
  const record = tavernWindow as Window & Record<string, unknown>;
  const context = getTavernContext(tavernWindow);
  return context?.groupId ?? record.selected_group ?? getOptionalGlobalValue('selected_group');
}

async function waitForTavernState(predicate: () => boolean, failureMessage: string) {
  const deadline = Date.now() + CHAT_SWITCH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>(resolve => window.setTimeout(resolve, CHAT_SWITCH_POLL_MS));
  }
  throw new Error(failureMessage);
}

async function selectTavernCharacter(targetId: number) {
  const tavernWindow = getTavernWindow();
  const record = tavernWindow as Window & Record<string, unknown>;
  const context = getTavernContext(tavernWindow);
  if (String(getCurrentCharacterId(tavernWindow)) === String(targetId)) return;

  const selectCharacterById = context?.selectCharacterById;
  if (typeof selectCharacterById === 'function') {
    await selectCharacterById.call(context, targetId);
  } else {
    const runtimeSelectCharacterById = record.selectCharacterById ?? getOptionalGlobalFunction('selectCharacterById');
    if (typeof runtimeSelectCharacterById === 'function') {
      await runtimeSelectCharacterById.call(record, targetId);
    } else {
      const characterEl = tavernWindow.document.getElementById(`CharID${targetId}`);
      if (characterEl instanceof HTMLElement) {
        characterEl.click();
      } else {
        const loadCharacter = record.loadCharacter ?? getOptionalGlobalFunction('loadCharacter');
        if (typeof loadCharacter !== 'function') throw new Error('无法调用酒馆角色切换接口');
        await loadCharacter.call(record, targetId);
      }
    }
  }

  await waitForTavernState(
    () => String(getCurrentCharacterId(tavernWindow)) === String(targetId),
    '酒馆角色切换超时，已停止打开目标聊天',
  );
}

async function openTavernCharacterChat(chatFile: string) {
  const tavernWindow = getTavernWindow();
  const record = tavernWindow as Window & Record<string, unknown>;
  const context = getTavernContext(tavernWindow);
  const openCharacterChat =
    context?.openCharacterChat ?? record.openCharacterChat ?? getOptionalGlobalFunction('openCharacterChat');
  if (typeof openCharacterChat !== 'function') throw new Error('无法调用酒馆原生聊天打开接口');

  const normalizedChatFile = normalizeChatFileName(chatFile);
  await openCharacterChat.call(context ?? record, normalizedChatFile);
  await waitForTavernState(
    () => getCurrentChatId(tavernWindow) === normalizedChatFile,
    '酒馆未确认目标聊天已打开，请检查聊天文件是否仍然存在',
  );
}

async function openTavernGroupChat(groupId: string, chatFile: string) {
  const tavernWindow = getTavernWindow();
  const record = tavernWindow as Window & Record<string, unknown>;
  const context = getTavernContext(tavernWindow);
  const openGroupChat = context?.openGroupChat ?? record.openGroupChat ?? getOptionalGlobalFunction('openGroupChat');
  if (typeof openGroupChat !== 'function') throw new Error('无法调用酒馆原生群聊打开接口');
  const groups = Array.isArray(context?.groups) ? context.groups : Array.isArray(record.groups) ? record.groups : [];
  const group = groups.find(item => {
    if (!item || typeof item !== 'object') return false;
    return String((item as Record<string, unknown>).id) === groupId;
  }) as Record<string, unknown> | undefined;
  if (!group) throw new Error('酒馆中已经找不到这个群组');

  const normalizedChatFile = normalizeChatFileName(chatFile);
  await openGroupChat.call(context ?? record, group.id, normalizedChatFile);
  await waitForTavernState(
    () => String(getCurrentGroupId(tavernWindow)) === groupId && getCurrentChatId(tavernWindow) === normalizedChatFile,
    '酒馆未确认目标群聊已打开，请检查群组和聊天文件是否仍然存在',
  );
}

export async function jumpToTavernChat(input: {
  avatar?: string;
  chatFile: string;
  characterId?: number | null;
  groupId?: string;
  kind?: 'char' | 'group';
  ownerName?: string;
}) {
  if (!input.chatFile || input.chatFile === '__no_chat__') {
    throw new Error('旧数据没有对应的酒馆聊天文件，无法直接跳转');
  }

  if (input.kind === 'group') {
    const groupId = input.groupId?.trim();
    if (!groupId) throw new Error('旧群聊数据缺少群组标识，无法直接跳转');
    await openTavernGroupChat(groupId, input.chatFile);
    return;
  }

  const targetId = resolveCharacterIndex(input);
  if (targetId < 0) {
    throw new Error('无法在酒馆角色列表中找到这个角色卡');
  }

  await selectTavernCharacter(targetId);
  await openTavernCharacterChat(input.chatFile);
}
