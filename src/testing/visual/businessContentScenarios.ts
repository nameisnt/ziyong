import { useDigestStore } from '@/apps/digest/store';

const scenarios = new Set(['digest-failed-draft-reparse']);

export function applyBusinessContentVisualScenario(
  name: string,
  dependencies: {
    resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  },
) {
  if (!scenarios.has(name)) return false;

  const source = {
    chatIdAtGeneration: `visual-${name}`,
    label: '第 5-16 楼',
    messageIds: [],
    mode: 'range' as const,
    ranges: [{ end: 16, start: 5 }],
    scopeId: `visual-${name}-scope`,
    sortKey: 16,
  };

  const digest = useDigestStore();
  digest.resetCurrentScope();
  const draft = digest.createFailedDraft({
    actionId: 'generate',
    appId: 'digest',
    context: {},
    rawOutput: '<result><title>未闭合</title><content>等待修复的摘抄',
    source,
    warnings: ['缺少结束标签'],
  });
  dependencies.resetPhoneToRoute('digest', 'failed-draft', '解析失败草稿', { draftId: draft.id });
  return true;
}
