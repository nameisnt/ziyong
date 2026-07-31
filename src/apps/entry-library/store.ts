import { syncPresetLibraryBinding } from './api';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const entryLibraryField = 'sillytavern_phone_entry_library';
export const ENTRY_LIBRARY_CONTENT_PLACEHOLDER = '{{条目库内容}}';

const groupNameCollator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
});

export const EntryLibraryGroupSchema = z.object({
  id: z.string(),
  name: z.string().default('未命名分组'),
  enabled: z.boolean().default(true),
  createdAt: z.string().default(''),
});
export type EntryLibraryGroup = z.infer<typeof EntryLibraryGroupSchema>;

export const EntryLibraryItemSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  order: z.number().int().nonnegative().default(0),
  title: z.string().default('未命名条目'),
  content: z.string().default(''),
  enabled: z.boolean().default(true),
  sourceType: z.enum(['preset', 'worldbook']),
  sourceName: z.string().default(''),
  sourceEntryId: z.string().default(''),
  sourceRole: z.enum(['assistant', 'system', 'user']).optional(),
  createdAt: z.string().default(''),
  updatedAt: z.string().default(''),
});
export type EntryLibraryItem = z.infer<typeof EntryLibraryItemSchema>;

export const EntryLibraryBindingSchema = z.object({
  id: z.string(),
  presetName: z.string(),
  targetPromptId: z.string(),
  targetPromptName: z.string(),
  targetPromptSource: z.enum(['prompts', 'prompts_unused']).default('prompts'),
  groupId: z.string(),
  contentTemplate: z.string().default(ENTRY_LIBRARY_CONTENT_PLACEHOLDER),
  updatedAt: z.string().default(''),
});
export type EntryLibraryBinding = z.infer<typeof EntryLibraryBindingSchema>;

export const EntryLibrarySettingsSchema = z.object({
  bindings: z.array(EntryLibraryBindingSchema).default([]),
  groups: z.array(EntryLibraryGroupSchema).default([]),
  items: z.array(EntryLibraryItemSchema).default([]),
  version: z.literal(1).default(1),
});
export type EntryLibrarySettings = z.infer<typeof EntryLibrarySettingsSchema>;

export interface DuplicateEntryPair {
  left: EntryLibraryItem;
  right: EntryLibraryItem;
  score: number;
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readSettings(raw: unknown) {
  const settings = validateInplace(EntryLibrarySettingsSchema, raw && typeof raw === 'object' ? raw : {});
  settings.groups.forEach(group => {
    const groupItems = settings.items
      .map((item, sourceIndex) => ({ item, sourceIndex }))
      .filter(entry => entry.item.groupId === group.id)
      .sort(
        (left, right) =>
          (left.item.order || Number.MAX_SAFE_INTEGER) - (right.item.order || Number.MAX_SAFE_INTEGER) ||
          left.sourceIndex - right.sourceIndex,
      );
    if (!group.enabled) {
      groupItems.forEach(({ item }) => {
        item.enabled = false;
      });
    }
    group.enabled = true;
    groupItems.forEach(({ item }, index) => {
      item.order = index + 1;
    });
  });
  return settings;
}

function compareGroups(left: EntryLibraryGroup, right: EntryLibraryGroup) {
  return (
    groupNameCollator.compare(left.name, right.name) ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export function renderEntryLibraryBindingContent(template: string, groupContent: string) {
  if (!groupContent) return '';
  return template.split(ENTRY_LIBRARY_CONTENT_PLACEHOLDER).join(groupContent);
}

function normalizeDuplicateContent(content: string) {
  return content
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function shingles(content: string, size = 5) {
  if (content.length <= size) return new Set(content ? [content] : []);
  const result = new Set<string>();
  for (let index = 0; index <= content.length - size; index += 1) {
    result.add(content.slice(index, index + size));
  }
  return result;
}

export function calculateEntrySimilarity(leftContent: string, rightContent: string) {
  const left = normalizeDuplicateContent(leftContent);
  const right = normalizeDuplicateContent(rightContent);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (Math.min(left.length, right.length) < 40) return 0;
  const leftParts = shingles(left);
  const rightParts = shingles(right);
  let intersection = 0;
  leftParts.forEach(part => {
    if (rightParts.has(part)) intersection += 1;
  });
  return (2 * intersection) / (leftParts.size + rightParts.size);
}

export const useEntryLibraryStore = defineStore('entry-library', () => {
  const settings = ref<EntryLibrarySettings>(readSettings(_.get(extension_settings, entryLibraryField, {})));
  const syncingBindingIds = ref<string[]>([]);
  const syncTimers = new Map<string, number>();

  watch(
    settings,
    value => {
      _.set(extension_settings, entryLibraryField, readSettings(klona(value)));
      void saveSettingsDebounced();
    },
    { deep: true },
  );

  const groups = computed(() => settings.value.groups.slice().sort(compareGroups));
  const items = computed(() => settings.value.items);
  const bindings = computed(() => settings.value.bindings);

  function getGroup(groupId: string) {
    return groups.value.find(group => group.id === groupId) ?? null;
  }

  function getItem(itemId: string) {
    return items.value.find(item => item.id === itemId) ?? null;
  }

  function getGroupItems(groupId: string) {
    return items.value
      .filter(item => item.groupId === groupId)
      .slice()
      .sort(
        (left, right) =>
          left.order - right.order || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      );
  }

  function applyGroupOrder(groupId: string, orderedItems: EntryLibraryItem[]) {
    orderedItems.forEach((item, index) => {
      if (item.groupId === groupId) item.order = index + 1;
    });
  }

  function buildGroupContent(groupId: string) {
    return getGroupItems(groupId)
      .filter(item => item.enabled && item.content.trim())
      .map(item => item.content.trim())
      .join('\n\n');
  }

  async function syncBinding(bindingId: string) {
    const binding = bindings.value.find(item => item.id === bindingId);
    if (!binding) return;
    syncingBindingIds.value = [...new Set([...syncingBindingIds.value, bindingId])];
    try {
      await syncPresetLibraryBinding(
        binding,
        renderEntryLibraryBindingContent(binding.contentTemplate, buildGroupContent(binding.groupId)),
      );
      binding.updatedAt = nowIso();
    } finally {
      syncingBindingIds.value = syncingBindingIds.value.filter(id => id !== bindingId);
    }
  }

  async function syncGroup(groupId: string) {
    const targets = bindings.value.filter(binding => binding.groupId === groupId);
    const failures: string[] = [];
    for (const binding of targets) {
      try {
        await syncBinding(binding.id);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    if (failures.length) throw new Error([...new Set(failures)].join('；'));
  }

  function scheduleGroupSync(groupId: string) {
    const previous = syncTimers.get(groupId);
    if (previous) window.clearTimeout(previous);
    syncTimers.set(
      groupId,
      window.setTimeout(() => {
        syncTimers.delete(groupId);
        void syncGroup(groupId).catch(error => {
          toastr.warning(`收藏分组同步失败：${error instanceof Error ? error.message : String(error)}`);
        });
      }, 120),
    );
  }

  function createGroup(name: string) {
    const group: EntryLibraryGroup = {
      createdAt: nowIso(),
      enabled: true,
      id: createId('entry_group'),
      name: name.trim() || `分组 ${groups.value.length + 1}`,
    };
    settings.value.groups.push(group);
    return group;
  }

  function updateGroup(groupId: string, patch: Partial<Pick<EntryLibraryGroup, 'enabled' | 'name'>>) {
    const group = getGroup(groupId);
    if (!group) return;
    if (typeof patch.name === 'string') group.name = patch.name.trim() || group.name;
    if (typeof patch.enabled === 'boolean') setGroupItemsEnabled(groupId, patch.enabled);
    scheduleGroupSync(groupId);
  }

  function setGroupItemsEnabled(groupId: string, enabled: boolean) {
    const timestamp = nowIso();
    getGroupItems(groupId).forEach(item => {
      item.enabled = enabled;
      item.updatedAt = timestamp;
    });
    const group = getGroup(groupId);
    if (group) group.enabled = true;
    scheduleGroupSync(groupId);
  }

  function deleteGroup(groupId: string) {
    settings.value.groups = settings.value.groups.filter(group => group.id !== groupId);
    settings.value.items = items.value.filter(item => item.groupId !== groupId);
    settings.value.bindings = bindings.value.filter(binding => binding.groupId !== groupId);
  }

  function collectItems(
    groupId: string,
    sourceItems: Array<
      Pick<EntryLibraryItem, 'content' | 'sourceEntryId' | 'sourceName' | 'sourceRole' | 'sourceType' | 'title'>
    >,
  ) {
    if (!getGroup(groupId)) throw new Error('请选择有效的收藏分组');
    const timestamp = nowIso();
    const startOrder = getGroupItems(groupId).length + 1;
    const collected = sourceItems
      .filter(item => item.content.trim())
      .map(
        (item, index) =>
          ({
            ...item,
            content: item.content.trim(),
            createdAt: timestamp,
            enabled: true,
            groupId,
            id: createId('entry_item'),
            order: startOrder + index,
            title: item.title.trim() || '未命名条目',
            updatedAt: timestamp,
          }) satisfies EntryLibraryItem,
      );
    settings.value.items.push(...collected);
    scheduleGroupSync(groupId);
    return collected;
  }

  function updateItem(
    itemId: string,
    patch: Partial<Pick<EntryLibraryItem, 'content' | 'enabled' | 'groupId' | 'order' | 'title'>>,
  ) {
    const item = getItem(itemId);
    if (!item) return;
    const previousGroupId = item.groupId;
    const nextGroupId = typeof patch.groupId === 'string' && getGroup(patch.groupId) ? patch.groupId : previousGroupId;
    if (typeof patch.title === 'string') item.title = patch.title.trim() || item.title;
    if (typeof patch.content === 'string') item.content = patch.content;
    if (typeof patch.enabled === 'boolean') item.enabled = patch.enabled;
    item.groupId = nextGroupId;
    if (nextGroupId !== previousGroupId) {
      applyGroupOrder(previousGroupId, getGroupItems(previousGroupId));
    }
    const targetItems = getGroupItems(nextGroupId).filter(entry => entry.id !== itemId);
    const requestedPosition =
      typeof patch.order === 'number' && Number.isFinite(patch.order) ? Math.round(patch.order) : item.order;
    const targetIndex = Math.max(0, Math.min(requestedPosition - 1, targetItems.length));
    targetItems.splice(targetIndex, 0, item);
    applyGroupOrder(nextGroupId, targetItems);
    item.updatedAt = nowIso();
    scheduleGroupSync(previousGroupId);
    if (item.groupId !== previousGroupId) scheduleGroupSync(item.groupId);
  }

  function reorderGroupItems(groupId: string, orderedItemIds: string[]) {
    const currentItems = getGroupItems(groupId);
    const itemMap = new Map(currentItems.map(item => [item.id, item]));
    const nextItems = orderedItemIds.flatMap(id => {
      const item = itemMap.get(id);
      if (!item) return [];
      itemMap.delete(id);
      return [item];
    });
    nextItems.push(...currentItems.filter(item => itemMap.has(item.id)));
    applyGroupOrder(groupId, nextItems);
    scheduleGroupSync(groupId);
  }

  function moveItem(itemId: string, direction: -1 | 1) {
    const item = getItem(itemId);
    if (!item) return;
    const targetPosition = item.order + direction;
    if (targetPosition < 1 || targetPosition > getGroupItems(item.groupId).length) return;
    updateItem(itemId, { order: targetPosition });
  }

  function deleteItem(itemId: string) {
    const item = getItem(itemId);
    if (!item) return;
    settings.value.items = items.value.filter(entry => entry.id !== itemId);
    applyGroupOrder(item.groupId, getGroupItems(item.groupId));
    scheduleGroupSync(item.groupId);
  }

  function findDuplicates(threshold = 0.8) {
    const result: DuplicateEntryPair[] = [];
    for (let leftIndex = 0; leftIndex < items.value.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.value.length; rightIndex += 1) {
        const left = items.value[leftIndex];
        const right = items.value[rightIndex];
        const score = calculateEntrySimilarity(left.content, right.content);
        if (score > threshold) result.push({ left, right, score });
      }
    }
    return result.sort((left, right) => right.score - left.score);
  }

  async function createBinding(input: Omit<EntryLibraryBinding, 'id' | 'updatedAt'>) {
    if (!getGroup(input.groupId)) throw new Error('请选择有效的收藏分组');
    if (!input.contentTemplate.includes(ENTRY_LIBRARY_CONTENT_PLACEHOLDER)) {
      throw new Error(`绑定内容必须包含占位符 ${ENTRY_LIBRARY_CONTENT_PLACEHOLDER}`);
    }
    const conflict = bindings.value.find(
      binding =>
        binding.presetName === input.presetName &&
        binding.targetPromptSource === input.targetPromptSource &&
        binding.targetPromptId === input.targetPromptId,
    );
    if (conflict) throw new Error('这个预设条目已经绑定了收藏分组');
    const binding: EntryLibraryBinding = {
      ...input,
      id: createId('entry_binding'),
      updatedAt: '',
    };
    settings.value.bindings.push(binding);
    try {
      await syncBinding(binding.id);
      return binding;
    } catch (error) {
      settings.value.bindings = bindings.value.filter(item => item.id !== binding.id);
      throw error;
    }
  }

  function deleteBinding(bindingId: string) {
    settings.value.bindings = bindings.value.filter(binding => binding.id !== bindingId);
  }

  function importBackup(data: unknown) {
    settings.value = readSettings(data);
  }

  function rehydrateFromSettings() {
    settings.value = readSettings(_.get(extension_settings, entryLibraryField, {}));
  }

  onScopeDispose(() => {
    syncTimers.forEach(timer => window.clearTimeout(timer));
    syncTimers.clear();
  });

  return {
    bindings,
    collectItems,
    createBinding,
    createGroup,
    deleteBinding,
    deleteGroup,
    deleteItem,
    findDuplicates,
    getGroup,
    getGroupItems,
    getItem,
    groups,
    importBackup,
    items,
    moveItem,
    rehydrateFromSettings,
    reorderGroupItems,
    setGroupItemsEnabled,
    settings,
    syncBinding,
    syncGroup,
    syncingBindingIds,
    updateGroup,
    updateItem,
  };
});
