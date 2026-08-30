<template>
  <section class="pc-forum-thread-detail-page pc-app-fill">
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
        <ForumReplyList :replies="replies" />
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
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import VersionNavigator from '@/components/VersionNavigator.vue';
import ForumReplyList from '@/apps/forum/ForumReplyList.vue';
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
.pc-forum-author {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
