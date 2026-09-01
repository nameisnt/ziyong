// eslint-disable-next-line import-x/no-nodejs-modules
import { getRequestHeaders } from '@sillytavern/script';

export async function getCharacterChatHistory(owner: { avatar: string; name: string }, fileName: string) {
  const name = owner.name.trim();
  const avatar = owner.avatar.trim();
  if (!name || !avatar) throw new Error('角色卡缺少读取聊天所需的信息');

  const response = await fetch('/api/chats/get', {
    body: JSON.stringify({
      avatar_url: avatar,
      ch_name: name,
      file_name: fileName.replace(/\.jsonl$/i, ''),
    }),
    cache: 'no-cache',
    headers: getRequestHeaders(),
    method: 'POST',
  });
  if (!response.ok) throw new Error(`读取聊天文件失败（HTTP ${response.status}）`);

  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) throw new Error('聊天文件已改名或不存在，请刷新书架');
  return raw.slice(1);
}
