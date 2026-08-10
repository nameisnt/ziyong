<template>
  <section class="pc-bagu-detail-page">
    <article class="pc-section-card pc-detail-card">
      <span v-if="meta" class="pc-kicker">{{ meta }}</span>
      <h2>{{ title }}</h2>
      <BaguScanPanel auto-scan :content="content" :apply-handler="applyHandler" />
    </article>
  </section>
</template>

<script setup lang="ts">
import BaguScanPanel from '@/components/BaguScanPanel.vue';

defineProps<{
  applyHandler: (content: string) => boolean | Promise<boolean>;
  content: string;
  meta?: string;
  title: string;
}>();
</script>

<style scoped>
.pc-bagu-detail-page {
  min-height: 100%;
}

.pc-detail-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
}
</style>
