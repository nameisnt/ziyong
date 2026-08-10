<template>
  <section class="pc-extras-page">
    <div class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">{{ chapters.length }} 章</span>
      <div class="pc-directory-actions pc-book-actions">
        <button class="pc-icon-btn primary" type="button" :title="t`生成章节`" @click="emit('generateChapter')">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </button>
        <button class="pc-icon-btn" type="button" :title="t`编辑番外信息`" @click="emit('editBook')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="pc-icon-btn danger" type="button" :title="t`删除番外`" @click="emit('deleteBook')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="pc-compact-toolbar pc-extras-filter">
      <label class="pc-search-field">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="query" type="search" :placeholder="t`搜索章节标题`" />
      </label>
      <button
        class="pc-icon-btn pc-directory-sort"
        type="button"
        :title="sortDesc ? t`当前倒序，切换正序` : t`当前正序，切换倒序`"
        @click="sortDesc = !sortDesc"
      >
        <i :class="sortDesc ? 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-arrow-up-short-wide'"></i>
      </button>
    </div>

    <details class="pc-summary-section">
      <summary class="pc-summary-toggle">
        <span>
          <i class="fa-solid fa-chevron-right"></i>
          <strong>{{ t`章节总结` }}</strong>
        </span>
        <small>{{ `${book.summaries.length} 条` }}</small>
      </summary>

      <div class="pc-summary-body">
        <div class="pc-summary-actions">
          <button class="pc-soft-btn" type="button" @click="emit('generateSummary')">
            {{ t`生成总结` }}
          </button>
        </div>

        <EmptyState v-if="!book.summaries.length" compact :title="t`还没有章节总结。`" />

        <div v-else class="pc-directory-list pc-summary-list">
          <article v-for="summaryItem in book.summaries" :key="summaryItem.id" class="pc-list-row">
            <strong>{{ formatCoveredChapters(summaryItem.coveredChapterIds) }}</strong>
            <div class="pc-directory-actions pc-book-actions">
              <label class="pc-toggle" :title="summaryItem.enabled ? t`停用总结` : t`启用总结`">
                <input type="checkbox" :checked="summaryItem.enabled" @change="emit('toggleSummary', summaryItem.id)" />
                <span aria-hidden="true"></span>
              </label>
              <button
                class="pc-icon-btn"
                type="button"
                :title="t`编辑总结`"
                @click="emit('editSummary', summaryItem.id)"
              >
                <i class="fa-solid fa-pen"></i>
              </button>
              <button
                class="pc-icon-btn danger"
                type="button"
                :title="t`删除总结`"
                @click="emit('deleteSummary', summaryItem.id)"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </article>
        </div>
      </div>
    </details>

    <EmptyState v-if="!chapters.length" :title="t`没有匹配的章节`" />

    <div v-else class="pc-directory-list pc-entry-list">
      <button
        v-for="chapter in chapters"
        :key="chapter.id"
        class="pc-list-row pc-entry-main"
        type="button"
        @click="emit('openChapter', chapter.id)"
      >
        <strong>{{ `第 ${chapter.chapterNumber} 章 · ${chapter.title}` }}</strong>
        <ContentVersionBadge :count="Math.max(1, chapter.versions.length)" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ContentVersionBadge from '@/components/ContentVersionBadge.vue';
import type { ExtraBook, ExtraChapter } from '@/type/extra';

const props = defineProps<{
  book: ExtraBook;
  chapters: ExtraChapter[];
}>();

const query = defineModel<string>('query', { required: true });
const sortDesc = defineModel<boolean>('sortDesc', { required: true });

const emit = defineEmits<{
  deleteBook: [];
  deleteSummary: [summaryId: string];
  editBook: [];
  editSummary: [summaryId: string];
  generateChapter: [];
  generateSummary: [];
  openChapter: [chapterId: string];
  toggleSummary: [summaryId: string];
}>();

function formatCoveredChapters(ids: string[]) {
  if (!ids.length) return '未关联章节';
  const titles = props.book.chapters
    .filter(chapter => ids.includes(chapter.id))
    .map(chapter => `第 ${chapter.chapterNumber} 章`);
  return titles.join('、') || '未关联章节';
}
</script>

<style scoped>
.pc-extras-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-summary-section {
  padding-block: 4px 12px;
  border-block: 1px solid var(--pc-border);
}

.pc-summary-toggle {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--pc-text);
  cursor: pointer;
  list-style: none;
}

.pc-summary-toggle::-webkit-details-marker {
  display: none;
}

.pc-summary-toggle > span,
.pc-summary-body,
.pc-summary-actions,
.pc-book-actions {
  display: flex;
}

.pc-summary-toggle > span,
.pc-book-actions {
  align-items: center;
  gap: 10px;
}

.pc-summary-toggle > small {
  color: var(--pc-muted);
  font-weight: 700;
}

.pc-summary-toggle i {
  color: var(--pc-muted);
  transition: transform 160ms ease;
}

.pc-summary-section[open] .pc-summary-toggle i {
  transform: rotate(90deg);
}

.pc-summary-body {
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}

.pc-summary-actions {
  justify-content: flex-end;
}

.pc-entry-main strong {
  min-width: 0;
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
