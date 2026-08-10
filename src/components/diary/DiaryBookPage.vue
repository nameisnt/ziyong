<template>
  <section class="pc-diary-book-page">
    <div class="pc-section-card pc-diary-book-actions">
      <div>
        <span class="pc-kicker">{{ book.perspective.name }}</span>
        <p>{{ entries.length }} 篇日记</p>
      </div>
      <div class="pc-diary-book-toolbar">
        <button class="pc-soft-btn" type="button" @click="$emit('generate')">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>生成</span>
        </button>
        <button class="pc-soft-btn" type="button" @click="$emit('batch')">
          <i class="fa-solid fa-layer-group"></i>
          <span>批量</span>
        </button>
        <button class="pc-soft-btn" type="button" @click="$emit('toggle-sort')">
          {{ sortDesc ? '倒序' : '正序' }}
        </button>
        <button class="pc-icon-btn" type="button" title="重命名书架" @click="$emit('rename')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="pc-icon-btn danger" type="button" title="删除书架" @click="$emit('remove-book')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <input v-model="query" class="pc-field pc-diary-book-search" type="search" placeholder="搜索标题" />

    <EmptyState v-if="!entries.length" title="没有匹配的日记" />
    <div v-else class="pc-diary-entry-list">
      <article v-for="entry in entries" :key="entry.id" class="pc-section-card pc-diary-entry-card">
        <button type="button" @click="$emit('open-entry', entry.id)">
          <strong>{{ entry.kind === 'read-reaction' ? `📖 ${entry.title}` : entry.title }}</strong>
          <small>顺序 {{ entry.directoryOrder }}</small>
        </button>
      </article>
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
.pc-diary-book-page,
.pc-diary-entry-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
}

.pc-diary-book-page {
  min-height: 100%;
  gap: 14px;
}

.pc-diary-book-actions {
  display: grid;
  gap: 12px;
}

.pc-diary-book-actions p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-diary-book-toolbar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-diary-book-toolbar > button {
  width: 100%;
  min-width: 0;
}

.pc-diary-book-toolbar > .pc-icon-btn:first-of-type {
  grid-column: 2;
}

.pc-diary-entry-card {
  padding: 0;
}

.pc-diary-entry-card > button {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  padding: 13px 14px;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-diary-entry-card strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-diary-entry-card small {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
  white-space: nowrap;
}

.pc-icon-btn.danger {
  color: var(--pc-danger);
}
</style>
