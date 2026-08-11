import { saveExtraChapterPreview, type ExtraChapterGenerationMode } from '@/core/extrasGeneration';
import type { ExtraChapterGenerationRecord } from '@/type/extra';
import { parseSimpleXmlResult } from '@/util/generation';

export interface ExtraChapterPreviewSessionPreview {
  bookId: string;
  chapterId: string;
  content: string;
  draftId: null | string;
  generationRecord?: ExtraChapterGenerationRecord;
  mode: ExtraChapterGenerationMode;
  raw: string;
  targetVersionId: string;
  title: string;
  warnings: string[];
}

interface ExtraChapterPreviewSessionOptions {
  clearPreviewDraft: () => void;
  deleteFailedDraft: (draftId: string) => void;
  getFallbackRouteParams: () => { bookId?: string; chapterId?: string };
  getPreview: () => ExtraChapterPreviewSessionPreview | null;
  navigateToChapter: (title: string, params: { bookId: string; chapterId: string; versionId?: string }) => void;
  notify: {
    success: (message: string) => void;
    warning: (message: string) => void;
  };
  setPreview: (preview: ExtraChapterPreviewSessionPreview | null) => void;
  store: Parameters<typeof saveExtraChapterPreview>[0];
}

/** Handles the unsaved chapter preview lifecycle independently from the Extras root page. */
export function useExtrasChapterPreviewSession(options: ExtraChapterPreviewSessionOptions) {
  function savePreview() {
    const preview = options.getPreview();
    if (!preview) return;

    const fallbackRouteParams = options.getFallbackRouteParams();
    const bookId = preview.bookId || fallbackRouteParams.bookId;
    if (!bookId) {
      options.notify.warning('草稿缺少目标番外信息，无法保存章节');
      return;
    }
    const chapterId = preview.chapterId || fallbackRouteParams.chapterId;
    const saved = saveExtraChapterPreview(options.store, {
      bookId,
      chapterId,
      content: preview.content,
      generationRecord: preview.generationRecord,
      mode: preview.mode,
      title: preview.title,
    });

    if (!saved) {
      options.notify.warning('目标番外不存在，无法保存章节');
      return;
    }
    if (preview.draftId) {
      options.deleteFailedDraft(preview.draftId);
    }
    options.clearPreviewDraft();
    options.setPreview(null);
    options.notify.success(preview.mode === '重写当前章节' ? '已保存重写章节' : '已保存新章节');
    options.navigateToChapter(preview.title, {
      bookId,
      chapterId: saved.chapter.id,
      ...(saved.versionId ? { versionId: saved.versionId } : {}),
    });
  }

  function reparseRaw() {
    const preview = options.getPreview();
    if (!preview) return false;

    const rawOutput = preview.raw.trim();
    if (!rawOutput) {
      options.notify.warning('先补一点可解析的 XML 内容');
      return false;
    }

    const parsed = parseSimpleXmlResult(rawOutput);
    if (!parsed.ok) {
      preview.raw = rawOutput;
      preview.warnings = parsed.warnings;
      options.notify.warning(parsed.warnings.join('；') || '还是没能解析成功');
      return false;
    }

    preview.content = parsed.data.content;
    preview.raw = parsed.raw;
    preview.title = parsed.data.title;
    preview.warnings = parsed.warnings;
    options.notify.success('已按原始输出重新解析');
    return true;
  }

  return { reparseRaw, savePreview };
}
