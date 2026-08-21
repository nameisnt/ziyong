<template>
  <section class="pc-profiles-page">
    <section class="pc-page-section pc-profiles-toolbar">
      <div class="pc-profile-context-row">
        <div class="pc-profile-table-switcher">
          <i :class="['fa-solid', kindIcon(selectedTable?.kind || 'note')]"></i>
          <SearchableCombobox
            v-model="tableId"
            input-label="当前资料表"
            :menu-max-height="260"
            :options="tableOptions"
            placeholder="选择或搜索资料表"
            toggle-title="展开资料表"
          />
        </div>
        <button
          class="pc-icon-btn"
          type="button"
          title="管理资料表"
          aria-label="管理资料表"
          @click="$emit('open-tables')"
        >
          <i class="fa-solid fa-gear"></i>
        </button>
      </div>
      <label class="pc-search-field"
        ><i class="fa-solid fa-magnifying-glass"></i><input v-model="query" type="search" placeholder="搜索当前表"
      /></label>
      <div v-if="tableEntries.length" class="pc-profiles-toolbar-bottom">
        <span class="pc-segment pc-profile-view-toggle" role="group" aria-label="资料显示方式">
          <button
            :class="['pc-segment-btn', { active: viewMode === 'list' }]"
            type="button"
            title="列表显示"
            aria-label="列表显示"
            @click="viewMode = 'list'"
          >
            <i class="fa-solid fa-list"></i>
          </button>
          <button
            :class="['pc-segment-btn', { active: viewMode === 'table' }]"
            type="button"
            title="表格显示"
            aria-label="表格显示"
            @click="viewMode = 'table'"
          >
            <i class="fa-solid fa-table"></i>
          </button>
        </span>
        <div class="pc-profile-primary-actions">
          <ActionMenu label="新增" icon="fa-solid fa-plus">
            <button type="button" @click="$emit('create')"><i class="fa-solid fa-pen"></i>手动新增</button>
            <ItemTransferImportAction
              v-if="selectedTable"
              app-id="profiles"
              :params="{ tableId: selectedTable.id }"
              label="导入单条资料"
            />
          </ActionMenu>
          <button
            class="pc-icon-btn primary"
            type="button"
            title="AI 生成资料"
            aria-label="AI 生成资料"
            @click="$emit('generate')"
          >
            <i class="fa-solid fa-wand-magic-sparkles"></i>
          </button>
        </div>
      </div>
    </section>

    <section
      v-if="selectedTable && viewMode === 'list'"
      class="pc-directory-list pc-profile-list"
      :aria-label="selectedTable.name"
    >
      <button
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="pc-list-row pc-profile-list-row"
        type="button"
        @click="$emit('open-entry', entry.id)"
      >
        <i :class="['fa-solid', 'pc-profile-list-icon', kindIcon(entry.kind)]"></i>
        <span class="pc-profile-list-main"
          ><strong>{{ entry.title }}</strong
          ><small>{{ entryPreview(entry) || '未填写资料' }}</small
          ><span v-if="entry.tags.length" class="pc-profile-list-tags"
            ><em v-for="tag in entry.tags.slice(0, 3)" :key="tag">{{ tag }}</em></span
          ></span
        >
        <i class="fa-solid fa-chevron-right pc-profile-list-arrow"></i>
      </button>
    </section>

    <section v-else-if="selectedTable" class="pc-profile-table-wrap" :aria-label="selectedTable.name">
      <div
        class="pc-profile-table"
        :style="{ '--pc-profile-grid-template': gridTemplate, '--pc-profile-table-min-width': `${tableMinWidth}px` }"
      >
        <div class="pc-profile-table-header" role="row">
          <span v-for="column in columns" :key="column.id" role="columnheader">{{ column.label }}</span>
        </div>
        <button
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="pc-profile-table-row"
          type="button"
          @click="$emit('open-entry', entry.id)"
        >
          <span
            v-for="column in columns"
            :key="column.id"
            :class="['pc-profile-table-cell', { 'is-status': isStatusColumn(column) }]"
            :title="entryField(entry, column.id)"
          >
            <template v-if="column.id === 'tags' && entryField(entry, column.id)"
              ><em v-for="tag in entry.tags.slice(0, 2)" :key="tag">{{ tag }}</em></template
            >
            <template v-else
              ><i v-if="isStatusColumn(column) && entryField(entry, column.id)" class="pc-profile-status-dot"></i
              >{{ entryField(entry, column.id) || '未填写' }}</template
            >
          </span>
          <i v-if="entry.favorite" class="fa-solid fa-heart pc-profile-table-favorite"></i>
        </button>
      </div>
    </section>

    <EmptyState
      v-if="!filteredEntries.length"
      class="pc-profile-empty"
      :title="tableEntries.length ? '没有匹配的资料' : '当前表还没有条目'"
    >
      <div v-if="!tableEntries.length" class="pc-profile-empty-actions">
        <ActionMenu label="新增" icon="fa-solid fa-plus">
          <button type="button" @click="$emit('create')"><i class="fa-solid fa-pen"></i>手动新增</button>
          <ItemTransferImportAction
            v-if="selectedTable"
            app-id="profiles"
            :params="{ tableId: selectedTable.id }"
            label="导入单条资料"
          />
        </ActionMenu>
        <button class="pc-primary-btn compact" type="button" @click="$emit('generate')">
          <i class="fa-solid fa-wand-magic-sparkles"></i><span>AI 生成</span>
        </button>
      </div>
      <button v-else class="pc-soft-btn compact pc-profile-clear-search" type="button" @click="query = ''">
        清除搜索
      </button>
    </EmptyState>
    <FailedDraftList
      :drafts="failedDrafts"
      :get-context="failedDraftContext"
      :get-title="failedDraftTitle"
      @open="$emit('open-failed', $event)"
      @remove="$emit('remove-failed', $event)"
    />
    <PreviewDraftNotice
      :draft="previewDraft"
      @discard="$emit('discard-preview', $event)"
      @open="$emit('open-preview')"
      @open-id="$emit('open-preview', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import ActionMenu from '@/components/ActionMenu.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import ItemTransferImportAction from '@/components/ItemTransferImportAction.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { GenerationPreviewDraft } from '@/store/previewDrafts';
import type { FailedGenerationDraft } from '@/type/generation';
import type { ProfileEntry, ProfileKind, ProfileTable, ProfileTableColumn } from '../store';

defineProps<{
  columns: ProfileTableColumn[];
  entryField: (entry: ProfileEntry, columnId: string) => string;
  entryPreview: (entry: ProfileEntry) => string;
  failedDraftContext: (draft: FailedGenerationDraft) => string;
  failedDrafts: FailedGenerationDraft[];
  failedDraftTitle: (draft: FailedGenerationDraft) => string;
  filteredEntries: ProfileEntry[];
  gridTemplate: string;
  isStatusColumn: (column: ProfileTableColumn) => boolean;
  kindIcon: (kind: ProfileKind) => string;
  previewDraft: GenerationPreviewDraft | null;
  selectedTable: ProfileTable | null;
  tableEntries: ProfileEntry[];
  tableMinWidth: number;
  tableOptions: Array<{ group: string; label: string; value: string }>;
}>();

const query = defineModel<string>('query', { required: true });
const tableId = defineModel<string>('tableId', { required: true });
const viewMode = defineModel<'list' | 'table'>('viewMode', { required: true });
defineEmits<{
  create: [];
  'discard-preview': [id?: string];
  generate: [];
  'open-entry': [entryId: string];
  'open-failed': [draftId: string];
  'open-preview': [id?: string];
  'open-tables': [];
  'remove-failed': [draftId: string];
}>();
</script>

<style scoped>
.pc-profiles-page {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 14px;
}
.pc-profile-table-wrap {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}
.pc-profiles-toolbar {
  display: grid;
  gap: 10px;
  padding-top: 0;
}
.pc-profile-context-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.pc-profile-table-switcher {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.pc-profile-table-switcher > i {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface) 86%);
  color: var(--pc-theme-accent);
}
.pc-profile-table-switcher :deep(.pc-combobox) {
  min-width: 0;
}
.pc-profiles-toolbar > .pc-search-field {
  width: 100%;
}
.pc-profiles-toolbar-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pc-profile-view-toggle {
  flex: 0 0 auto;
}
/* ui-reuse-allow: D-UI-TABS-008 fixed 40px icon-only toggle requires zero inline padding; global height and font stay authoritative. */
.pc-profile-view-toggle .pc-segment-btn {
  width: 40px;
  min-width: 40px;
  padding-inline: 0;
}
.pc-profile-primary-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.pc-profile-table-wrap {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
}
.pc-profile-list {
  overflow: hidden;
}
.pc-profile-list-row {
  grid-template-columns: 36px minmax(0, 1fr) auto;
}
.pc-profile-list-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface) 88%);
  color: var(--pc-theme-accent);
}
.pc-profile-list-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.pc-profile-list-main strong,
.pc-profile-list-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-profile-list-main small,
.pc-profile-list-arrow {
  color: var(--pc-muted);
}
.pc-profile-list-tags {
  display: flex;
  min-width: 0;
  gap: 4px;
  overflow: hidden;
}
.pc-profile-list-main em,
.pc-profile-table-cell em {
  display: inline-block;
  width: max-content;
  max-width: 96px;
  overflow: hidden;
  border-radius: 999px;
  padding: 0 7px;
  background: color-mix(in srgb, var(--pc-theme-accent) 13%, var(--pc-surface) 87%);
  color: var(--pc-theme-accent);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-profile-table {
  display: grid;
  width: max(100%, var(--pc-profile-table-min-width, 0px));
  min-width: var(--pc-profile-table-min-width, 0px);
}
.pc-profile-table-header,
.pc-profile-table-row {
  display: grid;
  grid-template-columns: var(--pc-profile-grid-template, minmax(0, 1fr));
  min-width: 0;
}
.pc-profile-table-header {
  position: sticky;
  z-index: 1;
  top: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface-strong) 88%, var(--pc-theme-accent) 12%);
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}
.pc-profile-table-header span,
.pc-profile-table-row span {
  min-width: 0;
  overflow: hidden;
  padding: 12px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-profile-table-row {
  position: relative;
  border: 0;
  border-bottom: 1px solid var(--pc-border);
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  font: inherit;
}
.pc-profile-table-row span:first-child {
  font-weight: 800;
}
.pc-profile-table-favorite {
  position: absolute;
  top: 50%;
  right: 8px;
  color: var(--pc-danger);
  transform: translateY(-50%);
}
.pc-profile-table-cell.is-status {
  color: var(--pc-muted);
}
.pc-profile-status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 5px 1px 0;
  border-radius: 50%;
  background: var(--pc-theme-accent);
}
.pc-profile-empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
.pc-profile-clear-search {
  margin-top: 12px;
}
</style>
