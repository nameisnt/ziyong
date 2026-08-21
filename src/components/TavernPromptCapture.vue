<template>
  <section class="pc-tavern-prompt-capture">
    <div class="pc-capture-head">
      <strong>{{ t`酒馆最终提示词` }}</strong>
      <div class="pc-capture-actions">
        <button v-if="captured" class="pc-capture-btn" type="button" @click="toggleAll">
          {{ allExpanded ? t`收起` : t`展开` }}
        </button>
        <button class="pc-capture-btn" type="button" :disabled="running" @click="capturePrompt">
          {{ running ? t`捕获中` : t`捕获` }}
        </button>
      </div>
    </div>

    <p v-if="error" class="pc-capture-error">{{ error }}</p>

    <template v-if="captured">
      <div class="pc-capture-meta">
        <span>{{ `总 token：${captured.totalTokens}` }}</span>
        <span>{{ `${captured.messages.length} 条消息` }}</span>
        <span>{{ captured.model ? `模型：${captured.model}` : t`模型：未读取` }}</span>
        <span>{{ captured.preset ? `预设：${captured.preset}` : t`预设：未读取` }}</span>
      </div>

      <div class="pc-capture-list" @wheel.stop @touchmove.stop>
        <article v-for="message in captured.messages" :key="message.id" class="pc-capture-message">
          <button class="pc-capture-message-head" type="button" @click="toggle(message.id)">
            <span>{{ `Role: ${roleIcon(message.role)} ${message.role} | Tokens: ${message.token}` }}</span>
            <i
              class="fa-solid"
              :class="expandedIds.includes(message.id) ? 'fa-circle-chevron-up' : 'fa-circle-chevron-down'"
            ></i>
          </button>
          <pre v-if="expandedIds.includes(message.id)" class="pc-capture-content">{{
            message.content || '（空内容）'
          }}</pre>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { CapturedTavernPromptPreview } from '@/util/runtime';

const props = defineProps<{
  capture: () => Promise<CapturedTavernPromptPreview>;
  resetKey?: unknown;
}>();

const captured = ref<CapturedTavernPromptPreview | null>(null);
const error = ref('');
const expandedIds = ref<number[]>([]);
const running = ref(false);
const allExpanded = computed(
  () => Boolean(captured.value?.messages.length) && expandedIds.value.length === captured.value.messages.length,
);

watch(
  () => props.resetKey,
  () => {
    captured.value = null;
    expandedIds.value = [];
    error.value = '';
  },
);

function roleIcon(role: string) {
  if (role === 'system') return '⚙️';
  if (role === 'user') return '👤';
  if (role === 'assistant') return '🤖';
  return '•';
}

function toggle(id: number) {
  expandedIds.value = expandedIds.value.includes(id)
    ? expandedIds.value.filter(item => item !== id)
    : [...expandedIds.value, id];
}

function toggleAll() {
  const messages = captured.value?.messages || [];
  expandedIds.value = allExpanded.value ? [] : messages.map(message => message.id);
}

async function capturePrompt() {
  if (running.value) return;
  running.value = true;
  error.value = '';

  try {
    const result = await props.capture();
    captured.value = result;
    expandedIds.value = [];
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : '捕获酒馆提示词失败';
  } finally {
    running.value = false;
  }
}
</script>

<style scoped>
.pc-tavern-prompt-capture {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
  padding: 14px;
}

.pc-capture-head,
.pc-capture-actions,
.pc-capture-message-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pc-capture-head {
  justify-content: space-between;
}

.pc-capture-actions {
  justify-content: flex-end;
}

.pc-capture-btn {
  /* ui-reuse-allow: capture popover uses compact native-button reset. */
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  padding: 0 14px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface-strong) 84%);
  color: var(--pc-text);
  font: inherit;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

.pc-capture-btn:disabled {
  cursor: default;
  opacity: 0.46;
}

.pc-capture-error {
  margin: 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-capture-error {
  color: var(--pc-danger);
}

.pc-capture-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pc-capture-meta span {
  min-height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  background: var(--pc-surface-strong);
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-capture-list {
  display: block;
  gap: 7px;
  height: 420px;
  min-height: 0;
  max-height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: auto;
}

.pc-capture-message + .pc-capture-message {
  margin-top: 7px;
}

.pc-capture-message {
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: 14px;
  background: var(--pc-surface-strong);
}

.pc-capture-message-head {
  width: 100%;
  min-height: 36px;
  border: 0;
  padding: 8px 10px;
  background: transparent;
  color: var(--pc-text);
  font-size: 12px;
  text-align: left;
}

.pc-capture-content {
  display: block;
  width: 100%;
  height: auto;
  min-height: 0;
  max-height: none;
  box-sizing: border-box;
  overflow: visible;
  margin: 0;
  padding: 10px;
  border: 0;
  border-top: 1px solid var(--pc-border);
  border-radius: 0;
  background: var(--pc-surface);
  color: var(--pc-text);
  font-family: var(--pc-font-sans);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  user-select: text;
}
</style>
