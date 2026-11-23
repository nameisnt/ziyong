<template>
  <FailedDraftRepairPage
    v-model:raw-output="rawOutput"
    :delete-label="deleteLabel"
    :raw-label="rawLabel"
    :regenerate-handler="regenerateHandler"
    :reasoning="reasoning"
    :reparse-disabled="reparseDisabled"
    :source-label="sourceLabel"
    :title="title"
    :warnings="warnings"
    @delete="$emit('delete')"
    @reparse="$emit('reparse')"
    @update:reasoning="$emit('update:reasoning', $event)"
  >
    <template #before-editor>
      <slot name="before-editor"></slot>
    </template>
  </FailedDraftRepairPage>
</template>

<script setup lang="ts">
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';

withDefaults(
  defineProps<{
    deleteLabel?: string;
    rawLabel?: string;
    reasoning?: string;
    regenerateHandler?: () => Promise<void> | void;
    reparseDisabled?: boolean;
    sourceLabel: string;
    title: string;
    warnings?: string[];
  }>(),
  {
    deleteLabel: '删除草稿',
    rawLabel: '原始输出',
    reasoning: '',
    regenerateHandler: undefined,
    reparseDisabled: false,
    warnings: () => [],
  },
);

defineEmits<{ delete: []; reparse: []; 'update:reasoning': [reasoning: string] }>();
const rawOutput = defineModel<string>('rawOutput', { required: true });
</script>
