<template>
  <article class="pc-section-card pc-preset-prompt-row" :class="{ muted: groupDisabled || !prompt.enabled }">
    <button
      class="pc-preset-prompt-main"
      type="button"
      :disabled="!editable"
      :title="editable ? '编辑条目内容' : '占位条目没有可编辑正文'"
      @click="$emit('open', prompt)"
    >
      <span class="pc-preset-prompt-copy">
        <strong :title="prompt.name || prompt.id">{{ prompt.name || prompt.id }}</strong>
        <small>
          {{ roleLabel }}
          <template v-if="groupDisabled"> · 分组已停用</template>
          <template v-else-if="!editable"> · 占位条目</template>
        </small>
      </span>
      <i v-if="editable" class="fa-solid fa-chevron-right"></i>
    </button>
    <label class="pc-toggle" :title="prompt.enabled ? '停用条目' : '启用条目'">
      <input
        type="checkbox"
        :checked="prompt.enabled"
        :disabled="busy"
        :aria-label="prompt.enabled ? '停用条目' : '启用条目'"
        @change="$emit('toggle', prompt, ($event.target as HTMLInputElement).checked)"
      />
      <span aria-hidden="true"></span>
    </label>
  </article>
</template>

<script setup lang="ts">
import type { TavernPresetPrompt } from './api';

const props = withDefaults(
  defineProps<{
    busy?: boolean;
    groupDisabled?: boolean;
    prompt: TavernPresetPrompt;
  }>(),
  {
    busy: false,
    groupDisabled: false,
  },
);

defineEmits<{
  open: [prompt: TavernPresetPrompt];
  toggle: [prompt: TavernPresetPrompt, enabled: boolean];
}>();

const editable = computed(() => typeof props.prompt.content === 'string');
const roleLabel = computed(
  () =>
    ({
      assistant: 'AI',
      system: '系统',
      user: '用户',
    })[props.prompt.role] || props.prompt.role,
);
</script>

<style scoped>
.pc-preset-prompt-row {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 10px 12px;
}

.pc-preset-prompt-row.muted {
  color: var(--pc-muted);
}

.pc-preset-prompt-main {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.pc-preset-prompt-main:disabled {
  cursor: default;
}

.pc-preset-prompt-main > i {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-preset-prompt-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pc-preset-prompt-copy strong,
.pc-preset-prompt-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-preset-prompt-copy strong {
  color: var(--pc-text);
  font-size: 15px;
}

.pc-preset-prompt-copy small {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}
</style>
