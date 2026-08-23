<template>
  <FailedDraftRepairPage
    v-model:raw-output="rawOutput"
    raw-label="原始输出"
    :reparse-disabled="!books.length"
    :source-label="draft.source.label"
    title="修复解析失败草稿"
    @delete="$emit('delete')"
    @reparse="$emit('reparse')"
  >
    <template #before-editor>
      <div class="pc-field-group">
        <label class="pc-field-label">保存到总结集</label>
        <SearchableCombobox
          input-label="搜索总结集"
          :model-value="targetBookId"
          :options="bookOptions"
          placeholder="选择总结集"
          toggle-title="展开总结集"
          @update:model-value="targetBookId = $event"
        />
      </div>

      <EmptyState v-if="!books.length" title="还没有总结集">
        <p>先建一个总结集，修好的内容才能保存进去。</p>
      </EmptyState>
    </template>
  </FailedDraftRepairPage>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { FailedGenerationDraft } from '@/type/generation';
import type { SummaryBook } from '@/type/summary';

const props = defineProps<{
  books: SummaryBook[];
  draft: FailedGenerationDraft;
}>();

defineEmits<{
  delete: [];
  reparse: [];
}>();

const rawOutput = defineModel<string>('rawOutput', { required: true });
const targetBookId = defineModel<string>('targetBookId', { required: true });

const bookOptions = computed(() => props.books.map(book => ({ label: book.title, value: book.id })));
</script>
