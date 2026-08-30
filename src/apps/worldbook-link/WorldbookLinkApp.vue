<template>
  <section class="pc-worldbook-link-app">
    <EmptyState v-if="!phone.isViewingCurrentChat" :title="t`历史聊天不能管理世界书`">
      <p>{{ t`世界书接口始终作用于酒馆当前聊天，请先返回当前聊天再查看或修改。` }}</p>
      <button class="pc-primary-btn" type="button" @click="returnToCurrentChat">
        {{ t`返回当前聊天` }}
      </button>
    </EmptyState>

    <WorldbookCatalogPage
      v-else-if="route.page === 'root'"
      v-model:active-category="activeCategory"
      v-model:query="searchQuery"
      :book-subtitle="bookSubtitle"
      :categories="categories"
      :empty-title="emptyCategoryTitle"
      :global-busy-books="globalBusyBooks"
      :groups="groups"
      :is-global-enabled="isGlobalEnabled"
      :loading-error="loadingError"
      :refreshing="refreshing"
      :sections="visibleBookSections"
      :visible-book-count="visibleBookCount"
      @assign-book="assignBookGroup"
      @create-group="createBookGroup"
      @open-book="openBook"
      @refresh="refresh"
      @toggle-global="toggleGlobalWorldbook"
    />

    <WorldbookDetailPage
      v-else-if="route.page === 'detail'"
      v-model:query="entryQuery"
      :book-name="detailBookName"
      :bulk-active="entryBulkActive"
      :bulk-all-selected="entryBulkAllSelected"
      :bulk-selected-count="entryBulkSelectedIds.length"
      :bulk-selected-uids="selectedEntryUids"
      :busy="busy"
      :category-label="activeCategoryLabel"
      :entry-busy-uids="entryBusyUids"
      :entry-position-summary="entryPositionSummary"
      :link-state-label="linkStateLabel"
      :sections="visibleEntrySections"
      :status="detailStatus"
      :visible-entry-count="visibleEntryCount"
      @apply-profile="applySavedProfile"
      @assign-entry-group="assignEntryGroup"
      @cancel-bulk="cancelEntryBulk"
      @capture-profile="captureCurrentProfile"
      @convert-selected="convertSelectedEntriesToTheaterTypes"
      @copy-entry="openEntryCopy"
      @create-entry-group="createEntryGroup"
      @open-entry="openEntryEditor"
      @rename-book="renameCurrentBook"
      @set-selected="setEntrySelected"
      @start-bulk="startEntryBulk"
      @toggle-all="toggleAllEntries"
      @toggle-selected="toggleEntrySelected"
      @toggle-entry="toggleWorldbookEntry"
      @unlink="unlinkCurrentBook"
    />

    <WorldbookEntryEditorPage
      v-else-if="route.page === 'entry' || route.page === 'copy'"
      v-model:content="entryDraft.content"
      v-model:depth="entryDraft.depth"
      v-model:keys-text="entryDraft.keysText"
      v-model:name="entryDraft.name"
      v-model:order="entryDraft.order"
      v-model:position-type="entryDraft.positionType"
      v-model:role="entryDraft.role"
      v-model:strategy-type="entryDraft.strategyType"
      :book-name="detailBookName"
      :busy="entryEditorBusy"
      :copying="route.page === 'copy'"
      :entry="editingEntry"
      :position-options="positionOptions"
      :role-options="roleOptions"
      :strategy-options="strategyOptions"
      @back="phone.goBack()"
      @convert-to-theater="convertEditingEntryToTheaterType"
      @remove="removeEditingEntry"
      @save="route.page === 'copy' ? saveEntryCopy() : saveEditingEntry()"
    />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useWorldbookCatalogGroupStore } from '@/store/worldbookCatalogGroups';
import {
  deleteWorldbookEntry,
  duplicateWorldbookEntry,
  getCurrentWorldbookGroups,
  renameWorldbookSafely,
  setGlobalWorldbookEnabled,
  setWorldbookEntryEnabled,
  updateWorldbookEntry,
  type CurrentWorldbookGroups,
  type WorldbookCategoryId,
} from './api';
import WorldbookCatalogPage from './pages/WorldbookCatalogPage.vue';
import WorldbookDetailPage from './pages/WorldbookDetailPage.vue';
import WorldbookEntryEditorPage from './pages/WorldbookEntryEditorPage.vue';
import { type WorldbookLinkStatus, useWorldbookLinkStore } from './store';

const phone = usePhoneStore();
const prompts = usePromptStore();
const worldbookLinks = useWorldbookLinkStore();
const catalogGroups = useWorldbookCatalogGroupStore();
const route = computed(() => phone.currentRoute);
const categories: Array<{ id: WorldbookCategoryId; label: string }> = [
  { id: 'global', label: '全局' },
  { id: 'character', label: '角色' },
  { id: 'additional', label: '附加' },
  { id: 'chat', label: '聊天' },
  { id: 'other', label: '其他' },
];
const emptyGroups = (): CurrentWorldbookGroups => ({
  additional: [],
  character: [],
  chat: [],
  global: [],
  globalDisabled: [],
  globalEnabled: [],
  other: [],
});
const groups = reactive<CurrentWorldbookGroups>(emptyGroups());
const activeCategory = ref<WorldbookCategoryId>('global');
const refreshing = ref(false);
const busy = ref(false);
const loadingError = ref('');
const detailStatus = ref<WorldbookLinkStatus | null>(null);
const searchQuery = ref('');
const entryQuery = ref('');
const globalBusyBooks = ref(new Set<string>());
const entryBusyUids = ref(new Set<number>());
const editingEntry = ref<WorldbookEntry | null>(null);
const entryEditorBusy = ref(false);
const entryDraft = reactive({
  content: '',
  depth: 4,
  keysText: '',
  name: '',
  order: 100,
  positionType: 'before_character_definition' as WorldbookEntry['position']['type'],
  role: 'system' as WorldbookEntry['position']['role'],
  strategyType: 'constant' as WorldbookEntry['strategy']['type'],
});
let globalMutationQueue: Promise<void> = Promise.resolve();
const entryMutationQueues = new Map<string, Promise<void>>();
let entryLoadRevision = 0;

const currentScopeKey = computed(() => phone.currentTavernScopeKey);
const activeCategoryLabel = computed(
  () => categories.find(category => category.id === activeCategory.value)?.label || '世界书',
);
const detailBookName = computed(() => route.value.params?.bookName || '未命名世界书');
const editingEntryUid = computed(() => Number(route.value.params?.entryUid ?? Number.NaN));
const positionOptions: Array<{ label: string; value: WorldbookEntry['position']['type'] }> = [
  { label: '角色定义之前', value: 'before_character_definition' },
  { label: '角色定义之后', value: 'after_character_definition' },
  { label: '示例消息之前', value: 'before_example_messages' },
  { label: '示例消息之后', value: 'after_example_messages' },
  { label: '作者注释之前', value: 'before_author_note' },
  { label: '作者注释之后', value: 'after_author_note' },
  { label: '指定深度', value: 'at_depth' },
  { label: '出口', value: 'outlet' },
];
const roleOptions: Array<{ label: string; value: WorldbookEntry['position']['role'] }> = [
  { label: '系统', value: 'system' },
  { label: '用户', value: 'user' },
  { label: 'AI', value: 'assistant' },
];
const strategyOptions: Array<{ label: string; value: WorldbookEntry['strategy']['type'] }> = [
  { label: '常驻激活', value: 'constant' },
  { label: '关键词触发', value: 'selective' },
  { label: '向量化', value: 'vectorized' },
];
const linkStateLabel = computed(() => {
  if (!detailStatus.value?.profile) return '未关联';
  return detailStatus.value.matchesCurrent ? '已关联' : '状态不同';
});
const visibleBookSections = computed(() => {
  const filterBooks = (names: string[]) => {
    const keyword = searchQuery.value.trim().toLocaleLowerCase();
    if (!keyword) return names;
    return names.filter(name => name.toLocaleLowerCase().includes(keyword));
  };
  const grouped = new Map<string, string[]>();
  filterBooks(groups[activeCategory.value]).forEach(bookName => {
    const group = catalogGroups.bookGroupOf(bookName) || '未分组';
    grouped.set(group, [...(grouped.get(group) || []), bookName]);
  });
  return [...grouped].map(([label, books]) => ({ books, id: `${activeCategory.value}:${label}`, label }));
});
const visibleBookCount = computed(() =>
  visibleBookSections.value.reduce((sum, section) => sum + section.books.length, 0),
);
const visibleEntrySections = computed(() => {
  const keyword = entryQuery.value.trim().toLocaleLowerCase();
  const entries =
    detailStatus.value?.currentEntries.filter(entry => {
      if (!keyword) return true;
      return (entry.name || `条目 #${entry.uid}`).toLocaleLowerCase().includes(keyword);
    }) ?? [];
  const grouped = new Map<string, WorldbookEntry[]>();
  entries.forEach(entry => {
    const group = catalogGroups.entryGroupOf(detailBookName.value, entry.uid) || '未分组';
    grouped.set(group, [...(grouped.get(group) || []), entry]);
  });
  return [...grouped].map(([label, groupedEntries]) => ({
    entries: groupedEntries,
    id: `${detailBookName.value}:${label}`,
    label,
  }));
});
const visibleEntryCount = computed(() =>
  visibleEntrySections.value.reduce((sum, section) => sum + section.entries.length, 0),
);
const visibleEntryUids = computed(() =>
  visibleEntrySections.value.flatMap(section => section.entries.map(entry => String(entry.uid))),
);
const {
  active: entryBulkActive,
  allSelected: entryBulkAllSelected,
  cancel: cancelEntryBulk,
  selectedIds: entryBulkSelectedIds,
  setSelected: setEntryBulkSelected,
  start: startEntryBulk,
  toggleAll: toggleAllEntries,
} = useBulkSelection(visibleEntryUids);
const selectedEntryUids = computed(() => new Set(entryBulkSelectedIds.value.map(uid => Number(uid))));
const emptyCategoryTitle = computed(
  () =>
    ({
      global: '没有可归入全局分类的世界书',
      character: '当前角色没有角色世界书',
      additional: '当前角色没有附加世界书',
      chat: '当前聊天没有绑定世界书',
      other: '没有找到其他角色绑定的世界书',
    })[activeCategory.value],
);

watch(activeCategory, () => {
  searchQuery.value = '';
});

watch(
  () => phone.currentTavernScopeKey,
  (nextScopeKey, previousScopeKey) => {
    if (nextScopeKey === previousScopeKey) return;
    detailStatus.value = null;
    editingEntry.value = null;
    cancelEntryBulk();
    entryQuery.value = '';
    searchQuery.value = '';
    if (route.value.appId !== 'worldbook-link') return;
    if (route.value.page === 'root') void refresh();
    if (route.value.page === 'detail') void loadDetail();
    if (route.value.page === 'entry' || route.value.page === 'copy') void loadEntryEditor();
  },
);

watch(
  () => worldbookLinks.scopeApplyRevision,
  () => {
    if (worldbookLinks.lastAppliedScopeKey !== currentScopeKey.value) return;
    if (route.value.appId !== 'worldbook-link') return;
    if (!phone.isViewingCurrentChat) return;
    if (route.value.page === 'root') void refresh();
    if (route.value.page === 'detail') void loadDetail();
    if (route.value.page === 'entry' || route.value.page === 'copy') void loadEntryEditor();
  },
);

watch(
  () => [route.value.appId, route.value.page, route.value.params?.bookName, route.value.params?.entryUid] as const,
  ([appId, page]) => {
    if (appId !== 'worldbook-link') return;
    if (!phone.isViewingCurrentChat) return;
    if (page === 'root') void refresh();
    if (page === 'detail') void loadDetail();
    if (page === 'entry' || page === 'copy') void loadEntryEditor();
  },
  { immediate: true },
);

async function refresh() {
  if (!phone.isViewingCurrentChat) return;
  refreshing.value = true;
  loadingError.value = '';
  try {
    Object.assign(groups, getCurrentWorldbookGroups());
  } catch (error) {
    Object.assign(groups, emptyGroups());
    loadingError.value = error instanceof Error ? error.message : '读取失败';
  } finally {
    refreshing.value = false;
  }
}

function isGlobalEnabled(bookName: string) {
  return groups.globalEnabled.includes(bookName);
}

function bookSubtitle(bookName: string) {
  if (activeCategory.value === 'global') return isGlobalEnabled(bookName) ? '全局已启用' : '未全局启用';
  return (
    (
      {
        additional: '当前角色附加世界书',
        character: '当前角色世界书',
        chat: '当前聊天世界书',
        other: '其他角色绑定',
      } as const
    )[activeCategory.value] || '世界书'
  );
}

function openBook(bookName: string) {
  cancelEntryBulk();
  entryQuery.value = '';
  phone.pushPage('detail', bookName, { bookName });
}

async function createBookGroup() {
  const name = await phone.promptNotice('输入新的世界书分组名称。', {
    confirmLabel: '创建',
    title: '新建世界书分组',
  });
  if (name?.trim()) catalogGroups.createBookGroup(name);
}

async function assignBookGroup(bookName: string) {
  const name = await phone.promptNotice('输入分组名称；输入 - 移到未分组。', {
    confirmLabel: '保存',
    initialValue: catalogGroups.bookGroupOf(bookName),
    title: '设置世界书分组',
  });
  if (name !== null) catalogGroups.assignBook(bookName, name);
}

async function createEntryGroup() {
  const name = await phone.promptNotice('输入新的条目分组名称。', {
    confirmLabel: '创建',
    title: '新建条目分组',
  });
  if (name?.trim()) catalogGroups.createEntryGroup(detailBookName.value, name);
}

async function assignEntryGroup(entry: WorldbookEntry) {
  const name = await phone.promptNotice('输入分组名称；输入 - 移到未分组。', {
    confirmLabel: '保存',
    initialValue: catalogGroups.entryGroupOf(detailBookName.value, entry.uid),
    title: '设置条目分组',
  });
  if (name !== null) catalogGroups.assignEntry(detailBookName.value, entry.uid, name);
}

async function loadDetail() {
  if (!phone.isViewingCurrentChat) return;
  const scopeKey = currentScopeKey.value;
  const bookName = detailBookName.value;
  detailStatus.value = null;
  try {
    const status = await worldbookLinks.getStatus(scopeKey, bookName);
    if (currentScopeKey.value === scopeKey && detailBookName.value === bookName) detailStatus.value = status;
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '读取世界书失败');
  }
}

async function returnToCurrentChat() {
  await phone.returnToCurrentScope();
  if (route.value.page === 'detail' || route.value.page === 'entry' || route.value.page === 'copy') {
    await loadDetail();
    if (route.value.page === 'entry' || route.value.page === 'copy') await loadEntryEditor();
    return;
  }
  await refresh();
}

async function captureCurrentProfile() {
  busy.value = true;
  try {
    detailStatus.value = await worldbookLinks.captureProfile(currentScopeKey.value, detailBookName.value);
    toastr.success('已保存当前聊天的条目状态');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '保存配置失败');
  } finally {
    busy.value = false;
  }
}

async function applySavedProfile() {
  busy.value = true;
  try {
    const result = await worldbookLinks.applyProfile(currentScopeKey.value, detailBookName.value);
    detailStatus.value = result.status;
    toastr.success(result.changed ? `已更新 ${result.changed} 个条目` : '当前条目状态已经一致');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '应用配置失败');
  } finally {
    busy.value = false;
  }
}

async function unlinkCurrentBook() {
  const confirmed = await phone.confirmNotice(
    `停止“${detailBookName.value}”与当前聊天的联动，并恢复首次关联前的条目状态吗？`,
    {
      confirmLabel: '停止联动',
      kind: 'warning',
      title: '停止世界书联动？',
    },
  );
  if (!confirmed) return;
  busy.value = true;
  try {
    await worldbookLinks.removeProfile(currentScopeKey.value, detailBookName.value);
    await loadDetail();
    toastr.success('已停止联动并恢复原状态');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '停止联动失败');
  } finally {
    busy.value = false;
  }
}

async function renameCurrentBook() {
  const oldName = detailBookName.value;
  if (!oldName || busy.value) return;
  const requested = await phone.promptNotice(
    '输入新的世界书名称。只有酒馆提供能同时迁移角色、聊天和全局绑定的安全接口时才会执行。',
    { confirmLabel: '继续', initialValue: oldName, title: '修改世界书名称' },
  );
  const newName = requested?.trim() || '';
  if (!newName || newName === oldName) return;
  if (!(await phone.confirmNotice(`确认把世界书“${oldName}”改名为“${newName}”吗？`, { confirmLabel: '改名' }))) return;
  busy.value = true;
  try {
    await renameWorldbookSafely(oldName, newName);
    const migrated = worldbookLinks.migrateWorldbookName(oldName, newName);
    catalogGroups.migrateBook(oldName, newName);
    entryQuery.value = '';
    phone.replacePage('detail', newName, { bookName: newName });
    await refresh();
    await loadDetail();
    toastr.success(`世界书已改名，并迁移 ${migrated} 处联动配置`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '世界书改名失败');
  } finally {
    busy.value = false;
  }
}

async function toggleGlobalWorldbook(bookName: string, event: Event) {
  const input = event.target as HTMLInputElement;
  const enabled = input.checked;
  globalBusyBooks.value = new Set([...globalBusyBooks.value, bookName]);
  const mutation = globalMutationQueue.then(async () => {
    await setGlobalWorldbookEnabled(bookName, enabled);
    Object.assign(groups, getCurrentWorldbookGroups());
  });
  globalMutationQueue = mutation.catch(() => undefined);

  try {
    await mutation;
    toastr.success(enabled ? `已全局启用“${bookName}”` : `已停止全局启用“${bookName}”`);
  } catch (error) {
    input.checked = !enabled;
    toastr.error(error instanceof Error ? error.message : '更新全局世界书失败');
  } finally {
    const next = new Set(globalBusyBooks.value);
    next.delete(bookName);
    globalBusyBooks.value = next;
  }
}

function positionLabel(type: WorldbookEntry['position']['type']) {
  return positionOptions.find(option => option.value === type)?.label || '未知位置';
}

function entryPositionSummary(entry: WorldbookEntry) {
  if (entry.position.type === 'at_depth') {
    return `${positionLabel(entry.position.type)} · 深度 ${entry.position.depth} · 顺序 ${entry.position.order}`;
  }
  return `${positionLabel(entry.position.type)} · 顺序 ${entry.position.order}`;
}

function openEntryEditor(entry: WorldbookEntry) {
  phone.pushPage('entry', '编辑世界书条目', {
    bookName: detailBookName.value,
    entryUid: String(entry.uid),
  });
}

function openEntryCopy(entry: WorldbookEntry) {
  phone.pushPage('copy', '复制世界书条目', {
    bookName: detailBookName.value,
    entryUid: String(entry.uid),
  });
}

function createEntryCopyName(entry: WorldbookEntry) {
  const sourceName = entry.name.trim() || `条目 #${entry.uid}`;
  const baseName = `${sourceName} - 副本`;
  const names = new Set(detailStatus.value?.currentEntries.map(item => item.name.trim()) ?? []);
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function setEntryDraft(entry: WorldbookEntry, copying = false) {
  entryDraft.content = entry.content;
  entryDraft.depth = entry.position.depth;
  entryDraft.keysText = entry.strategy.keys.join('、');
  entryDraft.name = copying ? createEntryCopyName(entry) : entry.name || `条目 #${entry.uid}`;
  entryDraft.order = entry.position.order;
  entryDraft.positionType = entry.position.type;
  entryDraft.role = entry.position.role;
  entryDraft.strategyType = entry.strategy.type;
}

function splitEntryKeys(value: string) {
  return value
    .split(/[，,、\n]/u)
    .map(item => item.trim())
    .filter(Boolean);
}

function isEntryEditorRequestCurrent(
  requestId: number,
  scopeKey: string,
  bookName: string,
  entryUid: number,
  page: string,
) {
  return (
    requestId === entryLoadRevision &&
    phone.isViewingCurrentChat &&
    currentScopeKey.value === scopeKey &&
    route.value.appId === 'worldbook-link' &&
    route.value.page === page &&
    detailBookName.value === bookName &&
    editingEntryUid.value === entryUid
  );
}

async function loadEntryEditor() {
  if (!phone.isViewingCurrentChat || !Number.isFinite(editingEntryUid.value)) return;
  const requestId = ++entryLoadRevision;
  const scopeKey = currentScopeKey.value;
  const bookName = detailBookName.value;
  const entryUid = editingEntryUid.value;
  const page = route.value.page;
  editingEntry.value = null;
  try {
    const status = await worldbookLinks.getStatus(scopeKey, bookName);
    if (!isEntryEditorRequestCurrent(requestId, scopeKey, bookName, entryUid, page)) return;
    const entry = status.currentEntries.find(item => item.uid === entryUid);
    if (!entry) throw new Error(`世界书条目 #${entryUid} 已不存在`);
    detailStatus.value = status;
    editingEntry.value = entry;
    setEntryDraft(entry, page === 'copy');
  } catch (error) {
    if (!isEntryEditorRequestCurrent(requestId, scopeKey, bookName, entryUid, page)) return;
    toastr.error(error instanceof Error ? error.message : '读取世界书条目失败');
  }
}

function buildEntryPatch() {
  const strategy = editingEntry.value!.strategy;
  return {
    content: entryDraft.content,
    name: entryDraft.name.trim(),
    position: {
      depth: Math.max(0, Math.round(Number(entryDraft.depth) || 0)),
      order: Math.round(Number(entryDraft.order) || 0),
      role: entryDraft.role,
      type: entryDraft.positionType,
    },
    strategy: {
      ...strategy,
      keys: splitEntryKeys(entryDraft.keysText),
      type: entryDraft.strategyType,
    },
  };
}

async function saveEditingEntry() {
  const entry = editingEntry.value;
  if (!entry || entryEditorBusy.value || !entryDraft.name.trim()) return;
  const requestId = entryLoadRevision;
  const scopeKey = currentScopeKey.value;
  const bookName = detailBookName.value;
  const entryUid = entry.uid;
  const page = route.value.page;
  const patch = buildEntryPatch();
  entryEditorBusy.value = true;
  try {
    const entries = await updateWorldbookEntry(bookName, entry.uid, patch);
    if (!isEntryEditorRequestCurrent(requestId, scopeKey, bookName, entryUid, page)) return;
    const updated = entries.find(item => item.uid === entryUid);
    if (updated) {
      editingEntry.value = updated;
      setEntryDraft(updated);
    }
    toastr.success('世界书条目已保存');
  } catch (error) {
    if (!isEntryEditorRequestCurrent(requestId, scopeKey, bookName, entryUid, page)) return;
    toastr.error(error instanceof Error ? error.message : '保存世界书条目失败');
  } finally {
    entryEditorBusy.value = false;
  }
}

async function saveEntryCopy() {
  const entry = editingEntry.value;
  if (!entry || entryEditorBusy.value || !entryDraft.name.trim()) return;
  const requestId = entryLoadRevision;
  const scopeKey = currentScopeKey.value;
  const bookName = detailBookName.value;
  const entryUid = entry.uid;
  const page = route.value.page;
  const patch = buildEntryPatch();
  entryEditorBusy.value = true;
  try {
    const previousUids = new Set(detailStatus.value?.currentEntries.map(item => item.uid) ?? []);
    const entries = await duplicateWorldbookEntry(bookName, entry.uid, patch);
    if (!isEntryEditorRequestCurrent(requestId, scopeKey, bookName, entryUid, page)) return;
    const copied = entries.find(item => !previousUids.has(item.uid));
    if (copied) catalogGroups.copyEntryGroup(bookName, entry.uid, copied.uid);
    if (worldbookLinks.getProfile(scopeKey, bookName)) {
      worldbookLinks.captureProfileFromEntries(scopeKey, bookName, entries);
    }
    await phone.goBack();
    toastr.success('世界书条目副本已创建');
  } catch (error) {
    if (!isEntryEditorRequestCurrent(requestId, scopeKey, bookName, entryUid, page)) return;
    toastr.error(error instanceof Error ? error.message : '复制世界书条目失败');
  } finally {
    entryEditorBusy.value = false;
  }
}

function convertEditingEntryToTheaterType() {
  if (!editingEntry.value || !entryDraft.name.trim()) return;
  const typePrompt = prompts.createTypePrompt({
    domain: 'theater',
    name: entryDraft.name,
    prompt: entryDraft.content,
  });
  toastr.success(`已创建小剧场类型“${typePrompt.name}”`);
}

function setEntrySelected(uid: number, selected: boolean) {
  setEntryBulkSelected(String(uid), selected);
}

function toggleEntrySelected(uid: number) {
  setEntrySelected(uid, !selectedEntryUids.value.has(uid));
}

async function convertSelectedEntriesToTheaterTypes() {
  const entries = (detailStatus.value?.currentEntries ?? []).filter(entry => selectedEntryUids.value.has(entry.uid));
  if (!entries.length) return;
  const confirmed = await phone.confirmNotice(`要把选中的 ${entries.length} 个世界书条目创建为小剧场类型吗？`, {
    confirmLabel: '创建',
    title: '批量转为小剧场类型',
  });
  if (!confirmed) return;
  entries.forEach(entry => {
    prompts.createTypePrompt({
      domain: 'theater',
      name: entry.name || `条目 #${entry.uid}`,
      prompt: entry.content,
    });
  });
  cancelEntryBulk();
  toastr.success(`已创建 ${entries.length} 个小剧场类型`);
}

async function removeEditingEntry() {
  const entry = editingEntry.value;
  if (!entry || entryEditorBusy.value) return;
  const confirmed = await phone.confirmNotice(
    `要从世界书“${detailBookName.value}”中删除条目“${entry.name || `条目 #${entry.uid}`}”吗？此操作不可撤销。`,
    { confirmLabel: '删除', kind: 'warning', title: '删除世界书条目' },
  );
  if (!confirmed) return;
  entryEditorBusy.value = true;
  try {
    await deleteWorldbookEntry(detailBookName.value, entry.uid);
    worldbookLinks.removeEntryReferences(detailBookName.value, entry.uid);
    catalogGroups.removeEntry(detailBookName.value, entry.uid);
    editingEntry.value = null;
    await phone.goBack();
    toastr.success('世界书条目已删除');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '删除世界书条目失败');
  } finally {
    entryEditorBusy.value = false;
  }
}

async function toggleWorldbookEntry(entry: WorldbookEntry, event: Event) {
  const input = event.target as HTMLInputElement;
  const enabled = input.checked;
  const bookName = detailBookName.value;
  const scopeKey = currentScopeKey.value;
  entryBusyUids.value = new Set([...entryBusyUids.value, entry.uid]);
  const previous = entryMutationQueues.get(bookName) ?? Promise.resolve();
  const mutation = previous.then(async () => {
    const result = await setWorldbookEntryEnabled(bookName, entry.uid, enabled);
    const status = worldbookLinks.getProfile(scopeKey, bookName)
      ? worldbookLinks.captureProfileFromEntries(scopeKey, bookName, result.entries)
      : await worldbookLinks.getStatus(scopeKey, bookName, result.entries);
    if (detailBookName.value === bookName) detailStatus.value = status;
  });
  entryMutationQueues.set(
    bookName,
    mutation.catch(() => undefined),
  );

  try {
    await mutation;
  } catch (error) {
    input.checked = entry.enabled;
    toastr.error(error instanceof Error ? error.message : '更新条目状态失败');
  } finally {
    const next = new Set(entryBusyUids.value);
    next.delete(entry.uid);
    entryBusyUids.value = next;
  }
}
</script>

<style scoped>
.pc-worldbook-link-app {
  min-height: 100%;
}
</style>
