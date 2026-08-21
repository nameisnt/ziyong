import { createForumReplySnapshots, materializeForumReplies, persistForumReplyDrafts } from '@/core/forumGeneration';
import { useForumStore } from '@/store/forum';
import type { GenerationReplaySnapshot, HiddenGenerationRecord } from '@/type/generation';
import { parseForumRepliesXmlResult, parseForumXmlResult } from '@/util/generation';
import { createHiddenGenerationRecord } from '@/util/hiddenGenerationRecord';

type PreviewReply = ReturnType<typeof materializeForumReplies>['replies'][number];

export type ForumGenerationPreview =
  | {
      action: 'thread';
      author: string;
      boardTypePrompt: string;
      boardId: string;
      boardName: string;
      boardTypeId: string;
      boardTypeName: string;
      content: string;
      draftId: string | null;
      generationRecord?: HiddenGenerationRecord;
      raw: string;
      replies: PreviewReply[];
      replay?: GenerationReplaySnapshot;
      mode: 'create' | 'rewrite';
      targetThreadId: string;
      targetVersionId: string;
      title: string;
      warnings: string[];
    }
  | {
      action: 'replies';
      boardId: string;
      boardName: string;
      draftId: string | null;
      raw: string;
      replies: PreviewReply[];
      threadId: string;
      threadTitle: string;
      versionId: string;
      warnings: string[];
    };

interface ForumPreviewSessionOptions {
  clearPreviewDraft: () => void;
  getPreview: () => ForumGenerationPreview | null;
  navigateToThread: (title: string, params: { boardId: string; threadId: string; versionId?: string }) => void;
  notify: {
    success: (message: string) => void;
    warning: (message: string) => void;
  };
  setPreview: (preview: ForumGenerationPreview | null) => void;
  store: ReturnType<typeof useForumStore>;
}

/** Owns all save and reparse decisions for a forum generation preview. */
export function useForumPreviewSession(options: ForumPreviewSessionOptions) {
  function savePreview() {
    const preview = options.getPreview();
    if (!preview) return;

    if (preview.action === 'thread') {
      const board = preview.boardId
        ? options.store.getBoard(preview.boardId) ||
          options.store.ensureBoard(preview.boardName, preview.boardTypePrompt, {
            typeId: preview.boardTypeId,
            typeName: preview.boardTypeName,
          })
        : options.store.ensureBoard(preview.boardName, preview.boardTypePrompt, {
            typeId: preview.boardTypeId,
            typeName: preview.boardTypeName,
          });
      const previewReplay = preview.generationRecord?.replay || preview.replay;
      const replySnapshots = createForumReplySnapshots(preview.replies, previewReplay?.source);
      const generationRecord =
        preview.generationRecord ||
        (preview.replay ? createHiddenGenerationRecord('generate-thread', preview.replay) : undefined);
      const saved =
        preview.mode === 'rewrite' && preview.targetThreadId
          ? options.store.appendThreadVersion(board.id, preview.targetThreadId, {
              author: preview.author,
              content: preview.content,
              generationRecord,
              replies: replySnapshots,
              title: preview.title,
            })
          : options.store.createThread(board.id, {
              author: preview.author,
              content: preview.content,
              generationRecord,
              replies: replySnapshots,
              title: preview.title,
            });
      if (!saved) {
        options.notify.warning('目标板块不存在，无法保存帖子');
        return;
      }
      if (preview.draftId) options.store.deleteFailedDraft(preview.draftId);
      options.clearPreviewDraft();
      options.setPreview(null);
      const versionId =
        'version' in saved &&
        saved.version &&
        typeof saved.version === 'object' &&
        'id' in saved.version &&
        typeof saved.version.id === 'string'
          ? saved.version.id
          : '';
      options.notify.success(preview.mode === 'rewrite' ? '已保存并切换到主帖新版本' : '已保存帖子');
      options.navigateToThread(versionId ? preview.title : saved.thread.title, {
        boardId: board.id,
        threadId: saved.thread.id,
        ...(versionId ? { versionId } : {}),
      });
      return;
    }

    persistForumReplyDrafts(
      options.store.createReply,
      preview.boardId,
      preview.threadId,
      preview.replies,
      preview.versionId,
    );
    if (preview.draftId) options.store.deleteFailedDraft(preview.draftId);
    const thread = options.store.getThread(preview.boardId, preview.threadId);
    options.clearPreviewDraft();
    options.setPreview(null);
    options.notify.success('已保存回复');
    if (thread) {
      options.navigateToThread(thread.title, {
        boardId: preview.boardId,
        threadId: preview.threadId,
        ...(preview.versionId ? { versionId: preview.versionId } : {}),
      });
    }
  }

  function reparsePreviewRaw() {
    const preview = options.getPreview();
    if (!preview) return false;
    const rawOutput = preview.raw;
    if (!rawOutput.trim()) {
      options.notify.warning('先补一点可解析的 XML 内容');
      return false;
    }

    if (preview.action === 'thread') {
      const parsed = parseForumXmlResult(rawOutput);
      if (!parsed.ok) {
        preview.raw = rawOutput;
        preview.warnings = parsed.warnings;
        options.notify.warning(parsed.warnings.join('；') || '还是没能解析成功');
        return false;
      }

      const materialized = materializeForumReplies([], parsed.data.replies);
      preview.author = parsed.data.author;
      preview.boardName = parsed.data.board || preview.boardName;
      preview.content = parsed.data.content;
      preview.raw = rawOutput;
      preview.replies = materialized.replies;
      preview.title = parsed.data.title;
      preview.warnings = [...parsed.warnings, ...materialized.warnings];
      options.notify.success('已按原始输出重新解析');
      return true;
    }

    const thread = options.store.getThread(preview.boardId, preview.threadId);
    if (!thread) {
      options.notify.warning('原帖子已经不存在，暂时不能重新解析回复');
      return false;
    }
    const parsed = parseForumRepliesXmlResult(rawOutput);
    if (!parsed.ok) {
      preview.raw = rawOutput;
      preview.warnings = parsed.warnings;
      options.notify.warning(parsed.warnings.join('；') || '还是没能解析成功');
      return false;
    }

    const materialized = materializeForumReplies(thread.replies, parsed.data.replies);
    preview.raw = rawOutput;
    preview.replies = materialized.replies;
    preview.warnings = [...parsed.warnings, ...materialized.warnings];
    options.notify.success('已按原始输出重新解析');
    return true;
  }

  return { reparsePreviewRaw, savePreview };
}
