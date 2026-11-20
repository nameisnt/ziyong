import { useExtrasStore } from '@/store/extras';
import type { ExtraBook, ExtraChapter } from '@/type/extra';
import { deleteContentVersionWithFallback } from '@/util/deleteContentVersion';

export function useExtrasDeletionSession(options: {
  confirmDelete: (message: string, confirmLabel: string) => Promise<boolean>;
  getActiveBook: () => ExtraBook | null;
  getActiveChapter: () => ExtraChapter | null;
  getViewedVersionId: () => string;
  goHome: () => void;
  navigateToBook: (book: ExtraBook) => void;
  navigateToChapter: (title: string, params: { bookId: string; chapterId: string; versionId: string }) => void;
  navigateToRoot: () => void;
  notifySuccess: (message: string) => void;
}) {
  const extras = useExtrasStore();

  async function removeBook(bookId: string) {
    const book = extras.getBook(bookId);
    const shouldDelete = await options.confirmDelete(
      `要删除番外“${book?.title || '未命名番外'}”吗？章节、大纲和章节总结都会一起删除。`,
      '删除',
    );
    if (!shouldDelete) return;
    extras.deleteBook(bookId);
    options.navigateToRoot();
    options.notifySuccess('已删除番外');
  }

  async function removeChapterVersion(versionId: string) {
    const book = options.getActiveBook();
    const chapter = options.getActiveChapter();
    if (!book || !chapter) return;
    await deleteContentVersionWithFallback({
      versions: chapter.versions,
      versionId,
      confirm: options.confirmDelete,
      confirmLabel: '删除此版本',
      confirmMessage: ({ index, total }) => `要删除当前查看的版本 ${index}/${total} 吗？`,
      remove: () => extras.deleteChapterVersion(book.id, chapter.id, versionId),
      activate: previous => {
        extras.activateChapterVersion(book.id, chapter.id, previous.id);
      },
      navigate: result => {
        const nextChapter = options.getActiveChapter() || result.chapter;
        options.navigateToChapter(nextChapter.title || result.activeVersion.title, {
          bookId: book.id,
          chapterId: result.chapter.id,
          versionId: result.chapter.activeVersionId,
        });
      },
      successMessage: '已删除当前章节版本',
      notifySuccess: options.notifySuccess,
    });
  }

  async function removeChapter(bookId: string, chapterId: string) {
    const chapter = extras.getChapter(bookId, chapterId);
    if (chapter && chapter.versions.length > 1) {
      await removeChapterVersion(options.getViewedVersionId());
      return;
    }
    const shouldDelete = await options.confirmDelete(
      `要删除章节“${chapter?.title || '未命名章节'}”的最后一个版本吗？删除后这条章节记录也会移除。`,
      '删除',
    );
    if (!shouldDelete) return;
    extras.deleteChapter(bookId, chapterId);
    const book = extras.getBook(bookId);
    if (!book) {
      options.goHome();
      options.notifySuccess('已删除章节');
      return;
    }
    options.navigateToBook(book);
    options.notifySuccess('已删除章节');
  }

  return { removeBook, removeChapter, removeChapterVersion };
}
