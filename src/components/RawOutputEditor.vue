<template>
  <section ref="rootEl" class="pc-raw-editor">
    <header class="pc-raw-editor-head">
      <div>
        <strong>{{ title }}</strong>
        <p v-if="displayDescription">{{ displayDescription }}</p>
      </div>
      <button v-if="editable" class="pc-soft-btn compact" type="button" @click="requestReparse">
        {{ reparseLabel }}
      </button>
    </header>
    <textarea
      ref="editorEl"
      :value="modelValue"
      class="pc-area pc-raw-editor-area"
      :placeholder="placeholder"
      :readonly="!editable"
      @blur="scheduleKeyboardActionSync"
      @focus="scheduleKeyboardActionSync"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>
    <div v-if="keyboardActionVisible" class="pc-raw-keyboard-action" :style="keyboardActionStyle">
      <button class="pc-primary-btn compact" type="button" @pointerdown.prevent @click="requestReparse">
        {{ reparseLabel }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { RawOutputSemantics } from '@/type/generation';
const props = withDefaults(
  defineProps<{
    description?: string;
    editable?: boolean;
    modelValue: string;
    placeholder?: string;
    rawOutputSemantics?: RawOutputSemantics;
    reparseLabel?: string;
    title?: string;
  }>(),
  {
    description: '',
    editable: true,
    placeholder: '在这里修改 AI 返回的原始 XML。',
    reparseLabel: '重新解析',
    rawOutputSemantics: 'original-v1',
    title: '原始输出',
  },
);

const emit = defineEmits<{
  reparse: [];
  'update:modelValue': [value: string];
}>();

const displayDescription = computed(() =>
  props.description ||
  (props.rawOutputSemantics === 'legacy-unknown'
    ? '这份历史输出的完整性无法验证；它可能是清洗后正文或解析候选。'
    : ''),
);

const rootEl = ref<HTMLElement | null>(null);
const editorEl = ref<HTMLTextAreaElement | null>(null);
const keyboardActionVisible = ref(false);
const keyboardActionStyle = ref<Record<string, string>>({});
const keyboardSyncTimers = new Set<number>();

function requestReparse() {
  emit('reparse');
}

function syncKeyboardAction() {
  const viewport = window.visualViewport;
  const root = rootEl.value;
  const editor = editorEl.value;
  const keyboardInset = viewport ? window.innerHeight - viewport.height : 0;
  if (!viewport || !root || !editor || document.activeElement !== editor || keyboardInset < 100) {
    keyboardActionVisible.value = false;
    return;
  }

  const rect = root.getBoundingClientRect();
  const viewportLeft = viewport.offsetLeft;
  const viewportRight = viewportLeft + viewport.width;
  const left = Math.max(viewportLeft + 8, rect.left);
  const right = Math.min(viewportRight - 8, rect.right);
  if (right - left < 120) {
    keyboardActionVisible.value = false;
    return;
  }

  keyboardActionStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.max(viewport.offsetTop + 8, Math.round(viewport.offsetTop + viewport.height - 52))}px`,
    width: `${Math.round(right - left)}px`,
  };
  keyboardActionVisible.value = true;
}

function scheduleKeyboardActionSync() {
  keyboardSyncTimers.forEach(timer => window.clearTimeout(timer));
  keyboardSyncTimers.clear();
  [0, 120, 320].forEach(delay => {
    const timer = window.setTimeout(() => {
      keyboardSyncTimers.delete(timer);
      syncKeyboardAction();
    }, delay);
    keyboardSyncTimers.add(timer);
  });
}

onMounted(() => {
  window.visualViewport?.addEventListener('resize', scheduleKeyboardActionSync);
  window.visualViewport?.addEventListener('scroll', scheduleKeyboardActionSync);
});

onBeforeUnmount(() => {
  keyboardSyncTimers.forEach(timer => window.clearTimeout(timer));
  keyboardSyncTimers.clear();
  window.visualViewport?.removeEventListener('resize', scheduleKeyboardActionSync);
  window.visualViewport?.removeEventListener('scroll', scheduleKeyboardActionSync);
});
</script>

<style scoped>
.pc-raw-editor {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  min-height: var(--pc-raw-editor-min-height, 0);
  height: 100%;
  overflow: hidden;
}

.pc-raw-editor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.pc-raw-editor-head strong {
  font-size: 15px;
}

.pc-raw-editor-head p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-raw-editor-area {
  min-height: var(--pc-raw-editor-area-height, var(--pc-reader-body-height, 320px));
  height: var(--pc-raw-editor-area-height, var(--pc-reader-body-height, 320px));
  resize: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
}

.pc-raw-keyboard-action {
  position: fixed;
  z-index: 2147483646;
  display: flex;
  padding: 4px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-bg);
  box-shadow: 0 -8px 24px color-mix(in srgb, var(--pc-text) 18%, transparent 82%);
}

.pc-raw-keyboard-action .pc-primary-btn {
  width: 100%;
}
</style>
