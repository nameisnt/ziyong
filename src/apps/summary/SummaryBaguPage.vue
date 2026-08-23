<template>
  <BaguDetailPage :apply-handler="applyHandler" :content="content" :meta="rangeLabel" :title="title" />
</template>

<script setup lang="ts">
import BaguDetailPage from '@/components/BaguDetailPage.vue';

defineProps<{
  applyHandler: (content: string) => boolean | Promise<boolean>;
  content: string;
  rangeLabel: string;
  title: string;
}>();
</script>
