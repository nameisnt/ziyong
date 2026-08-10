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
      label="未保存章节预览"
      @discard="$emit('discard-chapter-preview')"
      @open="$emit('open-chapter-preview')"
    />
    <PreviewDraftNotice
      :draft="summaryPreviewDraft"
      label="未保存总结预览"
      @discard="$emit('discard-summary-preview')"
      @open="$emit('open-summary-preview')"
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
  'discard-chapter-preview': [];
  'discard-summary-preview': [];
  'open-book': [bookId: string];
  'open-chapter-preview': [];
  'open-failed-draft': [draftId: string];
  'open-summary-preview': [];
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
