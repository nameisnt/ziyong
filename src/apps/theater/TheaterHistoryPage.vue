<template>
  <section class="pc-theater-history-page pc-page-grid">
    <div class="pc-compact-toolbar">
      <label class="pc-search-field">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="query" type="search" :placeholder="filterOpen ? t`搜索记录或标签...` : t`搜索标题或类型...`" />
      </label>
      <button
        class="pc-icon-btn"
        type="button"
        :title="sortDesc ? t`当前倒序，切换正序` : t`当前正序，切换倒序`"
        :aria-label="sortDesc ? t`当前倒序，切换正序` : t`当前正序，切换倒序`"
        @click="sortDesc = !sortDesc"
      >
        <i :class="sortDesc ? 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-arrow-up-wide-short'"></i>
      </button>
      <button
        v-if="historyTypeTabs.length"
        :class="['pc-icon-btn', 'pc-theater-filter-toggle', { active: filterOpen || selectedTypeKeys.size }]"
        type="button"
        :title="selectedTypeKeys.size ? `标签筛选，已选 ${selectedTypeKeys.size} 项` : t`标签筛选`"
        :aria-label="selectedTypeKeys.size ? `标签筛选，已选 ${selectedTypeKeys.size} 项` : t`标签筛选`"
        @click="filterOpen = !filterOpen"
      >
        <i class="fa-solid fa-tags"></i>
      </button>
    </div>

    <section v-if="filterOpen && historyTypeTabs.length" class="pc-page-section pc-history-tag-panel">
      <div class="pc-history-tag-actions">
        <span>{{ `已选 ${selectedTypeKeys.size} / ${historyTypeTabs.length}` }}</span>
        <button class="pc-soft-btn compact" type="button" @click="$emit('invert-visible')">{{ t`反选可见` }}</button>
        <button class="pc-soft-btn compact" type="button" @click="$emit('clear-filters')">{{ t`清空` }}</button>
      </div>
      <div class="pc-history-tag-list" aria-label="小剧场类型筛选">
        <CapsuleTag
          v-for="tab in filteredHistoryTypeTabs"
          :key="tab.key"
          :active="selectedTypeKeys.has(tab.key)"
          compact
          :count="tab.count"
          icon="fa-solid fa-masks-theater"
          :label="tab.label"
          @click="$emit('toggle-filter', tab.key)"
        />
      </div>
    </section>

    <EmptyState
      v-if="!entries.length"
      :title="query || selectedTypeKeys.size ? t`暂无匹配记录` : t`还没有小剧场条目`"
    />
    <div v-else class="pc-entry-list">
      <button
        v-for="entry in entries"
        :key="entry.id"
        class="pc-list-row pc-entry-main"
        type="button"
        @click="$emit('open-entry', entry.id)"
      >
        <strong>{{ entry.title }}</strong>
        <ContentVersionBadge :count="Math.max(1, entry.versions.length)" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import CapsuleTag from '@/components/CapsuleTag.vue';
import ContentVersionBadge from '@/components/ContentVersionBadge.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { TheaterEntry } from '@/type/theater';

export interface TheaterHistoryTypeTab {
  count: number;
  key: string;
  label: string;
  latest: string;
}

defineProps<{
  entries: TheaterEntry[];
  filteredHistoryTypeTabs: TheaterHistoryTypeTab[];
  historyTypeTabs: TheaterHistoryTypeTab[];
  selectedTypeKeys: Set<string>;
}>();

const filterOpen = defineModel<boolean>('filterOpen', { required: true });
const query = defineModel<string>('query', { required: true });
const sortDesc = defineModel<boolean>('sortDesc', { required: true });

defineEmits<{
  'clear-filters': [];
  'invert-visible': [];
  'open-entry': [entryId: string];
  'toggle-filter': [key: string];
}>();
</script>

<style scoped>
.pc-history-tag-panel {
  display: grid;
  gap: 10px;
}

.pc-history-tag-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.pc-history-tag-actions > span {
  min-width: 0;
  margin-right: auto;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-history-tag-list {
  display: flex;
  max-height: 160px;
  align-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.pc-entry-list {
  display: grid;
  gap: 0;
}

.pc-entry-main {
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-entry-main strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
