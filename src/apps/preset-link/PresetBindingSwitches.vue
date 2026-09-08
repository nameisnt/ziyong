<template>
  <section class="pc-page-section pc-binding-switches">
    <div class="pc-compact-toolbar">
      <strong>绑定条目开关</strong>
      <label class="pc-toggle">
        <input
          type="checkbox"
          aria-label="绑定条目开关"
          :checked="Boolean(states)"
          :disabled="disabled || !source"
          @change="setEnabled(($event.target as HTMLInputElement).checked)"
        />
        <span aria-hidden="true"></span>
      </label>
    </div>
    <div class="pc-compact-toolbar">
      <label class="pc-search-field">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input v-model="search" class="pc-field" aria-label="搜索条目或分组" placeholder="搜索条目或分组" />
      </label>
      <ActionMenu icon-only label="条目开关操作">
        <button type="button" :disabled="disabled || !source || !states" @click="setEnabled(true)">
          <i class="fa-solid fa-rotate-left"></i><span>使用源预设默认开关</span>
        </button>
        <button type="button" :disabled="disabled || !canCapture || !states" @click="capture">
          <i class="fa-solid fa-camera"></i><span>读取酒馆当前开关</span>
        </button>
        <button type="button" :disabled="disabled || !presetName" @click="refresh">
          <i class="fa-solid fa-rotate-right"></i><span>刷新条目列表</span>
        </button>
      </ActionMenu>
    </div>
    <p v-if="error" class="pc-binding-switch-error" role="alert">{{ error }}</p>
    <div v-if="missing.length" class="pc-binding-switch-error" role="status">
      <span>{{ missing.length }} 个已绑定条目不存在：{{ missing.join('、') }}</span>
      <button class="pc-soft-btn" type="button" :disabled="disabled" @click="removeMissing">移除失效绑定</button>
    </div>
    <div v-if="preview" class="pc-binding-switch-list" tabindex="0" aria-label="预设条目目录">
      <template v-for="node in filteredNodes" :key="node.type === 'group' ? node.group.id : node.prompt.id">
        <template v-if="node.type === 'group'">
          <button
            class="pc-soft-btn pc-binding-group-head"
            type="button"
            :aria-expanded="isExpanded(node.group.id)"
            @click="toggleGroup(node.group.id)"
          >
            <i :class="['fa-solid', isExpanded(node.group.id) ? 'fa-chevron-down' : 'fa-chevron-right']"></i>
            <strong>{{ node.group.name }}</strong>
            <span class="pc-list-row-meta">{{ node.group.selectionMode === 'single' ? '单选' : '复选' }}</span>
          </button>
          <template v-if="isExpanded(node.group.id)">
            <label v-for="prompt in node.prompts" :key="prompt.id" class="pc-list-row">
              <span class="pc-list-row-copy"
                ><strong :title="prompt.name">{{ prompt.name }}</strong></span
              >
              <span class="pc-toggle">
                <input
                  type="checkbox"
                  :aria-label="prompt.name"
                  :checked="prompt.enabled"
                  :disabled="disabled || !states"
                  @change="toggle(prompt.id, ($event.target as HTMLInputElement).checked)"
                />
                <span aria-hidden="true"></span>
              </span>
            </label>
          </template>
        </template>
        <label v-else class="pc-list-row">
          <span class="pc-list-row-copy"
            ><strong :title="node.prompt.name">{{ node.prompt.name }}</strong></span
          >
          <span class="pc-toggle">
            <input
              type="checkbox"
              :aria-label="node.prompt.name"
              :checked="node.prompt.enabled"
              :disabled="disabled || !states"
              @change="toggle(node.prompt.id, ($event.target as HTMLInputElement).checked)"
            />
            <span aria-hidden="true"></span>
          </span>
        </label>
      </template>
      <EmptyState v-if="!filteredNodes.length" :title="search ? '没有匹配的条目或分组' : '这个预设没有条目'" />
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  buildPresetDisplayNodes,
  getCurrentTavernPresetName,
  readTavernPreset,
  updatePresetPromptSelection,
  type TavernPreset,
} from '@/apps/preset-manager/api';
import EmptyState from '@/components/EmptyState.vue';
import ActionMenu from '@/components/ActionMenu.vue';
import { checkPromptStates, missingPromptIds, snapshotPromptStates, type PresetPromptStates } from './promptSwitches';

const props = defineProps<{ presetName: string; loadedPresetName: string; currentChat: boolean; disabled: boolean }>();
const states = defineModel<PresetPromptStates | undefined>({ required: true });
const source = shallowRef<TavernPreset | null>(null);
const error = ref('');
const search = ref('');
const collapsed = ref<Record<string, boolean>>({});
const canCapture = computed(
  () => props.currentChat && props.presetName === props.loadedPresetName && Boolean(source.value),
);
const preview = computed(() => {
  if (!source.value) return null;
  const preset = klona(source.value);
  preset.prompts.forEach(prompt => {
    if (states.value && Object.hasOwn(states.value, prompt.id)) prompt.enabled = states.value[prompt.id]!;
  });
  return preset;
});
const nodes = computed(() => (preview.value ? buildPresetDisplayNodes(preview.value) : []));
const filteredNodes = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  if (!query) return nodes.value;
  return nodes.value.flatMap(node => {
    if (node.type === 'prompt') return node.prompt.name.toLocaleLowerCase().includes(query) ? [node] : [];
    const prompts = node.group.name.toLocaleLowerCase().includes(query)
      ? node.prompts
      : node.prompts.filter(prompt => prompt.name.toLocaleLowerCase().includes(query));
    return prompts.length ? [{ ...node, prompts }] : [];
  });
});
const missing = computed(() => (source.value && states.value ? missingPromptIds(source.value, states.value) : []));

function refresh() {
  error.value = '';
  source.value = null;
  if (!props.presetName) return;
  try {
    source.value = readTavernPreset(props.presetName);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  }
}
function setEnabled(enabled: boolean) {
  states.value = enabled && source.value ? snapshotPromptStates(source.value) : undefined;
}
function capture() {
  error.value = '';
  try {
    if (props.presetName !== getCurrentTavernPresetName()) throw new Error('请先在酒馆切换到所选预设');
    const live = readTavernPreset('in_use');
    const captured = snapshotPromptStates(live);
    checkPromptStates(live, captured);
    states.value = captured;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  }
}
function toggle(id: string, enabled: boolean) {
  if (!preview.value || !states.value || props.disabled) return;
  const preset = klona(preview.value);
  updatePresetPromptSelection(preset, id, enabled);
  states.value = { ...states.value, ...snapshotPromptStates(preset) };
}
function removeMissing() {
  if (!states.value) return;
  states.value = Object.fromEntries(Object.entries(states.value).filter(([id]) => !missing.value.includes(id)));
}
function isExpanded(id: string) {
  return Boolean(search.value.trim()) || !collapsed.value[id];
}
function toggleGroup(id: string) {
  const expanded = isExpanded(id);
  search.value = '';
  collapsed.value[id] = expanded;
}
watch(
  () => props.presetName,
  () => {
    search.value = '';
    refresh();
    collapsed.value = Object.fromEntries(
      nodes.value.flatMap(node => (node.type === 'group' ? [[node.group.id, node.group.collapsed]] : [])),
    );
  },
  { immediate: true },
);
</script>

<style scoped>
.pc-binding-switches {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.pc-binding-switch-list {
  max-height: min(360px, 40dvh);
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
.pc-binding-group-head {
  width: 100%;
  justify-content: flex-start;
}
.pc-binding-group-head strong {
  min-width: 0;
  flex: 1;
  text-align: left;
  overflow-wrap: anywhere;
}
.pc-binding-switch-error {
  color: var(--pc-danger);
  overflow-wrap: anywhere;
}
</style>
