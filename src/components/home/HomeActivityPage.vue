<template>
  <section v-if="active" class="pc-home-activity-page">
    <GenerationTaskCenter />
    <section v-if="activityItems.length" class="pc-section-card pc-home-activity-list">
      <header class="pc-section-head">
        <strong>待处理内容</strong>
        <small>{{ activityItems.length }} 项</small>
      </header>
      <button
        v-for="item in activityItems"
        :key="`${item.kind}:${item.appId}:${item.id}`"
        class="pc-list-row"
        type="button"
        @click="emit('open', item)"
      >
        <span class="pc-list-row-copy"
          ><strong>{{ item.title }}</strong
          ><small>{{ item.kind === 'preview-draft' ? '未保存预览' : '等待修复' }}</small></span
        >
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </section>
  </section>
</template>

<script setup lang="ts">
import GenerationTaskCenter from '@/components/GenerationTaskCenter.vue';
import { getRegisteredPhoneGenerationRecoveryItems } from '@/core/appRegistry';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import { collectGenerationActivity, type GenerationActivityItem } from '@/util/generationActivity';
import { storeToRefs } from 'pinia';

defineProps<{
  active: boolean;
}>();

const emit = defineEmits<{
  open: [item: GenerationActivityItem];
}>();

const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const previewDrafts = usePreviewDraftStore();
const { viewingScopeKey } = storeToRefs(phone);
const activityItems = ref<GenerationActivityItem[]>([]);
let activityRefreshSequence = 0;

async function refreshActivityItems() {
  const requestSequence = ++activityRefreshSequence;
  const scopeKey = viewingScopeKey.value;
  const recoveryItems = await getRegisteredPhoneGenerationRecoveryItems(scopeKey);
  if (requestSequence !== activityRefreshSequence || scopeKey !== viewingScopeKey.value) return;
  const drafts = previewDrafts.scopeKey === scopeKey ? previewDrafts.drafts : [];
  activityItems.value = collectGenerationActivity(generationTasks.currentScopeTasks, drafts, recoveryItems).filter(
    item => item.kind !== 'active-task',
  );
}

watch(viewingScopeKey, () => void refreshActivityItems(), { immediate: true });
watch([() => generationTasks.currentScopeTasks, () => previewDrafts.drafts], () => void refreshActivityItems(), {
  deep: true,
});
</script>

<style scoped>
.pc-home-activity-page {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  overflow: auto;
  touch-action: pan-y;
}

.pc-home-activity-list {
  display: grid;
  gap: 6px;
}

.pc-home-activity-list .pc-section-head small {
  color: var(--pc-muted);
}
</style>
