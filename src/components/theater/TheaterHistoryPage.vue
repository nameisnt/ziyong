<template>
  <section class="pc-theater-history-page">
    <div class="pc-theater-hero">
      <h2>{{ t`小剧场记录` }}</h2>
      <button class="pc-soft-btn" type="button" @click="sortDesc = !sortDesc">
        {{ sortDesc ? t`倒序` : t`正序` }}
      </button>
    </div>

    <input
      v-model="query"
      class="pc-search"
      type="text"
      :placeholder="filterOpen ? t`搜索记录或标签...` : t`搜索标题或类型...`"
    />

    <div v-if="historyTypeTabs.length" class="pc-theater-filter-control">
      <button class="pc-soft-btn" type="button" @click="filterOpen = !filterOpen">
        <i class="fa-solid fa-tags"></i>
        <span>{{ selectedTypeKeys.size ? `标签筛选（${selectedTypeKeys.size}）` : t`标签筛选` }}</span>
        <i :class="['fa-solid fa-chevron-down', { expanded: filterOpen }]"></i>
      </button>
    </div>

    <section v-if="filterOpen && historyTypeTabs.length" class="pc-section-card pc-history-tag-panel">
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
      <article v-for="entry in entries" :key="entry.id" class="pc-entry-card">
        <button class="pc-entry-main" type="button" @click="$emit('open-entry', entry.id)">
          <div class="pc-entry-head">
            <strong>{{ entry.title }}</strong>
            <ContentVersionBadge :count="Math.max(1, entry.versions.length)" />
          </div>
        </button>
      </article>
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
.pc-theater-history-page {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 14px;
}

.pc-theater-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-theater-hero h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-search {
  width: 100%;
  height: 40px;
  min-height: 40px;
  padding: 11px 12px;
  border: 0.5px solid var(--pc-border);
  border-radius: 10px;
  outline: none;
  background: var(--pc-bg);
  color: var(--pc-text);
  font-size: 14px;
  line-height: normal;
}

.pc-theater-filter-control {
  display: flex;
}

.pc-theater-filter-control .pc-soft-btn {
  width: auto;
}

.pc-theater-filter-control .fa-chevron-down {
  transition: transform 160ms ease;
}

.pc-theater-filter-control .fa-chevron-down.expanded {
  transform: rotate(180deg);
}

.pc-history-tag-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
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
  max-height: 220px;
  align-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.pc-entry-list {
  display: grid;
  gap: 10px;
}

.pc-entry-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 13px;
  border: 0.5px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.pc-entry-main {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-entry-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
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
