<template>
  <section class="pc-summary-catalog-page">
    <PreviewDraftNotice :draft="previewDraft" @discard="$emit('discard-preview')" @open="$emit('open-preview')" />

    <BookShelf
      :books="shelfBooks"
      create-label="生成总结"
      create-subtitle="选择生成方式"
      variant="diary"
      @create="$emit('create')"
      @select="$emit('open-book', $event)"
    />

    <FailedDraftList
      delete-title="删除"
      :drafts="failedDrafts"
      :get-context="getFailedDraftContext"
      :get-title="() => '未解析输出'"
      @open="$emit('open-failed-draft', $event)"
      @remove="$emit('remove-failed-draft', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import BookShelf from '@/components/BookShelf.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import type { GenerationPreviewDraft } from '@/store/previewDrafts';
import type { FailedGenerationDraft } from '@/type/generation';

interface SummaryShelfBook {
  count: number | string;
  gradient: string;
  icon: string;
  id: string;
  subtitle: string;
  title: string;
}

defineProps<{
  failedDrafts: FailedGenerationDraft[];
  getFailedDraftContext: (draft: FailedGenerationDraft) => string;
  previewDraft: GenerationPreviewDraft | null;
  shelfBooks: SummaryShelfBook[];
}>();

defineEmits<{
  create: [];
  'discard-preview': [];
  'open-book': [bookId: string];
  'open-failed-draft': [draftId: string];
  'open-preview': [];
  'remove-failed-draft': [draftId: string];
}>();
</script>

<style scoped>
.pc-summary-catalog-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}
</style>
