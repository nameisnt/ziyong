import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { createExtraChapterGenerationRecord, type ExtraChapterGenerateConfig } from '@/core/extrasGeneration';
import { generateContent } from '@/core/generationService';
import { useExtrasStore } from '@/store/extras';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { usePhoneStore, type PhoneRoute } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { ExtraBook, ExtraChapter } from '@/type/extra';
import type { GenerationReferenceItem } from '@/util/references';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { storeToRefs } from 'pinia';
import type { ComputedRef, Ref } from 'vue';
import type { useExtrasGenerationState } from './useExtrasGenerationState';

type GenerationSession = ReturnType<typeof useExtrasGenerationState>;

interface ExtrasGenerationActionsOptions {
  activeBook: ComputedRef<ExtraBook | null>;
  buildChapterOutputFormat: () => string;
  buildChaptersContext: (book: ExtraBook, coveredChapterIds: string[]) => string;
  buildPreviousChapterContext: (book: ExtraBook) => string;
  buildSummaryOutputFormat: () => string;
  chapterGenerationDraft: GenerationSession['chapterGenerationDraft'];
  chapterGenerationState: GenerationSession['chapterGenerationState'];
  clearChapterPreviewDraft: () => void;
  clearSummaryPreviewDraft: () => void;
  currentChapterTypePrompt: ComputedRef<string>;
  failedDraftRawOutput: Ref<string>;
  formattedReferences: ComputedRef<string>;
  getChapterAppPrompt: (intent: GenerationSession['chapterGenerationDraft']['generationIntent']) => string;
  getSummarizableChapters: () => ExtraChapter[];
  persistChapterPreviewDraft: (params: Record<string, string>) => void;
  persistSummaryPreviewDraft: (params: Record<string, string>) => void;
  route: Ref<PhoneRoute>;
  saveChapterTypePrompt: () => { id: string; name: string } | null;
  selectedReferences: Ref<GenerationReferenceItem[]>;
  summaryGenerationDraft: GenerationSession['summaryGenerationDraft'];
  summaryGenerationState: GenerationSession['summaryGenerationState'];
  viewedChapterVersion: ComputedRef<{ id: string } | null>;
}

/** Owns the complete chapter and summary generation transactions for Extras. */
export function useExtrasGenerationActions(options: ExtrasGenerationActionsOptions) {
  const extras = useExtrasStore();
  const regexDisplay = useRegexDisplayStore();
  const phone = usePhoneStore();
  const prompts = usePromptStore();
  const settingsStore = useSettingsStore();
  const { settings } = storeToRefs(settingsStore);
  const chapterAdapter = getRegisteredPhoneGenerationAdapter('extras', 'chapter-generate');
  const summaryAdapter = getRegisteredPhoneGenerationAdapter('extras', 'chapter-summary');

  async function runChapterGeneration() {
    const bookId = options.route.value.params?.bookId;
    const book = options.activeBook.value;
    if (!bookId || !book) return;
    await runChapterGenerationForBook(bookId, book, options.route.value.params?.chapterId || '');
  }

  async function runChapterGenerationForBook(bookId: string, book: ExtraBook, chapterId = '') {
    const draft = options.chapterGenerationDraft;
    const state = options.chapterGenerationState;
    if (draft.mode === '重写当前章节' && !chapterId) {
      state.error = '当前没有可重写的章节';
      return;
    }

    state.error = '';
    options.clearChapterPreviewDraft();
    state.preview = null;
    state.rawOutput = '';
    const savedTypePrompt = options.saveChapterTypePrompt();
    if (savedTypePrompt) {
      extras.updateBook(bookId, {
        title: book.title,
        typeId: savedTypePrompt.id,
        typeName: savedTypePrompt.name,
      });
    }

    try {
      const summaryRule = draft.summaryRuleId
        ? regexDisplay.rules.find(rule => rule.id === draft.summaryRuleId && rule.operation === 'extract')
        : null;
      const generationConfig = {
        appPrompt: options.getChapterAppPrompt(draft.generationIntent),
        bookId,
        chapterId,
        chapterMode: draft.mode,
        generationIntent: draft.generationIntent,
        fromStartEnd: draft.fromStartEnd,
        outputFormat: options.buildChapterOutputFormat(),
        previousChapterContext: options.buildPreviousChapterContext(book),
        rangeText: draft.rangeText,
        recentCount: draft.recentCount,
        references: options.selectedReferences.value.map(reference => ({
          ...reference,
          sourcePath: [...reference.sourcePath],
        })),
        singleMessageId: draft.singleMessageId,
        parseSummary: draft.parseSummary,
        removeSummaryBlock: draft.removeSummaryBlock,
        summaryFormatHint: draft.summaryFormatHint,
        summaryRuleFlags: summaryRule?.flags || '',
        summaryRuleId: summaryRule?.id || '',
        summaryRuleName: summaryRule?.name || '',
        summaryRulePattern: summaryRule?.pattern || '',
        summaryRuleReplacement: summaryRule?.replacement || '',
        sourceMode: settings.value.generation.sourceMode,
        tavernPresetName: settings.value.generation.tavernPresetName,
        typeId: draft.typeId,
        typeName: draft.typeName,
        typePrompt: options.currentChapterTypePrompt.value,
        userRequirement: draft.userRequirement,
      } satisfies ExtraChapterGenerateConfig;
      const result = await generateContent(chapterAdapter, generationConfig, {
        createFailedDraft: input => extras.createFailedDraft(input),
        generationDefaults: {
          resultMode: settings.value.generation.resultMode,
          stream: settings.value.generation.stream,
          tavernPresetName: settings.value.generation.tavernPresetName,
        },
        references: options.formattedReferences.value,
        referenceItems: options.selectedReferences.value,
        lifecycle: {
          onFinish() {
            state.running = false;
            state.generationId = '';
          },
          onRawOutput(rawOutput) {
            state.rawOutput = rawOutput;
          },
          onStart(generationId) {
            state.running = true;
            state.generationId = generationId;
          },
        },
        source: {
          fromStartEnd: draft.fromStartEnd,
          mode: settings.value.generation.sourceMode,
          rangeText: draft.rangeText,
          recentCount: draft.recentCount,
          singleMessageId: draft.singleMessageId,
        },
        textProvider: settings.value.textProvider,
      });

      if (result.status === 'failed') {
        options.failedDraftRawOutput.value = result.rawOutput;
        state.error = result.warnings.join('；') || '模型没有返回可解析的番外 XML';
        toastr.warning('XML 解析失败，已保存到失败草稿');
        void phone.presentGeneratedPage('extras', 'failed-draft', '解析失败草稿', {
          draftId: result.draft.id,
          bookId,
        });
        return;
      }

      if (result.status === 'saved') {
        const savedChapter = result.saved.chapter;
        toastr.success(draft.mode === '重写当前章节' ? '已保存并切换到章节新版本' : '已生成并保存章节');
        void phone.presentGeneratedPage('extras', 'chapter', result.data.title, {
          bookId,
          chapterId: savedChapter.id,
          ...(result.saved.versionId ? { versionId: result.saved.versionId } : {}),
        });
        return;
      }

      const targetVersionId = options.viewedChapterVersion.value?.id || '';
      state.preview = {
        bookId,
        chapterId,
        content: result.data.content,
        draftId: null,
        generationRecord: {
          ...createExtraChapterGenerationRecord(generationConfig, result.source, result.replay),
          reasoning: result.generationRecord.reasoning,
        },
        mode: draft.mode,
        raw: result.rawOutput,
        summary: result.data.summary,
        targetVersionId,
        title: result.data.title,
        warnings: result.warnings,
      };
      options.persistChapterPreviewDraft(
        chapterId ? { bookId, chapterId, ...(targetVersionId ? { versionId: targetVersionId } : {}) } : { bookId },
      );
      void phone.presentGeneratedPage(
        'extras',
        'chapter-preview',
        '番外预览',
        chapterId ? { bookId, chapterId, ...(targetVersionId ? { versionId: targetVersionId } : {}) } : { bookId },
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
    }
  }

  async function runSummaryGeneration() {
    const bookId = options.route.value.params?.bookId;
    const book = options.activeBook.value;
    const draft = options.summaryGenerationDraft;
    const state = options.summaryGenerationState;
    if (!bookId || !book) return;
    if (!draft.coveredChapterIds.length) {
      state.error = '请至少选择一章后再生成总结';
      return;
    }
    const selectableChapterIds = new Set(options.getSummarizableChapters().map(chapter => chapter.id));
    if (draft.coveredChapterIds.some(chapterId => !selectableChapterIds.has(chapterId))) {
      state.error = '所选章节已经被其他启用总结覆盖，请重新选择';
      draft.coveredChapterIds = draft.coveredChapterIds.filter(chapterId => selectableChapterIds.has(chapterId));
      return;
    }

    state.error = '';
    options.clearSummaryPreviewDraft();
    state.preview = null;
    state.rawOutput = '';

    try {
      const result = await generateContent(
        summaryAdapter,
        {
          appPrompt: prompts.specialPrompts.extraSummary,
          bookId,
          chaptersContext: options.buildChaptersContext(book, draft.coveredChapterIds),
          coveredChapterIds: [...draft.coveredChapterIds],
          enabled: draft.enabled,
          outputFormat: options.buildSummaryOutputFormat(),
          typePrompt: '',
          userRequirement: draft.userRequirement,
        },
        {
          createFailedDraft: input => extras.createFailedDraft(input),
          generationDefaults: {
            resultMode: settings.value.generation.resultMode,
            stream: settings.value.generation.stream,
            tavernPresetName: settings.value.generation.tavernPresetName,
          },
          references: options.formattedReferences.value,
          lifecycle: {
            onFinish() {
              state.running = false;
              state.generationId = '';
            },
            onRawOutput(rawOutput) {
              state.rawOutput = rawOutput;
            },
            onStart(generationId) {
              state.running = true;
              state.generationId = generationId;
            },
          },
          source: {
            fromStartEnd: draft.fromStartEnd,
            mode: settings.value.generation.sourceMode,
            rangeText: draft.rangeText,
            recentCount: draft.recentCount,
            singleMessageId: draft.singleMessageId,
          },
          textProvider: settings.value.textProvider,
        },
      );

      if (result.status === 'failed') {
        options.failedDraftRawOutput.value = result.rawOutput;
        state.error = result.warnings.join('；') || '模型没有返回可解析的章节总结 XML';
        toastr.warning('XML 解析失败，已保存到失败草稿');
        void phone.presentGeneratedPage('extras', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
        return;
      }

      if (result.status === 'saved') {
        const nextBook = extras.getBook(bookId);
        toastr.success('已生成并保存章节总结');
        if (nextBook) void phone.presentGeneratedPage('extras', 'book', nextBook.title, { bookId });
        return;
      }

      state.preview = {
        bookId,
        content: result.data.content,
        coveredChapterIds: [...draft.coveredChapterIds],
        draftId: null,
        enabled: draft.enabled,
        raw: result.rawOutput,
        warnings: result.warnings,
      };
      options.persistSummaryPreviewDraft({ bookId });
      void phone.presentGeneratedPage('extras', 'summary-preview', '章节总结预览', { bookId });
    } catch (error) {
      state.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
    }
  }

  function stopChapterGeneration() {
    const state = options.chapterGenerationState;
    if (!state.generationId) return;
    stopGenerationByIdSafe(state.generationId);
    state.running = false;
    state.error = '生成已停止';
  }

  function stopSummaryGeneration() {
    const state = options.summaryGenerationState;
    if (!state.generationId) return;
    stopGenerationByIdSafe(state.generationId);
    state.running = false;
    state.error = '生成已停止';
  }

  return {
    runChapterGeneration,
    runChapterGenerationForBook,
    runSummaryGeneration,
    stopChapterGeneration,
    stopSummaryGeneration,
  };
}
