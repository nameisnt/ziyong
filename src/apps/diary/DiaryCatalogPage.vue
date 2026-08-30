<template>
  <section class="pc-diary-catalog-page pc-page-stack">
    <PreviewDraftNotice
      :draft="previewDraft"
      @discard="$emit('discard-preview', $event)"
      @open="$emit('open-preview')"
      @open-id="$emit('open-preview', $event)"
    />
    <BookShelf
      :books="shelfBooks"
      create-label="生成日记"
      create-subtitle="选择生成方式"
      variant="diary"
      @create="$emit('create')"
      @select="$emit('open-book', $event)"
    />
    <FailedDraftList
      :drafts="failedDrafts"
      :get-context="getFailedDraftContext"
      :get-title="() => '未解析日记'"
      :show-header="false"
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

interface DiaryShelfBook {
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
  shelfBooks: DiaryShelfBook[];
}>();

defineEmits<{
  create: [];
  'discard-preview': [id?: string];
  'open-book': [bookId: string];
  'open-failed-draft': [draftId: string];
  'open-preview': [id?: string];
  'remove-failed-draft': [draftId: string];
}>();
</script>
