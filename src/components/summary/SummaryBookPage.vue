<template>
  <section class="pc-summary-book-page">
    <div class="pc-section-card pc-summary-book-actions">
      <div>
        <span class="pc-kicker">总结条目</span>
        <p>{{ book.entries.length }} 条</p>
      </div>
      <div class="pc-summary-book-toolbar">
        <button class="pc-soft-btn" type="button" @click="$emit('import')">
          <i class="fa-solid fa-file-import"></i>
          <span>导入</span>
        </button>
        <button class="pc-soft-btn" type="button" @click="$emit('batch')">
          <i class="fa-solid fa-layer-group"></i>
          <span>批量</span>
        </button>
        <button class="pc-soft-btn" type="button" @click="$emit('generate')">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>生成</span>
        </button>
        <button class="pc-soft-btn" type="button" @click="$emit('toggle-sort')">
          <span>{{ sortDesc ? '倒序' : '正序' }}</span>
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

    <div v-else class="pc-summary-entry-list">
      <article v-for="entry in entries" :key="entry.id" class="pc-section-card pc-summary-entry-card">
        <button type="button" @click="$emit('open-entry', entry.id)">
          <span>
            <strong>{{ entry.title }}</strong>
            <small>顺序 {{ entry.directoryOrder }}</small>
          </span>
          <p>{{ entry.rangeLabel }}</p>
        </button>
      </article>
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
.pc-summary-book-page,
.pc-summary-entry-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
}

.pc-summary-book-page {
  min-height: 100%;
  gap: 14px;
}

.pc-summary-book-actions {
  display: grid;
  gap: 12px;
}

.pc-summary-book-actions p,
.pc-summary-entry-card p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-summary-book-toolbar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-summary-book-toolbar > button {
  width: 100%;
  min-width: 0;
}

.pc-summary-book-toolbar > .pc-icon-btn:first-of-type {
  grid-column: 2;
}

.pc-summary-entry-card {
  padding: 0;
}

.pc-summary-entry-card > button {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 6px;
  border: 0;
  padding: 13px 14px;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-summary-entry-card > button > span {
  display: flex;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.pc-summary-entry-card strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-summary-entry-card small {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
  white-space: nowrap;
}

.pc-icon-btn.danger {
  color: var(--pc-danger);
}
</style>
