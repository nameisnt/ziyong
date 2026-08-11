import { useChatScopedDomain } from '@/store/chatScoped';
import { validateInplace } from '@/util/zod';

export const generationAliasesField = 'sillytavern_phone_generation_aliases';

export const GenerationAliasesSchema = z.object({
  charReplacement: z.string().default(''),
  userReplacement: z.string().default(''),
});

export const useGenerationAliasesStore = defineStore('generationAliases', () => {
  const { data, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
    field: generationAliasesField,
    schema: GenerationAliasesSchema,
    createDefault: () => validateInplace(GenerationAliasesSchema, {}),
  });

  const charReplacement = computed({
    get: () => data.value.charReplacement,
    set: value => {
      data.value.charReplacement = value;
    },
  });
  const userReplacement = computed({
    get: () => data.value.userReplacement,
    set: value => {
      data.value.userReplacement = value;
    },
  });

  return {
    charReplacement,
    data,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    userReplacement,
  };
});
