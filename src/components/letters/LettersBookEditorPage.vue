<template>
  <section class="pc-letters-book-editor-page">
    <article class="pc-page-section">
      <input v-model="title" class="pc-field" type="text" placeholder="分册名称" />
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">取消</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
defineProps<{ participantsLabel: string }>();
defineEmits<{ cancel: []; save: [] }>();
const title = defineModel<string>('title', { required: true });
</script>

<style scoped>
.pc-letters-book-editor-page {
  min-height: 100%;
}
</style>
