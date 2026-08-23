import { useSummaryStore } from '@/store/summary';
import type { SummaryBook } from '@/type/summary';

export function useSummaryBookSession(options: {
  confirmDelete: (message: string) => Promise<boolean>;
  getBookId: () => string | undefined;
  getPage: () => string;
  getTitle: () => string;
  navigateToBook: (book: SummaryBook) => void;
  navigateToGenerate: (bookId: string) => void;
  navigateToRoot: () => void;
  notifySuccess: (message: string) => void;
}) {
  const summary = useSummaryStore();

  function saveBook() {
    if (options.getPage() === 'create-book') {
      options.navigateToBook(summary.createBook(options.getTitle()));
      return;
    }

    const bookId = options.getBookId();
    if (options.getPage() !== 'edit-book' || !bookId) return;
    const book = summary.renameBook(bookId, options.getTitle());
    if (book) options.navigateToBook(book);
  }

  function saveBookAndGenerate() {
    if (options.getPage() !== 'create-book') return;
    const book = summary.createBook(options.getTitle());
    options.navigateToGenerate(book.id);
  }

  async function removeBook(bookId: string) {
    const book = summary.getBook(bookId);
    const shouldDelete = await options.confirmDelete(
      `要删除总结集“${book?.title || '未命名总结集'}”吗？里面的条目也会一起删除。`,
    );
    if (!shouldDelete) return;
    summary.deleteBook(bookId);
    if (options.getBookId() === bookId) options.navigateToRoot();
    options.notifySuccess('已删除总结集');
  }

  return { removeBook, saveBook, saveBookAndGenerate };
}
