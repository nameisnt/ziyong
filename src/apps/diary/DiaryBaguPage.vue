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

defineProps<{
  applyHandler: (content: string) => boolean | Promise<boolean>;
  entry: DiaryEntry;
}>();
</script>
