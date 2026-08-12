import { createRecoveryCharacters, normalizeBackupSummary, parseChatBackupJsonl } from '@/apps/recovery/model';
import { useChatRecoveryStore } from '@/apps/recovery/store';

interface RecoveryScenarioContext {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
}

const rawJsonl = [
  JSON.stringify({ chat_metadata: {}, character_name: '测试角色', user_name: '视觉用户' }),
  JSON.stringify({
    is_user: true,
    mes: '你还记得事故发生前的最后一段对话吗？',
    name: '视觉用户',
    send_date: '2026-08-11T09:57:00.000Z',
  }),
  JSON.stringify({
    is_user: false,
    mes: '记得。雨停以前，我们把备份留在了这里。',
    name: '测试角色',
    send_date: '2026-08-11T09:58:00.000Z',
  }),
].join('\n');

const recoveryScenarioNames = [
  'recovery-shelf',
  'recovery-group',
  'recovery-cleanup',
  'recovery-duplicates',
  'recovery-reader',
  'recovery-confirm',
  'recovery-result',
] as const;

export function applyRecoveryVisualScenario(name: string, context: RecoveryScenarioContext) {
  if (!recoveryScenarioNames.includes(name as (typeof recoveryScenarioNames)[number])) return false;
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
    {
      ...summary,
      backupCreatedAt: Date.parse('2026-08-11T08:30:00.000Z'),
      fileId: 'chat_visual_user_20260811-083000',
      fileName: 'chat_visual_user_20260811-083000.jsonl',
      lastMessage: '更早的一份备份。',
      lastMessageAt: Date.parse('2026-08-11T08:30:00.000Z'),
    },
    {
      ...summary,
      backupCreatedAt: Date.parse('2026-08-11T07:00:00.000Z'),
      chatItems: 0,
      fileId: 'chat_visual_user_20260811-070000',
      fileName: 'chat_visual_user_20260811-070000.jsonl',
      lastMessage: '只有 metadata',
      lastMessageAt: Date.parse('2026-08-11T07:00:00.000Z'),
    },
  ];
  const cleanupSummary = backups[2]!;
  const duplicateSummary = backups[1]!;
  recovery.setVisualFixture({
    backups,
    characters,
    cleanupScan:
      name === 'recovery-cleanup'
        ? {
            candidates: [{ actualChatItems: 0, summary: cleanupSummary }],
            groupId: '',
            maxChatItems: 0,
            rejected: [],
          }
        : null,
    duplicateScan:
      name === 'recovery-duplicates'
        ? {
            groupId: '',
            groups: [
              {
                byteLength: rawJsonl.length,
                contentHash: 'visual-exact-hash',
                duplicates: [
                  {
                    actualChatItems: 2,
                    byteLength: rawJsonl.length,
                    contentHash: 'visual-exact-hash',
                    summary: duplicateSummary,
                  },
                ],
                id: 'visual-user\u0000visual-exact-hash',
                keeper: {
                  actualChatItems: 2,
                  byteLength: rawJsonl.length,
                  contentHash: 'visual-exact-hash',
                  summary,
                },
                reclaimBytes: rawJsonl.length,
              },
            ],
            rejected: [],
            scannedFiles: 2,
          }
        : null,
    loaded: ['recovery-reader', 'recovery-confirm', 'recovery-result'].includes(name) ? loaded : null,
    result:
      name === 'recovery-result'
        ? { fileName: '测试角色 - 2026-08-11 imported.jsonl', target: characters[0], verified: true }
        : null,
  });
  const pageByScenario: Record<string, string> = {
    'recovery-cleanup': 'cleanup',
    'recovery-confirm': 'confirm',
    'recovery-duplicates': 'duplicates',
    'recovery-group': 'group',
    'recovery-reader': 'reader',
    'recovery-result': 'result',
    'recovery-shelf': 'root',
  };
  const titleByPage: Record<string, string> = {
    cleanup: '快速清理备份',
    confirm: '确认导入备份',
    duplicates: '重复备份查找',
    group: '测试角色',
    reader: '阅读聊天备份',
    result: '导入完成',
    root: '酒馆备份管理',
  };
  const page = pageByScenario[name] ?? 'root';
  const title = titleByPage[page] ?? '酒馆备份管理';
  context.resetPhoneToRoute('recovery', page, title, {
    fileName: summary.fileName,
    groupId: page === 'group' ? 'character:0' : '',
  });
  return true;
}
