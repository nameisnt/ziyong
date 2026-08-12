import {
  GenerationRequestPartsSchema,
  SimpleXmlResultSchema,
  type GenerationAdapter,
  type SimpleXmlResult,
} from '@/type/generation';
import type { TheaterEntry } from '@/type/theater';
import { CharacterRefSchema } from '@/type/diary';
import { parseTheaterXmlResult } from '@/util/generation';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parsePrettified } from '@/util/zod';

export const TheaterGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  entryId: z.string().default(''),
  existingContent: z.string().default(''),
  mode: z.enum(['create', 'rewrite']).default('create'),
  outputFormat: z.string(),
  participants: z.array(CharacterRefSchema).default([]),
  renderMode: z.enum(['markdown', 'frontend']).default('markdown'),
  typeId: z.string().default(''),
  typeName: z.string().default(''),
  typePrompt: z.string().default(''),
  userRequirement: z.string().default(''),
});
export type TheaterGenerateConfig = z.infer<typeof TheaterGenerateConfigSchema>;

export function createTheaterGenerationAdapter(theaterStore: {
  createEntry: (
    input: Pick<TheaterEntry, 'title' | 'content' | 'participants' | 'renderMode' | 'typeName'> &
      Partial<Pick<TheaterEntry, 'generationRecord' | 'generationReplay' | 'typeId'>>,
  ) => TheaterEntry;
  appendEntryVersion: (
    entryId: string,
    input: Pick<TheaterEntry, 'title' | 'content' | 'renderMode'> &
      Partial<Pick<TheaterEntry, 'generationRecord' | 'generationReplay'>>,
  ) => { entry: TheaterEntry; version: { id: string } } | null;
}) {
  return {
    actionId: 'generate',
    appId: 'theater',
    buildRequest(config) {
      return parsePrettified(GenerationRequestPartsSchema, {
        appPrompt: config.appPrompt,
        context: '',
        outputFormat: config.outputFormat,
        taskInstruction: '',
        typePrompt:
          config.typePrompt.trim() || (config.typeName.trim() ? `本次小剧场类型为“${config.typeName.trim()}”。` : ''),
        userRequirement: config.userRequirement,
      });
    },
    configSchema: TheaterGenerateConfigSchema,
    parse(raw) {
      return parseConfiguredOutput('theater.generate', raw, SimpleXmlResultSchema, () =>
        parseTheaterXmlResult(raw, { preserveContentMarkup: true }),
      );
    },
    async save(result, context) {
      if (context.config.mode === 'rewrite' && context.config.entryId) {
        const saved = theaterStore.appendEntryVersion(context.config.entryId, {
          content: result.content,
          generationRecord: context.generationRecord,
          renderMode: 'markdown',
          title: result.title,
        });
        if (!saved) throw new Error('目标小剧场不存在，无法保存重写版本');
        return {
          entityId: saved.entry.id,
          entry: saved.entry,
          versionId: saved.version.id,
        };
      }
      const entry = theaterStore.createEntry({
        content: result.content,
        generationRecord: context.generationRecord,
        participants: context.config.participants,
        renderMode: 'markdown',
        title: result.title,
        typeId: context.config.typeId,
        typeName: context.config.typeName,
      });
      return {
        entityId: entry.id,
        entry,
        versionId: undefined,
      };
    },
  } satisfies GenerationAdapter<
    TheaterGenerateConfig,
    SimpleXmlResult,
    { entityId: string; entry: TheaterEntry; versionId?: string }
  >;
}
