<template>
  <section class="pc-extras-page">
    <div class="pc-extras-actions-hero">
      <div class="pc-book-actions">
        <button class="pc-soft-btn" type="button" @click="emit('generateChapter')">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>{{ t`生成章节` }}</span>
        </button>
        <button class="pc-icon-btn" type="button" :title="t`编辑番外信息`" @click="emit('editBook')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="pc-icon-btn danger" type="button" :title="t`删除番外`" @click="emit('deleteBook')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="pc-toolbar">
      <input v-model="query" class="pc-search" type="text" :placeholder="t`搜索章节标题`" />
      <button class="pc-soft-btn" type="button" @click="sortDesc = !sortDesc">
        {{ sortDesc ? t`倒序` : t`正序` }}
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

        <div v-else class="pc-summary-list">
          <article v-for="summaryItem in book.summaries" :key="summaryItem.id" class="pc-summary-card">
            <div class="pc-summary-head">
              <strong>{{ formatCoveredChapters(summaryItem.coveredChapterIds) }}</strong>
              <div class="pc-book-actions">
                <button
                  :class="['pc-toggle-chip', { active: summaryItem.enabled }]"
                  type="button"
                  @click="emit('toggleSummary', summaryItem.id)"
                >
                  {{ summaryItem.enabled ? t`已启用` : t`已停用` }}
                </button>
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
            </div>
          </article>
        </div>
      </div>
    </details>

    <EmptyState v-if="!chapters.length" :title="t`没有匹配的章节`" />

    <div v-else class="pc-entry-list">
      <article v-for="chapter in chapters" :key="chapter.id" class="pc-entry-card">
        <button class="pc-entry-main" type="button" @click="emit('openChapter', chapter.id)">
          <strong>{{ `第 ${chapter.chapterNumber} 章 · ${chapter.title}` }}</strong>
          <ContentVersionBadge :count="Math.max(1, chapter.versions.length)" />
        </button>
      </article>
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
.pc-extras-page,
.pc-summary-list,
.pc-entry-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-extras-page {
  min-height: 100%;
  gap: 14px;
}

.pc-summary-section {
  border-block: 1px solid var(--pc-border);
  padding-block: 4px 12px;
}

.pc-summary-toggle {
  min-height: 52px;
  display: flex;
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
.pc-summary-actions {
  display: flex;
}

.pc-summary-toggle > span {
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

.pc-extras-actions-hero,
.pc-toolbar,
.pc-summary-card,
.pc-entry-card {
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-extras-actions-hero {
  display: flex;
  justify-content: flex-end;
  padding: 14px;
}

.pc-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 18px;
}

.pc-search {
  width: 100%;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 12px 14px;
}

.pc-summary-head,
.pc-book-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-summary-card,
.pc-entry-card {
  padding: 14px;
}

.pc-summary-head strong,
.pc-entry-main strong {
  display: block;
  font-size: 16px;
}

.pc-entry-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-entry-main strong {
  min-width: 0;
}

.pc-toggle-chip {
  min-width: 92px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 0 14px;
  cursor: pointer;
}

.pc-toggle-chip.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
}

.pc-icon-btn.danger {
  color: var(--pc-danger);
}
</style>
