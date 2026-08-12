import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import type { FailedGenerationDraft } from '@/type/generation';
import { validateInplace } from '@/util/zod';

export const profilesField = 'sillytavern_phone_profiles';

export const ProfileKindSchema = z.enum([
  'character',
  'location',
  'organization',
  'item',
  'world',
  'rule',
  'event',
  'timeline',
  'note',
]);
export type ProfileKind = z.infer<typeof ProfileKindSchema>;

export const ProfileColumnTypeSchema = z.enum(['text', 'textarea', 'select', 'tags', 'boolean']);
export type ProfileColumnType = z.infer<typeof ProfileColumnTypeSchema>;

export const ProfileRenderModeSchema = z.enum(['markdown', 'frontend']);
export type ProfileRenderMode = z.infer<typeof ProfileRenderModeSchema>;

const ProfileTableColumnPersistedSchema = z.object({
  description: z.string().default(''),
  enabled: z.boolean().optional(),
  id: z.string(),
  label: z.string(),
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false),
  type: ProfileColumnTypeSchema.default('text'),
  visible: z.boolean().optional(),
});
export const ProfileTableColumnSchema = ProfileTableColumnPersistedSchema.transform(({ visible, ...column }) => {
  return {
    ...column,
    enabled: column.id === 'title' ? true : (column.enabled ?? visible ?? true),
  };
});
export type ProfileTableColumn = z.infer<typeof ProfileTableColumnSchema>;

export const ProfileTableSchema = z.object({
  builtIn: z.boolean().default(false),
  columns: z.array(ProfileTableColumnSchema).default([]),
  createdAt: z.string(),
  displayFormat: z.string().default(''),
  id: z.string(),
  kind: ProfileKindSchema.default('note'),
  name: z.string(),
  renderMode: ProfileRenderModeSchema.default('markdown'),
  updatedAt: z.string(),
});
export type ProfileTable = z.infer<typeof ProfileTableSchema>;

const ProfileEntryPersistedSchema = z.object({
  content: z.string().default(''),
  createdAt: z.string(),
  favorite: z.boolean().default(false),
  fields: z.record(z.string(), z.string()).default({}),
  id: z.string(),
  kind: ProfileKindSchema.default('character'),
  origin: z
    .object({
      appId: z.string(),
      sourceId: z.string(),
      sourceKey: z.string(),
    })
    .nullable()
    .default(null),
  summary: z.string().default(''),
  tableId: z.string().default(''),
  tags: z.array(z.string()).default([]),
  title: z.string(),
  updatedAt: z.string(),
});
export const ProfileEntrySchema = ProfileEntryPersistedSchema.transform(({ content, ...entry }) => {
  const legacyContent = content.trim();
  const currentDetails = entry.fields.details?.trim() || '';
  const fields: Record<string, string> = { ...entry.fields };
  if (legacyContent) {
    fields.details =
      currentDetails && currentDetails !== legacyContent ? `${currentDetails}\n\n${legacyContent}` : legacyContent;
  }
  return {
    ...entry,
    fields,
  };
});
export type ProfileEntry = z.infer<typeof ProfileEntrySchema>;

const ProfilesScopeDataBaseSchema = z.object({
  entries: z.array(ProfileEntrySchema).default([]),
  failedDrafts: z.array(z.custom<FailedGenerationDraft>()).default([]),
  tables: z.array(ProfileTableSchema).default([]),
});

export const profileKindOptions: Array<{ id: ProfileKind; label: string }> = [
  { id: 'character', label: '人物' },
  { id: 'location', label: '地点' },
  { id: 'organization', label: '组织' },
  { id: 'item', label: '物品' },
  { id: 'world', label: '世界观' },
  { id: 'rule', label: '规则' },
  { id: 'event', label: '事件' },
  { id: 'timeline', label: '时间线' },
  { id: 'note', label: '其他' },
];

const coreColumns: ProfileTableColumn[] = [
  {
    description: '资料的唯一名称或对象名。',
    enabled: true,
    id: 'title',
    label: '名称',
    options: [],
    required: true,
    type: 'text',
  },
  {
    description: '用一句话概括资料最重要的身份、状态或作用。',
    enabled: true,
    id: 'summary',
    label: '摘要',
    options: [],
    required: false,
    type: 'text',
  },
  {
    description: '用于检索与归类的关键词，使用顿号或逗号分隔。',
    enabled: true,
    id: 'tags',
    label: '标签',
    options: [],
    required: false,
    type: 'tags',
  },
  {
    description: '无法归入其他字段的补充资料与详细说明。',
    enabled: true,
    id: 'details',
    label: '补充内容',
    options: [],
    required: false,
    type: 'textarea',
  },
];

const tableExtras: Record<ProfileKind, ProfileTableColumn[]> = {
  character: [
    {
      description: '人物出生日期，建议填写为“年-月-日”，时间确认会自动读取。',
      id: 'birthDate',
      label: '出生日期',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '人物在当前故事中的身份、职业或社会定位。',
      id: 'identity',
      label: '身份',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '人物目前已确认的处境、行动或状态。',
      id: 'status',
      label: '当前状态',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
  ],
  event: [
    {
      description: '事件发生的时间、阶段或相对顺序。',
      id: 'stage',
      label: '发生阶段',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '事件已经确认的结果与影响。',
      id: 'outcome',
      label: '结果',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
  ],
  item: [
    {
      description: '物品当前由谁持有、保管或控制。',
      id: 'holder',
      label: '当前持有者',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '物品目前的可用、损坏、遗失等状态。',
      id: 'status',
      label: '状态',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
  ],
  location: [
    {
      description: '地点所在区域、方位或与其他地点的关系。',
      id: 'region',
      label: '位置',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '地点当前开放、封锁、毁坏等状态。',
      id: 'status',
      label: '当前状态',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
  ],
  note: [],
  organization: [
    {
      description: '组织的性质、职能或故事定位。',
      id: 'role',
      label: '定位',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '组织目前的活动、存续或立场状态。',
      id: 'status',
      label: '当前状态',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
  ],
  rule: [
    {
      description: '规则适用的对象、区域或情境。',
      id: 'scope',
      label: '适用范围',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '规则是否已被剧情明确确认。',
      id: 'status',
      label: '确认状态',
      options: ['已确认', '待确认'],
      required: false,
      type: 'select',
      enabled: true,
    },
  ],
  timeline: [
    {
      description: '事件的具体时间、相对时间或剧情阶段。',
      id: 'time',
      label: '时间或阶段',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '事件是否发生、是否完成或当前进展。',
      id: 'status',
      label: '状态',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
  ],
  world: [
    {
      description: '历法名称；填写后可在时间确认中直接选择。',
      id: 'calendarName',
      label: '历法名称',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '纪年显示名称，例如“公历”或“星历”。',
      id: 'calendarEraName',
      label: '纪元名称',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '每年包含的月份数量。',
      id: 'calendarMonthsPerYear',
      label: '每年月份',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '每月天数；统一天数填一个数字，不同月份用逗号分隔。',
      id: 'calendarMonthDays',
      label: '每月天数',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '世界观设定适用的对象、区域或情境。',
      id: 'scope',
      label: '适用范围',
      options: [],
      required: false,
      type: 'text',
      enabled: true,
    },
    {
      description: '设定是否已经在剧情中明确确认。',
      id: 'status',
      label: '确认状态',
      options: ['已确认', '待确认'],
      required: false,
      type: 'select',
      enabled: true,
    },
  ],
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanTags(tags: string[]) {
  return [...new Set(tags.map(tag => tag.trim()).filter(Boolean))];
}

function builtInTableId(kind: ProfileKind) {
  return `profile_table_${kind}`;
}

function cloneColumns(columns: ProfileTableColumn[]) {
  const cloned = columns
    .filter(column => column.id !== 'content')
    .map(column => ({
      ...column,
      description: column.description ?? '',
      enabled: column.id === 'title' ? true : column.enabled,
      options: [...column.options],
    }));
  if (!cloned.some(column => column.id === 'details')) {
    const details = coreColumns.find(column => column.id === 'details');
    if (details) cloned.push({ ...details, options: [...details.options] });
  }
  return cloned;
}

export function getProfileKindLabel(kind: ProfileKind) {
  return profileKindOptions.find(option => option.id === kind)?.label || '其他';
}

export function createBuiltInProfileTables() {
  const timestamp = nowIso();
  return profileKindOptions.map(
    ({ id: kind, label }) =>
      ({
        builtIn: true,
        columns: cloneColumns([...coreColumns, ...tableExtras[kind]]),
        createdAt: timestamp,
        displayFormat: '',
        id: builtInTableId(kind),
        kind,
        name: label,
        renderMode: 'markdown',
        updatedAt: timestamp,
      }) satisfies ProfileTable,
  );
}

function normalizeTables(data: z.infer<typeof ProfilesScopeDataBaseSchema>) {
  const builtIns = createBuiltInProfileTables();
  const existing = new Map(data.tables.map(table => [table.id, table]));
  const tables = builtIns.map(table => {
    const saved = existing.get(table.id);
    const savedColumns = cloneColumns(saved?.columns ?? []);
    const savedColumnIds = new Set(savedColumns.map(column => column.id));
    const requiredNewColumnIds = new Set(
      table.kind === 'character'
        ? ['birthDate']
        : table.kind === 'world'
          ? ['calendarName', 'calendarEraName', 'calendarMonthsPerYear', 'calendarMonthDays']
          : [],
    );
    const addedBuiltInColumns = table.columns
      .filter(column => requiredNewColumnIds.has(column.id) && !savedColumnIds.has(column.id))
      .map(column => ({ ...column, options: [...column.options] }));
    return saved
      ? { ...saved, builtIn: true, columns: [...savedColumns, ...addedBuiltInColumns] }
      : table;
  });
  data.tables.forEach(table => {
    if (!tables.some(item => item.id === table.id)) tables.push({ ...table, columns: cloneColumns(table.columns) });
  });
  return tables;
}

export const ProfilesScopeDataSchema = ProfilesScopeDataBaseSchema.transform(data => {
  const tables = normalizeTables(data);
  return {
    ...data,
    entries: data.entries.map(entry => ({
      ...entry,
      fields: entry.fields ?? {},
      tableId: tables.some(table => table.id === entry.tableId) ? entry.tableId : builtInTableId(entry.kind),
    })),
    tables,
  };
});
export type ProfilesScopeData = z.infer<typeof ProfilesScopeDataSchema>;

export type ProfileEntryInput = Partial<
  Pick<ProfileEntry, 'favorite' | 'fields' | 'kind' | 'origin' | 'summary' | 'tableId' | 'tags'>
> &
  Pick<ProfileEntry, 'title'>;
export type ProfileEntryUpdate = Pick<ProfileEntry, 'kind' | 'summary' | 'tags' | 'title'> &
  Partial<Pick<ProfileEntry, 'fields' | 'origin' | 'tableId'>>;

export const useProfilesStore = defineStore('profiles', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: profilesField,
    schema: ProfilesScopeDataSchema,
    createDefault: () => validateInplace(ProfilesScopeDataSchema, {}),
  });

  const entries = computed(() =>
    [...data.value.entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );
  const tables = computed(() => [...data.value.tables]);
  const failedDraftCollection = createFailedDraftCollection(data, 'profile_failed');

  function getEntry(entryId: string) {
    return data.value.entries.find(entry => entry.id === entryId) ?? null;
  }

  function getTable(tableId: string) {
    return data.value.tables.find(table => table.id === tableId) ?? null;
  }

  function getDefaultTable(kind: ProfileKind) {
    return getTable(builtInTableId(kind)) ?? data.value.tables[0] ?? null;
  }

  function getEntriesForTable(tableId: string) {
    return entries.value.filter(entry => entry.tableId === tableId);
  }

  function getEntryField(entry: ProfileEntry, columnId: string) {
    if (columnId === 'title') return entry.title;
    if (columnId === 'summary') return entry.summary;
    if (columnId === 'tags') return entry.tags.join('、');
    return entry.fields[columnId] || '';
  }

  function createEntry(input: ProfileEntryInput) {
    const timestamp = nowIso();
    const table = getTable(input.tableId || '') ?? getDefaultTable(input.kind ?? 'character');
    const entry: ProfileEntry = {
      createdAt: timestamp,
      favorite: input.favorite ?? false,
      fields: Object.fromEntries(Object.entries(input.fields ?? {}).map(([key, value]) => [key, String(value).trim()])),
      id: createId('profile_entry'),
      kind: table?.kind ?? input.kind ?? 'character',
      origin: input.origin ?? null,
      summary: input.summary?.trim() || '',
      tableId: table?.id ?? builtInTableId(input.kind ?? 'character'),
      tags: cleanTags(input.tags ?? []),
      title: input.title.trim() || '未命名资料',
      updatedAt: timestamp,
    };
    data.value.entries = [entry, ...data.value.entries];
    return entry;
  }

  function updateEntry(entryId: string, input: ProfileEntryUpdate) {
    const entry = getEntry(entryId);
    if (!entry) return null;
    const table = getTable(input.tableId || entry.tableId) ?? getDefaultTable(input.kind);
    entry.title = input.title.trim() || entry.title;
    entry.kind = table?.kind ?? input.kind;
    entry.origin = typeof input.origin === 'undefined' ? entry.origin : input.origin;
    entry.tableId = table?.id ?? entry.tableId;
    entry.summary = input.summary.trim();
    entry.tags = cleanTags(input.tags);
    entry.fields = Object.fromEntries(
      Object.entries(input.fields ?? entry.fields).map(([key, value]) => [key, String(value).trim()]),
    );
    entry.updatedAt = nowIso();
    return entry;
  }

  function createTable(input: Pick<ProfileTable, 'kind' | 'name'> & Partial<Pick<ProfileTable, 'columns'>>) {
    const timestamp = nowIso();
    const table: ProfileTable = {
      builtIn: false,
      columns: input.columns?.length ? cloneColumns(input.columns) : cloneColumns(coreColumns),
      createdAt: timestamp,
      displayFormat: '',
      id: createId('profile_table'),
      kind: input.kind,
      name: input.name.trim() || '未命名表格',
      renderMode: 'markdown',
      updatedAt: timestamp,
    };
    data.value.tables.push(table);
    return table;
  }

  function updateTable(
    tableId: string,
    input: Pick<ProfileTable, 'columns' | 'displayFormat' | 'kind' | 'name' | 'renderMode'>,
  ) {
    const table = getTable(tableId);
    if (!table) return null;
    const nextColumnIds = new Set(input.columns.map(column => column.id));
    const removedColumnIds = new Set(
      table.columns.map(column => column.id).filter(columnId => !nextColumnIds.has(columnId)),
    );
    table.name = input.name.trim() || table.name;
    table.kind = input.kind;
    table.columns = cloneColumns(input.columns);
    table.displayFormat = input.displayFormat.trim();
    table.renderMode = input.renderMode;
    table.updatedAt = nowIso();
    data.value.entries
      .filter(entry => entry.tableId === tableId)
      .forEach(entry => {
        entry.kind = table.kind;
        if (removedColumnIds.size) {
          entry.fields = Object.fromEntries(
            Object.entries(entry.fields).filter(([columnId]) => !removedColumnIds.has(columnId)),
          );
        }
      });
    return table;
  }

  function deleteTable(tableId: string) {
    const table = getTable(tableId);
    if (!table || table.builtIn) return null;
    const fallback = getDefaultTable('note');
    data.value.entries.forEach(entry => {
      if (entry.tableId !== tableId) return;
      entry.tableId = fallback?.id ?? builtInTableId('note');
      entry.kind = fallback?.kind ?? 'note';
      entry.updatedAt = nowIso();
    });
    data.value.tables = data.value.tables.filter(item => item.id !== tableId);
    return table;
  }

  function deleteEntry(entryId: string) {
    data.value.entries = data.value.entries.filter(entry => entry.id !== entryId);
  }

  function toggleFavorite(entryId: string) {
    const entry = getEntry(entryId);
    if (!entry) return;
    entry.favorite = !entry.favorite;
    entry.updatedAt = nowIso();
  }

  return {
    ...failedDraftCollection,
    createEntry,
    createTable,
    data,
    deleteEntry,
    deleteTable,
    entries,
    getDefaultTable,
    getEntriesForTable,
    getEntry,
    getEntryField,
    getTable,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    tables,
    toggleFavorite,
    updateEntry,
    updateTable,
  };
});
