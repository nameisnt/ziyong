import {
  ContentXmlResultSchema,
  SimpleXmlResultSchema,
  type ContentXmlResult,
  type GenerationAdapter,
  type SourceSelection,
} from '@/type/generation';
import {
  ExtraChapterGenerationReferenceSchema,
  type ExtraChapter,
  type ExtraChapterGenerationRecord,
  type ExtraSummary,
} from '@/type/extra';
import { GenerationRequestPartsSchema } from '@/type/generation';
import { GenerationSourceModeSchema } from '@/type/settings';
import { parseContentXmlResult, parseSimpleXmlResult } from '@/util/generation';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { createDisplayRegex, extractWithRegexRules } from '@/util/regexDisplay';
import { parsePrettified } from '@/util/zod';

const ExtraChapterParsedResultSchema = SimpleXmlResultSchema.extend({
  summary: z.string().default(''),
});
type ExtraChapterParsedResult = z.infer<typeof ExtraChapterParsedResultSchema>;

export const ExtraSummaryGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  bookId: z.string(),
  chaptersContext: z.string(),
  coveredChapterIds: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  outputFormat: z.string(),
  typePrompt: z.string().default(''),
  userRequirement: z.string().default(''),
});
export type ExtraSummaryGenerateConfig = z.infer<typeof ExtraSummaryGenerateConfigSchema>;

export const ExtraChapterGenerationModeSchema = z.enum(['续写上一章', '新开一本书', '重写当前章节']);
export type ExtraChapterGenerationMode = z.infer<typeof ExtraChapterGenerationModeSchema>;
export const ExtraChapterGenerationIntentSchema = z.enum(['续写上一章', '新开一本书']);
export type ExtraChapterGenerationIntent = z.infer<typeof ExtraChapterGenerationIntentSchema>;

export const ExtraChapterGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  bookId: z.string(),
  chapterId: z.string().default(''),
  chapterMode: ExtraChapterGenerationModeSchema.default('续写上一章'),
  generationIntent: ExtraChapterGenerationIntentSchema.optional(),
  outputFormat: z.string(),
  previousChapterContext: z.string().default(''),
  fromStartEnd: z.number().int().nonnegative().default(20),
  rangeText: z.string().default(''),
  recentCount: z.number().int().positive().default(20),
  references: z.array(ExtraChapterGenerationReferenceSchema).default([]),
  singleMessageId: z.number().int().nonnegative().default(0),
  sourceMode: GenerationSourceModeSchema.default('latest'),
  tavernPresetName: z.string().default(''),
  typeId: z.string().default(''),
  typeName: z.string().default(''),
  typePrompt: z.string().default(''),
  userRequirement: z.string().default(''),
  parseSummary: z.boolean().optional(),
  removeSummaryBlock: z.boolean().optional(),
  summaryFormatHint: z.string().optional(),
  summaryRuleFlags: z.string().optional(),
  summaryRuleId: z.string().optional(),
  summaryRuleName: z.string().optional(),
  summaryRulePattern: z.string().optional(),
  summaryRuleReplacement: z.string().optional(),
});
export type ExtraChapterGenerateConfig = z.infer<typeof ExtraChapterGenerateConfigSchema>;

export function resolveGeneratedExtraBookTitle(explicitTitle: string, typeName: string) {
  return explicitTitle.trim() || typeName.trim() || '未命名番外';
}

export function createExtraChapterGenerationRecord(
  config: ExtraChapterGenerateConfig,
  source?: SourceSelection,
  replay?: ExtraChapterGenerationRecord['replay'],
): ExtraChapterGenerationRecord {
  return {
    id: `extra_generation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    chapterMode: config.chapterMode,
    generationIntent: resolveChapterGenerationIntent(config),
    createdAt: new Date().toISOString(),
    fromStartEnd: config.fromStartEnd,
    rangeText: config.rangeText,
    recentCount: config.recentCount,
    references: config.references.map(reference => ({
      ...reference,
      sourcePath: [...reference.sourcePath],
    })),
    singleMessageId: config.singleMessageId,
    sourceLabel: source?.label || '',
    sourceMessageIds: [...(source?.messageIds || [])],
    sourceMode: config.sourceMode,
    tavernPresetName: config.tavernPresetName,
    typeId: config.typeId,
    typeName: config.typeName,
    typePrompt: config.typePrompt,
    userRequirement: config.userRequirement,
    parseSummary: config.parseSummary,
    removeSummaryBlock: config.removeSummaryBlock,
    summaryFormatHint: config.summaryFormatHint,
    summaryRuleFlags: config.summaryRuleFlags,
    summaryRuleId: config.summaryRuleId,
    summaryRuleName: config.summaryRuleName,
    summaryRulePattern: config.summaryRulePattern,
    summaryRuleReplacement: config.summaryRuleReplacement,
    replay,
  };
}

function extractStructuredSummary(raw: string) {
  const match = raw.match(/<summary(?:\s[^>]*)?>([\s\S]*?)<\/summary>/i);
  if (!match?.[1]) return '';
  const parser = new DOMParser();
  const document = parser.parseFromString(match[1], 'text/html');
  return document.body.textContent?.trim() || '';
}

function removeSingleSummaryBlock(content: string, config: ExtraChapterGenerateConfig) {
  if (!config.removeSummaryBlock || !config.summaryRulePattern?.trim()) return { content, warning: '' };
  try {
    const configured = createDisplayRegex(config.summaryRulePattern, config.summaryRuleFlags || '');
    const single = new RegExp(configured.source, configured.flags.replace(/g/g, ''));
    const global = new RegExp(
      configured.source,
      configured.flags.includes('g') ? configured.flags : `${configured.flags}g`,
    );
    const matches = Array.from(content.matchAll(global));
    if (matches.length !== 1 || !matches[0]?.[0].trim()) {
      return {
        content,
        warning: matches.length > 1 ? '正文内摘要块不唯一，已保留正文' : '正文内未定位到完整摘要块，已保留正文',
      };
    }
    return { content: content.replace(single, '').trim(), warning: '' };
  } catch (error) {
    return {
      content,
      warning: `摘要移除规则无效，已保留正文：${error instanceof Error ? error.message : '正则无效'}`,
    };
  }
}

export function parseExtraChapterOutput(raw: string, config: ExtraChapterGenerateConfig) {
  const parsed = parseConfiguredOutput('extras.chapter', raw, ExtraChapterParsedResultSchema, () => {
    const fallback = parseSimpleXmlResult(raw);
    if (!fallback.ok) return fallback;
    return {
      ...fallback,
      data: { ...fallback.data, summary: extractStructuredSummary(fallback.raw) },
    };
  });
  if (!parsed.ok || !config.parseSummary) return parsed;

  const structuredSummary = parsed.data.summary.trim() || extractStructuredSummary(parsed.raw);
  let summary = structuredSummary;
  let summaryWarning = '';
  if (!summary && config.summaryRulePattern?.trim()) {
    const extracted = extractWithRegexRules(parsed.raw, [
      {
        enabled: true,
        flags: config.summaryRuleFlags || '',
        id: config.summaryRuleId || '',
        name: config.summaryRuleName || '番外摘要',
        operation: 'extract',
        order: 0,
        pattern: config.summaryRulePattern,
        renderMode: 'text',
        replacement: config.summaryRuleReplacement || '',
      },
    ]);
    summary = extracted.applied.length ? extracted.content.trim() : '';
    summaryWarning = extracted.errors.join('；');
  }
  if (!summary) summaryWarning ||= '未匹配到番外摘要，正文仍可正常保存';

  const removed = summary
    ? removeSingleSummaryBlock(parsed.data.content, config)
    : { content: parsed.data.content, warning: '' };
  return {
    ...parsed,
    data: { ...parsed.data, content: removed.content, summary },
    warnings: [...new Set([...parsed.warnings, summaryWarning, removed.warning].filter(Boolean))],
  };
}

export function saveExtraChapterPreview(
  extrasStore: {
    appendChapterVersion: (
      bookId: string,
      chapterId: string,
      input: Pick<ExtraChapter, 'title' | 'content'> & { generationRecord?: ExtraChapterGenerationRecord },
    ) => { chapter: ExtraChapter; version: { id: string } } | null;
    createChapter: (
      bookId: string,
      input: Pick<ExtraChapter, 'title' | 'content'> & { generationRecord?: ExtraChapterGenerationRecord },
    ) => ExtraChapter | null;
    upsertAutoChapterSummary?: (bookId: string, chapterId: string, content: string) => ExtraSummary | null;
  },
  input: {
    bookId: string;
    chapterId?: string;
    content: string;
    generationRecord?: ExtraChapterGenerationRecord;
    mode: ExtraChapterGenerationMode;
    summary?: string;
    title: string;
  },
) {
  if (input.mode === '重写当前章节' && input.chapterId) {
    const saved = extrasStore.appendChapterVersion(input.bookId, input.chapterId, {
      content: input.content,
      generationRecord: input.generationRecord,
      title: input.title,
    });
    if (!saved) return null;
    if (input.summary?.trim()) {
      extrasStore.upsertAutoChapterSummary?.(input.bookId, saved.chapter.id, input.summary);
    }
    return { chapter: saved.chapter, versionId: saved.version.id };
  }
  const chapter = extrasStore.createChapter(input.bookId, {
    content: input.content,
    generationRecord: input.generationRecord,
    title: input.title,
  });
  if (chapter && input.summary?.trim()) {
    extrasStore.upsertAutoChapterSummary?.(input.bookId, chapter.id, input.summary);
  }
  return chapter ? { chapter, versionId: '' } : null;
}

function resolveChapterGenerationIntent(config: ExtraChapterGenerateConfig): ExtraChapterGenerationIntent {
  if (config.generationIntent) return config.generationIntent;
  return config.chapterMode === '新开一本书' ? '新开一本书' : '续写上一章';
}

function buildChapterTaskInstruction(config: ExtraChapterGenerateConfig) {
  const generationIntent = resolveChapterGenerationIntent(config);
  const modeInstruction = {
    新开一本书: '请创作本书第一章，不要续接来源内容中的旧章节。',
    续写上一章: '请紧接上述最后一章续写，不要复述或重写已有章节，并延续上一章的语气与悬念。',
  }[generationIntent];
  const typeFallback =
    !config.typePrompt.trim() && config.typeName.trim() ? `本次番外类型为“${config.typeName.trim()}”。` : '';
  const summaryInstruction = config.parseSummary
    ? config.summaryFormatHint?.trim() || '请同时输出简洁的 <summary>番外摘要</summary>。'
    : '';
  return [modeInstruction, typeFallback, summaryInstruction].filter(Boolean).join('\n');
}

function buildChapterTaskTemplateVariables(config: ExtraChapterGenerateConfig) {
  const generationIntent = resolveChapterGenerationIntent(config);
  return {
    modeInstruction: {
      新开一本书: '请创作本书第一章，不要续接来源内容中的旧章节。',
      续写上一章: '请紧接上述最后一章续写，不要复述或重写已有章节，并延续上一章的语气与悬念。',
    }[generationIntent],
    typeFallback:
      !config.typePrompt.trim() && config.typeName.trim() ? `本次番外类型为“${config.typeName.trim()}”。` : '',
  };
}

export function createExtraSummaryGenerationAdapter(extrasStore: {
  createSummary: (
    bookId: string,
    input: Pick<ExtraSummary, 'content' | 'coveredChapterIds' | 'enabled'>,
  ) => ExtraSummary | null;
}) {
  return {
    actionId: 'chapter-summary',
    appId: 'extras',
    buildRequest(config) {
      return parsePrettified(GenerationRequestPartsSchema, {
        appPrompt: config.appPrompt,
        context: config.chaptersContext,
        outputFormat: config.outputFormat,
        taskInstruction: '请概括上述已选章节，提炼关键事件、人物状态变化和后续续写需要保留的信息。',
        typePrompt: config.typePrompt,
        userRequirement: config.userRequirement,
      });
    },
    configSchema: ExtraSummaryGenerateConfigSchema,
    parse(raw) {
      return parseConfiguredOutput('extras.summary', raw, ContentXmlResultSchema, () => parseContentXmlResult(raw));
    },
    async save(result, context) {
      const summary = extrasStore.createSummary(context.config.bookId, {
        content: result.content,
        coveredChapterIds: context.config.coveredChapterIds,
        enabled: context.config.enabled,
      });
      if (!summary) {
        throw new Error('目标番外不存在，无法保存章节总结');
      }
      return {
        entityId: summary.id,
        summary,
      };
    },
  } satisfies GenerationAdapter<
    ExtraSummaryGenerateConfig,
    ContentXmlResult,
    { entityId: string; summary: ExtraSummary }
  >;
}

export function createExtraChapterGenerationAdapter(extrasStore: {
  createChapter: (
    bookId: string,
    input: Pick<ExtraChapter, 'title' | 'content'> & { generationRecord?: ExtraChapterGenerationRecord },
  ) => ExtraChapter | null;
  appendChapterVersion: (
    bookId: string,
    chapterId: string,
    input: Pick<ExtraChapter, 'title' | 'content'> & { generationRecord?: ExtraChapterGenerationRecord },
  ) => { chapter: ExtraChapter; version: { id: string } } | null;
  upsertAutoChapterSummary?: (bookId: string, chapterId: string, content: string) => ExtraSummary | null;
}) {
  return {
    actionId: 'chapter-generate',
    appId: 'extras',
    buildRequest(config) {
      return parsePrettified(GenerationRequestPartsSchema, {
        appPrompt: config.appPrompt,
        context: config.previousChapterContext,
        outputFormat: config.outputFormat,
        taskInstruction: buildChapterTaskInstruction(config),
        taskTemplateVariables: buildChapterTaskTemplateVariables(config),
        typePrompt: config.typePrompt,
        userRequirement: config.userRequirement,
      });
    },
    configSchema: ExtraChapterGenerateConfigSchema,
    parse(raw, config) {
      return parseExtraChapterOutput(raw, config);
    },
    async save(result, context) {
      const generationRecord = createExtraChapterGenerationRecord(context.config, context.source, context.replay);
      generationRecord.reasoning = context.generationRecord.reasoning;
      if (context.config.chapterMode === '重写当前章节' && context.config.chapterId) {
        const saved = extrasStore.appendChapterVersion(context.config.bookId, context.config.chapterId, {
          content: result.content,
          generationRecord,
          title: result.title,
        });
        if (!saved) {
          throw new Error('目标章节不存在，无法保存重写版本');
        }
        if (result.summary.trim()) {
          extrasStore.upsertAutoChapterSummary?.(context.config.bookId, saved.chapter.id, result.summary);
        }
        return {
          chapter: saved.chapter,
          entityId: saved.chapter.id,
          mode: 'rewrite' as const,
          versionId: saved.version.id,
        };
      }

      const chapter = extrasStore.createChapter(context.config.bookId, {
        content: result.content,
        generationRecord,
        title: result.title,
      });
      if (!chapter) {
        throw new Error('目标番外不存在，无法保存章节');
      }
      if (result.summary.trim()) {
        extrasStore.upsertAutoChapterSummary?.(context.config.bookId, chapter.id, result.summary);
      }
      return {
        chapter,
        entityId: chapter.id,
        mode: 'create' as const,
      };
    },
  } satisfies GenerationAdapter<
    ExtraChapterGenerateConfig,
    ExtraChapterParsedResult,
    { chapter: ExtraChapter; entityId: string; mode: 'rewrite' | 'create'; versionId?: string }
  >;
}
