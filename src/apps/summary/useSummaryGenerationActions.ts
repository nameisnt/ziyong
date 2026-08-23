import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { generateContent } from '@/core/generationService';
import { usePhoneStore, type PhoneRoute } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import type { GenerationReferenceItem } from '@/util/references';
import { getSourceLastFloor } from '@/util/sourceFloor';
import { storeToRefs } from 'pinia';
import type { ComputedRef, Ref } from 'vue';
import type { HiddenGenerationRecord } from '@/type/generation';
import type { GenerationTask } from '@/type/generationTask';

interface SummaryGenerationDraft {
  fromStartEnd: number;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
  userRequirement: string;
}

interface SummaryGenerationPreview {
  bookId: string;
  content: string;
  draftId: null | string;
  generationRecord?: HiddenGenerationRecord;
  raw: string;
  source: { floorEnd?: number; label: string };
  title: string;
  warnings: string[];
}

interface SummaryGenerationState {
  preview: SummaryGenerationPreview | null;
}

interface SummaryGenerationActionsOptions {
  beginPreviewDraft: () => void;
  buildOutputFormat: () => string;
  clearPreviewDraft: () => void;
  draft: SummaryGenerationDraft;
  failedDraftRawOutput: Ref<string>;
  failedDraftTargetBookId: Ref<string>;
  formattedReferences: ComputedRef<string>;
  persistPreviewDraft: (params: Record<string, string>) => void;
  route: Ref<PhoneRoute>;
  selectedReferences: Ref<GenerationReferenceItem[]>;
  state: SummaryGenerationState;
}

/** Owns the complete single-summary generation transaction. */
export function useSummaryGenerationActions(options: SummaryGenerationActionsOptions) {
  const phone = usePhoneStore();
  const prompts = usePromptStore();
  const settingsStore = useSettingsStore();
  const summary = useSummaryStore();
  const { settings } = storeToRefs(settingsStore);
  const adapter = getRegisteredPhoneGenerationAdapter('summary', 'generate');
  const generationSession = useSingleGenerationTaskSession({
    actionId: 'generate',
    appId: 'summary',
    sourcePage: 'generate',
    title: 'AI 总结 · 单次生成',
  });

  async function runGeneration() {
    const bookId = options.route.value.params?.bookId;
    if (!bookId) return;
    const state = options.state;
    options.beginPreviewDraft();
    state.preview = null;
    let task: GenerationTask | null = null;
    try {
      task = generationSession.create({ sourceParams: { bookId }, title: 'AI 总结 · 单次生成' });
      const result = await generateContent(
        adapter,
        {
          appPrompt: prompts.appPrompts.summaries,
          bookId,
          outputFormat: options.buildOutputFormat(),
          userRequirement: options.draft.userRequirement,
        },
        {
          createFailedDraft: input => summary.createFailedDraft(input),
          generationDefaults: {
            resultMode: settings.value.generation.resultMode,
            stream: settings.value.generation.stream,
            tavernPresetName: settings.value.generation.tavernPresetName,
          },
          references: options.formattedReferences.value,
          lifecycle: generationSession.lifecycle(task.id),
          source: {
            fromStartEnd: options.draft.fromStartEnd,
            mode: settings.value.generation.sourceMode,
            rangeText: options.draft.rangeText,
            recentCount: options.draft.recentCount,
            singleMessageId: options.draft.singleMessageId,
          },
          textProvider: settings.value.textProvider,
        },
      );

      if (result.status === 'failed') {
        options.failedDraftRawOutput.value = result.rawOutput;
        options.failedDraftTargetBookId.value = bookId;
        generationSession.complete(task.id, {
          currentLabel: '解析失败草稿已保留',
          resultPage: 'failed-draft',
          resultParams: { bookId, draftId: result.draft.id },
          resultState: 'failed-draft',
          resultTitle: '解析失败草稿',
        });
        toastr.warning('XML 解析失败，已保存到失败草稿');
        void phone.presentGeneratedPage('summary', 'failed-draft', '解析失败草稿', {
          bookId,
          draftId: result.draft.id,
        });
        return;
      }

      if (result.status === 'saved') {
        generationSession.complete(task.id, {
          currentLabel: `已保存总结：${result.saved.entry.title}`,
          resultPage: 'entry',
          resultParams: { bookId, entryId: result.saved.entry.id },
          resultState: 'saved',
          resultTitle: result.saved.entry.title,
        });
        toastr.success('已生成并保存总结');
        void phone.presentGeneratedPage('summary', 'entry', result.saved.entry.title, {
          bookId,
          entryId: result.saved.entry.id,
        });
        return;
      }

      state.preview = {
        bookId,
        content: result.data.content,
        draftId: null,
        generationRecord: result.generationRecord,
        raw: result.rawOutput,
        source: { floorEnd: getSourceLastFloor(result.source), label: result.source.label },
        title: result.data.title,
        warnings: result.warnings,
      };
      options.persistPreviewDraft({ bookId });
      generationSession.complete(task.id, {
        currentLabel: '总结已生成，等待确认',
        resultPage: 'preview',
        resultParams: { bookId },
        resultState: 'preview',
        resultTitle: '生成预览',
      });
      void phone.presentGeneratedPage('summary', 'preview', '生成预览', { bookId });
    } catch (error) {
      if (task) generationSession.fail(task.id, error);
      else toastr.error(error instanceof Error ? error.message : '生成失败，请稍后再试');
    }
  }

  function stopGeneration() {
    generationSession.stop();
  }

  return {
    error: generationSession.error,
    rawOutput: generationSession.rawOutput,
    runGeneration,
    running: generationSession.running,
    stopGeneration,
  };
}
import { useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
