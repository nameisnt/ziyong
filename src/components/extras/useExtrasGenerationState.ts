import type { ExtraChapterGenerationRecord } from '@/type/extra';
import type { ExtraChapterGenerationMode } from '@/core/extrasGeneration';
import { stopGenerationByIdSafe } from '@/util/runtime';

export function useExtrasGenerationState() {
  const chapterGenerationDraft = reactive({
    fromStartEnd: 20,
    mode: '续写上一章' as ExtraChapterGenerationMode,
    rangeText: '',
    recentCount: 20,
    singleMessageId: 0,
    typeId: '',
    typeName: '',
    typePrompt: '',
    userRequirement: '',
  });
  const chapterGenerationState = reactive({
    error: '',
    generationId: '',
    preview: null as null | {
      bookId: string;
      chapterId: string;
      content: string;
      draftId: string | null;
      generationRecord?: ExtraChapterGenerationRecord;
      mode: ExtraChapterGenerationMode;
      raw: string;
      title: string;
      warnings: string[];
    },
    rawOutput: '',
    running: false,
  });
  const summaryGenerationDraft = reactive({
    coveredChapterIds: [] as string[],
    enabled: true,
    fromStartEnd: 20,
    rangeText: '',
    recentCount: 20,
    singleMessageId: 0,
    userRequirement: '',
  });
  const summaryGenerationState = reactive({
    error: '',
    generationId: '',
    preview: null as null | {
      bookId: string;
      content: string;
      coveredChapterIds: string[];
      draftId: string | null;
      enabled: boolean;
      raw: string;
      warnings: string[];
    },
    rawOutput: '',
    running: false,
  });

  onScopeDispose(() => {
    if (chapterGenerationState.running && chapterGenerationState.generationId) {
      stopGenerationByIdSafe(chapterGenerationState.generationId);
    }
    if (summaryGenerationState.running && summaryGenerationState.generationId) {
      stopGenerationByIdSafe(summaryGenerationState.generationId);
    }
  });

  return {
    chapterGenerationDraft,
    chapterGenerationState,
    summaryGenerationDraft,
    summaryGenerationState,
  };
}
