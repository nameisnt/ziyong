import type { GenerationAliases } from './generationAliases';

type MacroEnvironment = { names: { char: string; user: string } };
type MacroInput = { name1Override?: string | null; name2Override?: string | null };
type AliasReaderState = GenerationAliases & { nativeChar: string; nativeUser: string };
type MacroProvider = (env: MacroEnvironment, input: MacroInput) => void;
type MacroRegistry = {
  registerMacro: (name: string, definition: { handler: () => string; description: string }) => void;
  unregisterMacro: (name: string) => void;
};
export type TavernAliasContext = {
  name1: string;
  name2: string;
  macros?: { envBuilder?: { registerProvider: (provider: MacroProvider) => void }; registry?: MacroRegistry };
  powerUserSettings?: { experimental_macro_engine?: boolean };
};

export function installNativeUserMacro(registry: MacroRegistry, readNativeUser: () => string) {
  registry.registerMacro('pc_native_user', {
    description: '酒馆原始用户名，不受插件替换称呼影响',
    handler: readNativeUser,
  });
  return () => registry.unregisterMacro('pc_native_user');
}

export function getTavernAliasUnavailableReason(context: Partial<TavernAliasContext>) {
  if (typeof context.macros?.envBuilder?.registerProvider !== 'function') return '当前酒馆不支持称呼扩展接口';
  if (!context.powerUserSettings?.experimental_macro_engine) return '需要在酒馆启用新宏引擎后使用';
  return '';
}

export function installTavernAliasProvider(
  builder: NonNullable<NonNullable<TavernAliasContext['macros']>['envBuilder']>,
  readState: () => AliasReaderState | null,
) {
  let reader: typeof readState | null = readState;
  builder.registerProvider((env, input) => {
    const state = reader?.();
    if (!state) return;
    const char = state.charReplacement.trim();
    const user = state.userReplacement.trim();
    // Explicit identities for another character/persona must keep their own context.
    if (char && (input.name2Override == null || input.name2Override === state.nativeChar)) env.names.char = char;
    if (user && (input.name1Override == null || input.name1Override === state.nativeUser)) env.names.user = user;
  });
  // The host has no unregisterProvider API. Release the store reader on disposal.
  return () => {
    reader = null;
  };
}
