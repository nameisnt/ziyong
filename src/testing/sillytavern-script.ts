export const characters = [
  { avatar: 'visual-user.png', name: '测试角色' },
];

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
  ];
}

export function saveSettingsDebounced() {}
