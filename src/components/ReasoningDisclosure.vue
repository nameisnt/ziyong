<template>
  <details v-if="content.trim()" class="pc-reasoning-disclosure">
    <summary :title="t`展开或折叠思维链`">
      <span aria-hidden="true">◇ ◇ ◇ ◇ ◇ ◇</span>
      <span class="pc-reasoning-label">{{ t`思维链` }}</span>
    </summary>
    <!-- renderMarkdown 会转义原始 HTML/XML，只保留安全的基础 Markdown 显示。 -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="pc-reasoning-body" v-html="renderedContent"></div>
  </details>
</template>

<script setup lang="ts">
import { renderMarkdown } from '@/util/markdown';

const props = defineProps<{
  content: string;
}>();

const renderedContent = computed(() => renderMarkdown(props.content));
</script>

<style scoped>
.pc-reasoning-disclosure {
  margin: 0 0 16px;
  color: var(--pc-reader-text, var(--pc-text));
}

.pc-reasoning-disclosure > summary {
  display: flex;
  width: max-content;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  padding: 3px 2px;
  color: color-mix(in srgb, var(--pc-reader-text, var(--pc-text)) 62%, transparent 38%);
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  list-style: none;
  user-select: none;
}

.pc-reasoning-disclosure > summary::-webkit-details-marker {
  display: none;
}

.pc-reasoning-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.pc-reasoning-body {
  margin: 8px 0 20px;
  color: color-mix(in srgb, var(--pc-reader-text, var(--pc-text)) 84%, transparent 16%);
  font-size: 0.94em;
  line-height: 1.68;
  overflow-wrap: anywhere;
}

.pc-reasoning-body :deep(:first-child) {
  margin-top: 0;
}

.pc-reasoning-body :deep(:last-child) {
  margin-bottom: 0;
}

.pc-reasoning-body :deep(p) {
  margin: 0 0 0.85em;
}

.pc-reasoning-body :deep(pre) {
  max-width: 100%;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
