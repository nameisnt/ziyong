<template>
  <section class="pc-letters-book-page">
    <div class="pc-section-card pc-letters-book-actions">
      <div>
        <span class="pc-kicker">书信分册</span>
        <p>{{ entries.length }} 封</p>
      </div>
      <button class="pc-primary-btn" type="button" @click="$emit('generate')">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>生成回信</span>
      </button>
    </div>

    <div class="pc-letters-book-filter">
      <input v-model="query" class="pc-field" type="search" placeholder="搜索标题、发信人或收信人" />
      <button class="pc-soft-btn" type="button" @click="$emit('toggle-sort')">
        {{ sortDesc ? '倒序' : '正序' }}
      </button>
    </div>

    <EmptyState v-if="!entries.length" title="没有匹配的信件" />
    <div v-else class="pc-letters-entry-list">
      <article v-for="entry in entries" :key="entry.id" class="pc-section-card pc-letters-entry-card">
        <button type="button" @click="$emit('open-entry', entry.id)">
          <span>
            <strong>{{ entry.title }}</strong>
            <ContentVersionBadge :count="Math.max(1, entry.versions.length)" />
          </span>
          <p>{{ formatDirection(entry.sender.name, entry.receiver.name) }} · {{ formatLabel(entry.format) }}</p>
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import ContentVersionBadge from '@/components/ContentVersionBadge.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { LetterBook, LetterEntry, LetterFormat } from '@/type/letter';

defineProps<{
  book: LetterBook;
  entries: LetterEntry[];
  formatDirection: (senderName: string, receiverName: string) => string;
  formatLabel: (format: LetterFormat) => string;
  sortDesc: boolean;
}>();

defineEmits<{
  generate: [];
  'open-entry': [entryId: string];
  'toggle-sort': [];
}>();

const query = defineModel<string>('query', { required: true });
</script>

<style scoped>
.pc-letters-book-page,
.pc-letters-entry-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
}

.pc-letters-book-page {
  min-height: 100%;
  gap: 14px;
}

.pc-letters-book-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-letters-book-actions p,
.pc-letters-entry-card p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-letters-book-filter {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.pc-letters-entry-card {
  padding: 0;
}

.pc-letters-entry-card > button {
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

.pc-letters-entry-card > button > span {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-letters-entry-card strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
