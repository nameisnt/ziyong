<template>
  <section class="pc-extras-page">
    <div class="pc-page-section pc-extras-editor-section">
      <input v-model="title" class="pc-field" type="text" :placeholder="t`章节标题`" />
      <textarea v-model="content" class="pc-area pc-saved-content-area" :placeholder="t`章节正文`"></textarea>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="emit('cancel')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="emit('save')">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ heading: string }>();

const title = defineModel<string>('title', { required: true });
const content = defineModel<string>('content', { required: true });
const emit = defineEmits<{ cancel: []; save: [] }>();
</script>

<style scoped>
.pc-extras-page {
  min-height: 100%;
}

.pc-extras-editor-section .pc-area {
  min-height: 220px;
  resize: vertical;
}

.pc-extras-editor-section > .pc-form-actions {
  margin-top: 18px;
  justify-content: flex-end;
}
</style>
