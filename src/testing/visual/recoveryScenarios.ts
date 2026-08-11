import { createRecoveryCharacters, normalizeBackupSummary, parseChatBackupJsonl } from '@/apps/recovery/model';
import { useChatRecoveryStore } from '@/apps/recovery/store';

interface RecoveryScenarioContext {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
}

const rawJsonl = [
  JSON.stringify({ chat_metadata: {}, character_name: '测试角色', user_name: '视觉用户' }),
  JSON.stringify({ is_user: true, mes: '你还记得事故发生前的最后一段对话吗？', name: '视觉用户', send_date: '2026-08-11T09:57:00.000Z' }),
  JSON.stringify({ is_user: false, mes: '记得。雨停以前，我们把备份留在了这里。', name: '测试角色', send_date: '2026-08-11T09:58:00.000Z' }),
].join('\n');

export function applyRecoveryVisualScenario(name: string, context: RecoveryScenarioContext) {
  if (!name.startsWith('recovery-')) return false;
  const recovery = useChatRecoveryStore();
  const characters = createRecoveryCharacters([{ avatar: 'visual-user.png', name: '测试角色' }]);
  const summary = normalizeBackupSummary({
    chat_items: 2,
    file_id: 'chat_visual_user_20260811-095800',
    file_name: 'chat_visual_user_20260811-095800.jsonl',
    file_size: '18.4 KB',
    last_mes: '2026-08-11T09:58:00.000Z',
    mes: '记得。雨停以前，我们把备份留在了这里。',
  });
  if (!summary || !characters[0]) throw new Error('Recovery visual fixture could not be created');
  const loaded = {
    blob: new Blob([rawJsonl], { type: 'application/jsonl' }),
    messageCountMismatch: '',
    parsed: parseChatBackupJsonl(rawJsonl),
    summary,
  };
  const backups = [
    summary,
    { ...summary, fileId: 'chat_visual_user_20260811-083000', fileName: 'chat_visual_user_20260811-083000.jsonl', lastMessage: '更早的一份备份。', lastMessageAt: Date.parse('2026-08-11T08:30:00.000Z') },
  ];
  recovery.setVisualFixture({
    backups,
    characters,
    loaded: name === 'recovery-shelf' ? null : loaded,
    result: name === 'recovery-result' ? { fileName: '测试角色 - 2026-08-11 imported.jsonl', target: characters[0], verified: true } : null,
  });
  const page = name === 'recovery-reader' ? 'reader' : name === 'recovery-confirm' ? 'confirm' : name === 'recovery-result' ? 'result' : 'root';
  const title = page === 'reader' ? '阅读聊天备份' : page === 'confirm' ? '确认导入备份' : page === 'result' ? '导入完成' : '聊天备份恢复';
  context.resetPhoneToRoute('recovery', page, title, { fileName: summary.fileName });
  return true;
}
