<template>
  <section class="pc-worldbook-catalog-page" :class="{ 'pc-worldbook-selecting': selection.active.value }">
    <header class="pc-compact-toolbar pc-directory-toolbar pc-worldbook-head">
      <span class="pc-directory-count">{{ visibleBookCount }} {{ t`本世界书` }}</span>
      <button
        class="pc-icon-btn"
        type="button"
        aria-label="批量分组"
        title="批量分组"
        :disabled="refreshing || Boolean(loadingError) || !selectableIds.length"
        @click="selection.start()"
      >
        <i class="fa-solid fa-list-check"></i>
      </button>
      <button
        class="pc-icon-btn"
        type="button"
        :aria-label="t`新建世界书分组`"
        :title="t`新建世界书分组`"
        @click="$emit('create-group')"
      >
        <i class="fa-solid fa-folder-plus"></i>
      </button>
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
      <input v-model="query" type="search" :placeholder="t`搜索当前分类的世界书或分组`" />
    </label>

    <div v-if="loadingError" class="pc-section-card pc-worldbook-error">
      <strong>{{ t`无法读取世界书` }}</strong>
      <span>{{ loadingError }}</span>
    </div>
    <div v-else class="pc-worldbook-catalog">
      <section
        v-for="section in sections"
        :key="section.id"
        :data-catalog-group="section.label"
        class="pc-worldbook-group"
      >
        <header v-if="section.label" class="pc-worldbook-group-head">
          <BulkSelectionCheckbox
            v-if="selection.active.value"
            :label="`选择分组 ${section.label}`"
            :disabled="!section.books.length"
            :model-value="
              section.books.length > 0 && section.books.every(name => selection.selectedIdSet.value.has(name))
            "
            @update:model-value="section.books.forEach(name => selection.setSelected(name, $event))"
          />
          <strong>{{ section.label }}</strong>
          <span>{{ section.books.length }}</span>
        </header>
        <div v-if="section.books.length" class="pc-directory-list pc-worldbook-list">
          <article v-for="bookName in section.books" :key="bookName" class="pc-list-row pc-worldbook-row">
            <BulkSelectionCheckbox
              v-if="selection.active.value"
              :label="`选择世界书 ${bookName}`"
              :model-value="selection.selectedIdSet.value.has(bookName)"
              @update:model-value="selection.setSelected(bookName, $event)"
            />
            <button
              class="pc-worldbook-open"
              type="button"
              @click="
                selection.active.value
                  ? selection.setSelected(bookName, !selection.selectedIdSet.value.has(bookName))
                  : $emit('open-book', bookName)
              "
            >
              <span class="pc-worldbook-copy">
                <strong>{{ bookName }}</strong>
                <small>{{ bookSubtitle(bookName) }}</small>
              </span>
            </button>
            <button
              v-if="!selection.active.value"
              class="pc-icon-btn"
              type="button"
              :aria-label="t`设置世界书分组`"
              :title="t`设置世界书分组`"
              @click="openGroupPicker([bookName])"
            >
              <i class="fa-solid fa-folder"></i>
            </button>
            <label
              v-if="!selection.active.value && activeCategory === 'global'"
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
            <i v-else-if="!selection.active.value" class="fa-solid fa-chevron-right pc-worldbook-chevron"></i>
          </article>
        </div>
      </section>
      <EmptyState v-if="!sections.length" :title="query.trim() ? t`没有找到匹配的世界书` : emptyTitle" />
    </div>
    <BulkSelectionBar
      v-if="selection.active.value"
      class="pc-worldbook-bulk"
      :all-selected="selection.allSelected.value"
      :selected-count="selection.selectedIds.value.length"
      :total-count="selectableIds.length"
      action-label="移入分组"
      action-icon="fa-solid fa-folder"
      empty-label="请选择要分组的世界书"
      @toggle-all="selection.toggleAll"
      @cancel="selection.cancel"
      @apply="openGroupPicker([...selection.selectedIds.value])"
    />
    <CatalogGroupDialog
      v-if="groupRequest"
      :groups="catalogGroups.bookGroups"
      :count="groupRequest.books.length"
      :initial-group="groupRequest.initial"
      @close="groupRequest = null"
      @apply="applyGroup"
    />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import CatalogGroupDialog from '@/components/CatalogGroupDialog.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import { useWorldbookCatalogGroupStore } from '@/store/worldbookCatalogGroups';
import { usePhoneStore } from '@/store/phone';
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

const props = defineProps<{
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
const catalogGroups = useWorldbookCatalogGroupStore();
const phone = usePhoneStore();
const selectableIds = computed(() => (props.loadingError ? [] : props.sections.flatMap(section => section.books)));
const selection = useBulkSelection(selectableIds);
const groupRequest = ref<{ books: string[]; initial: string } | null>(null);
watch(activeCategory, () => {
  selection.cancel();
  groupRequest.value = null;
});
function openGroupPicker(books: string[]) {
  if (books.length) groupRequest.value = { books, initial: catalogGroups.bookGroupOf(books[0]) };
}
async function applyGroup(name: string) {
  const request = groupRequest.value;
  if (!request) return;
  try {
    catalogGroups.assignBooks(request.books, name);
    groupRequest.value = null;
    selection.cancel();
    query.value = '';
    phone.noticeSuccess(`已移动 ${request.books.length} 本世界书`);
    await nextTick();
    document
      .querySelector(`.pc-worldbook-catalog-page [data-catalog-group="${CSS.escape(name || '未分组')}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  } catch (error) {
    phone.noticeError(error instanceof Error ? error.message : '分组保存失败');
  }
}

defineEmits<{
  'create-group': [];
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
  grid-template-columns: minmax(0, 1fr) auto auto;
}
.pc-worldbook-selecting .pc-worldbook-row {
  grid-template-columns: auto minmax(0, 1fr);
}
.pc-worldbook-bulk {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: var(--pc-surface-strong);
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
