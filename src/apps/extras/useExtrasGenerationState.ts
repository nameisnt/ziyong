import type { ExtraChapterGenerationRecord } from '@/type/extra';
import type { ExtraChapterGenerationIntent, ExtraChapterGenerationMode } from '@/core/extrasGeneration';

export function useExtrasGenerationState() {
  const chapterGenerationDraft = reactive({
    fromStartEnd: 20,
    generationIntent: '续写上一章' as ExtraChapterGenerationIntent,
    mode: '续写上一章' as ExtraChapterGenerationMode,
    rangeText: '',
    recentCount: 20,
    singleMessageId: 0,
    parseSummary: false,
    removeSummaryBlock: false,
    summaryFormatHint: '请在章节结果中额外输出 <summary>番外摘要</summary>，摘要应概括关键事件和人物状态。',
    summaryRuleId: '',
    typeGroupId: '',
    typeId: '',
    typeName: '',
    typePrompt: '',
    userRequirement: '',
  });
  const chapterGenerationState = reactive({
    preview: null as null | {
      bookId: string;
      chapterId: string;
      content: string;
      draftId: string | null;
      generationRecord?: ExtraChapterGenerationRecord;
      mode: ExtraChapterGenerationMode;
      raw: string;
      summary: string;
      targetVersionId: string;
      title: string;
      warnings: string[];
    },
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
    preview: null as null | {
      bookId: string;
      content: string;
      coveredChapterIds: string[];
      draftId: string | null;
      enabled: boolean;
      raw: string;
      warnings: string[];
    },
  });

  return {
    chapterGenerationDraft,
    chapterGenerationState,
    summaryGenerationDraft,
    summaryGenerationState,
  };
}
