<template>
  <section class="pc-diary-book-page">
    <div class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">{{ book.perspective.name }} · {{ entries.length }} 篇</span>
      <div class="pc-directory-actions pc-diary-book-toolbar">
        <button class="pc-icon-btn primary" type="button" title="生成日记" @click="$emit('generate')">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </button>
        <button class="pc-icon-btn" type="button" title="批量生成" @click="$emit('batch')">
          <i class="fa-solid fa-layer-group"></i>
        </button>
        <button
          class="pc-icon-btn pc-directory-sort"
          type="button"
          :title="sortDesc ? '当前倒序，切换正序' : '当前正序，切换倒序'"
          @click="$emit('toggle-sort')"
        >
          <i :class="sortDesc ? 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-arrow-up-short-wide'"></i>
        </button>
        <button class="pc-icon-btn" type="button" title="重命名书架" @click="$emit('rename')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="pc-icon-btn danger" type="button" title="删除书架" @click="$emit('remove-book')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <label class="pc-search-field pc-diary-book-search">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" type="search" placeholder="搜索标题" />
    </label>

    <EmptyState v-if="!entries.length" title="没有匹配的日记" />
    <div v-else class="pc-directory-list pc-diary-entry-list">
      <button
        v-for="entry in entries"
        :key="entry.id"
        class="pc-list-row pc-diary-entry-row"
        type="button"
        @click="$emit('open-entry', entry.id)"
      >
        <strong>{{ entry.kind === 'read-reaction' ? `📖 ${entry.title}` : entry.title }}</strong>
      </button>
    </div>

    <FailedDraftList
      :drafts="failedDrafts"
      :get-context="getFailedDraftContext"
      :get-title="() => '未解析日记'"
      :show-header="false"
      @open="$emit('open-failed-draft', $event)"
      @remove="$emit('remove-failed-draft', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import type { DiaryBook, DiaryEntry } from '@/type/diary';
import type { FailedGenerationDraft } from '@/type/generation';

defineProps<{
  book: DiaryBook;
  entries: DiaryEntry[];
  failedDrafts: FailedGenerationDraft[];
  getFailedDraftContext: (draft: FailedGenerationDraft) => string;
  sortDesc: boolean;
}>();

defineEmits<{
  batch: [];
  generate: [];
  'open-entry': [entryId: string];
  'open-failed-draft': [draftId: string];
  'remove-book': [];
  'remove-failed-draft': [draftId: string];
  rename: [];
  'toggle-sort': [];
}>();

const query = defineModel<string>('query', { required: true });
</script>

<style scoped>
.pc-diary-book-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-diary-entry-row strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
