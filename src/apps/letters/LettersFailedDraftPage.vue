<template>
  <FailedDraftRepairPage
    v-model:raw-output="rawOutput"
    :source-label="sourceLabel"
    title="修复解析失败草稿"
    @delete="$emit('delete')"
    @reparse="$emit('reparse')"
  />
</template>

<script setup lang="ts">
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';

defineProps<{ sourceLabel: string }>();
defineEmits<{ delete: []; reparse: [] }>();
const rawOutput = defineModel<string>('rawOutput', { required: true });
</script>
