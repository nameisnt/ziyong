import type { PhoneReferenceBranchNode, PhoneReferenceLeafNode, PhoneReferenceTreeNode } from '@/core/appRegistry';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useLettersStore } from '@/store/letters';
import { useSummaryStore } from '@/store/summary';
import { useTheaterStore } from '@/store/theater';
import type { GenerationReferenceItem } from '@/util/references';

function makeItem(input: {
  content: string;
  id: string;
  sourcePath: string[];
  timeLabel?: string;
  title: string;
  updatedAt?: string;
}): GenerationReferenceItem {
  return {
    content: input.content,
    id: input.id,
    sourcePath: input.sourcePath,
    timeLabel: input.timeLabel,
    title: input.title,
    updatedAt: input.updatedAt,
  };
}

function leaf(item: GenerationReferenceItem): PhoneReferenceLeafNode {
  return {
    id: item.id,
    item,
    kind: 'leaf',
  };
}

function branch(id: string, label: string, children: PhoneReferenceTreeNode[]): PhoneReferenceBranchNode {
  return {
    children: children.filter(child => child.kind === 'branch' ? child.children.length > 0 : Boolean(child.item.content.trim())),
    id,
    kind: 'branch',
    label,
  };
}

function sortByUpdatedAt<T extends { updatedAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || ''));
}

export function createExtrasReferenceTree() {
  const extras = useExtrasStore();
  return branch('app:extras', '番外', extras.books.map(book => {
    const chapters = [...book.chapters]
      .sort((left, right) => left.chapterNumber - right.chapterNumber)
      .map(chapter => leaf(makeItem({
        content: chapter.content,
        id: `extras:${book.id}:chapter:${chapter.id}`,
        sourcePath: ['番外', book.title],
        timeLabel: `第 ${chapter.chapterNumber} 章`,
        title: `第 ${chapter.chapterNumber} 章 · ${chapter.title}`,
        updatedAt: chapter.updatedAt,
      })));
    const summaries = sortByUpdatedAt(book.summaries).map(summaryItem => leaf(makeItem({
      content: summaryItem.content,
      id: `extras:${book.id}:summary:${summaryItem.id}`,
      sourcePath: ['番外', book.title, '章节总结'],
      timeLabel: '章节总结',
      title: '章节总结',
      updatedAt: summaryItem.updatedAt,
    })));
    return branch(`extras:${book.id}`, book.title, [...chapters, ...summaries]);
  }));
}

export function createDiaryReferenceTree() {
  const diary = useDiaryStore();
  return branch('app:diary', '日记', diary.books.map(book => branch(
    `diary:${book.id}`,
    book.title,
    sortByUpdatedAt(book.entries).map(entry => leaf(makeItem({
      content: entry.content,
      id: `diary:${book.id}:entry:${entry.id}`,
      sourcePath: ['日记', book.title],
      timeLabel: entry.occurredAt,
      title: entry.title,
      updatedAt: entry.updatedAt,
    }))),
  )));
}

export function createLettersReferenceTree() {
  const letters = useLettersStore();
  return branch('app:letters', '书信', letters.books.map(book => branch(
    `letters:${book.id}`,
    book.title,
    sortByUpdatedAt(book.entries).map(entry => leaf(makeItem({
      content: entry.content,
      id: `letters:${book.id}:entry:${entry.id}`,
      sourcePath: ['书信', book.title],
      title: entry.title,
      updatedAt: entry.updatedAt,
    }))),
  )));
}

export function createTheaterReferenceTree() {
  const theater = useTheaterStore();
  const groups = new Map<string, typeof theater.entries>();
  theater.entries.forEach(entry => {
    const key = entry.typeName || '未分类小剧场';
    groups.set(key, [...(groups.get(key) || []), entry]);
  });
  return branch('app:theater', '小剧场', Array.from(groups.entries()).map(([typeName, entries]) => branch(
    `theater:${typeName}`,
    typeName,
    sortByUpdatedAt(entries).map(entry => leaf(makeItem({
      content: entry.content,
      id: `theater:entry:${entry.id}`,
      sourcePath: ['小剧场', typeName],
      timeLabel: entry.typeName || typeName,
      title: entry.title,
      updatedAt: entry.updatedAt,
    }))),
  )));
}

export function createSummaryReferenceTree() {
  const summary = useSummaryStore();
  return branch('app:summary', '总结', summary.books.map(book => branch(
    `summary:${book.id}`,
    book.title,
    sortByUpdatedAt(book.entries).map(entry => leaf(makeItem({
      content: entry.content,
      id: `summary:${book.id}:entry:${entry.id}`,
      sourcePath: ['总结', book.title],
      timeLabel: entry.rangeLabel,
      title: entry.title,
      updatedAt: entry.updatedAt,
    }))),
  )));
}

export function createForumReferenceTree() {
  const forum = useForumStore();
  return branch('app:forum', '论坛', forum.boards.map(board => branch(
    `forum:${board.id}`,
    board.name,
    sortByUpdatedAt(board.threads).map(thread => branch(
      `forum:${board.id}:thread:${thread.id}`,
      thread.title,
      [
        leaf(makeItem({
          content: `作者：${thread.author}\n${thread.content}`,
          id: `forum:${board.id}:thread:${thread.id}:main`,
          sourcePath: ['论坛', board.name, thread.title],
          title: `主楼 · ${thread.author}`,
          updatedAt: thread.updatedAt,
        })),
        ...sortByUpdatedAt(thread.replies).map(reply => leaf(makeItem({
          content: `作者：${reply.author}\n${reply.content}`,
          id: `forum:${board.id}:thread:${thread.id}:reply:${reply.id}`,
          sourcePath: ['论坛', board.name, thread.title],
          title: `回复 · ${reply.author}`,
          updatedAt: reply.updatedAt,
        }))),
      ],
    )),
  )));
}
