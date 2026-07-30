import { getOptionalGlobalFunction, getOptionalGlobalValue } from '@/util/runtime';

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

async function selectTavernCharacter(targetId: number) {
  const tavernWindow = getTavernWindow();
  const record = tavernWindow as Window & Record<string, unknown>;
  const context = getTavernContext(tavernWindow);
  const currentId = record.this_chid ?? context?.characterId ?? getOptionalGlobalValue('this_chid');
  if (String(currentId) === String(targetId)) return true;

  const characterEl = tavernWindow.document.getElementById(`CharID${targetId}`);
  if (characterEl instanceof HTMLElement) {
    characterEl.click();
    return false;
  }

  const selectCharacterById = context?.selectCharacterById;
  if (typeof selectCharacterById === 'function') {
    await selectCharacterById(String(targetId));
    return false;
  }

  const loadCharacter = record.loadCharacter ?? getOptionalGlobalFunction('loadCharacter');
  if (typeof loadCharacter === 'function') {
    await loadCharacter(targetId);
    return false;
  }

  throw new Error('无法调用酒馆角色切换接口');
}

function triggerTavernChatLoad(chatFile: string) {
  const tavernWindow = getTavernWindow();
  const record = tavernWindow as Window & Record<string, unknown>;
  const button = tavernWindow.document.createElement('div');
  button.className = 'select_chat_block';
  button.setAttribute('file_name', chatFile);
  button.style.display = 'none';
  tavernWindow.document.body.appendChild(button);

  const jquery = record.jQuery;
  if (typeof jquery === 'function') {
    const wrapped = jquery(button) as unknown;
    if (wrapped && typeof wrapped === 'object' && typeof (wrapped as Record<string, unknown>).trigger === 'function') {
      ((wrapped as Record<string, unknown>).trigger as (eventName: string) => void)('click');
    } else {
      button.click();
    }
  } else {
    button.click();
  }

  window.setTimeout(() => button.remove(), 1000);
}

export async function jumpToTavernChat(input: {
  avatar?: string;
  chatFile: string;
  characterId?: number | null;
  ownerName?: string;
}) {
  if (!input.chatFile || input.chatFile === '__no_chat__') {
    throw new Error('旧数据没有对应的酒馆聊天文件，无法直接跳转');
  }

  const targetId = resolveCharacterIndex(input);
  if (targetId < 0) {
    throw new Error('无法在酒馆角色列表中找到这个角色卡');
  }

  const isSameCharacter = await selectTavernCharacter(targetId);
  const loadChat = () => triggerTavernChatLoad(input.chatFile);
  if (isSameCharacter) {
    const closeButton = getTavernWindow().document.getElementById('option_close_chat');
    if (closeButton instanceof HTMLElement && closeButton.offsetParent !== null) {
      closeButton.click();
      window.setTimeout(loadChat, 500);
    } else {
      loadChat();
    }
  } else {
    window.setTimeout(loadChat, 2000);
  }
}
