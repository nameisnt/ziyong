<template>
  <BaguDetailPage :apply-handler="applyHandler" :content="entry.content" :title="entry.title" />
</template>

<script setup lang="ts">
import BaguDetailPage from '@/components/BaguDetailPage.vue';
import type { LetterEntry } from '@/type/letter';

defineProps<{
  applyHandler: (content: string) => boolean | Promise<boolean>;
  entry: LetterEntry;
}>();
</script>
