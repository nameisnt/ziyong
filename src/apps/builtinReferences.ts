import type { PhoneReferenceBranchNode, PhoneReferenceLeafNode, PhoneReferenceTreeNode } from '@/core/appRegistry';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useLettersStore } from '@/store/letters';
import { useSummaryStore } from '@/store/summary';
import { useTheaterStore } from '@/store/theater';
import type { GenerationReferenceItem } from '@/util/references';
import type { HiddenGenerationRecord } from '@/type/generation';

function makeItem(input: {
  content: string;
  floorEnd?: number;
  id: string;
  sourcePath: string[];
  timeLabel?: string;
  title: string;
  updatedAt?: string;
}): GenerationReferenceItem {
  return {
    content: input.content,
    floorEnd: input.floorEnd,
    id: input.id,
    sourcePath: input.sourcePath,
    timeLabel: input.timeLabel,
    title: input.title,
    updatedAt: input.updatedAt,
  };
}

/**
 * 取这次生成实际用到的最后一层：世界书里的旧条目可能没有生成记录，取不到就不显示。
 * 引用列表行尾的数字用它，而不是再去解析时长的文本。
 */
function lastSourceFloor(record: HiddenGenerationRecord | undefined) {
  const messageIds = record?.replay?.source?.messageIds ?? [];
  if (!messageIds.length) return undefined;
  return messageIds.reduce((last, messageId) => Math.max(last, messageId), 0);
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
    children: children.filter(child =>
      child.kind === 'branch' ? child.children.length > 0 : Boolean(child.item.content.trim()),
    ),
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
  return branch(
    'app:extras',
    '番外',
    extras.books.map(book => {
      const chapters = [...book.chapters]
        .sort((left, right) => left.chapterNumber - right.chapterNumber)
        .map(chapter =>
          leaf(
            makeItem({
              content: chapter.content,
              floorEnd: chapter.chapterNumber,
              id: `extras:${book.id}:chapter:${chapter.id}`,
              sourcePath: ['番外', book.title],
              timeLabel: `第 ${chapter.chapterNumber} 章`,
              title: `第 ${chapter.chapterNumber} 章 · ${chapter.title}`,
              updatedAt: chapter.updatedAt,
            }),
          ),
        );
      const summaries = sortByUpdatedAt(book.summaries).map(summaryItem =>
        leaf(
          makeItem({
            content: summaryItem.content,
            id: `extras:${book.id}:summary:${summaryItem.id}`,
            sourcePath: ['番外', book.title, '章节总结'],
            timeLabel: '章节总结',
            title: '章节总结',
            updatedAt: summaryItem.updatedAt,
          }),
        ),
      );
      return branch(`extras:${book.id}`, book.title, [...chapters, ...summaries]);
    }),
  );
}

export function createDiaryReferenceTree() {
  const diary = useDiaryStore();
  return branch(
    'app:diary',
    '日记',
    diary.books.map(book =>
      branch(
        `diary:${book.id}`,
        book.title,
        sortByUpdatedAt(book.entries).map(entry =>
          leaf(
            makeItem({
              content: entry.content,
              floorEnd: entry.sourceFloorEnd ?? lastSourceFloor(entry.generationRecord),
              id: `diary:${book.id}:entry:${entry.id}`,
              sourcePath: ['日记', book.title],
              timeLabel: entry.occurredAt,
              title: entry.title,
              updatedAt: entry.updatedAt,
            }),
          ),
        ),
      ),
    ),
  );
}

export function createLettersReferenceTree() {
  const letters = useLettersStore();
  return branch(
    'app:letters',
    '书信',
    letters.books.map(book =>
      branch(
        `letters:${book.id}`,
        book.title,
        sortByUpdatedAt(book.entries).map(entry =>
          leaf(
            makeItem({
              content: entry.content,
              floorEnd: lastSourceFloor(entry.generationRecord),
              id: `letters:${book.id}:entry:${entry.id}`,
              sourcePath: ['书信', book.title],
              title: entry.title,
              updatedAt: entry.updatedAt,
            }),
          ),
        ),
      ),
    ),
  );
}

export function createTheaterReferenceTree() {
  const theater = useTheaterStore();
  const groups = new Map<string, typeof theater.entries>();
  theater.entries.forEach(entry => {
    const key = entry.typeName || '未分类小剧场';
    groups.set(key, [...(groups.get(key) || []), entry]);
  });
  return branch(
    'app:theater',
    '小剧场',
    Array.from(groups.entries()).map(([typeName, entries]) =>
      branch(
        `theater:${typeName}`,
        typeName,
        sortByUpdatedAt(entries).map(entry =>
          leaf(
            makeItem({
              content: entry.content,
              floorEnd: lastSourceFloor(entry.generationRecord),
              id: `theater:entry:${entry.id}`,
              sourcePath: ['小剧场', typeName],
              timeLabel: entry.typeName || typeName,
              title: entry.title,
              updatedAt: entry.updatedAt,
            }),
          ),
        ),
      ),
    ),
  );
}

export function createSummaryReferenceTree() {
  const summary = useSummaryStore();
  return branch(
    'app:summary',
    '总结',
    summary.books.map(book =>
      branch(
        `summary:${book.id}`,
        book.title,
        sortByUpdatedAt(book.entries).map(entry =>
          leaf(
            makeItem({
              content: entry.content,
              floorEnd: entry.sourceFloorEnd,
              id: `summary:${book.id}:entry:${entry.id}`,
              sourcePath: ['总结', book.title],
              timeLabel: entry.rangeLabel,
              title: entry.title,
              updatedAt: entry.updatedAt,
            }),
          ),
        ),
      ),
    ),
  );
}

export function createForumReferenceTree() {
  const forum = useForumStore();
  return branch(
    'app:forum',
    '论坛',
    forum.boards.map(board =>
      branch(
        `forum:${board.id}`,
        board.name,
        sortByUpdatedAt(board.threads).map(thread =>
          branch(`forum:${board.id}:thread:${thread.id}`, thread.title, [
            leaf(
              makeItem({
                content: `帖子标题：${thread.title}\n主楼作者：${thread.author}（楼主）\n\n${thread.content}`,
                floorEnd: lastSourceFloor(thread.generationRecord),
                id: `forum:${board.id}:thread:${thread.id}:main`,
                sourcePath: ['论坛', board.name, thread.title],
                title: '仅引用主题',
                updatedAt: thread.updatedAt,
              }),
            ),
            leaf(
              makeItem({
                content: [
                  `帖子标题：${thread.title}`,
                  `主楼作者：${thread.author}（楼主）`,
                  thread.content,
                  ...thread.replies.flatMap((reply, index) => [
                    `第 ${index + 1} 层 · ${reply.author}${reply.isOriginalPoster ? '（楼主）' : ''}`,
                    reply.content,
                  ]),
                ].join('\n\n'),
                floorEnd: lastSourceFloor(thread.generationRecord),
                id: `forum:${board.id}:thread:${thread.id}:full`,
                sourcePath: ['论坛', board.name, thread.title],
                title: `引用主题和全部回复（${thread.replies.length}）`,
                updatedAt: thread.updatedAt,
              }),
            ),
          ]),
        ),
      ),
    ),
  );
}
