import type { PhoneBackupDomain } from '@/core/appRegistry';
import { getCurrentChatScopeKey, readChatScopedEnvelope } from '@/store/chatScoped';
import { diaryField, useDiaryStore } from '@/store/diary';
import { extrasField, useExtrasStore } from '@/store/extras';
import { forumField, useForumStore } from '@/store/forum';
import { generationTasksField, useGenerationTaskStore } from '@/store/generationTasks';
import { generationAliasesField, useGenerationAliasesStore } from '@/store/generationAliases';
import { lettersField, useLettersStore } from '@/store/letters';
import { previewDraftsField, usePreviewDraftStore } from '@/store/previewDrafts';
import { summaryField, useSummaryStore } from '@/store/summary';
import { theaterField, useTheaterStore } from '@/store/theater';
import { GenerationTaskSettingsSchema } from '@/type/generationTask';
import { validateInplace } from '@/util/zod';
import { extension_settings } from '@sillytavern/scripts/extensions';

function createChatScopedBackupDomain(options: {
  field: string;
  key: string;
  rehydrateFromSettings: () => void;
}): PhoneBackupDomain {
  return {
    key: options.key,
    exportData: currentScopeKey => readChatScopedEnvelope(options.field, currentScopeKey || getCurrentChatScopeKey()),
    importData: data => {
      _.set(extension_settings, options.field, data);
    },
    rehydrateFromSettings: options.rehydrateFromSettings,
  };
}

export function createSummaryBackupDomain() {
  return createChatScopedBackupDomain({
    field: summaryField,
    key: 'summaries',
    rehydrateFromSettings: () => useSummaryStore().rehydrateFromSettings(),
  });
}

export function createDiaryBackupDomain() {
  return createChatScopedBackupDomain({
    field: diaryField,
    key: 'diaries',
    rehydrateFromSettings: () => useDiaryStore().rehydrateFromSettings(),
  });
}

export function createExtrasBackupDomain() {
  return createChatScopedBackupDomain({
    field: extrasField,
    key: 'extras',
    rehydrateFromSettings: () => useExtrasStore().rehydrateFromSettings(),
  });
}

export function createForumBackupDomain() {
  return createChatScopedBackupDomain({
    field: forumField,
    key: 'forum',
    rehydrateFromSettings: () => useForumStore().rehydrateFromSettings(),
  });
}

export function createTheaterBackupDomain() {
  return createChatScopedBackupDomain({
    field: theaterField,
    key: 'theater',
    rehydrateFromSettings: () => useTheaterStore().rehydrateFromSettings(),
  });
}

export function createGenerationAliasesBackupDomain() {
  return createChatScopedBackupDomain({
    field: generationAliasesField,
    key: 'generation-aliases',
    rehydrateFromSettings: () => useGenerationAliasesStore().rehydrateFromSettings(),
  });
}

export function createLettersBackupDomain() {
  return createChatScopedBackupDomain({
    field: lettersField,
    key: 'letters',
    rehydrateFromSettings: () => useLettersStore().rehydrateFromSettings(),
  });
}

export function createPreviewDraftsBackupDomain() {
  return createChatScopedBackupDomain({
    field: previewDraftsField,
    key: 'preview-drafts',
    rehydrateFromSettings: () => usePreviewDraftStore().rehydrateFromSettings(),
  });
}

export function createGenerationTasksBackupDomain(): PhoneBackupDomain {
  return {
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
  };
}
