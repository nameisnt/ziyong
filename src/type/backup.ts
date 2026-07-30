import { BaguSettingsSchema } from '@/store/bagu';
import { ChatReaderSettingsSchema } from '@/store/reader';
import { PromptSettingsSchema } from '@/store/prompts';
import { PendingVisibilityRecoveryMapSchema } from '@/type/recovery';
import { DiaryScopeDataSchema } from '@/type/diary';
import { ExtraScopeDataSchema } from '@/type/extra';
import { ForumScopeDataSchema } from '@/type/forum';
import { LettersScopeDataSchema } from '@/type/letter';
import { Settings } from '@/type/settings';
import { SummaryScopeDataSchema } from '@/type/summary';
import { TheaterScopeDataSchema } from '@/type/theater';

function createEnvelopeSchema<T extends z.ZodTypeAny>(scopeSchema: T) {
  return z.object({
    __chatScoped: z.literal(true).default(true),
    legacyScopeMigrations: z.record(z.string(), z.string()).default({}),
    scopes: z.record(z.string(), scopeSchema).default({}),
  }).default({
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: {},
  });
}

const SummaryEnvelopeSchema = createEnvelopeSchema(SummaryScopeDataSchema);
const DiaryEnvelopeSchema = createEnvelopeSchema(DiaryScopeDataSchema);
const ExtrasEnvelopeSchema = createEnvelopeSchema(ExtraScopeDataSchema);
const ForumEnvelopeSchema = createEnvelopeSchema(ForumScopeDataSchema);
const LettersEnvelopeSchema = createEnvelopeSchema(LettersScopeDataSchema);
const TheaterEnvelopeSchema = createEnvelopeSchema(TheaterScopeDataSchema);

export const PhoneBackupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    settings: Settings,
    prompts: PromptSettingsSchema,
    bagu: BaguSettingsSchema,
    reader: ChatReaderSettingsSchema,
    recoveries: PendingVisibilityRecoveryMapSchema,
    domains: z.record(z.string(), z.unknown()).default({}),
    summaries: SummaryEnvelopeSchema.optional(),
    diaries: DiaryEnvelopeSchema.optional(),
    extras: ExtrasEnvelopeSchema.optional(),
    forum: ForumEnvelopeSchema.optional(),
    letters: LettersEnvelopeSchema.optional(),
    theater: TheaterEnvelopeSchema.optional(),
  }),
});
export type PhoneBackup = z.infer<typeof PhoneBackupSchema>;
