<template>
  <span class="pc-content-version-badge">{{ `${count} 版` }}</span>
</template>

<script setup lang="ts">
defineProps<{
  count: number;
}>();
</script>

<style scoped>
.pc-content-version-badge {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}
</style>
