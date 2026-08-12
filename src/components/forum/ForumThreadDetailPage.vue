<template>
  <section class="pc-forum-thread-detail-page">
    <article class="pc-detail-card">
      <span class="pc-kicker">{{ boardName }}</span>
      <h2>{{ thread.title }}</h2>
      <div class="pc-detail-meta">
        <span class="pc-forum-author">
          <span>{{ thread.author }}</span>
          <CapsuleTag active compact :interactive="false" :label="t`楼主`" />
        </span>
        <span>{{ favorite ? t`已收藏` : t`未收藏` }}</span>
      </div>
      <VersionNavigator
        v-if="versionNavigatorPosition === 'before'"
        :versions="versions"
        :viewed-version-id="viewedVersionId"
        @select="$emit('select-version', $event)"
      />
      <ReaderContent :content="displayedContent" />
      <VersionNavigator
        v-if="versionNavigatorPosition === 'after'"
        :versions="versions"
        :viewed-version-id="viewedVersionId"
        @select="$emit('select-version', $event)"
      />
    </article>

    <ForumThreadActions
      :favorite="favorite"
      :version-count="versions.length"
      @bagu="$emit('bagu')"
      @edit="$emit('edit')"
      @favorite="$emit('favorite')"
      @generate-replies="$emit('generate-replies')"
      @remove="$emit('remove')"
      @rewrite="$emit('rewrite')"
    />

    <section class="pc-reply-section">
      <div class="pc-section-head">
        <strong>{{ t`回复` }}</strong>
        <p>{{ `${replies.length} 条` }}</p>
      </div>
      <EmptyState v-if="!replies.length" compact :title="t`还没有回复。`" />
      <div v-else class="pc-reply-list">
        <article v-for="reply in replies" :key="reply.id" class="pc-reply-card">
          <div class="pc-reply-head">
            <strong class="pc-forum-author">
              <span>{{ reply.author }}</span>
              <CapsuleTag v-if="reply.isOriginalPoster" active compact :interactive="false" :label="t`楼主`" />
            </strong>
            <span>{{ `第 ${reply.floor} 层` }}</span>
          </div>
          <p class="pc-reply-content">{{ reply.content }}</p>
        </article>
      </div>

      <ForumThreadActions
        :favorite="favorite"
        :version-count="versions.length"
        @bagu="$emit('bagu')"
        @edit="$emit('edit')"
        @favorite="$emit('favorite')"
        @generate-replies="$emit('generate-replies')"
        @remove="$emit('remove')"
        @rewrite="$emit('rewrite')"
      />
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import CapsuleTag from '@/components/CapsuleTag.vue';
import ForumThreadActions from '@/components/forum/ForumThreadActions.vue';
import ReaderContent from '@/components/ReaderContent.vue';
import VersionNavigator from '@/components/VersionNavigator.vue';
import type { ForumReply, ForumThread, ForumThreadVersion } from '@/type/forum';

defineProps<{
  boardName: string;
  displayedContent: string;
  favorite: boolean;
  replies: Array<ForumReply & { floor: number }>;
  thread: ForumThread;
  versionNavigatorPosition: 'after' | 'before';
  versions: ForumThreadVersion[];
  viewedVersionId: string;
}>();

defineEmits<{
  bagu: [];
  edit: [];
  favorite: [];
  'generate-replies': [];
  remove: [];
  rewrite: [];
  'select-version': [versionId: string];
}>();
</script>

<style scoped>
.pc-forum-thread-detail-page,
.pc-reply-section,
.pc-reply-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
}

.pc-detail-card,
.pc-reply-card {
  padding: 14px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-detail-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-detail-meta,
.pc-section-head,
.pc-reply-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-forum-author {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.pc-detail-meta,
.pc-section-head p,
.pc-reply-head span {
  color: var(--pc-muted);
}

.pc-section-head p {
  margin: 0;
}

.pc-reply-list {
  gap: 10px;
}

.pc-reply-card {
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
}

.pc-reply-head strong {
  display: block;
  font-size: 16px;
}

.pc-reply-content {
  margin: 8px 0 0;
  color: var(--pc-text);
  white-space: pre-wrap;
}
</style>
