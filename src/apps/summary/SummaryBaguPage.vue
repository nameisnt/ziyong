<template>
  <BaguDetailPage :apply-handler="applyHandler" :content="content" :meta="rangeLabel" :title="title" />
</template>

<script setup lang="ts">
import BaguDetailPage from '@/components/BaguDetailPage.vue';
import type { BaguWritebackResult } from '@/util/bagu';

defineProps<{
  applyHandler: (content: string) => BaguWritebackResult | Promise<BaguWritebackResult>;
  content: string;
  rangeLabel: string;
  title: string;
}>();
</script>
