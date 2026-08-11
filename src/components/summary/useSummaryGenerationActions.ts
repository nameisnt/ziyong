import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { generateContent } from '@/core/generationService';
import { usePhoneStore, type PhoneRoute } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import type { GenerationReferenceItem } from '@/util/references';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { getSourceLastFloor } from '@/util/sourceFloor';
import { storeToRefs } from 'pinia';
import type { ComputedRef, Ref } from 'vue';

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
  raw: string;
  source: { floorEnd?: number; label: string };
  title: string;
  warnings: string[];
}

interface SummaryGenerationState {
  error: string;
  generationId: string;
  preview: SummaryGenerationPreview | null;
  rawOutput: string;
  running: boolean;
}

interface SummaryGenerationActionsOptions {
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

  async function runGeneration() {
    const bookId = options.route.value.params?.bookId;
    if (!bookId) return;
    const state = options.state;
    state.error = '';
    options.clearPreviewDraft();
    state.preview = null;
    state.rawOutput = '';

    try {
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
        state.error = result.warnings.join('；') || '模型没有返回可解析的总结 XML';
        options.failedDraftRawOutput.value = result.rawOutput;
        options.failedDraftTargetBookId.value = bookId;
        toastr.warning('XML 解析失败，已保存到失败草稿');
        void phone.presentGeneratedPage('summary', 'failed-draft', '解析失败草稿', {
          bookId,
          draftId: result.draft.id,
        });
        return;
      }

      if (result.status === 'saved') {
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
        raw: result.rawOutput,
        source: { floorEnd: getSourceLastFloor(result.source), label: result.source.label },
        title: result.data.title,
        warnings: result.warnings,
      };
      options.persistPreviewDraft({ bookId });
      void phone.presentGeneratedPage('summary', 'preview', '生成预览', { bookId });
    } catch (error) {
      state.error = error instanceof Error ? error.message : '生成失败，请稍后再试';
    }
  }

  function stopGeneration() {
    const state = options.state;
    if (!state.generationId) return;
    stopGenerationByIdSafe(state.generationId);
    state.running = false;
    state.error = '生成已停止';
  }

  onScopeDispose(() => {
    if (options.state.running && options.state.generationId) stopGenerationByIdSafe(options.state.generationId);
  });

  return { runGeneration, stopGeneration };
}
