<template>
  <section class="pc-preset-page pc-preset-editor-page">
    <article class="pc-page-section pc-preset-editor">
      <div class="pc-compact-toolbar pc-preset-editor-head">
        <span>原条目</span>
        <h2 :title="sourcePrompt.name || sourcePrompt.id">{{ sourcePrompt.name || sourcePrompt.id }}</h2>
      </div>
      <label class="pc-field-group"
        ><span class="pc-field-label">副本名称</span
        ><input v-model="name" class="pc-field" type="text" placeholder="副本名称"
      /></label>
      <label class="pc-field-group">
        <span class="pc-field-label">消息角色</span>
        <select v-model="role" class="pc-field pc-select">
          <option value="system">系统</option>
          <option value="user">用户</option>
          <option value="assistant">AI</option>
        </select>
      </label>
      <textarea v-model="content" class="pc-area" placeholder="预设条目内容"></textarea>
      <label class="pc-preset-filter-row">
        <span>保存后立即启用副本</span>
        <span class="pc-toggle" title="保存后立即启用副本"
          ><input v-model="enabled" type="checkbox" aria-label="保存后立即启用副本" /><span aria-hidden="true"></span
        ></span>
      </label>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" :disabled="saving" @click="$emit('back')">取消</button>
        <button class="pc-primary-btn" type="button" :disabled="saving || !name.trim()" @click="$emit('save')">
          {{ saving ? '保存中' : '保存副本' }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { TavernPresetPrompt } from '../api';

defineProps<{ saving: boolean; sourcePrompt: TavernPresetPrompt }>();
const content = defineModel<string>('content', { required: true });
const enabled = defineModel<boolean>('enabled', { required: true });
const name = defineModel<string>('name', { required: true });
const role = defineModel<TavernPresetPrompt['role']>('role', { required: true });
defineEmits<{ back: []; save: [] }>();
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
  grid-template-columns: auto minmax(0, 1fr);
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
.pc-preset-filter-row {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--pc-text);
  font-size: 13px;
  font-weight: 700;
}
</style>
