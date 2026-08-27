<template>
  <article class="pc-detail-content pc-rendered-markdown pc-reader-content">
    <slot name="before-header"></slot>
    <header v-if="title || $slots.meta" class="pc-reader-document-head">
      <h1 v-if="title">{{ title }}</h1>
      <slot name="meta"></slot>
    </header>
    <slot name="before"></slot>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="pc-reader-document-body" v-html="renderedContent"></div>
    <slot name="after"></slot>
  </article>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/store/settings';
import type { ReaderAppearance } from '@/type/settings';
import { renderMarkdown } from '@/util/markdown';
import { formatReaderContent } from '@/util/readerContent';
import { storeToRefs } from 'pinia';

const props = withDefaults(
  defineProps<{
    content: string;
    formatted?: boolean;
    reader?: Pick<ReaderAppearance, 'blankLineBetweenLines' | 'firstLineIndent'>;
    title?: string;
  }>(),
  {
    formatted: false,
    reader: undefined,
    title: '',
  },
);

const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const displayContent = computed(() => {
  if (props.formatted) return props.content;
  return formatReaderContent(props.content, props.reader ?? settings.value.reader);
});

const renderedContent = computed(() => renderMarkdown(displayContent.value));
</script>

<style scoped>
.pc-reader-content {
  flex: 1 1 auto;
  margin: 8px 0 0;
  min-height: 0;
  padding: 10px 0 0;
  border-radius: 0;
  background-color: var(--pc-reader-background, transparent);
  background-position: center;
  background-size: cover;
  color: var(--pc-reader-text, var(--pc-text));
  font-family: var(--pc-reader-font-family);
  overflow: auto;
  white-space: pre-wrap;
}

.pc-reader-content :deep(*) {
  font-family: inherit;
}

.pc-reader-content {
  padding-bottom: 44px;
}

.pc-reader-document-head {
  margin: 0 0 18px;
}

.pc-reader-document-head h1 {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--pc-reader-text, var(--pc-text));
  font-family: inherit;
  font-size: 24px;
  line-height: 1.3;
}

.pc-reader-document-head :deep(.pc-detail-meta) {
  margin-top: 8px;
}

.pc-reader-document-body {
  min-width: 0;
}
</style>
