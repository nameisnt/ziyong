<template>
  <section class="pc-extras-page">
    <div class="pc-editor-card">
      <span class="pc-kicker">{{ editing ? t`编辑章节总结` : t`新增章节总结` }}</span>
      <h2>{{ bookTitle }}</h2>
      <textarea v-model="content" class="pc-area pc-saved-content-area" :placeholder="t`总结正文`"></textarea>
      <div v-if="chapters.length" class="pc-chapter-picks">
        <label v-for="chapter in chapters" :key="chapter.id" class="pc-check-item">
          <input v-model="coveredChapterIds" type="checkbox" :value="chapter.id" />
          <span>{{ `第 ${chapter.chapterNumber} 章 · ${chapter.title}` }}</span>
        </label>
      </div>
      <EmptyState v-if="!chapters.length" compact :title="t`当前没有可关联章节`" />
      <label class="pc-switch-row">
        <div>
          <strong>{{ t`启用这条总结` }}</strong>
          <p>{{ t`后续续写时会用这条总结替换对应章节正文。` }}</p>
        </div>
        <span class="pc-checkbox">
          <input v-model="enabled" type="checkbox" />
        </span>
      </label>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="emit('cancel')">{{ t`取消` }}</button>
        <button class="pc-primary-btn" type="button" @click="emit('save')">{{ t`保存` }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { ExtraChapter } from '@/type/extra';

defineProps<{
  bookTitle: string;
  chapters: ExtraChapter[];
  editing: boolean;
}>();

const content = defineModel<string>('content', { required: true });
const coveredChapterIds = defineModel<string[]>('coveredChapterIds', { required: true });
const enabled = defineModel<boolean>('enabled', { required: true });
const emit = defineEmits<{ cancel: []; save: [] }>();
</script>

<style scoped>
.pc-extras-page {
  min-height: 100%;
}

.pc-editor-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-editor-card .pc-area {
  min-height: 220px;
  margin-top: 14px;
  resize: vertical;
}

.pc-chapter-picks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.pc-check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: var(--pc-surface-strong);
}

.pc-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-switch-row p {
  color: var(--pc-muted);
}

.pc-checkbox {
  position: relative;
  width: 44px;
  height: 28px;
  border-radius: 999px;
  background: var(--pc-surface-strong);
}

.pc-checkbox input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.pc-editor-card > .pc-form-actions {
  margin-top: 18px;
  justify-content: flex-end;
}
</style>
