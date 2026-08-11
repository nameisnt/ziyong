<template>
  <section class="pc-extras-page">
    <div class="pc-page-section pc-extras-editor-section">
      <GenerationPanel
        class="pc-extras-generation-panel"
        :capture="capture"
        :capture-reset-key="captureResetKey"
        :error="generationState.error"
        :from-start-end="summaryDraft.fromStartEnd"
        :range-text="summaryDraft.rangeText"
        :raw-output="generationState.rawOutput"
        :recent-count="summaryDraft.recentCount"
        :references="references"
        requirement-placeholder="例如：更强调角色关系推进，少写情节流水账。"
        :running="generationState.running"
        :single-message-id="summaryDraft.singleMessageId"
        :source-mode="sourceMode"
        :user-requirement="summaryDraft.userRequirement"
        @cancel="emit('cancel')"
        @generate="emit('generate')"
        @stop="emit('stop')"
        @update:from-start-end="summaryDraft.fromStartEnd = $event"
        @update:range-text="summaryDraft.rangeText = $event"
        @update:recent-count="summaryDraft.recentCount = $event"
        @update:references="references = $event"
        @update:single-message-id="summaryDraft.singleMessageId = $event"
        @update:source-mode="sourceMode = $event"
        @update:user-requirement="summaryDraft.userRequirement = $event"
      >
        <template #before-fields>
          <div v-if="chapters.length" class="pc-chapter-picks">
            <label v-for="chapter in chapters" :key="chapter.id" class="pc-check-item">
              <input
                v-model="summaryDraft.coveredChapterIds"
                type="checkbox"
                :value="chapter.id"
                :disabled="generationState.running"
              />
              <span>{{ `第 ${chapter.chapterNumber} 章 · ${chapter.title}` }}</span>
            </label>
          </div>
          <EmptyState v-else compact :title="t`当前没有待总结章节`" />

          <label class="pc-switch-row">
            <div>
              <strong>{{ t`保存后直接启用` }}</strong>
              <p>{{ t`后续续写时会用这条总结替换对应章节正文。` }}</p>
            </div>
            <span class="pc-checkbox">
              <input v-model="summaryDraft.enabled" type="checkbox" :disabled="generationState.running" />
            </span>
          </label>
        </template>
      </GenerationPanel>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import type { ExtraChapter } from '@/type/extra';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

const summaryDraft = defineModel<{
  coveredChapterIds: string[];
  enabled: boolean;
  fromStartEnd: number;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
  userRequirement: string;
}>('summaryDraft', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });

defineProps<{
  capture: () => Promise<CapturedTavernPromptPreview>;
  captureResetKey: unknown;
  chapters: ExtraChapter[];
  generationState: { error: string; rawOutput: string; running: boolean };
}>();

const emit = defineEmits<{
  cancel: [];
  generate: [];
  stop: [];
}>();
</script>
