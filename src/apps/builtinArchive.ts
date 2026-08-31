import type { PhoneArchiveDomain, PhoneArchiveProvider } from '@/core/appRegistry';
import { diaryField } from '@/store/diary';
import { extrasField } from '@/store/extras';
import { forumField } from '@/store/forum';
import { lettersField } from '@/store/letters';
import { summaryField } from '@/store/summary';
import { theaterField } from '@/store/theater';
import { DiaryScopeDataSchema } from '@/type/diary';
import { ExtraScopeDataSchema } from '@/type/extra';
import { ForumScopeDataSchema } from '@/type/forum';
import { LettersScopeDataSchema } from '@/type/letter';
import { SummaryScopeDataSchema } from '@/type/summary';
import { TheaterScopeDataSchema } from '@/type/theater';

function makeDomain(
  appId: string,
  label: string,
  collectionLabel: string,
  itemLabel: string,
  collections: number,
  entries: PhoneArchiveDomain['entries'],
): PhoneArchiveDomain {
  return { appId, collectionLabel, collections, entries, itemLabel, items: entries.length, label };
}

export function createSummaryArchiveProvider(): PhoneArchiveProvider {
  return {
    appId: 'summary',
    collectionLabel: '总结集',
    field: summaryField,
    itemLabel: '总结',
    label: '总结',
    collect(raw) {
      const data = SummaryScopeDataSchema.parse(SummaryScopeDataSchema.safeParse(raw).success ? raw : {});
      const entries = data.books.flatMap(book =>
        book.entries.map(entry => ({
          id: entry.id,
          subtitle: `${book.title} · ${entry.rangeLabel}`,
          title: entry.title,
        })),
      );
      return makeDomain('summary', '总结', '总结集', '总结', data.books.length, entries);
    },
  };
}

export function createDiaryArchiveProvider(): PhoneArchiveProvider {
  return {
    appId: 'diary',
    collectionLabel: '日记本',
    field: diaryField,
    itemLabel: '篇',
    label: '日记',
    collect(raw) {
      const data = DiaryScopeDataSchema.parse(DiaryScopeDataSchema.safeParse(raw).success ? raw : {});
      const entries = data.books.flatMap(book =>
        book.entries.map(entry => ({
          id: entry.id,
          subtitle: `${book.title}${entry.occurredAt ? ` · ${entry.occurredAt}` : ''}`,
          title: entry.title,
        })),
      );
      return makeDomain('diary', '日记', '日记本', '篇', data.books.length, entries);
    },
  };
}

export function createExtrasArchiveProvider(): PhoneArchiveProvider {
  return {
    appId: 'extras',
    collectionLabel: '书本',
    field: extrasField,
    itemLabel: '章/总结',
    label: '番外',
    collect(raw) {
      const data = ExtraScopeDataSchema.parse(ExtraScopeDataSchema.safeParse(raw).success ? raw : {});
      const entries = data.books.flatMap(book => [
        ...book.chapters.map(chapter => ({
          id: chapter.id,
          subtitle: book.title,
          title: `第 ${chapter.chapterNumber} 章 · ${chapter.title}`,
        })),
        ...book.summaries.map(summary => ({
          id: summary.id,
          subtitle: `${book.title} · ${summary.coveredChapterIds.length} 章`,
          title: '章节总结',
        })),
      ]);
      return makeDomain('extras', '番外', '书本', '章/总结', data.books.length, entries);
    },
  };
}

export function createForumArchiveProvider(): PhoneArchiveProvider {
  return {
    appId: 'forum',
    collectionLabel: '板块',
    field: forumField,
    itemLabel: '主题帖',
    label: '论坛',
    collect(raw) {
      const data = ForumScopeDataSchema.parse(ForumScopeDataSchema.safeParse(raw).success ? raw : {});
      const entries = data.boards.flatMap(board =>
        board.threads.map(thread => ({
          id: thread.id,
          subtitle: `${board.name} · ${thread.author}`,
          title: thread.title,
        })),
      );
      return makeDomain('forum', '论坛', '板块', '主题帖', data.boards.length, entries);
    },
  };
}

export function createTheaterArchiveProvider(): PhoneArchiveProvider {
  return {
    appId: 'theater',
    collectionLabel: '合集',
    field: theaterField,
    itemLabel: '篇',
    label: '小剧场',
    collect(raw) {
      const data = TheaterScopeDataSchema.parse(TheaterScopeDataSchema.safeParse(raw).success ? raw : {});
      const entries = data.entries.map(entry => ({
        id: entry.id,
        subtitle: entry.typeName,
        title: entry.title,
      }));
      return makeDomain('theater', '小剧场', '合集', '篇', data.entries.length ? 1 : 0, entries);
    },
  };
}

export function createLettersArchiveProvider(): PhoneArchiveProvider {
  return {
    appId: 'letters',
    collectionLabel: '信箱',
    field: lettersField,
    itemLabel: '封',
    label: '书信',
    collect(raw) {
      const data = LettersScopeDataSchema.parse(LettersScopeDataSchema.safeParse(raw).success ? raw : {});
      const entries = data.books.flatMap(book =>
        book.entries.map(entry => ({
          id: entry.id,
          subtitle: `${book.title} · ${entry.sender.name} → ${entry.receiver.name}`,
          title: entry.title,
        })),
      );
      return makeDomain('letters', '书信', '信箱', '封', data.books.length, entries);
    },
  };
}
