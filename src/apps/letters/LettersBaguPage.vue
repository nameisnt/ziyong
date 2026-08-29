<template>
  <BaguDetailPage :apply-handler="applyHandler" :content="entry.content" :title="entry.title" />
</template>

<script setup lang="ts">
import BaguDetailPage from '@/components/BaguDetailPage.vue';
import type { LetterEntry } from '@/type/letter';
import type { BaguWritebackResult } from '@/util/bagu';

defineProps<{
  applyHandler: (content: string) => BaguWritebackResult | Promise<BaguWritebackResult>;
  entry: LetterEntry;
}>();
</script>
