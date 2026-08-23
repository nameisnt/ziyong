<template>
  <section class="pc-summary-creation-page">
    <div class="pc-create-mode-list">
      <button class="pc-soft-btn" type="button" @click="$emit('extract')">
        <i class="fa-solid fa-file-import"></i>
        <span>从聊天提取总结</span>
      </button>
      <button class="pc-soft-btn" type="button" @click="$emit('create')">
        <i class="fa-solid fa-file-lines"></i>
        <span>生成单条总结</span>
      </button>
      <button class="pc-primary-btn" type="button" @click="$emit('batch')">
        <i class="fa-solid fa-layer-group"></i>
        <span>批量生成总结</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineEmits<{
  batch: [];
  create: [];
  extract: [];
}>();
</script>

<style scoped>
.pc-summary-creation-page {
  min-height: 100%;
}
</style>
