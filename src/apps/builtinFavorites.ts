import type { PhoneFavoriteItem } from '@/core/appRegistry';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useLettersStore } from '@/store/letters';
import { usePhoneStore } from '@/store/phone';
import { areChatScopeKeysEquivalent } from '@/store/chatScoped';
import { parseChatScopeKey } from '@/util/chatArchive';
import { useReaderStore } from '@/store/reader';
import { useSummaryStore } from '@/store/summary';
import { useTheaterStore } from '@/store/theater';

function compactPreview(content: string) {
  return content.replace(/\s+/g, ' ').trim().slice(0, 96);
}

export function createSummaryFavoriteItems(): PhoneFavoriteItem[] {
  const phone = usePhoneStore();
  const summary = useSummaryStore();
  const items: PhoneFavoriteItem[] = [];

  summary.books.forEach(book => {
    book.entries.forEach(entry => {
      if (!entry.favorite) return;
      items.push({
        key: `summary:${book.id}:${entry.id}`,
        appId: 'summary',
        bookId: book.id,
        entryId: entry.id,
        title: entry.title,
        preview: compactPreview(entry.content),
        bookTitle: book.title,
        subtitle: entry.rangeLabel,
        updatedAt: entry.updatedAt,
        exists: () => Boolean(summary.getEntry(book.id, entry.id)),
        open: () =>
          phone.pushRoute('summary', 'entry', entry.title, { bookId: book.id, entryId: entry.id }, 'favorites'),
        removeFavorite: () => {
          if (summary.getEntry(book.id, entry.id)?.favorite) summary.toggleFavorite(book.id, entry.id);
        },
      });
    });
  });

  return items;
}

export function createDiaryFavoriteItems(): PhoneFavoriteItem[] {
  const diary = useDiaryStore();
  const phone = usePhoneStore();
  const items: PhoneFavoriteItem[] = [];

  diary.books.forEach(book => {
    book.entries.forEach(entry => {
      if (!entry.favorite) return;
      const readerNames = entry.readers?.map(reader => reader.name).join('、');
      items.push({
        key: `diary:${book.id}:${entry.id}`,
        appId: 'diary',
        bookId: book.id,
        entryId: entry.id,
        title: entry.kind === 'read-reaction' ? `📖 ${entry.title}` : entry.title,
        preview: compactPreview(entry.content),
        bookTitle: book.title,
        subtitle: readerNames || entry.perspective.name,
        updatedAt: entry.updatedAt,
        exists: () => Boolean(diary.getEntry(book.id, entry.id)),
        open: () => phone.pushRoute('diary', 'entry', entry.title, { bookId: book.id, entryId: entry.id }, 'favorites'),
        removeFavorite: () => {
          if (diary.getEntry(book.id, entry.id)?.favorite) diary.toggleFavorite(book.id, entry.id);
        },
      });
    });
  });

  return items;
}

export function createExtrasFavoriteItems(): PhoneFavoriteItem[] {
  const extras = useExtrasStore();
  const phone = usePhoneStore();
  const items: PhoneFavoriteItem[] = [];

  extras.books.forEach(book => {
    book.chapters.forEach(chapter => {
      if (!chapter.favorite) return;
      items.push({
        key: `extras:${book.id}:${chapter.id}`,
        appId: 'extras',
        bookId: book.id,
        entryId: chapter.id,
        title: chapter.title,
        preview: compactPreview(chapter.content),
        bookTitle: book.title,
        subtitle: `${book.typeName} · 第 ${chapter.chapterNumber} 章`,
        updatedAt: chapter.updatedAt,
        exists: () => Boolean(extras.getChapter(book.id, chapter.id)),
        open: () =>
          phone.pushRoute('extras', 'chapter', chapter.title, { bookId: book.id, chapterId: chapter.id }, 'favorites'),
        removeFavorite: () => {
          if (extras.getChapter(book.id, chapter.id)?.favorite) extras.toggleFavorite(book.id, chapter.id);
        },
      });
    });
  });

  return items;
}

export function createForumFavoriteItems(): PhoneFavoriteItem[] {
  const forum = useForumStore();
  const phone = usePhoneStore();
  const items: PhoneFavoriteItem[] = [];

  forum.boards.forEach(board => {
    board.threads.forEach(thread => {
      if (!thread.favorite) return;
      items.push({
        key: `forum:${board.id}:${thread.id}`,
        appId: 'forum',
        bookId: board.id,
        entryId: thread.id,
        title: thread.title,
        preview: compactPreview(thread.content),
        bookTitle: board.name,
        subtitle: `${thread.author} · ${thread.replies.length} 条回复`,
        updatedAt: thread.updatedAt,
        exists: () => Boolean(forum.getThread(board.id, thread.id)),
        open: () =>
          phone.pushRoute('forum', 'thread', thread.title, { boardId: board.id, threadId: thread.id }, 'favorites'),
        removeFavorite: () => {
          if (forum.getThread(board.id, thread.id)?.favorite) forum.toggleFavorite(board.id, thread.id);
        },
      });
    });
  });

  return items;
}

export function createTheaterFavoriteItems(): PhoneFavoriteItem[] {
  const phone = usePhoneStore();
  const theater = useTheaterStore();

  return theater.entries
    .filter(entry => entry.favorite)
    .map(entry => ({
      key: `theater:${entry.id}`,
      appId: 'theater',
      entryId: entry.id,
      title: entry.title,
      preview: compactPreview(entry.content),
      bookTitle: '小剧场',
      subtitle: entry.typeName,
      updatedAt: entry.updatedAt,
      exists: () => Boolean(theater.getEntry(entry.id)),
      open: () => phone.pushRoute('theater', 'entry', entry.title, { entryId: entry.id }, 'favorites'),
      removeFavorite: () => {
        if (theater.getEntry(entry.id)?.favorite) theater.toggleFavorite(entry.id);
      },
    }));
}

export function createLettersFavoriteItems(): PhoneFavoriteItem[] {
  const letters = useLettersStore();
  const phone = usePhoneStore();
  const items: PhoneFavoriteItem[] = [];

  letters.books.forEach(book => {
    book.entries.forEach(entry => {
      if (!entry.favorite) return;
      items.push({
        key: `letters:${book.id}:${entry.id}`,
        appId: 'letters',
        bookId: book.id,
        entryId: entry.id,
        title: entry.title,
        preview: compactPreview(entry.content),
        bookTitle: book.title,
        subtitle: `${entry.sender.name} -> ${entry.receiver.name}`,
        updatedAt: entry.updatedAt,
        exists: () => Boolean(letters.getEntry(book.id, entry.id)),
        open: () =>
          phone.pushRoute('letters', 'entry', entry.title, { bookId: book.id, entryId: entry.id }, 'favorites'),
        removeFavorite: () => {
          if (letters.getEntry(book.id, entry.id)?.favorite) letters.toggleFavorite(book.id, entry.id);
        },
      });
    });
  });

  return items;
}

export function createReaderFavoriteItems(): PhoneFavoriteItem[] {
  const phone = usePhoneStore();
  const reader = useReaderStore();

  return reader.settings.favorites.map(favorite => ({
    key: `reader:${favorite.id}`,
    appId: 'reader',
    entryId: favorite.messageId,
    title: favorite.title,
    preview: compactPreview(favorite.content),
    bookTitle: favorite.scopeTitle || '聊天书库',
    subtitle: favorite.sourceLabel,
    updatedAt: favorite.updatedAt || favorite.createdAt,
    exists: () => Boolean(reader.settings.favorites.find(item => item.id === favorite.id)),
    open: () => {
      const scope = parseChatScopeKey(favorite.scopeKey);
      const isCurrent = areChatScopeKeysEquivalent(favorite.scopeKey, phone.currentTavernScopeKey);
      const characterId = Number(scope.ownerId);
      const params: Record<string, string> = { messageId: favorite.messageId, readerTarget: 'current' };
      if (!isCurrent && scope.kind === 'char' && Number.isInteger(characterId)) {
        Object.assign(params, {
          characterId: String(characterId),
          chatId: scope.chatId,
          chatTitle: favorite.scopeTitle,
          ownerName: '历史角色',
          readerTarget: 'history',
        });
      }
      phone.pushRoute('reader', 'detail', favorite.title, params, 'favorites');
    },
    removeFavorite: () => reader.removeFavorite(favorite.id),
  }));
}
