<template>
  <section class="pc-letters-entry-editor-page">
    <article class="pc-page-section">
      <div v-if="editingTitle" class="pc-compact-toolbar pc-letters-edit-context">
        <strong>{{ directionLabel }}</strong>
        <small>{{ formatLabel }} · {{ bookTitleLabel || '当前分册' }}</small>
      </div>
      <template v-else>
        <input v-model="senderName" class="pc-field" type="text" placeholder="发信人" />
        <input v-model="receiverName" class="pc-field" type="text" placeholder="收信人" />
        <input v-if="showBookField" v-model="bookTitle" class="pc-field" type="text" placeholder="分册名称（可留空）" />
      </template>

      <input v-model="title" class="pc-field" type="text" placeholder="标题" />
      <div class="pc-segment pc-letters-format-segment">
        <button
          v-for="option in formatOptions"
          :key="option.value"
          :class="['pc-segment-btn', { active: format === option.value }]"
          type="button"
          @click="format = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <textarea v-model="content" class="pc-area pc-letters-entry-content" placeholder="正文"></textarea>

      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="$emit('cancel')">取消</button>
        <button class="pc-primary-btn" type="button" @click="$emit('save')">保存</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { LetterFormat } from '@/type/letter';

defineProps<{
  bookTitleLabel: string;
  directionLabel: string;
  editingTitle: string;
  formatLabel: string;
  formatOptions: Array<{ label: string; value: LetterFormat }>;
  showBookField: boolean;
}>();

defineEmits<{ cancel: []; save: [] }>();

const bookTitle = defineModel<string>('bookTitle', { required: true });
const content = defineModel<string>('content', { required: true });
const format = defineModel<LetterFormat>('format', { required: true });
const receiverName = defineModel<string>('receiverName', { required: true });
const senderName = defineModel<string>('senderName', { required: true });
const title = defineModel<string>('title', { required: true });
</script>

<style scoped>
.pc-letters-entry-editor-page {
  min-height: 100%;
}

.pc-letters-edit-context {
  align-items: flex-start;
}

.pc-letters-edit-context small {
  color: var(--pc-muted);
  font-size: 13px;
  text-align: right;
}

.pc-letters-format-segment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.pc-letters-entry-content {
  min-height: 260px;
}
</style>
