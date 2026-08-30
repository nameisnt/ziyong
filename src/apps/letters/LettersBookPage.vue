<template>
  <section class="pc-letters-book-page pc-page-stack">
    <div class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">{{ entries.length }} 封书信</span>
      <div class="pc-directory-actions">
        <button
          class="pc-icon-btn primary"
          type="button"
          title="生成回信"
          aria-label="生成回信"
          @click="$emit('generate')"
        >
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </button>
        <ActionMenu label="管理" icon="fa-solid fa-bars">
          <ItemTransferImportAction app-id="letters" :params="{ bookId: book.id }" label="导入单封书信" />
        </ActionMenu>
      </div>
    </div>

    <div class="pc-compact-toolbar pc-letters-book-filter">
      <label class="pc-search-field">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="query" type="search" placeholder="搜索标题、发信人或收信人" />
      </label>
      <button
        class="pc-icon-btn pc-directory-sort"
        type="button"
        :title="sortDesc ? '当前倒序，切换正序' : '当前正序，切换倒序'"
        :aria-label="sortDesc ? '当前倒序，切换正序' : '当前正序，切换倒序'"
        @click="$emit('toggle-sort')"
      >
        <i :class="sortDesc ? 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-arrow-up-short-wide'"></i>
      </button>
    </div>

    <EmptyState v-if="!entries.length" title="没有匹配的信件" />
    <div v-else class="pc-directory-list pc-letters-entry-list">
      <button
        v-for="entry in entries"
        :key="entry.id"
        class="pc-list-row"
        type="button"
        @click="$emit('open-entry', entry.id)"
      >
        <span class="pc-list-row-copy">
          <strong>{{ entry.title }}</strong>
          <small>{{ formatDirection(entry.sender.name, entry.receiver.name) }} · {{ formatLabel(entry.format) }}</small>
        </span>
        <ContentVersionBadge :count="Math.max(1, entry.versions.length)" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import ActionMenu from '@/components/ActionMenu.vue';
import ContentVersionBadge from '@/components/ContentVersionBadge.vue';
import EmptyState from '@/components/EmptyState.vue';
import ItemTransferImportAction from '@/components/ItemTransferImportAction.vue';
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
