import type { SummaryEntry } from '@/type/summary';
import { GenerationRequestPartsSchema, SimpleXmlResultSchema, type GenerationAdapter, type SimpleXmlResult } from '@/type/generation';
import { parseSimpleXmlResult } from '@/util/generation';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parsePrettified } from '@/util/zod';

export const SummaryGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  bookId: z.string(),
  outputFormat: z.string(),
  userRequirement: z.string().default(''),
});
export type SummaryGenerateConfig = z.infer<typeof SummaryGenerateConfigSchema>;

export function createSummaryGenerationAdapter(summaryStore: {
  createEntry: (bookId: string, input: Pick<SummaryEntry, 'title' | 'content' | 'rangeLabel'>) => SummaryEntry | null;
}) {
  return {
    actionId: 'generate',
    appId: 'summary',
    buildRequest(config) {
      return parsePrettified(GenerationRequestPartsSchema, {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        userRequirement: config.userRequirement,
      });
    },
    configSchema: SummaryGenerateConfigSchema,
    parse(raw) {
      return parseConfiguredOutput('summary.generate', raw, SimpleXmlResultSchema, () => parseSimpleXmlResult(raw));
    },
    async save(result, context) {
      const entry = summaryStore.createEntry(context.config.bookId, {
        content: result.content,
        rangeLabel: context.source.label,
        title: result.title,
      });
      if (!entry) {
        throw new Error('目标总结集不存在，无法保存生成结果');
      }
      return {
        entityId: entry.id,
        entry,
      };
    },
  } satisfies GenerationAdapter<SummaryGenerateConfig, SimpleXmlResult, { entityId: string; entry: SummaryEntry }>;
}
