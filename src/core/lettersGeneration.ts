import { CharacterRefSchema } from '@/type/diary';
import {
  GenerationRequestPartsSchema,
  SimpleXmlResultSchema,
  type GenerationAdapter,
  type SimpleXmlResult,
} from '@/type/generation';
import type { LetterBook, LetterEntry, LetterFormat } from '@/type/letter';
import { LetterFormatSchema } from '@/type/letter';
import { parseSimpleXmlResult } from '@/util/generation';
import { parseConfiguredOutput } from '@/util/outputParsing';
import { parsePrettified } from '@/util/zod';

export const LetterGenerateConfigSchema = z.object({
  appPrompt: z.string(),
  bookId: z.string().default(''),
  bookTitle: z.string().default(''),
  format: LetterFormatSchema,
  entryId: z.string().default(''),
  existingContent: z.string().default(''),
  mode: z.enum(['create', 'rewrite']).default('create'),
  outputFormat: z.string(),
  recentLettersContext: z.string().default(''),
  receiver: CharacterRefSchema,
  sender: CharacterRefSchema,
  userRequirement: z.string().default(''),
});
export type LetterGenerateConfig = z.infer<typeof LetterGenerateConfigSchema>;

function formatLabel(format: LetterFormat) {
  if (format === 'sms') return '短信';
  if (format === 'email') return '邮件';
  if (format === 'note') return '便签';
  return '正式信件';
}

function buildTaskInstruction(config: LetterGenerateConfig) {
  return `请由${config.sender.name}写给${config.receiver.name}，采用${formatLabel(config.format)}形式。`;
}

export function createLettersGenerationAdapter(lettersStore: {
  createEntry: (
    input: Pick<LetterEntry, 'title' | 'content' | 'format' | 'sender' | 'receiver'> & {
      bookId?: string;
      bookTitle?: string;
    },
  ) => { book: LetterBook; entry: LetterEntry } | null;
  appendEntryVersion: (
    bookId: string,
    entryId: string,
    input: Pick<LetterEntry, 'title' | 'content' | 'format'>,
  ) => { book: LetterBook; entry: LetterEntry; version: { id: string } } | null;
}) {
  return {
    actionId: 'generate',
    appId: 'letters',
    buildRequest(config) {
      return parsePrettified(GenerationRequestPartsSchema, {
        appPrompt: config.appPrompt,
        context: [config.recentLettersContext, config.mode === 'rewrite' ? config.existingContent : '']
          .filter(Boolean)
          .join('\n\n'),
        outputFormat: config.outputFormat,
        taskInstruction:
          config.mode === 'rewrite'
            ? `${buildTaskInstruction(config)} 请将上述目标信件重写为完整替代版本，不要写成回信或续写。`
            : buildTaskInstruction(config),
        userRequirement: config.userRequirement,
      });
    },
    configSchema: LetterGenerateConfigSchema,
    parse(raw) {
      return parseConfiguredOutput('letters.generate', raw, SimpleXmlResultSchema, () => parseSimpleXmlResult(raw));
    },
    async save(result, context) {
      if (context.config.mode === 'rewrite' && context.config.bookId && context.config.entryId) {
        const saved = lettersStore.appendEntryVersion(context.config.bookId, context.config.entryId, {
          content: result.content,
          format: context.config.format,
          title: result.title,
        });
        if (!saved) throw new Error('目标书信不存在，无法保存重写版本');
        return {
          book: saved.book,
          entityId: saved.entry.id,
          entry: saved.entry,
          versionId: saved.version.id,
        };
      }
      const saved = lettersStore.createEntry({
        bookId: context.config.bookId || undefined,
        bookTitle: context.config.bookTitle || undefined,
        content: result.content,
        format: context.config.format,
        receiver: context.config.receiver,
        sender: context.config.sender,
        title: result.title,
      });
      if (!saved) {
        throw new Error('目标书信分册不存在，无法保存生成结果');
      }
      return {
        book: saved.book,
        entityId: saved.entry.id,
        entry: saved.entry,
        versionId: undefined,
      };
    },
  } satisfies GenerationAdapter<
    LetterGenerateConfig,
    SimpleXmlResult,
    { book: LetterBook; entityId: string; entry: LetterEntry; versionId?: string }
  >;
}
