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
import { ChatFloorBackupSchema } from '@/util/chatFloorBackup';

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
  hidden: z.boolean().optional(),
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

export const HomeIconAssetBackupSchema = z.object({
  data: z.string(),
  id: z.string(),
  name: z.string(),
});

export const PhoneBackupWorldbookSchema = z.object({
  entries: z.array(z.unknown()),
  name: z.string().min(1),
});

export const PhoneBackupFullDataSchema = z.object({
  bagu: BaguSettingsSchema,
  chatFloorBackups: z.array(ChatFloorBackupSchema),
  domains: z.record(z.string(), z.unknown()),
  domainVersions: z.record(z.string(), z.number().int().positive()),
  homeIconAssets: z.array(HomeIconAssetBackupSchema),
  pluginPresets: PluginPresetBackupBundleSchema,
  prompts: PromptSettingsSchema,
  reader: ChatReaderSettingsSchema,
  recoveries: PendingVisibilityRecoveryMapSchema,
  settings: Settings,
  worldbooks: z.array(PhoneBackupWorldbookSchema),
});

const PhoneBackupCurrentChatDataSchema = z.object({
  domains: z.record(z.string(), z.unknown()),
  domainVersions: z.record(z.string(), z.number().int().positive()),
});

export const PhoneBackupSchema = z.union([
  PhoneBackupBaseSchema.extend({
    backupKind: z.literal('full'),
    data: PhoneBackupFullDataSchema,
    schemaVersion: z.literal(4),
  }),
  PhoneBackupBaseSchema.extend({
    backupKind: z.literal('current-chat'),
    data: PhoneBackupCurrentChatDataSchema,
    schemaVersion: z.literal(1),
  }),
]);
export type PhoneBackup = z.infer<typeof PhoneBackupSchema>;
export type PhoneBackupKind = PhoneBackup['backupKind'];
export type PhoneFullBackup = Extract<PhoneBackup, { backupKind: 'full' }>;

export function isFullPhoneBackup(backup: PhoneBackup): backup is PhoneFullBackup {
  return backup.backupKind === 'full';
}

export function getEmbeddedPluginPresets(backup: PhoneBackup): PluginPresetBackupBundle | null {
  return backup.backupKind === 'full' ? backup.data.pluginPresets : null;
}
