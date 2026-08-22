import { useChatScopedDomain } from '@/store/chatScoped';
import { createFailedDraftCollection } from '@/store/failedDrafts';
import { FailedGenerationDraftSchema } from '@/type/generation';
import { validateInplace } from '@/util/zod';

export const externalProfileGenerationDraftsField = 'sillytavern_phone_external_profile_generation_drafts';

export const ExternalProfileGenerationScopeDataSchema = z.object({
  failedDrafts: z.array(FailedGenerationDraftSchema).default([]),
  schemaVersion: z.literal(1).default(1),
});
export type ExternalProfileGenerationScopeData = z.infer<typeof ExternalProfileGenerationScopeDataSchema>;

export const useExternalProfileGenerationStore = defineStore('external-profile-generation', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: externalProfileGenerationDraftsField,
    schema: ExternalProfileGenerationScopeDataSchema,
    createDefault: () => validateInplace(ExternalProfileGenerationScopeDataSchema, {}),
  });
  const failedDraftCollection = createFailedDraftCollection(data, 'external_profile_failed');

  return {
    ...failedDraftCollection,
    data,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
  };
});
