<template>
  <section class="pc-extras-catalog-page">
    <BookShelf
      :books="shelfBooks"
      create-label="生成"
      create-subtitle="生成入口"
      variant="extras"
      @create="$emit('create')"
      @select="$emit('open-book', $event)"
    />
    <FailedDraftList
      :drafts="failedDrafts"
      :get-context="getFailedDraftContext"
      :get-title="getFailedDraftTitle"
      @open="$emit('open-failed-draft', $event)"
      @remove="$emit('remove-failed-draft', $event)"
    />
    <PreviewDraftNotice
      :draft="chapterPreviewDraft"
      @discard="$emit('discard-chapter-preview', $event)"
      @open="$emit('open-chapter-preview')"
      @open-id="$emit('open-chapter-preview', $event)"
    />
    <PreviewDraftNotice
      :draft="summaryPreviewDraft"
      @discard="$emit('discard-summary-preview', $event)"
      @open="$emit('open-summary-preview')"
      @open-id="$emit('open-summary-preview', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import BookShelf from '@/components/BookShelf.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import type { GenerationPreviewDraft } from '@/store/previewDrafts';
import type { FailedGenerationDraft } from '@/type/generation';

interface ExtrasShelfBook {
  count: number | string;
  gradient: string;
  icon: string;
  id: string;
  subtitle: string;
  title: string;
}

defineProps<{
  chapterPreviewDraft: GenerationPreviewDraft | null;
  failedDrafts: FailedGenerationDraft[];
  getFailedDraftContext: (draft: FailedGenerationDraft) => string;
  getFailedDraftTitle: (draft: FailedGenerationDraft) => string;
  shelfBooks: ExtrasShelfBook[];
  summaryPreviewDraft: GenerationPreviewDraft | null;
}>();

defineEmits<{
  create: [];
  'discard-chapter-preview': [id?: string];
  'discard-summary-preview': [id?: string];
  'open-book': [bookId: string];
  'open-chapter-preview': [id?: string];
  'open-failed-draft': [draftId: string];
  'open-summary-preview': [id?: string];
  'remove-failed-draft': [draftId: string];
}>();
</script>

<style scoped>
.pc-extras-catalog-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}
</style>
