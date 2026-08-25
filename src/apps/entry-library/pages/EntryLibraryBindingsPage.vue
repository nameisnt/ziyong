<template>
  <section class="pc-entry-library-page">
    <article class="pc-page-section pc-entry-binding-editor">
      <div class="pc-field-group">
        <span>目标预设</span>
        <SearchableCombobox
          :model-value="presetName"
          :options="presetOptions"
          placeholder="选择或搜索预设"
          @update:model-value="selectPreset"
        />
      </div>
      <div class="pc-field-group">
        <span>目标预设条目</span>
        <SearchableCombobox
          :model-value="promptKey"
          :options="promptOptions"
          placeholder="选择或搜索条目"
          @update:model-value="selectPrompt"
        />
      </div>
      <div class="pc-field-group">
        <span>收藏分组</span>
        <SearchableCombobox v-model="groupId" :options="groupOptions" placeholder="选择或搜索分组" />
      </div>
      <label class="pc-field-group pc-entry-binding-template"
        ><span
          ><span>绑定内容</span
          ><button class="pc-soft-btn compact" type="button" @click.prevent="insertPlaceholder">
            插入占位符
          </button></span
        ><textarea
          ref="templateField"
          v-model="contentTemplate"
          class="pc-area pc-area-multiline"
          rows="5"
          :placeholder="`<a>${placeholder}</a>`"
        ></textarea>
      </label>
      <div class="pc-form-actions">
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="saving || !presetName || !promptKey || !groupId || !contentTemplate.includes(placeholder)"
          @click="$emit('create')"
        >
          {{ saving ? '同步中' : '创建绑定' }}
        </button>
      </div>
    </article>
    <div class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">{{ bindings.length }} 条绑定</span>
      <button
        class="pc-icon-btn"
        type="button"
        :class="{ active: bulkMode }"
        :disabled="!bindings.length"
        aria-label="批量删除绑定"
        title="批量删除绑定"
        @click="bulkMode ? cancelBulkSelection() : startBulkSelection()"
      >
        <i class="fa-solid fa-list-check"></i>
      </button>
    </div>
    <BulkSelectionBar
      v-if="bulkMode"
      :all-selected="allBulkSelected"
      :selected-count="bulkSelectedIds.length"
      :total-count="bindings.length"
      @cancel="cancelBulkSelection"
      @remove="removeSelectedBindings"
      @toggle-all="toggleAllBulkSelection"
    />
    <div class="pc-entry-binding-list">
      <article
        v-for="binding in bindings"
        :key="binding.id"
        class="pc-list-row pc-entry-binding-row"
        :class="{ bulk: bulkMode }"
      >
        <BulkSelectionCheckbox
          v-if="bulkMode"
          :model-value="bulkSelectedIdSet.has(binding.id)"
          :label="`选择 ${binding.targetPromptName}`"
          @update:model-value="setBulkSelected(binding.id, $event)"
        />
        <div>
          <strong>{{ binding.targetPromptName }}</strong
          ><small>{{ binding.presetName }} · {{ groupNames[binding.groupId] || '分组已删除' }}</small
          ><small>{{ compact(binding.contentTemplate) }}</small>
        </div>
        <button
          v-if="!bulkMode"
          class="pc-icon-btn"
          type="button"
          :disabled="syncingIds.includes(binding.id)"
          title="立即同步"
          aria-label="立即同步"
          @click="$emit('sync', binding.id)"
        >
          <i class="fa-solid fa-rotate"></i></button
        ><button
          v-if="!bulkMode"
          class="pc-icon-btn danger"
          type="button"
          title="删除绑定"
          aria-label="删除绑定"
          @click="$emit('delete-binding', binding.id)"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </article>
      <EmptyState v-if="!bindings.length" compact title="还没有分组绑定" />
    </div>
  </section>
</template>
<script setup lang="ts">
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import type { EntryLibraryBinding, EntryLibraryGroup } from '../store';
import type { EntryLibraryBindingPromptOption } from '../types';
const props = defineProps<{
  bindings: EntryLibraryBinding[];
  groupNames: Record<string, string>;
  groups: EntryLibraryGroup[];
  placeholder: string;
  presetNames: string[];
  prompts: EntryLibraryBindingPromptOption[];
  saving: boolean;
  syncingIds: string[];
}>();
const contentTemplate = defineModel<string>('contentTemplate', { required: true });
const groupId = defineModel<string>('groupId', { required: true });
const presetName = defineModel<string>('presetName', { required: true });
const promptKey = defineModel<string>('promptKey', { required: true });
const emit = defineEmits<{
  create: [];
  'delete-binding': [bindingId: string];
  'delete-bindings': [bindingIds: string[]];
  'load-content': [];
  'load-prompts': [];
  sync: [bindingId: string];
}>();
const presetOptions = computed(() => props.presetNames.map(name => ({ label: name, value: name })));
const promptOptions = computed(() =>
  props.prompts.map(prompt => ({ disabled: prompt.bound, label: prompt.title, value: prompt.key })),
);
const groupOptions = computed(() => props.groups.map(group => ({ label: group.name, value: group.id })));
const templateField = ref<HTMLTextAreaElement | null>(null);
const {
  active: bulkMode,
  allSelected: allBulkSelected,
  cancel: cancelBulkSelection,
  selectedIds: bulkSelectedIds,
  selectedIdSet: bulkSelectedIdSet,
  setSelected: setBulkSelected,
  start: startBulkSelection,
  toggleAll: toggleAllBulkSelection,
} = useBulkSelection(() => props.bindings.map(binding => binding.id));

function removeSelectedBindings() {
  if (!bulkSelectedIds.value.length) return;
  emit('delete-bindings', [...bulkSelectedIds.value]);
  cancelBulkSelection();
}
function selectPreset(value: string) {
  presetName.value = value;
  emit('load-prompts');
}
function selectPrompt(value: string) {
  promptKey.value = value;
  emit('load-content');
}
function insertPlaceholder() {
  const field = templateField.value;
  const value = contentTemplate.value;
  const cursor = field?.selectionEnd ?? value.length;
  contentTemplate.value = `${value.slice(0, cursor)}${props.placeholder}${value.slice(cursor)}`;
  nextTick(() => {
    const caret = cursor + props.placeholder.length;
    field?.focus();
    field?.setSelectionRange(caret, caret);
  });
}
function compact(content: string) {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}
</script>
<style scoped>
.pc-entry-library-page,
.pc-entry-binding-list {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 12px;
}
.pc-entry-binding-editor {
  display: grid;
  gap: 12px;
}
.pc-entry-binding-template > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pc-entry-binding-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}
.pc-entry-binding-row.bulk {
  grid-template-columns: auto minmax(0, 1fr);
}
.pc-entry-binding-row > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.pc-entry-binding-row strong,
.pc-entry-binding-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-entry-binding-row small {
  color: var(--pc-muted);
  font-size: 11px;
}
</style>
