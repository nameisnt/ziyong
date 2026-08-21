import {
  type PhoneItemTransferImportContext,
  type PhoneItemTransferProvider,
  type PhoneItemTransferRoute,
} from '@/core/appRegistry';
import { DigestEntrySchema, DigestScopeDataSchema, useDigestStore, type DigestEntry } from '@/apps/digest/store';
import {
  ProfileEntrySchema,
  ProfileTableSchema,
  ProfilesScopeDataSchema,
  useProfilesStore,
  type ProfileEntry,
  type ProfileTable,
} from '@/apps/profiles/store';
import {
  ScenePlanSchema,
  ScenePlannerScopeDataSchema,
  useScenePlannerStore,
  type ScenePlan,
} from '@/apps/scene-planner/store';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useLettersStore } from '@/store/letters';
import { useSummaryStore } from '@/store/summary';
import { useTheaterStore } from '@/store/theater';
import { DiaryEntrySchema, DiaryScopeDataSchema, type DiaryEntry } from '@/type/diary';
import { ExtraChapterSchema, ExtraScopeDataSchema, type ExtraChapter } from '@/type/extra';
import { ForumScopeDataSchema, ForumThreadSchema, type ForumThread } from '@/type/forum';
import { LetterEntrySchema, LettersScopeDataSchema, type LetterEntry } from '@/type/letter';
import { SummaryEntrySchema, SummaryScopeDataSchema, type SummaryEntry } from '@/type/summary';
import { TheaterEntrySchema, TheaterScopeDataSchema, type TheaterEntry } from '@/type/theater';
import { cloneItemWithFreshIds } from '@/util/itemTransfer';
import { parsePrettified } from '@/util/zod';
import { klona } from 'klona';

type TransferParent = {
  id: string;
  label: string;
  metadata?: unknown;
};

type TransferRecord<T> = {
  item: T;
  parent?: TransferParent;
};

type TransferTarget<T extends { id: string }> = {
  id: string;
  items: T[];
  label: string;
  replaceItems: (items: T[]) => void;
  touch?: () => void;
};

type CollectionProviderOptions<T extends { id: string; title: string }> = {
  captureSnapshot: () => unknown;
  exportItem: (params: Record<string, string>) => TransferRecord<T> | null;
  getTarget: (params: Record<string, string>, record: TransferRecord<T>) => TransferTarget<T> | null;
  itemLabel: string;
  itemSchema: z.ZodType<T>;
  itemType: string;
  prepareItem?: (item: T, target: TransferTarget<T>) => T;
  restoreSnapshot: (snapshot: unknown) => void;
  route: (item: T, target: TransferTarget<T>) => PhoneItemTransferRoute;
  validateTarget?: (record: TransferRecord<T>, target: TransferTarget<T>) => void;
};

function transferRecordSchema<T>(itemSchema: z.ZodType<T>) {
  return z.object({
    item: itemSchema,
    parent: z
      .object({
        id: z.string(),
        label: z.string(),
        metadata: z.unknown().optional(),
      })
      .optional(),
  });
}

function createCollectionProvider<T extends { id: string; title: string }>(
  options: CollectionProviderOptions<T>,
): PhoneItemTransferProvider {
  const schema = transferRecordSchema(options.itemSchema);
  function parse(data: unknown) {
    return parsePrettified(schema, klona(data)) as TransferRecord<T>;
  }
  function requireTarget(record: TransferRecord<T>, params: Record<string, string>) {
    const target = options.getTarget(params, record);
    if (!target) throw new Error(`请先进入要导入到的${options.itemLabel}列表`);
    options.validateTarget?.(record, target);
    return target;
  }
  return {
    captureSnapshot: options.captureSnapshot,
    exportItem(params) {
      const record = options.exportItem(params);
      return record ? { data: record, itemId: record.item.id, title: record.item.title } : null;
    },
    importItem(data: unknown, context: PhoneItemTransferImportContext) {
      const record = parse(data);
      const target = requireTarget(record, context.params);
      const conflict = target.items.some(item => item.id === record.item.id);
      if (context.mode === 'replace' && !conflict) throw new Error('目标列表没有同 ID 内容，不能覆盖');
      let item = context.mode === 'copy' ? cloneItemWithFreshIds(record.item) : klona(record.item);
      item = options.prepareItem?.(item, target) ?? item;
      target.replaceItems(
        context.mode === 'replace'
          ? target.items.map(current => (current.id === item.id ? item : current))
          : [item, ...target.items],
      );
      target.touch?.();
      return {
        itemId: item.id,
        message: `已${context.mode === 'replace' ? '覆盖' : '导入'}${options.itemLabel}“${item.title}”`,
        route: options.route(item, target),
        title: item.title,
      };
    },
    itemLabel: options.itemLabel,
    itemType: options.itemType,
    previewImport(data, params) {
      const record = parse(data);
      const target = requireTarget(record, params);
      return {
        conflict: target.items.some(item => item.id === record.item.id),
        description: record.parent ? `来源：${record.parent.label}` : undefined,
        itemId: record.item.id,
        targetLabel: target.label,
        title: record.item.title,
      };
    },
    restoreSnapshot: options.restoreSnapshot,
    schema,
    schemaVersion: 1,
  };
}

function timestamp() {
  return new Date().toISOString();
}

export const summaryItemTransferProvider = createCollectionProvider<SummaryEntry>({
  captureSnapshot: () => klona(useSummaryStore().data),
  exportItem(params) {
    const store = useSummaryStore();
    const book = store.getBook(params.bookId || '');
    const item = book && store.getEntry(book.id, params.entryId || '');
    return book && item ? { item, parent: { id: book.id, label: book.title } } : null;
  },
  getTarget(params) {
    const book = useSummaryStore().getBook(params.bookId || '');
    return book
      ? {
          id: book.id,
          items: book.entries,
          label: book.title,
          replaceItems: items => (book.entries = items),
          touch: () => (book.updatedAt = timestamp()),
        }
      : null;
  },
  itemLabel: '总结',
  itemSchema: SummaryEntrySchema,
  itemType: 'summary-entry',
  restoreSnapshot: snapshot => (useSummaryStore().data = parsePrettified(SummaryScopeDataSchema, snapshot)),
  route: (item, target) => ({ page: 'entry', params: { bookId: target.id, entryId: item.id }, title: item.title }),
});

export const diaryItemTransferProvider = createCollectionProvider<DiaryEntry>({
  captureSnapshot: () => klona(useDiaryStore().data),
  exportItem(params) {
    const store = useDiaryStore();
    const book = store.getBook(params.bookId || '');
    const item = book && store.getEntry(book.id, params.entryId || '');
    return book && item
      ? { item, parent: { id: book.id, label: book.title, metadata: { perspective: book.perspective } } }
      : null;
  },
  getTarget(params) {
    const book = useDiaryStore().getBook(params.bookId || '');
    return book
      ? {
          id: book.id,
          items: book.entries,
          label: `${book.title} · ${book.perspective.name}`,
          replaceItems: items => (book.entries = items),
          touch: () => (book.updatedAt = timestamp()),
        }
      : null;
  },
  itemLabel: '日记',
  itemSchema: DiaryEntrySchema,
  itemType: 'diary-entry',
  restoreSnapshot: snapshot => (useDiaryStore().data = parsePrettified(DiaryScopeDataSchema, snapshot)),
  route: (item, target) => ({ page: 'entry', params: { bookId: target.id, entryId: item.id }, title: item.title }),
});

export const extrasItemTransferProvider = createCollectionProvider<ExtraChapter>({
  captureSnapshot: () => klona(useExtrasStore().data),
  exportItem(params) {
    const store = useExtrasStore();
    const book = store.getBook(params.bookId || '');
    const item = book && store.getChapter(book.id, params.chapterId || '');
    return book && item ? { item, parent: { id: book.id, label: book.title } } : null;
  },
  getTarget(params) {
    const book = useExtrasStore().getBook(params.bookId || '');
    return book
      ? {
          id: book.id,
          items: book.chapters,
          label: book.title,
          replaceItems: items => (book.chapters = items),
          touch: () => (book.updatedAt = timestamp()),
        }
      : null;
  },
  itemLabel: '番外章节',
  itemSchema: ExtraChapterSchema,
  itemType: 'extras-chapter',
  restoreSnapshot: snapshot => (useExtrasStore().data = parsePrettified(ExtraScopeDataSchema, snapshot)),
  route: (item, target) => ({ page: 'chapter', params: { bookId: target.id, chapterId: item.id }, title: item.title }),
});

export const forumItemTransferProvider = createCollectionProvider<ForumThread>({
  captureSnapshot: () => klona(useForumStore().data),
  exportItem(params) {
    const store = useForumStore();
    const board = store.getBoard(params.boardId || '');
    const item = board && store.getThread(board.id, params.threadId || '');
    return board && item ? { item, parent: { id: board.id, label: board.name } } : null;
  },
  getTarget(params) {
    const board = useForumStore().getBoard(params.boardId || '');
    return board
      ? {
          id: board.id,
          items: board.threads,
          label: board.name,
          replaceItems: items => (board.threads = items),
          touch: () => (board.updatedAt = timestamp()),
        }
      : null;
  },
  itemLabel: '论坛主题',
  itemSchema: ForumThreadSchema,
  itemType: 'forum-thread',
  prepareItem: (item, target) => ({ ...item, boardId: target.id }),
  restoreSnapshot: snapshot => (useForumStore().data = parsePrettified(ForumScopeDataSchema, snapshot)),
  route: (item, target) => ({ page: 'thread', params: { boardId: target.id, threadId: item.id }, title: item.title }),
});

export const theaterItemTransferProvider = createCollectionProvider<TheaterEntry>({
  captureSnapshot: () => klona(useTheaterStore().data),
  exportItem: params => {
    const item = useTheaterStore().getEntry(params.entryId || '');
    return item ? { item } : null;
  },
  getTarget: () => {
    const store = useTheaterStore();
    return {
      id: 'theater',
      items: store.entries,
      label: '小剧场',
      replaceItems: items => (store.data.entries = items),
    };
  },
  itemLabel: '小剧场',
  itemSchema: TheaterEntrySchema,
  itemType: 'theater-entry',
  restoreSnapshot: snapshot => (useTheaterStore().data = parsePrettified(TheaterScopeDataSchema, snapshot)),
  route: item => ({ page: 'entry', params: { entryId: item.id }, title: item.title }),
});

export const lettersItemTransferProvider = createCollectionProvider<LetterEntry>({
  captureSnapshot: () => klona(useLettersStore().data),
  exportItem(params) {
    const store = useLettersStore();
    const book = store.getBook(params.bookId || '');
    const item = book && store.getEntry(book.id, params.entryId || '');
    return book && item
      ? {
          item,
          parent: {
            id: book.id,
            label: book.title,
            metadata: { participantKey: book.participantKey, participants: book.participants },
          },
        }
      : null;
  },
  getTarget(params) {
    const book = useLettersStore().getBook(params.bookId || '');
    return book
      ? {
          id: book.id,
          items: book.entries,
          label: book.title,
          replaceItems: items => (book.entries = items),
          touch: () => (book.updatedAt = timestamp()),
        }
      : null;
  },
  itemLabel: '书信',
  itemSchema: LetterEntrySchema,
  itemType: 'letter-entry',
  restoreSnapshot: snapshot => (useLettersStore().data = parsePrettified(LettersScopeDataSchema, snapshot)),
  route: (item, target) => ({ page: 'entry', params: { bookId: target.id, entryId: item.id }, title: item.title }),
});

export const digestItemTransferProvider = createCollectionProvider<DigestEntry>({
  captureSnapshot: () => klona(useDigestStore().data),
  exportItem: params => {
    const item = useDigestStore().getEntry(params.entryId || '');
    return item ? { item } : null;
  },
  getTarget: () => {
    const store = useDigestStore();
    return {
      id: 'digest',
      items: store.entries,
      label: '摘抄',
      replaceItems: items => (store.data.entries = items),
    };
  },
  itemLabel: '摘抄',
  itemSchema: DigestEntrySchema,
  itemType: 'digest-entry',
  restoreSnapshot: snapshot => (useDigestStore().data = parsePrettified(DigestScopeDataSchema, snapshot)),
  route: item => ({ page: 'entry', params: { entryId: item.id }, title: item.title }),
});

const ProfileTransferRecordSchema = transferRecordSchema(ProfileEntrySchema);

export const profilesItemTransferProvider: PhoneItemTransferProvider = {
  captureSnapshot: () => klona(useProfilesStore().data),
  exportItem(params) {
    const store = useProfilesStore();
    const item = store.getEntry(params.entryId || '');
    const table = item && store.getTable(item.tableId);
    return item && table
      ? {
          data: { item, parent: { id: table.id, label: table.name, metadata: table } },
          itemId: item.id,
          title: item.title,
        }
      : null;
  },
  importItem(data, context) {
    const record = parsePrettified(ProfileTransferRecordSchema, data) as TransferRecord<ProfileEntry>;
    const store = useProfilesStore();
    const table = store.getTable(context.params.tableId || '');
    if (!table) throw new Error('请先选择要导入到的资料表');
    validateProfileTarget(record, table);
    const conflict = store.entries.some(entry => entry.tableId === table.id && entry.id === record.item.id);
    if (context.mode === 'replace' && !conflict) throw new Error('当前资料表没有同 ID 条目，不能覆盖');
    const prepared = context.mode === 'copy' ? cloneItemWithFreshIds(record.item) : klona(record.item);
    const item = { ...prepared, kind: table.kind, tableId: table.id };
    store.data.entries =
      context.mode === 'replace'
        ? store.entries.map(current => (current.tableId === table.id && current.id === item.id ? item : current))
        : [item, ...store.entries];
    return {
      itemId: item.id,
      message: `已${context.mode === 'replace' ? '覆盖' : '导入'}资料“${item.title}”`,
      route: { page: 'entry', params: { entryId: item.id }, title: item.title },
      title: item.title,
    };
  },
  itemLabel: '资料条目',
  itemType: 'profile-entry',
  previewImport(data, params) {
    const record = parsePrettified(ProfileTransferRecordSchema, data) as TransferRecord<ProfileEntry>;
    const store = useProfilesStore();
    const table = store.getTable(params.tableId || '');
    if (!table) throw new Error('请先选择要导入到的资料表');
    validateProfileTarget(record, table);
    return {
      conflict: store.entries.some(entry => entry.tableId === table.id && entry.id === record.item.id),
      description: record.parent ? `来源：${record.parent.label}` : undefined,
      itemId: record.item.id,
      targetLabel: table.name,
      title: record.item.title,
    };
  },
  restoreSnapshot: snapshot => (useProfilesStore().data = parsePrettified(ProfilesScopeDataSchema, snapshot)),
  schema: ProfileTransferRecordSchema,
  schemaVersion: 1,
};

function validateProfileTarget(record: TransferRecord<ProfileEntry>, table: ProfileTable) {
  const sourceTable = ProfileTableSchema.safeParse(record.parent?.metadata);
  if (!sourceTable.success) return;
  const targetColumns = new Set(table.columns.map(column => column.id));
  const missing = sourceTable.data.columns
    .filter(column => Object.hasOwn(record.item.fields, column.id) && !targetColumns.has(column.id))
    .map(column => column.label);
  if (missing.length) throw new Error(`目标资料表缺少字段：${missing.join('、')}`);
}

export const scenePlannerItemTransferProvider = createCollectionProvider<ScenePlan>({
  captureSnapshot: () => klona(useScenePlannerStore().data),
  exportItem: params => {
    const item = useScenePlannerStore().getPlan(params.planId || '');
    return item ? { item } : null;
  },
  getTarget: () => {
    const store = useScenePlannerStore();
    return {
      id: 'scene-planner',
      items: store.plans,
      label: '历史方案',
      replaceItems: items => (store.data.plans = items),
    };
  },
  itemLabel: '场景方案',
  itemSchema: ScenePlanSchema,
  itemType: 'scene-plan',
  restoreSnapshot: snapshot => (useScenePlannerStore().data = parsePrettified(ScenePlannerScopeDataSchema, snapshot)),
  route: item => ({ page: 'root', params: { planId: item.id }, title: '场景编排' }),
});
