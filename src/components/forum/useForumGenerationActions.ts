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
import type { GenerationReferenceItem } from '@/util/references';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { storeToRefs } from 'pinia';
import type { ComputedRef, Ref } from 'vue';
import type { ForumGenerationPreview } from './useForumPreviewSession';

interface ForumGenerationState {
  error: string;
  generationId: string;
  preview: ForumGenerationPreview | null;
  rawOutput: string;
  running: boolean;
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

  function lifecycle() {
    return {
      onFinish() {
        options.generationState.running = false;
        options.generationState.generationId = '';
      },
      onRawOutput(rawOutput: string) {
        options.generationState.rawOutput = rawOutput;
      },
      onStart(generationId: string) {
        options.generationState.running = true;
        options.generationState.generationId = generationId;
      },
    };
  }

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
    state.error = '';
    options.clearPreviewDraft();
    state.preview = null;
    state.rawOutput = '';

    try {
      const config = options.buildThreadGenerationConfig();
      const result = await generateContent(threadAdapter, config, {
        createFailedDraft: input => forum.createFailedDraft(input),
        generationDefaults: generationDefaults(),
        references: options.formattedReferences.value,
        referenceItems: options.selectedReferences.value,
        lifecycle: lifecycle(),
        source: source(options.threadGenerationDraft),
        textProvider: settings.value.textProvider,
      });

      if (result.status === 'failed') {
        state.error = result.warnings.join('；') || '模型没有返回可解析的论坛 XML';
        options.failedDraftRawOutput.value = result.rawOutput;
        toastr.warning('XML 解析失败，已保存到失败草稿');
        void phone.presentGeneratedPage('forum', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
        return;
      }

      if (result.status === 'saved') {
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
      void phone.presentGeneratedPage('forum', 'preview', '生成预览', routeParams);
    } catch (error) {
      state.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
    }
  }

  async function runReplyGeneration() {
    const boardId = options.route.value.params?.boardId;
    const threadId = options.route.value.params?.threadId;
    const thread = options.viewedForumThread.value;
    const state = options.generationState;
    if (!boardId || !threadId || !thread) return;

    state.error = '';
    options.clearPreviewDraft();
    state.preview = null;
    state.rawOutput = '';

    try {
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
        lifecycle: lifecycle(),
        source: source(options.replyGenerationDraft),
        textProvider: settings.value.textProvider,
      });

      if (result.status === 'failed') {
        state.error = result.warnings.join('；') || '模型没有返回可解析的论坛回复 XML';
        options.failedDraftRawOutput.value = result.rawOutput;
        toastr.warning('XML 解析失败，已保存到失败草稿');
        void phone.presentGeneratedPage('forum', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
        return;
      }

      if (result.status === 'saved') {
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
      void phone.presentGeneratedPage('forum', 'preview', '生成预览', routeParams);
    } catch (error) {
      state.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
    }
  }

  function stopGeneration() {
    const state = options.generationState;
    if (!state.generationId) return;
    stopGenerationByIdSafe(state.generationId);
    state.running = false;
    state.error = '生成已停止';
  }

  onScopeDispose(() => {
    if (options.generationState.running && options.generationState.generationId) {
      stopGenerationByIdSafe(options.generationState.generationId);
    }
  });

  return { runReplyGeneration, runThreadGeneration, stopGeneration };
}
