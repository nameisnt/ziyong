import type { GenerationAliases } from './generationAliases';

type MacroEnvironment = { names: { char: string; user: string } };
type MacroInput = { name1Override?: string | null; name2Override?: string | null };
type AliasReaderState = GenerationAliases & { nativeChar: string; nativeUser: string };
type MacroProvider = (env: MacroEnvironment, input: MacroInput) => void;
export type TavernAliasContext = {
  name1: string;
  name2: string;
  macros?: { envBuilder?: { registerProvider: (provider: MacroProvider) => void } };
  powerUserSettings?: { experimental_macro_engine?: boolean };
};

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
