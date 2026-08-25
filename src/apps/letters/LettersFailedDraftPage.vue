<template>
  <FailedDraftRepairPage
    v-model:raw-output="rawOutput"
    :regenerate-handler="regenerateHandler"
    :reasoning="reasoning"
    :source-label="sourceLabel"
    title="修复解析失败草稿"
    @delete="$emit('delete')"
    @reparse="$emit('reparse')"
    @update:reasoning="$emit('update:reasoning', $event)"
  />
</template>

<script setup lang="ts">
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';

defineProps<{
  reasoning?: string;
  regenerateHandler: () => Promise<void> | void;
  sourceLabel: string;
}>();
defineEmits<{ delete: []; reparse: []; 'update:reasoning': [reasoning: string] }>();
const rawOutput = defineModel<string>('rawOutput', { required: true });
</script>
