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
  return z
    .object({
      __chatScoped: z.literal(true).default(true),
      legacyScopeMigrations: z.record(z.string(), z.string()).default({}),
      scopes: z.record(z.string(), scopeSchema).default({}),
    })
    .default({
      __chatScoped: true,
      legacyScopeMigrations: {},
      scopes: {},
    });
}

export function createChatScopedBackupSchema<T extends z.ZodTypeAny>(scopeSchema: T) {
  return createEnvelopeSchema(scopeSchema);
}

export const SummaryEnvelopeSchema = createEnvelopeSchema(SummaryScopeDataSchema);
export const DiaryEnvelopeSchema = createEnvelopeSchema(DiaryScopeDataSchema);
export const ExtrasEnvelopeSchema = createEnvelopeSchema(ExtraScopeDataSchema);
export const ForumEnvelopeSchema = createEnvelopeSchema(ForumScopeDataSchema);
export const LettersEnvelopeSchema = createEnvelopeSchema(LettersScopeDataSchema);
export const TheaterEnvelopeSchema = createEnvelopeSchema(TheaterScopeDataSchema);

const PhoneBackupBaseSchema = z.object({
  exportedAt: z.string(),
});

export const PluginPresetBackupRecordSchema = z.object({
  builtIn: z.boolean().optional(),
  createdAt: z.string(),
  id: z.string(),
  name: z.string(),
  raw: z.record(z.string(), z.unknown()),
  sourceFileName: z.string(),
  sourceFormat: z.enum(['legacy', 'modern']),
  sourceRoot: z.enum(['array', 'object']),
  updatedAt: z.string(),
});
export type PluginPresetBackupRecord = z.infer<typeof PluginPresetBackupRecordSchema>;

export const PluginPresetBackupBundleSchema = z.object({
  appDefaults: z.record(z.string(), z.string()).default({}),
  records: z.array(PluginPresetBackupRecordSchema),
});
export type PluginPresetBackupBundle = z.infer<typeof PluginPresetBackupBundleSchema>;

export const PhoneBackupFullDataSchema = z.object({
  settings: Settings,
  prompts: PromptSettingsSchema,
  bagu: BaguSettingsSchema,
  reader: ChatReaderSettingsSchema,
  recoveries: PendingVisibilityRecoveryMapSchema,
  domains: z.record(z.string(), z.unknown()).default({}),
  domainVersions: z.record(z.string(), z.number().int().positive()).default({}),
  summaries: SummaryEnvelopeSchema.optional(),
  diaries: DiaryEnvelopeSchema.optional(),
  extras: ExtrasEnvelopeSchema.optional(),
  forum: ForumEnvelopeSchema.optional(),
  letters: LettersEnvelopeSchema.optional(),
  theater: TheaterEnvelopeSchema.optional(),
});

export const PhoneBackupFullDataV2Schema = PhoneBackupFullDataSchema.extend({
  pluginPresets: PluginPresetBackupBundleSchema,
});

export const HomeIconAssetBackupSchema = z.object({
  data: z.string(),
  id: z.string(),
  name: z.string(),
});

export const PhoneBackupFullDataV3Schema = PhoneBackupFullDataV2Schema.extend({
  homeIconAssets: z.array(HomeIconAssetBackupSchema).default([]),
});

const PhoneBackupCurrentChatDataSchema = z.object({
  domains: z.record(z.string(), z.unknown()).default({}),
  domainVersions: z.record(z.string(), z.number().int().positive()).default({}),
});

const PhoneBackupLegacyDataSchema = PhoneBackupCurrentChatDataSchema.extend({
  bagu: BaguSettingsSchema.optional(),
  prompts: PromptSettingsSchema.optional(),
  reader: ChatReaderSettingsSchema.optional(),
  recoveries: PendingVisibilityRecoveryMapSchema.optional(),
  settings: Settings.optional(),
  summaries: SummaryEnvelopeSchema.optional(),
  diaries: DiaryEnvelopeSchema.optional(),
  extras: ExtrasEnvelopeSchema.optional(),
  forum: ForumEnvelopeSchema.optional(),
  letters: LettersEnvelopeSchema.optional(),
  theater: TheaterEnvelopeSchema.optional(),
});

export const PhoneBackupSchema = z.union([
  PhoneBackupBaseSchema.extend({
    backupKind: z.literal('full'),
    data: PhoneBackupFullDataSchema,
    schemaVersion: z.literal(1),
  }),
  PhoneBackupBaseSchema.extend({
    backupKind: z.literal('full'),
    data: PhoneBackupFullDataV2Schema,
    schemaVersion: z.literal(2),
  }),
  PhoneBackupBaseSchema.extend({
    backupKind: z.literal('full'),
    data: PhoneBackupFullDataV3Schema,
    schemaVersion: z.literal(3),
  }),
  PhoneBackupBaseSchema.extend({
    backupKind: z.literal('current-chat'),
    data: PhoneBackupCurrentChatDataSchema,
    schemaVersion: z.literal(1),
  }),
  PhoneBackupBaseSchema.extend({
    backupKind: z.undefined().optional(),
    data: PhoneBackupLegacyDataSchema,
    schemaVersion: z.literal(1),
  }),
]);
export type PhoneBackup = z.infer<typeof PhoneBackupSchema>;
export type PhoneBackupKind = Exclude<PhoneBackup['backupKind'], undefined>;
export type PhoneFullBackup = Extract<PhoneBackup, { backupKind: 'full' }>;

export function getPhoneBackupKind(backup: PhoneBackup): PhoneBackupKind | 'legacy' {
  return backup.backupKind ?? 'legacy';
}

export function isFullPhoneBackup(backup: PhoneBackup): backup is PhoneFullBackup {
  return backup.backupKind === 'full';
}

export function getEmbeddedPluginPresets(backup: PhoneBackup): PluginPresetBackupBundle | null {
  return backup.backupKind === 'full' && (backup.schemaVersion === 2 || backup.schemaVersion === 3)
    ? backup.data.pluginPresets
    : null;
}
