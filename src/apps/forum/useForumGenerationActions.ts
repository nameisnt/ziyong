import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import {
  materializeForumReplies,
  type ForumReplyGenerateConfig,
  type ForumThreadGenerateConfig,
} from '@/core/forumGeneration';
import { generateContent } from '@/core/generationService';
import { useForumStore } from '@/store/forum';
import { usePhoneStore, type PhoneRoute } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { ForumBoard, ForumThread } from '@/type/forum';
import type { GenerationTask } from '@/type/generationTask';
import type { GenerationReferenceItem } from '@/util/references';
import { storeToRefs } from 'pinia';
import type { ComputedRef, Ref } from 'vue';
import type { ForumGenerationPreview } from './useForumPreviewSession';

interface ForumGenerationState {
  preview: ForumGenerationPreview | null;
}

interface ForumSourceDraft {
  fromStartEnd: number;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
  userRequirement: string;
}

interface ForumGenerationActionsOptions {
  activeBoard: ComputedRef<ForumBoard | null>;
  beginPreviewDraft: () => void;
  buildReplyThreadContext: (thread: ForumThread) => string;
  buildRepliesOutputFormat: () => string;
  buildThreadGenerationConfig: () => ForumThreadGenerateConfig;
  clearPreviewDraft: () => void;
  failedDraftRawOutput: Ref<string>;
  formattedReferences: ComputedRef<string>;
  generationState: ForumGenerationState;
  persistPreviewDraft: (params: Record<string, string>) => void;
  replyGenerationDraft: ForumSourceDraft;
  rewriteForumThread: ComputedRef<ForumThread | null>;
  rewriteForumVersion: ComputedRef<{ id: string } | null>;
  route: Ref<PhoneRoute>;
  selectedReferences: Ref<GenerationReferenceItem[]>;
  threadGenerationDraft: ForumSourceDraft;
  threadGenerationMode: ComputedRef<'create' | 'rewrite'>;
  viewedForumThread: ComputedRef<ForumThread | null>;
  viewedForumVersionId: ComputedRef<string>;
}

/** Owns the complete thread and reply generation transactions for Forum. */
export function useForumGenerationActions(options: ForumGenerationActionsOptions) {
  const forum = useForumStore();
  const phone = usePhoneStore();
  const prompts = usePromptStore();
  const settingsStore = useSettingsStore();
  const { settings } = storeToRefs(settingsStore);
  const threadAdapter = getRegisteredPhoneGenerationAdapter('forum', 'generate-thread');
  const replyAdapter = getRegisteredPhoneGenerationAdapter('forum', 'generate-replies');
  const threadSession = useSingleGenerationTaskSession({
    actionId: 'generate-thread',
    appId: 'forum',
    sourcePage: 'generate-thread',
    title: '生成论坛主题 · 单次生成',
  });
  const replySession = useSingleGenerationTaskSession({
    actionId: 'generate-replies',
    appId: 'forum',
    sourcePage: 'generate-replies',
    title: '生成论坛回复 · 单次生成',
  });

  function source(draft: ForumSourceDraft) {
    return {
      fromStartEnd: draft.fromStartEnd,
      mode: settings.value.generation.sourceMode,
      rangeText: draft.rangeText,
      recentCount: draft.recentCount,
      singleMessageId: draft.singleMessageId,
    };
  }

  function generationDefaults() {
    return {
      resultMode: settings.value.generation.resultMode,
      stream: settings.value.generation.stream,
      tavernPresetName: settings.value.generation.tavernPresetName,
    };
  }

  async function runThreadGeneration() {
    const state = options.generationState;
    options.beginPreviewDraft();
    state.preview = null;
    let task: GenerationTask | null = null;
    try {
      const config = options.buildThreadGenerationConfig();
      task = threadSession.create({
        sourceParams: config.boardId ? { boardId: config.boardId } : {},
        title: options.threadGenerationMode.value === 'rewrite' ? '重新生成论坛主题' : '生成论坛主题 · 单次生成',
      });
      const result = await generateContent(threadAdapter, config, {
        createFailedDraft: input => forum.createFailedDraft(input),
        generationDefaults: generationDefaults(),
        references: options.formattedReferences.value,
        referenceItems: options.selectedReferences.value,
        lifecycle: threadSession.lifecycle(task.id),
        source: source(options.threadGenerationDraft),
        textProvider: settings.value.textProvider,
      });

      if (result.status === 'failed') {
        options.failedDraftRawOutput.value = result.rawOutput;
        threadSession.complete(task.id, {
          currentLabel: '解析失败草稿已保留',
          resultPage: 'failed-draft',
          resultParams: { draftId: result.draft.id },
          resultState: 'failed-draft',
          resultTitle: '解析失败草稿',
        });
        toastr.warning('XML 解析失败，已保存到失败草稿');
        void phone.presentGeneratedPage('forum', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
        return;
      }

      if (result.status === 'saved') {
        threadSession.complete(task.id, {
          currentLabel: `已保存论坛主题：${result.data.title}`,
          resultPage: 'thread',
          resultParams: {
            boardId: result.saved.board.id,
            threadId: result.saved.thread.id,
            ...(result.saved.versionId ? { versionId: result.saved.versionId } : {}),
          },
          resultState: 'saved',
          resultTitle: result.data.title,
        });
        toastr.success(
          options.threadGenerationMode.value === 'rewrite' ? '已保存并切换到主帖新版本' : '已生成并保存帖子',
        );
        void phone.presentGeneratedPage('forum', 'thread', result.data.title, {
          boardId: result.saved.board.id,
          threadId: result.saved.thread.id,
          ...(result.saved.versionId ? { versionId: result.saved.versionId } : {}),
        });
        return;
      }

      const materialized = materializeForumReplies([], result.data.replies, result.source);
      state.preview = {
        action: 'thread',
        author: result.data.author,
        boardTypePrompt: config.boardTypePrompt,
        boardId: config.boardId,
        boardName: config.boardName || result.data.board,
        boardTypeId: config.boardTypeId,
        boardTypeName: config.boardTypeName,
        content: result.data.content,
        draftId: null,
        raw: result.rawOutput,
        replies: materialized.replies,
        generationRecord: result.generationRecord,
        mode: options.threadGenerationMode.value,
        targetThreadId: options.rewriteForumThread.value?.id || '',
        targetVersionId: options.rewriteForumVersion.value?.id || '',
        title: result.data.title,
        warnings: [...result.warnings, ...materialized.warnings],
      };
      const routeParams = {
        ...(state.preview.boardId ? { boardId: state.preview.boardId } : {}),
        ...(state.preview.targetThreadId ? { rewriteThreadId: state.preview.targetThreadId } : {}),
        ...(state.preview.targetVersionId ? { versionId: state.preview.targetVersionId } : {}),
      };
      options.persistPreviewDraft(routeParams);
      threadSession.complete(task.id, {
        currentLabel: '论坛主题已生成，等待确认',
        resultPage: 'preview',
        resultParams: routeParams,
        resultState: 'preview',
        resultTitle: '生成预览',
      });
      void phone.presentGeneratedPage('forum', 'preview', '生成预览', routeParams);
    } catch (error) {
      if (task) threadSession.fail(task.id, error);
      else toastr.error(error instanceof Error ? error.message : '生成失败，请稍后再试');
    }
  }

  async function runReplyGeneration() {
    const boardId = options.route.value.params?.boardId;
    const threadId = options.route.value.params?.threadId;
    const thread = options.viewedForumThread.value;
    const state = options.generationState;
    if (!boardId || !threadId || !thread) return;

    options.beginPreviewDraft();
    state.preview = null;
    let task: GenerationTask | null = null;
    try {
      task = replySession.create({
        sourceParams: { boardId, threadId },
        title: `生成论坛回复 · ${thread.title}`,
      });
      const config: ForumReplyGenerateConfig = {
        appPrompt: prompts.specialPrompts.forumReplies,
        boardId,
        outputFormat: options.buildRepliesOutputFormat(),
        threadContext: options.buildReplyThreadContext(thread),
        threadId,
        userRequirement: options.replyGenerationDraft.userRequirement,
        versionId: options.viewedForumVersionId.value,
      };
      const result = await generateContent(replyAdapter, config, {
        createFailedDraft: input => forum.createFailedDraft(input),
        generationDefaults: generationDefaults(),
        references: options.formattedReferences.value,
        referenceItems: options.selectedReferences.value,
        lifecycle: replySession.lifecycle(task.id),
        source: source(options.replyGenerationDraft),
        textProvider: settings.value.textProvider,
      });

      if (result.status === 'failed') {
        options.failedDraftRawOutput.value = result.rawOutput;
        replySession.complete(task.id, {
          currentLabel: '解析失败草稿已保留',
          resultPage: 'failed-draft',
          resultParams: { draftId: result.draft.id },
          resultState: 'failed-draft',
          resultTitle: '解析失败草稿',
        });
        toastr.warning('XML 解析失败，已保存到失败草稿');
        void phone.presentGeneratedPage('forum', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
        return;
      }

      if (result.status === 'saved') {
        const savedParams = {
          boardId,
          threadId,
          ...(options.viewedForumVersionId.value ? { versionId: options.viewedForumVersionId.value } : {}),
        };
        replySession.complete(task.id, {
          currentLabel: '论坛回复已保存',
          resultPage: 'thread',
          resultParams: savedParams,
          resultState: 'saved',
          resultTitle: thread.title,
        });
        toastr.success('已生成并保存回复');
        void phone.presentGeneratedPage('forum', 'thread', thread.title, {
          boardId,
          threadId,
          ...(options.viewedForumVersionId.value ? { versionId: options.viewedForumVersionId.value } : {}),
        });
        return;
      }

      const materialized = materializeForumReplies(thread.replies, result.data.replies);
      state.preview = {
        action: 'replies',
        boardId,
        boardName: options.activeBoard.value?.name || '',
        draftId: null,
        raw: result.rawOutput,
        replies: materialized.replies,
        threadId,
        threadTitle: thread.title,
        versionId: options.viewedForumVersionId.value,
        warnings: [...result.warnings, ...materialized.warnings],
      };
      const routeParams = {
        boardId,
        threadId,
        ...(options.viewedForumVersionId.value ? { versionId: options.viewedForumVersionId.value } : {}),
      };
      options.persistPreviewDraft(routeParams);
      replySession.complete(task.id, {
        currentLabel: '论坛回复已生成，等待确认',
        resultPage: 'preview',
        resultParams: routeParams,
        resultState: 'preview',
        resultTitle: '生成预览',
      });
      void phone.presentGeneratedPage('forum', 'preview', '生成预览', routeParams);
    } catch (error) {
      if (task) replySession.fail(task.id, error);
      else toastr.error(error instanceof Error ? error.message : '生成失败，请稍后再试');
    }
  }

  function stopGeneration() {
    if (options.route.value.page === 'generate-replies') replySession.stop();
    else threadSession.stop();
  }

  return { replySession, runReplyGeneration, runThreadGeneration, stopGeneration, threadSession };
}
import { useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
