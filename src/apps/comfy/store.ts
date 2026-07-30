import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { getRequestHeaders, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const comfyField = 'sillytavern_phone_comfy';

const ComfyWorkflowKindSchema = z.enum(['audio', 'image', 'other', 'video']);
export type ComfyWorkflowKind = z.infer<typeof ComfyWorkflowKindSchema>;

const ComfyWorkflowParameterMappingSchema = z.object({
  aiFill: z.boolean().default(false),
  description: z.string().default(''),
  exposed: z.boolean().default(false),
  label: z.string().default(''),
  placeholder: z.string().default(''),
  value: z.string().default(''),
});
export type ComfyWorkflowParameterMapping = z.infer<typeof ComfyWorkflowParameterMappingSchema>;

const ComfyWorkflowSchema = z.object({
  id: z.string(),
  json: z.string().default(''),
  kind: ComfyWorkflowKindSchema.default('image'),
  name: z.string().default('未命名工作流'),
  nodeSelections: z.record(z.string(), z.record(z.string(), z.string())).default({}),
  paramMappings: z.record(z.string(), ComfyWorkflowParameterMappingSchema).default({}),
  updatedAt: z.string().default(''),
});
export type ComfyWorkflow = z.infer<typeof ComfyWorkflowSchema>;

const ComfySettingsSchema = z.object({
  activeWorkflowId: z.string().default(''),
  baseUrl: z.string().default('http://127.0.0.1:8188'),
  checkpoint: z.string().default(''),
  sampler: z.string().default(''),
  scheduler: z.string().default('normal'),
  requestMode: z.enum(['browser', 'tavern']).default('browser'),
  width: z.number().int().positive().default(1024),
  height: z.number().int().positive().default(1024),
  steps: z.number().int().positive().default(20),
  cfg: z.number().positive().default(7),
  workflowJson: z.string().default(''),
  modelOptions: z.array(z.string()).default([]),
  samplerOptions: z.array(z.string()).default([]),
  schedulerOptions: z.array(z.string()).default([]),
  workflows: z.array(ComfyWorkflowSchema).default([]),
  workflowNodeSelections: z.record(z.string(), z.record(z.string(), z.string())).default({}),
  lastCheckedAt: z.string().default(''),
});
export type ComfySettings = z.infer<typeof ComfySettingsSchema>;

export interface ComfyWorkflowInput {
  classType: string;
  currentValue: string;
  fieldKind: 'boolean' | 'number' | 'string';
  inputName: string;
  key: string;
  label: string;
  nodeId: string;
  nodeTitle: string;
  options: string[];
}

export interface ComfyGeneratedMedia {
  filename: string;
  kind: 'audio' | 'image' | 'video';
  title: string;
  url: string;
}

function readSettings(raw: unknown): ComfySettings {
  try {
    const settings = validateInplace(ComfySettingsSchema, raw && typeof raw === 'object' ? raw : {});
    migrateWorkflowSettings(settings);
    return settings;
  } catch {
    const settings = validateInplace(ComfySettingsSchema, {});
    migrateWorkflowSettings(settings);
    return settings;
  }
}

function createWorkflowId() {
  return `workflow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function inferWorkflowName(json: string) {
  try {
    const workflow = JSON.parse(json) as Record<string, unknown>;
    const saveNode = Object.values(workflow).find(node => {
      if (!node || typeof node !== 'object') return false;
      const record = node as Record<string, unknown>;
      return String(record.class_type || '')
        .toLowerCase()
        .includes('save');
    }) as Record<string, unknown> | undefined;
    const title = String((saveNode?._meta as Record<string, unknown> | undefined)?.title || '').trim();
    return title || '导入工作流';
  } catch {
    return '导入工作流';
  }
}

function migrateWorkflowSettings(settings: ComfySettings) {
  if (!settings.workflows.length && settings.workflowJson.trim()) {
    const workflow: ComfyWorkflow = {
      id: createWorkflowId(),
      json: settings.workflowJson,
      kind: 'image',
      name: inferWorkflowName(settings.workflowJson),
      nodeSelections: klona(settings.workflowNodeSelections),
      paramMappings: {},
      updatedAt: nowIso(),
    };
    settings.workflows.push(workflow);
    settings.activeWorkflowId = workflow.id;
  }
  if (!settings.activeWorkflowId && settings.workflows[0]) {
    settings.activeWorkflowId = settings.workflows[0].id;
  }
  const activeWorkflow =
    settings.workflows.find(workflow => workflow.id === settings.activeWorkflowId) ?? settings.workflows[0];
  if (activeWorkflow) {
    settings.activeWorkflowId = activeWorkflow.id;
    settings.workflowJson = activeWorkflow.json;
    settings.workflowNodeSelections = activeWorkflow.nodeSelections;
  }
}

function cleanBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

function buildHttpFallbackUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:') return '';
    url.protocol = 'http:';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function extractStringOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item || '').trim()).filter(Boolean);
}

function uniqueOptions(...groups: string[][]) {
  const seen = new Set<string>();
  return groups.flat().filter(option => {
    if (!option || seen.has(option)) return false;
    seen.add(option);
    return true;
  });
}

function extractValueOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return String(record.value ?? record.name ?? record.text ?? '').trim();
      }
      return String(item || '').trim();
    })
    .filter(Boolean);
}

function replaceAllLiteral(value: string, search: string, replacement: string) {
  return value.split(search).join(replacement);
}

function getActiveWorkflowFromSettings(settings: ComfySettings) {
  return (
    settings.workflows.find(workflow => workflow.id === settings.activeWorkflowId) ?? settings.workflows[0] ?? null
  );
}

function getActiveWorkflowJson(settings: ComfySettings) {
  return getActiveWorkflowFromSettings(settings)?.json || settings.workflowJson;
}

function getActiveWorkflowSelections(settings: ComfySettings) {
  return getActiveWorkflowFromSettings(settings)?.nodeSelections ?? settings.workflowNodeSelections;
}

function getActiveWorkflowParamMappings(settings: ComfySettings) {
  return getActiveWorkflowFromSettings(settings)?.paramMappings ?? {};
}

function workflowInputKey(nodeId: string, inputName: string) {
  return `${nodeId}:${inputName}`;
}

function normalizePlaceholder(value: string) {
  return value
    .trim()
    .replace(/^\{\{\s*/, '')
    .replace(/\s*\}\}$/, '')
    .trim();
}

function buildWorkflowJson(
  settings: ComfySettings,
  prompt: string,
  negativePrompt: string,
  params: Record<string, string> = {},
) {
  const replacements: Array<[string, string]> = [];
  Object.entries(params).forEach(([key, value]) => {
    const normalizedKey = normalizePlaceholder(key);
    if (!normalizedKey) return;
    replacements.push([`{{${normalizedKey}}}`, value]);
  });
  replacements.push(
    ['{{prompt}}', prompt],
    ['{{negative}}', negativePrompt],
    ['{{width}}', String(settings.width)],
    ['{{height}}', String(settings.height)],
    ['{{steps}}', String(settings.steps)],
    ['{{cfg}}', String(settings.cfg)],
    ['{{checkpoint}}', settings.checkpoint],
    ['{{sampler}}', settings.sampler],
    ['{{scheduler}}', settings.scheduler],
  );
  return replacements.reduce(
    (text, [search, replacement]) => replaceAllLiteral(text, search, replacement),
    getActiveWorkflowJson(settings),
  );
}

const workflowInputLabels: Record<string, string> = {
  bbox_detector: '检测模型',
  checkpoint: '模型',
  ckpt_name: '模型',
  clip_name: 'CLIP',
  clip_name1: 'CLIP 1',
  clip_name2: 'CLIP 2',
  clip_vision_name: 'CLIP Vision',
  control_net_name: 'ControlNet',
  controlnet_name: 'ControlNet',
  embedding_name: 'Embedding',
  lora_name: 'LORA',
  model_name: '模型',
  sam_model_name: 'SAM',
  sampler_name: '采样器',
  scheduler: '调度器',
  style_model_name: '风格模型',
  upscale_model_name: '放大模型',
  unet_name: 'UNET',
  vae_name: 'VAE',
};

function getObjectInfoInputOptions(objectInfo: unknown, classType: string, inputName: string) {
  const classInfo = (objectInfo as Record<string, unknown>)?.[classType];
  if (!classInfo || typeof classInfo !== 'object') return [];
  const input = (classInfo as Record<string, unknown>).input;
  if (!input || typeof input !== 'object') return [];
  const inputRecord = input as Record<string, Record<string, unknown>>;
  const definition = inputRecord.required?.[inputName] ?? inputRecord.optional?.[inputName];
  if (!Array.isArray(definition)) return [];
  return extractStringOptions(definition[0]);
}

function getObjectInfoOptions(objectInfo: unknown, classType: string, inputName: string) {
  return getObjectInfoInputOptions(objectInfo, classType, inputName);
}

function getPrimaryModelInputName(classType: string, inputs: Record<string, unknown>) {
  if (classType === 'CheckpointLoader' || classType === 'CheckpointLoaderSimple') {
    return 'ckpt_name' in inputs ? 'ckpt_name' : '';
  }
  if (
    classType === 'UNETLoader' ||
    classType === 'UnetLoaderGGUF' ||
    classType === 'DiffusionModelLoader' ||
    classType.toLowerCase().includes('unetloader')
  ) {
    return 'unet_name' in inputs ? 'unet_name' : '';
  }
  return '';
}

function parseWorkflowJson(settings: ComfySettings, prompt = '', negativePrompt = '') {
  const workflowText = buildWorkflowJson(settings, prompt, negativePrompt);
  try {
    return JSON.parse(workflowText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseWorkflowJsonWithParams(
  settings: ComfySettings,
  prompt = '',
  negativePrompt = '',
  params: Record<string, string> = {},
) {
  const workflowText = buildWorkflowJson(settings, prompt, negativePrompt, params);
  try {
    return JSON.parse(workflowText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getWorkflowInputValueKind(value: unknown): ComfyWorkflowInput['fieldKind'] | null {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return null;
}

function getWorkflowPrimaryModelName(settings: ComfySettings) {
  const workflow = parseWorkflowJson(settings);
  if (!workflow) return '';
  for (const node of Object.values(workflow)) {
    if (!node || typeof node !== 'object') continue;
    const nodeRecord = node as Record<string, unknown>;
    const inputs = nodeRecord.inputs as Record<string, unknown> | undefined;
    if (!inputs || typeof inputs !== 'object') continue;
    const primaryModelInputName = getPrimaryModelInputName(String(nodeRecord.class_type || ''), inputs);
    if (!primaryModelInputName) continue;
    const value = String(inputs[primaryModelInputName] || '').trim();
    if (value) return value;
  }
  return '';
}

function collectWorkflowInputs(settings: ComfySettings, objectInfo: unknown): ComfyWorkflowInput[] {
  const workflow = parseWorkflowJson(settings);
  if (!workflow || typeof workflow !== 'object') return [];

  return Object.entries(workflow).flatMap(([nodeId, node]) => {
    if (!node || typeof node !== 'object') return [];
    const nodeRecord = node as Record<string, unknown>;
    const classType = String(nodeRecord.class_type || '').trim();
    const inputs = nodeRecord.inputs;
    if (!classType || !inputs || typeof inputs !== 'object') return [];
    const nodeTitle = String((nodeRecord._meta as Record<string, unknown> | undefined)?.title || classType);

    return Object.entries(inputs).flatMap(([inputName, value]) => {
      const fieldKind = getWorkflowInputValueKind(value);
      if (!fieldKind) return [];
      const options = getObjectInfoInputOptions(objectInfo, classType, inputName);
      return [
        {
          classType,
          currentValue: String(value),
          fieldKind,
          inputName,
          label: workflowInputLabels[inputName] || inputName,
          key: workflowInputKey(nodeId, inputName),
          nodeId,
          nodeTitle,
          options,
        },
      ];
    });
  });
}

function coerceWorkflowValue(value: string, currentValue: unknown) {
  if (typeof currentValue === 'number') {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : currentValue;
  }
  if (typeof currentValue === 'boolean') {
    return ['1', 'true', 'yes', '是', '开', '启用'].includes(value.trim().toLowerCase());
  }
  return value;
}

function applyWorkflowSelections(
  prompt: Record<string, unknown>,
  settings: ComfySettings,
  params: Record<string, string> = {},
) {
  Object.values(prompt).forEach(node => {
    if (!node || typeof node !== 'object') return;
    const nodeRecord = node as Record<string, unknown>;
    const inputs = nodeRecord.inputs as Record<string, unknown> | undefined;
    if (!inputs || typeof inputs !== 'object') return;
    const primaryModelInputName = getPrimaryModelInputName(String(nodeRecord.class_type || ''), inputs);
    if (primaryModelInputName && settings.checkpoint) {
      inputs[primaryModelInputName] = settings.checkpoint;
    }
    if (nodeRecord.class_type === 'KSampler') {
      inputs.steps = settings.steps;
      inputs.cfg = settings.cfg;
      if (settings.sampler) inputs.sampler_name = settings.sampler;
      if (settings.scheduler) inputs.scheduler = settings.scheduler;
    }
    if (nodeRecord.class_type === 'EmptyLatentImage') {
      inputs.width = settings.width;
      inputs.height = settings.height;
    }
  });

  Object.entries(getActiveWorkflowSelections(settings)).forEach(([nodeId, selections]) => {
    const node = prompt[nodeId];
    if (!node || typeof node !== 'object') return;
    const nodeRecord = node as Record<string, unknown>;
    if (!nodeRecord.inputs || typeof nodeRecord.inputs !== 'object') return;
    const inputs = nodeRecord.inputs as Record<string, unknown>;
    Object.entries(selections).forEach(([inputName, value]) => {
      if (!value.trim()) return;
      inputs[inputName] = value;
    });
  });

  Object.entries(getActiveWorkflowParamMappings(settings)).forEach(([key, mapping]) => {
    if (!mapping.exposed && !mapping.aiFill) return;
    const [nodeId, inputName] = key.split(':');
    if (!nodeId || !inputName) return;
    const node = prompt[nodeId];
    if (!node || typeof node !== 'object') return;
    const nodeRecord = node as Record<string, unknown>;
    if (!nodeRecord.inputs || typeof nodeRecord.inputs !== 'object') return;
    const inputs = nodeRecord.inputs as Record<string, unknown>;
    const currentValue = inputs[inputName];
    const placeholder = normalizePlaceholder(mapping.placeholder);
    const mappedValue = mapping.aiFill && placeholder ? params[placeholder] : undefined;
    const value = String(mappedValue ?? mapping.value ?? '').trim();
    if (!value) return;
    inputs[inputName] = coerceWorkflowValue(value, currentValue);
  });
}

function mediaKindFromFilename(filename: string): ComfyGeneratedMedia['kind'] {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  if (['mp3', 'ogg', 'wav', 'flac', 'm4a'].includes(extension)) return 'audio';
  if (['mp4', 'webm', 'mov', 'mkv'].includes(extension)) return 'video';
  return 'image';
}

function mediaMimeFromFormat(format: string) {
  const normalized = format.replace(/^\./, '').toLowerCase();
  const mimeTypes: Record<string, string> = {
    flac: 'audio/flac',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    m4a: 'audio/mp4',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    ogg: 'audio/ogg',
    png: 'image/png',
    wav: 'audio/wav',
    webm: 'video/webm',
  };
  return (
    mimeTypes[normalized] ||
    (mediaKindFromFilename(`output.${normalized}`) === 'audio'
      ? `audio/${normalized}`
      : mediaKindFromFilename(`output.${normalized}`) === 'video'
        ? `video/${normalized}`
        : `image/${normalized}`)
  );
}

function buildViewUrl(baseUrl: string, file: Record<string, unknown>) {
  const params = new URLSearchParams();
  params.set('filename', String(file.filename || ''));
  params.set('subfolder', String(file.subfolder || ''));
  params.set('type', String(file.type || 'output'));
  return `${baseUrl}/view?${params.toString()}`;
}

function collectGeneratedMedia(baseUrl: string, history: unknown): ComfyGeneratedMedia[] {
  const outputs = (history as Record<string, unknown>)?.outputs;
  if (!outputs || typeof outputs !== 'object') return [];
  const files: ComfyGeneratedMedia[] = [];
  Object.values(outputs).forEach(output => {
    if (!output || typeof output !== 'object') return;
    const record = output as Record<string, unknown>;
    ['images', 'gifs', 'audio', 'videos'].forEach(key => {
      const list = record[key];
      if (!Array.isArray(list)) return;
      list.forEach(file => {
        if (!file || typeof file !== 'object') return;
        const fileRecord = file as Record<string, unknown>;
        const filename = String(fileRecord.filename || '').trim();
        if (!filename) return;
        files.push({
          filename,
          kind: mediaKindFromFilename(filename),
          title: filename,
          url: buildViewUrl(baseUrl, fileRecord),
        });
      });
    });
  });
  return files;
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

export const useComfyStore = defineStore('comfy', () => {
  const settings = ref<ComfySettings>(readSettings(_.get(extension_settings, comfyField, {})));
  const objectInfo = shallowRef<unknown>(null);
  const workflowInputs = computed(() => collectWorkflowInputs(settings.value, objectInfo.value));
  const activeWorkflow = computed(() => getActiveWorkflowFromSettings(settings.value));
  const activeWorkflowJson = computed(() => getActiveWorkflowJson(settings.value));

  function persist() {
    _.set(extension_settings, comfyField, readSettings(klona(settings.value)));
    void saveSettingsDebounced();
  }

  watch(settings, persist, { deep: true });

  function rehydrateFromSettings() {
    settings.value = readSettings(_.get(extension_settings, comfyField, {}));
  }

  function syncLegacyWorkflowFields() {
    const workflow = getActiveWorkflowFromSettings(settings.value);
    settings.value.workflowJson = workflow?.json || '';
    settings.value.workflowNodeSelections = workflow?.nodeSelections ?? {};
  }

  function setActiveWorkflow(workflowId: string) {
    if (!settings.value.workflows.some(workflow => workflow.id === workflowId)) return;
    settings.value.activeWorkflowId = workflowId;
    syncLegacyWorkflowFields();
  }

  function updateActiveWorkflowJson(json: string) {
    const workflow = getActiveWorkflowFromSettings(settings.value);
    if (!workflow) {
      const created = createWorkflow({
        json,
        kind: 'image',
        name: inferWorkflowName(json),
      });
      settings.value.activeWorkflowId = created.id;
      syncLegacyWorkflowFields();
      return;
    }
    workflow.json = json;
    workflow.updatedAt = nowIso();
    settings.value.workflowJson = json;
  }

  function updateActiveWorkflowMeta(input: Partial<Pick<ComfyWorkflow, 'kind' | 'name'>>) {
    const workflow = getActiveWorkflowFromSettings(settings.value);
    if (!workflow) return;
    if (input.name !== undefined) workflow.name = input.name.trim() || '未命名工作流';
    if (input.kind !== undefined) workflow.kind = input.kind;
    workflow.updatedAt = nowIso();
  }

  function createWorkflow(input?: Partial<Pick<ComfyWorkflow, 'json' | 'kind' | 'name'>>) {
    const json = input?.json || '';
    const workflow: ComfyWorkflow = {
      id: createWorkflowId(),
      json,
      kind: input?.kind || 'image',
      name: input?.name?.trim() || inferWorkflowName(json),
      nodeSelections: {},
      paramMappings: {},
      updatedAt: nowIso(),
    };
    settings.value.workflows.push(workflow);
    settings.value.activeWorkflowId = workflow.id;
    syncLegacyWorkflowFields();
    return workflow;
  }

  function duplicateActiveWorkflow() {
    const workflow = getActiveWorkflowFromSettings(settings.value);
    const created = createWorkflow({
      json: workflow?.json || '',
      kind: workflow?.kind || 'image',
      name: `${workflow?.name || '工作流'} 副本`,
    });
    created.nodeSelections = klona(workflow?.nodeSelections ?? {});
    created.paramMappings = klona(workflow?.paramMappings ?? {});
    created.updatedAt = nowIso();
    syncLegacyWorkflowFields();
    return created;
  }

  function deleteActiveWorkflow() {
    const workflow = getActiveWorkflowFromSettings(settings.value);
    if (!workflow) return false;
    settings.value.workflows = settings.value.workflows.filter(item => item.id !== workflow.id);
    settings.value.activeWorkflowId = settings.value.workflows[0]?.id || '';
    syncLegacyWorkflowFields();
    return true;
  }

  function setWorkflowNodeSelection(nodeId: string, inputName: string, value: string) {
    const workflow = getActiveWorkflowFromSettings(settings.value);
    if (workflow) {
      workflow.nodeSelections[nodeId] ??= {};
      workflow.nodeSelections[nodeId][inputName] = value;
      workflow.updatedAt = nowIso();
      settings.value.workflowNodeSelections = workflow.nodeSelections;
      return;
    }
    settings.value.workflowNodeSelections[nodeId] ??= {};
    settings.value.workflowNodeSelections[nodeId][inputName] = value;
  }

  function setWorkflowParameterMapping(key: string, input: Partial<ComfyWorkflowParameterMapping>) {
    const workflow = getActiveWorkflowFromSettings(settings.value);
    if (!workflow) return;
    const current = workflow.paramMappings[key] ?? {
      aiFill: false,
      description: '',
      exposed: false,
      label: '',
      placeholder: '',
      value: '',
    };
    workflow.paramMappings[key] = {
      ...current,
      ...input,
    };
    workflow.updatedAt = nowIso();
  }

  async function browserComfyFetch(path: string, init?: RequestInit) {
    const baseUrl = cleanBaseUrl(settings.value.baseUrl);
    if (!baseUrl) throw new Error('请先填写 ComfyUI 地址');
    try {
      const response = await fetch(`${baseUrl}${path}`, init);
      if (response.ok || response.status !== 403) return response;
      const fallbackBaseUrl = buildHttpFallbackUrl(baseUrl);
      if (!fallbackBaseUrl) return response;
      const fallbackResponse = await fetch(`${fallbackBaseUrl}${path}`, init).catch(() => null);
      if (!fallbackResponse?.ok) return response;
      settings.value.baseUrl = fallbackBaseUrl;
      toastr.info('HTTPS 访问被拒绝，已自动切换到 HTTP 地址');
      return fallbackResponse;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(
          '浏览器无法访问 ComfyUI，常见原因是 CORS 跨域限制。请切换为“酒馆”请求方式，或让 ComfyUI 开启跨域。',
        );
      }
      throw error;
    }
  }

  async function tavernComfyFetch(path: string, body: Record<string, unknown>, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      body: JSON.stringify(body),
      headers: getRequestHeaders(),
      method: 'POST',
    });
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(message || `酒馆 ComfyUI 接口失败：HTTP ${response.status}`);
    }
    return response;
  }

  async function refreshObjectInfoViaTavern(baseUrl: string) {
    const [modelsResponse, samplersResponse, schedulersResponse] = await Promise.all([
      tavernComfyFetch('/api/sd/comfy/models', { url: baseUrl }),
      tavernComfyFetch('/api/sd/comfy/samplers', { url: baseUrl }),
      tavernComfyFetch('/api/sd/comfy/schedulers', { url: baseUrl }),
    ]);
    settings.value.modelOptions = extractValueOptions(await modelsResponse.json());
    settings.value.samplerOptions = extractValueOptions(await samplersResponse.json());
    settings.value.schedulerOptions = extractValueOptions(await schedulersResponse.json());
    objectInfo.value = null;
    const workflowPrimaryModel = getWorkflowPrimaryModelName(settings.value);
    if (workflowPrimaryModel && settings.value.modelOptions.includes(workflowPrimaryModel)) {
      settings.value.checkpoint = workflowPrimaryModel;
    } else if (!settings.value.checkpoint && settings.value.modelOptions[0]) {
      settings.value.checkpoint = settings.value.modelOptions[0];
    }
    if (!settings.value.sampler && settings.value.samplerOptions[0])
      settings.value.sampler = settings.value.samplerOptions[0];
    if (!settings.value.scheduler && settings.value.schedulerOptions[0])
      settings.value.scheduler = settings.value.schedulerOptions[0];
    settings.value.lastCheckedAt = new Date().toISOString();
    return {
      models: settings.value.modelOptions.length,
      nodes: 0,
      samplers: settings.value.samplerOptions.length,
      schedulers: settings.value.schedulerOptions.length,
    };
  }

  async function refreshObjectInfo() {
    const baseUrl = cleanBaseUrl(settings.value.baseUrl);
    if (!baseUrl) throw new Error('请先填写 ComfyUI 地址');
    if (settings.value.requestMode === 'tavern') {
      return refreshObjectInfoViaTavern(baseUrl);
    }

    const response = await browserComfyFetch('/object_info');
    if (!response.ok) throw new Error(`ComfyUI 连接失败：HTTP ${response.status}`);
    const data = await response.json();
    objectInfo.value = data;
    const checkpointInputs = uniqueOptions(
      getObjectInfoOptions(data, 'CheckpointLoaderSimple', 'ckpt_name'),
      getObjectInfoOptions(data, 'CheckpointLoader', 'ckpt_name'),
      getObjectInfoOptions(data, 'UNETLoader', 'unet_name'),
      getObjectInfoOptions(data, 'UnetLoaderGGUF', 'unet_name'),
      getObjectInfoOptions(data, 'DiffusionModelLoader', 'unet_name'),
    );
    const samplerInputs = data?.KSampler?.input?.required?.sampler_name?.[0] ?? [];
    const schedulerInputs = data?.KSampler?.input?.required?.scheduler?.[0] ?? [];
    settings.value.modelOptions = checkpointInputs;
    settings.value.samplerOptions = extractStringOptions(samplerInputs);
    settings.value.schedulerOptions = extractStringOptions(schedulerInputs);
    if (!settings.value.checkpoint && settings.value.modelOptions[0])
      settings.value.checkpoint = settings.value.modelOptions[0];
    if (!settings.value.sampler && settings.value.samplerOptions[0])
      settings.value.sampler = settings.value.samplerOptions[0];
    if (!settings.value.scheduler && settings.value.schedulerOptions[0])
      settings.value.scheduler = settings.value.schedulerOptions[0];
    settings.value.lastCheckedAt = new Date().toISOString();
    return {
      models: settings.value.modelOptions.length,
      nodes: workflowInputs.value.length,
      samplers: settings.value.samplerOptions.length,
      schedulers: settings.value.schedulerOptions.length,
    };
  }

  async function generateMedia(input: { negativePrompt?: string; params?: Record<string, string>; prompt?: string }) {
    const baseUrl = cleanBaseUrl(settings.value.baseUrl);
    if (!baseUrl) throw new Error('请先填写 ComfyUI 地址');
    if (!getActiveWorkflowJson(settings.value).trim()) throw new Error('请先在 ComfyUI 设置中选择或导入工作流');
    const prompt = parseWorkflowJsonWithParams(
      settings.value,
      input.prompt?.trim() || '',
      input.negativePrompt?.trim() || '',
      input.params ?? {},
    );
    if (!prompt) {
      throw new Error('工作流 JSON 解析失败，请检查格式和占位符替换后的内容');
    }
    applyWorkflowSelections(prompt, settings.value, input.params ?? {});

    const clientId = `sillytavern_phone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (settings.value.requestMode === 'tavern') {
      const response = await tavernComfyFetch('/api/sd/comfy/generate', {
        prompt: JSON.stringify({ prompt }),
        url: baseUrl,
      });
      const result = await response.json();
      const format = String(result?.format || 'png')
        .replace(/^\./, '')
        .toLowerCase();
      const data = String(result?.data || '');
      if (!data) throw new Error('酒馆 ComfyUI 没有返回媒体数据');
      const kind = mediaKindFromFilename(`output.${format}`);
      return [
        {
          filename: `comfyui-${Date.now()}.${format}`,
          kind,
          title: `ComfyUI ${format.toUpperCase()}`,
          url: `data:${mediaMimeFromFormat(format)};base64,${data}`,
        },
      ];
    }

    const response = await browserComfyFetch('/prompt', {
      body: JSON.stringify({ client_id: clientId, prompt }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    if (!response.ok) throw new Error(`提交 ComfyUI 工作流失败：HTTP ${response.status}`);
    const submitted = await response.json();
    const promptId = String(submitted?.prompt_id || '').trim();
    if (!promptId) throw new Error('ComfyUI 没有返回 prompt_id');

    for (let attempt = 0; attempt < 90; attempt += 1) {
      await wait(1200);
      const historyResponse = await browserComfyFetch(`/history/${encodeURIComponent(promptId)}`);
      if (!historyResponse.ok) continue;
      const history = await historyResponse.json();
      const item = history?.[promptId];
      if (!item) continue;
      const media = collectGeneratedMedia(baseUrl, item);
      if (media.length) return media;
      if (item.status?.completed) return [];
    }
    throw new Error('ComfyUI 生成超时，请稍后到 ComfyUI 查看结果');
  }

  return {
    activeWorkflow,
    activeWorkflowJson,
    createWorkflow,
    deleteActiveWorkflow,
    duplicateActiveWorkflow,
    generateMedia,
    refreshObjectInfo,
    rehydrateFromSettings,
    setActiveWorkflow,
    setWorkflowParameterMapping,
    setWorkflowNodeSelection,
    settings,
    updateActiveWorkflowJson,
    updateActiveWorkflowMeta,
    workflowInputs,
  };
});
