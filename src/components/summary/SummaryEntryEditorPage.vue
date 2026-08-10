<template>
  <section class="pc-summary-entry-editor-page">
    <div class="pc-editor-card">
      <span class="pc-kicker">编辑条目</span>
      <h2>{{ editingTitle || '调整当前内容' }}</h2>
      <input v-model="title" class="pc-field" type="text" placeholder="标题" />
      <input v-model="rangeLabel" class="pc-field" type="text" placeholder="范围，例如 第 1-20 楼" />
      <div v-if="showOrder" class="pc-field-group">
        <label class="pc-field-label">目录顺序</label>
        <input v-model="directoryOrder" class="pc-field" type="number" min="0" step="1" />
      </div>
      <textarea
        v-model="content"
        class="pc-area pc-saved-content-area pc-summary-entry-content"
        placeholder="正文"
      ></textarea>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">取消</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  editingTitle: string;
  showOrder: boolean;
}>();

defineEmits<{
  cancel: [];
  save: [];
}>();

const content = defineModel<string>('content', { required: true });
const directoryOrder = defineModel<number>('directoryOrder', { required: true });
const rangeLabel = defineModel<string>('rangeLabel', { required: true });
const title = defineModel<string>('title', { required: true });
</script>

<style scoped>
.pc-summary-entry-editor-page {
  min-height: 100%;
}

.pc-editor-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-summary-entry-content {
  min-height: 220px;
  resize: vertical;
}
</style>
