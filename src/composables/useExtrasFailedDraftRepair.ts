import {
  createExtraChapterGenerationRecord,
  ExtraChapterGenerateConfigSchema,
  parseExtraChapterOutput,
  type ExtraChapterGenerationMode,
} from '@/core/extrasGeneration';
import { useExtrasStore } from '@/store/extras';
import { usePhoneStore } from '@/store/phone';
import type { ExtraChapterGenerationRecord } from '@/type/extra';
import type { FailedGenerationDraft } from '@/type/generation';
import { parseContentXmlResult, parseSimpleXmlResult } from '@/util/generation';
import type { Ref } from 'vue';

export interface ExtraChapterGenerationPreview {
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
}

export interface ExtraSummaryGenerationPreview {
  bookId: string;
  content: string;
  coveredChapterIds: string[];
  draftId: string | null;
  enabled: boolean;
  raw: string;
  warnings: string[];
}

export function useExtrasFailedDraftRepair(options: {
  activeDraft: Readonly<Ref<FailedGenerationDraft | null>>;
  normalizeChapterMode: (value: unknown) => ExtraChapterGenerationMode;
  persistChapterPreviewDraft: (routeParams?: Record<string, string>) => void;
  persistSummaryPreviewDraft: (routeParams?: Record<string, string>) => void;
  rawOutput: Ref<string>;
  setChapterPreview: (preview: ExtraChapterGenerationPreview) => void;
  setSummaryPreview: (preview: ExtraSummaryGenerationPreview) => void;
}) {
  const extras = useExtrasStore();
  const phone = usePhoneStore();

  async function removeFailedDraft(draftId: string) {
    const confirmed = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
      confirmLabel: '删除',
      kind: 'warning',
    });
    if (!confirmed) return;
    extras.deleteFailedDraft(draftId);
    options.rawOutput.value = '';
    if (phone.currentRoute.page === 'failed-draft') {
      phone.replacePage('root', '番外书架');
    }
    toastr.success('已删除失败草稿');
  }

  function updateUnparsedDraft(draft: FailedGenerationDraft, rawOutput: string, warnings: string[]) {
    extras.updateFailedDraft(draft.id, { rawOutput, warnings });
    options.rawOutput.value = rawOutput;
    toastr.warning(warnings.join('；') || '还是没能解析成功');
  }

  function getDraftContextValue<T>(draft: FailedGenerationDraft, key: string, fallback: T) {
    const value = draft.context[key];
    return value === undefined ? fallback : (value as T);
  }

  function reparseFailedDraft() {
    const draft = options.activeDraft.value;
    if (!draft) return;
    const rawOutput = options.rawOutput.value.trim();
    if (!rawOutput) {
      toastr.warning('先补一点可解析的 XML 内容');
      return;
    }

    if (draft.actionId === 'chapter-generate') {
      const config = ExtraChapterGenerateConfigSchema.safeParse(draft.context);
      const parsed = config.success ? parseExtraChapterOutput(rawOutput, config.data) : parseSimpleXmlResult(rawOutput);
      if (!parsed.ok) return updateUnparsedDraft(draft, rawOutput, parsed.warnings);

      extras.updateFailedDraft(draft.id, { rawOutput: parsed.raw, warnings: parsed.warnings });
      const bookId = getDraftContextValue<string>(draft, 'bookId', '');
      const chapterId = getDraftContextValue<string>(draft, 'chapterId', '');
      options.setChapterPreview({
        bookId,
        chapterId,
        content: parsed.data.content,
        draftId: null,
        generationRecord: config.success
          ? {
              ...createExtraChapterGenerationRecord(config.data, draft.source, draft.generationRecord?.replay),
              reasoning: draft.generationRecord?.reasoning,
            }
          : undefined,
        mode: options.normalizeChapterMode(draft.context.chapterMode),
        raw: parsed.raw,
        summary: 'summary' in parsed.data && typeof parsed.data.summary === 'string' ? parsed.data.summary : '',
        targetVersionId: '',
        title: parsed.data.title,
        warnings: parsed.warnings,
      });
      if (!extras.getBook(bookId)) {
        toastr.warning('原番外已经不存在，暂时不能恢复这条章节草稿');
        return;
      }
      const routeParams: Record<string, string> = { bookId };
      if (chapterId) routeParams.chapterId = chapterId;
      options.persistChapterPreviewDraft(routeParams);
      extras.deleteFailedDraft(draft.id);
      options.rawOutput.value = '';
      phone.replacePage('chapter-preview', '番外预览', routeParams);
      return;
    }

    const parsed = parseContentXmlResult(rawOutput);
    if (!parsed.ok) return updateUnparsedDraft(draft, rawOutput, parsed.warnings);

    const bookId = getDraftContextValue(draft, 'bookId', '');
    const coveredChapterIds = getDraftContextValue(draft, 'coveredChapterIds', [] as string[]);
    const enabled = Boolean(getDraftContextValue(draft, 'enabled', true));
    if (!extras.getBook(bookId)) {
      toastr.warning('原番外已经不存在，暂时不能恢复这条章节总结');
      return;
    }
    extras.updateFailedDraft(draft.id, { rawOutput: parsed.raw, warnings: parsed.warnings });
    options.setSummaryPreview({
      bookId,
      content: parsed.data.content,
      coveredChapterIds: [...coveredChapterIds],
      draftId: null,
      enabled,
      raw: parsed.raw,
      warnings: parsed.warnings,
    });
    options.persistSummaryPreviewDraft({ bookId });
    extras.deleteFailedDraft(draft.id);
    options.rawOutput.value = '';
    phone.replacePage('summary-preview', '章节总结预览', { bookId });
  }

  return { removeFailedDraft, reparseFailedDraft };
}
