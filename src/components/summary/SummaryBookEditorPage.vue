<template>
  <section class="pc-summary-book-editor-page">
    <div class="pc-page-section">
      <input v-model="title" class="pc-field" type="text" placeholder="例如 第一卷总结" />
      <div :class="['pc-form-actions', { 'pc-summary-create-actions': creating }]">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">取消</button>
        <button v-if="creating" class="pc-soft-btn" type="button" @click="$emit('create-empty')">先建空白</button>
        <button class="pc-primary-btn" type="button" @click="$emit('submit')">
          {{ creating ? '开始生成' : '保存' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ creating: boolean }>();

defineEmits<{
  cancel: [];
  'create-empty': [];
  submit: [];
}>();

const title = defineModel<string>('title', { required: true });
</script>

<style scoped>
.pc-summary-book-editor-page {
  min-height: 100%;
}

.pc-summary-create-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-summary-create-actions > button {
  width: 100%;
  min-width: 0;
  padding-inline: 6px;
  white-space: nowrap;
}
</style>
