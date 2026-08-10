<template>
  <section ref="pickerRoot" class="pc-reference-picker">
    <button class="pc-reference-toggle" type="button" @click="open = !open">
      <span>
        <i class="fa-solid fa-link"></i>
        {{ toggleLabel || (insertMode ? t`插入引用内容` : t`引用内容`) }}
      </span>
      <b v-if="!insertMode">{{ modelValue.length }}</b>
      <i :class="open ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
    </button>

    <div v-if="open" class="pc-reference-body">
      <input v-model="query" class="pc-field" type="text" :placeholder="t`搜索标题或内容`" />
      <slot name="actions"></slot>

      <div v-if="!filteredTree.length" class="pc-reference-empty">
        {{ t`没有可引用的内容` }}
      </div>

      <div v-else class="pc-reference-tree">
        <template v-for="treeNode in filteredTree" :key="treeNode.id">
          <ReferenceTreeNode
            :disabled="disabled"
            :insert-mode="insertMode"
            :level="0"
            :node="treeNode"
            :selected-ids="selectedIds"
            @toggle-branch="toggleBranch"
            @toggle-leaf="toggleLeaf"
          />
        </template>
      </div>

      <div v-if="!insertMode && modelValue.length" class="pc-reference-selected">
        <div class="pc-reference-head">
          <button class="pc-reference-selected-toggle" type="button" @click="selectedOpen = !selectedOpen">
            <strong>{{ t`已选引用` }}</strong>
            <b>{{ modelValue.length }}</b>
            <i :class="selectedOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </button>
          <button class="pc-reference-clear" type="button" :disabled="disabled" @click="emit('update:modelValue', [])">
            {{ t`清空` }}
          </button>
        </div>

        <div
          v-if="selectedOpen"
          class="pc-reference-selected-list"
          :class="{
            compact: compactSelected,
            'drop-at-end': referenceDrag.isDragging && !referenceDrag.insertBeforeId,
          }"
        >
          <article
            v-for="item in modelValue"
            :key="item.id"
            class="pc-reference-card"
            :class="{
              dragging: referenceDrag.isDragging && referenceDrag.itemId === item.id,
              'drop-before': referenceDrag.isDragging && referenceDrag.insertBeforeId === item.id,
            }"
            :data-reference-id="item.id"
          >
            <div class="pc-reference-card-head">
              <button
                v-if="reorderable"
                class="pc-reference-icon pc-reference-drag-handle"
                type="button"
                :disabled="disabled"
                :title="t`拖拽排序`"
                @click.prevent
                @pointerdown.stop="startReferenceDrag($event, item.id)"
                @pointermove.stop="moveReferenceDrag"
                @pointerup.stop="finishReferenceDrag"
                @pointercancel.stop="cancelReferenceDrag"
              >
                <i class="fa-solid fa-grip-lines"></i>
              </button>
              <div>
                <strong>{{ item.title }}</strong>
                <small>{{ item.sourcePath.join(' / ') }}</small>
                <small v-if="item.unavailable" class="pc-reference-unavailable">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  {{ t`原来源已删除，使用历史内容` }}
                </small>
              </div>
              <button
                class="pc-reference-icon"
                type="button"
                :disabled="disabled"
                :title="t`移除引用`"
                @click="removeItem(item.id)"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <textarea
              v-if="!compactSelected"
              :value="item.content"
              class="pc-reference-area"
              :disabled="disabled"
              :placeholder="t`本次引用文本`"
              @input="updateItemContent(item.id, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getRegisteredPhoneAppReferenceTrees, type PhoneReferenceTreeNode } from '@/core/appRegistry';
import type { GenerationReferenceItem } from '@/util/references';
import { defineComponent, h, type PropType } from 'vue';

const ReferenceTreeNode = defineComponent({
  props: {
    disabled: { default: false, type: Boolean },
    insertMode: { default: false, type: Boolean },
    level: { required: true, type: Number },
    node: { required: true, type: Object as PropType<PhoneReferenceTreeNode> },
    selectedIds: { required: true, type: Object as PropType<Set<string>> },
  },
  emits: ['toggle-branch', 'toggle-leaf'],
  setup(props, { emit }) {
    return () => {
      const paddingLeft = `${props.level * 14 + 10}px`;
      if (props.node.kind === 'leaf') {
        const selected = props.selectedIds.has(props.node.item.id);
        if (props.insertMode) {
          return h(
            'button',
            {
              class: ['pc-reference-node', 'leaf', 'insert'],
              disabled: props.disabled,
              onClick: () => emit('toggle-leaf', props.node.item),
              style: { paddingLeft },
              type: 'button',
            },
            [
              h('i', { class: 'fa-solid fa-plus' }),
              h('span', { class: 'pc-reference-node-title' }, props.node.item.title),
            ],
          );
        }
        return h(
          'label',
          {
            class: ['pc-reference-node', 'leaf', { selected }],
            style: { paddingLeft },
          },
          [
            h('input', {
              class: 'pc-reference-checkbox',
              checked: selected,
              disabled: props.disabled,
              onChange: () => emit('toggle-leaf', props.node.item),
              type: 'checkbox',
            }),
            h('span', { class: 'pc-reference-node-title' }, props.node.item.title),
          ],
        );
      }

      return h('div', { class: 'pc-reference-branch' }, [
        h(
          'button',
          {
            class: 'pc-reference-node branch',
            disabled: props.disabled,
            onClick: () => emit('toggle-branch', props.node.id),
            style: { paddingLeft },
            type: 'button',
          },
          [
            h('i', {
              class: expanded.value.has(props.node.id) ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right',
            }),
            h('span', { class: 'pc-reference-node-title' }, props.node.label),
            h('small', props.node.children.length),
          ],
        ),
        expanded.value.has(props.node.id)
          ? props.node.children.map(child =>
              h(ReferenceTreeNode, {
                disabled: props.disabled,
                insertMode: props.insertMode,
                key: child.id,
                level: props.level + 1,
                node: child,
                selectedIds: props.selectedIds,
                onToggleBranch: (id: string) => emit('toggle-branch', id),
                onToggleLeaf: (item: GenerationReferenceItem) => emit('toggle-leaf', item),
              }),
            )
          : null,
      ]);
    };
  },
});

const props = withDefaults(
  defineProps<{
    compactSelected?: boolean;
    disabled?: boolean;
    excludedRootIds?: string[];
    insertMode?: boolean;
    modelValue: GenerationReferenceItem[];
    preferredRootIds?: string[];
    reorderable?: boolean;
    toggleLabel?: string;
  }>(),
  {
    compactSelected: false,
    disabled: false,
    excludedRootIds: () => [],
    insertMode: false,
    preferredRootIds: () => [],
    reorderable: false,
    toggleLabel: '',
  },
);

const emit = defineEmits<{
  insert: [value: GenerationReferenceItem];
  'update:modelValue': [value: GenerationReferenceItem[]];
}>();

const open = ref(false);
const pickerRoot = ref<HTMLElement | null>(null);
const selectedOpen = ref(false);
const query = ref('');
const expanded = ref(new Set<string>());
const referenceDrag = reactive({
  insertBeforeId: '',
  isDragging: false,
  itemId: '',
  pointerId: -1,
  startY: 0,
});

const selectedIds = computed(() => new Set(props.modelValue.map(item => item.id)));

const tree = computed(() => {
  const preferredOrder = new Map(props.preferredRootIds.map((id, index) => [id, index]));
  return getRegisteredPhoneAppReferenceTrees()
    .filter(
      item =>
        !props.excludedRootIds.includes(item.id) &&
        (item.kind === 'branch' ? item.children.length > 0 : Boolean(item.item.content.trim())),
    )
    .sort((left, right) => {
      const leftOrder = preferredOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = preferredOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
});

function filterNode(node: PhoneReferenceTreeNode, normalizedQuery: string): PhoneReferenceTreeNode | null {
  if (!normalizedQuery) return node;
  if (node.kind === 'leaf') {
    const haystack = [node.item.title, node.item.sourcePath.join(' '), node.item.content].join(' ').toLowerCase();
    return haystack.includes(normalizedQuery) ? node : null;
  }

  const children = node.children
    .map(child => filterNode(child, normalizedQuery))
    .filter((child): child is ReferenceTreeNodeData => Boolean(child));
  if (children.length || node.label.toLowerCase().includes(normalizedQuery)) {
    return {
      ...node,
      children: children.length ? children : node.children,
    };
  }
  return null;
}

const filteredTree = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  return tree.value
    .map(node => filterNode(node, normalizedQuery))
    .filter((node): node is PhoneReferenceTreeNode => Boolean(node));
});

watch(open, value => {
  if (!value || expanded.value.size) return;
  expanded.value = new Set(filteredTree.value.map(node => node.id));
});

watch(
  () => props.modelValue.length,
  (nextLength, previousLength) => {
    if (nextLength > previousLength && nextLength <= 2) selectedOpen.value = true;
  },
);

function collectBranchIds(nodes: PhoneReferenceTreeNode[]) {
  const ids: string[] = [];
  nodes.forEach(node => {
    if (node.kind !== 'branch') return;
    ids.push(node.id);
    ids.push(...collectBranchIds(node.children));
  });
  return ids;
}

watch(query, value => {
  if (!value.trim()) return;
  expanded.value = new Set(collectBranchIds(filteredTree.value));
});

function toggleBranch(id: string) {
  const next = new Set(expanded.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expanded.value = next;
}

function toggleLeaf(item: GenerationReferenceItem) {
  if (props.disabled) return;
  if (props.insertMode) {
    emit('insert', item);
    return;
  }
  const exists = selectedIds.value.has(item.id);
  const next = exists ? props.modelValue.filter(current => current.id !== item.id) : [...props.modelValue, item];
  emit('update:modelValue', next);
}

function removeItem(itemId: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter(item => item.id !== itemId),
  );
}

function updateItemContent(itemId: string, content: string) {
  emit(
    'update:modelValue',
    props.modelValue.map(item => (item.id === itemId ? { ...item, content } : item)),
  );
}

function resetReferenceDrag() {
  referenceDrag.insertBeforeId = '';
  referenceDrag.isDragging = false;
  referenceDrag.itemId = '';
  referenceDrag.pointerId = -1;
  referenceDrag.startY = 0;
}

function startReferenceDrag(event: PointerEvent, itemId: string) {
  if (props.disabled || !props.reorderable || event.button !== 0) return;
  resetReferenceDrag();
  referenceDrag.itemId = itemId;
  referenceDrag.pointerId = event.pointerId;
  referenceDrag.startY = event.clientY;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function updateReferenceDragInsertion(clientY: number) {
  const rows = [...(pickerRoot.value?.querySelectorAll<HTMLElement>('.pc-reference-card') ?? [])].filter(
    row => row.dataset.referenceId !== referenceDrag.itemId,
  );
  const beforeRow = rows.find(row => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  referenceDrag.insertBeforeId = beforeRow?.dataset.referenceId || '';
}

function autoScrollReferenceList(clientY: number) {
  const list = pickerRoot.value?.querySelector<HTMLElement>('.pc-reference-selected-list');
  const scrollTarget =
    list && list.scrollHeight > list.clientHeight ? list : pickerRoot.value?.closest<HTMLElement>('.pc-screen');
  if (!scrollTarget) return;
  const rect = scrollTarget.getBoundingClientRect();
  const edge = 44;
  if (clientY < rect.top + edge) scrollTarget.scrollTop -= 12;
  else if (clientY > rect.bottom - edge) scrollTarget.scrollTop += 12;
}

function moveReferenceDrag(event: PointerEvent) {
  if (event.pointerId !== referenceDrag.pointerId || !referenceDrag.itemId) return;
  if (!referenceDrag.isDragging && Math.abs(event.clientY - referenceDrag.startY) > 4) {
    referenceDrag.isDragging = true;
  }
  if (!referenceDrag.isDragging) return;
  event.preventDefault();
  autoScrollReferenceList(event.clientY);
  updateReferenceDragInsertion(event.clientY);
}

function commitReferenceDrag() {
  if (!referenceDrag.isDragging || !referenceDrag.itemId) return;
  const draggedItem = props.modelValue.find(item => item.id === referenceDrag.itemId);
  if (!draggedItem) return;
  const next = props.modelValue.filter(item => item.id !== referenceDrag.itemId);
  const beforeIndex = referenceDrag.insertBeforeId
    ? next.findIndex(item => item.id === referenceDrag.insertBeforeId)
    : next.length;
  next.splice(beforeIndex < 0 ? next.length : beforeIndex, 0, draggedItem);
  emit('update:modelValue', next);
}

function finishReferenceDrag(event: PointerEvent) {
  if (event.pointerId !== referenceDrag.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  commitReferenceDrag();
  resetReferenceDrag();
}

function cancelReferenceDrag(event: PointerEvent) {
  if (event.pointerId !== referenceDrag.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  resetReferenceDrag();
}
</script>

<style scoped>
.pc-reference-picker {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  margin-top: 12px;
}

.pc-reference-toggle,
.pc-reference-node,
.pc-reference-clear,
.pc-reference-icon,
.pc-reference-selected-toggle {
  /* ui-reuse-allow: tree controls reset native button appearance before custom hierarchy layout. */
  appearance: none;
  border: 0;
  cursor: pointer;
  font: inherit;
  color: var(--pc-text);
}

.pc-reference-toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  width: 100%;
  min-width: 0;
  padding: 0 2px;
  border-bottom: 1px solid var(--pc-border);
  border-radius: 0;
  background: transparent;
}

.pc-reference-toggle span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pc-reference-toggle b {
  display: grid;
  min-width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
  font-size: 12px;
}

.pc-reference-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
  padding: 8px 0 0;
}

.pc-reference-area {
  width: 100%;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 10px 12px;
}

.pc-reference-tree {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow: auto;
}

.pc-reference-node {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 38px;
  padding-block: 6px;
  padding-right: 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-surface-strong) 54%, transparent 46%);
  text-align: left;
}

.pc-reference-node.branch {
  border: 1px solid color-mix(in srgb, var(--pc-border) 70%, transparent 30%);
}

.pc-reference-node.branch:hover,
.pc-reference-node.leaf:hover {
  background: color-mix(in srgb, var(--pc-surface-strong) 86%, transparent 14%);
}

.pc-reference-node.leaf {
  grid-template-columns: auto minmax(0, 1fr);
  cursor: pointer;
}

.pc-reference-node.leaf.insert i {
  color: var(--pc-theme-accent);
}

.pc-reference-node.leaf.selected {
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, transparent 88%);
}

.pc-reference-checkbox {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--pc-theme-accent);
  flex: none;
}

.pc-reference-node-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-reference-node small,
.pc-reference-empty,
.pc-reference-card small {
  color: var(--pc-muted);
}

.pc-reference-card .pc-reference-unavailable {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--pc-danger);
}

.pc-reference-selected {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.pc-reference-selected-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.pc-reference-selected-list.compact {
  max-height: 280px;
  overflow-y: auto;
  padding-block: 2px;
}

.pc-reference-head,
.pc-reference-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.pc-reference-selected-toggle {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  background: transparent;
  padding: 0;
}

.pc-reference-selected-toggle strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-reference-selected-toggle b {
  display: grid;
  min-width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
  font-size: 12px;
}

.pc-reference-clear,
.pc-reference-icon {
  min-height: 32px;
  border-radius: 999px;
  background: var(--pc-surface-strong);
}

.pc-reference-clear {
  flex: 0 0 auto;
  padding: 0 12px;
  white-space: nowrap;
}

.pc-reference-icon {
  flex: 0 0 auto;
  width: 32px;
}

.pc-reference-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--pc-border) 72%, transparent 28%);
  border-radius: min(var(--pc-control-radius), 8px);
  background: color-mix(in srgb, var(--pc-surface-strong) 76%, transparent 24%);
}

.pc-reference-card.dragging {
  border-color: color-mix(in srgb, var(--pc-theme-accent) 52%, var(--pc-border) 48%);
  opacity: 0.68;
  transform: scale(0.985);
}

.pc-reference-card.drop-before::before,
.pc-reference-selected-list.drop-at-end::after {
  position: absolute;
  right: 8px;
  left: 8px;
  z-index: 2;
  height: 3px;
  border-radius: 999px;
  background: var(--pc-theme-accent);
  content: '';
}

.pc-reference-card.drop-before::before {
  top: -7px;
}

.pc-reference-selected-list.drop-at-end {
  position: relative;
}

.pc-reference-selected-list.drop-at-end::after {
  bottom: 0;
}

.pc-reference-card-head > div {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.pc-reference-drag-handle {
  color: var(--pc-muted);
  cursor: grab;
  touch-action: none;
}

.pc-reference-drag-handle:active {
  cursor: grabbing;
}

.pc-reference-card strong,
.pc-reference-card small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-reference-area {
  display: block;
  min-width: 0;
  max-width: 100%;
  min-height: 76px;
  resize: vertical;
}

.pc-reference-empty {
  padding: 10px 4px;
  text-align: center;
}

:deep(.pc-reference-branch) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.pc-reference-node) {
  /* ui-reuse-allow: nested tree node is rendered by recursion and needs a local reset. */
  appearance: none;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 38px;
  padding-block: 6px;
  padding-right: 10px;
  border: 0;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-surface-strong) 54%, transparent 46%);
  color: var(--pc-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

:deep(.pc-reference-node.branch) {
  border: 1px solid color-mix(in srgb, var(--pc-border) 70%, transparent 30%);
}

:deep(.pc-reference-node.leaf) {
  grid-template-columns: auto minmax(0, 1fr);
}

:deep(.pc-reference-node.leaf.selected) {
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, transparent 88%);
}

:deep(.pc-reference-node-title) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.pc-reference-checkbox) {
  appearance: auto;
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--pc-theme-accent);
  flex: none;
}

:deep(.pc-reference-node small) {
  color: var(--pc-muted);
}
</style>
