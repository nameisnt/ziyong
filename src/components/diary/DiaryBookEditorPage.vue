<template>
  <section class="pc-diary-book-editor-page">
    <article class="pc-editor-card">
      <span class="pc-kicker">重命名书架</span>
      <h2>{{ perspectiveName }}</h2>
      <input v-model="title" class="pc-field" type="text" placeholder="书架名称" />
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">取消</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
defineProps<{ perspectiveName: string }>();
defineEmits<{ cancel: []; save: [] }>();
const title = defineModel<string>('title', { required: true });
</script>

<style scoped>
.pc-diary-book-editor-page {
  min-height: 100%;
}

.pc-editor-card h2 {
  margin: 0;
  font-size: 20px;
}
</style>
