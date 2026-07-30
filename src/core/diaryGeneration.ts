import type { GenerationAdapter, XmlParseResult } from '@/type/generation';
import type { CharacterRef, DiaryEntry } from '@/type/diary';
import { GenerationRequestPartsSchema } from '@/type/generation';
import { parseSimpleXmlResult } from '@/util/generation';
import { parseConfiguredOutput } from '@/util/outputParsing';
import {
  diagnoseTaggedRoot,
  extractTaggedOutputCandidates,
  getIncompleteTaggedRootWarning,
  selectBestParsedCandidate,
} from '@/util/parseCandidates';
import { parsePrettified } from '@/util/zod';

export const DiaryGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  bookId: z.string(),
  bookTitle: z.string().default(''),
  occurredAt: z.string().default(''),
  outputFormat: z.string(),
  perspective: z.object({
    id: z.string().optional(),
    name: z.string(),
  }),
  userRequirement: z.string().default(''),
});
export type DiaryGenerateConfig = z.infer<typeof DiaryGenerateConfigSchema>;

export const DiaryReadReactionGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  bookId: z.string().default(''),
  bookTitle: z.string().default(''),
  occurredAt: z.string().default(''),
  outputFormat: z.string(),
  perspective: z.object({
    id: z.string().optional(),
    name: z.string(),
  }),
  sourceContent: z.string(),
  specialPrompt: z.string().default(''),
  userRequirement: z.string().default(''),
});
export type DiaryReadReactionGenerateConfig = z.infer<typeof DiaryReadReactionGenerateConfigSchema>;

export const DiaryGeneratedResultSchema = z.object({
  content: z.string(),
  occurredAt: z.string().default(''),
  title: z.string(),
});
export type DiaryGeneratedResult = z.infer<typeof DiaryGeneratedResultSchema>;

const DIARY_BLOCK_REGEX = /<日记(?:\s[^>]*)?>\s*标题[：:]([^\n]+)\s*时间[：:]([^\n]+)\s*内容[：:]([\s\S]*?)\s*<\/日记>/i;

function extractOptionalTag(raw: string, tagName: string) {
  const match = raw.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match?.[1]?.trim() || '';
}

function parseDiaryCandidate(raw: string): XmlParseResult<DiaryGeneratedResult> {
  const blockMatch = raw.match(DIARY_BLOCK_REGEX);
  if (blockMatch) {
    const title = blockMatch[1]?.trim() || '';
    const occurredAt = blockMatch[2]?.trim() || '';
    const content = blockMatch[3]?.trim() || '';

    if (!title || !occurredAt || !content) {
      return {
        ok: false,
        raw,
        warnings: ['日记内容不完整（标题、时间或内容为空）'],
      };
    }

    if (title === '{{标题}}' || occurredAt === '{{时间}}' || content === '{{内容}}') {
      return {
        ok: false,
        raw,
        warnings: ['检测到模板格式内容'],
      };
    }

    return {
      ok: true,
      raw,
      warnings: [],
      data: parsePrettified(DiaryGeneratedResultSchema, {
        content,
        occurredAt,
        title,
      }),
    };
  }

  const hasTitle = /(?:^|\n)\s*标题\s*[：:]/i.test(raw);
  const hasTime = /(?:^|\n)\s*时间\s*[：:]/i.test(raw);
  const hasContent = /(?:^|\n)\s*内容\s*[：:]/i.test(raw);
  const warnings = [
    !hasTitle ? '缺少必填字段「标题」（应使用“标题：”）' : '',
    !hasTime ? '缺少字段「时间」（应使用“时间：”）' : '',
    !hasContent ? '缺少必填字段「正文」（应使用“内容：”）' : '',
  ].filter(Boolean);
  return {
    ok: false,
    raw,
    warnings: warnings.length ? warnings : ['日记字段顺序不正确，应依次填写标题、时间和内容'],
  };
}

export function parseDiaryGeneratedResult(raw: string, fallbackOccurredAt = ''): XmlParseResult<DiaryGeneratedResult> {
  const diaryCandidates = extractTaggedOutputCandidates(raw, '日记');
  const selected = selectBestParsedCandidate(
    raw,
    diaryCandidates,
    candidate => parseDiaryCandidate(candidate.raw),
    ' <日记> ',
  );
  if (selected) {
    const incompleteWarning = getIncompleteTaggedRootWarning(raw, '日记', diaryCandidates.length);
    return {
      ...selected,
      warnings: [...new Set([...selected.warnings, incompleteWarning].filter(Boolean))],
    };
  }

  if (/<日记(?:\s|>)/i.test(raw) || /<\/日记\s*>/i.test(raw)) {
    return {
      ok: false,
      raw,
      warnings: diagnoseTaggedRoot(raw, '日记'),
    };
  }

  const parsed = parseSimpleXmlResult(raw);
  if (!parsed.ok) {
    return {
      ...parsed,
      warnings: [...parsed.warnings, '没有找到 <日记> 标题/时间/内容格式'],
    };
  }

  const occurredAt = extractOptionalTag(parsed.raw, 'time')
    || extractOptionalTag(parsed.raw, 'date')
    || extractOptionalTag(parsed.raw, 'occurredAt')
    || fallbackOccurredAt.trim();
  const warnings = [...parsed.warnings];
  if (!occurredAt) {
    warnings.push('没有读取到时间字段，已保存为空时间');
  }

  return {
    ok: true,
    raw: parsed.raw,
    warnings,
    data: parsePrettified(DiaryGeneratedResultSchema, {
      content: parsed.data.content,
      occurredAt,
      title: parsed.data.title,
    }),
  };
}

function buildDiaryTaskInstruction(config: DiaryGenerateConfig) {
  return [
    `请严格以${config.perspective.name}的第一人称口吻书写这篇日记，不要写成旁白总结。`,
    config.occurredAt.trim() ? `日记发生或写作时间：${config.occurredAt.trim()}` : '',
  ].filter(Boolean).join('\n');
}

function buildDiaryReactionContext(config: DiaryReadReactionGenerateConfig) {
  return [
    '以下是被阅读的日记正文，请先读完再写读后反应：',
    config.sourceContent,
  ].filter(Boolean).join('\n\n');
}

function buildDiaryReactionTaskInstruction(config: DiaryReadReactionGenerateConfig) {
  return [
    `请严格以${config.perspective.name}的第一人称书写读后反应，重点放在阅读后的情绪、判断和联想，不要写成摘要。`,
    config.occurredAt.trim() ? `反应发生或写作时间：${config.occurredAt.trim()}` : '',
  ].filter(Boolean).join('\n');
}

export function createDiaryGenerationAdapter(diaryStore: {
  createEntry: (
    input: Pick<DiaryEntry, 'title' | 'content' | 'occurredAt' | 'kind' | 'readers'> & {
      perspective: CharacterRef;
      bookId?: string;
      bookTitle?: string;
    },
  ) => { book: { id: string }; entry: DiaryEntry } | null;
}) {
  return {
    actionId: 'generate',
    appId: 'diary',
    buildRequest(config) {
      return parsePrettified(GenerationRequestPartsSchema, {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        taskInstruction: buildDiaryTaskInstruction(config),
        userRequirement: config.userRequirement,
      });
    },
    configSchema: DiaryGenerateConfigSchema,
    parse(raw, config) {
      const parsed = parseConfiguredOutput(
        'diary.generate',
        raw,
        DiaryGeneratedResultSchema,
        () => parseDiaryGeneratedResult(raw, config.occurredAt),
      );
      if (!parsed.ok || parsed.data.occurredAt) return parsed;
      return {
        ...parsed,
        data: {
          ...parsed.data,
          occurredAt: config.occurredAt,
        },
      };
    },
    async save(result, context) {
      const created = diaryStore.createEntry({
        bookId: context.config.bookId,
        bookTitle: context.config.bookTitle || undefined,
        content: result.content,
        kind: 'normal',
        occurredAt: result.occurredAt || context.config.occurredAt,
        perspective: context.config.perspective,
        readers: undefined,
        title: result.title,
      });
      if (!created) {
        throw new Error('目标日记书架不存在，无法保存生成结果');
      }
      return {
        bookId: created.book.id,
        entityId: created.entry.id,
        entry: created.entry,
      };
    },
  } satisfies GenerationAdapter<DiaryGenerateConfig, DiaryGeneratedResult, { bookId: string; entityId: string; entry: DiaryEntry }>;
}

export function createDiaryReadReactionGenerationAdapter(diaryStore: {
  createEntry: (
    input: Pick<DiaryEntry, 'title' | 'content' | 'occurredAt' | 'kind' | 'readers'> & {
      perspective: CharacterRef;
      bookId?: string;
      bookTitle?: string;
    },
  ) => { book: { id: string }; entry: DiaryEntry } | null;
}) {
  return {
    actionId: 'read-reaction',
    appId: 'diary',
    buildRequest(config) {
      return parsePrettified(GenerationRequestPartsSchema, {
        appPrompt: config.specialPrompt || config.appPrompt,
        context: buildDiaryReactionContext(config),
        outputFormat: config.outputFormat,
        taskInstruction: buildDiaryReactionTaskInstruction(config),
        userRequirement: config.userRequirement,
      });
    },
    configSchema: DiaryReadReactionGenerateConfigSchema,
    parse(raw, config) {
      const parsed = parseConfiguredOutput(
        'diary.reaction',
        raw,
        DiaryGeneratedResultSchema,
        () => parseDiaryGeneratedResult(raw, config.occurredAt),
      );
      if (!parsed.ok || parsed.data.occurredAt) return parsed;
      return {
        ...parsed,
        data: {
          ...parsed.data,
          occurredAt: config.occurredAt,
        },
      };
    },
    async save(result, context) {
      const created = diaryStore.createEntry({
        bookId: context.config.bookId || undefined,
        bookTitle: context.config.bookTitle || undefined,
        content: result.content,
        kind: 'read-reaction',
        occurredAt: result.occurredAt || context.config.occurredAt,
        perspective: context.config.perspective,
        readers: [context.config.perspective],
        title: result.title,
      });
      if (!created) {
        throw new Error('目标日记书架不存在，无法保存阅读反应');
      }
      return {
        bookId: created.book.id,
        entityId: created.entry.id,
        entry: created.entry,
      };
    },
  } satisfies GenerationAdapter<DiaryReadReactionGenerateConfig, DiaryGeneratedResult, { bookId: string; entityId: string; entry: DiaryEntry }>;
}
