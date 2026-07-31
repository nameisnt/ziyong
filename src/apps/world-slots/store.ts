import { useChatScopedDomain } from '@/store/chatScoped';
import { getProfileKindLabel, useProfilesStore, type ProfileEntry } from '@/apps/profiles/store';
import { getOptionalGlobalFunction } from '@/util/runtime';
import { validateInplace } from '@/util/zod';

export const worldSlotsField = 'sillytavern_phone_world_slots';

export const WorldSlotTypeSchema = z.enum(['character', 'world', 'plot', 'relationship', 'note']);
export type WorldSlotType = z.infer<typeof WorldSlotTypeSchema>;

export const WorldSlotSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: WorldSlotTypeSchema.default('note'),
  keys: z.array(z.string()).default([]),
  profileEntryIds: z.array(z.string()).default([]),
  content: z.string().default(''),
  enabled: z.boolean().default(true),
  worldEntryId: z.number().int().nonnegative().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorldSlot = z.infer<typeof WorldSlotSchema>;

export const WorldSlotsScopeDataSchema = z.object({
  bookName: z.string().default(''),
  slots: z.array(WorldSlotSchema).default([]),
});
export type WorldSlotsScopeData = z.infer<typeof WorldSlotsScopeDataSchema>;

export const worldSlotTypeOptions: Array<{ id: WorldSlotType; label: string }> = [
  { id: 'character', label: '角色' },
  { id: 'world', label: '世界观' },
  { id: 'plot', label: '剧情' },
  { id: 'relationship', label: '关系' },
  { id: 'note', label: '其他' },
];

type WorldBookEntry = Record<string, unknown> & {
  comment?: string;
  content?: string;
  enabled?: boolean;
  extensions?: Record<string, unknown>;
  id?: number;
  keys?: string[];
  secondary_keys?: string[];
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanList(items: string[]) {
  return [...new Set(items.map(item => item.trim()).filter(Boolean))];
}

export function getWorldSlotTypeLabel(type: WorldSlotType) {
  return worldSlotTypeOptions.find(option => option.id === type)?.label || '其他';
}

function getSlotMarker(slotId: string) {
  return `sillytavern_phone_world_slot:${slotId}`;
}

function getEntrySlotId(entry: WorldBookEntry) {
  const extensionId = entry.extensions?.sillytavernPhoneSlotId;
  if (typeof extensionId === 'string' && extensionId.trim()) return extensionId.trim();
  const comment = typeof entry.comment === 'string' ? entry.comment : '';
  const match = comment.match(/\[sillytavern_phone_world_slot:([^\]]+)\]/);
  return match?.[1] || '';
}

function createWorldEntry(slot: WorldSlot, entryId: number): WorldBookEntry {
  const usesKeys = slot.keys.length > 0;
  return {
    keys: slot.keys,
    secondary_keys: [],
    comment: `[${getSlotMarker(slot.id)}] ${slot.title}`,
    content: buildWorldEntryContent(slot),
    constant: !usesKeys,
    selective: usesKeys,
    insertion_order: 100,
    enabled: slot.enabled,
    position: 'before',
    extensions: {
      position: 0,
      exclude_recursion: false,
      probability: 100,
      useProbability: false,
      depth: 4,
      selectiveLogic: 0,
      group: '',
      group_override: false,
      sillytavernPhoneSlotId: slot.id,
      sillytavernPhoneSlotType: slot.type,
    },
    id: entryId,
  };
}

function buildProfileContent(entry: ProfileEntry) {
  return [
    `## ${entry.title}`,
    `类型：${getProfileKindLabel(entry.kind)}`,
    entry.summary ? `摘要：${entry.summary}` : '',
    entry.tags.length ? `标签：${entry.tags.join('、')}` : '',
    entry.content,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildWorldEntryContent(slot: WorldSlot) {
  const profiles = useProfilesStore();
  const profileBlocks = slot.profileEntryIds
    .map(entryId => profiles.getEntry(entryId))
    .filter((entry): entry is ProfileEntry => Boolean(entry))
    .map(buildProfileContent);
  return [slot.content.trim(), ...profileBlocks].filter(Boolean).join('\n\n');
}

function nextEntryId(entries: Record<string, WorldBookEntry>) {
  const ids = Object.keys(entries)
    .map(key => Number(key))
    .filter(value => Number.isFinite(value) && value >= 0);
  return ids.length ? Math.max(...ids) + 1 : 0;
}

export const useWorldSlotsStore = defineStore('world-slots', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: worldSlotsField,
    schema: WorldSlotsScopeDataSchema,
    createDefault: () => validateInplace(WorldSlotsScopeDataSchema, {}),
  });

  const slots = computed(() =>
    [...data.value.slots].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );

  function getSlot(slotId: string) {
    return data.value.slots.find(slot => slot.id === slotId) ?? null;
  }

  function setBookName(bookName: string) {
    data.value.bookName = bookName.trim();
  }

  function createSlot(
    input: Partial<Pick<WorldSlot, 'content' | 'enabled' | 'keys' | 'profileEntryIds' | 'title' | 'type'>>,
  ) {
    const timestamp = nowIso();
    const slot: WorldSlot = {
      id: createId('world_slot'),
      title: input.title?.trim() || '未命名槽位',
      type: input.type ?? 'note',
      keys: cleanList(input.keys ?? []),
      profileEntryIds: cleanList(input.profileEntryIds ?? []),
      content: input.content?.trim() || '',
      enabled: input.enabled ?? true,
      worldEntryId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value.slots = [slot, ...data.value.slots];
    return slot;
  }

  function updateSlot(
    slotId: string,
    input: Pick<WorldSlot, 'content' | 'enabled' | 'keys' | 'profileEntryIds' | 'title' | 'type'>,
  ) {
    const slot = getSlot(slotId);
    if (!slot) return null;
    slot.title = input.title.trim() || slot.title;
    slot.type = input.type;
    slot.keys = cleanList(input.keys);
    slot.profileEntryIds = cleanList(input.profileEntryIds);
    slot.content = input.content.trim();
    slot.enabled = input.enabled;
    slot.updatedAt = nowIso();
    return slot;
  }

  function deleteSlot(slotId: string) {
    data.value.slots = data.value.slots.filter(slot => slot.id !== slotId);
  }

  async function syncToWorldBook() {
    const bookName = data.value.bookName.trim();
    if (!bookName) throw new Error('请先填写世界书名称');
    const loadWorldInfo = getOptionalGlobalFunction<(name: string) => Promise<unknown | null>>('loadWorldInfo');
    const saveWorldInfo =
      getOptionalGlobalFunction<(name: string, data: unknown, immediately?: boolean) => Promise<void>>('saveWorldInfo');
    const updateWorldInfoList = getOptionalGlobalFunction<() => Promise<void>>('updateWorldInfoList');
    const reloadWorldInfoEditor =
      getOptionalGlobalFunction<(file: string, loadIfNotSelected?: boolean) => void>('reloadWorldInfoEditor');
    if (!loadWorldInfo || !saveWorldInfo) throw new Error('当前酒馆环境没有开放世界书读写 API');

    const loaded = await loadWorldInfo(bookName);
    const book =
      loaded && typeof loaded === 'object'
        ? (klona(loaded) as { entries?: Record<string, WorldBookEntry>; name?: string })
        : { entries: {}, name: bookName };
    const entries = book.entries && typeof book.entries === 'object' ? book.entries : {};
    const entryIdBySlot = new Map<string, number>();

    Object.entries(entries).forEach(([key, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      const slotId = getEntrySlotId(entry);
      if (!slotId) return;
      const numericId = Number(key);
      if (Number.isFinite(numericId)) entryIdBySlot.set(slotId, numericId);
    });

    let created = 0;
    let updated = 0;
    data.value.slots.forEach(slot => {
      const existingId = entryIdBySlot.get(slot.id);
      const entryId = typeof existingId === 'number' ? existingId : nextEntryId(entries);
      if (typeof existingId === 'number') updated += 1;
      else created += 1;
      entries[String(entryId)] = createWorldEntry(slot, entryId);
      slot.worldEntryId = entryId;
      slot.updatedAt = nowIso();
    });

    book.name = book.name || bookName;
    book.entries = entries;
    await saveWorldInfo(bookName, book, true);
    await updateWorldInfoList?.();
    reloadWorldInfoEditor?.(bookName, true);
    return { bookName, created, total: data.value.slots.length, updated };
  }

  return {
    createSlot,
    data,
    deleteSlot,
    getSlot,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    setBookName,
    slots,
    switchScope,
    syncToWorldBook,
    updateSlot,
  };
});
