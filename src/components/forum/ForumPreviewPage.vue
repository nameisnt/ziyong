<template>
  <section class="pc-forum-preview-page pc-generation-preview-page">
    <article class="pc-detail-card pc-generation-preview-card">
      <GenerationPreviewPanel
        :content="action === 'thread' ? threadContent : replies.map(reply => reply.content).join('\n')"
        :raw="raw"
        raw-editable
        :reparse-handler="reparseHandler"
        :save-label="saveLabel"
        :scan-enabled="action === 'thread'"
        :source-label="boardName"
        :text-provider-summary="action === 'thread' ? author : `${replies.length} 条回复`"
        :title="title"
        :warnings="warnings"
        @back="$emit('back')"
        @reparse="$emit('reparse')"
        @save="$emit('save')"
        @update:content="$emit('apply-thread-content', $event)"
        @update:raw="raw = $event"
      >
        <template #content="{ renderedContent }">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <article
            v-if="action === 'thread'"
            class="pc-detail-content pc-rendered-markdown"
            v-html="renderedContent"
          ></article>
          <section class="pc-reply-section">
            <div class="pc-section-head">
              <strong>{{ action === 'thread' ? t`预览回复` : t`回复预览` }}</strong>
              <p>{{ `${replies.length} 条` }}</p>
            </div>
            <EmptyState v-if="!replies.length" compact :title="t`没有回复内容。`" />
            <div v-else class="pc-reply-list">
              <article v-for="reply in replies" :key="reply.key" class="pc-reply-card">
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
      </GenerationPreviewPanel>
    </article>
  </section>
</template>

<script setup lang="ts">
import CapsuleTag from '@/components/CapsuleTag.vue';
import EmptyState from '@/components/EmptyState.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';

interface ForumPreviewReply {
  author: string;
  content: string;
  floor: number;
  isOriginalPoster: boolean;
  key: string;
}

defineProps<{
  action: 'replies' | 'thread';
  author: string;
  boardName: string;
  reparseHandler: () => boolean | Promise<boolean>;
  replies: ForumPreviewReply[];
  saveLabel: string;
  threadContent: string;
  title: string;
  warnings: string[];
}>();

const raw = defineModel<string>('raw', { required: true });

defineEmits<{
  'apply-thread-content': [content: string];
  back: [];
  reparse: [];
  save: [];
}>();
</script>

<style scoped>
.pc-forum-preview-page {
  min-height: 100%;
}

.pc-detail-card,
.pc-reply-card {
  padding: 14px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-detail-content {
  padding: 16px;
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
  white-space: pre-wrap;
}

.pc-reply-section,
.pc-reply-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-section-head,
.pc-reply-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-section-head p,
.pc-reply-head span {
  margin: 0;
  color: var(--pc-muted);
}

.pc-reply-card {
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
}

.pc-reply-head strong {
  display: block;
  font-size: 16px;
}

.pc-reply-head strong.pc-forum-author {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.pc-reply-content {
  margin: 8px 0 0;
  color: var(--pc-text);
  white-space: pre-wrap;
}
</style>
