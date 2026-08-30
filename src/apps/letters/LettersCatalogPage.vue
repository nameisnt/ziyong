<template>
  <section class="pc-letters-catalog-page pc-page-stack">
    <BookShelf
      :books="shelfBooks"
      create-label="生成"
      create-subtitle="生成入口"
      variant="diary"
      @create="$emit('create')"
      @select="$emit('open-book', $event)"
    />
    <FailedDraftList
      :drafts="failedDrafts"
      :get-context="getFailedDraftContext"
      :get-title="() => '未解析书信'"
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
import BookShelf from '@/components/BookShelf.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import type { GenerationPreviewDraft } from '@/store/previewDrafts';
import type { FailedGenerationDraft } from '@/type/generation';

interface LettersShelfBook {
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
  shelfBooks: LettersShelfBook[];
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
