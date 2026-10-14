<template>
  <section class="pc-preset-range-picker">
    <header class="pc-compact-toolbar">
      <strong>{{ group.name }} · {{ endId ? '确认范围' : startId ? '选择结束条目' : '选择开始条目' }}</strong>
      <span>{{ selectedIds.size }} 个条目</span>
    </header>
    <div class="pc-preset-range-list">
      <PresetPromptRow
        v-for="prompt in prompts"
        :key="prompt.id"
        :prompt="prompt"
        selection
        range-selection
        :busy="busy"
        :selected="selectedIds.has(prompt.id)"
        :boundary-label="
          prompt.id === startId && prompt.id === endId
            ? '开始 / 结束'
            : prompt.id === startId
              ? '开始'
              : prompt.id === endId
                ? '结束'
                : ''
        "
        @select="pick"
      />
    </div>
    <p v-if="error" class="pc-preset-range-error" role="alert">{{ error }}</p>
    <div class="pc-form-actions">
      <button class="pc-soft-btn" type="button" :disabled="busy" @click="$emit('cancel')">取消</button>
      <button class="pc-soft-btn" type="button" :disabled="busy || !startId" @click="reset">重选</button>
      <button
        class="pc-primary-btn"
        type="button"
        :disabled="busy || !endId || !!error"
        @click="$emit('confirm', startId, endId)"
      >
        确认范围
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BaibaiPresetGroup, TavernPresetPrompt } from './api';
import PresetPromptRow from './PresetPromptRow.vue';
import { setPresetPromptGroupRange } from './promptGroups';

const props = defineProps<{
  group: BaibaiPresetGroup;
  groups: BaibaiPresetGroup[];
  prompts: TavernPresetPrompt[];
  busy: boolean;
}>();
defineEmits<{ cancel: []; confirm: [startId: string, endId: string] }>();
const startId = ref('');
const endId = ref('');
const ids = computed(() => props.prompts.map(prompt => prompt.id));
const selectedIds = computed(
  () =>
    new Set(
      startId.value
        ? ids.value.slice(
            ids.value.indexOf(startId.value),
            endId.value ? ids.value.indexOf(endId.value) + 1 : ids.value.indexOf(startId.value) + 1,
          )
        : [],
    ),
);
const error = computed(() => {
  if (!endId.value) return '';
  try {
    const root = {
      extensions: { baibaiToolkit: { presetPromptGroups: { groups: props.groups.map(group => ({ ...group })) } } },
    };
    setPresetPromptGroupRange(root, ids.value, props.group.id, startId.value, endId.value);
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
});
function pick(id: string) {
  if (props.busy) return;
  if (!startId.value || endId.value) {
    startId.value = id;
    endId.value = '';
  } else endId.value = id;
}
function reset() {
  startId.value = '';
  endId.value = '';
}
</script>

<style scoped>
.pc-preset-range-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 8px;
}
.pc-preset-range-picker header {
  flex-shrink: 0;
  flex-wrap: wrap;
  overflow-wrap: anywhere;
}
.pc-preset-range-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.pc-preset-range-error {
  margin: 0;
  color: var(--pc-danger);
  font-size: 13px;
}
</style>
