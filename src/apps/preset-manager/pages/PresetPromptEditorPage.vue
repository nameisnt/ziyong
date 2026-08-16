<template>
  <section class="pc-preset-page pc-preset-editor-page">
    <article class="pc-page-section pc-preset-editor">
      <div class="pc-compact-toolbar pc-preset-editor-head">
        <span :title="presetName">{{ presetName }}</span>
        <h2>{{ prompt.id }}</h2>
        <small>{{ roleLabel }}</small>
      </div>
      <label class="pc-field-group">
        <span class="pc-field-label">条目名称</span>
        <input v-model="nameDraft" class="pc-field" type="text" maxlength="160" placeholder="预设条目名称" />
      </label>
      <textarea
        v-if="typeof prompt.content === 'string'"
        v-model="draft"
        class="pc-area"
        placeholder="预设条目内容"
      ></textarea>
      <div v-else class="pc-section-card pc-preset-placeholder-detail">
        <strong>占位条目</strong>
        <span>这个条目用于确定酒馆内容的插入位置，没有独立正文。</span>
      </div>
      <div class="pc-form-actions">
        <button
          class="pc-icon-btn danger"
          type="button"
          :disabled="saving"
          title="删除条目"
          aria-label="删除条目"
          @click="$emit('remove')"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
        <button class="pc-soft-btn" type="button" :disabled="saving" @click="$emit('back')">返回</button>
        <button class="pc-primary-btn" type="button" :disabled="saving || !dirty" @click="$emit('save')">
          {{ saving ? '保存中' : '保存' }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { TavernPresetPrompt } from '../api';

defineProps<{
  dirty: boolean;
  presetName: string;
  prompt: TavernPresetPrompt;
  roleLabel: string;
  saving: boolean;
}>();

const draft = defineModel<string>('draft', { required: true });
const nameDraft = defineModel<string>('nameDraft', { required: true });
defineEmits<{ back: []; remove: []; save: [] }>();
</script>

<style scoped>
.pc-preset-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 14px;
}
.pc-preset-editor {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}
.pc-preset-editor-head {
  display: grid;
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1fr) auto;
  align-items: center;
  min-width: 0;
  gap: 8px;
}
.pc-preset-editor-head h2 {
  overflow: hidden;
  margin: 0;
  color: var(--pc-text);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-preset-editor-head > span {
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-preset-editor-head small {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}
.pc-preset-editor .pc-area {
  min-height: 0;
  flex: 1;
  resize: none;
}
.pc-preset-editor .pc-form-actions {
  padding-top: 8px;
  flex-wrap: nowrap;
}
.pc-preset-editor .pc-form-actions > button {
  min-width: 0;
  flex: 1;
}
.pc-preset-editor .pc-form-actions > .pc-icon-btn {
  flex: 0 0 44px;
}
.pc-preset-placeholder-detail {
  display: grid;
  gap: 6px;
}
.pc-preset-placeholder-detail span {
  color: var(--pc-muted);
  font-size: 13px;
  line-height: 1.55;
}
</style>
