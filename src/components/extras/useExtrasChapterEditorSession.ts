import { useExtrasStore } from '@/store/extras';
import type { ExtraChapter } from '@/type/extra';

export interface ExtrasChapterEditorDraft {
  content: string;
  title: string;
}

export function useExtrasChapterEditorSession(
  chapterDraft: ExtrasChapterEditorDraft,
  options: {
    getBookId: () => string | undefined;
    getChapterId: () => string | undefined;
    getEditingChapter: () => ExtraChapter | null;
    getVersionId: () => string | undefined;
    navigateToChapter: (title: string, params: { bookId: string; chapterId: string; versionId?: string }) => void;
  },
) {
  const extras = useExtrasStore();

  function saveChapter() {
    const bookId = options.getBookId();
    const chapterId = options.getChapterId();
    const versionId = options.getVersionId();
    if (!bookId) return;

    if (options.getEditingChapter() && chapterId) {
      const chapter = versionId
        ? extras.updateChapterVersion(bookId, chapterId, versionId, chapterDraft)
        : extras.updateChapter(bookId, chapterId, chapterDraft);
      if (!chapter) return;
      options.navigateToChapter(versionId ? chapterDraft.title : chapter.title, {
        bookId,
        chapterId: chapter.id,
        ...(versionId ? { versionId } : {}),
      });
      return;
    }

    const chapter = extras.createChapter(bookId, chapterDraft);
    if (chapter) options.navigateToChapter(chapter.title, { bookId, chapterId: chapter.id });
  }

  return { saveChapter };
}
