<template>
  <section class="pc-comfy-app">
    <section class="pc-comfy-page">
      <div class="pc-comfy-hero">
        <div>
          <span class="pc-kicker">{{ t`ComfyUI` }}</span>
          <h2>{{ settings.lastCheckedAt ? t`已读取配置` : t`未连接` }}</h2>
        </div>
        <button class="pc-primary-btn" type="button" :disabled="loading" @click="refresh">
          <i class="fa-solid fa-cloud-arrow-down"></i>
          <span>{{ loading ? t`读取中` : t`读取模型` }}</span>
        </button>
      </div>

      <article class="pc-section-card">
        <label class="pc-field-group pc-inline-field">
          <span>{{ t`接口地址` }}</span>
          <input v-model="settings.baseUrl" class="pc-field" type="text" placeholder="http://127.0.0.1:8188" />
        </label>
        <label class="pc-field-group pc-inline-field">
          <span>{{ t`请求方式` }}</span>
          <select v-model="settings.requestMode" class="pc-field pc-select">
            <option value="browser">{{ t`浏览器` }}</option>
            <option value="tavern">{{ t`酒馆` }}</option>
          </select>
        </label>
      </article>

      <nav class="pc-comfy-tabs" aria-label="ComfyUI 工作流类型">
        <button
          v-for="option in workflowKindOptions"
          :key="option.id"
          :class="['pc-comfy-tab', { active: activeKind === option.id }]"
          type="button"
          @click="selectKind(option.id)"
        >
          <span>{{ option.label }}</span>
          <small>{{ countWorkflowsByKind(option.id) }}</small>
        </button>
      </nav>

      <article class="pc-section-card">
        <div class="pc-section-head">
          <strong>{{ t`工作流库` }}</strong>
          <div class="pc-comfy-actions">
            <button class="pc-icon-btn" type="button" :title="t`新建`" :aria-label="t`新建`" @click="newWorkflow">
              <i class="fa-solid fa-plus"></i>
            </button>
            <button class="pc-icon-btn" type="button" :title="t`导入`" :aria-label="t`导入`" @click="triggerImport">
              <i class="fa-solid fa-file-import"></i>
            </button>
            <button class="pc-icon-btn" type="button" :title="t`复制`" :aria-label="t`复制`" :disabled="!activeWorkflow" @click="duplicateWorkflow">
              <i class="fa-solid fa-copy"></i>
            </button>
            <button class="pc-icon-btn danger" type="button" :title="t`删除`" :aria-label="t`删除`" :disabled="!activeWorkflow" @click="deleteWorkflow">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
        <label class="pc-field-group pc-inline-field">
          <span>{{ t`当前工作流` }}</span>
          <select :value="settings.activeWorkflowId" class="pc-field pc-select" @change="selectWorkflow">
            <option value="">{{ t`未选择` }}</option>
            <option v-for="workflow in filteredWorkflows" :key="workflow.id" :value="workflow.id">
              {{ workflow.name }} · {{ workflowKindLabel(workflow.kind) }}
            </option>
          </select>
        </label>
        <div class="pc-grid two pc-workflow-meta-grid">
          <label class="pc-field-group pc-inline-field">
            <span>{{ t`名称` }}</span>
            <input v-model="workflowNameModel" class="pc-field" type="text" :placeholder="t`例如：头像生图 / 音乐片段 / 短视频`" />
          </label>
          <label class="pc-field-group pc-inline-field">
            <span>{{ t`类型` }}</span>
            <select v-model="workflowKindModel" class="pc-field pc-select">
              <option v-for="option in workflowKindOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>
        </div>
        <input ref="importInputEl" class="pc-hidden-input" type="file" accept=".json,application/json" @change="importWorkflowFile" />
      </article>

      <article class="pc-section-card">
        <div class="pc-section-head pc-param-section-head">
          <strong>{{ t`基础运行参数` }}</strong>
          <div class="pc-param-section-actions">
            <span>{{ t`用户选择` }}</span>
            <button
              class="pc-icon-btn"
              type="button"
              :title="runtimeParametersOpen ? t`折叠基础运行参数` : t`展开基础运行参数`"
              :aria-label="runtimeParametersOpen ? t`折叠基础运行参数` : t`展开基础运行参数`"
              @click="runtimeParametersOpen = !runtimeParametersOpen"
            >
              <i :class="runtimeParametersOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
            </button>
          </div>
        </div>
        <div v-show="runtimeParametersOpen" class="pc-runtime-grid">
          <label class="pc-field-group pc-inline-field">
            <span>{{ t`模型` }}</span>
            <select v-if="settings.modelOptions.length" v-model="settings.checkpoint" class="pc-field pc-select">
              <option value="">{{ t`跟随工作流` }}</option>
              <option v-for="option in settings.modelOptions" :key="option" :value="option">{{ option }}</option>
            </select>
            <input v-else v-model="settings.checkpoint" class="pc-field" type="text" :placeholder="t`可先读取模型，或手动填写`" />
          </label>
          <label class="pc-field-group pc-inline-field">
            <span>{{ t`采样器` }}</span>
            <select v-if="settings.samplerOptions.length" v-model="settings.sampler" class="pc-field pc-select">
              <option value="">{{ t`跟随工作流` }}</option>
              <option v-for="option in settings.samplerOptions" :key="option" :value="option">{{ option }}</option>
            </select>
            <input v-else v-model="settings.sampler" class="pc-field" type="text" :placeholder="t`可先读取模型，或手动填写`" />
          </label>
          <label class="pc-field-group pc-inline-field">
            <span>{{ t`调度器` }}</span>
            <select v-if="settings.schedulerOptions.length" v-model="settings.scheduler" class="pc-field pc-select">
              <option value="">{{ t`跟随工作流` }}</option>
              <option v-for="option in settings.schedulerOptions" :key="option" :value="option">{{ option }}</option>
            </select>
            <input v-else v-model="settings.scheduler" class="pc-field" type="text" placeholder="normal" />
          </label>
          <label class="pc-field-group pc-inline-field">
            <span>{{ t`宽度` }}</span>
            <input v-model.number="settings.width" class="pc-field" type="number" min="1" />
          </label>
          <label class="pc-field-group pc-inline-field">
            <span>{{ t`高度` }}</span>
            <input v-model.number="settings.height" class="pc-field" type="number" min="1" />
          </label>
          <label class="pc-field-group pc-inline-field">
            <span>{{ t`步数` }}</span>
            <input v-model.number="settings.steps" class="pc-field" type="number" min="1" />
          </label>
          <label class="pc-field-group pc-inline-field">
            <span>{{ t`CFG` }}</span>
            <input v-model.number="settings.cfg" class="pc-field" type="number" min="0.1" step="0.1" />
          </label>
        </div>
      </article>

      <article v-if="workflowParameterGroups.length" class="pc-section-card">
        <div class="pc-section-head pc-param-section-head">
          <strong>{{ t`工作流参数` }}</strong>
          <div class="pc-param-section-actions">
            <span>{{ parameterModeSummary }}</span>
            <button class="pc-soft-btn compact" type="button" @click="cycleAllParameterModes">
              {{ t`切换` }}
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :title="workflowParametersOpen ? t`折叠工作流参数` : t`展开工作流参数`"
              :aria-label="workflowParametersOpen ? t`折叠工作流参数` : t`展开工作流参数`"
              @click="workflowParametersOpen = !workflowParametersOpen"
            >
              <i :class="workflowParametersOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
            </button>
          </div>
        </div>
        <div v-show="workflowParametersOpen" class="pc-workflow-param-body">
          <details v-for="group in workflowParameterGroups" :key="group.nodeId" class="pc-node-card" open>
            <summary>
              <strong>{{ group.nodeTitle }}</strong>
              <span>#{{ group.nodeId }} · {{ group.inputs.length }}</span>
            </summary>
            <div class="pc-param-list">
              <section v-for="item in group.inputs" :key="item.key" class="pc-param-row">
                <div class="pc-param-head">
                  <strong>{{ getMappingLabel(item) }}</strong>
                  <div class="pc-param-mode" role="group" :aria-label="`${item.inputName} 参数来源`">
                    <button
                      :class="['pc-segment-btn', { active: getParameterMode(item) === 'fixed' }]"
                      type="button"
                      @click="setParameterMode(item, 'fixed')"
                    >
                      {{ t`固定` }}
                    </button>
                    <button
                      :class="['pc-segment-btn', { active: getParameterMode(item) === 'user' }]"
                      type="button"
                      @click="setParameterMode(item, 'user')"
                    >
                      {{ t`用户参数` }}
                    </button>
                    <button
                      :class="['pc-segment-btn', { active: getParameterMode(item) === 'ai' }]"
                      type="button"
                      @click="setParameterMode(item, 'ai')"
                    >
                      {{ t`AI 生成` }}
                    </button>
                  </div>
                </div>
                <label v-if="getParameterMode(item) === 'user'" class="pc-field-group pc-inline-field">
                  <span>{{ t`参数值` }}</span>
                  <select v-if="item.options.length" :value="getMappingValue(item)" class="pc-field pc-select" @change="updateMapping(item, { value: ($event.target as HTMLSelectElement).value })">
                    <option value="">{{ t`跟随工作流原值` }}</option>
                    <option v-for="option in item.options" :key="option" :value="option">{{ option }}</option>
                  </select>
                  <select v-else-if="item.fieldKind === 'boolean'" :value="getMappingValue(item)" class="pc-field pc-select" @change="updateMapping(item, { value: ($event.target as HTMLSelectElement).value })">
                    <option value="">{{ t`跟随工作流原值` }}</option>
                    <option value="true">{{ t`是` }}</option>
                    <option value="false">{{ t`否` }}</option>
                  </select>
                  <input v-else :value="getMappingValue(item)" class="pc-field" :type="item.fieldKind === 'number' ? 'number' : 'text'" :placeholder="t`留空则跟随工作流原值`" @input="updateMapping(item, { value: ($event.target as HTMLInputElement).value })" />
                </label>
                <div v-else-if="getParameterMode(item) === 'ai'" class="pc-ai-param-fields">
                  <label class="pc-field-group pc-inline-field">
                    <span>{{ t`占位符` }}</span>
                    <input :value="getMappingPlaceholder(item)" class="pc-field" type="text" :placeholder="`{{${defaultPlaceholder(item)}}}`" @input="updateMapping(item, { placeholder: ($event.target as HTMLInputElement).value })" />
                  </label>
                  <label class="pc-field-group">
                    <span>{{ t`用户说明` }}</span>
                    <textarea
                      :value="getMappingDescription(item)"
                      class="pc-area compact pc-param-description"
                      :placeholder="t`说明这个参数的含义、取值范围或注意事项，生成时会一并交给 AI。`"
                      @input="updateMapping(item, { description: ($event.target as HTMLTextAreaElement).value })"
                    ></textarea>
                  </label>
                </div>
              </section>
            </div>
          </details>
        </div>
      </article>

      <article class="pc-section-card">
        <div class="pc-section-head">
          <strong>{{ t`工作流 JSON` }}</strong>
          <span>{{ activeWorkflow ? workflowKindLabel(activeWorkflow.kind) : t`先新建或导入` }}</span>
        </div>
        <textarea v-model="workflowJsonModel" class="pc-area pc-workflow-json-area" :placeholder="t`粘贴或导入 ComfyUI API 工作流 JSON`"></textarea>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { useComfyStore, type ComfyWorkflowInput, type ComfyWorkflowKind, type ComfyWorkflowParameterMapping } from './store';
import { usePhoneStore } from '@/store/phone';
import { storeToRefs } from 'pinia';

const comfy = useComfyStore();
const phone = usePhoneStore();
const { activeWorkflow, settings, workflowInputs } = storeToRefs(comfy);
const loading = ref(false);
const importInputEl = ref<HTMLInputElement | null>(null);
const activeKind = ref<ComfyWorkflowKind>('image');
const runtimeParametersOpen = ref(true);
const workflowParametersOpen = ref(true);
type ParameterMode = 'ai' | 'fixed' | 'user';
const parameterModeOrder: ParameterMode[] = ['fixed', 'user', 'ai'];
const workflowKindOptions: Array<{ id: ComfyWorkflowKind; label: string }> = [
  { id: 'image', label: '图片' },
  { id: 'audio', label: '音频' },
  { id: 'video', label: '视频' },
  { id: 'other', label: '通用' },
];
const runtimeInputNames = new Set([
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
const workflowParameterInputs = computed(() => workflowInputs.value.filter(item => !isRuntimeInput(item)));
const workflowParameterGroups = computed(() => {
  const groups = new Map<string, { inputs: typeof workflowInputs.value; nodeId: string; nodeTitle: string }>();
  workflowParameterInputs.value.forEach(input => {
    const group = groups.get(input.nodeId);
    if (group) {
      group.inputs.push(input);
      return;
    }
    groups.set(input.nodeId, {
      inputs: [input],
      nodeId: input.nodeId,
      nodeTitle: input.nodeTitle,
    });
  });
  return Array.from(groups.values());
});
const filteredWorkflows = computed(() => settings.value.workflows.filter(workflow => workflow.kind === activeKind.value));
const parameterModeSummary = computed(() => {
  const mappings = activeWorkflow.value?.paramMappings ?? {};
  const aiCount = workflowParameterInputs.value.filter(item => mappings[item.key]?.aiFill).length;
  const userCount = workflowParameterInputs.value.filter(item => mappings[item.key]?.exposed && !mappings[item.key]?.aiFill).length;
  const fixedCount = Math.max(0, workflowParameterInputs.value.length - aiCount - userCount);
  return `${aiCount} AI · ${userCount} 用户 · ${fixedCount} 固定`;
});
const workflowJsonModel = computed({
  get: () => activeWorkflow.value?.json || settings.value.workflowJson,
  set: value => comfy.updateActiveWorkflowJson(value),
});
const workflowNameModel = computed({
  get: () => activeWorkflow.value?.name || '',
  set: value => comfy.updateActiveWorkflowMeta({ name: value }),
});
const workflowKindModel = computed({
  get: () => activeWorkflow.value?.kind || 'image',
  set: value => {
    activeKind.value = value;
    comfy.updateActiveWorkflowMeta({ kind: value });
  },
});

watch(
  activeWorkflow,
  workflow => {
    if (workflow) activeKind.value = workflow.kind;
  },
  { immediate: true },
);

function workflowKindLabel(kind: ComfyWorkflowKind) {
  return workflowKindOptions.find(option => option.id === kind)?.label || '通用';
}

function countWorkflowsByKind(kind: ComfyWorkflowKind) {
  return settings.value.workflows.filter(workflow => workflow.kind === kind).length;
}

function selectKind(kind: ComfyWorkflowKind) {
  activeKind.value = kind;
  if (activeWorkflow.value?.kind === kind) return;
  const firstWorkflow = settings.value.workflows.find(workflow => workflow.kind === kind);
  if (firstWorkflow) comfy.setActiveWorkflow(firstWorkflow.id);
}

function selectWorkflow(event: Event) {
  comfy.setActiveWorkflow((event.target as HTMLSelectElement).value);
}

function newWorkflow() {
  comfy.createWorkflow({ kind: activeKind.value, name: '新工作流' });
  toastr.success('已新建工作流');
}

function duplicateWorkflow() {
  comfy.duplicateActiveWorkflow();
  toastr.success('已复制工作流');
}

async function deleteWorkflow() {
  if (!activeWorkflow.value) return;
  const confirmed = await phone.confirmNotice(`要删除工作流“${activeWorkflow.value.name}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  comfy.deleteActiveWorkflow();
  toastr.success('已删除工作流');
}

function triggerImport() {
  importInputEl.value?.click();
}

function importWorkflowFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const json = String(reader.result || '').trim();
    try {
      JSON.parse(json);
    } catch {
      toastr.error('导入失败：不是有效的 JSON');
      return;
    }
    comfy.createWorkflow({
      json,
      kind: activeKind.value,
      name: file.name.replace(/\.json$/i, '') || '导入工作流',
    });
    toastr.success('已导入工作流');
  };
  reader.readAsText(file);
}

async function refresh() {
  loading.value = true;
  try {
    const result = await comfy.refreshObjectInfo();
    toastr.success(`已读取 ${result.models} 个模型，${result.samplers} 个采样器，${result.schedulers} 个调度器，${result.nodes} 个工作流输入`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '读取 ComfyUI 失败');
  } finally {
    loading.value = false;
  }
}

function defaultMapping(item: ComfyWorkflowInput): ComfyWorkflowParameterMapping {
  return {
    aiFill: false,
    description: '',
    exposed: false,
    label: item.label,
    placeholder: '',
    value: '',
  };
}

function getMapping(item: ComfyWorkflowInput) {
  return activeWorkflow.value?.paramMappings[item.key] ?? defaultMapping(item);
}

function getMappingLabel(item: ComfyWorkflowInput) {
  return getMapping(item).label || item.label;
}

function getMappingPlaceholder(item: ComfyWorkflowInput) {
  return getMapping(item).placeholder;
}

function getMappingDescription(item: ComfyWorkflowInput) {
  return getMapping(item).description;
}

function getMappingValue(item: ComfyWorkflowInput) {
  const value = getMapping(item).value;
  return value === item.currentValue ? '' : value;
}

function isRuntimeInput(item: ComfyWorkflowInput) {
  const inputName = item.inputName.toLowerCase();
  const classType = item.classType.toLowerCase();
  if (runtimeInputNames.has(inputName)) return true;
  if (classType.includes('checkpoint') || classType.includes('loader')) {
    return inputName.includes('name') || inputName.includes('model') || inputName.includes('ckpt');
  }
  return false;
}

function defaultPlaceholder(item: ComfyWorkflowInput) {
  const name = item.inputName.toLowerCase();
  const title = item.nodeTitle.toLowerCase();
  if (name.includes('text') && title.includes('negative')) return 'negative_prompt';
  if (name.includes('text') || name.includes('prompt')) return 'prompt';
  if (name === 'seconds' || name.includes('duration')) return 'duration';
  if (name.includes('width')) return 'width';
  if (name.includes('height')) return 'height';
  if (name.includes('seed')) return 'seed';
  return `${item.nodeId}_${item.inputName}`.replace(/[^\w]+/g, '_');
}

function updateMapping(item: ComfyWorkflowInput, patch: Partial<ComfyWorkflowParameterMapping>) {
  comfy.setWorkflowParameterMapping(item.key, {
    label: item.label,
    ...patch,
  });
}

function getParameterMode(item: ComfyWorkflowInput): ParameterMode {
  const mapping = getMapping(item);
  if (mapping.aiFill) return 'ai';
  if (mapping.exposed) return 'user';
  return 'fixed';
}

function getNextParameterMode(mode: ParameterMode) {
  const index = parameterModeOrder.indexOf(mode);
  return parameterModeOrder[(index + 1) % parameterModeOrder.length];
}

function cycleAllParameterModes() {
  workflowParameterInputs.value.forEach(item => setParameterMode(item, getNextParameterMode(getParameterMode(item))));
}

function setParameterMode(item: ComfyWorkflowInput, mode: ParameterMode) {
  const current = getMapping(item);
  if (mode === 'fixed') {
    updateMapping(item, {
      aiFill: false,
      exposed: false,
      placeholder: '',
      value: '',
    });
    return;
  }
  if (mode === 'user') {
    updateMapping(item, {
      aiFill: false,
      exposed: true,
      placeholder: '',
      value: current.value === item.currentValue ? '' : current.value,
    });
    return;
  }
  updateMapping(item, {
    aiFill: true,
    exposed: true,
    placeholder: current.placeholder || `{{${defaultPlaceholder(item)}}}`,
    value: current.value === item.currentValue ? '' : current.value,
  });
}
</script>

<style scoped>
.pc-comfy-app,
.pc-comfy-page {
  min-height: 100%;
}

.pc-comfy-app {
  container-type: inline-size;
}

.pc-comfy-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-comfy-hero {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}

.pc-comfy-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}

.pc-comfy-hero h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.pc-grid {
  display: grid;
  gap: 10px;
}

.pc-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@container (max-width: 430px) {
  .pc-grid.two.pc-workflow-meta-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.pc-comfy-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.pc-comfy-tab {
  display: flex;
  min-width: 0;
  height: 42px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--pc-surface);
  color: var(--pc-text);
  cursor: pointer;
  font-weight: 900;
}

.pc-comfy-tab small {
  display: inline-grid;
  min-width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 999px;
  background: var(--pc-surface-strong);
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-comfy-tab.active {
  border-color: color-mix(in srgb, var(--pc-theme-accent) 42%, transparent);
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
}

.pc-workflow-json-area {
  min-height: 260px;
}

.pc-param-section-head {
  align-items: flex-start;
}

.pc-param-section-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.pc-param-section-actions > span {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}

.pc-workflow-param-body,
.pc-node-card {
  display: grid;
  gap: 10px;
}

.pc-node-card {
  padding: 12px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-node-card summary {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  list-style: none;
}

.pc-node-card summary::-webkit-details-marker {
  display: none;
}

.pc-node-card summary strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-node-card summary span {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-runtime-grid,
.pc-param-list {
  display: grid;
  gap: 10px;
}

.pc-param-list {
  padding-top: 10px;
}

.pc-ai-param-fields {
  display: grid;
  gap: 8px;
}

.pc-param-description {
  min-height: 74px;
}

.pc-param-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface);
}

.pc-param-head {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pc-param-head > strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-param-mode {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  flex: 0 0 auto;
  width: min(236px, 64%);
  gap: 5px;
}

.pc-param-mode .pc-segment-btn {
  min-width: 0;
  min-height: 30px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-muted);
  cursor: pointer;
  font-size: 11px;
  font-weight: 900;
  padding: 0 6px;
}

.pc-param-mode .pc-segment-btn.active {
  border-color: color-mix(in srgb, var(--pc-theme-accent) 44%, var(--pc-border) 56%);
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface-strong) 84%);
  color: var(--pc-theme-accent);
}

.pc-comfy-actions {
  display: flex;
  flex-wrap: wrap;
  flex: 1 1 auto;
  justify-content: center;
  gap: 6px;
}

@media (max-width: 420px) {
  .pc-param-section-head {
    align-items: stretch;
    flex-direction: column;
  }

  .pc-param-section-actions {
    justify-content: space-between;
  }

  .pc-param-head {
    align-items: stretch;
    flex-direction: column;
  }

  .pc-param-mode {
    width: 100%;
  }
}
</style>
