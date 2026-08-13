<template>
  <div v-if="isVisible" class="pc-mvu-tree-node" :data-mvu-path-key="ownKey" :style="{ '--pc-mvu-depth': depth }">
    <div v-if="!isEditing" class="pc-mvu-tree-row" :class="{ branch: isBranch }">
      <button
        v-if="isBranch"
        class="pc-mvu-tree-toggle"
        type="button"
        :aria-expanded="isExpanded"
        :title="isExpanded ? t`折叠` : t`展开`"
        @click="emit('toggle', path)"
      >
        <i class="fa-solid" :class="isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
      </button>
      <span v-else class="pc-mvu-tree-spacer"></span>

      <button v-if="isBranch" class="pc-mvu-tree-main" type="button" @click="emit('toggle', path)">
        <strong>{{ label }}</strong>
      </button>
      <button v-else class="pc-mvu-tree-main leaf" type="button" @click="startEditing">
        <span>
          <strong>{{ label }}</strong>
          <small>{{ valueType }}</small>
        </span>
        <code>{{ valuePreview }}</code>
      </button>

      <span v-if="isBranch" class="pc-mvu-tree-badge">{{ branchBadge }}</span>
      <button
        v-if="isBranch"
        class="pc-icon-btn compact"
        type="button"
        :disabled="busy"
        :title="t`新增子项`"
        :aria-label="t`新增子项`"
        @click="isAdding = !isAdding"
      >
        <i class="fa-solid fa-plus"></i>
      </button>
      <button
        v-else
        class="pc-mvu-favorite-btn"
        type="button"
        :class="{ active: isFavorite }"
        :title="isFavorite ? t`取消收藏` : t`收藏变量`"
        @click="emit('toggle-favorite', path)"
      >
        <i class="fa-solid fa-star"></i>
      </button>
    </div>

    <div v-else class="pc-mvu-inline-editor">
      <div class="pc-mvu-editor-title">
        <strong>{{ label }}</strong>
        <small>{{ valueType }}</small>
      </div>
      <input v-if="typeof value === 'number'" v-model="numberDraft" class="pc-field" type="number" />
      <label v-else-if="typeof value === 'boolean'" class="pc-mvu-boolean-editor">
        <span>{{ booleanDraft ? t`开启` : t`关闭` }}</span>
        <span class="pc-toggle">
          <input v-model="booleanDraft" type="checkbox" />
          <span aria-hidden="true"></span>
        </span>
      </label>
      <textarea v-else v-model="textDraft" class="pc-area" rows="3"></textarea>

      <div v-if="typeof value === 'number'" class="pc-mvu-number-actions">
        <button
          v-for="delta in numberDeltas"
          :key="delta"
          class="pc-soft-btn compact"
          type="button"
          @click="adjustNumber(delta)"
        >
          {{ delta > 0 ? `+${delta}` : delta }}
        </button>
      </div>
      <div class="pc-form-actions pc-mvu-editor-actions">
        <button
          class="pc-icon-btn danger"
          type="button"
          :disabled="busy"
          :title="t`删除变量`"
          :aria-label="t`删除变量`"
          @click="emit('delete', path)"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>
        <button class="pc-soft-btn compact" type="button" :disabled="busy" @click="emit('edit', null)">
          {{ t`取消` }}
        </button>
        <button class="pc-primary-btn compact" type="button" :disabled="busy" @click="applyEdit">{{ t`应用` }}</button>
      </div>
    </div>

    <div v-if="isBranch && isAdding" class="pc-mvu-add-row">
      <input
        v-if="isObject"
        v-model="pendingKey"
        class="pc-field"
        type="text"
        :placeholder="t`属性名`"
        @keydown.enter.prevent="applyAddition"
      />
      <select v-model="pendingType" class="pc-select">
        <option value="value">{{ t`值` }}</option>
        <option value="array">{{ t`数组` }}</option>
        <option value="object">{{ t`对象` }}</option>
      </select>
      <input
        v-if="pendingType === 'value'"
        v-model="pendingValue"
        class="pc-field"
        type="text"
        :placeholder="t`输入值`"
        @keydown.enter.prevent="applyAddition"
      />
      <div class="pc-mvu-add-actions">
        <button
          class="pc-icon-btn"
          type="button"
          :title="t`取消`"
          :aria-label="t`取消`"
          @click="cancelAddition"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="busy"
          :title="t`确认新增`"
          :aria-label="t`确认新增`"
          @click="applyAddition"
        >
          <i class="fa-solid fa-check"></i>
        </button>
      </div>
    </div>

    <div v-if="isBranch && isExpanded" class="pc-mvu-tree-children">
      <MvuTreeNode
        v-for="child in children"
        :key="child.key"
        :label="child.label"
        :value="child.value"
        :path="child.path"
        :depth="depth + 1"
        :query="query"
        :expanded-keys="expandedKeys"
        :editing-key="editingKey"
        :favorite-keys="favoriteKeys"
        :busy="busy"
        @toggle="emit('toggle', $event)"
        @edit="emit('edit', $event)"
        @update-value="emit('update-value', $event)"
        @delete="emit('delete', $event)"
        @add="emit('add', $event)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MvuPath, MvuTreeAddition, MvuTreeMutation } from './model';
import { mvuPathKey, mvuValueType, previewMvuValue } from './model';

const props = defineProps<{
  busy: boolean;
  depth: number;
  editingKey: null | string;
  expandedKeys: string[];
  favoriteKeys: string[];
  label: string;
  path: MvuPath;
  query: string;
  value: unknown;
}>();

const emit = defineEmits<{
  add: [addition: MvuTreeAddition];
  delete: [path: MvuPath];
  edit: [pathKey: null | string];
  'update-value': [mutation: MvuTreeMutation];
  toggle: [path: MvuPath];
  'toggle-favorite': [path: MvuPath];
}>();

const numberDeltas = [-10, -1, 1, 10];
const isAdding = ref(false);
const pendingKey = ref('');
const pendingType = ref<'array' | 'object' | 'value'>('value');
const pendingValue = ref('');
const numberDraft = ref('0');
const booleanDraft = ref(false);
const textDraft = ref('');

const ownKey = computed(() => mvuPathKey(props.path));
const isBranch = computed(() => Boolean(props.value && typeof props.value === 'object'));
const isObject = computed(() => isBranch.value && !Array.isArray(props.value));
const isEditing = computed(() => !isBranch.value && props.editingKey === ownKey.value);
const isExpanded = computed(() => Boolean(props.query.trim()) || props.expandedKeys.includes(ownKey.value));
const isFavorite = computed(() => props.favoriteKeys.includes(ownKey.value));
const valueType = computed(() => mvuValueType(props.value));
const valuePreview = computed(() => previewMvuValue(props.value));
const branchBadge = computed(() => (Array.isArray(props.value) ? `数组 · ${props.value.length}` : '对象'));
const children = computed(() => {
  if (Array.isArray(props.value)) {
    return props.value.map((value, index) => ({
      key: `${ownKey.value}:${index}`,
      label: `[${index}]`,
      path: [...props.path, index],
      value,
    }));
  }
  if (props.value && typeof props.value === 'object') {
    return Object.entries(props.value).map(([label, value]) => ({
      key: `${ownKey.value}:${label}`,
      label,
      path: [...props.path, label],
      value,
    }));
  }
  return [];
});
const isVisible = computed(() => matchesQuery(props.label, props.value, props.query.trim().toLocaleLowerCase()));

function matchesQuery(label: string, value: unknown, query: string): boolean {
  if (!query) return true;
  if (label.toLocaleLowerCase().includes(query)) return true;
  if (!value || typeof value !== 'object') return previewMvuValue(value).toLocaleLowerCase().includes(query);
  return Object.entries(value).some(([childLabel, childValue]) => matchesQuery(childLabel, childValue, query));
}

function syncDrafts() {
  numberDraft.value = typeof props.value === 'number' ? String(props.value) : '0';
  booleanDraft.value = Boolean(props.value);
  textDraft.value = props.value == null ? '' : String(props.value);
}

function startEditing() {
  syncDrafts();
  emit('edit', ownKey.value);
}

function adjustNumber(delta: number) {
  const current = Number(numberDraft.value);
  numberDraft.value = String((Number.isFinite(current) ? current : 0) + delta);
}

function applyEdit() {
  let value: unknown;
  if (typeof props.value === 'number') {
    const parsed = Number(numberDraft.value);
    if (!Number.isFinite(parsed)) {
      toastr.error('请输入有效数字');
      return;
    }
    value = parsed;
  } else if (typeof props.value === 'boolean') {
    value = booleanDraft.value;
  } else {
    value = textDraft.value;
  }
  emit('update-value', { path: props.path, value });
}

function parsePendingValue(value: string) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (trimmed && Number.isFinite(Number(trimmed))) return Number(trimmed);
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

function applyAddition() {
  const key = pendingKey.value.trim();
  if (isObject.value && !key) {
    toastr.warning('请输入属性名');
    return;
  }
  if (pendingType.value === 'value' && !pendingValue.value.trim()) {
    toastr.warning('请输入变量值');
    return;
  }
  const value =
    pendingType.value === 'array' ? [] : pendingType.value === 'object' ? {} : parsePendingValue(pendingValue.value);
  emit('add', {
    key: isObject.value ? key : undefined,
    parentPath: props.path,
    value,
  });
  cancelAddition();
}

function cancelAddition() {
  pendingKey.value = '';
  pendingType.value = 'value';
  pendingValue.value = '';
  isAdding.value = false;
}

watch(
  () => props.value,
  () => {
    if (isEditing.value) syncDrafts();
  },
);
</script>

<style scoped>
.pc-mvu-tree-node {
  min-width: 0;
}

.pc-mvu-tree-row {
  display: grid;
  min-height: 54px;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px calc(6px + min(var(--pc-mvu-depth), 5) * 12px);
  border-bottom: 1px solid var(--pc-border);
}

.pc-mvu-tree-row.branch {
  grid-template-columns: 26px minmax(0, 1fr) auto 34px;
}

.pc-mvu-tree-toggle,
.pc-mvu-tree-main,
.pc-mvu-favorite-btn {
  border: 0;
  background: transparent;
  color: var(--pc-text);
}

.pc-mvu-tree-toggle,
.pc-mvu-favorite-btn {
  display: grid;
  width: 26px;
  height: 34px;
  place-items: center;
  padding: 0;
}

.pc-mvu-tree-toggle {
  color: var(--pc-muted);
}

.pc-mvu-tree-main {
  min-width: 0;
  padding: 8px 0;
  text-align: left;
}

.pc-mvu-tree-main.leaf {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-mvu-tree-main span {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
}

.pc-mvu-tree-main strong {
  overflow-wrap: anywhere;
}

.pc-mvu-tree-main small,
.pc-mvu-editor-title small {
  flex: 0 0 auto;
  color: var(--pc-muted);
}

.pc-mvu-tree-main code {
  max-width: 46%;
  overflow: hidden;
  color: var(--pc-muted);
  font-family: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-mvu-tree-badge {
  color: var(--pc-muted);
  font-size: 12px;
  white-space: nowrap;
}

.pc-mvu-favorite-btn {
  color: color-mix(in srgb, var(--pc-muted) 62%, transparent);
}

.pc-mvu-favorite-btn.active {
  color: var(--pc-theme-accent);
}

.pc-mvu-tree-spacer {
  width: 26px;
}

.pc-mvu-inline-editor,
.pc-mvu-add-row {
  display: grid;
  gap: 10px;
  padding: 12px 10px 12px calc(14px + min(var(--pc-mvu-depth), 5) * 12px);
  border-bottom: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-theme-accent) 5%, var(--pc-surface));
}

.pc-mvu-editor-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pc-mvu-boolean-editor {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.pc-mvu-number-actions,
.pc-mvu-add-actions {
  display: flex;
  gap: 8px;
}

.pc-mvu-number-actions .pc-soft-btn {
  min-width: 0;
  flex: 1;
}

.pc-mvu-editor-actions {
  grid-template-columns: 44px minmax(0, 1fr) minmax(0, 1fr);
}

.pc-mvu-add-row .pc-select {
  min-width: 0;
}

.pc-mvu-add-actions {
  justify-content: flex-end;
}

@media (max-width: 390px) {
  .pc-mvu-tree-main.leaf {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .pc-mvu-tree-main code {
    max-width: 100%;
  }
}
</style>
