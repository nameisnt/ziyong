import type {
  PhoneContentConversionContext,
  PhoneContentConversionField,
  PhoneContentConversionResult,
  PhoneContentConversionSource,
  PhoneContentReceiver,
} from '@/core/appRegistry';
import { useProfilesStore } from '@/apps/profiles/store';
import { useDigestStore } from '@/apps/digest/store';
import { useEntryLibraryStore } from '@/apps/entry-library/store';
import { useWorldSlotsStore, worldSlotPositionOptions } from '@/apps/world-slots/store';
import {
  storylineKindOptions,
  storylineStatusOptions,
  useStorylinesStore,
  type StorylineKind,
  type StorylineStatus,
} from '@/apps/storylines/store';
import { scenePlanStatusOptions, useScenePlannerStore, type ScenePlanStatus } from '@/apps/scene-planner/store';
import { useSummaryStore } from '@/store/summary';
import { useDiaryStore } from '@/store/diary';
import { useExtrasStore } from '@/store/extras';
import { useForumStore } from '@/store/forum';
import { useLettersStore } from '@/store/letters';
import { useTheaterStore } from '@/store/theater';

const NEW_COLLECTION = '__new__';

function textValue(context: PhoneContentConversionContext, key: string) {
  return String(context.values[key] ?? '').trim();
}

function numberValue(context: PhoneContentConversionContext, key: string, fallback: number) {
  const value = Number(context.values[key]);
  return Number.isFinite(value) ? value : fallback;
}

function booleanValue(context: PhoneContentConversionContext, key: string, fallback = false) {
  const value = context.values[key];
  return typeof value === 'boolean' ? value : fallback;
}

function splitList(value: string) {
  return [
    ...new Set(
      value
        .split(/[，,、\n]+/)
        .map(item => item.trim())
        .filter(Boolean),
    ),
  ];
}

function stripFrontendMarkup(source: PhoneContentConversionSource) {
  if (source.displayMode !== 'frontend') return source.content.trim();
  const document = new DOMParser().parseFromString(source.content, 'text/html');
  return document.body.textContent?.trim() || source.content.trim();
}

function sourceTitle(source: PhoneContentConversionSource, fallback: string) {
  return source.title.trim() || fallback;
}

function result(
  itemIds: string[],
  message: string,
  openRoute?: PhoneContentConversionResult['openRoute'],
): PhoneContentConversionResult {
  return { count: itemIds.length, itemIds, message, openRoute };
}

function collectionFields(
  collectionKey: string,
  collectionLabel: string,
  newNameKey: string,
  newNameLabel: string,
  options: Array<{ label: string; value: string }>,
  context: PhoneContentConversionContext,
) {
  const fields: PhoneContentConversionField[] = [
    {
      key: collectionKey,
      kind: 'select',
      label: collectionLabel,
      options: [{ label: `+ 新建${collectionLabel.replace(/^目标/, '')}`, value: NEW_COLLECTION }, ...options],
      required: true,
    },
  ];
  if (textValue(context, collectionKey) === NEW_COLLECTION) {
    fields.push({ key: newNameKey, kind: 'text', label: newNameLabel, required: true });
  }
  return fields;
}

export function createSummaryContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft(sources) {
      const summary = useSummaryStore();
      return {
        bookId: summary.books[0]?.id || NEW_COLLECTION,
        bookName: `${sources[0]?.appName || '自制 App'}转换`,
        rangeLabel: sources[0]?.sourceLabel || '自制 App 转换',
      };
    },
    fields(context) {
      const summary = useSummaryStore();
      return [
        ...collectionFields(
          'bookId',
          '目标总结集',
          'bookName',
          '新总结集名称',
          summary.books.map(book => ({ label: book.title, value: book.id })),
          context,
        ),
        { key: 'rangeLabel', kind: 'text', label: '范围说明', placeholder: '例如：自制 App 转换' },
      ];
    },
    receive(context) {
      const summary = useSummaryStore();
      const bookId = textValue(context, 'bookId');
      const book =
        bookId === NEW_COLLECTION ? summary.createBook(textValue(context, 'bookName')) : summary.getBook(bookId);
      if (!book) throw new Error('请选择有效的总结集');
      const entries = context.sources.map(source =>
        summary.createEntry(book.id, {
          content: stripFrontendMarkup(source),
          rangeLabel: textValue(context, 'rangeLabel') || source.sourceLabel || '自制 App 转换',
          sourceFloorEnd: source.sourceFloorEnd,
          title: sourceTitle(source, '未命名总结'),
        }),
      );
      const first = entries[0];
      return result(
        entries.map(entry => entry.id),
        `已转换 ${entries.length} 条总结`,
        first && entries.length === 1
          ? { page: 'entry', params: { bookId: book.id, entryId: first.id }, title: first.title }
          : { page: 'book', params: { bookId: book.id }, title: book.title },
      );
    },
  };
}

export function createExtrasContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft(sources) {
      const extras = useExtrasStore();
      return {
        bookId: extras.books[0]?.id || NEW_COLLECTION,
        bookName: `${sources[0]?.appName || '自制 App'}番外`,
        typeName: '自制 App 转换',
      };
    },
    fields(context) {
      const extras = useExtrasStore();
      const fields = collectionFields(
        'bookId',
        '目标番外',
        'bookName',
        '新番外名称',
        extras.books.map(book => ({ label: book.title, value: book.id })),
        context,
      );
      if (textValue(context, 'bookId') === NEW_COLLECTION) {
        fields.push({ key: 'typeName', kind: 'text', label: '番外类型', placeholder: '可留空' });
      }
      return fields;
    },
    receive(context) {
      const extras = useExtrasStore();
      const bookId = textValue(context, 'bookId');
      const book =
        bookId === NEW_COLLECTION
          ? extras.createBook({ title: textValue(context, 'bookName'), typeName: textValue(context, 'typeName') })
          : extras.getBook(bookId);
      if (!book) throw new Error('请选择有效的番外');
      const chapters = context.sources.map(source =>
        extras.createChapter(book.id, {
          content: stripFrontendMarkup(source),
          title: sourceTitle(source, `第 ${book.chapters.length + 1} 章`),
        }),
      );
      if (chapters.some(chapter => !chapter)) throw new Error('番外章节写入失败');
      const created = chapters.filter((chapter): chapter is NonNullable<typeof chapter> => Boolean(chapter));
      const first = created[0];
      return result(
        created.map(chapter => chapter.id),
        `已转换 ${created.length} 章番外`,
        first && created.length === 1
          ? { page: 'chapter', params: { bookId: book.id, chapterId: first.id }, title: first.title }
          : { page: 'book', params: { bookId: book.id }, title: book.title },
      );
    },
  };
}

export function createDiaryContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft(sources) {
      const diary = useDiaryStore();
      return {
        bookId: diary.books[0]?.id || NEW_COLLECTION,
        bookName: `${sources[0]?.appName || '自制 App'}日记`,
        kind: 'normal',
        occurredAt: '',
        perspective: diary.books[0]?.perspective.name || '',
      };
    },
    fields(context) {
      const diary = useDiaryStore();
      const fields = collectionFields(
        'bookId',
        '目标日记本',
        'bookName',
        '新日记本名称',
        diary.books.map(book => ({ label: `${book.title} · ${book.perspective.name}`, value: book.id })),
        context,
      );
      if (textValue(context, 'bookId') === NEW_COLLECTION) {
        fields.push({ key: 'perspective', kind: 'text', label: '视角角色', required: true });
      }
      fields.push(
        {
          key: 'kind',
          kind: 'select',
          label: '日记类型',
          options: [
            { label: '普通日记', value: 'normal' },
            { label: '阅读反应', value: 'read-reaction' },
          ],
        },
        { key: 'occurredAt', kind: 'text', label: '发生时间', placeholder: '可留空' },
      );
      return fields;
    },
    receive(context) {
      const diary = useDiaryStore();
      const bookId = textValue(context, 'bookId');
      const existing = bookId === NEW_COLLECTION ? null : diary.getBook(bookId);
      const perspective = existing?.perspective ?? { name: textValue(context, 'perspective') };
      if (!perspective.name.trim()) throw new Error('请填写日记视角角色');
      const created = context.sources.map(source =>
        diary.createEntry({
          bookId: existing?.id,
          bookTitle: textValue(context, 'bookName'),
          content: stripFrontendMarkup(source),
          kind: textValue(context, 'kind') === 'read-reaction' ? 'read-reaction' : 'normal',
          occurredAt: textValue(context, 'occurredAt'),
          perspective,
          readers: undefined,
          sourceFloorEnd: source.sourceFloorEnd,
          title: sourceTitle(source, '未命名日记'),
        }),
      );
      const first = created[0];
      const book = first?.book;
      if (!first || !book) throw new Error('日记写入失败');
      return result(
        created.map(item => item.entry.id),
        `已转换 ${created.length} 篇日记`,
        created.length === 1
          ? { page: 'entry', params: { bookId: book.id, entryId: first.entry.id }, title: first.entry.title }
          : { page: 'book', params: { bookId: book.id }, title: book.title },
      );
    },
  };
}

export function createLettersContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft(sources) {
      const letters = useLettersStore();
      const book = letters.books[0];
      return {
        bookId: book?.id || NEW_COLLECTION,
        bookName: `${sources[0]?.appName || '自制 App'}书信`,
        format: 'formal',
        receiver: book?.participants[1]?.name || '',
        sender: book?.participants[0]?.name || '',
      };
    },
    fields(context) {
      const letters = useLettersStore();
      return [
        ...collectionFields(
          'bookId',
          '目标书信集',
          'bookName',
          '新书信集名称',
          letters.books.map(book => ({ label: book.title, value: book.id })),
          context,
        ),
        { key: 'sender', kind: 'text', label: '发件人', required: true },
        { key: 'receiver', kind: 'text', label: '收件人', required: true },
        {
          key: 'format',
          kind: 'select',
          label: '书信格式',
          options: [
            { label: '正式书信', value: 'formal' },
            { label: '便笺', value: 'note' },
            { label: '短信', value: 'sms' },
            { label: '电子邮件', value: 'email' },
          ],
        },
      ];
    },
    receive(context) {
      const letters = useLettersStore();
      const sender = { name: textValue(context, 'sender') };
      const receiver = { name: textValue(context, 'receiver') };
      if (!sender.name || !receiver.name) throw new Error('请填写发件人和收件人');
      const bookId = textValue(context, 'bookId');
      const format = textValue(context, 'format');
      const created = context.sources.map(source =>
        letters.createEntry({
          bookId: bookId === NEW_COLLECTION ? undefined : bookId,
          bookTitle: textValue(context, 'bookName'),
          content: stripFrontendMarkup(source),
          format: format === 'note' || format === 'sms' || format === 'email' ? format : 'formal',
          receiver,
          sender,
          title: sourceTitle(source, '未命名书信'),
        }),
      );
      const first = created[0];
      if (!first) throw new Error('书信写入失败');
      return result(
        created.map(item => item.entry.id),
        `已转换 ${created.length} 封书信`,
        created.length === 1
          ? {
              page: 'entry',
              params: { bookId: first.book.id, entryId: first.entry.id },
              title: first.entry.title,
            }
          : { page: 'book', params: { bookId: first.book.id }, title: first.book.title },
      );
    },
  };
}

export function createTheaterContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft(sources) {
      return {
        participants: '',
        renderMode: sources.some(source => source.displayMode === 'frontend') ? 'frontend' : 'markdown',
        typeName: '自制 App 转换',
      };
    },
    fields() {
      return [
        { key: 'typeName', kind: 'text', label: '小剧场类型', placeholder: '可留空' },
        { key: 'participants', kind: 'text', label: '参与角色', placeholder: '使用逗号分隔' },
        {
          key: 'renderMode',
          kind: 'select',
          label: '显示方式',
          options: [
            { label: 'Markdown 文本', value: 'markdown' },
            { label: '网页渲染', value: 'frontend' },
          ],
        },
      ];
    },
    receive(context) {
      const theater = useTheaterStore();
      const renderMode = textValue(context, 'renderMode') === 'frontend' ? 'frontend' : 'markdown';
      const participants = splitList(textValue(context, 'participants')).map(name => ({ name }));
      const entries = context.sources.map(source =>
        theater.createEntry({
          content: renderMode === 'frontend' ? source.content : stripFrontendMarkup(source),
          participants,
          renderMode,
          title: sourceTitle(source, '未命名小剧场'),
          typeName: textValue(context, 'typeName') || '未分类小剧场',
        }),
      );
      const first = entries[0];
      return result(
        entries.map(entry => entry.id),
        `已转换 ${entries.length} 个小剧场`,
        first && entries.length === 1
          ? { page: 'entry', params: { entryId: first.id }, title: first.title }
          : { page: 'root', title: '小剧场' },
      );
    },
  };
}

export function createForumContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft(sources) {
      const forum = useForumStore();
      return {
        author: '匿名',
        boardId: forum.boards[0]?.id || NEW_COLLECTION,
        boardName: `${sources[0]?.appName || '自制 App'}板块`,
      };
    },
    fields(context) {
      const forum = useForumStore();
      return [
        ...collectionFields(
          'boardId',
          '目标板块',
          'boardName',
          '新板块名称',
          forum.boards.map(board => ({ label: board.name, value: board.id })),
          context,
        ),
        { key: 'author', kind: 'text', label: '发帖人', required: true },
      ];
    },
    receive(context) {
      const forum = useForumStore();
      const boardId = textValue(context, 'boardId');
      const board =
        boardId === NEW_COLLECTION
          ? forum.createBoard({ name: textValue(context, 'boardName') })
          : forum.getBoard(boardId);
      if (!board) throw new Error('请选择有效的论坛板块');
      const created = context.sources.map(source =>
        forum.createThread(board.id, {
          author: textValue(context, 'author') || '匿名',
          content: stripFrontendMarkup(source),
          title: sourceTitle(source, '未命名帖子'),
        }),
      );
      if (created.some(item => !item)) throw new Error('论坛帖子写入失败');
      const threads = created.filter((item): item is NonNullable<typeof item> => Boolean(item));
      const first = threads[0];
      return result(
        threads.map(item => item.thread.id),
        `已转换 ${threads.length} 个主题帖`,
        first && threads.length === 1
          ? {
              page: 'thread',
              params: { boardId: board.id, threadId: first.thread.id },
              title: first.thread.title,
            }
          : { page: 'board', params: { boardId: board.id }, title: board.name },
      );
    },
  };
}

export function createProfilesContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft() {
      const profiles = useProfilesStore();
      return { contentField: 'summary', tableId: profiles.tables[0]?.id || '' };
    },
    fields(context) {
      const profiles = useProfilesStore();
      const table = profiles.getTable(textValue(context, 'tableId')) ?? profiles.tables[0];
      const fieldOptions = [
        { label: '摘要', value: 'summary' },
        ...(table?.columns ?? [])
          .filter(column => column.enabled && !['title', 'summary', 'tags'].includes(column.id))
          .map(column => ({ label: column.label, value: column.id })),
      ];
      return [
        {
          key: 'tableId',
          kind: 'select',
          label: '目标资料表',
          options: profiles.tables.map(item => ({ label: item.name, value: item.id })),
          required: true,
        },
        {
          key: 'contentField',
          kind: 'select',
          label: '正文写入字段',
          options: fieldOptions,
          required: true,
        },
      ];
    },
    receive(context) {
      const profiles = useProfilesStore();
      const table = profiles.getTable(textValue(context, 'tableId'));
      if (!table) throw new Error('请选择有效的资料表');
      const contentField = textValue(context, 'contentField') || 'summary';
      const entries = context.sources.map(source => {
        const content = stripFrontendMarkup(source);
        return profiles.createEntry({
          fields: contentField === 'summary' ? {} : { [contentField]: content },
          kind: table.kind,
          summary: contentField === 'summary' ? content : '',
          tableId: table.id,
          tags: source.tags,
          title: sourceTitle(source, '未命名资料'),
        });
      });
      const first = entries[0];
      return result(
        entries.map(entry => entry.id),
        `已转换 ${entries.length} 条资料`,
        first && entries.length === 1
          ? { page: 'entry', params: { entryId: first.id }, title: first.title }
          : { page: 'root', title: '资料表' },
      );
    },
  };
}

export function createDigestContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft() {
      return {};
    },
    fields() {
      return [];
    },
    receive(context) {
      const digest = useDigestStore();
      const entries = context.sources.map(source =>
        digest.createEntry({
          content: stripFrontendMarkup(source),
          kind: 'manual',
          sourceFloorEnd: source.sourceFloorEnd,
          sourceLabel: source.sourceLabel || source.appName,
          sourceText: source.content,
          tags: source.tags,
          title: sourceTitle(source, '未命名摘抄'),
        }),
      );
      const first = entries[0];
      return result(
        entries.map(entry => entry.id),
        `已转换 ${entries.length} 条摘抄`,
        first && entries.length === 1
          ? { page: 'entry', params: { entryId: first.id }, title: first.title }
          : { page: 'root', title: '摘抄' },
      );
    },
  };
}

export function createEntryLibraryContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'global',
    batchModes: ['separate', 'merge'],
    createDraft(sources) {
      const library = useEntryLibraryStore();
      return { groupId: library.groups[0]?.id || NEW_COLLECTION, groupName: sources[0]?.appName || '自制 App' };
    },
    fields(context) {
      const library = useEntryLibraryStore();
      return collectionFields(
        'groupId',
        '目标分组',
        'groupName',
        '新分组名称',
        library.groups.map(group => ({ label: group.name, value: group.id })),
        context,
      );
    },
    receive(context) {
      const library = useEntryLibraryStore();
      const groupId = textValue(context, 'groupId');
      const group =
        groupId === NEW_COLLECTION ? library.createGroup(textValue(context, 'groupName')) : library.getGroup(groupId);
      if (!group) throw new Error('请选择有效的条目库分组');
      const entries = context.sources.map(source =>
        library.createItem({
          content: source.content.trim(),
          groupId: group.id,
          title: sourceTitle(source, '未命名条目'),
        }),
      );
      return result(
        entries.map(entry => entry.id),
        `已转换 ${entries.length} 条条目`,
        {
          page: 'root',
          title: '条目库',
        },
      );
    },
  };
}

export function createWorldSlotsContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft(sources) {
      return {
        enabled: true,
        insertionOrder: 100,
        keys: sources[0]?.tags.join('、') || '',
        position: 'before_character_definition',
      };
    },
    fields() {
      return [
        { key: 'keys', kind: 'text', label: '关键词', placeholder: '使用逗号分隔，可留空' },
        {
          key: 'position',
          kind: 'select',
          label: '插入位置',
          options: worldSlotPositionOptions.map(option => ({ label: option.label, value: option.id })),
        },
        { key: 'insertionOrder', kind: 'number', label: '顺序', step: 1 },
        { key: 'enabled', kind: 'toggle', label: '立即启用' },
      ];
    },
    receive(context) {
      const worldSlots = useWorldSlotsStore();
      const position = textValue(context, 'position');
      const validPosition = worldSlotPositionOptions.some(option => option.id === position)
        ? (position as (typeof worldSlotPositionOptions)[number]['id'])
        : 'before_character_definition';
      const slots = worldSlots.createSlots(
        context.sources.map(source => ({
          content: source.content.trim(),
          enabled: booleanValue(context, 'enabled', true),
          insertionOrder: Math.round(numberValue(context, 'insertionOrder', 100)),
          keys: splitList(textValue(context, 'keys') || source.tags.join('、')),
          position: validPosition,
          title: sourceTitle(source, '未命名槽位'),
        })),
      );
      const first = slots[0];
      return result(
        slots.map(slot => slot.id),
        `已转换 ${slots.length} 个世界书槽位`,
        first && slots.length === 1
          ? { page: 'editor', params: { slotId: first.id }, title: first.title }
          : { page: 'root', title: '世界书槽位' },
      );
    },
  };
}

export function createStorylinesContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft() {
      return { kind: 'branch', status: 'planned' };
    },
    fields() {
      return [
        {
          key: 'kind',
          kind: 'select',
          label: '剧情线类型',
          options: storylineKindOptions.map(option => ({ label: option.label, value: option.id })),
        },
        {
          key: 'status',
          kind: 'select',
          label: '状态',
          options: storylineStatusOptions.map(option => ({ label: option.label, value: option.id })),
        },
      ];
    },
    receive(context) {
      const storylines = useStorylinesStore();
      const kind = textValue(context, 'kind');
      const status = textValue(context, 'status');
      const entries = context.sources.map(source =>
        storylines.createLine({
          kind: storylineKindOptions.some(option => option.id === kind) ? (kind as StorylineKind) : 'branch',
          status: storylineStatusOptions.some(option => option.id === status) ? (status as StorylineStatus) : 'planned',
          summary: stripFrontendMarkup(source),
          tags: source.tags,
          title: sourceTitle(source, '未命名剧情线'),
        }),
      );
      return result(
        entries.map(entry => entry.id),
        `已转换 ${entries.length} 条剧情线`,
        {
          page: 'root',
          title: '剧情线',
        },
      );
    },
  };
}

export function createScenePlannerContentReceiver(): PhoneContentReceiver {
  return {
    scope: 'chat',
    batchModes: ['separate', 'merge'],
    createDraft() {
      return { contentField: 'brief', status: 'draft' };
    },
    fields() {
      return [
        {
          key: 'contentField',
          kind: 'select',
          label: '正文写入位置',
          options: [
            { label: '用户想法', value: 'brief' },
            { label: '下一章提示词', value: 'prompt' },
            { label: '分析', value: 'analysis' },
          ],
        },
        {
          key: 'status',
          kind: 'select',
          label: '状态',
          options: scenePlanStatusOptions.map(option => ({ label: option.label, value: option.id })),
        },
      ];
    },
    receive(context) {
      const planner = useScenePlannerStore();
      const contentField = textValue(context, 'contentField');
      const status = textValue(context, 'status');
      const entries = context.sources.map(source => {
        const content = stripFrontendMarkup(source);
        return planner.createPlan({
          analysis: contentField === 'analysis' ? content : '',
          brief: contentField === 'brief' ? content : '',
          prompt: contentField === 'prompt' ? content : '',
          status: scenePlanStatusOptions.some(option => option.id === status) ? (status as ScenePlanStatus) : 'draft',
          title: sourceTitle(source, '未命名场景'),
        });
      });
      return result(
        entries.map(entry => entry.id),
        `已转换 ${entries.length} 个场景方案`,
        {
          page: 'root',
          title: '场景编排',
        },
      );
    },
  };
}
