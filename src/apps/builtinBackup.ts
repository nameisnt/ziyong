import type { PhoneBackupDomain } from '@/core/appRegistry';
import { getCurrentChatScopeKey, readChatScopedEnvelope } from '@/store/chatScoped';
import { diaryField, useDiaryStore } from '@/store/diary';
import { extrasField, useExtrasStore } from '@/store/extras';
import { forumField, useForumStore } from '@/store/forum';
import { generationTasksField, useGenerationTaskStore } from '@/store/generationTasks';
import { GenerationAliasesSchema, generationAliasesField, useGenerationAliasesStore } from '@/store/generationAliases';
import { lettersField, useLettersStore } from '@/store/letters';
import { PreviewDraftScopeDataSchema, previewDraftsField, usePreviewDraftStore } from '@/store/previewDrafts';
import { summaryField, useSummaryStore } from '@/store/summary';
import { theaterField, useTheaterStore } from '@/store/theater';
import { GenerationTaskSettingsSchema } from '@/type/generationTask';
import {
  createChatScopedBackupSchema,
  DiaryEnvelopeSchema,
  ExtrasEnvelopeSchema,
  ForumEnvelopeSchema,
  LettersEnvelopeSchema,
  SummaryEnvelopeSchema,
  TheaterEnvelopeSchema,
} from '@/type/backup';
import { validateInplace } from '@/util/zod';
import { extension_settings } from '@sillytavern/scripts/extensions';

function createChatScopedBackupDomain(options: {
  category: PhoneBackupDomain['category'];
  field: string;
  key: string;
  rehydrateFromSettings: () => void;
  schema: z.ZodType;
}): PhoneBackupDomain {
  return {
    category: options.category,
    key: options.key,
    exportData: currentScopeKey => readChatScopedEnvelope(options.field, currentScopeKey || getCurrentChatScopeKey()),
    importData: data => {
      _.set(extension_settings, options.field, data);
    },
    rehydrateFromSettings: options.rehydrateFromSettings,
    schema: options.schema,
    schemaVersion: 1,
    scope: 'chat',
  };
}

export function createSummaryBackupDomain() {
  return createChatScopedBackupDomain({
    category: 'content',
    field: summaryField,
    key: 'summaries',
    rehydrateFromSettings: () => useSummaryStore().rehydrateFromSettings(),
    schema: SummaryEnvelopeSchema,
  });
}

export function createDiaryBackupDomain() {
  return createChatScopedBackupDomain({
    category: 'content',
    field: diaryField,
    key: 'diaries',
    rehydrateFromSettings: () => useDiaryStore().rehydrateFromSettings(),
    schema: DiaryEnvelopeSchema,
  });
}

export function createExtrasBackupDomain() {
  return createChatScopedBackupDomain({
    category: 'content',
    field: extrasField,
    key: 'extras',
    rehydrateFromSettings: () => useExtrasStore().rehydrateFromSettings(),
    schema: ExtrasEnvelopeSchema,
  });
}

export function createForumBackupDomain() {
  return createChatScopedBackupDomain({
    category: 'content',
    field: forumField,
    key: 'forum',
    rehydrateFromSettings: () => useForumStore().rehydrateFromSettings(),
    schema: ForumEnvelopeSchema,
  });
}

export function createTheaterBackupDomain() {
  return createChatScopedBackupDomain({
    category: 'content',
    field: theaterField,
    key: 'theater',
    rehydrateFromSettings: () => useTheaterStore().rehydrateFromSettings(),
    schema: TheaterEnvelopeSchema,
  });
}

export function createGenerationAliasesBackupDomain() {
  return createChatScopedBackupDomain({
    category: 'configuration',
    field: generationAliasesField,
    key: 'generation-aliases',
    rehydrateFromSettings: () => useGenerationAliasesStore().rehydrateFromSettings(),
    schema: createChatScopedBackupSchema(GenerationAliasesSchema),
  });
}

export function createLettersBackupDomain() {
  return createChatScopedBackupDomain({
    category: 'content',
    field: lettersField,
    key: 'letters',
    rehydrateFromSettings: () => useLettersStore().rehydrateFromSettings(),
    schema: LettersEnvelopeSchema,
  });
}

export function createPreviewDraftsBackupDomain() {
  return createChatScopedBackupDomain({
    category: 'draft',
    field: previewDraftsField,
    key: 'preview-drafts',
    rehydrateFromSettings: () => usePreviewDraftStore().rehydrateFromSettings(),
    schema: createChatScopedBackupSchema(PreviewDraftScopeDataSchema),
  });
}

export function createGenerationTasksBackupDomain(): PhoneBackupDomain {
  return {
    category: 'draft',
    key: 'generation-tasks',
    exportData: () => {
      const taskSettings = validateInplace(
        GenerationTaskSettingsSchema,
        _.get(extension_settings, generationTasksField, {}),
      );
      const scopes: Record<string, { tasks: typeof taskSettings.tasks }> = {};
      for (const task of taskSettings.tasks) {
        const scope = scopes[task.scopeKey] ?? { tasks: [] };
        scope.tasks.push(task);
        scopes[task.scopeKey] = scope;
      }
      return {
        __chatScoped: true,
        legacyScopeMigrations: {},
        scopes,
      };
    },
    importData: data => {
      const scopes =
        data && typeof data === 'object' && 'scopes' in data && data.scopes && typeof data.scopes === 'object'
          ? Object.entries(data.scopes)
          : [];
      const tasks = scopes.flatMap(([scopeKey, scope]) =>
        validateInplace(GenerationTaskSettingsSchema, scope).tasks.map(task => ({
          ...task,
          scopeKey,
        })),
      );
      _.set(extension_settings, generationTasksField, { tasks });
    },
    rehydrateFromSettings: () => useGenerationTaskStore().rehydrateFromSettings(),
    schema: createChatScopedBackupSchema(GenerationTaskSettingsSchema),
    schemaVersion: 1,
    scope: 'chat',
  };
}
