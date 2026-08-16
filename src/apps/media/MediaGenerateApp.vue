<template>
  <section class="pc-media-generate-app">
    <section
      class="pc-media-generate-page"
      :class="{
        'pc-generation-preview-page': route.page === 'preview',
        'pc-repair-page': route.page === 'failed-draft',
      }"
    >
      <div v-if="route.page === 'root'" class="pc-compact-toolbar pc-directory-toolbar pc-media-generate-toolbar">
        <span class="pc-directory-count">{{ activeWorkflowLabel }}</span>
        <button
          class="pc-icon-btn primary"
          type="button"
          :title="t`AI 填写参数`"
          :aria-label="t`AI 填写参数`"
          @click="openComfyGenerate"
        >
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </button>
      </div>

      <article v-if="route.page === 'root'" class="pc-media-generate-root">
        <div class="pc-section-head">
          <strong>{{ t`ComfyUI 生成` }}</strong>
          <span>{{ t`保存到相册/音乐/视频` }}</span>
        </div>
        <section v-if="exposedComfyInputs.length" class="pc-comfy-param-panel">
          <div class="pc-section-head compact">
            <strong>{{ t`工作流参数` }}</strong>
          </div>
          <label v-for="item in exposedComfyInputs" :key="item.key" class="pc-field-group pc-inline-field">
            <span>{{ comfyInputLabel(item) }}</span>
            <SearchableCombobox
              v-if="item.options.length"
              :input-label="`${comfyInputLabel(item)} 参数值`"
              :model-value="getComfyParamValue(item)"
              :options="comfyParameterOptions(item)"
              :placeholder="t`跟随工作流原值`"
              @update:model-value="setComfyParamValue(item, $event)"
            />
            <select
              v-else-if="item.fieldKind === 'boolean'"
              :value="getComfyParamValue(item)"
              class="pc-field pc-select"
              @change="setComfyParamValue(item, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">{{ t`跟随工作流原值` }}</option>
              <option value="true">{{ t`是` }}</option>
              <option value="false">{{ t`否` }}</option>
            </select>
            <input
              v-else
              :value="getComfyParamValue(item)"
              class="pc-field"
              :type="item.fieldKind === 'number' ? 'number' : 'text'"
              :placeholder="t`留空则跟随工作流原值`"
              @input="setComfyParamValue(item, ($event.target as HTMLInputElement).value)"
            />
          </label>
        </section>
        <EmptyState v-else :title="t`没有用户参数`">
          <p>{{ t`可直接用固定参数生成，或到 ComfyUI 设置里把节点切换为用户参数。` }}</p>
        </EmptyState>
        <div class="pc-form-actions">
          <button class="pc-primary-btn" type="button" :disabled="generating" @click="generateWithComfy">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>{{ generating ? t`生成中` : t`生成并保存` }}</span>
          </button>
        </div>

        <FailedDraftList
          :drafts="failedDrafts"
          :get-context="failedDraftSourceLabel"
          :get-title="failedDraftTitle"
          @open="openFailedDraft"
          @remove="removeFailedDraft"
        />

        <PreviewDraftNotice
          :draft="mediaPreviewDraft"
          @discard="discardMediaPreviewDraft"
          @open="openMediaPreviewDraft"
        />
      </article>

      <article v-else-if="route.page === 'generate'" class="pc-media-generate-form">
        <GenerationPanel
          :capture="captureComfyPrompt"
          :capture-reset-key="comfyPromptPreview"
          :error="generationError"
          :from-start-end="generationDraft.fromStartEnd"
          :range-text="generationDraft.rangeText"
          :raw-output="generationRawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          :running="generationRunning"
          :single-message-id="generationDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="generationDraft.userRequirement"
          requirement-label="生成要求"
          requirement-placeholder="例如：根据当前剧情生成一张昏暗走廊里的角色场景图，情绪压抑但不要血腥。"
          @cancel="phone.goBack()"
          @generate="runComfyGeneration"
          @stop="stopGeneration"
          @update:from-start-end="generationDraft.fromStartEnd = $event"
          @update:range-text="generationDraft.rangeText = $event"
          @update:recent-count="generationDraft.recentCount = $event"
          @update:references="selectedReferences = $event"
          @update:single-message-id="generationDraft.singleMessageId = $event"
          @update:source-mode="settings.generation.sourceMode = $event"
          @update:user-requirement="generationDraft.userRequirement = $event"
        >
          <template #before-fields>
            <label class="pc-field-group">
              <span>{{ t`工作流` }}</span>
              <SearchableCombobox
                input-label="选择 ComfyUI 工作流"
                :model-value="comfy.settings.activeWorkflowId"
                :options="comfyWorkflowOptions"
                :placeholder="t`未选择`"
                @update:model-value="comfy.setActiveWorkflow($event)"
              />
            </label>
          </template>
          <template #after-requirement>
            <section v-if="aiFillComfyInputs.length" class="pc-comfy-param-panel">
              <div class="pc-section-head compact">
                <strong>{{ t`AI 可填写参数` }}</strong>
                <span>{{ aiFillComfyInputs.length }}</span>
              </div>
              <p class="pc-muted-line">{{ aiFillComfyInputs.map(item => comfyInputLabel(item)).join('、') }}</p>
            </section>
          </template>
        </GenerationPanel>
      </article>

      <article v-else-if="route.page === 'preview' && generationState.preview" class="pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="previewParamsText"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          :scan-enabled="false"
          :short-content-guard="false"
          :source-label="generationState.preview.source.label"
          :text-provider-summary="textProviderSummary"
          :title="generationState.preview.title"
          :warnings="generationState.preview.warnings"
          content-label="工作流参数"
          :editable="false"
          :save-disabled="generating"
          :save-label="generating ? '生成中' : '生成并保存媒体'"
          @back="returnToGenerate"
          @reparse="reparsePreviewRaw"
          @save="saveComfyPreview"
          @update:raw="generationState.preview.raw = $event"
        >
          <template #content>
            <section class="pc-comfy-preview">
              <strong>{{ t`参数` }}</strong>
              <div v-if="generationState.preview.params.length" class="pc-comfy-param-preview-list">
                <label v-for="item in generationState.preview.params" :key="item.key" class="pc-field-group">
                  <span>{{ item.key }}</span>
                  <textarea
                    :value="item.value"
                    class="pc-area compact pc-param-preview-area"
                    @input="updatePreviewParam(item.key, ($event.target as HTMLTextAreaElement).value)"
                  ></textarea>
                </label>
              </div>
              <p v-else>{{ t`未填写` }}</p>
            </section>
          </template>
        </GenerationPreviewPanel>
      </article>

      <article v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-repair-card">
        <div v-if="activeFailedDraft.warnings.length" class="pc-status-card warning">
          <strong>{{ t`上次解析提示` }}</strong>
          <p>{{ activeFailedDraft.warnings.join('；') }}</p>
        </div>
        <div class="pc-number-field pc-repair-raw-field">
          <span class="pc-field-label">{{ t`原始输出` }}</span>
          <RawOutputEditor
            v-model="failedDraftRawOutput"
            :placeholder="t`在这里修 XML 结构或补 params。`"
            @reparse="reparseFailedDraft"
          />
        </div>
        <div class="pc-form-actions">
          <button class="pc-soft-btn danger" type="button" @click="removeFailedDraft(activeFailedDraft.id)">
            {{ t`删除草稿` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="reparseFailedDraft">{{ t`重新解析` }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
import { parseComfyPromptXmlResult, type ComfyPromptResult } from '@/apps/comfy/generation';
import { useComfyStore, type ComfyWorkflowInput } from '@/apps/comfy/store';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { FailedGenerationDraft } from '@/type/generation';
import type { GenerationTask } from '@/type/generationTask';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import type { GenerationReferenceItem } from '@/util/references';
import { formatGenerationReferences } from '@/util/references';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { formatTextProviderSummary } from '@/util/textProvider';
import { getMediaKindLabel, useMediaStore } from './store';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const comfy = useComfyStore();
const media = useMediaStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const adapter = getRegisteredPhoneGenerationAdapter('comfy', 'generate-prompt');
const { activeWorkflow, workflowInputs } = storeToRefs(comfy);
const { failedDrafts } = storeToRefs(media);
const { settings } = storeToRefs(settingsStore);
const route = computed(() => phone.currentRoute);
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const failedDraftRawOutput = ref('');
const comfyParams = reactive<Record<string, string>>({});
const generating = ref(false);
const generationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  preview: null as null | {
    negativePrompt: string;
    draftId: null | string;
    note: string;
    params: ComfyPromptResult['params'];
    prompt: string;
    raw: string;
    source: { label: string };
    title: string;
    warnings: string[];
    workflowId: string;
  },
});
const generationSession = useSingleGenerationTaskSession({
  actionId: 'generate-prompt',
  appId: 'media',
  sourcePage: 'generate',
  title: 'AI 媒体 · 单次生成',
});
const { error: generationError, rawOutput: generationRawOutput, running: generationRunning } = generationSession;
type MediaPreview = NonNullable<typeof generationState.preview>;

const {
  clearPreviewDraft: clearMediaPreviewDraft,
  discardPreviewDraft: discardMediaPreviewDraft,
  draft: mediaPreviewDraft,
  openPreviewDraft: openMediaPreviewDraft,
  persistPreviewDraft: persistMediaPreviewDraft,
} = usePreviewDraftPersistence<MediaPreview>({
  appId: 'media',
  consumeFailedDraft: draftId => media.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '媒体预览',
});
const runtimeComfyInputNames = new Set([
  'checkpoint',
  'ckpt_name',
  'cfg',
  'height',
  'model_name',
  'sampler_name',
  'scheduler',
  'steps',
  'unet_name',
  'width',
]);

const exposedComfyInputs = computed(() => {
  const mappings = activeWorkflow.value?.paramMappings ?? {};
  return workflowInputs.value.filter(
    item => mappings[item.key]?.exposed && !mappings[item.key]?.aiFill && !isRuntimeComfyInput(item),
  );
});
const aiFillComfyInputs = computed(() => {
  const mappings = activeWorkflow.value?.paramMappings ?? {};
  return workflowInputs.value.filter(item => mappings[item.key]?.aiFill && !isRuntimeComfyInput(item));
});
const activeWorkflowLabel = computed(() => {
  const workflow = activeWorkflow.value;
  if (!workflow) return '未选择工作流';
  return `${workflow.name} · ${getMediaKindLabel(workflow.kind === 'other' ? 'image' : workflow.kind)}`;
});
const comfyWorkflowOptions = computed(() => {
  const options = comfy.settings.workflows.map(workflow => ({
    label: `${workflow.name} · ${getMediaKindLabel(workflow.kind === 'other' ? 'image' : workflow.kind)}`,
    value: workflow.id,
  }));
  const selected = comfy.settings.activeWorkflowId;
  if (selected && !options.some(option => option.value === selected)) {
    options.unshift({ label: '当前工作流已失效', value: selected });
  }
  return [{ label: '未选择', value: '' }, ...options];
});
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const activeFailedDraft = computed(() =>
  route.value.params?.draftId ? media.getFailedDraft(route.value.params.draftId) : null,
);
const textProviderSummary = computed(() =>
  settings.value.textProvider.mode === 'external'
    ? formatTextProviderSummary(settings.value.textProvider)
    : `酒馆当前 API · ${settings.value.generation.tavernPresetName.trim() || '跟随当前预设'}`,
);
const comfyPromptPreview = computed(() => {
  try {
    return buildGenerationPreview(adapter, buildGenerationConfig(), getGenerationOptions()).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});
const previewParamsText = computed(() =>
  generationState.preview ? formatComfyParams(generationState.preview.params) : '',
);

watch(
  () => [route.value.appId, route.value.page, route.value.params?.draftId] as const,
  ([appId, page]) => {
    if (appId !== 'media' || page !== 'failed-draft') return;
    failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
  },
  { immediate: true },
);

useInvalidRouteFallback({
  source: () => ({
    appId: route.value.appId,
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'media' &&
    ((current.page === 'preview' && !current.hasPreview) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId !== 'media') return;
    phone.replacePage('root', '媒体生成');
  },
});

function openComfyGenerate() {
  generationState.preview = null;
  phone.pushPage('generate', 'AI 媒体');
}

function openFailedDraft(draftId: string) {
  if (!media.getFailedDraft(draftId)) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function failedDraftTitle() {
  return '未解析媒体参数';
}

function failedDraftSourceLabel(draft: FailedGenerationDraft) {
  return draft.source.label;
}

function normalizePlaceholder(value: string) {
  return value
    .trim()
    .replace(/^\{\{\s*/, '')
    .replace(/\s*\}\}$/, '')
    .trim();
}

function isRuntimeComfyInput(item: ComfyWorkflowInput) {
  const inputName = item.inputName.toLowerCase();
  const classType = item.classType.toLowerCase();
  if (runtimeComfyInputNames.has(inputName)) return true;
  if (classType.includes('checkpoint') || classType.includes('loader')) {
    return inputName.includes('name') || inputName.includes('model') || inputName.includes('ckpt');
  }
  return false;
}

function comfyParamKey(item: ComfyWorkflowInput) {
  const mapping = activeWorkflow.value?.paramMappings[item.key];
  return normalizePlaceholder(mapping?.placeholder || '') || item.key;
}

function comfyInputLabel(item: ComfyWorkflowInput) {
  const mapping = activeWorkflow.value?.paramMappings[item.key];
  return mapping?.label || item.label;
}

function comfyInputDescription(item: ComfyWorkflowInput) {
  return activeWorkflow.value?.paramMappings[item.key]?.description?.trim() || '';
}

function getComfyParamValue(item: ComfyWorkflowInput) {
  const key = comfyParamKey(item);
  const mapping = activeWorkflow.value?.paramMappings[item.key];
  const mappedValue = mapping?.value ?? '';
  return comfyParams[key] ?? (mappedValue === item.currentValue ? '' : mappedValue);
}

function comfyParameterOptions(item: ComfyWorkflowInput) {
  const selected = getComfyParamValue(item);
  const options = item.options.map(option => ({ label: option, value: option }));
  if (selected && !options.some(option => option.value === selected)) {
    options.unshift({ label: `当前值：${selected}`, value: selected });
  }
  return [{ label: '跟随工作流原值', value: '' }, ...options];
}

function setComfyParamValue(item: ComfyWorkflowInput, value: string) {
  comfyParams[comfyParamKey(item)] = value;
}

function buildComfyParams() {
  const params: Record<string, string> = {};
  exposedComfyInputs.value.forEach(item => {
    const key = comfyParamKey(item);
    const value = getComfyParamValue(item).trim();
    if (value) params[key] = value;
  });
  return params;
}

function buildAvailableComfyParams() {
  return aiFillComfyInputs.value
    .map(item => {
      const key = comfyParamKey(item);
      if (!key) return '';
      const description = comfyInputDescription(item);
      return `- ${key}：${comfyInputLabel(item)}${description ? `\n  说明：${description}` : ''}`;
    })
    .filter(Boolean)
    .join('\n');
}

function buildComfyOutputFormat() {
  return prompts.resolveOutputFormat('comfy.generate');
}

function buildGenerationConfig() {
  const workflow = activeWorkflow.value;
  return {
    appPrompt: prompts.appPrompts.comfy,
    availableParams: buildAvailableComfyParams(),
    kind: workflow?.kind || 'image',
    outputFormat: buildComfyOutputFormat(),
    userRequirement: generationDraft.userRequirement,
    workflowId: workflow?.id || '',
    workflowName: workflow?.name || '未选择工作流',
  };
}

function getGenerationOptions() {
  return {
    generationDefaults: {
      resultMode: settings.value.generation.resultMode,
      stream: settings.value.generation.stream,
      tavernPresetName: settings.value.generation.tavernPresetName,
    },
    references: formattedReferences.value,
    source: {
      fromStartEnd: generationDraft.fromStartEnd,
      mode: settings.value.generation.sourceMode,
      rangeText: generationDraft.rangeText,
      recentCount: generationDraft.recentCount,
      singleMessageId: generationDraft.singleMessageId,
    },
    textProvider: settings.value.textProvider,
  };
}

function captureComfyPrompt() {
  return captureGenerationPrompt(adapter, buildGenerationConfig(), getGenerationOptions());
}

async function generateWithComfy() {
  const params = buildComfyParams();
  if (!activeWorkflow.value) {
    toastr.warning('请先在 ComfyUI 设置中选择或导入工作流');
    return;
  }
  generating.value = true;
  try {
    const generated = await comfy.generateMedia({
      params,
    });
    if (!generated.length) {
      toastr.warning('ComfyUI 已完成，但没有找到可保存的媒体输出');
      return;
    }
    generated.forEach(item => {
      media.createEntry({
        kind: item.kind,
        note: formatComfyParamsRecord(params),
        source: 'comfy',
        title: item.title,
        url: item.url,
      });
    });
    toastr.success(`已保存 ${generated.length} 个输出，可到相册/音乐/视频查看`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : 'ComfyUI 生成失败');
  } finally {
    generating.value = false;
  }
}

function paramsArrayToRecord(params: ComfyPromptResult['params']) {
  return Object.fromEntries(
    params.map(item => [normalizePlaceholder(item.key), item.value]).filter(([key, value]) => key && value),
  );
}

function formatComfyParams(params: ComfyPromptResult['params']) {
  return params.map(item => `${item.key}: ${item.value}`).join('\n');
}

function formatComfyParamsRecord(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function updatePreviewParam(key: string, value: string) {
  if (!generationState.preview) return;
  const item = generationState.preview.params.find(param => param.key === key);
  if (item) item.value = value;
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = parseComfyPromptXmlResult(rawOutput);
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  preview.negativePrompt = parsed.data.negativePrompt;
  preview.note = parsed.data.note;
  preview.params = parsed.data.params;
  preview.prompt = parsed.data.prompt;
  preview.raw = parsed.raw;
  preview.title = parsed.data.title;
  preview.warnings = parsed.warnings;
  toastr.success('已按原始输出重新解析');
  return true;
}

async function runComfyGeneration() {
  if (!activeWorkflow.value) {
    toastr.warning('请先在 ComfyUI 设置中选择或导入工作流');
    return;
  }
  clearMediaPreviewDraft();
  generationState.preview = null;
  let task: GenerationTask | null = null;
  try {
    task = generationSession.create({
      sourceParams: activeWorkflow.value ? { workflowId: activeWorkflow.value.id } : {},
      title: activeWorkflow.value ? `AI 媒体 · ${activeWorkflow.value.name}` : 'AI 媒体 · 单次生成',
    });
    const result = await generateContent(adapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => media.createFailedDraft(input),
      lifecycle: generationSession.lifecycle(task.id),
    });

    if (result.status === 'failed') {
      generationSession.complete(task.id, {
        currentLabel: '解析失败草稿已保留',
        resultPage: 'failed-draft',
        resultParams: { draftId: result.draft.id },
        resultState: 'failed-draft',
        resultTitle: '解析失败草稿',
      });
      toastr.warning('XML 解析失败，已保存失败草稿');
      void phone.presentGeneratedPage('media', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      generationSession.complete(task.id, {
        currentLabel: `已保存 ${result.saved.entries.length} 个媒体`,
        resultPage: 'root',
        resultState: 'saved',
        resultTitle: '媒体生成',
      });
      toastr.success(`已生成并保存 ${result.saved.entries.length} 个媒体`);
      void phone.presentGeneratedPage('media', 'root', '媒体生成');
      return;
    }

    generationState.preview = {
      negativePrompt: result.data.negativePrompt,
      draftId: null,
      note: result.data.note,
      params: result.data.params,
      prompt: result.data.prompt,
      raw: result.rawOutput,
      source: { label: result.source.label },
      title: result.data.title,
      warnings: result.warnings,
      workflowId: activeWorkflow.value.id,
    };
    persistMediaPreviewDraft();
    generationSession.complete(task.id, {
      currentLabel: '媒体提示词已生成，等待确认',
      resultPage: 'preview',
      resultState: 'preview',
      resultTitle: '媒体预览',
    });
    void phone.presentGeneratedPage('media', 'preview', '媒体预览');
  } catch (caughtError) {
    if (task) generationSession.fail(task.id, caughtError);
    else toastr.error(caughtError instanceof Error ? caughtError.message : '生成 ComfyUI 输入失败');
  }
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  phone.replacePage('generate', 'AI 媒体');
}

async function saveComfyPreview() {
  const preview = generationState.preview;
  if (!preview) return;
  if (generating.value) return;
  if (preview.workflowId) comfy.setActiveWorkflow(preview.workflowId);
  generating.value = true;
  try {
    const generated = await comfy.generateMedia({
      negativePrompt: preview.negativePrompt,
      params: paramsArrayToRecord(preview.params),
      prompt: preview.prompt,
    });
    if (!generated.length) {
      toastr.warning('ComfyUI 已完成，但没有找到可保存的媒体输出');
      return;
    }
    generated.forEach(item => {
      media.createEntry({
        kind: item.kind,
        note: [preview.note, previewParamsText.value].filter(Boolean).join('\n\n'),
        source: 'comfy',
        title: preview.title || item.title,
        url: item.url,
      });
    });
    if (preview.draftId) media.deleteFailedDraft(preview.draftId);
    clearMediaPreviewDraft();
    generationState.preview = null;
    phone.replacePage('root', '媒体生成');
    toastr.success(`已保存 ${generated.length} 个输出，可到相册/音乐/视频查看`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : 'ComfyUI 生成失败');
  } finally {
    generating.value = false;
  }
}

function activateWorkflowFromDraft(draft: FailedGenerationDraft) {
  const workflowId = typeof draft.context.workflowId === 'string' ? draft.context.workflowId : '';
  if (workflowId) comfy.setActiveWorkflow(workflowId);
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  media.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') phone.replacePage('root', '媒体生成');
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const draft = activeFailedDraft.value;
  if (!draft) return;
  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return;
  }

  const parsed = parseComfyPromptXmlResult(rawOutput);
  if (!parsed.ok) {
    media.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  media.updateFailedDraft(draft.id, {
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  activateWorkflowFromDraft(draft);
  generationState.preview = {
    negativePrompt: parsed.data.negativePrompt,
    draftId: null,
    note: parsed.data.note,
    params: parsed.data.params,
    prompt: parsed.data.prompt,
    raw: parsed.raw,
    source: { label: draft.source.label },
    title: parsed.data.title,
    warnings: parsed.warnings,
    workflowId: typeof draft.context.workflowId === 'string' ? draft.context.workflowId : '',
  };
  persistMediaPreviewDraft();
  media.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '媒体预览');
}

function stopGeneration() {
  generationSession.stop();
}
</script>

<style scoped>
.pc-media-generate-app,
.pc-media-generate-page {
  min-height: 100%;
}

.pc-media-generate-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-media-generate-root,
.pc-media-generate-form,
.pc-repair-card {
  display: grid;
  gap: 12px;
}

.pc-section-head.compact {
  margin-bottom: 2px;
}

.pc-comfy-param-panel {
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-muted-line {
  margin: 0;
  overflow: hidden;
  color: var(--pc-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-comfy-preview {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  padding: 14px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-comfy-preview p {
  margin: 0;
  color: var(--pc-muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.pc-comfy-param-preview-list {
  display: grid;
  gap: 10px;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
