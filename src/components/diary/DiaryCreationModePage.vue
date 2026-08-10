<template>
  <section class="pc-create-mode-list">
    <button class="pc-soft-btn" type="button" @click="$emit('single')">
      <i class="fa-solid fa-file-lines"></i>
      <span>生成单篇日记</span>
    </button>
    <button class="pc-primary-btn" type="button" @click="$emit('batch')">
      <i class="fa-solid fa-layer-group"></i>
      <span>批量生成日记</span>
    </button>
  </section>
</template>

<script setup lang="ts">
defineEmits<{
  batch: [];
  single: [];
}>();
</script>
