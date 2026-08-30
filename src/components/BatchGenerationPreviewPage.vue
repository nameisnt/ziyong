<template>
  <section v-if="activeDraft" class="pc-batch-preview-page pc-batch-preview-detail">
    <GenerationPreviewPanel
      :content="activeDraft.content"
      editable
      :raw="activeDraft.rawOutput"
      raw-editable
      :raw-output-semantics="activeDraft.rawOutputSemantics"
      :reasoning="activeDraft.reasoning"
      reasoning-editable
      :reparse-handler="reparseActiveDraft"
      save-label="完成修改"
      :save-disabled="!activeDraft.title.trim() || !activeDraft.content.trim()"
      :short-content-guard="false"
      :source-label="activeDraft.label"
      :text-provider-summary="kind === 'diary' ? '批量日记' : '批量总结'"
      :title="activeDraft.title || '未命名条目'"
      :warnings="activeDraft.warnings"
      @save="closeDetail"
      @update:content="activeDraft.content = $event"
      @update:raw="activeDraft.rawOutput = $event"
      @update:reasoning="activeDraft.reasoning = $event"
    >
      <template #before-content>
        <div class="pc-batch-preview-fields">
          <label class="pc-field-group">
            <span class="pc-field-label">标题</span>
            <input v-model="activeDraft.title" class="pc-field" type="text" />
          </label>
          <label v-if="kind === 'diary'" class="pc-field-group">
            <span class="pc-field-label">时间</span>
            <input v-model="activeDraft.occurredAt" class="pc-field" type="text" />
          </label>
        </div>
      </template>
    </GenerationPreviewPanel>
  </section>

  <section v-else class="pc-batch-preview-page pc-page-stack">
    <header class="pc-batch-preview-head">
      <div>
        <span class="pc-kicker">{{ kind === 'diary' ? '批量日记' : '批量总结' }}</span>
        <h2>批量生成预览</h2>
      </div>
      <button
        class="pc-primary-btn"
        type="button"
        :disabled="saving || !canSave || !drafts.length"
        @click="saveAll"
      >
        <i class="fa-solid fa-floppy-disk"></i>
        <span>{{ saveButtonLabel }}</span>
      </button>
    </header>

    <div v-if="drafts.length" class="pc-segment pc-batch-preview-filter" role="tablist" aria-label="思维链筛选">
      <button
        v-for="option in filterOptions"
        :key="option.value"
        :class="['pc-segment-btn', { active: reasoningFilter === option.value }]"
        role="tab"
        type="button"
        :aria-selected="reasoningFilter === option.value"
        @click="reasoningFilter = option.value"
      >
        {{ option.label }} {{ option.count }}
      </button>
    </div>

    <EmptyState v-if="!drafts.length" title="没有待保存结果" />
    <EmptyState v-else-if="!filteredDrafts.length" title="当前筛选没有条目" />
    <div v-else class="pc-directory-list pc-batch-preview-list">
      <button
        v-for="draft in filteredDrafts"
        :key="draft.jobId"
        class="pc-list-row pc-batch-preview-row"
        type="button"
        @click="openDetail(draft.jobId)"
      >
        <span class="pc-list-row-copy">
          <strong>
            <span v-if="hasReasoning(draft)" class="pc-batch-preview-reasoning">[思]</span>
            {{ draft.title || '未命名条目' }}
          </strong>
          <small>{{ draft.label }}{{ kind === 'diary' && draft.occurredAt ? ` · ${draft.occurredAt}` : '' }}</small>
          <small v-if="draft.warnings.length" class="pc-batch-preview-warning">
            {{ draft.warnings.join('；') }}
          </small>
        </span>
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>

    <div class="pc-form-actions single">
      <button class="pc-soft-btn" type="button" :disabled="saving" @click="returnToBatch">
        <i class="fa-solid fa-arrow-left"></i>
        <span>返回</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import type { ManualBatchPreviewEdit, ManualBatchPreviewItem } from '@/core/manualBatchRunner';
import { usePhoneStore } from '@/store/phone';
import type { XmlParseResult } from '@/type/generation';

type BatchPreviewParsedData = {
  content: string;
  occurredAt?: string;
  title: string;
};

const props = defineProps<{
  canSave?: boolean;
  items: ManualBatchPreviewItem[];
  kind: 'diary' | 'summary';
  parseHandler: (rawOutput: string, occurredAt?: string) => XmlParseResult<BatchPreviewParsedData>;
  saveHandler: (edits: ManualBatchPreviewEdit[]) => Promise<void>;
}>();

const emit = defineEmits<{
  back: [edits: ManualBatchPreviewEdit[]];
  change: [edits: ManualBatchPreviewEdit[]];
}>();

type ReasoningFilter = 'all' | 'with' | 'without';
type BatchPreviewDraft = ManualBatchPreviewEdit &
  Pick<ManualBatchPreviewItem, 'label' | 'rawOutputSemantics'>;

const activeJobId = ref('');
const drafts = ref<BatchPreviewDraft[]>([]);
const phone = usePhoneStore();
const reasoningFilter = ref<ReasoningFilter>('all');
const saving = ref(false);

const activeDraft = computed(() => drafts.value.find(draft => draft.jobId === activeJobId.value) || null);
const reasoningCount = computed(() => drafts.value.filter(hasReasoning).length);
const filterOptions = computed(() => [
  { count: drafts.value.length, label: '全部', value: 'all' as const },
  { count: reasoningCount.value, label: '有思维链', value: 'with' as const },
  { count: drafts.value.length - reasoningCount.value, label: '无思维链', value: 'without' as const },
]);
const filteredDrafts = computed(() => {
  if (reasoningFilter.value === 'with') return drafts.value.filter(hasReasoning);
  if (reasoningFilter.value === 'without') return drafts.value.filter(draft => !hasReasoning(draft));
  return drafts.value;
});
const saveButtonLabel = computed(() => {
  if (saving.value) return '保存中';
  return props.canSave ? `保存全部（${drafts.value.length}）` : `完成后保存（${drafts.value.length}）`;
});

watch(
  () => props.items,
  items => {
    const currentDrafts = new Map(drafts.value.map(draft => [draft.jobId, draft]));
    drafts.value = items.map(item => {
      const current = currentDrafts.get(item.jobId);
      return current
        ? {
            ...current,
            label: item.label,
            rawOutputSemantics: item.rawOutputSemantics,
          }
        : {
            content: item.content,
            jobId: item.jobId,
            label: item.label,
            occurredAt: item.occurredAt,
            rawOutput: item.rawOutput,
            rawOutputSemantics: item.rawOutputSemantics,
            reasoning: item.generationRecord.reasoning || '',
            title: item.title,
            warnings: [...item.warnings],
          };
    });
    if (activeJobId.value && !drafts.value.some(draft => draft.jobId === activeJobId.value)) {
      activeJobId.value = '';
    }
  },
  { immediate: true },
);

function hasReasoning(draft: BatchPreviewDraft) {
  return Boolean(draft.reasoning.trim());
}

function getEdits(): ManualBatchPreviewEdit[] {
  return drafts.value.map(draft => ({
    content: draft.content,
    jobId: draft.jobId,
    occurredAt: draft.occurredAt,
    rawOutput: draft.rawOutput,
    reasoning: draft.reasoning,
    title: draft.title,
    warnings: [...draft.warnings],
  }));
}

function openDetail(jobId: string) {
  activeJobId.value = jobId;
}

function closeDetail() {
  emit('change', getEdits());
  activeJobId.value = '';
}

function onPhoneBack(event: Event) {
  if (!activeDraft.value) return;
  event.preventDefault();
  closeDetail();
}

function reparseActiveDraft() {
  const draft = activeDraft.value;
  if (!draft) return false;
  if (!draft.rawOutput.trim()) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = props.parseHandler(draft.rawOutput, draft.occurredAt);
  draft.warnings = [...parsed.warnings];
  if (!parsed.ok) {
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  draft.content = parsed.data.content;
  draft.title = parsed.data.title;
  if (props.kind === 'diary') draft.occurredAt = parsed.data.occurredAt || '';
  toastr.success('已按原始输出重新解析');
  return true;
}

function returnToBatch() {
  emit('back', getEdits());
}

async function saveAll() {
  saving.value = true;
  try {
    await props.saveHandler(getEdits());
  } finally {
    saving.value = false;
  }
}

onMounted(() => window.addEventListener('phone-before-back', onPhoneBack));
const stopNavigationGuard = phone.registerNavigationGuard(() => {
  emit('change', getEdits());
  return true;
});
onBeforeUnmount(() => {
  window.removeEventListener('phone-before-back', onPhoneBack);
  stopNavigationGuard();
});
</script>

<style scoped>
.pc-batch-preview-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.pc-batch-preview-head h2 {
  margin: 3px 0 0;
  color: var(--pc-text);
  font-size: 20px;
}

.pc-batch-preview-filter {
  width: 100%;
}

.pc-batch-preview-filter .pc-segment-btn {
  min-width: 0;
}

.pc-batch-preview-row {
  cursor: pointer;
}

.pc-batch-preview-row > i {
  color: var(--pc-muted);
}

.pc-batch-preview-reasoning {
  color: var(--pc-theme-accent);
}

.pc-batch-preview-warning {
  color: var(--pc-danger) !important;
}

.pc-batch-preview-detail {
  min-height: 100%;
}

.pc-batch-preview-fields {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}
</style>
