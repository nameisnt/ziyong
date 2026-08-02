import {
  ContentXmlResultSchema,
  SimpleXmlResultSchema,
  type ContentXmlResult,
  type GenerationAdapter,
  type SimpleXmlResult,
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
import { parsePrettified } from '@/util/zod';

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

export const ExtraChapterGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  bookId: z.string(),
  chapterId: z.string().default(''),
  chapterMode: ExtraChapterGenerationModeSchema.default('续写上一章'),
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
});
export type ExtraChapterGenerateConfig = z.infer<typeof ExtraChapterGenerateConfigSchema>;

export function resolveGeneratedExtraBookTitle(explicitTitle: string, typeName: string) {
  return explicitTitle.trim() || typeName.trim() || '未命名番外';
}

export function createExtraChapterGenerationRecord(
  config: ExtraChapterGenerateConfig,
  source?: SourceSelection,
): ExtraChapterGenerationRecord {
  return {
    id: `extra_generation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    chapterMode: config.chapterMode,
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
  };
}

function buildChapterTaskInstruction(config: ExtraChapterGenerateConfig) {
  const modeInstruction = {
    新开一本书: '请创作本书第一章，不要续接来源内容中的旧章节。',
    续写上一章: '请紧接上述最后一章续写，不要复述或重写已有章节，并延续上一章的语气与悬念。',
    重写当前章节: '请重写上述目标章节，保留整体前后文方向，但重新组织表达。',
  }[config.chapterMode];
  const typeFallback =
    !config.typePrompt.trim() && config.typeName.trim() ? `本次番外类型为“${config.typeName.trim()}”。` : '';
  return [modeInstruction, typeFallback].filter(Boolean).join('\n');
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
  updateChapter: (
    bookId: string,
    chapterId: string,
    input: Pick<ExtraChapter, 'title' | 'content'> & { generationRecord?: ExtraChapterGenerationRecord },
  ) => ExtraChapter | null;
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
        typePrompt: config.typePrompt,
        userRequirement: config.userRequirement,
      });
    },
    configSchema: ExtraChapterGenerateConfigSchema,
    parse(raw) {
      return parseConfiguredOutput('extras.chapter', raw, SimpleXmlResultSchema, () => parseSimpleXmlResult(raw));
    },
    async save(result, context) {
      const generationRecord = createExtraChapterGenerationRecord(context.config, context.source);
      if (context.config.chapterMode === '重写当前章节' && context.config.chapterId) {
        const chapter = extrasStore.updateChapter(context.config.bookId, context.config.chapterId, {
          content: result.content,
          generationRecord,
          title: result.title,
        });
        if (!chapter) {
          throw new Error('目标章节不存在，无法覆盖当前章节');
        }
        return {
          chapter,
          entityId: chapter.id,
          mode: 'rewrite' as const,
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
      return {
        chapter,
        entityId: chapter.id,
        mode: 'create' as const,
      };
    },
  } satisfies GenerationAdapter<
    ExtraChapterGenerateConfig,
    SimpleXmlResult,
    { chapter: ExtraChapter; entityId: string; mode: 'rewrite' | 'create' }
  >;
}
