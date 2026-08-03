<template>
  <article
    class="pc-section-card pc-preset-prompt-row"
    :class="{
      'drop-before': dropBefore,
      dragging,
      muted: groupDisabled || !prompt.enabled,
      'without-drag': !reorderable,
    }"
    :data-preset-group-id="groupId"
    :data-preset-prompt-id="prompt.id"
  >
    <button
      v-if="reorderable"
      class="pc-icon-btn pc-preset-drag-handle"
      type="button"
      :disabled="busy"
      title="拖拽排序"
      @click.prevent
      @pointercancel="$emit('drag-cancel', $event)"
      @pointerdown="$emit('drag-start', $event, prompt)"
      @pointermove="$emit('drag-move', $event)"
      @pointerup="$emit('drag-end', $event)"
    >
      <i class="fa-solid fa-grip-lines"></i>
    </button>
    <button
      class="pc-preset-prompt-main"
      type="button"
      :title="editable ? '编辑条目内容' : '查看占位条目'"
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
      <i class="fa-solid fa-chevron-right"></i>
    </button>
    <button
      v-if="editable"
      class="pc-icon-btn pc-preset-copy-btn"
      type="button"
      :disabled="busy"
      title="复制到原条目下方"
      @click="$emit('copy', prompt)"
    >
      <i class="fa-solid fa-copy"></i>
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
    dragging?: boolean;
    dropBefore?: boolean;
    groupId?: string;
    groupDisabled?: boolean;
    prompt: TavernPresetPrompt;
    reorderable?: boolean;
  }>(),
  {
    busy: false,
    dragging: false,
    dropBefore: false,
    groupId: '__ungrouped__',
    groupDisabled: false,
    reorderable: false,
  },
);

defineEmits<{
  copy: [prompt: TavernPresetPrompt];
  'drag-cancel': [event: PointerEvent];
  'drag-end': [event: PointerEvent];
  'drag-move': [event: PointerEvent];
  'drag-start': [event: PointerEvent, prompt: TavernPresetPrompt];
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
  position: relative;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 10px 12px;
}

.pc-preset-prompt-row.without-drag {
  grid-template-columns: minmax(0, 1fr) auto auto;
}

.pc-preset-prompt-row.drop-before::before {
  position: absolute;
  z-index: 2;
  top: -6px;
  right: 8px;
  left: 8px;
  height: 3px;
  border-radius: 2px;
  background: var(--pc-theme-accent);
  content: '';
}

.pc-preset-prompt-row.dragging {
  opacity: 0.55;
}

.pc-preset-drag-handle,
.pc-preset-copy-btn {
  width: 34px;
  min-width: 34px;
  height: 34px;
}

.pc-preset-drag-handle {
  color: var(--pc-muted);
  touch-action: none;
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

@media (max-width: 390px) {
  .pc-preset-prompt-row {
    gap: 6px;
    padding-inline: 8px;
  }

  .pc-preset-drag-handle,
  .pc-preset-copy-btn {
    width: 30px;
    min-width: 30px;
    height: 30px;
  }
}
</style>
