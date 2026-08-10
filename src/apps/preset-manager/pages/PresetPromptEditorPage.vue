<template>
  <section class="pc-preset-page pc-preset-editor-page">
    <article class="pc-editor-card pc-preset-editor">
      <div class="pc-preset-editor-head">
        <span class="pc-kicker">{{ presetName }}</span>
        <h2 :title="prompt.name || prompt.id">{{ prompt.name || prompt.id }}</h2>
        <small>{{ roleLabel }}</small>
      </div>
      <textarea v-if="typeof prompt.content === 'string'" v-model="draft" class="pc-area" placeholder="预设条目内容"></textarea>
      <div v-else class="pc-section-card pc-preset-placeholder-detail">
        <strong>占位条目</strong>
        <span>这个条目用于确定酒馆内容的插入位置，没有独立正文。</span>
      </div>
      <div class="pc-form-actions">
        <button class="pc-soft-btn danger" type="button" :disabled="saving" @click="$emit('remove')"><i class="fa-solid fa-trash"></i><span>删除</span></button>
        <button class="pc-soft-btn" type="button" :disabled="saving" @click="$emit('back')">返回</button>
        <button v-if="typeof prompt.content === 'string'" class="pc-primary-btn" type="button" :disabled="saving || !dirty" @click="$emit('save')">{{ saving ? '保存中' : '保存' }}</button>
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
defineEmits<{ back: []; remove: []; save: [] }>();
</script>

<style scoped>
.pc-preset-page { display: flex; height: 100%; min-height: 0; flex-direction: column; gap: 12px; overflow-y: auto; padding: 14px; }
.pc-preset-editor { display: flex; min-height: 0; flex: 1; flex-direction: column; gap: 12px; }
.pc-preset-editor-head { display: grid; min-width: 0; gap: 5px; }
.pc-preset-editor-head h2 { overflow: hidden; margin: 0; color: var(--pc-text); font-size: 19px; text-overflow: ellipsis; white-space: nowrap; }
.pc-preset-editor-head small { color: var(--pc-muted); font-size: 12px; font-weight: 700; }
.pc-preset-editor .pc-area { min-height: 0; flex: 1; resize: none; }
.pc-preset-editor .pc-form-actions { padding-top: 8px; flex-wrap: nowrap; }
.pc-preset-editor .pc-form-actions > button { min-width: 0; flex: 1; }
.pc-preset-placeholder-detail { display: grid; gap: 6px; }
.pc-preset-placeholder-detail span { color: var(--pc-muted); font-size: 13px; line-height: 1.55; }
</style>
