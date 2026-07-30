<template>
  <section class="pc-reference-picker">
    <button class="pc-reference-toggle" type="button" @click="open = !open">
      <span>
        <i class="fa-solid fa-link"></i>
        {{ t`引用内容` }}
      </span>
      <b>{{ modelValue.length }}</b>
      <i :class="open ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
    </button>

    <div v-if="open" class="pc-reference-body">
      <input v-model="query" class="pc-reference-search" type="text" :placeholder="t`搜索标题或内容`" />

      <div v-if="!filteredTree.length" class="pc-reference-empty">
        {{ t`没有可引用的内容` }}
      </div>

      <div v-else class="pc-reference-tree">
        <template v-for="treeNode in filteredTree" :key="treeNode.id">
          <ReferenceTreeNode
            :disabled="disabled"
            :level="0"
            :node="treeNode"
            :selected-ids="selectedIds"
            @toggle-branch="toggleBranch"
            @toggle-leaf="toggleLeaf"
          />
        </template>
      </div>

      <div v-if="modelValue.length" class="pc-reference-selected">
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

        <div v-if="selectedOpen" class="pc-reference-selected-list">
          <article v-for="item in modelValue" :key="item.id" class="pc-reference-card">
            <div class="pc-reference-card-head">
              <div>
                <strong>{{ item.title }}</strong>
                <small>{{ item.sourcePath.join(' / ') }}</small>
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
    disabled?: boolean;
    modelValue: GenerationReferenceItem[];
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: GenerationReferenceItem[]];
}>();

const open = ref(false);
const selectedOpen = ref(false);
const query = ref('');
const expanded = ref(new Set<string>());

const selectedIds = computed(() => new Set(props.modelValue.map(item => item.id)));

const tree = computed(() =>
  getRegisteredPhoneAppReferenceTrees().filter(item =>
    item.kind === 'branch' ? item.children.length > 0 : Boolean(item.item.content.trim()),
  ),
);

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
</script>

<style scoped>
.pc-reference-picker {
  display: flex;
  flex-direction: column;
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
  padding: 0 14px;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--pc-surface-strong) 86%, transparent 14%);
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
  padding: 12px;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--pc-surface) 36%, transparent 64%);
}

.pc-reference-search,
.pc-reference-area {
  width: 100%;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--pc-border) 72%, transparent 28%);
  border-radius: 14px;
  background: color-mix(in srgb, var(--pc-surface-strong) 76%, transparent 24%);
}

.pc-reference-card-head > div {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
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
