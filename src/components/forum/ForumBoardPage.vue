<template>
  <section class="pc-forum-board-page">
    <div class="pc-forum-hero">
      <h2>{{ board.name }}</h2>
      <div class="pc-hero-actions">
        <button class="pc-soft-btn compact" type="button" @click="$emit('generate-thread')">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>{{ t`生成帖子` }}</span>
        </button>
        <button class="pc-primary-btn compact" type="button" @click="$emit('create-thread')">
          <i class="fa-solid fa-file-circle-plus"></i>
          <span>{{ t`发帖` }}</span>
        </button>
      </div>
    </div>

    <div class="pc-toolbar">
      <input v-model="query" class="pc-search" type="text" :placeholder="t`搜索标题、作者或正文`" />
      <div class="pc-sort-group">
        <button
          v-for="option in sortOptions"
          :key="option.value"
          :class="['pc-sort-btn', { active: sortMode === option.value }]"
          type="button"
          :title="option.title"
          @click="sortMode = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <EmptyState v-if="!threads.length" :title="t`还没有匹配的帖子`" />
    <div v-else class="pc-entry-list">
      <article v-for="thread in threads" :key="thread.id" class="pc-entry-card">
        <button class="pc-entry-main" type="button" @click="$emit('open-thread', thread.id)">
          <div class="pc-entry-head">
            <strong>{{ thread.title }}</strong>
            <ContentVersionBadge :count="Math.max(1, thread.versions.length)" />
          </div>
          <p>{{ thread.author }} · {{ thread.replies.length }} {{ t`条回复` }}</p>
        </button>
        <button
          class="pc-favorite-chip"
          type="button"
          :title="thread.favorite ? t`取消收藏` : t`收藏`"
          @click="$emit('toggle-favorite', thread.id)"
        >
          <i class="fa-solid fa-bookmark" :data-active="thread.favorite"></i>
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import ContentVersionBadge from '@/components/ContentVersionBadge.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { ForumBoard, ForumThread } from '@/type/forum';

type ThreadSortMode = 'favorite' | 'heat' | 'latestPublish' | 'latestReply';

defineProps<{
  board: ForumBoard;
  sortOptions: Array<{ label: string; title: string; value: ThreadSortMode }>;
  threads: ForumThread[];
}>();

const query = defineModel<string>('query', { required: true });
const sortMode = defineModel<ThreadSortMode>('sortMode', { required: true });

defineEmits<{
  'create-thread': [];
  'generate-thread': [];
  'open-thread': [threadId: string];
  'toggle-favorite': [threadId: string];
}>();
</script>

<style scoped>
.pc-forum-board-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-forum-hero,
.pc-toolbar,
.pc-entry-card {
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-forum-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 14px;
}

.pc-forum-hero h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 20px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-hero-actions,
.pc-sort-group,
.pc-entry-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-hero-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pc-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px;
}

.pc-search {
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid var(--pc-border);
  border-radius: 10px;
  outline: none;
  background: var(--pc-bg);
  color: var(--pc-text);
}

.pc-sort-btn {
  min-height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
}

.pc-sort-btn.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
}

.pc-entry-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-entry-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px;
}

.pc-entry-main {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-entry-main strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-entry-main p {
  margin: 6px 0 0;
  color: var(--pc-muted);
}

.pc-favorite-chip {
  border: 0;
  background: transparent;
  color: var(--pc-muted);
  cursor: pointer;
}

.pc-favorite-chip i[data-active='true'] {
  color: var(--pc-theme-accent);
}

@media (max-width: 420px) {
  .pc-forum-hero,
  .pc-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .pc-hero-actions {
    justify-content: flex-start;
  }

  .pc-sort-group {
    overflow-x: auto;
  }
}
</style>
