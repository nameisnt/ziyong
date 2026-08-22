<template>
  <div class="pc-generation-preview">
    <header v-if="showPreviewHeader" class="pc-generation-preview-head">
      <span class="pc-kicker">{{ sourceLabel }}</span>
      <h2 :title="title">{{ title }}</h2>
      <div class="pc-detail-meta">
        <span>{{ textProviderSummary }}</span>
        <span>{{ warnings.length ? `${warnings.length} 条提示` : successLabel }}</span>
      </div>
    </header>
    <div class="pc-preview-toolbar">
      <div class="pc-preview-toolbar-actions">
        <div class="pc-preview-mode-switch pc-segment" role="tablist" aria-label="预览内容视图">
          <button
            :class="['pc-segment-btn', 'compact', { active: activeView === 'preview' }]"
            role="tab"
            type="button"
            :aria-selected="activeView === 'preview'"
            @click="activeView = 'preview'"
          >
            {{ t`预览` }}
          </button>
          <button
            :class="['pc-segment-btn', 'compact', { active: activeView === 'raw' }]"
            role="tab"
            type="button"
            :aria-selected="activeView === 'raw'"
            @click="activeView = 'raw'"
          >
            {{ t`原文` }}
          </button>
          <button
            v-if="scanEnabled"
            :class="['pc-segment-btn', 'compact', { active: activeView === 'bagu' }]"
            role="tab"
            type="button"
            :aria-selected="activeView === 'bagu'"
            @click="activeView = 'bagu'"
          >
            {{ baguLabel }}
          </button>
        </div>
        <button
          v-if="activeView === 'preview' && copyEnabled"
          class="pc-icon-btn"
          type="button"
          :disabled="!content.trim()"
          :title="copyLabel"
          :aria-label="copyLabel"
          @click="copyContent"
        >
          <i class="fa-solid fa-copy"></i>
        </button>
        <button
          v-if="activeView === 'preview' && editable"
          class="pc-soft-btn compact"
          type="button"
          @click="editingContent = !editingContent"
        >
          {{ editingContent ? previewLabel : editLabel }}
        </button>
      </div>
    </div>
    <section class="pc-preview-panel">
      <div v-if="activeView === 'preview'" class="pc-preview-view">
        <div class="pc-preview-body">
          <ReasoningDisclosure
            v-if="!editingContent"
            :content="reasoning"
            :editable="reasoningEditable"
            @update:content="emit('update:reasoning', $event)"
          />
          <textarea
            v-if="editingContent"
            v-model="editableContent"
            class="pc-area pc-content-edit-area"
            :placeholder="contentPlaceholder"
          ></textarea>
          <slot v-else name="content" :display-content="displayContent" :rendered-content="renderedContent">
            <article class="pc-detail-content pc-rendered-markdown" v-html="renderedContent"></article>
          </slot>
          <slot v-if="!editingContent" name="after-content"></slot>
          <div v-if="warnings.length && !editingContent" class="pc-status-card warning">
            <strong>{{ warningTitle }}</strong>
            <p>{{ warnings.join('；') }}</p>
          </div>
        </div>
      </div>
      <BaguScanPanel
        v-else-if="activeView === 'bagu'"
        class="pc-preview-view"
        auto-scan
        :content="content"
        @apply="updateContent"
      />
      <RawOutputEditor
        v-else
        class="pc-preview-view"
        :editable="rawEditable"
        :model-value="raw"
        :placeholder="rawPlaceholder"
        :raw-output-semantics="rawOutputSemantics"
        :reparse-label="reparseLabel"
        :title="rawOutputLabel"
        @reparse="runReparse"
        @update:model-value="emit('update:raw', $event)"
      />
    </section>
    <div class="pc-preview-actions single">
      <button class="pc-primary-btn" type="button" :disabled="saveDisabled || saving" @click="handleSave">
        {{ saving ? savingLabel : saveLabel }}
      </button>
    </div>
    <section
      v-if="parseNoticeVisible"
      class="pc-modal-backdrop pc-preview-dialog-backdrop"
      role="presentation"
      @click.self="parseNoticeVisible = false"
    >
      <article
        ref="parseNoticeDialogRef"
        class="pc-section-card pc-modal-dialog pc-preview-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="parseNoticeTitle"
        tabindex="-1"
      >
        <h3>{{ parseNoticeTitle }}</h3>
        <p>{{ parseNoticeMessage }}</p>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="goRawFromNotice">{{ rawOutputLabel }}</button>
          <button class="pc-primary-btn" type="button" @click="parseNoticeVisible = false">
            {{ noticeConfirmLabel }}
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import BaguScanPanel from '@/components/BaguScanPanel.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import ReasoningDisclosure from '@/components/ReasoningDisclosure.vue';
import type { RawOutputSemantics } from '@/type/generation';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { usePhoneStore } from '@/store/phone';
import { applyRegexDisplayRules, getRegexRulesByIds } from '@/util/regexDisplay';
import { renderMarkdown } from '@/util/markdown';
import { formatAsTavernRegexedStringSafe } from '@/util/runtime';

type PreviewView = 'bagu' | 'preview' | 'raw';

const props = withDefaults(
  defineProps<{
    baguLabel?: string;
    backLabel?: string;
    content: string;
    contentLabel?: string;
    contentPlaceholder?: string;
    copyEnabled?: boolean;
    copyLabel?: string;
    editable?: boolean;
    editLabel?: string;
    noticeConfirmLabel?: string;
    parseNoticeMessage?: string;
    parseNoticeTitle?: string;
    previewLabel?: string;
    raw: string;
    rawEditable?: boolean;
    rawOutputSemantics?: RawOutputSemantics;
    rawOutputLabel?: string;
    rawPlaceholder?: string;
    reparseLabel?: string;
    reparseHandler?: () => boolean | Promise<boolean>;
    reasoning?: string;
    reasoningEditable?: boolean;
    saveDisabled?: boolean;
    saveLabel?: string;
    savingLabel?: string;
    scanEnabled?: boolean;
    shortContentGuard?: boolean;
    shortContentThreshold?: number;
    sourceLabel: string;
    successLabel?: string;
    textProviderSummary: string;
    title: string;
    warningTitle?: string;
    warnings: string[];
  }>(),
  {
    baguLabel: '八股',
    backLabel: '返回生成设置',
    contentLabel: '生成内容',
    contentPlaceholder: '在这里修改收到的 AI 输出内容。',
    copyEnabled: false,
    copyLabel: '复制生成内容',
    editable: true,
    editLabel: '编辑输出',
    noticeConfirmLabel: '知道了',
    parseNoticeMessage: '当前预览内容过短，已尝试按原始输出重新解析，但仍然失败。请打开原始输出修改 XML 后再保存。',
    parseNoticeTitle: '需要修复原始输出',
    previewLabel: '查看预览',
    rawEditable: false,
    rawOutputSemantics: 'original-v1',
    rawOutputLabel: '原始输出',
    rawPlaceholder: '在这里修改 AI 返回的原始 XML。',
    reparseLabel: '重新解析',
    reparseHandler: undefined,
    reasoning: '',
    reasoningEditable: false,
    saveDisabled: false,
    saveLabel: '保存',
    savingLabel: '保存中',
    scanEnabled: true,
    shortContentGuard: true,
    shortContentThreshold: 20,
    successLabel: 'XML 解析成功',
    warningTitle: '解析提示',
  },
);

const emit = defineEmits<{
  back: [];
  reparse: [];
  save: [];
  'update:content': [value: string];
  'update:raw': [value: string];
  'update:reasoning': [value: string];
}>();

const phone = usePhoneStore();
const regexDisplay = useRegexDisplayStore();
const activeView = ref<PreviewView>('preview');
const acceptedContent = ref(props.content);
const acceptedRaw = ref(props.raw);
const editingContent = ref(false);
const parseNoticeVisible = ref(false);
const parseNoticeDialogRef = ref<HTMLElement | null>(null);
const saving = ref(false);

usePhoneModalLifecycle({
  dialogRef: parseNoticeDialogRef,
  isOpen: () => parseNoticeVisible.value,
  onClose: () => {
    parseNoticeVisible.value = false;
  },
});

const editableContent = computed({
  get: () => props.content,
  set: updateContent,
});

const showPreviewHeader = computed(() => activeView.value === 'preview' && !editingContent.value);
const displayContent = computed(() => {
  const appId = phone.currentRoute.appId;
  const rules = getRegexRulesByIds(regexDisplay.rules, regexDisplay.getUsage(appId).displayRuleIds, 'replace');
  const tavernRegexedContent = formatAsTavernRegexedStringSafe(props.content, 'ai_output', 'display', { depth: 0 });
  return applyRegexDisplayRules(tavernRegexedContent, rules).content;
});
const renderedContent = computed(() => renderMarkdown(displayContent.value));
const contentHasPendingChanges = computed(() => props.content !== acceptedContent.value);
const rawHasPendingChanges = computed(() => props.raw.trim() !== acceptedRaw.value.trim());

watch(
  () => [props.sourceLabel, props.title],
  () => {
    acceptedContent.value = props.content;
    acceptedRaw.value = props.raw;
    activeView.value = 'preview';
    editingContent.value = false;
  },
);

function getVisibleTextLength(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~>#\-[\](){}|]/g, '')
    .replace(/\s+/g, '')
    .trim().length;
}

async function runReparse() {
  if (props.reparseHandler) {
    const ok = await props.reparseHandler();
    if (ok) {
      await nextTick();
      acceptedContent.value = props.content;
      acceptedRaw.value = props.raw;
      activeView.value = 'preview';
      editingContent.value = false;
    }
    return ok;
  }
  emit('reparse');
  return true;
}

function updateContent(value: string) {
  emit('update:content', value);
}

async function copyContent() {
  if (!props.content.trim()) return;
  try {
    await navigator.clipboard.writeText(props.content);
    toastr.success('已复制生成内容');
  } catch {
    toastr.warning('复制失败，请手动选择内容');
  }
}

async function handleSave() {
  if (props.saveDisabled || saving.value) return;
  saving.value = true;
  try {
    if (
      rawHasPendingChanges.value ||
      (props.shortContentGuard &&
        props.rawEditable &&
        !contentHasPendingChanges.value &&
        getVisibleTextLength(props.content) <= props.shortContentThreshold)
    ) {
      const reparsed = await runReparse();
      if (!reparsed) {
        parseNoticeVisible.value = true;
        return;
      }
    }
    emit('save');
  } finally {
    saving.value = false;
  }
}

function goRawFromNotice() {
  parseNoticeVisible.value = false;
  activeView.value = 'raw';
}
</script>

<style scoped>
.pc-generation-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.pc-generation-preview h2 {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pc-detail-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-detail-meta {
  color: var(--pc-muted);
}

.pc-detail-meta span {
  font-size: 12px;
  color: var(--pc-muted);
}

.pc-detail-content {
  min-height: 100%;
  padding: 16px;
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
  white-space: pre-wrap;
  color: var(--pc-reader-text, var(--pc-text));
  font-family: var(--pc-reader-font-family, inherit);
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
}

.pc-preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex: 0 0 auto;
}

.pc-preview-toolbar-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.pc-preview-panel {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.pc-preview-view {
  height: 100%;
  min-height: 0;
}

.pc-preview-mode-switch {
  justify-self: start;
}

.pc-preview-body {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.pc-content-edit-area {
  min-height: var(--pc-raw-editor-area-height, var(--pc-reader-body-height, 320px));
  height: var(--pc-raw-editor-area-height, var(--pc-reader-body-height, 320px));
  font-family: var(--pc-reader-font-family, inherit);
  color: var(--pc-reader-text, var(--pc-text));
  font-size: var(--pc-reader-font-size);
  line-height: var(--pc-reader-line-height);
  white-space: pre-wrap;
}

.pc-status-card {
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  background: var(--pc-surface-strong);
  padding: 14px;
}

.pc-status-card.warning {
  border-color: color-mix(in srgb, #f5a623 42%, var(--pc-border) 58%);
}

.pc-status-card p {
  color: var(--pc-muted);
}

.pc-preview-actions {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-preview-actions.single {
  grid-template-columns: minmax(0, 1fr);
}

.pc-preview-dialog-backdrop {
  --pc-modal-z: 20;
}

.pc-preview-dialog {
  width: min(100%, 320px);
}

.pc-preview-dialog h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.pc-preview-dialog p {
  margin: 0;
  color: var(--pc-muted);
  line-height: 1.55;
}

.pc-preview-dialog .pc-form-actions {
  margin-top: 16px;
}
</style>
