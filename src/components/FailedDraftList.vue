<template>
  <section v-if="drafts.length" class="pc-failed-section">
    <div v-if="showHeader" class="pc-section-head">
      <div>
        <strong>{{ title }}</strong>
        <p>{{ `${drafts.length} 条待处理输出` }}</p>
      </div>
    </div>

    <div class="pc-directory-list pc-entry-list">
      <article v-for="draft in drafts" :key="draft.id" class="pc-list-row pc-failed-draft-row">
        <button class="pc-entry-main" type="button" @click="$emit('open', draft.id)">
          <div class="pc-entry-head">
            <strong>{{ getTitle(draft) }}</strong>
          </div>
          <p>{{ getContext(draft) }}</p>
          <p class="preview">{{ draft.warnings.join('；') || emptyWarning }}</p>
        </button>
        <button class="pc-icon-btn danger" type="button" :title="deleteTitle" @click="$emit('remove', draft.id)">
          <i class="fa-solid fa-trash"></i>
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FailedGenerationDraft } from '@/type/generation';

withDefaults(
  defineProps<{
    deleteTitle?: string;
    drafts: FailedGenerationDraft[];
    emptyWarning?: string;
    getContext: (draft: FailedGenerationDraft) => string;
    getTitle: (draft: FailedGenerationDraft) => string;
    showHeader?: boolean;
    title?: string;
  }>(),
  {
    deleteTitle: '删除',
    emptyWarning: '等待重新解析',
    showHeader: true,
    title: '解析失败草稿',
  },
);

defineEmits<{
  (event: 'open', draftId: string): void;
  (event: 'remove', draftId: string): void;
}>();
</script>

<style scoped>
.pc-failed-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-section-head strong {
  display: block;
  color: var(--pc-text);
  font-size: 16px;
}

.pc-section-head p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-entry-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.pc-entry-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 10px;
}

.pc-entry-head strong {
  min-width: 0;
  overflow: hidden;
  color: var(--pc-text);
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-entry-head span,
.pc-entry-main p {
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-entry-main p {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-entry-main p.preview {
  color: color-mix(in srgb, var(--pc-muted) 84%, var(--pc-text) 16%);
}
</style>
