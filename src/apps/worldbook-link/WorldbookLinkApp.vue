<template>
  <section class="pc-worldbook-link-app">
    <EmptyState v-if="!phone.isViewingCurrentChat" :title="t`历史聊天不能管理世界书`">
      <p>{{ t`世界书接口始终作用于酒馆当前聊天，请先返回当前聊天再查看或修改。` }}</p>
      <button class="pc-primary-btn" type="button" @click="returnToCurrentChat">
        {{ t`返回当前聊天` }}
      </button>
    </EmptyState>

    <section v-else-if="route.page === 'root'" class="pc-worldbook-page">
      <header class="pc-worldbook-head">
        <span class="pc-kicker">{{ t`当前聊天` }}</span>
        <button
          class="pc-icon-btn pc-worldbook-refresh"
          type="button"
          :title="t`刷新`"
          :disabled="refreshing"
          @click="refresh"
        >
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': refreshing }"></i>
        </button>
      </header>

      <nav class="pc-segment pc-worldbook-tabs" aria-label="世界书分类">
        <button
          v-for="category in categories"
          :key="category.id"
          class="pc-segment-btn"
          :class="{ active: activeCategory === category.id }"
          type="button"
          @click="activeCategory = category.id"
        >
          {{ category.label }}
          <small>{{ groups[category.id].length }}</small>
        </button>
      </nav>

      <label class="pc-worldbook-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="searchQuery" class="pc-field" type="search" :placeholder="t`搜索当前分类的世界书`" />
      </label>

      <div v-if="loadingError" class="pc-section-card pc-worldbook-error">
        <strong>{{ t`无法读取世界书` }}</strong>
        <span>{{ loadingError }}</span>
      </div>

      <div v-else class="pc-worldbook-catalog">
        <section v-for="section in visibleBookSections" :key="section.id" class="pc-worldbook-group">
          <header v-if="section.label" class="pc-worldbook-group-head">
            <strong>{{ section.label }}</strong>
            <span>{{ section.books.length }}</span>
          </header>

          <div v-if="section.books.length" class="pc-worldbook-list">
            <article v-for="bookName in section.books" :key="bookName" class="pc-section-card pc-worldbook-row">
              <button class="pc-worldbook-open" type="button" @click="openBook(bookName)">
                <span class="pc-worldbook-icon"><i class="fa-solid fa-book"></i></span>
                <span class="pc-worldbook-copy">
                  <strong>{{ bookName }}</strong>
                  <small>{{ bookSubtitle(bookName) }}</small>
                </span>
              </button>
              <label
                v-if="activeCategory === 'global'"
                class="pc-toggle pc-worldbook-toggle"
                :title="isGlobalEnabled(bookName) ? t`停用全局世界书` : t`启用全局世界书`"
              >
                <input
                  type="checkbox"
                  :aria-label="isGlobalEnabled(bookName) ? t`停用全局世界书` : t`启用全局世界书`"
                  :checked="isGlobalEnabled(bookName)"
                  :disabled="globalBusyBooks.has(bookName)"
                  @change="toggleGlobalWorldbook(bookName, $event)"
                />
                <span aria-hidden="true"></span>
              </label>
              <i v-else class="fa-solid fa-chevron-right pc-worldbook-chevron"></i>
            </article>
          </div>
        </section>
        <EmptyState
          v-if="!visibleBookCount"
          :title="searchQuery.trim() ? t`没有找到匹配的世界书` : emptyCategoryTitle"
        />
      </div>
    </section>

    <section v-else-if="route.page === 'detail'" class="pc-worldbook-page">
      <article class="pc-section-card pc-worldbook-detail-head">
        <h2 :title="detailBookName">{{ detailBookName }}</h2>
        <div v-if="detailStatus" class="pc-worldbook-metrics">
          <span class="category">{{ activeCategoryLabel }}</span>
          <span>{{ detailStatus.currentEntries.length }} {{ t`个条目` }}</span>
          <span>{{ detailStatus.enabledCount }} {{ t`个启用` }}</span>
          <span>{{
            detailStatus.profile
              ? `${detailStatus.profile.entries.filter(entry => entry.enabled).length} 个关联`
              : t`未关联`
          }}</span>
        </div>
      </article>

      <label class="pc-worldbook-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="entryQuery" class="pc-field" type="search" :placeholder="t`搜索条目名称`" />
      </label>

      <article v-if="detailStatus" class="pc-section-card pc-worldbook-link-bar">
        <div class="pc-worldbook-link-main">
          <strong>{{ t`聊天联动` }}</strong>
          <span :class="{ linked: detailStatus.profile }">{{ linkStateLabel }}</span>
        </div>
        <div class="pc-worldbook-link-actions">
          <template v-if="detailStatus.profile">
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="busy"
              :title="t`应用聊天配置`"
              @click="applySavedProfile"
            >
              <i class="fa-solid fa-play"></i>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="busy"
              :title="t`以当前状态更新配置`"
              @click="captureCurrentProfile"
            >
              <i class="fa-solid fa-floppy-disk"></i>
            </button>
            <button
              class="pc-icon-btn danger"
              type="button"
              :disabled="busy"
              :title="t`停止联动`"
              @click="unlinkCurrentBook"
            >
              <i class="fa-solid fa-link-slash"></i>
            </button>
          </template>
          <button
            v-else
            class="pc-soft-btn pc-worldbook-link-create"
            type="button"
            :disabled="busy"
            @click="captureCurrentProfile"
          >
            <i class="fa-solid fa-link"></i>
            <span>{{ t`关联` }}</span>
          </button>
        </div>
        <small v-if="detailStatus.profile && !detailStatus.matchesCurrent">{{ t`当前状态与配置不同` }}</small>
        <small v-if="detailStatus.missingCount">{{ detailStatus.missingCount }} {{ t`个配置条目已不存在` }}</small>
      </article>

      <template v-if="detailStatus">
        <section v-for="section in visibleEntrySections" :key="section.id" class="pc-worldbook-group">
          <header class="pc-worldbook-group-head">
            <strong>{{ section.label }}</strong>
            <span>{{ section.entries.length }}</span>
          </header>
          <div v-if="section.entries.length" class="pc-worldbook-entry-list">
            <article
              v-for="entry in section.entries"
              :key="entry.uid"
              class="pc-section-card pc-worldbook-entry"
              :class="{ disabled: !entry.enabled }"
            >
              <button class="pc-worldbook-entry-open" type="button" @click="openEntryEditor(entry)">
                <span class="pc-worldbook-entry-copy">
                  <strong :title="entry.name || `条目 #${entry.uid}`">{{ entry.name || `条目 #${entry.uid}` }}</strong>
                  <small>{{ entryPositionSummary(entry) }}</small>
                </span>
                <i class="fa-solid fa-chevron-right pc-worldbook-chevron"></i>
              </button>
              <label
                class="pc-toggle pc-worldbook-toggle"
                :title="entry.enabled ? t`停用条目` : t`启用条目`"
                @click.stop
              >
                <input
                  type="checkbox"
                  :aria-label="entry.enabled ? t`停用条目` : t`启用条目`"
                  :checked="entry.enabled"
                  :disabled="entryBusyUids.has(entry.uid)"
                  @change="toggleWorldbookEntry(entry, $event)"
                />
                <span aria-hidden="true"></span>
              </label>
            </article>
          </div>
        </section>
        <EmptyState
          v-if="!visibleEntryCount"
          :title="entryQuery.trim() ? t`没有找到匹配的条目` : t`这本世界书没有条目`"
        />
      </template>
      <EmptyState v-else :title="t`正在读取世界书条目`" />
    </section>

    <section v-else-if="route.page === 'entry'" class="pc-worldbook-page pc-worldbook-entry-editor-page">
      <article v-if="editingEntry" class="pc-editor-card pc-worldbook-entry-editor">
        <header class="pc-worldbook-entry-editor-head">
          <span class="pc-kicker">{{ detailBookName }}</span>
          <h2 :title="editingEntry.name || `条目 #${editingEntry.uid}`">
            {{ editingEntry.name || `条目 #${editingEntry.uid}` }}
          </h2>
          <small>条目 #{{ editingEntry.uid }}</small>
        </header>

        <label class="pc-field-group">
          <span class="pc-field-label">条目名称</span>
          <input v-model="entryDraft.name" class="pc-field" type="text" placeholder="条目名称" />
        </label>

        <label class="pc-field-group pc-worldbook-content-field">
          <span class="pc-field-label">条目内容</span>
          <textarea v-model="entryDraft.content" class="pc-area" placeholder="世界书条目内容"></textarea>
        </label>

        <div class="pc-field-group">
          <span class="pc-field-label">插入位置</span>
          <SearchableCombobox
            :model-value="entryDraft.positionType"
            :options="positionOptions"
            input-label="选择插入位置"
            placeholder="选择插入位置"
            toggle-title="展开插入位置"
            @update:model-value="entryDraft.positionType = $event as WorldbookEntry['position']['type']"
          />
        </div>

        <label class="pc-field-group">
          <span class="pc-field-label">顺序</span>
          <input v-model.number="entryDraft.order" class="pc-field" type="number" step="1" />
        </label>

        <template v-if="entryDraft.positionType === 'at_depth'">
          <div class="pc-field-group">
            <span class="pc-field-label">消息角色</span>
            <SearchableCombobox
              :model-value="entryDraft.role"
              :options="roleOptions"
              input-label="选择消息角色"
              placeholder="选择消息角色"
              toggle-title="展开消息角色"
              @update:model-value="entryDraft.role = $event as WorldbookEntry['position']['role']"
            />
          </div>
          <label class="pc-field-group">
            <span class="pc-field-label">插入深度</span>
            <input v-model.number="entryDraft.depth" class="pc-field" type="number" min="0" step="1" />
          </label>
        </template>

        <div class="pc-form-actions pc-worldbook-entry-editor-actions">
          <button class="pc-soft-btn danger" type="button" :disabled="entryEditorBusy" @click="removeEditingEntry">
            <i class="fa-solid fa-trash"></i>
            <span>删除</span>
          </button>
          <button class="pc-soft-btn" type="button" :disabled="entryEditorBusy" @click="phone.goBack()">返回</button>
          <button
            class="pc-primary-btn"
            type="button"
            :disabled="entryEditorBusy || !entryDraft.name.trim()"
            @click="saveEditingEntry"
          >
            {{ entryEditorBusy ? '处理中' : '保存' }}
          </button>
        </div>
      </article>
      <EmptyState v-else title="正在读取世界书条目" />
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import {
  deleteWorldbookEntry,
  getCurrentWorldbookGroups,
  setGlobalWorldbookEnabled,
  setWorldbookEntryEnabled,
  updateWorldbookEntry,
  type CurrentWorldbookGroups,
  type WorldbookCategoryId,
} from './api';
import { type WorldbookLinkStatus, useWorldbookLinkStore } from './store';

const phone = usePhoneStore();
const worldbookLinks = useWorldbookLinkStore();
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
  name: '',
  order: 100,
  positionType: 'before_character_definition' as WorldbookEntry['position']['type'],
  role: 'system' as WorldbookEntry['position']['role'],
});
let globalMutationQueue: Promise<void> = Promise.resolve();
const entryMutationQueues = new Map<string, Promise<void>>();

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
  if (activeCategory.value === 'global') {
    return [
      { books: filterBooks(groups.globalEnabled), id: 'global-enabled', label: '全局已启用' },
      { books: filterBooks(groups.globalDisabled), id: 'global-disabled', label: '全局未启用' },
    ];
  }
  return [{ books: filterBooks(groups[activeCategory.value]), id: activeCategory.value, label: '' }];
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
  return [
    { entries: entries.filter(entry => entry.enabled), id: 'enabled', label: '已启用' },
    { entries: entries.filter(entry => !entry.enabled), id: 'disabled', label: '未启用' },
  ];
});
const visibleEntryCount = computed(() =>
  visibleEntrySections.value.reduce((sum, section) => sum + section.entries.length, 0),
);
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
    entryQuery.value = '';
    searchQuery.value = '';
    if (route.value.appId !== 'worldbook-link') return;
    if (route.value.page === 'root') void refresh();
    if (route.value.page === 'detail') void loadDetail();
    if (route.value.page === 'entry') void loadEntryEditor();
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
    if (route.value.page === 'entry') void loadEntryEditor();
  },
);

watch(
  () => [route.value.appId, route.value.page, route.value.params?.bookName, route.value.params?.entryUid] as const,
  ([appId, page]) => {
    if (appId !== 'worldbook-link') return;
    if (!phone.isViewingCurrentChat) return;
    if (page === 'root') void refresh();
    if (page === 'detail') void loadDetail();
    if (page === 'entry') void loadEntryEditor();
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
  entryQuery.value = '';
  phone.pushPage('detail', '世界书联动', { bookName });
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
  if (route.value.page === 'detail' || route.value.page === 'entry') {
    await loadDetail();
    if (route.value.page === 'entry') await loadEntryEditor();
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

function setEntryDraft(entry: WorldbookEntry) {
  entryDraft.content = entry.content;
  entryDraft.depth = entry.position.depth;
  entryDraft.name = entry.name || `条目 #${entry.uid}`;
  entryDraft.order = entry.position.order;
  entryDraft.positionType = entry.position.type;
  entryDraft.role = entry.position.role;
}

async function loadEntryEditor() {
  if (!phone.isViewingCurrentChat || !Number.isFinite(editingEntryUid.value)) return;
  editingEntry.value = null;
  try {
    const status = await worldbookLinks.getStatus(currentScopeKey.value, detailBookName.value);
    const entry = status.currentEntries.find(item => item.uid === editingEntryUid.value);
    if (!entry) throw new Error(`世界书条目 #${editingEntryUid.value} 已不存在`);
    detailStatus.value = status;
    editingEntry.value = entry;
    setEntryDraft(entry);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '读取世界书条目失败');
  }
}

async function saveEditingEntry() {
  const entry = editingEntry.value;
  if (!entry || entryEditorBusy.value || !entryDraft.name.trim()) return;
  entryEditorBusy.value = true;
  try {
    const entries = await updateWorldbookEntry(detailBookName.value, entry.uid, {
      content: entryDraft.content,
      name: entryDraft.name.trim(),
      position: {
        depth: Math.max(0, Math.round(Number(entryDraft.depth) || 0)),
        order: Math.round(Number(entryDraft.order) || 0),
        role: entryDraft.role,
        type: entryDraft.positionType,
      },
    });
    const updated = entries.find(item => item.uid === entry.uid);
    if (updated) {
      editingEntry.value = updated;
      setEntryDraft(updated);
    }
    toastr.success('世界书条目已保存');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '保存世界书条目失败');
  } finally {
    entryEditorBusy.value = false;
  }
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
.pc-worldbook-link-app,
.pc-worldbook-page {
  min-height: 100%;
}

.pc-worldbook-page {
  display: grid;
  align-content: start;
  gap: 12px;
}

.pc-worldbook-head,
.pc-worldbook-metrics,
.pc-worldbook-group-head,
.pc-worldbook-link-main,
.pc-worldbook-link-actions,
.pc-worldbook-entry-head {
  display: flex;
  align-items: center;
}

.pc-worldbook-head {
  min-height: 32px;
  justify-content: space-between;
  gap: 10px;
}

.pc-worldbook-refresh {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
}

.pc-worldbook-detail-head {
  min-width: 0;
  padding: 15px 16px;
}

.pc-worldbook-detail-head h2 {
  margin: 0;
  overflow: hidden;
  font-size: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-worldbook-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  width: 100%;
}

.pc-worldbook-tabs .pc-segment-btn {
  min-width: 0;
  padding-inline: 6px;
}

.pc-worldbook-tabs small {
  font-size: 10px;
  opacity: 0.68;
}

.pc-worldbook-search {
  position: relative;
  display: block;
}

.pc-worldbook-search > i {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 13px;
  color: var(--pc-muted);
  pointer-events: none;
  transform: translateY(-50%);
}

.pc-worldbook-search .pc-field {
  height: 42px;
  padding-left: 38px;
}

.pc-worldbook-catalog,
.pc-worldbook-group,
.pc-worldbook-list,
.pc-worldbook-entry-list {
  display: grid;
  gap: 10px;
}

.pc-worldbook-catalog,
.pc-worldbook-group {
  gap: 8px;
}

.pc-worldbook-group + .pc-worldbook-group {
  margin-top: 4px;
}

.pc-worldbook-group-head {
  min-height: 28px;
  justify-content: space-between;
  padding: 0 4px;
}

.pc-worldbook-group-head strong {
  font-size: 15px;
}

.pc-worldbook-group-head span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-worldbook-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  color: var(--pc-text);
  text-align: left;
}

.pc-worldbook-open {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  gap: 10px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.pc-worldbook-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface-strong) 86%);
  color: var(--pc-theme-accent);
}

.pc-worldbook-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pc-worldbook-copy strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-worldbook-copy small,
.pc-worldbook-chevron,
.pc-worldbook-error span {
  color: var(--pc-muted);
}

.pc-worldbook-error {
  color: var(--pc-danger);
}

.pc-worldbook-metrics {
  flex-wrap: wrap;
  gap: 0;
  margin-top: 8px;
}

.pc-worldbook-metrics span {
  color: var(--pc-muted);
  font-size: 13px;
  white-space: nowrap;
}

.pc-worldbook-metrics span + span::before {
  margin: 0 7px;
  color: var(--pc-muted);
  content: '·';
}

.pc-worldbook-metrics .category {
  color: var(--pc-theme-accent);
  font-weight: 700;
}

.pc-worldbook-link-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px 10px;
  padding: 10px 12px;
}

.pc-worldbook-link-main {
  min-width: 0;
  gap: 9px;
}

.pc-worldbook-link-main > span {
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-worldbook-link-main > span.linked {
  color: var(--pc-theme-accent);
}

.pc-worldbook-link-actions {
  justify-content: flex-end;
  gap: 6px;
}

.pc-worldbook-link-actions .pc-icon-btn {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
}

.pc-worldbook-link-create {
  min-height: 32px;
  padding: 6px 10px;
  font-size: 12px;
}

.pc-worldbook-link-bar > small {
  grid-column: 1 / -1;
  color: var(--pc-danger);
  font-size: 12px;
}

.pc-worldbook-entry {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-width: 0;
  padding: 0 12px 0 0;
}

.pc-worldbook-entry-open {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
  gap: 9px;
  border: 0;
  background: transparent;
  padding: 11px 10px 11px 12px;
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-worldbook-entry-open > i {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-worldbook-entry-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.pc-worldbook-entry-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-worldbook-entry-copy small {
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-worldbook-entry.disabled .pc-worldbook-entry-copy strong {
  color: var(--pc-muted);
}

.pc-worldbook-entry-editor {
  display: flex;
  min-height: calc(100vh - 160px);
  flex-direction: column;
  gap: 14px;
}

.pc-worldbook-entry-editor-head {
  display: grid;
  gap: 4px;
}

.pc-worldbook-entry-editor-head h2 {
  overflow: hidden;
  margin: 0;
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-worldbook-entry-editor-head small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-worldbook-content-field {
  min-height: 260px;
  flex: 1;
}

.pc-worldbook-content-field .pc-area {
  min-height: 240px;
  flex: 1;
  resize: vertical;
}

.pc-worldbook-entry-editor-actions {
  position: sticky;
  z-index: 2;
  bottom: 0;
  margin-top: auto;
  padding-top: 10px;
  background: var(--pc-bg);
}
</style>
