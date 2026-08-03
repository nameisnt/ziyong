import {
  areChatScopeKeysEquivalent,
  getCurrentChatScopeKey,
  readChatScopedEnvelope,
  useChatScopedDomain,
} from '@/store/chatScoped';
import { getProfileKindLabel, profilesField, ProfilesScopeDataSchema, type ProfileEntry } from '@/apps/profiles/store';
import { getOptionalGlobalFunction } from '@/util/runtime';
import { validateInplace } from '@/util/zod';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const worldSlotsField = 'sillytavern_phone_world_slots';
export const WORLD_SLOTS_BOOK_NAME = '当前聊天';

export const WorldSlotPositionSchema = z.enum([
  'before_character_definition',
  'after_character_definition',
  'before_example_messages',
  'after_example_messages',
  'before_author_note',
  'after_author_note',
  'at_depth',
]);
export type WorldSlotPosition = z.infer<typeof WorldSlotPositionSchema>;
export const WorldSlotRoleSchema = z.enum(['system', 'user', 'assistant']);
export type WorldSlotRole = z.infer<typeof WorldSlotRoleSchema>;
export const WorldSlotLogicSchema = z.enum(['and_any', 'and_all', 'not_all', 'not_any']);
export type WorldSlotLogic = z.infer<typeof WorldSlotLogicSchema>;

export const WorldSlotSchema = z.object({
  id: z.string(),
  title: z.string(),
  keys: z.array(z.string()).default([]),
  secondaryKeys: z.array(z.string()).default([]),
  selectiveLogic: WorldSlotLogicSchema.default('and_any'),
  content: z.string().default(''),
  enabled: z.boolean().default(true),
  position: WorldSlotPositionSchema.default('before_character_definition'),
  insertionOrder: z.number().int().default(100),
  depth: z.number().int().min(0).max(10000).default(4),
  role: WorldSlotRoleSchema.default('system'),
  probability: z.number().int().min(0).max(100).default(100),
  excludeRecursion: z.boolean().default(false),
  preventRecursion: z.boolean().default(false),
  sticky: z.number().int().min(1).max(10000).nullable().default(null),
  cooldown: z.number().int().min(1).max(10000).nullable().default(null),
  delay: z.number().int().min(1).max(10000).nullable().default(null),
  worldEntryId: z.number().int().nonnegative().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorldSlot = z.infer<typeof WorldSlotSchema>;

type WorldSlotEditableFields = Pick<
  WorldSlot,
  | 'content'
  | 'cooldown'
  | 'delay'
  | 'depth'
  | 'enabled'
  | 'excludeRecursion'
  | 'insertionOrder'
  | 'keys'
  | 'position'
  | 'preventRecursion'
  | 'probability'
  | 'role'
  | 'secondaryKeys'
  | 'selectiveLogic'
  | 'sticky'
  | 'title'
>;

export type WorldSlotCreateInput = Partial<WorldSlotEditableFields>;
export type WorldSlotUpdateInput = WorldSlotEditableFields;

export const WorldSlotsScopeDataSchema = z.object({
  slots: z.array(WorldSlotSchema).default([]),
});
export type WorldSlotsScopeData = z.infer<typeof WorldSlotsScopeDataSchema>;

export const worldSlotPositionOptions: Array<{ id: WorldSlotPosition; label: string }> = [
  { id: 'before_character_definition', label: '角色定义前' },
  { id: 'after_character_definition', label: '角色定义后' },
  { id: 'before_example_messages', label: '示例消息前' },
  { id: 'after_example_messages', label: '示例消息后' },
  { id: 'before_author_note', label: '作者注释前' },
  { id: 'after_author_note', label: '作者注释后' },
  { id: 'at_depth', label: '指定深度' },
];

export const worldSlotRoleOptions: Array<{ id: WorldSlotRole; label: string }> = [
  { id: 'system', label: '系统' },
  { id: 'user', label: '用户' },
  { id: 'assistant', label: '助手' },
];

export const worldSlotLogicOptions: Array<{ id: WorldSlotLogic; label: string }> = [
  { id: 'and_any', label: '满足任一' },
  { id: 'and_all', label: '满足全部' },
  { id: 'not_all', label: '非全部满足' },
  { id: 'not_any', label: '全部不满足' },
];

type WorldBookEntry = Record<string, unknown> & {
  uid?: number;
  key?: string[];
  keysecondary?: string[];
  comment?: string;
  content?: string;
  disable?: boolean;
  extensions?: Record<string, unknown>;
  id?: number;
  sillytavernPhoneSlotId?: string;
};

export type WorldSlotsSyncStatus = 'error' | 'idle' | 'synced' | 'syncing';

export interface WorldSlotsSyncResult {
  bookName: string;
  created: number;
  removed: number;
  skipped: boolean;
  total: number;
  updated: number;
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanList(items: string[]) {
  return [...new Set(items.map(item => item.trim()).filter(Boolean))];
}

export function getWorldSlotPositionLabel(position: WorldSlotPosition) {
  return worldSlotPositionOptions.find(option => option.id === position)?.label || '角色定义前';
}

function getSlotMarker(slotId: string) {
  return `sillytavern_phone_world_slot:${slotId}`;
}

function getEntrySlotId(entry: WorldBookEntry) {
  if (typeof entry.sillytavernPhoneSlotId === 'string' && entry.sillytavernPhoneSlotId.trim()) {
    return entry.sillytavernPhoneSlotId.trim();
  }
  const extensionId = entry.extensions?.sillytavernPhoneSlotId;
  if (typeof extensionId === 'string' && extensionId.trim()) return extensionId.trim();
  const comment = typeof entry.comment === 'string' ? entry.comment : '';
  const match = comment.match(/\[sillytavern_phone_world_slot:([^\]]+)\]/);
  return match?.[1] || '';
}

const worldInfoPositionBySlot: Record<WorldSlotPosition, number> = {
  before_character_definition: 0,
  after_character_definition: 1,
  before_author_note: 2,
  after_author_note: 3,
  at_depth: 4,
  before_example_messages: 5,
  after_example_messages: 6,
};

const worldInfoRoleBySlot: Record<WorldSlotRole, number> = {
  system: 0,
  user: 1,
  assistant: 2,
};

const worldInfoLogicBySlot: Record<WorldSlotLogic, number> = {
  and_any: 0,
  not_all: 1,
  not_any: 2,
  and_all: 3,
};

function createWorldEntry(slot: WorldSlot, entryId: number): WorldBookEntry {
  const usesKeys = slot.keys.length > 0;
  return {
    uid: entryId,
    key: slot.keys,
    keysecondary: slot.secondaryKeys,
    comment: `[${getSlotMarker(slot.id)}] ${slot.title}`,
    content: slot.content.trim(),
    constant: !usesKeys,
    vectorized: false,
    selective: usesKeys,
    selectiveLogic: worldInfoLogicBySlot[slot.selectiveLogic],
    addMemo: true,
    order: slot.insertionOrder,
    position: worldInfoPositionBySlot[slot.position],
    disable: !slot.enabled,
    ignoreBudget: false,
    excludeRecursion: slot.excludeRecursion,
    preventRecursion: slot.preventRecursion,
    delayUntilRecursion: 0,
    displayIndex: entryId,
    probability: slot.probability,
    useProbability: true,
    depth: slot.depth,
    outletName: '',
    group: '',
    groupOverride: false,
    groupWeight: 100,
    scanDepth: null,
    caseSensitive: null,
    matchWholeWords: null,
    useGroupScoring: null,
    automationId: '',
    role: worldInfoRoleBySlot[slot.role],
    sticky: slot.sticky,
    cooldown: slot.cooldown,
    delay: slot.delay,
    triggers: [],
    sillytavernPhoneSlotId: slot.id,
  };
}

function buildProfileContent(entry: ProfileEntry, columns: Array<{ id: string; label: string }>) {
  const fieldLines = columns
    .filter(column => !['title', 'summary', 'tags', 'content'].includes(column.id))
    .map(column => (entry.fields[column.id]?.trim() ? `${column.label}：${entry.fields[column.id].trim()}` : ''))
    .filter(Boolean);
  return [
    `## ${entry.title}`,
    `类型：${getProfileKindLabel(entry.kind)}`,
    entry.summary ? `摘要：${entry.summary}` : '',
    entry.tags.length ? `标签：${entry.tags.join('、')}` : '',
    ...fieldLines,
  ]
    .filter(Boolean)
    .join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function migrateLegacyWorldSlotSettings() {
  const currentScopeKey = getCurrentChatScopeKey();
  const envelope = readChatScopedEnvelope(worldSlotsField, currentScopeKey);
  const profileEnvelope = readChatScopedEnvelope(profilesField, currentScopeKey);
  let changed = false;

  Object.entries(envelope.scopes).forEach(([scopeKey, rawScope]) => {
    if (!isRecord(rawScope) || !Array.isArray(rawScope.slots)) return;
    const profileScope = Object.entries(profileEnvelope.scopes).find(
      ([candidateScopeKey]) =>
        candidateScopeKey === scopeKey || areChatScopeKeysEquivalent(candidateScopeKey, scopeKey),
    )?.[1];
    const profileResult = ProfilesScopeDataSchema.safeParse(profileScope ?? {});
    const profileData = profileResult.success ? profileResult.data : null;
    const profilesById = new Map(profileData?.entries.map(entry => [entry.id, entry]) ?? []);
    const tablesById = new Map(profileData?.tables.map(table => [table.id, table]) ?? []);
    const slots = rawScope.slots.map(rawSlot => {
      if (!isRecord(rawSlot)) return rawSlot;
      const profileEntryIds = Array.isArray(rawSlot.profileEntryIds)
        ? rawSlot.profileEntryIds.filter((id): id is string => typeof id === 'string')
        : [];
      const profileBlocks = profileEntryIds
        .map(id => profilesById.get(id))
        .filter((entry): entry is ProfileEntry => Boolean(entry))
        .map(entry => buildProfileContent(entry, tablesById.get(entry.tableId)?.columns ?? []));
      const content = [typeof rawSlot.content === 'string' ? rawSlot.content.trim() : '', ...profileBlocks]
        .filter(Boolean)
        .join('\n\n');
      const slot = { ...rawSlot };
      delete slot.profileEntryIds;
      delete slot.type;
      if ('profileEntryIds' in rawSlot || 'type' in rawSlot) changed = true;
      return { ...slot, content };
    });
    const scope: Record<string, unknown> = { ...rawScope, slots };
    delete scope.bookName;
    if ('bookName' in rawScope) changed = true;
    envelope.scopes[scopeKey] = scope;
  });

  if (changed) _.set(extension_settings, worldSlotsField, envelope);
}

function nextEntryId(entries: Record<string, WorldBookEntry>) {
  const ids = Object.keys(entries)
    .map(key => Number(key))
    .filter(value => Number.isFinite(value) && value >= 0);
  return ids.length ? Math.max(...ids) + 1 : 0;
}

export const useWorldSlotsStore = defineStore('world-slots', () => {
  migrateLegacyWorldSlotSettings();
  const {
    data,
    rehydrateFromSettings: rehydrateScopedData,
    resetCurrentScope: resetScopedData,
    scopeKey,
    switchScope: switchScopedData,
  } = useChatScopedDomain({
    field: worldSlotsField,
    schema: WorldSlotsScopeDataSchema,
    createDefault: () => validateInplace(WorldSlotsScopeDataSchema, {}),
  });
  const syncError = ref('');
  const syncStatus = ref<WorldSlotsSyncStatus>('idle');
  const lastSyncedAt = ref('');
  let autoSyncStarted = false;
  let syncRequestId = 0;
  let syncTail: Promise<void> = Promise.resolve();

  const slots = computed(() =>
    [...data.value.slots].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );
  const isCurrentChatScope = computed(() => areChatScopeKeysEquivalent(scopeKey.value, getCurrentChatScopeKey()));

  function getSlot(slotId: string) {
    return data.value.slots.find(slot => slot.id === slotId) ?? null;
  }

  function buildSlot(input: WorldSlotCreateInput, timestamp: string): WorldSlot {
    return {
      id: createId('world_slot'),
      title: input.title?.trim() || '未命名槽位',
      keys: cleanList(input.keys ?? []),
      secondaryKeys: cleanList(input.secondaryKeys ?? []),
      selectiveLogic: input.selectiveLogic ?? 'and_any',
      content: input.content?.trim() || '',
      enabled: input.enabled ?? true,
      position: input.position ?? 'before_character_definition',
      insertionOrder: input.insertionOrder ?? 100,
      depth: input.depth ?? 4,
      role: input.role ?? 'system',
      probability: input.probability ?? 100,
      excludeRecursion: input.excludeRecursion ?? false,
      preventRecursion: input.preventRecursion ?? false,
      sticky: input.sticky ?? null,
      cooldown: input.cooldown ?? null,
      delay: input.delay ?? null,
      worldEntryId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  function createSlots(inputs: WorldSlotCreateInput[]) {
    if (!inputs.length) return [];
    const timestamp = nowIso();
    const createdSlots = inputs.map(input => buildSlot(input, timestamp));
    data.value.slots = [...createdSlots, ...data.value.slots];
    queueAutoSync();
    return createdSlots;
  }

  function createSlot(input: WorldSlotCreateInput) {
    return createSlots([input])[0]!;
  }

  function updateSlot(slotId: string, input: WorldSlotUpdateInput) {
    const slot = getSlot(slotId);
    if (!slot) return null;
    slot.title = input.title.trim() || slot.title;
    slot.keys = cleanList(input.keys);
    slot.secondaryKeys = cleanList(input.secondaryKeys);
    slot.selectiveLogic = input.selectiveLogic;
    slot.content = input.content.trim();
    slot.enabled = input.enabled;
    slot.position = input.position;
    slot.insertionOrder = input.insertionOrder;
    slot.depth = input.depth;
    slot.role = input.role;
    slot.probability = input.probability;
    slot.excludeRecursion = input.excludeRecursion;
    slot.preventRecursion = input.preventRecursion;
    slot.sticky = input.sticky;
    slot.cooldown = input.cooldown;
    slot.delay = input.delay;
    slot.updatedAt = nowIso();
    queueAutoSync();
    return slot;
  }

  function deleteSlot(slotId: string) {
    data.value.slots = data.value.slots.filter(slot => slot.id !== slotId);
    queueAutoSync();
  }

  function isRequestCurrent(requestId: number, targetScopeKey: string) {
    return (
      requestId === syncRequestId &&
      areChatScopeKeysEquivalent(scopeKey.value, targetScopeKey) &&
      areChatScopeKeysEquivalent(targetScopeKey, getCurrentChatScopeKey())
    );
  }

  function skippedResult(): WorldSlotsSyncResult {
    return {
      bookName: WORLD_SLOTS_BOOK_NAME,
      created: 0,
      removed: 0,
      skipped: true,
      total: data.value.slots.length,
      updated: 0,
    };
  }

  async function performSync(requestId: number, targetScopeKey: string): Promise<WorldSlotsSyncResult> {
    if (!isRequestCurrent(requestId, targetScopeKey)) return skippedResult();

    const bookName = WORLD_SLOTS_BOOK_NAME;
    const loadWorldInfo = getOptionalGlobalFunction<(name: string) => Promise<unknown | null>>('loadWorldInfo');
    const saveWorldInfo =
      getOptionalGlobalFunction<(name: string, data: unknown, immediately?: boolean) => Promise<void>>('saveWorldInfo');
    const getGlobalWorldbookNames = getOptionalGlobalFunction<() => string[]>('getGlobalWorldbookNames');
    const rebindGlobalWorldbooks =
      getOptionalGlobalFunction<(worldbookNames: string[]) => Promise<void>>('rebindGlobalWorldbooks');
    const updateWorldInfoList = getOptionalGlobalFunction<() => Promise<void>>('updateWorldInfoList');
    const reloadWorldInfoEditor =
      getOptionalGlobalFunction<(file: string, loadIfNotSelected?: boolean) => void>('reloadWorldInfoEditor');
    if (!loadWorldInfo || !saveWorldInfo || !getGlobalWorldbookNames || !rebindGlobalWorldbooks) {
      throw new Error('当前酒馆环境没有开放完整的世界书读写 API');
    }

    const slotSnapshot = klona(data.value.slots);

    const loaded = await loadWorldInfo(bookName);
    if (!isRequestCurrent(requestId, targetScopeKey)) return skippedResult();
    const book =
      loaded && typeof loaded === 'object'
        ? (klona(loaded) as { entries?: Record<string, WorldBookEntry>; name?: string })
        : { entries: {}, name: bookName };
    const entries = book.entries && typeof book.entries === 'object' ? book.entries : {};
    const entryIdBySlot = new Map<string, number>();
    const currentSlotIds = new Set(slotSnapshot.map(slot => slot.id));
    const retainedSlotIds = new Set<string>();
    let removed = 0;

    Object.entries(entries).forEach(([key, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      const slotId = getEntrySlotId(entry);
      if (!slotId) return;
      if (!currentSlotIds.has(slotId) || retainedSlotIds.has(slotId)) {
        delete entries[key];
        removed += 1;
        return;
      }
      const numericId = Number(key);
      if (Number.isFinite(numericId)) {
        entryIdBySlot.set(slotId, numericId);
        retainedSlotIds.add(slotId);
      }
    });

    let created = 0;
    let updated = 0;
    slotSnapshot.forEach(slot => {
      const existingId = entryIdBySlot.get(slot.id);
      const entryId = typeof existingId === 'number' ? existingId : nextEntryId(entries);
      if (typeof existingId === 'number') updated += 1;
      else created += 1;
      entries[String(entryId)] = createWorldEntry(slot, entryId);
    });

    if (!isRequestCurrent(requestId, targetScopeKey)) return skippedResult();
    book.name = book.name || bookName;
    book.entries = entries;
    await saveWorldInfo(bookName, book, true);
    await updateWorldInfoList?.();

    const globalNames = cleanList(getGlobalWorldbookNames());
    if (!globalNames.includes(bookName)) {
      await rebindGlobalWorldbooks([...globalNames, bookName]);
    }
    reloadWorldInfoEditor?.(bookName, false);

    if (isRequestCurrent(requestId, targetScopeKey)) {
      const syncedEntryIds = new Map<string, number>();
      Object.entries(entries).forEach(([key, entry]) => {
        if (!entry || typeof entry !== 'object') return;
        const slotId = getEntrySlotId(entry);
        const entryId = Number(key);
        if (slotId && Number.isFinite(entryId)) syncedEntryIds.set(slotId, entryId);
      });
      data.value.slots.forEach(slot => {
        slot.worldEntryId = syncedEntryIds.get(slot.id) ?? null;
      });
    }

    return {
      bookName,
      created,
      removed,
      skipped: !isRequestCurrent(requestId, targetScopeKey),
      total: slotSnapshot.length,
      updated,
    };
  }

  function syncToWorldBook(): Promise<WorldSlotsSyncResult> {
    if (!isCurrentChatScope.value) return Promise.resolve(skippedResult());

    const requestId = ++syncRequestId;
    const targetScopeKey = scopeKey.value;
    syncError.value = '';
    syncStatus.value = 'syncing';

    const task = syncTail.then(() => performSync(requestId, targetScopeKey));
    syncTail = task.then(
      () => undefined,
      () => undefined,
    );
    return task.then(
      result => {
        if (requestId === syncRequestId) {
          syncStatus.value = result.skipped ? 'idle' : 'synced';
          if (!result.skipped) lastSyncedAt.value = nowIso();
        }
        return result;
      },
      error => {
        if (requestId === syncRequestId) {
          syncError.value = error instanceof Error ? error.message : '同步失败';
          syncStatus.value = 'error';
        }
        throw error;
      },
    );
  }

  async function autoSyncToWorldBook() {
    try {
      return await syncToWorldBook();
    } catch (error) {
      console.error('[酒馆手机] 世界书槽位自动同步失败', error);
      return null;
    }
  }

  function queueAutoSync() {
    if (!autoSyncStarted || !isCurrentChatScope.value) return;
    void autoSyncToWorldBook();
  }

  function startAutoSync() {
    if (autoSyncStarted) return;
    autoSyncStarted = true;
    queueAutoSync();
  }

  function rehydrateFromSettings() {
    migrateLegacyWorldSlotSettings();
    rehydrateScopedData();
    queueAutoSync();
  }

  function resetCurrentScope() {
    resetScopedData();
    queueAutoSync();
  }

  function switchScope(nextScopeKey: string) {
    switchScopedData(nextScopeKey);
  }

  watch(scopeKey, queueAutoSync);

  return {
    autoSyncToWorldBook,
    createSlot,
    createSlots,
    data,
    deleteSlot,
    getSlot,
    isCurrentChatScope,
    lastSyncedAt,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    slots,
    startAutoSync,
    switchScope,
    syncError,
    syncStatus,
    syncToWorldBook,
    updateSlot,
  };
});
