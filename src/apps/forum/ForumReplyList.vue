<template>
  <section class="pc-forum-replies">
    <div class="pc-forum-replies-head">
      <div class="pc-forum-replies-title">
        <strong>{{ title }}</strong>
        <span>{{ `${visibleReplies.length}/${replies.length}` }}</span>
      </div>
      <div v-if="hasOriginalPosterReplies" class="pc-segment" aria-label="回复筛选">
        <button
          :class="['pc-segment-btn', 'compact', { active: filter === 'all' }]"
          type="button"
          @click="filter = 'all'"
        >
          全部
        </button>
        <button
          :class="['pc-segment-btn', 'compact', { active: filter === 'op' }]"
          type="button"
          @click="filter = 'op'"
        >
          只看楼主
        </button>
      </div>
    </div>

    <EmptyState v-if="!visibleReplies.length" compact :title="filter === 'op' ? '楼主还没有回复。' : emptyTitle" />
    <div v-else class="pc-forum-floor-list">
      <article
        v-for="reply in visibleReplies"
        :key="reply.id || reply.key || `${reply.floor}-${reply.author}`"
        class="pc-forum-floor"
      >
        <header class="pc-forum-floor-head">
          <div class="pc-forum-floor-author">
            <strong>{{ reply.author }}</strong>
            <CapsuleTag v-if="reply.isOriginalPoster" active compact :interactive="false" label="楼主" />
          </div>
          <span class="pc-forum-floor-number">{{ `#${reply.floor}` }}</span>
        </header>
        <p v-if="parentFloor(reply.parentReplyId)" class="pc-forum-reply-target">
          <i class="fa-solid fa-reply"></i>
          {{ `回复 #${parentFloor(reply.parentReplyId)}` }}
        </p>
        <p class="pc-forum-floor-content">{{ reply.content }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import CapsuleTag from '@/components/CapsuleTag.vue';
import EmptyState from '@/components/EmptyState.vue';

interface ForumReplyListItem {
  author: string;
  content: string;
  floor: number;
  id?: string;
  isOriginalPoster: boolean;
  key?: string;
  parentReplyId?: string;
}

const props = withDefaults(
  defineProps<{
    emptyTitle?: string;
    replies: ForumReplyListItem[];
    title?: string;
  }>(),
  {
    emptyTitle: '还没有回复。',
    title: '回复',
  },
);

const filter = ref<'all' | 'op'>('all');
const hasOriginalPosterReplies = computed(() => props.replies.some(reply => reply.isOriginalPoster));
const visibleReplies = computed(() =>
  filter.value === 'op' ? props.replies.filter(reply => reply.isOriginalPoster) : props.replies,
);
const floorById = computed(() => new Map(props.replies.flatMap(reply => (reply.id ? [[reply.id, reply.floor]] : []))));

function parentFloor(parentReplyId?: string) {
  return parentReplyId ? floorById.value.get(parentReplyId) : undefined;
}

watch(
  () => props.replies,
  replies => {
    if (filter.value === 'op' && !replies.some(reply => reply.isOriginalPoster)) filter.value = 'all';
  },
);
</script>

<style scoped>
.pc-forum-replies {
  display: flex;
  min-height: 0;
  flex-direction: column;
  margin-top: 18px;
}

.pc-forum-replies-head,
.pc-forum-replies-title,
.pc-forum-floor-head,
.pc-forum-floor-author {
  display: flex;
  align-items: center;
}

.pc-forum-replies-head,
.pc-forum-floor-head {
  justify-content: space-between;
}

.pc-forum-replies-head {
  gap: 8px;
  padding: 0 0 8px;
  border-bottom: 1px solid var(--pc-border);
}

.pc-forum-replies-title,
.pc-forum-floor-author {
  min-width: 0;
  gap: 7px;
}

.pc-forum-replies-title span,
.pc-forum-floor-number,
.pc-forum-reply-target {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-forum-floor-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.pc-forum-floor {
  padding: 12px 0 14px;
  border-bottom: 1px solid var(--pc-border);
}

.pc-forum-floor:last-child {
  border-bottom: 0;
}

.pc-forum-floor-head {
  gap: 10px;
}

.pc-forum-floor-author strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-forum-reply-target {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 8px 0 0;
}

.pc-forum-floor-content {
  margin: 8px 0 0;
  color: var(--pc-reader-text, var(--pc-text));
  line-height: var(--pc-reader-line-height);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
