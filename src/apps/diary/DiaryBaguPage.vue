<template>
  <BaguDetailPage
    :apply-handler="applyHandler"
    :content="entry.content"
    :meta="entry.occurredAt"
    :title="entry.kind === 'read-reaction' ? `📖 ${entry.title}` : entry.title"
  />
</template>

<script setup lang="ts">
import BaguDetailPage from '@/components/BaguDetailPage.vue';
import type { DiaryEntry } from '@/type/diary';
import type { BaguWritebackResult } from '@/util/bagu';

defineProps<{
  applyHandler: (content: string) => BaguWritebackResult | Promise<BaguWritebackResult>;
  entry: DiaryEntry;
}>();
</script>
