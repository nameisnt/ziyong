import {
  buildChatFloorBackupKey,
  saveChatFloorBackup,
  type ChatFloorBackup,
} from '@/util/chatFloorBackup';

export async function seedArchiveFloorBackupFixture() {
  const key = buildChatFloorBackupKey('char', 'visual-user.png', 'visual-chat');
  const backup = {
    chat: { id: 'visual-chat', title: '视觉测试聊天' },
    createdAt: '2099-08-15T08:00:00.000Z',
    key,
    kind: 'tavern-phone-chat-floor-backup',
    messages: [
      {
        data: {},
        extra: {},
        isHidden: false,
        message: '请记录这段视觉测试聊天。',
        messageId: 0,
        name: '视觉用户',
        role: 'user',
      },
      {
        data: {},
        extra: { reasoning: '先确认固定夹具，再展示正文。' },
        isHidden: false,
        message: '这是一段可重复阅读的楼层备份正文。',
        messageId: 1,
        name: '测试角色',
        role: 'assistant',
      },
    ],
    owner: {
      avatar: 'visual-user.png',
      displayName: '测试角色',
      kind: 'char',
      stableId: 'visual-user.png',
    },
    schemaVersion: 1,
    updatedAt: '2099-08-15T08:05:00.000Z',
  } satisfies ChatFloorBackup;

  await saveChatFloorBackup(backup);
}
