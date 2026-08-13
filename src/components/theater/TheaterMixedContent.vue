<template>
  <div class="pc-theater-mixed-content">
    <template v-for="(segment, index) in segments" :key="`${segment.kind}:${index}`">
      <FrontendFrame
        v-if="segment.kind === 'html'"
        embedded
        :active="active"
        :content="segment.content"
        :theme="theme"
        :title="title"
        @navigate-blocked="$emit('navigate-blocked')"
        @reader-tap="$emit('reader-tap')"
      />
      <!-- Markdown renderer sanitizes output before it reaches this component. -->
      <!-- eslint-disable vue/no-v-html -->
      <article
        v-else
        class="pc-detail-content pc-rendered-markdown pc-theater-text-segment"
        v-html="renderMarkdown(formatReaderContent(segment.content, settings.reader))"
      ></article>
      <!-- eslint-enable vue/no-v-html -->
    </template>
  </div>
</template>

<script setup lang="ts">
import FrontendFrame from '@/components/FrontendFrame.vue';
import { useSettingsStore } from '@/store/settings';
import { formatReaderContent } from '@/util/readerContent';
import { renderMarkdown } from '@/util/markdown';
import { parseTheaterContentSegments } from '@/util/theaterMixedContent';
import { storeToRefs } from 'pinia';

const props = withDefaults(
  defineProps<{ active?: boolean; content: string; theme?: 'dark' | 'light'; title?: string }>(),
  { active: true, theme: 'light', title: '' },
);
defineEmits<{ 'navigate-blocked': []; 'reader-tap': [] }>();
const { settings } = storeToRefs(useSettingsStore());
const segments = computed(() => parseTheaterContentSegments(props.content));
</script>

<style scoped>
.pc-theater-mixed-content {
  display: grid;
  gap: 14px;
}

.pc-theater-text-segment {
  min-height: 0;
  padding: 0;
}
</style>
