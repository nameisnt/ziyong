import { useExtrasStore } from '@/store/extras';
import type { ExtraBook, ExtraSummary } from '@/type/extra';

export interface ExtrasSummaryEditorDraft {
  content: string;
  coveredChapterIds: string[];
  enabled: boolean;
}

export function useExtrasSummaryEditorSession(
  summaryDraft: ExtrasSummaryEditorDraft,
  options: {
    confirmDelete: (message: string) => Promise<boolean>;
    getBookId: () => string | undefined;
    getEditingSummary: () => ExtraSummary | null;
    getSummaryId: () => string | undefined;
    navigateToBook: (book: ExtraBook) => void;
    notifySuccess: (message: string) => void;
  },
) {
  const extras = useExtrasStore();

  function saveSummary() {
    const bookId = options.getBookId();
    const summaryId = options.getSummaryId();
    if (!bookId || !summaryDraft.content.trim()) return;

    if (options.getEditingSummary() && summaryId) {
      extras.updateSummary(bookId, summaryId, summaryDraft);
    } else {
      extras.createSummary(bookId, summaryDraft);
    }
    const book = extras.getBook(bookId);
    if (book) options.navigateToBook(book);
  }

  async function removeSummary(bookId: string, summaryId: string) {
    const summary = extras.getSummary(bookId, summaryId);
    const shouldDelete = await options.confirmDelete(
      `要删除这条章节总结吗？${summary?.enabled ? '当前启用状态也会一并移除。' : ''}`,
    );
    if (!shouldDelete) return;
    extras.deleteSummary(bookId, summaryId);
    options.notifySuccess('已删除章节总结');
  }

  return { removeSummary, saveSummary };
}
