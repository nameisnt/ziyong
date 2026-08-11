import { materializeForumReplies } from '@/core/forumGeneration';
import type { ForumGenerationPreview } from '@/components/forum/useForumPreviewSession';
import { useForumStore } from '@/store/forum';
import { usePhoneStore } from '@/store/phone';
import type { FailedGenerationDraft } from '@/type/generation';
import { parseForumRepliesXmlResult, parseForumXmlResult } from '@/util/generation';
import type { Ref } from 'vue';

export function useForumFailedDraftRepair(options: {
  activeDraft: Readonly<Ref<FailedGenerationDraft | null>>;
  persistPreviewDraft: (routeParams?: Record<string, string>) => void;
  rawOutput: Ref<string>;
  setPreview: (preview: ForumGenerationPreview) => void;
}) {
  const forum = useForumStore();
  const phone = usePhoneStore();

  async function removeFailedDraft(draftId: string) {
    const confirmed = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
      confirmLabel: '删除',
      kind: 'warning',
    });
    if (!confirmed) return;
    forum.deleteFailedDraft(draftId);
    options.rawOutput.value = '';
    if (phone.currentRoute.page === 'failed-draft') {
      phone.replacePage('root', '论坛板块');
    }
    toastr.success('已删除失败草稿');
  }

  function updateUnparsedDraft(draft: FailedGenerationDraft, rawOutput: string, warnings: string[]) {
    forum.updateFailedDraft(draft.id, { rawOutput, warnings });
    options.rawOutput.value = rawOutput;
    toastr.warning(warnings.join('；') || '还是没能解析成功');
  }

  function reparseFailedDraft() {
    const draft = options.activeDraft.value;
    if (!draft) return;
    const rawOutput = options.rawOutput.value.trim();
    if (!rawOutput) {
      toastr.warning('先补一点可解析的 XML 内容');
      return;
    }

    if (draft.actionId === 'generate-thread') {
      const parsed = parseForumXmlResult(rawOutput);
      if (!parsed.ok) return updateUnparsedDraft(draft, rawOutput, parsed.warnings);

      const materialized = materializeForumReplies([], parsed.data.replies);
      const preview: ForumGenerationPreview = {
        action: 'thread',
        author: parsed.data.author,
        boardTypePrompt:
          typeof draft.context.boardTypePrompt === 'string'
            ? draft.context.boardTypePrompt
            : typeof draft.context.boardDescription === 'string'
              ? draft.context.boardDescription
              : '',
        boardId: typeof draft.context.boardId === 'string' ? draft.context.boardId : '',
        boardName: (typeof draft.context.boardName === 'string' ? draft.context.boardName : '') || parsed.data.board,
        boardTypeId: typeof draft.context.boardTypeId === 'string' ? draft.context.boardTypeId : '',
        boardTypeName: typeof draft.context.boardTypeName === 'string' ? draft.context.boardTypeName : '',
        content: parsed.data.content,
        draftId: null,
        generationRecord: draft.generationRecord,
        raw: parsed.raw,
        replies: materialized.replies,
        mode: draft.context.mode === 'rewrite' ? 'rewrite' : 'create',
        targetThreadId: typeof draft.context.threadId === 'string' ? draft.context.threadId : '',
        targetVersionId: '',
        title: parsed.data.title,
        warnings: [...parsed.warnings, ...materialized.warnings],
      };
      forum.updateFailedDraft(draft.id, { rawOutput: parsed.raw, warnings: preview.warnings });
      options.setPreview(preview);
      options.persistPreviewDraft(preview.boardId ? { boardId: preview.boardId } : {});
      forum.deleteFailedDraft(draft.id);
      options.rawOutput.value = '';
      phone.replacePage('preview', '生成预览', preview.boardId ? { boardId: preview.boardId } : undefined);
      return;
    }

    const boardId = typeof draft.context.boardId === 'string' ? draft.context.boardId : '';
    const threadId = typeof draft.context.threadId === 'string' ? draft.context.threadId : '';
    const thread = boardId && threadId ? forum.getThread(boardId, threadId) : null;
    const versionId = typeof draft.context.versionId === 'string' ? draft.context.versionId : '';
    if (!thread) {
      toastr.warning('原帖子已经不存在，暂时不能恢复这条回复草稿');
      return;
    }
    const parsed = parseForumRepliesXmlResult(rawOutput);
    if (!parsed.ok) return updateUnparsedDraft(draft, rawOutput, parsed.warnings);

    const targetReplies = thread.versions.find(version => version.id === versionId)?.replies || thread.replies;
    const materialized = materializeForumReplies(targetReplies, parsed.data.replies);
    const preview: ForumGenerationPreview = {
      action: 'replies',
      boardId,
      boardName: forum.getBoard(boardId)?.name || '论坛板块',
      draftId: null,
      raw: parsed.raw,
      replies: materialized.replies,
      threadId,
      threadTitle: thread.title,
      versionId,
      warnings: [...parsed.warnings, ...materialized.warnings],
    };
    forum.updateFailedDraft(draft.id, { rawOutput: parsed.raw, warnings: preview.warnings });
    options.setPreview(preview);
    options.persistPreviewDraft({ boardId, threadId, ...(versionId ? { versionId } : {}) });
    forum.deleteFailedDraft(draft.id);
    options.rawOutput.value = '';
    phone.replacePage('preview', '生成预览', { boardId, threadId, ...(versionId ? { versionId } : {}) });
  }

  return { removeFailedDraft, reparseFailedDraft };
}
