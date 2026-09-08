import { getCurrentChatScopeKey, isPlaceholderChatScopeKey, useChatScopedDomain } from '@/store/chatScoped';
import {
  getTavernAliasUnavailableReason,
  installTavernAliasProvider,
  type TavernAliasContext,
} from '@/util/tavernChatAliases';
import { validateInplace } from '@/util/zod';
import { getSillyTavernContext } from '@/util/runtime';

export const generationAliasesField = 'sillytavern_phone_generation_aliases';

export const GenerationAliasesSchema = z.object({
  charReplacement: z.string().default(''),
  userReplacement: z.string().default(''),
  applyToTavern: z.boolean().default(false),
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

  const applyToTavern = computed({
    get: () => data.value.applyToTavern,
    set: value => {
      data.value.applyToTavern = value;
    },
  });
  const tavernAliasUnavailableReason = ref('');
  let stopProvider: (() => void) | undefined;
  function refreshTavernAliasSupport() {
    const context = getSillyTavernContext() as TavernAliasContext | null;
    tavernAliasUnavailableReason.value = getTavernAliasUnavailableReason(context ?? {});
    if (stopProvider || !context?.macros?.envBuilder?.registerProvider) return;
    stopProvider = installTavernAliasProvider(context.macros.envBuilder, () => {
      if (!data.value.applyToTavern) return null;
      const currentScope = getCurrentChatScopeKey();
      if (isPlaceholderChatScopeKey(currentScope) || scopeKey.value !== currentScope) return null;
      const current = getSillyTavernContext() as TavernAliasContext | null;
      if (!current?.powerUserSettings?.experimental_macro_engine) return null;
      return { ...data.value, nativeChar: current.name2, nativeUser: current.name1 };
    });
  }
  refreshTavernAliasSupport();
  onScopeDispose(() => stopProvider?.());

  return {
    charReplacement,
    applyToTavern,
    data,
    refreshTavernAliasSupport,
    tavernAliasUnavailableReason,
    rehydrateFromSettings,
    resetCurrentScope,
    scopeKey,
    switchScope,
    userReplacement,
  };
});
