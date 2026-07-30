import type {
  PhoneContentOverview,
  PhoneContentStatsContribution,
} from '@/core/appRegistry';
import { readChatScopedEnvelope } from '@/store/chatScoped';
import { diaryField } from '@/store/diary';
import { extrasField } from '@/store/extras';
import { forumField } from '@/store/forum';
import { lettersField } from '@/store/letters';
import { summaryField } from '@/store/summary';
import { theaterField } from '@/store/theater';
import { DiaryScopeDataSchema, type DiaryScopeData } from '@/type/diary';
import { ExtraScopeDataSchema, type ExtraScopeData } from '@/type/extra';
import { ForumScopeDataSchema, type ForumScopeData } from '@/type/forum';
import { LettersScopeDataSchema, type LettersScopeData } from '@/type/letter';
import { SummaryScopeDataSchema, type SummaryScopeData } from '@/type/summary';
import { TheaterScopeDataSchema, type TheaterScopeData } from '@/type/theater';
import { parsePrettified } from '@/util/zod';
import type { ZodType } from 'zod';

interface ContentAccumulator {
  collections: number;
  items: number;
  chars: number;
  latestUpdatedAt: string;
}

interface ContentDomainDefinition<T> {
  id: string;
  label: string;
  collectionLabel: string;
  itemLabel: string;
  field: string;
  schema: ZodType<T>;
  collectScope: (scopeData: T) => ContentAccumulator;
}

function createContentAccumulator(): ContentAccumulator {
  return {
    chars: 0,
    collections: 0,
    items: 0,
    latestUpdatedAt: '',
  };
}

function getLatestIso(left: string, right?: string) {
  if (!right) return left;
  if (!left) return right;
  return right.localeCompare(left) > 0 ? right : left;
}

function addLatest(accumulator: ContentAccumulator, updatedAt?: string) {
  accumulator.latestUpdatedAt = getLatestIso(accumulator.latestUpdatedAt, updatedAt);
}

function addCollection(accumulator: ContentAccumulator, updatedAt?: string) {
  accumulator.collections += 1;
  addLatest(accumulator, updatedAt);
}

function addContentItem(accumulator: ContentAccumulator, content: string, updatedAt?: string) {
  accumulator.items += 1;
  accumulator.chars += content.trim().length;
  addLatest(accumulator, updatedAt);
}

function mergeContentAccumulator(target: ContentAccumulator, source: ContentAccumulator) {
  target.collections += source.collections;
  target.items += source.items;
  target.chars += source.chars;
  target.latestUpdatedAt = getLatestIso(target.latestUpdatedAt, source.latestUpdatedAt);
}

function hasContentStat(accumulator: ContentAccumulator) {
  return accumulator.collections > 0 || accumulator.items > 0 || accumulator.chars > 0;
}

function toContentOverview(accumulator: ContentAccumulator, scopeCount: number): PhoneContentOverview {
  return {
    ...accumulator,
    averageChars: accumulator.items ? Math.round(accumulator.chars / accumulator.items) : 0,
    scopeCount,
  };
}

function getScopeOwnerPrefix(scopeKey: string) {
  const marker = ':chat:';
  const index = scopeKey.lastIndexOf(marker);
  return index >= 0 ? scopeKey.slice(0, index + marker.length) : `${scopeKey}:`;
}

function isCurrentOwnerScope(scopeKey: string, currentScopeKey: string) {
  return scopeKey.startsWith(getScopeOwnerPrefix(currentScopeKey));
}

function formatContentWarning(domainLabel: string, scopeKey: string, caughtError: unknown) {
  const message = caughtError instanceof Error ? caughtError.message.split('\n')[0] : String(caughtError);
  return `${domainLabel} ${scopeKey}：${message}`;
}

function createContentStatsProvider<T>(definition: ContentDomainDefinition<T>) {
  return (currentScopeKey: string): PhoneContentStatsContribution => {
    const domainContent = createContentAccumulator();
    const currentContent = createContentAccumulator();
    const scopeKeys = new Set<string>();
    const warnings: string[] = [];
    let domainScopeCount = 0;
    const envelope = readChatScopedEnvelope(definition.field, currentScopeKey);

    Object.entries(envelope.scopes).forEach(([scopeKey, rawScopeData]) => {
      if (!isCurrentOwnerScope(scopeKey, currentScopeKey)) return;

      try {
        const scopeData = parsePrettified(definition.schema, rawScopeData);
        const scopeContent = definition.collectScope(scopeData);
        if (hasContentStat(scopeContent)) {
          domainScopeCount += 1;
          scopeKeys.add(scopeKey);
        }
        mergeContentAccumulator(domainContent, scopeContent);
        if (scopeKey === currentScopeKey) {
          mergeContentAccumulator(currentContent, scopeContent);
        }
      } catch (caughtError) {
        warnings.push(formatContentWarning(definition.label, scopeKey, caughtError));
      }
    });

    return {
      current: toContentOverview(currentContent, hasContentStat(currentContent) ? 1 : 0),
      domain: {
        ...toContentOverview(domainContent, domainScopeCount),
        collectionLabel: definition.collectionLabel,
        id: definition.id,
        itemLabel: definition.itemLabel,
        label: definition.label,
      },
      overview: toContentOverview(domainContent, domainScopeCount),
      scopeKeys: [...scopeKeys],
      warnings,
    };
  };
}

export const createExtrasContentStats = createContentStatsProvider<ExtraScopeData>({
  id: 'extras',
  label: '番外',
  collectionLabel: '书本',
  itemLabel: '章节/总结/大纲',
  field: extrasField,
  schema: ExtraScopeDataSchema,
  collectScope(scopeData) {
    const accumulator = createContentAccumulator();
    scopeData.books.forEach(book => {
      addCollection(accumulator, book.updatedAt);
      book.chapters.forEach(chapter => addContentItem(accumulator, chapter.content, chapter.updatedAt));
      book.summaries.forEach(summary => addContentItem(accumulator, summary.content, summary.updatedAt));
    });
    return accumulator;
  },
});

export const createLettersContentStats = createContentStatsProvider<LettersScopeData>({
  id: 'letters',
  label: '书信',
  collectionLabel: '信箱',
  itemLabel: '封',
  field: lettersField,
  schema: LettersScopeDataSchema,
  collectScope(scopeData) {
    const accumulator = createContentAccumulator();
    scopeData.books.forEach(book => {
      addCollection(accumulator, book.updatedAt);
      book.entries.forEach(entry => addContentItem(accumulator, entry.content, entry.updatedAt));
    });
    return accumulator;
  },
});

export const createDiaryContentStats = createContentStatsProvider<DiaryScopeData>({
  id: 'diary',
  label: '日记',
  collectionLabel: '日记本',
  itemLabel: '篇',
  field: diaryField,
  schema: DiaryScopeDataSchema,
  collectScope(scopeData) {
    const accumulator = createContentAccumulator();
    scopeData.books.forEach(book => {
      addCollection(accumulator, book.updatedAt);
      book.entries.forEach(entry => addContentItem(accumulator, entry.content, entry.updatedAt));
    });
    return accumulator;
  },
});

export const createSummaryContentStats = createContentStatsProvider<SummaryScopeData>({
  id: 'summary',
  label: '总结',
  collectionLabel: '总结集',
  itemLabel: '篇',
  field: summaryField,
  schema: SummaryScopeDataSchema,
  collectScope(scopeData) {
    const accumulator = createContentAccumulator();
    scopeData.books.forEach(book => {
      addCollection(accumulator, book.updatedAt);
      book.entries.forEach(entry => addContentItem(accumulator, entry.content, entry.updatedAt));
    });
    return accumulator;
  },
});

export const createForumContentStats = createContentStatsProvider<ForumScopeData>({
  id: 'forum',
  label: '论坛',
  collectionLabel: '板块',
  itemLabel: '主楼/回复',
  field: forumField,
  schema: ForumScopeDataSchema,
  collectScope(scopeData) {
    const accumulator = createContentAccumulator();
    scopeData.boards.forEach(board => {
      addCollection(accumulator, board.updatedAt);
      board.threads.forEach(thread => {
        addContentItem(accumulator, thread.content, thread.updatedAt);
        thread.replies.forEach(reply => addContentItem(accumulator, reply.content, reply.updatedAt));
      });
    });
    return accumulator;
  },
});

export const createTheaterContentStats = createContentStatsProvider<TheaterScopeData>({
  id: 'theater',
  label: '小剧场',
  collectionLabel: '类型',
  itemLabel: '篇',
  field: theaterField,
  schema: TheaterScopeDataSchema,
  collectScope(scopeData) {
    const accumulator = createContentAccumulator();
    scopeData.entries.forEach(entry => addContentItem(accumulator, entry.content, entry.updatedAt));
    return accumulator;
  },
});
