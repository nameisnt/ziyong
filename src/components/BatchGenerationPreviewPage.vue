<template>
  <section class="pc-batch-preview-page pc-page-stack">
    <header class="pc-batch-preview-head">
      <div>
        <span class="pc-kicker">{{ kind === 'diary' ? '批量日记' : '批量总结' }}</span>
        <h2>批量生成预览</h2>
      </div>
      <strong>{{ drafts.length }} 项</strong>
    </header>

    <EmptyState v-if="!drafts.length" title="没有待保存结果" />
    <div v-else class="pc-batch-preview-list">
      <article v-for="(draft, index) in drafts" :key="draft.jobId" class="pc-editor-card pc-batch-preview-item">
        <div class="pc-batch-preview-item-head">
          <strong>{{ draft.label }}</strong>
          <span>{{ index + 1 }}/{{ drafts.length }}</span>
        </div>
        <label class="pc-field-group">
          <span class="pc-field-label">标题</span>
          <input v-model="draft.title" class="pc-field" type="text" />
        </label>
        <label v-if="kind === 'diary'" class="pc-field-group">
          <span class="pc-field-label">时间</span>
          <input v-model="draft.occurredAt" class="pc-field" type="text" />
        </label>
        <ReasoningDisclosure :content="draft.reasoning" editable @update:content="draft.reasoning = $event" />
        <label class="pc-field-group">
          <span class="pc-field-label">正文</span>
          <textarea v-model="draft.content" class="pc-area pc-batch-preview-content"></textarea>
        </label>
        <div v-if="draft.warnings.length" class="pc-status-card warning">
          <strong>解析提示</strong>
          <p>{{ draft.warnings.join('；') }}</p>
        </div>
        <details class="pc-batch-preview-raw">
          <summary>原始输出</summary>
          <div class="pc-batch-preview-raw-output">
            <textarea :value="draft.rawOutput" class="pc-area pc-area-preview" readonly></textarea>
          </div>
        </details>
      </article>
    </div>

    <div class="pc-form-actions">
      <button class="pc-soft-btn" type="button" :disabled="saving" @click="$emit('back')">
        <i class="fa-solid fa-arrow-left"></i>
        <span>返回</span>
      </button>
      <button class="pc-primary-btn" type="button" :disabled="saving || !drafts.length" @click="saveAll">
        <i class="fa-solid fa-floppy-disk"></i>
        <span>{{ saving ? '保存中' : '保存整批' }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import ReasoningDisclosure from '@/components/ReasoningDisclosure.vue';
import type { ManualBatchPreviewEdit, ManualBatchPreviewItem } from '@/core/manualBatchRunner';

const props = defineProps<{
  items: ManualBatchPreviewItem[];
  kind: 'diary' | 'summary';
  saveHandler: (edits: ManualBatchPreviewEdit[]) => Promise<void>;
}>();

defineEmits<{ back: [] }>();

type BatchPreviewDraft = ManualBatchPreviewEdit & Pick<ManualBatchPreviewItem, 'label' | 'rawOutput' | 'warnings'>;

const drafts = ref<BatchPreviewDraft[]>([]);
const saving = ref(false);

watch(
  () => props.items,
  items => {
    drafts.value = items.map(item => ({
      content: item.content,
      jobId: item.jobId,
      label: item.label,
      occurredAt: item.occurredAt,
      rawOutput: item.rawOutput,
      reasoning: item.generationRecord.reasoning || '',
      title: item.title,
      warnings: [...item.warnings],
    }));
  },
  { immediate: true },
);

async function saveAll() {
  saving.value = true;
  try {
    await props.saveHandler(drafts.value);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.pc-batch-preview-head,
.pc-batch-preview-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-batch-preview-head h2 {
  margin: 3px 0 0;
  color: var(--pc-text);
  font-size: 20px;
}

.pc-batch-preview-head > strong,
.pc-batch-preview-item-head span {
  color: var(--pc-muted);
}

.pc-batch-preview-list {
  display: grid;
  gap: 12px;
}

.pc-batch-preview-item {
  display: grid;
  gap: 12px;
}

.pc-batch-preview-content {
  min-height: 220px;
}

.pc-batch-preview-raw summary {
  color: var(--pc-muted);
  cursor: pointer;
  font-weight: 700;
}

.pc-batch-preview-raw-output {
  margin-top: 8px;
}
</style>
