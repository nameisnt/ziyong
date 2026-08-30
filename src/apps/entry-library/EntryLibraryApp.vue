<template>
  <section class="pc-entry-library-app pc-app-fill">
    <EntryLibraryCatalogPage
      v-if="route.page === 'root'"
      v-model:group-name="newGroupName"
      v-model:query="libraryQuery"
      :item-count="items.length"
      :item-drag="itemDrag"
      :sections="catalogSections"
      @create-group="createGroup"
      @delete-group="deleteGroup"
      @delete-groups="deleteGroups"
      @delete-item="deleteItem"
      @delete-items="deleteItems"
      @item-pointer-cancel="onItemPointerCancel"
      @item-pointer-down="onItemPointerDown"
      @item-pointer-move="onItemPointerMove"
      @item-pointer-up="onItemPointerUp"
      @open-bindings="openBindings"
      @open-collect="openCollect"
      @open-dedupe="openDedupe"
      @open-item="openEditor"
      @open-manual="openManualEditor"
      @open-transfer="openTransfer"
      @toggle-group="toggleGroupOpen"
      @toggle-group-enabled="setGroupEnabled"
      @toggle-item="setItemEnabled"
    />

    <EntryLibraryTransferPage
      v-else-if="route.page === 'transfer'"
      v-model:mode="importMode"
      :binding-count="bindings.length"
      :group-count="groups.length"
      :item-count="items.length"
      @export="exportLibrary"
      @import="importLibrary"
    />

    <EntryLibraryCollectPage
      v-else-if="route.page === 'collect'"
      v-model:group-id="collectGroupId"
      v-model:query="sourceQuery"
      v-model:source-name="selectedSourceName"
      :entries="filteredSourceEntries"
      :group-name="collectGroupName"
      :groups="groups"
      :loading="sourceLoading"
      :selected-keys="selectedSourceKeys"
      :source-names="sourceNames"
      :source-type="sourceType"
      :visible-selected-count="visibleSelectedSourceCount"
      @change-source-type="setSourceType"
      @clear="clearSourceSelection"
      @collect="collectSelected"
      @invert="invertSourceSelection"
      @load-source="loadSourceEntries"
      @select-all="selectAllSources"
      @toggle-entry="toggleSourceEntry"
    />

    <EntryLibraryDedupePage
      v-else-if="route.page === 'dedupe'"
      :pair-key="pairKey"
      :pairs="duplicatePairs"
      @delete-item="deleteDuplicate"
      @dismiss="dismissPair"
    />

    <EntryLibraryBindingsPage
      v-else-if="route.page === 'bindings'"
      v-model:content-template="bindingContentTemplate"
      v-model:group-id="bindingGroupId"
      v-model:preset-name="bindingPresetName"
      v-model:prompt-key="bindingPromptKey"
      :bindings="bindings"
      :group-names="bindingGroupNames"
      :groups="groups"
      :placeholder="ENTRY_LIBRARY_CONTENT_PLACEHOLDER"
      :preset-names="presetNames"
      :prompts="bindingPrompts"
      :saving="bindingSaving"
      :syncing-ids="syncingBindingIds"
      @create="createBinding"
      @delete-binding="deleteBinding"
      @delete-bindings="deleteBindings"
      @load-content="loadBindingPromptContent"
      @load-prompts="loadBindingPrompts"
      @sync="syncBinding"
    />

    <EntryLibraryItemEditorPage
      v-else-if="route.page === 'edit' && (editingItem || creatingManualItem)"
      v-model:content="editContent"
      v-model:group-id="editGroupId"
      v-model:order="editOrder"
      v-model:title="editTitle"
      :groups="groups"
      :order-max="editOrderMax"
      @back="phone.goBack()"
      @save="saveEditor"
    />
  </section>
</template>

<script setup lang="ts">
import { isCollectablePresetPrompt } from './api';
import {
  ENTRY_LIBRARY_CONTENT_PLACEHOLDER,
  useEntryLibraryStore,
  type DuplicateEntryPair,
  type EntryLibraryItem,
} from './store';
import { listTavernPresets, readTavernPreset, type TavernPresetPrompt } from '@/apps/preset-manager/api';
import { getWorldbookEntries } from '@/apps/worldbook-link/api';
import { usePhoneStore } from '@/store/phone';
import { getOptionalGlobalFunction } from '@/util/runtime';
import { storeToRefs } from 'pinia';
import EntryLibraryBindingsPage from './pages/EntryLibraryBindingsPage.vue';
import EntryLibraryCatalogPage from './pages/EntryLibraryCatalogPage.vue';
import EntryLibraryCollectPage from './pages/EntryLibraryCollectPage.vue';
import EntryLibraryDedupePage from './pages/EntryLibraryDedupePage.vue';
import EntryLibraryItemEditorPage from './pages/EntryLibraryItemEditorPage.vue';
import EntryLibraryTransferPage from './pages/EntryLibraryTransferPage.vue';
import type {
  EntryLibraryBindingPromptOption as BindingPromptOption,
  EntryLibrarySourceEntry as SourceEntry,
} from './types';

const phone = usePhoneStore();
const library = useEntryLibraryStore();
const { bindings, groups, items, syncingBindingIds } = storeToRefs(library);
const route = computed(() => phone.currentRoute);
const newGroupName = ref('');
const libraryQuery = ref('');
const openGroupIds = ref<string[]>([]);
const sourceType = ref<'preset' | 'worldbook'>('preset');
const sourceNames = ref<string[]>([]);
const selectedSourceName = ref('');
const sourceEntries = ref<SourceEntry[]>([]);
const sourceQuery = ref('');
const sourceLoading = ref(false);
const selectedSourceKeys = ref(new Set<string>());
const collectGroupId = ref('');
const dismissedPairKeys = ref<string[]>([]);
const presetNames = ref<string[]>([]);
const bindingPresetName = ref('');
const bindingPromptKey = ref('');
const bindingGroupId = ref('');
const bindingContentTemplate = ref('');
const bindingPrompts = ref<BindingPromptOption[]>([]);
const bindingSaving = ref(false);
const editTitle = ref('');
const editContent = ref('');
const editGroupId = ref('');
const editOrder = ref(1);
const importMode = ref<'merge' | 'replace'>('merge');
const suppressItemOpenUntil = ref(0);
const itemDrag = reactive({
  groupId: '',
  insertBeforeItemId: '',
  isDragging: false,
  itemId: '',
  longPressReady: false,
  pointerId: -1,
  startX: 0,
  startY: 0,
});
let itemDragLongPressTimer: number | null = null;

const editingItem = computed(() => library.getItem(route.value.params?.itemId || ''));
const creatingManualItem = computed(() => route.value.page === 'edit' && route.value.params?.mode === 'create');
const editOrderMax = computed(() => {
  const count = library.getGroupItems(editGroupId.value).length;
  const editingInTargetGroup = editingItem.value?.groupId === editGroupId.value;
  return Math.max(1, count + (editingInTargetGroup ? 0 : 1));
});
const catalogSections = computed(() => {
  const keyword = libraryQuery.value.trim().toLocaleLowerCase();
  return groups.value.flatMap(group => {
    const groupItems = library.getGroupItems(group.id);
    const visibleItems = keyword
      ? groupItems.filter(item => `${item.title}\n${item.content}`.toLocaleLowerCase().includes(keyword))
      : groupItems;
    if (keyword && !visibleItems.length) return [];
    return [
      {
        enableState: groupEnableState(groupItems),
        group,
        items: visibleItems,
        open: isGroupOpen(group.id),
        totalItems: groupItems.length,
      },
    ];
  });
});
const filteredSourceEntries = computed(() => {
  const keyword = sourceQuery.value.trim().toLocaleLowerCase();
  if (!keyword) return sourceEntries.value;
  return sourceEntries.value.filter(entry => `${entry.title}\n${entry.content}`.toLocaleLowerCase().includes(keyword));
});
const visibleSelectedSourceCount = computed(
  () => filteredSourceEntries.value.filter(entry => selectedSourceKeys.value.has(entry.key)).length,
);
const collectGroupName = computed(() => library.getGroup(collectGroupId.value)?.name ?? '');
const bindingGroupNames = computed(() => Object.fromEntries(groups.value.map(group => [group.id, group.name])));
const duplicatePairs = computed(() =>
  library.findDuplicates(0.8).filter(pair => !dismissedPairKeys.value.includes(pairKey(pair))),
);

function compactContent(content: string, max = 96) {
  const compact = content.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function groupEnableState(groupItems: EntryLibraryItem[]) {
  if (!groupItems.length || groupItems.every(item => !item.enabled)) return 'none';
  if (groupItems.every(item => item.enabled)) return 'all';
  return 'mixed';
}

function isGroupOpen(groupId: string) {
  return openGroupIds.value.includes(groupId);
}

function toggleGroupOpen(groupId: string) {
  openGroupIds.value = isGroupOpen(groupId)
    ? openGroupIds.value.filter(id => id !== groupId)
    : [...openGroupIds.value, groupId];
}

function setGroupEnabled(groupId: string, enabled: boolean) {
  library.setGroupItemsEnabled(groupId, enabled);
}

function setItemEnabled(itemId: string, enabled: boolean) {
  library.updateItem(itemId, { enabled });
}

function createGroup() {
  if (!newGroupName.value.trim()) return;
  const group = library.createGroup(newGroupName.value);
  newGroupName.value = '';
  openGroupIds.value = [...new Set([...openGroupIds.value, group.id])];
}

async function deleteGroup(groupId: string) {
  const group = library.getGroup(groupId);
  if (!group) return;
  const confirmed = await phone.confirmNotice(`删除分组“${group.name}”及其中所有收藏？相关预设绑定也会删除。`, {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除收藏分组',
  });
  if (confirmed) library.deleteGroup(groupId);
}

async function deleteItem(itemId: string) {
  const item = library.getItem(itemId);
  if (!item) return;
  const confirmed = await phone.confirmNotice(`删除收藏“${item.title}”？原始预设或世界书条目不会被删除。`, {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除收藏',
  });
  if (confirmed) library.deleteItem(itemId);
}

async function deleteGroups(groupIds: string[]) {
  const selected = groups.value.filter(group => groupIds.includes(group.id));
  if (!selected.length) return;
  const itemCount = selected.reduce((sum, group) => sum + library.getGroupItems(group.id).length, 0);
  const confirmed = await phone.confirmNotice(
    `删除所选 ${selected.length} 个分组及其中 ${itemCount} 条收藏？相关预设绑定也会删除。`,
    { confirmLabel: '删除所选', kind: 'warning', title: '批量删除收藏分组' },
  );
  if (!confirmed) return;
  selected.forEach(group => library.deleteGroup(group.id));
  toastr.success(`已删除 ${selected.length} 个分组`);
}

async function deleteItems(itemIds: string[]) {
  const selected = items.value.filter(item => itemIds.includes(item.id));
  if (!selected.length) return;
  const confirmed = await phone.confirmNotice(`删除所选 ${selected.length} 条收藏？原始预设或世界书条目不会被删除。`, {
    confirmLabel: '删除所选',
    kind: 'warning',
    title: '批量删除收藏',
  });
  if (!confirmed) return;
  selected.forEach(item => library.deleteItem(item.id));
  toastr.success(`已删除 ${selected.length} 条收藏`);
}

function openCollect() {
  phone.pushPage('collect', '收藏条目');
}

function openManualEditor() {
  let targetGroup = groups.value[0];
  if (!targetGroup) targetGroup = library.createGroup('默认分组');
  phone.pushPage('edit', '新建条目', { groupId: targetGroup.id, mode: 'create' });
}

function openDedupe() {
  dismissedPairKeys.value = [];
  phone.pushPage('dedupe', '收藏查重');
}

function openBindings() {
  phone.pushPage('bindings', '分组绑定');
}

function openTransfer() {
  phone.pushPage('transfer', '导入导出');
}

function exportLibrary() {
  const payload = {
    data: library.exportBackup(),
    exportedAt: new Date().toISOString(),
    kind: 'tavern-phone-entry-library',
    version: 1,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `条目库-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function importLibrary(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as unknown;
    const record = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    const data = record?.kind === 'tavern-phone-entry-library' ? record.data : parsed;
    if (importMode.value === 'replace') {
      const confirmed = await phone.confirmNotice('覆盖导入会替换当前所有条目库分组、收藏和绑定，确定继续？', {
        confirmLabel: '覆盖导入',
        kind: 'warning',
        title: '覆盖条目库',
      });
      if (!confirmed) return;
      library.importBackup(data);
      toastr.success('已覆盖导入条目库');
    } else {
      const result = library.mergeBackup(data);
      const skipped = result.skippedBindings ? `，跳过 ${result.skippedBindings} 条重复绑定` : '';
      toastr.success(`已导入 ${result.groups} 个分组、${result.items} 条收藏、${result.bindings} 条绑定${skipped}`);
    }
    openGroupIds.value = groups.value[0] ? [groups.value[0].id] : [];
  } catch (error) {
    toastr.error(`导入失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

function openEditor(itemId: string) {
  if (Date.now() < suppressItemOpenUntil.value) return;
  phone.pushPage('edit', '编辑收藏', { itemId });
}

function clearItemDragLongPressTimer() {
  if (itemDragLongPressTimer === null) return;
  window.clearTimeout(itemDragLongPressTimer);
  itemDragLongPressTimer = null;
}

function resetItemDrag() {
  clearItemDragLongPressTimer();
  itemDrag.groupId = '';
  itemDrag.insertBeforeItemId = '';
  itemDrag.isDragging = false;
  itemDrag.itemId = '';
  itemDrag.longPressReady = false;
  itemDrag.pointerId = -1;
  itemDrag.startX = 0;
  itemDrag.startY = 0;
}

function onItemPointerDown(event: PointerEvent, itemId: string, groupId: string) {
  if (event.button !== 0 || libraryQuery.value.trim()) return;
  const target = event.target;
  if (target instanceof Element && target.closest('.pc-entry-library-item-actions')) return;
  resetItemDrag();
  itemDrag.groupId = groupId;
  itemDrag.itemId = itemId;
  itemDrag.pointerId = event.pointerId;
  itemDrag.startX = event.clientX;
  itemDrag.startY = event.clientY;
  itemDrag.longPressReady = target instanceof Element && Boolean(target.closest('.pc-entry-drag-handle'));
  if (!itemDrag.longPressReady) {
    itemDragLongPressTimer = window.setTimeout(() => {
      itemDrag.longPressReady = true;
      itemDragLongPressTimer = null;
    }, 320);
  }
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function updateItemDragInsertion(clientY: number) {
  const rows = Array.from(
    document.querySelectorAll<HTMLElement>(
      `.pc-entry-library-item[data-entry-group-id="${CSS.escape(itemDrag.groupId)}"]`,
    ),
  ).filter(row => row.dataset.entryItemId !== itemDrag.itemId);
  const beforeRow = rows.find(row => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  itemDrag.insertBeforeItemId = beforeRow?.dataset.entryItemId || '';
}

function autoScrollItemList(clientY: number) {
  const screen = document.querySelector<HTMLElement>('#tavern-phone-root .pc-screen');
  if (!screen) return;
  const rect = screen.getBoundingClientRect();
  const edge = 52;
  if (clientY < rect.top + edge) screen.scrollTop -= 14;
  else if (clientY > rect.bottom - edge) screen.scrollTop += 14;
}

function onItemPointerMove(event: PointerEvent) {
  if (event.pointerId !== itemDrag.pointerId || !itemDrag.itemId) return;
  const distance = Math.hypot(event.clientX - itemDrag.startX, event.clientY - itemDrag.startY);
  if (!itemDrag.longPressReady) {
    if (distance > 8) resetItemDrag();
    return;
  }
  if (!itemDrag.isDragging && distance > 4) {
    itemDrag.isDragging = true;
    suppressItemOpenUntil.value = Date.now() + 400;
  }
  if (!itemDrag.isDragging) return;
  event.preventDefault();
  autoScrollItemList(event.clientY);
  updateItemDragInsertion(event.clientY);
}

function commitItemDrag() {
  if (!itemDrag.isDragging || !itemDrag.itemId || !itemDrag.groupId) return;
  const nextIds = library
    .getGroupItems(itemDrag.groupId)
    .map(item => item.id)
    .filter(id => id !== itemDrag.itemId);
  const insertIndex = itemDrag.insertBeforeItemId
    ? Math.max(0, nextIds.indexOf(itemDrag.insertBeforeItemId))
    : nextIds.length;
  nextIds.splice(insertIndex, 0, itemDrag.itemId);
  library.reorderGroupItems(itemDrag.groupId, nextIds);
}

function onItemPointerUp(event: PointerEvent) {
  if (event.pointerId !== itemDrag.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  if (itemDrag.longPressReady || itemDrag.isDragging) {
    suppressItemOpenUntil.value = Date.now() + 300;
  }
  commitItemDrag();
  resetItemDrag();
}

function onItemPointerCancel(event: PointerEvent) {
  if (event.pointerId !== itemDrag.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  resetItemDrag();
}

function refreshSourceNames() {
  sourceNames.value =
    sourceType.value === 'preset'
      ? listTavernPresets()
      : (getOptionalGlobalFunction<() => string[]>('getWorldbookNames')?.() ?? [])
          .slice()
          .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function setSourceType(type: 'preset' | 'worldbook') {
  sourceType.value = type;
  selectedSourceName.value = '';
  sourceEntries.value = [];
  selectedSourceKeys.value = new Set();
  refreshSourceNames();
}

async function loadSourceEntries() {
  selectedSourceKeys.value = new Set();
  sourceEntries.value = [];
  if (!selectedSourceName.value) return;
  sourceLoading.value = true;
  try {
    if (sourceType.value === 'preset') {
      const preset = readTavernPreset(selectedSourceName.value);
      const entries: SourceEntry[] = [];
      const append = (source: 'prompts' | 'prompts_unused', prompt: TavernPresetPrompt, index: number) => {
        if (!isCollectablePresetPrompt(prompt) || !prompt.content?.trim()) return;
        entries.push({
          content: prompt.content,
          key: `${source}:${prompt.id}:${index}`,
          role: prompt.role,
          sourceEntryId: `${source}:${prompt.id}`,
          title: prompt.name || prompt.id,
        });
      };
      preset.prompts.forEach((prompt, index) => append('prompts', prompt, index));
      (preset.prompts_unused ?? []).forEach((prompt, index) => append('prompts_unused', prompt, index));
      sourceEntries.value = entries;
    } else {
      sourceEntries.value = (await getWorldbookEntries(selectedSourceName.value))
        .filter(entry => entry.content.trim())
        .map(entry => ({
          content: entry.content,
          key: String(entry.uid),
          sourceEntryId: String(entry.uid),
          title: entry.name || `条目 #${entry.uid}`,
        }));
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    sourceLoading.value = false;
  }
}

function toggleSourceEntry(key: string) {
  const next = new Set(selectedSourceKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selectedSourceKeys.value = next;
}

function selectAllSources() {
  const next = new Set(selectedSourceKeys.value);
  filteredSourceEntries.value.forEach(entry => next.add(entry.key));
  selectedSourceKeys.value = next;
}

function invertSourceSelection() {
  const next = new Set(selectedSourceKeys.value);
  filteredSourceEntries.value.forEach(entry => {
    if (next.has(entry.key)) next.delete(entry.key);
    else next.add(entry.key);
  });
  selectedSourceKeys.value = next;
}

function clearSourceSelection() {
  selectedSourceKeys.value = new Set();
}

async function collectSelected() {
  const selected = sourceEntries.value.filter(entry => selectedSourceKeys.value.has(entry.key));
  const collected = library.collectItems(
    collectGroupId.value,
    selected.map(entry => ({
      content: entry.content,
      sourceEntryId: entry.sourceEntryId,
      sourceName: selectedSourceName.value,
      sourceRole: entry.role,
      sourceType: sourceType.value,
      title: entry.title,
    })),
  );
  toastr.success(`已收藏 ${collected.length} 条`);
  selectedSourceKeys.value = new Set();
  await phone.goBack();
}

function pairKey(pair: DuplicateEntryPair) {
  return [pair.left.id, pair.right.id].sort().join(':');
}

function dismissPair(pair: DuplicateEntryPair) {
  dismissedPairKeys.value = [...dismissedPairKeys.value, pairKey(pair)];
}

function deleteDuplicate(itemId: string) {
  return deleteItem(itemId);
}

function loadBindingPrompts() {
  bindingPromptKey.value = '';
  bindingContentTemplate.value = '';
  bindingPrompts.value = [];
  if (!bindingPresetName.value) return;
  try {
    const preset = readTavernPreset(bindingPresetName.value);
    const options: BindingPromptOption[] = [];
    const append = (source: 'prompts' | 'prompts_unused', prompt: TavernPresetPrompt, index: number) => {
      if (!isCollectablePresetPrompt(prompt)) return;
      const bound = bindings.value.some(
        binding =>
          binding.presetName === bindingPresetName.value &&
          binding.targetPromptSource === source &&
          binding.targetPromptId === prompt.id,
      );
      options.push({
        bound,
        content: prompt.content ?? '',
        id: prompt.id,
        key: `${source}:${index}`,
        source,
        title: `${source === 'prompts' ? '已使用' : '未使用'} · ${prompt.name || prompt.id}${bound ? ' · 已绑定' : ''}`,
      });
    };
    preset.prompts.forEach((prompt, index) => append('prompts', prompt, index));
    (preset.prompts_unused ?? []).forEach((prompt, index) => append('prompts_unused', prompt, index));
    bindingPrompts.value = options;
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

function loadBindingPromptContent() {
  const prompt = bindingPrompts.value.find(item => item.key === bindingPromptKey.value);
  bindingContentTemplate.value = prompt && !prompt.bound ? prompt.content : '';
}

async function createBinding() {
  const prompt = bindingPrompts.value.find(item => item.key === bindingPromptKey.value);
  if (!prompt) return;
  bindingSaving.value = true;
  try {
    await library.createBinding({
      groupId: bindingGroupId.value,
      presetName: bindingPresetName.value,
      targetPromptId: prompt.id,
      targetPromptName: prompt.title.replace(/^(已使用|未使用) · /, ''),
      targetPromptSource: prompt.source,
      contentTemplate: bindingContentTemplate.value,
    });
    toastr.success('已创建绑定并同步预设条目');
    loadBindingPrompts();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    bindingSaving.value = false;
  }
}

async function syncBinding(bindingId: string) {
  try {
    await library.syncBinding(bindingId);
    toastr.success('已同步收藏分组');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function deleteBinding(bindingId: string) {
  const confirmed = await phone.confirmNotice('删除这条分组绑定？预设条目会保留最后一次同步的内容。', {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除分组绑定',
  });
  if (confirmed) {
    library.deleteBinding(bindingId);
    loadBindingPrompts();
  }
}

async function deleteBindings(bindingIds: string[]) {
  const selected = bindings.value.filter(binding => bindingIds.includes(binding.id));
  if (!selected.length) return;
  const confirmed = await phone.confirmNotice(
    `删除所选 ${selected.length} 条分组绑定？预设条目会保留最后一次同步的内容。`,
    { confirmLabel: '删除所选', kind: 'warning', title: '批量删除分组绑定' },
  );
  if (!confirmed) return;
  selected.forEach(binding => library.deleteBinding(binding.id));
  loadBindingPrompts();
  toastr.success(`已删除 ${selected.length} 条分组绑定`);
}

function saveEditor() {
  if (creatingManualItem.value) {
    library.createItem({
      content: editContent.value,
      groupId: editGroupId.value,
      order: editOrder.value,
      title: editTitle.value,
    });
    toastr.success('已新建条目');
  } else if (editingItem.value) {
    library.updateItem(editingItem.value.id, {
      content: editContent.value,
      groupId: editGroupId.value,
      order: editOrder.value,
      title: editTitle.value,
    });
    toastr.success('已保存收藏条目');
  } else {
    return;
  }
  phone.goBack();
}

watch(
  () => [editingItem.value, creatingManualItem.value, route.value.params?.groupId] as const,
  ([item, creating, groupId]) => {
    editTitle.value = item?.title || '';
    editContent.value = item?.content || '';
    editGroupId.value = item?.groupId || (creating ? groupId || groups.value[0]?.id || '' : '');
    editOrder.value =
      item?.order || (creating && editGroupId.value ? library.getGroupItems(editGroupId.value).length + 1 : 1);
  },
  { immediate: true },
);

watch(editGroupId, () => {
  editOrder.value = Math.max(1, Math.min(Math.round(editOrder.value || 1), editOrderMax.value));
});

onMounted(() => {
  refreshSourceNames();
  presetNames.value = listTavernPresets();
  if (!groups.value.length) {
    const group = library.createGroup('默认分组');
    openGroupIds.value = [group.id];
  } else {
    openGroupIds.value = [groups.value[0].id];
  }
  collectGroupId.value = groups.value[0]?.id || '';
  bindingGroupId.value = groups.value[0]?.id || '';
});

onBeforeUnmount(() => {
  clearItemDragLongPressTimer();
});
</script>
