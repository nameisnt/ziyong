<template>
  <section class="pc-mvu-app">
    <header class="pc-mvu-head">
      <div>
        <span class="pc-kicker">{{ t`变量草稿` }}</span>
        <h2>{{ t`MVU 修改器` }}</h2>
      </div>
      <button class="pc-icon-btn" type="button" :disabled="busy" :title="t`重新读取`" @click="loadData">
        <i class="fa-solid fa-rotate"></i>
      </button>
    </header>

    <nav v-if="phone.isViewingCurrentChat" class="pc-segment pc-mvu-scope" :aria-label="t`变量作用域`">
      <button
        v-for="option in scopeOptions"
        :key="option.value"
        class="pc-segment-btn"
        :class="{ active: scope === option.value }"
        type="button"
        @click="changeScope(option.value)"
      >
        {{ option.label }}
      </button>
    </nav>

    <label v-if="phone.isViewingCurrentChat && scope === 'message'" class="pc-field-group">
      <span>{{ t`消息楼层` }}</span>
      <input v-model="messageIdInput" class="pc-field" type="text" :placeholder="t`latest 或楼层号`" />
    </label>

    <EmptyState v-if="!phone.isViewingCurrentChat" :title="t`历史聊天不能修改 MVU`">
      <p>{{ t`请先返回酒馆当前聊天，再读取和写入 MVU 变量。` }}</p>
    </EmptyState>

    <EmptyState v-else-if="errorMessage && !draft" :title="t`无法读取 MVU`">
      <p>{{ errorMessage }}</p>
      <button class="pc-primary-btn" type="button" @click="loadData">{{ t`重试` }}</button>
    </EmptyState>

    <template v-else-if="draft">
      <article class="pc-section-card pc-mvu-summary">
        <div>
          <strong>{{ dirty ? t`有未保存修改` : t`草稿与当前数据一致` }}</strong>
          <small>{{ flatEntries.length }} 个可编辑节点</small>
        </div>
        <button class="pc-soft-btn" type="button" :disabled="busy || !undoSnapshot" @click="undoLastSave">
          <i class="fa-solid fa-rotate-left"></i>
          <span>{{ t`撤回上次写入` }}</span>
        </button>
      </article>

      <article class="pc-editor-card pc-mvu-path-editor">
        <label class="pc-field-group">
          <span>{{ t`变量路径` }}</span>
          <input v-model="pathInput" class="pc-field" type="text" :placeholder="t`例如 stat_data.角色.好感度`" />
        </label>
        <label class="pc-field-group">
          <span>{{ t`JSON 值` }}</span>
          <textarea v-model="valueInput" class="pc-area" rows="4" :placeholder="t`字符串需要使用双引号`"></textarea>
        </label>
        <div class="pc-form-actions">
          <button class="pc-soft-btn danger" type="button" :disabled="!pathInput.trim()" @click="deletePath">
            {{ t`删除路径` }}
          </button>
          <button class="pc-primary-btn" type="button" :disabled="!pathInput.trim()" @click="setPathValue">
            {{ t`写入草稿` }}
          </button>
        </div>
      </article>

      <label class="pc-mvu-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="query" class="pc-field" type="search" :placeholder="t`搜索路径或值`" />
      </label>

      <div v-if="visibleEntries.length" class="pc-mvu-tree">
        <button
          v-for="entry in visibleEntries"
          :key="entry.path"
          class="pc-mvu-node"
          type="button"
          @click="selectEntry(entry)"
        >
          <span>{{ entry.path }}</span>
          <code>{{ entry.preview }}</code>
        </button>
        <small v-if="filteredEntries.length > visibleEntries.length" class="pc-mvu-limit">
          {{ t`结果较多，仅显示前 300 项` }}
        </small>
      </div>
      <EmptyState v-else :title="t`没有匹配的变量`" />

      <details class="pc-section-card pc-mvu-raw">
        <summary>{{ t`完整 JSON` }}</summary>
        <textarea v-model="rawJson" class="pc-area" rows="16" spellcheck="false"></textarea>
        <button class="pc-soft-btn" type="button" @click="applyRawJson">{{ t`应用到草稿` }}</button>
      </details>

      <div class="pc-form-actions pc-mvu-save">
        <button class="pc-soft-btn" type="button" :disabled="busy || !dirty" @click="resetDraft">
          {{ t`放弃修改` }}
        </button>
        <button class="pc-primary-btn" type="button" :disabled="busy || !dirty" @click="saveData">
          {{ busy ? t`保存中` : t`保存到 MVU` }}
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { cloneMvuData, readMvuData, replaceMvuData, type MvuData, type MvuOptions, type MvuScope } from './api';
import { usePhoneStore } from '@/store/phone';

type FlatEntry = {
  path: string;
  preview: string;
  value: unknown;
};

const phone = usePhoneStore();
const scopeOptions: Array<{ label: string; value: MvuScope }> = [
  { label: '消息', value: 'message' },
  { label: '聊天', value: 'chat' },
  { label: '角色', value: 'character' },
  { label: '全局', value: 'global' },
];
const scope = ref<MvuScope>('chat');
const messageIdInput = ref('latest');
const draft = ref<MvuData | null>(null);
const original = ref<MvuData | null>(null);
const undoSnapshot = ref<{ data: MvuData; options: MvuOptions } | null>(null);
const rawJson = ref('');
const query = ref('');
const pathInput = ref('');
const valueInput = ref('');
const busy = ref(false);
const errorMessage = ref('');

const currentOptions = computed<MvuOptions>(() => {
  if (scope.value !== 'message') return { type: scope.value };
  const input = messageIdInput.value.trim();
  if (!input || input === 'latest') return { type: 'message', message_id: 'latest' };
  const parsed = Number(input);
  if (!Number.isInteger(parsed)) throw new Error('消息楼层必须是整数或 latest');
  return { type: 'message', message_id: parsed };
});
const flatEntries = computed(() => flattenData(draft.value));
const filteredEntries = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase();
  if (!keyword) return flatEntries.value;
  return flatEntries.value.filter(entry =>
    `${entry.path}\n${entry.preview}`.toLocaleLowerCase().includes(keyword),
  );
});
const visibleEntries = computed(() => filteredEntries.value.slice(0, 300));
const dirty = computed(() => Boolean(draft.value && original.value && serialize(draft.value) !== serialize(original.value)));

function serialize(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function previewValue(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (text === undefined) return 'undefined';
  return text.length > 100 ? `${text.slice(0, 100)}...` : text;
}

function formatPath(parts: Array<string | number>) {
  return parts
    .map((part, index) => {
      if (typeof part === 'number') return `[${part}]`;
      if (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(part)) return index === 0 ? part : `.${part}`;
      return `[${JSON.stringify(part)}]`;
    })
    .join('');
}

function flattenData(value: MvuData | null) {
  if (!value) return [];
  const entries: FlatEntry[] = [];
  const visit = (current: unknown, parts: Array<string | number>) => {
    if (current && typeof current === 'object') {
      const children = Array.isArray(current) ? current.entries() : Object.entries(current);
      let hasChild = false;
      for (const [key, child] of children) {
        hasChild = true;
        visit(child, [...parts, key]);
      }
      if (hasChild) return;
    }
    entries.push({
      path: formatPath(parts),
      preview: previewValue(current),
      value: current,
    });
  };
  visit(value, []);
  return entries;
}

function parseRawJson() {
  const parsed = JSON.parse(rawJson.value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('MVU 数据必须是 JSON 对象');
  }
  return parsed as MvuData;
}

function syncRaw() {
  if (draft.value) rawJson.value = serialize(draft.value);
}

function getDiffSummary(before: MvuData, after: MvuData) {
  const beforeMap = new Map(flattenData(before).map(entry => [entry.path, serialize(entry.value)]));
  const afterMap = new Map(flattenData(after).map(entry => [entry.path, serialize(entry.value)]));
  let added = 0;
  let changed = 0;
  let removed = 0;
  for (const [path, value] of afterMap) {
    if (!beforeMap.has(path)) added += 1;
    else if (beforeMap.get(path) !== value) changed += 1;
  }
  for (const path of beforeMap.keys()) {
    if (!afterMap.has(path)) removed += 1;
  }
  return { added, changed, removed };
}

async function loadData() {
  busy.value = true;
  errorMessage.value = '';
  try {
    const data = await readMvuData(currentOptions.value);
    original.value = cloneMvuData(data);
    draft.value = cloneMvuData(data);
    syncRaw();
  } catch (error) {
    draft.value = null;
    original.value = null;
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    busy.value = false;
  }
}

async function changeScope(nextScope: MvuScope) {
  if (nextScope === scope.value) return;
  if (dirty.value) {
    const confirmed = await phone.confirmNotice('切换作用域会丢弃当前未保存修改，继续吗？', {
      confirmLabel: '切换',
      kind: 'warning',
    });
    if (!confirmed) return;
  }
  scope.value = nextScope;
  await loadData();
}

function selectEntry(entry: FlatEntry) {
  pathInput.value = entry.path;
  valueInput.value = serialize(entry.value) ?? 'null';
}

function setPathValue() {
  try {
    draft.value = parseRawJson();
    const value = JSON.parse(valueInput.value);
    _.set(draft.value, pathInput.value.trim(), value);
    syncRaw();
    toastr.success('已写入草稿');
  } catch (error) {
    toastr.error(error instanceof Error ? `JSON 值无效：${error.message}` : 'JSON 值无效');
  }
}

async function deletePath() {
  const path = pathInput.value.trim();
  const confirmed = await phone.confirmNotice(`从草稿中删除“${path}”？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  try {
    draft.value = parseRawJson();
    _.unset(draft.value, path);
    syncRaw();
    toastr.success('已从草稿删除');
  } catch (error) {
    toastr.error(error instanceof Error ? `JSON 无效：${error.message}` : 'JSON 无效');
  }
}

function applyRawJson() {
  try {
    draft.value = parseRawJson();
    syncRaw();
    toastr.success('完整 JSON 已应用到草稿');
  } catch (error) {
    toastr.error(error instanceof Error ? `JSON 无效：${error.message}` : 'JSON 无效');
  }
}

function resetDraft() {
  if (!original.value) return;
  draft.value = cloneMvuData(original.value);
  syncRaw();
}

async function saveData() {
  if (!original.value) return;
  let nextData: MvuData;
  try {
    nextData = parseRawJson();
  } catch (error) {
    toastr.error(error instanceof Error ? `JSON 无效：${error.message}` : 'JSON 无效');
    return;
  }
  const summary = getDiffSummary(original.value, nextData);
  const confirmed = await phone.confirmNotice(
    `确认写入 MVU？新增 ${summary.added} 项，修改 ${summary.changed} 项，删除 ${summary.removed} 项。`,
    { confirmLabel: '写入', kind: 'warning' },
  );
  if (!confirmed) return;

  busy.value = true;
  try {
    const options = currentOptions.value;
    undoSnapshot.value = { data: cloneMvuData(original.value), options: { ...options } };
    await replaceMvuData(nextData, options);
    original.value = cloneMvuData(nextData);
    draft.value = cloneMvuData(nextData);
    syncRaw();
    toastr.success('MVU 变量已保存');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    busy.value = false;
  }
}

async function undoLastSave() {
  const snapshot = undoSnapshot.value;
  if (!snapshot) return;
  const confirmed = await phone.confirmNotice('将上次写入前的完整快照恢复到原作用域？', {
    confirmLabel: '恢复',
    kind: 'warning',
  });
  if (!confirmed) return;
  busy.value = true;
  try {
    await replaceMvuData(snapshot.data, snapshot.options);
    undoSnapshot.value = null;
    if (serialize(snapshot.options) === serialize(currentOptions.value)) {
      original.value = cloneMvuData(snapshot.data);
      draft.value = cloneMvuData(snapshot.data);
      syncRaw();
    }
    toastr.success('已恢复上次写入前的 MVU 快照');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    busy.value = false;
  }
}

watch(
  () => phone.isViewingCurrentChat,
  isCurrent => {
    if (isCurrent && !draft.value && !busy.value) void loadData();
  },
);

onMounted(() => {
  if (phone.isViewingCurrentChat) void loadData();
});
</script>

<style scoped>
.pc-mvu-app {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-mvu-head,
.pc-mvu-summary,
.pc-mvu-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-mvu-head h2 {
  margin: 2px 0 0;
  font-size: 21px;
}

.pc-mvu-scope {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.pc-mvu-summary small {
  display: block;
  margin-top: 4px;
  color: var(--pc-muted);
}

.pc-mvu-path-editor {
  display: grid;
  gap: 12px;
}

.pc-mvu-search {
  position: relative;
}

.pc-mvu-search i {
  position: absolute;
  top: 50%;
  left: 13px;
  color: var(--pc-muted);
  transform: translateY(-50%);
}

.pc-mvu-search .pc-field {
  padding-left: 38px;
}

.pc-mvu-tree {
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: 8px;
  background: var(--pc-surface);
}

.pc-mvu-node {
  width: 100%;
  min-height: 48px;
  padding: 9px 12px;
  border: 0;
  border-bottom: 1px solid var(--pc-border);
  background: transparent;
  color: var(--pc-text);
  text-align: left;
}

.pc-mvu-node:last-of-type {
  border-bottom: 0;
}

.pc-mvu-node span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pc-mvu-node code {
  max-width: 42%;
  overflow: hidden;
  color: var(--pc-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-mvu-limit {
  display: block;
  padding: 10px 12px;
  color: var(--pc-muted);
  text-align: center;
}

.pc-mvu-raw summary {
  cursor: pointer;
  font-weight: 700;
}

.pc-mvu-raw .pc-area {
  margin: 12px 0;
  font-family: Consolas, monospace;
  font-size: 12px;
}

.pc-mvu-save {
  position: sticky;
  bottom: 0;
  padding: 10px 0;
  background: var(--pc-surface);
}

@media (max-width: 400px) {
  .pc-mvu-summary {
    align-items: flex-start;
    flex-direction: column;
  }

  .pc-mvu-summary .pc-soft-btn {
    width: 100%;
  }
}
</style>
