import type { DigestEntry, useDigestStore } from './store';
import { SimpleXmlResultSchema, type GenerationAdapter, type SimpleXmlResult } from '@/type/generation';
import { parseSimpleXmlResult } from '@/util/generation';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { getSourceLastFloor } from '@/util/sourceFloor';

export const DigestGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  outputFormat: z.string(),
  userRequirement: z.string().default(''),
});
export type DigestGenerateConfig = z.infer<typeof DigestGenerateConfigSchema>;

export function createDigestGenerationAdapter(digestStore: ReturnType<typeof useDigestStore>) {
  return {
    appId: 'digest',
    actionId: 'generate',
    configSchema: DigestGenerateConfigSchema,
    buildRequest(config) {
      return {
        appPrompt: config.appPrompt,
        outputFormat: config.outputFormat,
        userRequirement: config.userRequirement,
      };
    },
    parse(raw) {
      return parseConfiguredOutput('digest.generate', raw, SimpleXmlResultSchema, () => parseSimpleXmlResult(raw));
    },
    save(result, context) {
      const sourceFloorEnd = getSourceLastFloor(context.source);
      const entry = digestStore.createEntry({
        title: result.title,
        content: result.content,
        kind: 'ai',
        sourceLabel: context.source.label,
        directoryOrder: sourceFloorEnd,
        generationRecord: context.generationRecord,
        sourceFloorEnd,
      });
      return {
        entityId: entry.id,
        entry,
      };
    },
  } satisfies GenerationAdapter<DigestGenerateConfig, SimpleXmlResult, { entityId: string; entry: DigestEntry }>;
}
