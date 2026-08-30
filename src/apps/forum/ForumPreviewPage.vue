<template>
  <section class="pc-forum-preview-page pc-generation-preview-page">
    <article class="pc-detail-card pc-generation-preview-card">
      <GenerationPreviewPanel
        v-model:reasoning="reasoning"
        :content="action === 'thread' ? threadContent : replies.map(reply => reply.content).join('\n')"
        :raw="raw"
        raw-editable
        reasoning-editable
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
          <ForumReplyList
            empty-title="没有回复内容。"
            :replies="replies"
            :title="action === 'thread' ? '预览回复' : '回复预览'"
          />
        </template>
      </GenerationPreviewPanel>
    </article>
  </section>
</template>

<script setup lang="ts">
import ForumReplyList from '@/apps/forum/ForumReplyList.vue';
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
const reasoning = defineModel<string>('reasoning', { default: '' });

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

.pc-detail-card {
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
</style>
