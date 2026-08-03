import { getProfileKindLabel, ProfileKindSchema, type ProfileEntry, type useProfilesStore } from './store';
import type { GenerationAdapter, XmlParseResult } from '@/type/generation';
import { parsePrettified } from '@/util/zod';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parseTaggedOutputCandidates } from '@/util/parseCandidates';

export const ProfileGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  kind: ProfileKindSchema,
  outputFormat: z.string(),
  tableId: z.string().default(''),
  titleHint: z.string().default(''),
  userRequirement: z.string().default(''),
});
export type ProfileGenerateConfig = z.infer<typeof ProfileGenerateConfigSchema>;

export const ProfileXmlResultSchema = z.object({
  fields: z
    .array(
      z.object({
        id: z.string(),
        value: z.string().default(''),
      }),
    )
    .default([])
    .transform(fields =>
      Object.fromEntries(
        fields.map(field => [field.id.trim(), field.value.trim()] as const).filter(([id]) => Boolean(id)),
      ),
    ),
  title: z.string(),
  summary: z.string().default(''),
  tags: z.array(z.string()).default([]),
});
export type ProfileXmlResult = z.infer<typeof ProfileXmlResultSchema>;

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

function createWarnings(raw: string) {
  const warnings: string[] = [];
  const resultCount = getTagCount(raw, 'result');
  if (resultCount > 1) warnings.push(`检测到 ${resultCount} 个 <result>，已只取第一个完整结果`);
  return warnings;
}

function splitTags(text: string) {
  return text
    .split(/[,，、\n]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseProfileXmlCandidate(raw: string): XmlParseResult<ProfileXmlResult> {
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
  const title = getDirectChildText(root, 'title');
  const summary = getDirectChildText(root, 'summary');
  const legacyContent = getDirectChildText(root, 'content');
  const tags = splitTags(getDirectChildText(root, 'tags'));
  const fieldsRoot = Array.from(root.children).find(child => child.tagName === 'fields');
  const fields = Array.from(fieldsRoot?.children ?? [])
    .filter(field => field.tagName === 'field')
    .map(field => ({
      id: field.getAttribute('id')?.trim() || '',
      value: field.textContent?.trim() || '',
    }));
  if (legacyContent) {
    const details = fields.find(field => field.id === 'details');
    if (details) {
      if (!details.value.includes(legacyContent))
        details.value = [details.value, legacyContent].filter(Boolean).join('\n\n');
    } else {
      fields.push({ id: 'details', value: legacyContent });
    }
  }

  if (!title) {
    const warnings = [!title ? '缺少必填字段「资料标题」(<title>)' : ''].filter(Boolean);
    return {
      ok: false,
      raw,
      warnings,
    };
  }

  return {
    ok: true,
    raw,
    warnings: createWarnings(raw),
    data: parsePrettified(ProfileXmlResultSchema, {
      fields,
      summary,
      tags,
      title,
    }),
  };
}

export function parseProfileXmlResult(raw: string): XmlParseResult<ProfileXmlResult> {
  return parseTaggedOutputCandidates(raw, 'result', parseProfileXmlCandidate);
}

export function createProfileGenerationAdapter(profilesStore: ReturnType<typeof useProfilesStore>) {
  return {
    appId: 'profiles',
    actionId: 'generate',
    configSchema: ProfileGenerateConfigSchema,
    buildRequest(config) {
      const table = profilesStore.getTable(config.tableId) ?? profilesStore.getDefaultTable(config.kind);
      const editableColumns =
        table?.columns
          .filter(column => !['title', 'summary', 'tags', 'content'].includes(column.id))
          .map(column => {
            const options = column.options.length ? ` 可选值：${column.options.join('、')}。` : '';
            const description = column.description.trim() ? ` 说明：${column.description.trim()}。` : '';
            return `- ${column.label}（id=${column.id}，${column.type}）${description}${options}`;
          })
          .join('\n') || '';
      return {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        taskInstruction: [
          `目标资料表：${table?.name || getProfileKindLabel(config.kind)}`,
          `资料类型：${getProfileKindLabel(table?.kind ?? config.kind)}`,
          editableColumns
            ? `请按以下字段填写 <fields> 中的 <field id="字段id">字段值</field>；只填写上下文可确认的信息，未知可留空：\n${editableColumns}`
            : '',
          config.titleHint.trim() ? `标题或对象名：${config.titleHint.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      const direct = parseProfileXmlResult(raw);
      if (direct.ok) return direct;
      return parseConfiguredOutput('profiles.generate', raw, ProfileXmlResultSchema, () => direct);
    },
    save(result, context) {
      const table =
        profilesStore.getTable(context.config.tableId) ?? profilesStore.getDefaultTable(context.config.kind);
      const fieldIds = new Set(
        (table?.columns ?? [])
          .filter(column => !['title', 'summary', 'tags', 'content'].includes(column.id))
          .map(column => column.id),
      );
      const entry = profilesStore.createEntry({
        title: result.title,
        kind: context.config.kind,
        summary: result.summary,
        tableId: context.config.tableId,
        fields: Object.fromEntries(Object.entries(result.fields).filter(([fieldId]) => fieldIds.has(fieldId))),
        tags: result.tags,
      });
      return {
        entityId: entry.id,
        entry,
      };
    },
  } satisfies GenerationAdapter<ProfileGenerateConfig, ProfileXmlResult, { entityId: string; entry: ProfileEntry }>;
}
