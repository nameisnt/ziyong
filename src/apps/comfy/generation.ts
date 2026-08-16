import { useMediaStore, type MediaEntry } from '@/apps/media/store';
import type { GenerationAdapter, XmlParseResult } from '@/type/generation';
import { parsePrettified } from '@/util/zod';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parseTaggedOutputCandidates } from '@/util/parseCandidates';
import { type ComfyWorkflow, type ComfyWorkflowInput, type ComfyWorkflowKind, useComfyStore } from './store';

export const ComfyGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  availableParams: z.string().default(''),
  kind: z.enum(['audio', 'image', 'other', 'video']).default('image'),
  outputFormat: z.string(),
  userRequirement: z.string().default(''),
  workflowId: z.string().default(''),
  workflowName: z.string().default('未选择工作流'),
});
export type ComfyGenerateConfig = z.infer<typeof ComfyGenerateConfigSchema>;

export const ComfyParamResultSchema = z.object({
  key: z.string(),
  value: z.string(),
});
export type ComfyParamResult = z.infer<typeof ComfyParamResultSchema>;

export const ComfyPromptResultSchema = z.object({
  note: z.string().default(''),
  negativePrompt: z.string().default(''),
  params: z.array(ComfyParamResultSchema).default([]),
  prompt: z.string().default(''),
  title: z.string().default('ComfyUI 生成'),
});
export type ComfyPromptResult = z.infer<typeof ComfyPromptResultSchema>;

function getTagCount(raw: string, tagName: string) {
  return raw.match(new RegExp(`<${tagName}(\\s|>)`, 'g'))?.length || 0;
}

function extractFirstResultBlock(raw: string) {
  const start = raw.indexOf('<result');
  if (start === -1) return null;
  const openEnd = raw.indexOf('>', start);
  if (openEnd === -1) return null;
  const close = raw.indexOf('</result>', openEnd + 1);
  if (close === -1) return null;
  return raw.slice(start, close + '</result>'.length);
}

function parseXmlDocument(raw: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(raw, 'application/xml');
  if (document.querySelector('parsererror')) return null;
  return document;
}

function getDirectChildText(parent: Element, tagName: string) {
  const child = Array.from(parent.children).find(item => item.tagName === tagName);
  return child?.textContent?.trim() || '';
}

function normalizeParamKey(value: string) {
  return value
    .trim()
    .replace(/^\{\{\s*/, '')
    .replace(/\s*\}\}$/, '')
    .trim();
}

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

function isRuntimeComfyInput(item: ComfyWorkflowInput) {
  const inputName = item.inputName.toLowerCase();
  const classType = item.classType.toLowerCase();
  if (runtimeComfyInputNames.has(inputName)) return true;
  if (classType.includes('checkpoint') || classType.includes('loader')) {
    return inputName.includes('name') || inputName.includes('model') || inputName.includes('ckpt');
  }
  return false;
}

export function buildAvailableComfyParams(workflow: ComfyWorkflow, inputs: ComfyWorkflowInput[]) {
  return inputs
    .filter(item => workflow.paramMappings[item.key]?.aiFill && !isRuntimeComfyInput(item))
    .map(item => {
      const mapping = workflow.paramMappings[item.key];
      const key = normalizeParamKey(mapping?.placeholder || '') || item.key;
      const label = mapping?.label || item.label;
      const description = mapping?.description?.trim() || '';
      return `- ${key}：${label}${description ? `\n  说明：${description}` : ''}`;
    })
    .join('\n');
}

function collectParamResults(root: Element) {
  const paramsRoot = Array.from(root.children).find(item => item.tagName === 'params');
  if (!paramsRoot) return [];
  return Array.from(paramsRoot.children)
    .filter(item => item.tagName === 'param')
    .map(item => {
      const key = normalizeParamKey(item.getAttribute('key') || item.getAttribute('name') || '');
      const value = item.textContent?.trim() || '';
      return key && value ? { key, value } : null;
    })
    .filter((item): item is ComfyParamResult => Boolean(item));
}

function createWarnings(raw: string) {
  const warnings: string[] = [];
  const resultCount = getTagCount(raw, 'result');
  if (resultCount > 1) warnings.push(`检测到 ${resultCount} 个 <result>，已只取第一个完整结果`);
  return warnings;
}

function parseComfyPromptXmlCandidate(raw: string): XmlParseResult<ComfyPromptResult> {
  const resultBlock = extractFirstResultBlock(raw);
  if (!resultBlock) {
    return {
      ok: false,
      raw,
      warnings: ['没有找到完整的 <result> 输出'],
    };
  }

  const document = parseXmlDocument(resultBlock);
  if (!document) {
    return {
      ok: false,
      raw,
      warnings: ['XML 标签未正确闭合或嵌套，无法解析'],
    };
  }

  const root = document.documentElement;
  const prompt = getDirectChildText(root, 'prompt');
  const title = getDirectChildText(root, 'title');
  const negativePrompt = getDirectChildText(root, 'negative') || getDirectChildText(root, 'negative_prompt');
  const note = getDirectChildText(root, 'note');
  const params = collectParamResults(root);

  return {
    ok: true,
    raw,
    warnings: createWarnings(raw),
    data: parsePrettified(ComfyPromptResultSchema, {
      negativePrompt,
      note,
      params,
      prompt,
      title,
    }),
  };
}

export function parseComfyPromptXmlResult(raw: string): XmlParseResult<ComfyPromptResult> {
  return parseTaggedOutputCandidates(raw, 'result', parseComfyPromptXmlCandidate);
}

function kindToMediaKind(kind: ComfyWorkflowKind) {
  if (kind === 'audio' || kind === 'video') return kind;
  return 'image';
}

function paramsToRecord(params: ComfyParamResult[]) {
  return Object.fromEntries(
    params.map(item => [normalizeParamKey(item.key), item.value]).filter(([key, value]) => key && value),
  );
}

export function createComfyGenerationAdapter() {
  return {
    appId: 'comfy',
    actionId: 'generate-prompt',
    configSchema: ComfyGenerateConfigSchema,
    buildRequest(config) {
      return {
        appPrompt: config.appPrompt,
        context: [
          `当前 ComfyUI 工作流：${config.workflowName}`,
          `工作流类型：${kindToMediaKind(config.kind)}`,
          config.availableParams.trim() ? `可填写的工作流参数：\n${config.availableParams.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
        outputFormat: config.outputFormat,
        taskInstruction: '请根据本次来源、引用和用户要求，为当前工作流生成可直接填写的参数。',
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      return parseConfiguredOutput('comfy.generate', raw, ComfyPromptResultSchema, () =>
        parseComfyPromptXmlResult(raw),
      );
    },
    async save(result, context) {
      const comfy = useComfyStore();
      const media = useMediaStore();
      if (context.config.workflowId) comfy.setActiveWorkflow(context.config.workflowId);
      const generated = await comfy.generateMedia({
        negativePrompt: result.negativePrompt,
        params: paramsToRecord(result.params),
        prompt: result.prompt,
      });
      if (!generated.length) {
        throw new Error('ComfyUI 已完成，但没有找到可保存的媒体输出');
      }
      const entries = generated.map(item =>
        media.createEntry({
          kind: item.kind,
          note: [result.note, result.prompt].filter(Boolean).join('\n\n'),
          source: 'comfy',
          title: result.title || item.title,
          url: item.url,
        }),
      );
      return {
        entries,
        entityId: entries[0]?.id || '',
      };
    },
  } satisfies GenerationAdapter<ComfyGenerateConfig, ComfyPromptResult, { entries: MediaEntry[]; entityId: string }>;
}
