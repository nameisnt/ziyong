export const characters = [{ avatar: 'visual-user.png', name: '测试角色' }];
export const name1 = '视觉用户';

export function eventClearAll() {}

export function getRequestHeaders() {
  return {};
}

export async function getCharacters() {
  return characters;
}

export async function getPastCharacterChats() {
  return [
    {
      file_name: 'visual-chat.jsonl',
      mes: '视觉测试聊天',
    },
    {
      file_name: 'visual-history-a.jsonl',
      mes: '视觉旧聊天 A',
      title: '视觉旧聊天 A',
    },
    {
      file_name: 'visual-history-b.jsonl',
      mes: '视觉旧聊天 B',
      title: '视觉旧聊天 B',
    },
  ];
}

export async function importCharacterChat() {
  return ['视觉导入聊天.jsonl'];
}

export function saveSettingsDebounced() {}
