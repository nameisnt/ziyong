<template>
  <section class="pc-theater-entry-editor-page">
    <div class="pc-page-section">
      <textarea v-model="content" class="pc-area pc-saved-content-area" :placeholder="t`正文`"></textarea>

      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">

defineProps<{ title?: string }>();

const content = defineModel<string>('content', { required: true });

defineEmits<{
  cancel: [];
  save: [];
}>();
</script>

<style scoped>
.pc-theater-entry-editor-page {
  display: grid;
  min-height: 100%;
  align-content: start;
  gap: 14px;
}

.pc-mode-selector {
  max-width: 100%;
}

.pc-saved-content-area {
  min-height: 240px;
  resize: vertical;
}
</style>
