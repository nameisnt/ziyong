import { useExtrasStore } from '@/store/extras';
import { parseContentXmlResult } from '@/util/generation';

export interface ExtrasSummaryPreviewSessionPreview {
  bookId: string;
  content: string;
  coveredChapterIds: string[];
  draftId: null | string;
  enabled: boolean;
  raw: string;
  warnings: string[];
}

/** Handles saving and repairing an unsaved summary preview outside the Extras route coordinator. */
export function useExtrasSummaryPreviewSession(options: {
  clearPreviewDraft: () => void;
  deleteFailedDraft: (draftId: string) => void;
  getPreview: () => ExtrasSummaryPreviewSessionPreview | null;
  navigateToBook: (title: string, bookId: string) => void;
  notify: {
    success: (message: string) => void;
    warning: (message: string) => void;
  };
  setPreview: (preview: ExtrasSummaryPreviewSessionPreview | null) => void;
}) {
  const extras = useExtrasStore();

  function savePreview() {
    const preview = options.getPreview();
    if (!preview) return;

    const summary = extras.createSummary(preview.bookId, {
      content: preview.content,
      coveredChapterIds: [...preview.coveredChapterIds],
      enabled: preview.enabled,
    });
    if (!summary) {
      options.notify.warning('目标番外不存在，无法保存章节总结');
      return;
    }
    if (preview.draftId) {
      options.deleteFailedDraft(preview.draftId);
    }
    options.clearPreviewDraft();
    options.setPreview(null);
    const book = extras.getBook(preview.bookId);
    options.notify.success('已保存章节总结');
    if (book) options.navigateToBook(book.title, book.id);
  }

  function reparseRaw() {
    const preview = options.getPreview();
    if (!preview) return false;
    const rawOutput = preview.raw.trim();
    if (!rawOutput) {
      options.notify.warning('先补一点可解析的 XML 内容');
      return false;
    }

    const parsed = parseContentXmlResult(rawOutput);
    if (!parsed.ok) {
      preview.raw = rawOutput;
      preview.warnings = parsed.warnings;
      options.notify.warning(parsed.warnings.join('；') || '还是没能解析成功');
      return false;
    }

    preview.content = parsed.data.content;
    preview.raw = parsed.raw;
    preview.warnings = parsed.warnings;
    options.notify.success('已按原始输出重新解析');
    return true;
  }

  return { reparseRaw, savePreview };
}
