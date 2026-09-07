<template>
  <details v-if="errors.length" class="pc-regex-errors">
    <summary>{{ errors.length }} 条正则执行失败，已跳过</summary>
    <ul>
      <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
    </ul>
  </details>
</template>

<script setup lang="ts">
defineProps<{ errors: string[] }>();
</script>

<style scoped>
.pc-regex-errors {
  flex: 0 0 auto;
  min-width: 0;
  max-width: 100%;
  color: var(--pc-danger);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.pc-regex-errors summary {
  padding: 8px 0;
  cursor: pointer;
}
.pc-regex-errors ul {
  max-height: min(140px, 20vh);
  margin: 0;
  padding: 0 0 0 20px;
  overflow: auto;
  overscroll-behavior: contain;
  white-space: pre-wrap;
}
.pc-regex-errors li + li {
  margin-top: 8px;
}
</style>
