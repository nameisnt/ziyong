<template>
  <article v-if="draft" class="pc-section-card pc-preview-draft-notice">
    <div>
      <span class="pc-kicker">{{ label }}</span>
      <strong>{{ draft.title }}</strong>
      <p>{{ updatedText }}</p>
    </div>
    <div class="pc-preview-draft-actions">
      <button class="pc-soft-btn compact" type="button" @click="$emit('discard')">{{ discardLabel }}</button>
      <button class="pc-primary-btn compact" type="button" @click="$emit('open')">{{ openLabel }}</button>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { GenerationPreviewDraft } from '@/store/previewDrafts';

const props = withDefaults(defineProps<{
  discardLabel?: string;
  draft: GenerationPreviewDraft | null;
  label?: string;
  openLabel?: string;
}>(), {
  discardLabel: '丢弃',
  label: '未保存预览',
  openLabel: '继续预览',
});

defineEmits<{
  discard: [];
  open: [];
}>();

const updatedText = computed(() => {
  if (!props.draft?.updatedAt) return '已保存到当前聊天草稿。';
  return `更新于 ${new Date(props.draft.updatedAt).toLocaleString('zh-CN', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
  })}`;
});
</script>

<style scoped>
.pc-preview-draft-notice {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.pc-preview-draft-notice strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-preview-draft-notice p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-preview-draft-actions {
  display: flex;
  gap: 8px;
}

.pc-preview-draft-actions > button {
  min-width: 0;
  white-space: nowrap;
}
</style>
