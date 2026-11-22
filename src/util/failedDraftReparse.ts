import type { FailedGenerationDraft } from '@/type/generation';

/**
 * 失败草稿里记录「这次生成原本要落到哪里」。
 *
 * 五个写作 App 的生成配置里目标字段名不一致（entryId/chapterId/threadId），
 * 但含义相同：非空表示这是一次重写，保存时应追加到该条目而不是新建。
 * 从失败草稿重新解析时必须沿用同一个目标，否则会退化成新条目。
 */
export interface FailedDraftReparseTarget {
  entryId: string;
  versionId: string;
}

export function readFailedDraftTarget(context: Record<string, unknown>): FailedDraftReparseTarget {
  const entryIdCandidates = [context.entryId, context.chapterId, context.threadId];
  const entryId = entryIdCandidates.find((value): value is string => typeof value === 'string' && value !== '') || '';
  const versionId = typeof context.versionId === 'string' ? context.versionId : '';
  return { entryId, versionId };
}

/**
 * 失败草稿「重新解析」成功后的统一收尾：更新草稿 → 写入预览 → 持久化草稿 →
 * 删除失败草稿 → 跳转预览页。顺序与五个 App 原来各写一份的写法一致。
 */
export function completeFailedDraftReparse<TPreview>(options: {
  deleteDraft: (draftId: string) => void;
  draft: FailedGenerationDraft;
  navigate: () => void;
  persistDraft: () => void;
  preview: TPreview;
  rawOutput: string;
  setPreview: (preview: TPreview) => void;
  updateDraft: (draftId: string, patch: { rawOutput: string; warnings: string[] }) => void;
  warnings: string[];
}) {
  options.updateDraft(options.draft.id, { rawOutput: options.rawOutput, warnings: options.warnings });
  options.setPreview(options.preview);
  options.persistDraft();
  options.deleteDraft(options.draft.id);
  options.navigate();
}
