<template>
  <section class="pc-letters-book-editor-page">
    <article class="pc-editor-card">
      <span class="pc-kicker">重命名分册</span>
      <h2>{{ participantsLabel }}</h2>
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

.pc-editor-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}
</style>
