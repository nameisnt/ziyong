import type { GenerationAdapter, XmlParseResult } from '@/type/generation';
import { parsePrettified } from '@/util/zod';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parseTaggedOutputCandidates } from '@/util/parseCandidates';
import type { ExternalProfileTable } from './externalBridge';

export const ProfileGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  sheetKey: z.string().min(1, '请选择外部资料表'),
  titleColumn: z.string().min(1, '请选择标题列'),
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
  getTables: () => ExternalProfileTable[];
  insertRow: (sheetKey: string, values: Record<string, unknown>) => Promise<number> | number;
};

function requireTable(dependencies: ProfileGenerationDependencies, sheetKey: string) {
  const table = dependencies.getTables().find(candidate => candidate.key === sheetKey);
  if (!table) throw new Error('请选择有效的外部资料表');
  return table;
}

function requireTitleColumn(table: ExternalProfileTable, titleColumn: string) {
  const column = table.columns.find(candidate => candidate.sourceLabel === titleColumn);
  if (!column) throw new Error('请选择有效的标题列');
  return column;
}

function createFieldInstruction(table: ExternalProfileTable, titleColumn: string) {
  const columns = table.columns.filter(column => column.sourceLabel && column.sourceLabel !== titleColumn);
  if (!columns.length) return '';
  return [
    '请按以下外部表列名填写 <fields> 中的 <field id="列名">字段值</field>；只填写上下文可确认的信息，未知可留空：',
    ...columns.map(column => `- ${column.label}（id=${column.sourceLabel}）`),
  ].join('\n');
}

export function buildExternalProfileGenerationValues(
  result: ProfileXmlResult,
  table: ExternalProfileTable,
  titleColumn: string,
) {
  requireTitleColumn(table, titleColumn);
  const allowedFieldKeys = new Set(table.columns.map(column => column.sourceLabel).filter(Boolean));
  const fields = Object.fromEntries(
    Object.entries(result.fields).filter(([fieldKey]) => allowedFieldKeys.has(fieldKey)),
  );
  if (allowedFieldKeys.has('summary') && result.summary.trim()) fields.summary = result.summary.trim();
  if (allowedFieldKeys.has('tags') && result.tags.length) fields.tags = result.tags.join('、');
  return {
    ...fields,
    [titleColumn]: result.title.trim(),
  };
}

export function createProfileGenerationAdapter(dependencies: ProfileGenerationDependencies) {
  return {
    appId: 'profiles',
    actionId: 'generate',
    configSchema: ProfileGenerateConfigSchema,
    buildRequest(config) {
      const table = requireTable(dependencies, config.sheetKey);
      requireTitleColumn(table, config.titleColumn);
      const fieldInstruction = createFieldInstruction(table, config.titleColumn);
      return {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        taskInstruction: [
          `目标外部表：${table.name}`,
          fieldInstruction,
          config.titleHint.trim() ? `标题或对象名：${config.titleHint.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        taskTemplateVariables: {
          fieldInstruction,
          kindInstruction: '',
          tableName: table.name,
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
      const table = requireTable(dependencies, context.config.sheetKey);
      requireTitleColumn(table, context.config.titleColumn);
      const entityId = `profile-generation:${context.generationRecord.id}`;
      const rowIndex = await dependencies.insertRow(
        table.key,
        buildExternalProfileGenerationValues(result, table, context.config.titleColumn),
      );
      return {
        entityId,
        sheetKey: table.key,
        rowIndex,
      };
    },
  } satisfies GenerationAdapter<
    ProfileGenerateConfig,
    ProfileXmlResult,
    { entityId: string; sheetKey: string; rowIndex: number }
  >;
}
