<template>
  <section class="pc-summary-book-page">
    <div class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">{{ book.entries.length }} 条总结</span>
      <div class="pc-directory-actions pc-summary-book-toolbar">
        <button class="pc-icon-btn" type="button" title="导入总结" @click="$emit('import')">
          <i class="fa-solid fa-file-import"></i>
        </button>
        <button class="pc-icon-btn" type="button" title="批量生成" @click="$emit('batch')">
          <i class="fa-solid fa-layer-group"></i>
        </button>
        <button class="pc-icon-btn primary" type="button" title="生成总结" @click="$emit('generate')">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </button>
        <button
          class="pc-icon-btn pc-directory-sort"
          type="button"
          :title="sortDesc ? '当前倒序，切换正序' : '当前正序，切换倒序'"
          @click="$emit('toggle-sort')"
        >
          <i :class="sortDesc ? 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-arrow-up-short-wide'"></i>
        </button>
        <button class="pc-icon-btn" type="button" title="重命名总结集" @click="$emit('rename')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="pc-icon-btn danger" type="button" title="删除总结集" @click="$emit('remove-book')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <EmptyState v-if="!entries.length" title="还没有条目" />

    <div v-else class="pc-directory-list pc-summary-entry-list">
      <button
        v-for="entry in entries"
        :key="entry.id"
        class="pc-list-row"
        type="button"
        @click="$emit('open-entry', entry.id)"
      >
        <span class="pc-list-row-copy">
          <strong>{{ entry.title }}</strong>
          <small>{{ entry.rangeLabel }}</small>
        </span>
        <small class="pc-list-row-meta">顺序 {{ entry.directoryOrder }}</small>
      </button>
    </div>

    <FailedDraftList
      delete-title="删除"
      :drafts="failedDrafts"
      :get-context="getFailedDraftContext"
      :get-title="() => '未解析输出'"
      @open="$emit('open-failed-draft', $event)"
      @remove="$emit('remove-failed-draft', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import type { FailedGenerationDraft } from '@/type/generation';
import type { SummaryBook, SummaryEntry } from '@/type/summary';

defineProps<{
  book: SummaryBook;
  entries: SummaryEntry[];
  failedDrafts: FailedGenerationDraft[];
  getFailedDraftContext: (draft: FailedGenerationDraft) => string;
  sortDesc: boolean;
}>();

defineEmits<{
  batch: [];
  generate: [];
  import: [];
  'open-entry': [entryId: string];
  'open-failed-draft': [draftId: string];
  'remove-book': [];
  'remove-failed-draft': [draftId: string];
  rename: [];
  'toggle-sort': [];
}>();
</script>

<style scoped>
.pc-summary-book-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}
</style>
