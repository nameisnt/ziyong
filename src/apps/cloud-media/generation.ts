import { useMediaStore, type MediaEntry } from '@/apps/media/store';
import type { GenerationAdapter, XmlParseResult } from '@/type/generation';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parseTaggedOutputCandidates } from '@/util/parseCandidates';
import { parsePrettified } from '@/util/zod';
import { generateCloudMedia } from './providers';
import { useCloudMediaStore } from './store';

export const CloudMediaGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  instrumental: z.boolean().default(true),
  kind: z.enum(['audio', 'image', 'video']).default('image'),
  model: z.string().default(''),
  outputFormat: z.string(),
  profileId: z.string(),
  profileName: z.string().default('云媒体配置'),
  providerName: z.string().default('云媒体'),
  userRequirement: z.string().default(''),
});
export type CloudMediaGenerateConfig = z.infer<typeof CloudMediaGenerateConfigSchema>;

export const CloudMediaPromptResultSchema = z.object({
  lyrics: z.string().default(''),
  negativePrompt: z.string().default(''),
  note: z.string().default(''),
  prompt: z.string().default(''),
  title: z.string().default('云媒体生成'),
});
export type CloudMediaPromptResult = z.infer<typeof CloudMediaPromptResultSchema>;

function extractFirstResultBlock(raw: string) {
  const start = raw.indexOf('<result');
  if (start === -1) return null;
  const openEnd = raw.indexOf('>', start);
  if (openEnd === -1) return null;
  const close = raw.indexOf('</result>', openEnd + 1);
  if (close === -1) return null;
  return raw.slice(start, close + '</result>'.length);
}

function getDirectChildText(parent: Element, tagName: string) {
  const child = Array.from(parent.children).find(item => item.tagName === tagName);
  return child?.textContent?.trim() || '';
}

function parseCloudMediaXmlCandidate(raw: string): XmlParseResult<CloudMediaPromptResult> {
  const resultBlock = extractFirstResultBlock(raw);
  if (!resultBlock) return { ok: false, raw, warnings: ['没有找到完整的 <result> 输出'] };
  const document = new DOMParser().parseFromString(resultBlock, 'application/xml');
  if (document.querySelector('parsererror')) {
    return { ok: false, raw, warnings: ['XML 标签未正确闭合或嵌套，无法解析'] };
  }
  const root = document.documentElement;
  return {
    data: parsePrettified(CloudMediaPromptResultSchema, {
      lyrics: getDirectChildText(root, 'lyrics'),
      negativePrompt: getDirectChildText(root, 'negative') || getDirectChildText(root, 'negative_prompt'),
      note: getDirectChildText(root, 'note'),
      prompt: getDirectChildText(root, 'prompt'),
      title: getDirectChildText(root, 'title'),
    }),
    ok: true,
    raw,
    warnings: [],
  };
}

export function parseCloudMediaPromptXmlResult(raw: string): XmlParseResult<CloudMediaPromptResult> {
  return parseTaggedOutputCandidates(raw, 'result', parseCloudMediaXmlCandidate);
}

export function createCloudMediaGenerationAdapter() {
  return {
    actionId: 'generate-prompt',
    appId: 'cloud-media',
    configSchema: CloudMediaGenerateConfigSchema,
    buildRequest(config) {
      return {
        appPrompt: config.appPrompt,
        context: [
          `目标服务：${config.providerName}`,
          `目标配置：${config.profileName}`,
          `媒体类型：${config.kind}`,
          `模型：${config.model || '未填写'}`,
          config.kind === 'audio'
            ? `音乐模式：${config.instrumental ? '纯音乐，不要生成歌词' : '歌曲，可以生成歌词'}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
        outputFormat: config.outputFormat,
        taskInstruction: '请根据当前目标服务、媒体类型和模型配置，生成一份可直接使用的媒体提示词。',
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      return parseConfiguredOutput('cloud-media.generate', raw, CloudMediaPromptResultSchema, () =>
        parseCloudMediaPromptXmlResult(raw),
      );
    },
    async save(result, context) {
      const cloudMedia = useCloudMediaStore();
      const media = useMediaStore();
      const profile = cloudMedia.settings.profiles.find(item => item.id === context.config.profileId);
      if (!profile) throw new Error('生成配置已不存在，请返回云媒体重新选择');
      const generated = await generateCloudMedia(
        klona(profile),
        {
          lyrics: result.lyrics,
          negativePrompt: result.negativePrompt,
          note: result.note,
          prompt: result.prompt,
          title: result.title,
        },
        () => {},
      );
      const entries = generated.map(item =>
        media.createEntry({
          kind: item.kind,
          note: item.note,
          source: 'api',
          title: item.title,
          url: item.url,
        }),
      );
      return { entries, entityId: entries[0]?.id || '' };
    },
  } satisfies GenerationAdapter<
    CloudMediaGenerateConfig,
    CloudMediaPromptResult,
    { entries: MediaEntry[]; entityId: string }
  >;
}
