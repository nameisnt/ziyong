import { parsePrettified } from '@/util/zod';
import { FailedGenerationDraftSchema } from '@/type/generation';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const customAppDefinitionsField = 'sillytavern_phone_custom_app_definitions';
export const customAppGlobalDataField = 'sillytavern_phone_custom_app_global_data';
export const customAppChatDataField = 'sillytavern_phone_custom_app_chat_data';

export const CustomAppDefinitionSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  id: z.string(),
  name: z.string().default('自制 App'),
  icon: z.string().default('fa-shapes'),
  description: z.string().default(''),
  dataScope: z.enum(['chat', 'global']).default('chat'),
  creation: z
    .object({
      manual: z.boolean().default(true),
      extract: z.boolean().default(true),
      generate: z.boolean().default(false),
    })
    .default({ manual: true, extract: true, generate: false }),
  naming: z
    .object({
      mode: z.enum(['manual', 'first-line', 'template', 'ai']).default('first-line'),
      template: z.string().default('{{appName}} {{index}}'),
    })
    .default({ mode: 'first-line', template: '{{appName}} {{index}}' }),
  extraction: z
    .object({
      saveMode: z.enum(['merge', 'separate']).default('separate'),
    })
    .default({ saveMode: 'separate' }),
  generation: z
    .object({
      defaultAppPrompt: z.string().default('请根据来源内容和追加要求生成一条适合本 App 保存的内容。'),
      defaultTaskTemplate: z.string().default('请为“{{appName}}”完成本次内容生成。'),
    })
    .default({
      defaultAppPrompt: '请根据来源内容和追加要求生成一条适合本 App 保存的内容。',
      defaultTaskTemplate: '请为“{{appName}}”完成本次内容生成。',
    }),
  display: z
    .object({
      mode: z.enum(['text', 'markdown', 'frontend']).default('markdown'),
      sortDesc: z.boolean().default(true),
    })
    .default({ mode: 'markdown', sortDesc: true }),
  referenceEnabled: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomAppDefinition = z.infer<typeof CustomAppDefinitionSchema>;

export const CustomAppDefinitionsSettingsSchema = z.object({
  definitions: z.array(CustomAppDefinitionSchema).default([]),
});
export type CustomAppDefinitionsSettings = z.infer<typeof CustomAppDefinitionsSettingsSchema>;

export const CustomAppConversionRecordSchema = z.object({
  id: z.string(),
  targetAppId: z.string(),
  targetAppName: z.string(),
  targetEntryIds: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type CustomAppConversionRecord = z.infer<typeof CustomAppConversionRecordSchema>;

export const CustomAppEntrySchema = z.object({
  id: z.string(),
  appId: z.string(),
  title: z.string(),
  content: z.string(),
  sourceText: z.string().default(''),
  sourceLabel: z.string().default(''),
  sourceFloorEnd: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).default([]),
  favorite: z.boolean().default(false),
  directoryOrder: z.number().int().nonnegative().default(0),
  conversions: z.array(CustomAppConversionRecordSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomAppEntry = z.infer<typeof CustomAppEntrySchema>;

export const CustomAppContentDataSchema = z.object({
  entries: z.array(CustomAppEntrySchema).default([]),
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
});
export type CustomAppContentData = z.infer<typeof CustomAppContentDataSchema>;

export const customAppCatalogRevision = ref(0);

export function touchCustomAppCatalog() {
  customAppCatalogRevision.value += 1;
}

export function readCustomAppDefinitionsSnapshot() {
  void customAppCatalogRevision.value;
  const parsed = parsePrettified(
    CustomAppDefinitionsSettingsSchema,
    _.get(extension_settings, customAppDefinitionsField, {}),
  );
  const seen = new Set<string>();
  return parsed.definitions.filter(definition => {
    if (!/^custom-[a-z0-9-]+$/.test(definition.id) || seen.has(definition.id)) return false;
    seen.add(definition.id);
    return true;
  });
}

export function createCustomAppId() {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCustomAppDefinition(
  template: 'ai' | 'blank' | 'extract' | 'frontend' = 'extract',
): CustomAppDefinition {
  const timestamp = new Date().toISOString();
  const presets = {
    ai: {
      creation: { manual: true, extract: false, generate: true },
      display: { mode: 'markdown' as const, sortDesc: true },
      name: 'AI 内容',
    },
    blank: {
      creation: { manual: true, extract: false, generate: false },
      display: { mode: 'markdown' as const, sortDesc: true },
      name: '自制 App',
    },
    extract: {
      creation: { manual: true, extract: true, generate: false },
      display: { mode: 'markdown' as const, sortDesc: true },
      name: '提取记录',
    },
    frontend: {
      creation: { manual: true, extract: false, generate: true },
      display: { mode: 'frontend' as const, sortDesc: true },
      name: '网页内容',
    },
  };
  return CustomAppDefinitionSchema.parse({
    id: createCustomAppId(),
    ...presets[template],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function customAppAccent(appId: string) {
  const palette = ['#3d8bfd', '#00a896', '#e35d9a', '#ff8f3d', '#7a5cff', '#ef476f'];
  const hash = [...appId].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return palette[hash % palette.length]!;
}
