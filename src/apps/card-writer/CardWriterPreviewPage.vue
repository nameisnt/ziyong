<template>
  <section class="pc-card-writer-page pc-card-writer-preview-page">
    <nav v-if="stages.length > 1" class="pc-card-writer-preview-stages" aria-label="生成阶段">
      <button
        v-for="stage in stages"
        :key="stage.id"
        :class="['pc-segment-btn', stage.status, { active: activeStageId === stage.id }]"
        type="button"
        :title="stage.error || stage.label"
        @click="emit('update:activeStageId', stage.id)"
      >
        <i :class="stageIcon(stage.status)"></i>
        <span>{{ stage.label }}</span>
      </button>
    </nav>
    <GenerationPreviewPanel
      :key="activeStage?.id || 'preview'"
      :content="activeStage?.content || ''"
      :raw="activeStage?.raw || ''"
      :editable="true"
      copy-enabled
      :raw-editable="true"
      :save-disabled="saving || running"
      :scan-enabled="true"
      :short-content-guard="false"
      :source-label="preview.sourceLabel"
      :text-provider-summary="preview.providerSummary"
      :title="activeStage?.label || preview.title"
      :warnings="warnings"
      :save-label="saveLabel"
      :reparse-handler="reparseHandler"
      :reasoning="activeStage?.reasoning || ''"
      reasoning-editable
      @update:content="emit('update:content', $event)"
      @update:raw="emit('update:raw', $event)"
      @update:reasoning="emit('update:reasoning', $event)"
      @save="emit('save')"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';

import { stageIcon } from './prompt';
import type { CardWriterStageResult } from './store';

const props = defineProps<{
  activeStageId: string;
  preview: { providerSummary: string; sourceLabel: string; title: string };
  reparseHandler: () => boolean;
  running: boolean;
  saveLabel: string;
  saving: boolean;
  stages: CardWriterStageResult[];
  warnings: string[];
}>();

const emit = defineEmits<{
  reparse: [];
  save: [];
  'update:activeStageId': [id: string];
  'update:content': [value: string];
  'update:raw': [value: string];
  'update:reasoning': [value: string];
}>();

const activeStage = computed(
  () => props.stages.find(stage => stage.id === props.activeStageId) ?? props.stages[0] ?? null,
);
</script>

<style scoped>
.pc-card-writer-preview-page {
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
}

.pc-card-writer-preview-stages {
  display: flex;
  min-width: 0;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.pc-card-writer-preview-stages .pc-segment-btn {
  flex: 0 0 auto;
  max-width: 190px;
}

.pc-card-writer-preview-stages .pc-segment-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-card-writer-preview-stages .pc-segment-btn.failed {
  color: var(--pc-danger);
}

.pc-card-writer-preview-page :deep(.pc-generation-preview) {
  min-height: 100%;
}
</style>
