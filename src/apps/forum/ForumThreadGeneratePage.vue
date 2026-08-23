<template>
  <GenerationFormPage
    v-model:from-start-end="draft.fromStartEnd"
    v-model:range-text="draft.rangeText"
    v-model:recent-count="draft.recentCount"
    v-model:references="references"
    v-model:single-message-id="draft.singleMessageId"
    v-model:source-mode="sourceMode"
    v-model:user-requirement="draft.userRequirement"
    :capture="capture"
    :capture-reset-key="captureResetKey"
    :error="generationState.error"
    :raw-output="generationState.rawOutput"
    requirement-placeholder="例如：主楼更像资深版友发的长帖，回复风格分化明显。"
    :running="generationState.running"
    :title="title"
    @cancel="emit('cancel')"
    @generate="emit('generate')"
    @stop="emit('stop')"
  >
    <template #before-fields>
      <SearchableCombobox
        v-if="!insideBoard"
        :disabled="generationState.running"
        :input-label="t`选择或搜索论坛板块`"
        :model-value="draft.boardId"
        :options="boardOptions"
        :placeholder="t`选择或搜索论坛板块`"
        :toggle-title="t`展开论坛板块`"
        @update:model-value="draft.boardId = $event"
      />
      <div v-if="!insideBoard && draft.boardId === customBoardId" class="pc-forum-type-fields">
        <SearchableCombobox
          :disabled="generationState.running"
          :empty-label="t`没有匹配的板块类型`"
          :input-label="t`选择论坛板块类型`"
          :model-value="draft.boardTypeId"
          :options="boardTypeOptions"
          :placeholder="t`选择论坛板块类型`"
          :toggle-title="t`展开论坛板块类型`"
          @update:model-value="emit('selectBoardType', $event)"
        />
        <textarea
          v-model="draft.boardTypePrompt"
          class="pc-area pc-area-multiline"
          :disabled="generationState.running"
          :placeholder="t`板块类型提示词（可编辑）`"
          @input="draft.boardTypeId = customBoardTypeId"
        ></textarea>
        <div class="pc-segment pc-forum-name-mode" :aria-label="t`板块命名方式`">
          <button
            :class="['pc-segment-btn', { active: draft.boardNameMode === 'fixed' }]"
            type="button"
            :disabled="generationState.running"
            @click="draft.boardNameMode = 'fixed'"
          >
            {{ t`固定名称` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: draft.boardNameMode === 'ai' }]"
            type="button"
            :disabled="generationState.running"
            @click="draft.boardNameMode = 'ai'"
          >
            {{ t`AI 生成` }}
          </button>
        </div>
        <input
          v-if="draft.boardNameMode === 'fixed'"
          v-model="draft.boardName"
          class="pc-field"
          type="text"
          :disabled="generationState.running"
          :placeholder="t`固定板块名称`"
        />
        <button
          v-if="draft.boardNameMode === 'fixed'"
          class="pc-primary-btn pc-forum-create-board-btn"
          type="button"
          :disabled="generationState.running || !draft.boardName.trim()"
          @click="emit('createBoard')"
        >
          {{ t`创建并选择` }}
        </button>
      </div>
    </template>
  </GenerationFormPage>
</template>

<script setup lang="ts">
import GenerationFormPage from '@/components/GenerationFormPage.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import type { CapturedTavernPromptPreview } from '@/util/runtime';

const draft = defineModel<{
  boardId: string;
  boardName: string;
  boardNameMode: 'ai' | 'fixed';
  boardTypeId: string;
  boardTypePrompt: string;
  fromStartEnd: number;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
  userRequirement: string;
}>('draft', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const sourceMode = defineModel<SummaryGenerationSourceMode>('sourceMode', { required: true });

defineProps<{
  boardOptions: Array<{ group?: string; label: string; value: string }>;
  boardTypeOptions: Array<{ group?: string; label: string; value: string }>;
  capture: () => Promise<CapturedTavernPromptPreview>;
  captureResetKey: unknown;
  customBoardId: string;
  customBoardTypeId: string;
  generationState: { error: string; rawOutput: string; running: boolean };
  insideBoard: boolean;
  title: string;
}>();

const emit = defineEmits<{
  cancel: [];
  createBoard: [];
  generate: [];
  selectBoardType: [value: string];
  stop: [];
}>();
</script>

<style scoped>
.pc-forum-type-fields {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.pc-forum-type-fields :is(.pc-field, .pc-area) {
  margin-top: 0;
}

.pc-forum-name-mode {
  align-self: flex-start;
}
</style>
