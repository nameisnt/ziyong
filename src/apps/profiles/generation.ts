import type { GenerationAdapter, XmlParseResult } from '@/type/generation';
import { parsePrettified } from '@/util/zod';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parseTaggedOutputCandidates } from '@/util/parseCandidates';
import type { ExternalProfileMapping } from './profileMappings';

export const ProfileGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  mappingId: z.string().min(1, '请选择外部资料映射'),
  outputFormat: z.string(),
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

type ProfileGenerationDependencies = {
  getMapping: (mappingId: string) => ExternalProfileMapping | null;
  insertMappedRow: (
    mapping: ExternalProfileMapping,
    values: {
      displayValue: string;
      fields: Record<string, string>;
      identityValue: string;
    },
  ) => Promise<number> | number;
};

function requireMapping(dependencies: ProfileGenerationDependencies, mappingId: string) {
  const mapping = dependencies.getMapping(mappingId);
  if (!mapping) throw new Error('请选择有效的外部资料映射');
  return mapping;
}

function createFieldInstruction(mapping: ExternalProfileMapping) {
  if (!mapping.fields.length) return '';
  return [
    '请按以下显式映射字段填写 <fields> 中的 <field id="字段id">字段值</field>；只填写上下文可确认的信息，未知可留空：',
    ...mapping.fields.map(field => `- ${field.label}（id=${field.key}）`),
  ].join('\n');
}

export function buildExternalProfileGenerationValues(result: ProfileXmlResult, mapping: ExternalProfileMapping) {
  const allowedFieldKeys = new Set(mapping.fields.map(field => field.key));
  const fields = Object.fromEntries(
    Object.entries(result.fields).filter(([fieldKey]) => allowedFieldKeys.has(fieldKey)),
  );
  if (allowedFieldKeys.has('summary') && result.summary.trim()) fields.summary = result.summary.trim();
  if (allowedFieldKeys.has('tags') && result.tags.length) fields.tags = result.tags.join('、');
  return {
    displayValue: result.title.trim(),
    fields,
  };
}

export function createProfileGenerationAdapter(dependencies: ProfileGenerationDependencies) {
  return {
    appId: 'profiles',
    actionId: 'generate',
    configSchema: ProfileGenerateConfigSchema,
    buildRequest(config) {
      const mapping = requireMapping(dependencies, config.mappingId);
      const fieldInstruction = createFieldInstruction(mapping);
      return {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        taskInstruction: [
          `目标资料映射：${mapping.name}`,
          `目标外部表：${mapping.tableName}`,
          fieldInstruction,
          config.titleHint.trim() ? `标题或对象名：${config.titleHint.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        taskTemplateVariables: {
          fieldInstruction,
          kindInstruction: '',
          mappingName: mapping.name,
          tableName: mapping.tableName,
          titleInstruction: config.titleHint.trim() ? `标题或对象名：${config.titleHint.trim()}` : '',
        },
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      const direct = parseProfileXmlResult(raw);
      if (direct.ok) return direct;
      return parseConfiguredOutput('profiles.generate', raw, ProfileXmlResultSchema, () => direct);
    },
    preserveSaveFailure: true,
    async save(result, context) {
      const mapping = requireMapping(dependencies, context.config.mappingId);
      const entityId = `profile-generation:${context.generationRecord.id}`;
      const rowIndex = await dependencies.insertMappedRow(mapping, {
        ...buildExternalProfileGenerationValues(result, mapping),
        identityValue: entityId,
      });
      return {
        entityId,
        mappingId: mapping.id,
        rowIndex,
      };
    },
  } satisfies GenerationAdapter<
    ProfileGenerateConfig,
    ProfileXmlResult,
    { entityId: string; mappingId: string; rowIndex: number }
  >;
}
