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

    <section class="pc-summary-section">
      <div class="pc-section-head">
        <strong>{{ t`章节总结` }}</strong>
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
    </section>

    <EmptyState v-if="!chapters.length" :title="t`没有匹配的章节`" />

    <div v-else class="pc-entry-list">
      <article v-for="chapter in chapters" :key="chapter.id" class="pc-entry-card">
        <button class="pc-entry-main" type="button" @click="emit('openChapter', chapter.id)">
          <strong>{{ `第 ${chapter.chapterNumber} 章 · ${chapter.title}` }}</strong>
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
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
.pc-summary-section,
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

.pc-section-head,
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
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
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
