<template>
  <section class="pc-forum-catalog-page">
    <div class="pc-forum-actions">
      <button class="pc-soft-btn" type="button" @click="$emit('generate-thread')">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>{{ t`生成帖子` }}</span>
      </button>
      <button class="pc-primary-btn" type="button" @click="$emit('create-board')">
        <i class="fa-solid fa-plus"></i>
        <span>{{ t`新建板块` }}</span>
      </button>
    </div>

    <EmptyState v-if="!boards.length" :title="t`还没有论坛板块`" />
    <div v-else class="pc-board-list">
      <article v-for="board in boards" :key="board.id" class="pc-board-card">
        <button class="pc-board-main" type="button" @click="$emit('open-board', board.id)">
          <strong>{{ board.name }}</strong>
          <p>{{ formatBoardMeta(board.threads.length) }}</p>
        </button>
        <div class="pc-board-actions">
          <button class="pc-icon-btn" type="button" :title="t`编辑板块`" @click="$emit('edit-board', board.id)">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :title="t`删除板块`"
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
    <PreviewDraftNotice :draft="previewDraft" @discard="$emit('discard-preview')" @open="$emit('open-preview')" />
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import type { GenerationPreviewDraft } from '@/store/previewDrafts';
import type { FailedGenerationDraft } from '@/type/generation';
import type { ForumBoard } from '@/type/forum';

defineProps<{
  boards: ForumBoard[];
  failedDrafts: FailedGenerationDraft[];
  formatBoardMeta: (threadCount: number) => string;
  getFailedDraftContext: (draft: FailedGenerationDraft) => string;
  getFailedDraftTitle: (draft: FailedGenerationDraft) => string;
  previewDraft: GenerationPreviewDraft | null;
}>();

defineEmits<{
  'create-board': [];
  'discard-preview': [];
  'edit-board': [boardId: string];
  'generate-thread': [];
  'open-board': [boardId: string];
  'open-failed-draft': [draftId: string];
  'open-preview': [];
  'remove-board': [boardId: string];
  'remove-failed-draft': [draftId: string];
}>();
</script>

<style scoped>
.pc-forum-catalog-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-forum-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-board-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-board-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-board-main {
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

.pc-icon-btn.danger {
  color: var(--pc-danger);
}
</style>
