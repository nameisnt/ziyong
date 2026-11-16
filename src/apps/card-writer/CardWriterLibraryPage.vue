<template>
  <section class="pc-card-writer-page">
    <header class="pc-directory-toolbar pc-card-writer-head">
      <span class="pc-directory-count">{{ rows.length }}/{{ documentCount }} 个成品</span>
      <SearchableCombobox
        class="pc-card-writer-chat-filter"
        input-label="筛选来源聊天"
        :model-value="chatFilter"
        :options="chatOptions"
        placeholder="全部聊天"
        toggle-title="展开来源聊天筛选"
        @update:model-value="emit('update:chatFilter', $event)"
      />
      <button
        class="pc-icon-btn"
        type="button"
        :class="{ active: bulkMode }"
        :disabled="!rows.length"
        aria-label="批量删除写卡成品"
        title="批量删除写卡成品"
        @click="emit('toggleBulk')"
      >
        <i class="fa-solid fa-list-check"></i>
      </button>
    </header>
    <BulkSelectionBar
      v-if="bulkMode"
      :all-selected="allSelected"
      :selected-count="selectedCount"
      :total-count="rows.length"
      @cancel="emit('cancelBulk')"
      @remove="emit('removeSelected')"
      @toggle-all="emit('toggleAll')"
    />
    <div v-if="rows.length" class="pc-directory-list pc-card-writer-library">
      <article v-for="row in rows" :key="row.document.id" class="pc-list-row pc-card-writer-document">
        <BulkSelectionCheckbox
          v-if="bulkMode"
          :model-value="row.selected"
          :label="`选择 ${row.document.title}`"
          @update:model-value="emit('select', row.document.id, $event)"
        />
        <button
          type="button"
          class="pc-card-writer-document-open"
          @click="bulkMode ? emit('select', row.document.id, !row.selected) : emit('open', row.document)"
        >
          <strong :title="row.document.title">{{ row.document.title }}</strong>
          <small :title="row.meta">{{ row.meta }}</small>
        </button>
        <template v-if="!bulkMode">
          <button
            class="pc-icon-btn"
            type="button"
            aria-label="复制成品"
            title="复制成品"
            @click="emit('copy', row.document)"
          >
            <i class="fa-solid fa-copy"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            aria-label="导入资料表"
            title="导入资料表"
            @click="emit('importProfiles', row.document)"
          >
            <i class="fa-solid fa-table-list"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            aria-label="删除成品"
            title="删除成品"
            @click="emit('delete', row.document)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </template>
      </article>
    </div>
    <EmptyState v-else :title="documentCount ? '当前筛选下没有写卡成品' : '还没有保存写卡成品'" />
  </section>
</template>

<script setup lang="ts">
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';

import type { CardWriterDocument } from './store';

defineProps<{
  allSelected: boolean;
  bulkMode: boolean;
  chatFilter: string;
  chatOptions: Array<{ group?: string; label: string; value: string }>;
  documentCount: number;
  rows: Array<{ document: CardWriterDocument; meta: string; selected: boolean }>;
  selectedCount: number;
}>();

const emit = defineEmits<{
  cancelBulk: [];
  copy: [document: CardWriterDocument];
  delete: [document: CardWriterDocument];
  importProfiles: [document: CardWriterDocument];
  open: [document: CardWriterDocument];
  removeSelected: [];
  select: [id: string, selected: boolean];
  toggleAll: [];
  toggleBulk: [];
  'update:chatFilter': [value: string];
}>();
</script>

<style scoped>
.pc-card-writer-head .pc-directory-count {
  flex: 0 0 auto;
}

.pc-card-writer-chat-filter {
  min-width: 0;
  flex: 0 1 230px;
}

.pc-card-writer-library {
  display: grid;
  gap: 0;
}

.pc-card-writer-document {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-card-writer-document small {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}

.pc-card-writer-document-open {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 4px;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-card-writer-document-open strong,
.pc-card-writer-document-open small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
