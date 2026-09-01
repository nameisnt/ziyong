import { resolveGeneratedExtraBookTitle } from '@/core/extrasGeneration';
import { useExtrasStore } from '@/store/extras';
import type { ExtraBook } from '@/type/extra';

export interface ExtrasBookEditorDraft {
  title: string;
  typeName: string;
}

export interface ExtrasBookGenerationDraft {
  typeId: string;
  typeName: string;
  typePrompt: string;
}

export function useExtrasBookEditorSession(
  bookDraft: ExtrasBookEditorDraft,
  generationDraft: ExtrasBookGenerationDraft,
  options: {
    generateForBook: (bookId: string, book: ExtraBook, chapterId?: string) => Promise<void>;
    getBookId: () => string | undefined;
    getChapterId: () => string | undefined;
    getEditingBook: () => ExtraBook | null;
    navigateToBook: (book: ExtraBook) => void;
  },
) {
  const extras = useExtrasStore();

  function buildPayload(title: string) {
    return {
      title,
      typeId: options.getEditingBook()?.typeId || generationDraft.typeId || undefined,
      typeName: bookDraft.typeName.trim() || generationDraft.typeName.trim() || '未分类番外',
      typePrompt: generationDraft.typeId ? '' : generationDraft.typePrompt,
    };
  }

  function saveBook() {
    const bookId = options.getBookId();
    const editingBook = options.getEditingBook();
    const book =
      editingBook && bookId
        ? extras.updateBook(bookId, buildPayload(bookDraft.title))
        : extras.createBook(buildPayload(bookDraft.title));
    if (book) options.navigateToBook(book);
  }

  async function saveBookAndGenerate() {
    const typeName = bookDraft.typeName.trim() || generationDraft.typeName.trim();
    const title = resolveGeneratedExtraBookTitle(bookDraft.title, typeName);
    const bookId = options.getBookId();
    const editingBook = options.getEditingBook();
    const book =
      editingBook && bookId ? extras.updateBook(bookId, buildPayload(title)) : extras.createBook(buildPayload(title));
    if (!book) return;
    await options.generateForBook(book.id, book, options.getChapterId());
  }

  return { saveBook, saveBookAndGenerate };
}
