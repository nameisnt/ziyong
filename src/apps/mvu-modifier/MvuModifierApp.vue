<template>
  <section class="pc-mvu-app pc-page-stack">
    <div class="pc-mvu-top-actions">
      <button
        class="pc-icon-btn"
        type="button"
        :class="{ active: showSourceSettings }"
        :title="t`数据来源设置`"
        :aria-label="t`数据来源设置`"
        @click="showSourceSettings = !showSourceSettings"
      >
        <i class="fa-solid fa-sliders"></i>
      </button>
    </div>

    <div v-if="showSourceSettings && phone.isViewingCurrentChat" class="pc-mvu-source-settings">
      <span class="pc-field-label">{{ t`变量作用域` }}</span>
      <nav class="pc-segment pc-mvu-scope" :aria-label="t`变量作用域`">
        <button
          v-for="option in scopeOptions"
          :key="option.value"
          class="pc-segment-btn"
          :class="{ active: scope === option.value }"
          type="button"
          :disabled="busy"
          @click="changeScope(option.value)"
        >
          {{ option.label }}
        </button>
      </nav>
      <label v-if="scope === 'message'" class="pc-field-group">
        <span>{{ t`消息楼层` }}</span>
        <div class="pc-mvu-message-source">
          <input v-model="messageIdInput" class="pc-field" type="text" :placeholder="t`latest 或楼层号`" />
          <button class="pc-soft-btn compact" type="button" :disabled="busy" @click="loadData(true)">
            {{ t`读取` }}
          </button>
        </div>
      </label>
    </div>

    <EmptyState v-if="!phone.isViewingCurrentChat" :title="t`历史聊天不能修改 MVU`">
      <p>{{ t`请先返回酒馆当前聊天，再读取和写入 MVU 变量。` }}</p>
    </EmptyState>

    <template v-else>
      <div class="pc-mvu-toolbar">
        <button
          class="pc-icon-btn pc-mvu-expand-all"
          type="button"
          :disabled="busy || !rootEntries.length"
          :title="t`全部展开`"
          :aria-label="t`全部展开`"
          @click="expandAll"
        >
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <button
          class="pc-icon-btn pc-mvu-collapse-all"
          type="button"
          :disabled="busy || !expandedKeys.length"
          :title="t`全部折叠`"
          :aria-label="t`全部折叠`"
          @click="collapseAll"
        >
          <i class="fa-solid fa-chevron-up"></i>
        </button>
        <button
          class="pc-icon-btn pc-mvu-undo"
          type="button"
          :disabled="busy || !undoStack.length"
          :title="t`撤销`"
          :aria-label="t`撤销`"
          @click="undo"
        >
          <i class="fa-solid fa-arrow-rotate-left"></i>
        </button>
        <button
          class="pc-icon-btn pc-mvu-redo"
          type="button"
          :disabled="busy || !redoStack.length"
          :title="t`重做`"
          :aria-label="t`重做`"
          @click="redo"
        >
          <i class="fa-solid fa-arrow-rotate-right"></i>
        </button>
        <button
          class="pc-icon-btn pc-mvu-refresh"
          type="button"
          :disabled="busy"
          :title="t`刷新`"
          :aria-label="t`刷新`"
          @click="loadData(true)"
        >
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': busy }"></i>
        </button>
        <button
          class="pc-icon-btn pc-mvu-history-toggle"
          type="button"
          :class="{ active: showHistory }"
          :title="t`修改记录`"
          :aria-label="t`修改记录`"
          @click="showHistory = !showHistory"
        >
          <i class="fa-solid fa-clock-rotate-left"></i>
        </button>
      </div>

      <label class="pc-search-field">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="query" type="search" :placeholder="t`搜索变量...`" />
      </label>

      <section v-if="favoriteEntries.length" class="pc-mvu-favorites">
        <button class="pc-mvu-section-head" type="button" @click="favoritesExpanded = !favoritesExpanded">
          <span>
            <i class="fa-solid" :class="favoritesExpanded ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
            <i class="fa-solid fa-star"></i>
            <strong>{{ t`收藏夹` }}</strong>
          </span>
          <small>{{ favoriteEntries.length }}</small>
        </button>
        <div v-if="favoritesExpanded" class="pc-mvu-favorite-list">
          <button
            v-for="favorite in favoriteEntries"
            :key="mvuPathKey(favorite.path)"
            class="pc-mvu-favorite-row"
            type="button"
            @click="focusFavorite(favorite.path)"
          >
            <span>{{ favorite.label }}</span>
            <code>{{ previewMvuValue(favorite.value, 60) }}</code>
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
      </section>

      <section v-if="showHistory" class="pc-mvu-history">
        <header class="pc-mvu-section-head static">
          <span>
            <i class="fa-solid fa-clock-rotate-left"></i>
            <strong>{{ t`修改记录` }}</strong>
          </span>
          <button
            v-if="currentHistory.length"
            class="pc-icon-btn danger compact"
            type="button"
            :title="t`清空记录`"
            :aria-label="t`清空记录`"
            @click="clearHistory"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </header>
        <div v-if="currentHistory.length" class="pc-mvu-history-list">
          <article v-for="record in currentHistory.slice(0, 30)" :key="record.id" class="pc-mvu-history-row">
            <div>
              <strong>{{ record.path }}</strong>
              <time>{{ formatRecordTime(record.timestamp) }}</time>
            </div>
            <p>
              {{ previewMvuValue(record.oldValue, 50) }} <i class="fa-solid fa-arrow-right"></i>
              {{ previewMvuValue(record.newValue, 50) }}
            </p>
          </article>
        </div>
        <EmptyState v-else compact :title="t`暂无修改记录`" />
      </section>

      <div v-if="loading" class="pc-mvu-loading" aria-live="polite">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>{{ t`正在读取变量` }}</span>
      </div>

      <EmptyState v-else-if="errorMessage && !sourceData" :title="t`无法读取 MVU`">
        <p>{{ errorMessage }}</p>
        <button class="pc-primary-btn" type="button" @click="loadData(true)">{{ t`重试` }}</button>
      </EmptyState>

      <div v-else-if="rootEntries.length && hasVisibleEntries" class="pc-mvu-tree">
        <MvuTreeNode
          v-for="entry in rootEntries"
          :key="entry.key"
          :label="entry.label"
          :value="entry.value"
          :path="entry.path"
          :depth="0"
          :query="query"
          :expanded-keys="expandedKeys"
          :editing-key="editingKey"
          :favorite-keys="favoriteKeys"
          :busy="busy"
          @toggle="toggleExpanded"
          @edit="editingKey = $event"
          @update-value="updateValue"
          @delete="deleteValue"
          @add="addValue"
          @toggle-favorite="toggleFavorite"
        />
      </div>

      <EmptyState v-else-if="query.trim()" :title="t`没有匹配的变量`" />
      <EmptyState v-else-if="sourceData" :title="t`当前 stat_data 为空`">
        <p>{{ t`请先让 MVU 初始化变量，或点击刷新重新读取。` }}</p>
      </EmptyState>
    </template>
  </section>
</template>

<script setup lang="ts">
import MvuTreeNode from './MvuTreeNode.vue';
import {
  cloneMvuStatData,
  readMvuData,
  readMvuStatData,
  replaceMvuStatData,
  type MvuData,
  type MvuOptions,
  type MvuScope,
  type MvuStatData,
} from './api';
import type { MvuPath, MvuTreeAddition, MvuTreeMutation } from './model';
import {
  deleteMvuPathValue,
  formatMvuPath,
  getMvuPathValue,
  mvuPathKey,
  previewMvuValue,
  setMvuPathValue,
} from './model';
import EmptyState from '@/components/EmptyState.vue';
import { areChatScopeKeysEquivalent, getCurrentChatScopeKey } from '@/store/chatScoped';
import { useMvuModifierPersistenceStore, type MvuChangeRecord } from '@/store/mvuModifier';
import { usePhoneStore } from '@/store/phone';
import { storeToRefs } from 'pinia';

const HISTORY_LIMIT = 30;
const CHANGE_RECORD_LIMIT = 100;

const phone = usePhoneStore();
const mvuPersistence = useMvuModifierPersistenceStore();
const { favoriteStorage, historyStorage } = storeToRefs(mvuPersistence);
const scopeOptions: Array<{ label: string; value: MvuScope }> = [
  { label: '消息', value: 'message' },
  { label: '聊天', value: 'chat' },
  { label: '角色', value: 'character' },
  { label: '全局', value: 'global' },
];
const scope = ref<MvuScope>('message');
const messageIdInput = ref('latest');
const sourceData = ref<MvuData | null>(null);
const statData = ref<MvuStatData>({});
const undoStack = ref<MvuStatData[]>([]);
const redoStack = ref<MvuStatData[]>([]);
const expandedKeys = ref<string[]>([]);
const editingKey = ref<null | string>(null);
const query = ref('');
const contextVersion = ref(0);
const loading = ref(false);
const savingContextVersion = ref<number | null>(null);
const busy = computed(() => loading.value || savingContextVersion.value === contextVersion.value);
const errorMessage = ref('');
const showSourceSettings = ref(false);
const showHistory = ref(false);
const favoritesExpanded = ref(true);
let mvuLoadWorker: Promise<void> | null = null;
let mvuLoadPending = false;
let mvuLoadForce = false;
let saveRevision = 0;

const currentOptions = computed<MvuOptions>(() => {
  if (scope.value !== 'message') return { type: scope.value };
  const input = messageIdInput.value.trim();
  if (!input || input === 'latest') return { type: 'message', message_id: 'latest' };
  const parsed = Number(input);
  if (!Number.isInteger(parsed)) throw new Error('消息楼层必须是整数或 latest');
  return { type: 'message', message_id: parsed };
});
const rootEntries = computed(() =>
  Object.entries(statData.value).map(([label, value]) => ({
    key: label,
    label,
    path: [label] satisfies MvuPath,
    value,
  })),
);
const hasVisibleEntries = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase();
  if (!keyword) return Boolean(rootEntries.value.length);
  return rootEntries.value.some(entry => matchesQuery(entry.label, entry.value, keyword));
});
const activeChatKey = computed(() => {
  void contextVersion.value;
  return phone.viewingScopeKey || getCurrentChatScopeKey();
});
const activeCharacterKey = computed(() => activeChatKey.value.split(':chat:')[0] || 'unknown');
const currentFavorites = computed(() => favoriteStorage.value[activeCharacterKey.value] ?? []);
const favoriteKeys = computed(() => currentFavorites.value.map(item => mvuPathKey(item.path)));
const favoriteEntries = computed(() =>
  currentFavorites.value.map(item => ({ ...item, value: getMvuPathValue(statData.value, item.path) })),
);
const currentHistory = computed(() => historyStorage.value[activeChatKey.value] ?? []);

function sameData(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function matchesQuery(label: string, value: unknown, keyword: string): boolean {
  if (label.toLocaleLowerCase().includes(keyword)) return true;
  if (!value || typeof value !== 'object') return previewMvuValue(value).toLocaleLowerCase().includes(keyword);
  return Object.entries(value).some(([childLabel, childValue]) => matchesQuery(childLabel, childValue, keyword));
}

function isMvuContextCurrent(requestVersion: number, requestScopeKey: string) {
  return (
    requestVersion === contextVersion.value &&
    phone.isViewingCurrentChat &&
    areChatScopeKeysEquivalent(requestScopeKey, activeChatKey.value)
  );
}

async function drainMvuLoads() {
  loading.value = true;
  try {
    while (mvuLoadPending) {
      const force = mvuLoadForce;
      mvuLoadPending = false;
      mvuLoadForce = false;
      const requestVersion = contextVersion.value;
      const requestScopeKey = activeChatKey.value;

      try {
        const requestOptions = currentOptions.value;
        if (isMvuContextCurrent(requestVersion, requestScopeKey)) errorMessage.value = '';
        const data = await readMvuData(requestOptions);
        if (!isMvuContextCurrent(requestVersion, requestScopeKey)) continue;
        const nextStatData = readMvuStatData(data);
        if (force || !sameData(statData.value, nextStatData)) {
          sourceData.value = data;
          statData.value = nextStatData;
          undoStack.value = [];
          redoStack.value = [];
          editingKey.value = null;
        }
      } catch (error) {
        if (!isMvuContextCurrent(requestVersion, requestScopeKey)) continue;
        if (!sourceData.value) statData.value = {};
        errorMessage.value = error instanceof Error ? error.message : String(error);
      }
    }
  } finally {
    loading.value = false;
  }
}

function startMvuLoadWorker() {
  if (!mvuLoadWorker) {
    mvuLoadWorker = drainMvuLoads().finally(() => {
      mvuLoadWorker = null;
      if (mvuLoadPending) void startMvuLoadWorker();
    });
  }
  return mvuLoadWorker;
}

function loadData(force = false) {
  if (!phone.isViewingCurrentChat) return Promise.resolve();
  mvuLoadPending = true;
  mvuLoadForce ||= force;
  return startMvuLoadWorker();
}

async function changeScope(nextScope: MvuScope) {
  if (nextScope === scope.value || busy.value) return;
  scope.value = nextScope;
  sourceData.value = null;
  statData.value = {};
  await loadData(true);
}

async function persistSnapshot(next: MvuStatData) {
  if (!sourceData.value) return false;
  const requestVersion = contextVersion.value;
  const requestScopeKey = activeChatKey.value;
  const requestId = ++saveRevision;
  const source = sourceData.value;
  const previous = cloneMvuStatData(statData.value);
  savingContextVersion.value = requestVersion;
  statData.value = cloneMvuStatData(next);
  try {
    const requestOptions = currentOptions.value;
    const updatedSource = await replaceMvuStatData(source, next, requestOptions);
    if (!isMvuContextCurrent(requestVersion, requestScopeKey)) return false;
    sourceData.value = updatedSource;
    errorMessage.value = '';
    return true;
  } catch (error) {
    if (!isMvuContextCurrent(requestVersion, requestScopeKey)) return false;
    statData.value = previous;
    toastr.error(error instanceof Error ? error.message : String(error));
    return false;
  } finally {
    if (requestId === saveRevision) savingContextVersion.value = null;
  }
}

function pushUndo(snapshot: MvuStatData) {
  undoStack.value.push(cloneMvuStatData(snapshot));
  if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift();
}

function recordChange(path: MvuPath, oldValue: unknown, newValue: unknown) {
  const key = activeChatKey.value;
  const records = historyStorage.value[key] ?? [];
  const nextRecord: MvuChangeRecord = {
    id: `mvu_change_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    newValue,
    oldValue,
    path: formatMvuPath(path),
    timestamp: Date.now(),
  };
  historyStorage.value = {
    ...historyStorage.value,
    [key]: [nextRecord, ...records].slice(0, CHANGE_RECORD_LIMIT),
  };
}

async function updateValue(mutation: MvuTreeMutation) {
  const oldValue = getMvuPathValue(statData.value, mutation.path);
  if (sameData(oldValue, mutation.value)) {
    editingKey.value = null;
    return;
  }
  const previous = cloneMvuStatData(statData.value);
  const next = cloneMvuStatData(statData.value);
  setMvuPathValue(next, mutation.path, mutation.value);
  if (!(await persistSnapshot(next))) return;
  pushUndo(previous);
  redoStack.value = [];
  editingKey.value = null;
  recordChange(mutation.path, oldValue, mutation.value);
}

async function addValue(addition: MvuTreeAddition) {
  const parent = getMvuPathValue(statData.value, addition.parentPath);
  if (!parent || typeof parent !== 'object') return;
  if (!Array.isArray(parent) && addition.key && Object.prototype.hasOwnProperty.call(parent, addition.key)) {
    const confirmed = await phone.confirmNotice(`属性“${addition.key}”已经存在，是否覆盖？`, {
      confirmLabel: '覆盖',
      kind: 'warning',
    });
    if (!confirmed) return;
  }
  const previous = cloneMvuStatData(statData.value);
  const next = cloneMvuStatData(statData.value);
  const nextParent = getMvuPathValue(next, addition.parentPath);
  let targetPath: MvuPath;
  let oldValue: unknown;
  if (Array.isArray(nextParent)) {
    targetPath = [...addition.parentPath, nextParent.length];
    oldValue = undefined;
    nextParent.push(addition.value);
  } else if (nextParent && typeof nextParent === 'object' && addition.key) {
    targetPath = [...addition.parentPath, addition.key];
    oldValue = (nextParent as Record<string, unknown>)[addition.key];
    (nextParent as Record<string, unknown>)[addition.key] = addition.value;
  } else {
    return;
  }
  if (!(await persistSnapshot(next))) return;
  pushUndo(previous);
  redoStack.value = [];
  recordChange(targetPath, oldValue, addition.value);
}

async function deleteValue(path: MvuPath) {
  const label = formatMvuPath(path);
  const confirmed = await phone.confirmNotice(`确定删除变量“${label}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  const oldValue = getMvuPathValue(statData.value, path);
  const previous = cloneMvuStatData(statData.value);
  const next = cloneMvuStatData(statData.value);
  deleteMvuPathValue(next, path);
  if (!(await persistSnapshot(next))) return;
  pushUndo(previous);
  redoStack.value = [];
  editingKey.value = null;
  recordChange(path, oldValue, undefined);
}

async function undo() {
  const previous = undoStack.value.at(-1);
  if (!previous) return;
  const current = cloneMvuStatData(statData.value);
  if (!(await persistSnapshot(previous))) return;
  undoStack.value.pop();
  redoStack.value.push(current);
  if (redoStack.value.length > HISTORY_LIMIT) redoStack.value.shift();
  editingKey.value = null;
}

async function redo() {
  const next = redoStack.value.at(-1);
  if (!next) return;
  const current = cloneMvuStatData(statData.value);
  if (!(await persistSnapshot(next))) return;
  redoStack.value.pop();
  pushUndo(current);
  editingKey.value = null;
}

function collectBranchKeys(value: unknown, path: MvuPath, result: string[]) {
  if (!value || typeof value !== 'object') return;
  result.push(mvuPathKey(path));
  Object.entries(value).forEach(([key, child]) => {
    const part = Array.isArray(value) ? Number(key) : key;
    collectBranchKeys(child, [...path, part], result);
  });
}

function expandAll() {
  const keys: string[] = [];
  rootEntries.value.forEach(entry => collectBranchKeys(entry.value, entry.path, keys));
  expandedKeys.value = keys;
}

function collapseAll() {
  expandedKeys.value = [];
  editingKey.value = null;
}

function toggleExpanded(path: MvuPath) {
  const key = mvuPathKey(path);
  expandedKeys.value = expandedKeys.value.includes(key)
    ? expandedKeys.value.filter(item => item !== key)
    : [...expandedKeys.value, key];
}

function toggleFavorite(path: MvuPath) {
  const characterKey = activeCharacterKey.value;
  const key = mvuPathKey(path);
  const records = favoriteStorage.value[characterKey] ?? [];
  const existing = records.some(item => mvuPathKey(item.path) === key);
  const nextRecords = existing
    ? records.filter(item => mvuPathKey(item.path) !== key)
    : [...records, { label: formatMvuPath(path), path: [...path] }];
  favoriteStorage.value = { ...favoriteStorage.value, [characterKey]: nextRecords };
}

function focusFavorite(path: MvuPath) {
  query.value = '';
  const ancestors = path.slice(0, -1).map((_, index) => mvuPathKey(path.slice(0, index + 1)));
  expandedKeys.value = [...new Set([...expandedKeys.value, ...ancestors])];
  editingKey.value = mvuPathKey(path);
  void nextTick(() => {
    const selector = `[data-mvu-path-key="${CSS.escape(mvuPathKey(path))}"]`;
    document.querySelector<HTMLElement>(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

async function clearHistory() {
  const confirmed = await phone.confirmNotice('要清空当前聊天的全部 MVU 修改记录吗？此操作不可撤销。', {
    confirmLabel: '清空',
    kind: 'warning',
    title: '清空修改记录？',
  });
  if (!confirmed) return;
  const key = activeChatKey.value;
  historyStorage.value = { ...historyStorage.value, [key]: [] };
}

function formatRecordTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp);
}

function handleChatChanged() {
  contextVersion.value += 1;
  sourceData.value = null;
  statData.value = {};
  expandedKeys.value = [];
  editingKey.value = null;
  void loadData(true);
}

watch(
  () => phone.isViewingCurrentChat,
  isCurrent => {
    if (isCurrent && !sourceData.value) void loadData(true);
  },
);

watch(
  () => phone.currentTavernScopeKey,
  (scopeKey, previousScopeKey) => {
    if (scopeKey !== previousScopeKey) handleChatChanged();
  },
);

onMounted(() => {
  if (phone.isViewingCurrentChat) void loadData(true);
});

onUnmounted(() => {
  contextVersion.value += 1;
  mvuLoadPending = false;
});
</script>

<style scoped>
.pc-mvu-section-head,
.pc-mvu-favorite-row,
.pc-mvu-history-row > div,
.pc-mvu-message-source {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-mvu-top-actions {
  display: flex;
  justify-content: flex-end;
}

.pc-mvu-top-actions .pc-icon-btn.active,
.pc-mvu-toolbar .pc-icon-btn.active {
  color: var(--pc-theme-accent);
}

.pc-mvu-source-settings {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--pc-border);
  border-radius: 8px;
  background: var(--pc-surface);
}

.pc-mvu-scope {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.pc-mvu-message-source .pc-field {
  min-width: 0;
  flex: 1;
}

.pc-mvu-toolbar {
  display: grid;
  grid-template-columns: repeat(6, 40px);
  justify-content: space-between;
  gap: 8px;
}

.pc-mvu-favorites,
.pc-mvu-history,
.pc-mvu-tree {
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: 8px;
  background: var(--pc-surface);
}

.pc-mvu-section-head {
  width: 100%;
  min-height: 46px;
  padding: 8px 12px;
  border: 0;
  background: color-mix(in srgb, var(--pc-surface-strong) 74%, transparent);
  color: var(--pc-text);
  text-align: left;
}

.pc-mvu-section-head.static {
  border-bottom: 1px solid var(--pc-border);
}

.pc-mvu-section-head > span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-mvu-section-head small {
  color: var(--pc-muted);
}

.pc-mvu-favorite-row {
  width: 100%;
  min-height: 48px;
  padding: 8px 12px;
  border: 0;
  border-top: 1px solid var(--pc-border);
  background: transparent;
  color: var(--pc-text);
  text-align: left;
}

.pc-mvu-favorite-row span,
.pc-mvu-favorite-row code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-mvu-favorite-row span {
  flex: 1;
}

.pc-mvu-favorite-row code {
  max-width: 35%;
  color: var(--pc-muted);
  font-family: inherit;
}

.pc-mvu-favorite-row > i {
  color: var(--pc-muted);
}

.pc-mvu-history-list {
  max-height: 300px;
  overflow-y: auto;
}

.pc-mvu-history-row {
  padding: 10px 12px;
  border-bottom: 1px solid var(--pc-border);
}

.pc-mvu-history-row:last-child {
  border-bottom: 0;
}

.pc-mvu-history-row time,
.pc-mvu-history-row p {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-mvu-history-row p {
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}

.pc-mvu-history-row p i {
  margin: 0 5px;
}

.pc-mvu-loading {
  display: grid;
  min-height: 180px;
  place-content: center;
  gap: 10px;
  color: var(--pc-muted);
  text-align: center;
}

@media (max-width: 390px) {
  .pc-mvu-toolbar {
    gap: 4px;
  }

  .pc-mvu-scope {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
