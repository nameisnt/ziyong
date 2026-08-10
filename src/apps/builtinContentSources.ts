import type { PhoneContentConversionSource } from '@/core/appRegistry';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useLettersStore } from '@/store/letters';
import { useSummaryStore } from '@/store/summary';
import { useTheaterStore } from '@/store/theater';

export function createSummaryContentSources(): PhoneContentConversionSource[] {
  const summary = useSummaryStore();
  return summary.books.flatMap(book =>
    book.entries.map(entry => ({
      appId: 'summary',
      appName: '总结',
      content: entry.content,
      displayMode: 'markdown',
      entryId: entry.id,
      sourceFloorEnd: entry.sourceFloorEnd,
      sourceLabel: `${book.title} · ${entry.rangeLabel}`,
      tags: [],
      title: entry.title,
    })),
  );
}

export function createDiaryContentSources(): PhoneContentConversionSource[] {
  const diary = useDiaryStore();
  return diary.books.flatMap(book =>
    book.entries.map(entry => ({
      appId: 'diary',
      appName: '日记',
      content: entry.content,
      displayMode: 'markdown',
      entryId: entry.id,
      sourceFloorEnd: entry.sourceFloorEnd,
      sourceLabel: [book.title, entry.occurredAt].filter(Boolean).join(' · '),
      tags: [],
      title: entry.title,
    })),
  );
}

export function createExtrasContentSources(): PhoneContentConversionSource[] {
  const extras = useExtrasStore();
  return extras.books.flatMap(book =>
    book.chapters.map(chapter => ({
      appId: 'extras',
      appName: '番外',
      content: chapter.content,
      displayMode: 'markdown',
      entryId: chapter.id,
      sourceLabel: `${book.title} · 第 ${chapter.chapterNumber} 章`,
      tags: [book.typeName].filter(Boolean),
      title: chapter.title,
    })),
  );
}

export function createForumContentSources(): PhoneContentConversionSource[] {
  const forum = useForumStore();
  return forum.boards.flatMap(board =>
    board.threads.map(thread => ({
      appId: 'forum',
      appName: '论坛',
      content: [
        `主楼 · ${thread.author}`,
        thread.content,
        ...thread.replies.flatMap((reply, index) => [`回复 ${index + 1} · ${reply.author}`, reply.content]),
      ].join('\n\n'),
      displayMode: 'markdown',
      entryId: thread.id,
      sourceLabel: board.name,
      tags: [board.typeName].filter(Boolean),
      title: thread.title,
    })),
  );
}

export function createTheaterContentSources(): PhoneContentConversionSource[] {
  const theater = useTheaterStore();
  return theater.entries.map(entry => ({
    appId: 'theater',
    appName: '小剧场',
    content: entry.content,
    displayMode: entry.renderMode,
    entryId: entry.id,
    sourceLabel: entry.typeName,
    tags: [...entry.participants.map(participant => participant.name), entry.typeName].filter(Boolean),
    title: entry.title,
  }));
}

export function createLettersContentSources(): PhoneContentConversionSource[] {
  const letters = useLettersStore();
  return letters.books.flatMap(book =>
    book.entries.map(entry => ({
      appId: 'letters',
      appName: '书信',
      content: entry.content,
      displayMode: 'markdown',
      entryId: entry.id,
      sourceLabel: `${book.title} · ${entry.sender.name} → ${entry.receiver.name}`,
      tags: [entry.sender.name, entry.receiver.name].filter(Boolean),
      title: entry.title,
    })),
  );
}
