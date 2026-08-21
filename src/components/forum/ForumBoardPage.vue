<template>
  <section class="pc-forum-board-page">
    <div class="pc-compact-toolbar pc-directory-toolbar pc-forum-board-toolbar">
      <span class="pc-directory-count">{{ threads.length }} 个主题帖</span>
      <div class="pc-directory-actions pc-hero-actions">
        <button
          class="pc-icon-btn"
          type="button"
          :title="t`生成帖子`"
          :aria-label="t`生成帖子`"
          @click="$emit('generate-thread')"
        >
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </button>
        <ActionMenu :label="t`新增`" icon="fa-solid fa-plus">
          <button type="button" @click="$emit('create-thread')"><i class="fa-solid fa-file-circle-plus"></i>{{ t`发帖` }}</button>
          <ItemTransferImportAction app-id="forum" :params="{ boardId }" :label="t`导入单个帖子`" />
        </ActionMenu>
      </div>
    </div>

    <label class="pc-search-field">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" type="search" :placeholder="t`搜索标题、作者或正文`" />
    </label>
    <EmptyState v-if="!threads.length" :title="t`还没有匹配的帖子`" />
    <div v-else class="pc-directory-list pc-entry-list">
      <article v-for="thread in threads" :key="thread.id" class="pc-list-row pc-thread-row">
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
import ActionMenu from '@/components/ActionMenu.vue';
import ContentVersionBadge from '@/components/ContentVersionBadge.vue';
import EmptyState from '@/components/EmptyState.vue';
import ItemTransferImportAction from '@/components/ItemTransferImportAction.vue';
import type { ForumThread } from '@/type/forum';

defineProps<{
  boardId: string;
  threads: ForumThread[];
}>();

const query = defineModel<string>('query', { required: true });

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

.pc-hero-actions,
.pc-entry-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-entry-main {
  width: 100%;
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

</style>
