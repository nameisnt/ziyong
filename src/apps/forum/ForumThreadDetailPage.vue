<template>
  <section class="pc-forum-thread-detail-page">
    <ReaderDetailShell
      :content="displayedContent"
      :context-label="boardName"
      display-app-id="forum"
      :favorite-active="favorite"
      next-disabled
      previous-disabled
      :reasoning="viewedGenerationRecord?.reasoning"
      reasoning-editable
      :source-label="viewedGenerationRecord?.replay.source.label"
      :title="thread.title"
      :updated-at="thread.updatedAt"
      :version-count="versions.length"
      @bagu="$emit('bagu')"
      @bottom="$emit('bottom')"
      @catalog="$emit('catalog')"
      @edit="$emit('edit')"
      @favorite="$emit('favorite')"
      @top="$emit('top')"
      @update:reasoning="$emit('update:reasoning', $event)"
    >
      <template #kicker
        ><span class="pc-kicker">{{ boardName }}</span></template
      >
      <template #meta>
        <span class="pc-forum-author">
          <span>{{ thread.author }}</span>
          <CapsuleTag active compact :interactive="false" :label="t`楼主`" />
        </span>
      </template>
      <template #version-navigation>
        <VersionNavigator
          :versions="versions"
          :viewed-version-id="viewedVersionId"
          @select="$emit('select-version', $event)"
        />
      </template>
      <template #after-content>
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
        </section>
      </template>
      <template #actions>
        <button class="pc-soft-btn" type="button" @click="$emit('generate-replies')">
          <i class="fa-solid fa-comments"></i><span>{{ t`生成回复` }}</span>
        </button>
        <button class="pc-soft-btn" type="button" @click="$emit('rewrite')">
          <i class="fa-solid fa-rotate"></i><span>{{ t`重写` }}</span>
        </button>
        <button class="pc-soft-btn danger" type="button" @click="$emit('remove')">
          <i class="fa-solid fa-trash"></i><span>{{ t`删除` }}</span>
        </button>
      </template>
    </ReaderDetailShell>
  </section>
</template>

<script setup lang="ts">
import CapsuleTag from '@/components/CapsuleTag.vue';
import EmptyState from '@/components/EmptyState.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import VersionNavigator from '@/components/VersionNavigator.vue';
import type { ForumReply, ForumThread, ForumThreadVersion } from '@/type/forum';

const props = defineProps<{
  boardName: string;
  displayedContent: string;
  favorite: boolean;
  replies: Array<ForumReply & { floor: number }>;
  thread: ForumThread;
  versions: ForumThreadVersion[];
  viewedVersionId: string;
}>();

const viewedGenerationRecord = computed(
  () =>
    props.versions.find(version => version.id === props.viewedVersionId)?.generationRecord ||
    props.thread.generationRecord,
);

defineEmits<{
  bagu: [];
  bottom: [];
  catalog: [];
  edit: [];
  favorite: [];
  'generate-replies': [];
  remove: [];
  rewrite: [];
  'select-version': [versionId: string];
  top: [];
  'update:reasoning': [reasoning: string];
}>();
</script>

<style scoped>
.pc-forum-thread-detail-page {
  height: 100%;
  min-height: 0;
}

.pc-reply-section,
.pc-reply-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}

.pc-reply-section {
  margin-top: 18px;
}

.pc-reply-card {
  padding: 12px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface);
}

.pc-reply-head,
.pc-forum-author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-reply-head {
  justify-content: space-between;
  color: var(--pc-muted);
}

.pc-reply-content {
  margin: 10px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
