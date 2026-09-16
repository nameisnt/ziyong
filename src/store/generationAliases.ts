import { getCurrentChatScopeKey, isPlaceholderChatScopeKey, useChatScopedDomain } from '@/store/chatScoped';
import {
  getTavernAliasUnavailableReason,
  installTavernAliasProvider,
  installNativeUserMacro,
  type TavernAliasContext,
} from '@/util/tavernChatAliases';
import { validateInplace } from '@/util/zod';
import { getSillyTavernContext } from '@/util/runtime';
import { useSettingsStore } from '@/store/settings';

export const generationAliasesField = 'sillytavern_phone_generation_aliases';

export const GenerationAliasesSchema = z.object({
  charReplacement: z.string().default(''),
  userReplacement: z.string().default(''),
  applyToTavern: z.boolean().default(false),
});

export const useGenerationAliasesStore = defineStore('generationAliases', () => {
  const settings = useSettingsStore();
  const { data, inheritScope, rehydrateFromSettings, resetCurrentScope, scopeKey, switchScope } = useChatScopedDomain({
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
  const nativeUserMacroEnabled = computed(() => settings.settings.nativeUserPrefixLink !== null);
  let stopProvider: (() => void) | undefined;
  let stopNativeUserMacro: (() => void) | undefined;
  function refreshTavernAliasSupport() {
    const context = getSillyTavernContext() as TavernAliasContext | null;
    tavernAliasUnavailableReason.value = getTavernAliasUnavailableReason(context ?? {});
    // The compression script caches its prefix until reload; keep its macro alive until then.
    if (nativeUserMacroEnabled.value && !stopNativeUserMacro && context?.macros?.registry) {
      stopNativeUserMacro = installNativeUserMacro(
        context.macros.registry,
        () => (getSillyTavernContext() as TavernAliasContext).name1,
      );
    }
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
  watch(nativeUserMacroEnabled, refreshTavernAliasSupport, { flush: 'sync' });
  onScopeDispose(() => {
    stopProvider?.();
    stopNativeUserMacro?.();
  });

  return {
    inheritScope,
    charReplacement,
    applyToTavern,
    nativeUserMacroEnabled,
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
