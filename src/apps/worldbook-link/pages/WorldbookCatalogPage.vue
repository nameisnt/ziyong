<template>
  <section class="pc-worldbook-catalog-page">
    <header class="pc-compact-toolbar pc-directory-toolbar pc-worldbook-head">
      <span class="pc-directory-count">{{ visibleBookCount }} {{ t`本世界书` }}</span>
      <button
        class="pc-icon-btn pc-worldbook-refresh"
        type="button"
        :aria-label="t`刷新`"
        :title="t`刷新`"
        :disabled="refreshing"
        @click="$emit('refresh')"
      >
        <i class="fa-solid fa-rotate" :class="{ 'fa-spin': refreshing }"></i>
      </button>
    </header>

    <nav class="pc-segment pc-worldbook-tabs" aria-label="世界书分类">
      <button
        v-for="category in categories"
        :key="category.id"
        class="pc-segment-btn"
        :class="{ active: activeCategory === category.id }"
        type="button"
        @click="activeCategory = category.id"
      >
        {{ category.label }}
        <small>{{ groups[category.id].length }}</small>
      </button>
    </nav>

    <label class="pc-search-field pc-worldbook-search">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" type="search" :placeholder="t`搜索当前分类的世界书`" />
    </label>

    <div v-if="loadingError" class="pc-section-card pc-worldbook-error">
      <strong>{{ t`无法读取世界书` }}</strong>
      <span>{{ loadingError }}</span>
    </div>
    <div v-else class="pc-worldbook-catalog">
      <section v-for="section in sections" :key="section.id" class="pc-worldbook-group">
        <header v-if="section.label" class="pc-worldbook-group-head">
          <strong>{{ section.label }}</strong>
          <span>{{ section.books.length }}</span>
        </header>
        <div v-if="section.books.length" class="pc-directory-list pc-worldbook-list">
          <article v-for="bookName in section.books" :key="bookName" class="pc-list-row pc-worldbook-row">
            <button class="pc-worldbook-open" type="button" @click="$emit('open-book', bookName)">
              <span class="pc-worldbook-copy">
                <strong>{{ bookName }}</strong>
                <small>{{ bookSubtitle(bookName) }}</small>
              </span>
            </button>
            <label
              v-if="activeCategory === 'global'"
              class="pc-toggle pc-worldbook-toggle"
              :title="isGlobalEnabled(bookName) ? t`停用全局世界书` : t`启用全局世界书`"
            >
              <input
                type="checkbox"
                :aria-label="isGlobalEnabled(bookName) ? t`停用全局世界书` : t`启用全局世界书`"
                :checked="isGlobalEnabled(bookName)"
                :disabled="globalBusyBooks.has(bookName)"
                @change="$emit('toggle-global', bookName, $event)"
              />
              <span aria-hidden="true"></span>
            </label>
            <i v-else class="fa-solid fa-chevron-right pc-worldbook-chevron"></i>
          </article>
        </div>
      </section>
      <EmptyState v-if="!visibleBookCount" :title="query.trim() ? t`没有找到匹配的世界书` : emptyTitle" />
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { CurrentWorldbookGroups, WorldbookCategoryId } from '../api';

interface WorldbookCategory {
  id: WorldbookCategoryId;
  label: string;
}

interface WorldbookSection {
  books: string[];
  id: string;
  label: string;
}

defineProps<{
  bookSubtitle: (bookName: string) => string;
  categories: WorldbookCategory[];
  emptyTitle: string;
  globalBusyBooks: Set<string>;
  groups: CurrentWorldbookGroups;
  isGlobalEnabled: (bookName: string) => boolean;
  loadingError: string;
  refreshing: boolean;
  sections: WorldbookSection[];
  visibleBookCount: number;
}>();

const activeCategory = defineModel<WorldbookCategoryId>('activeCategory', { required: true });
const query = defineModel<string>('query', { required: true });

defineEmits<{
  'open-book': [bookName: string];
  refresh: [];
  'toggle-global': [bookName: string, event: Event];
}>();
</script>

<style scoped>
.pc-worldbook-catalog-page,
.pc-worldbook-catalog,
.pc-worldbook-group {
  display: grid;
  align-content: start;
  gap: 10px;
}

.pc-worldbook-catalog-page {
  min-height: 100%;
  gap: 12px;
}

.pc-worldbook-refresh {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
}

.pc-worldbook-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  width: 100%;
}

/* ui-reuse-allow: D-UI-TABS-008 five equal columns include labels and counts, so inline padding stays compact; global height and font stay authoritative. */
.pc-worldbook-tabs .pc-segment-btn {
  min-width: 0;
  padding-inline: 6px;
}

.pc-worldbook-tabs small {
  font-size: 10px;
  opacity: 0.68;
}

.pc-worldbook-catalog,
.pc-worldbook-group {
  gap: 8px;
}

.pc-worldbook-group + .pc-worldbook-group {
  margin-top: 4px;
}

.pc-worldbook-group-head {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.pc-worldbook-group-head strong {
  font-size: 15px;
}

.pc-worldbook-group-head span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-worldbook-row {
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-worldbook-open {
  display: flex;
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.pc-worldbook-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pc-worldbook-copy strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-worldbook-copy small,
.pc-worldbook-chevron,
.pc-worldbook-error span {
  color: var(--pc-muted);
}

.pc-worldbook-error {
  color: var(--pc-danger);
}
</style>
