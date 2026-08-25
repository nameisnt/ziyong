<template>
  <section class="pc-forum-catalog-page">
    <div class="pc-compact-toolbar pc-directory-toolbar">
      <span class="pc-directory-count">{{ boards.length }} 个板块</span>
      <div class="pc-directory-actions pc-forum-actions">
        <button
          class="pc-icon-btn"
          type="button"
          :class="{ active: bulkMode }"
          :disabled="!boards.length"
          :title="t`批量删除`"
          :aria-label="t`批量删除`"
          @click="bulkMode ? cancelBulkSelection() : startBulkSelection()"
        >
          <i class="fa-solid fa-list-check"></i>
        </button>
        <button
          class="pc-icon-btn"
          type="button"
          :title="t`生成帖子`"
          :aria-label="t`生成帖子`"
          @click="$emit('generate-thread')"
        >
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </button>
        <button
          class="pc-icon-btn primary"
          type="button"
          :title="t`新建板块`"
          :aria-label="t`新建板块`"
          @click="$emit('create-board')"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>

    <BulkSelectionBar
      v-if="bulkMode"
      :all-selected="allBulkSelected"
      :selected-count="bulkSelectedIds.length"
      :total-count="boards.length"
      @cancel="cancelBulkSelection"
      @remove="removeSelectedBoards"
      @toggle-all="toggleAllBulkSelection"
    />

    <EmptyState v-if="!boards.length" :title="t`还没有论坛板块`" />
    <div v-else class="pc-directory-list pc-board-list">
      <article v-for="board in boards" :key="board.id" class="pc-list-row pc-board-row" :class="{ bulk: bulkMode }">
        <BulkSelectionCheckbox
          v-if="bulkMode"
          :model-value="bulkSelectedIdSet.has(board.id)"
          :label="`选择 ${board.name}`"
          @update:model-value="setBulkSelected(board.id, $event)"
        />
        <button
          class="pc-board-main"
          type="button"
          @click="bulkMode ? setBulkSelected(board.id, !bulkSelectedIdSet.has(board.id)) : $emit('open-board', board.id)"
        >
          <strong>{{ board.name }}</strong>
          <p>{{ formatBoardMeta(board.threads.length) }}</p>
        </button>
        <div v-if="!bulkMode" class="pc-board-actions">
          <button
            class="pc-icon-btn"
            type="button"
            :title="t`编辑板块`"
            :aria-label="t`编辑板块`"
            @click="$emit('edit-board', board.id)"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :title="t`删除板块`"
            :aria-label="t`删除板块`"
            @click="$emit('remove-board', board.id)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </article>
    </div>

    <FailedDraftList
      :drafts="failedDrafts"
      :get-context="getFailedDraftContext"
      :get-title="getFailedDraftTitle"
      @open="$emit('open-failed-draft', $event)"
      @remove="$emit('remove-failed-draft', $event)"
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
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import { useBulkSelection } from '@/composables/useBulkSelection';
import type { GenerationPreviewDraft } from '@/store/previewDrafts';
import type { FailedGenerationDraft } from '@/type/generation';
import type { ForumBoard } from '@/type/forum';

const props = defineProps<{
  boards: ForumBoard[];
  failedDrafts: FailedGenerationDraft[];
  formatBoardMeta: (threadCount: number) => string;
  getFailedDraftContext: (draft: FailedGenerationDraft) => string;
  getFailedDraftTitle: (draft: FailedGenerationDraft) => string;
  previewDraft: GenerationPreviewDraft | null;
}>();

const emit = defineEmits<{
  'create-board': [];
  'discard-preview': [id?: string];
  'edit-board': [boardId: string];
  'generate-thread': [];
  'open-board': [boardId: string];
  'open-failed-draft': [draftId: string];
  'open-preview': [id?: string];
  'remove-board': [boardId: string];
  'remove-boards': [boardIds: string[]];
  'remove-failed-draft': [draftId: string];
}>();

const {
  active: bulkMode,
  allSelected: allBulkSelected,
  cancel: cancelBulkSelection,
  selectedIds: bulkSelectedIds,
  selectedIdSet: bulkSelectedIdSet,
  setSelected: setBulkSelected,
  start: startBulkSelection,
  toggleAll: toggleAllBulkSelection,
} = useBulkSelection(() => props.boards.map(board => board.id));

function removeSelectedBoards() {
  if (!bulkSelectedIds.value.length) return;
  emit('remove-boards', [...bulkSelectedIds.value]);
  cancelBulkSelection();
}
</script>

<style scoped>
.pc-forum-catalog-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-board-main {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-board-main strong {
  display: block;
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-board-main p {
  margin: 6px 0 0;
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-board-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-board-row.bulk {
  grid-template-columns: auto minmax(0, 1fr);
}
</style>
