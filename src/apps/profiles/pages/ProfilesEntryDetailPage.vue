<template>
  <section class="pc-profiles-page pc-profiles-detail-page">
    <ReaderDetailShell
      :bagu-enabled="Boolean(baguContent)"
      catalog-label="列表"
      custom-content
      display-app-id="profiles"
      :favorite-active="entry.favorite"
      next-label="下一条"
      previous-label="上一条"
      :next-disabled="!nextEntryId"
      :previous-disabled="!previousEntryId"
      :title="entry.title"
      @bottom="scrollToBottom"
      @catalog="$emit('catalog')"
      @edit="$emit('edit')"
      @favorite="$emit('favorite')"
      @next="$emit('open-entry', nextEntryId)"
      @previous="$emit('open-entry', previousEntryId)"
      @top="scrollToTop"
      @bagu="$emit('bagu')"
    >
      <template #kicker>
        <span class="pc-kicker"><i :class="['fa-solid', kindIcon]"></i>{{ tableName }}</span>
      </template>
      <template #content>
        <FrontendFrame v-if="renderMode === 'frontend'" :content="frontendContent" :theme="theme" :title="entry.title" />
        <div v-if="frontendErrors.length" class="pc-status-card warning">
          <strong>资料表格式提示</strong>
          <p>{{ frontendErrors.join('；') }}</p>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <article v-else class="pc-profile-detail-content pc-rendered-markdown" v-html="markdownHtml"></article>
      </template>
      <template #actions>
        <button class="pc-soft-btn danger" type="button" title="删除" @click="$emit('remove')">
          <i class="fa-solid fa-trash"></i><span>删除</span>
        </button>
      </template>
    </ReaderDetailShell>
  </section>
</template>
<script setup lang="ts">
import FrontendFrame from '@/components/FrontendFrame.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import { useDetailScroll } from '@/util/detailScroll';
import type { ProfileEntry, ProfileRenderMode } from '../store';
defineProps<{
  baguContent: string;
  entry: ProfileEntry;
  frontendContent: string;
  frontendErrors: string[];
  kindIcon: string;
  markdownHtml: string;
  nextEntryId: string;
  previousEntryId: string;
  renderMode: ProfileRenderMode;
  tableName: string;
  theme: 'dark' | 'light';
}>();
defineEmits<{ bagu: []; catalog: []; edit: []; favorite: []; 'open-entry': [entryId: string]; remove: [] }>();
const contentEl = ref<HTMLElement | null>(null);
const { scrollToBottom, scrollToTop } = useDetailScroll(contentEl, '.pc-profiles-detail-page .pc-reader-content');
</script>
<style scoped>
.pc-profiles-page {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 14px;
}
.pc-profiles-detail-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}
.pc-profiles-detail-page .pc-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.pc-profiles-detail-page .pc-profile-detail-content {
  min-height: 0;
}
</style>
