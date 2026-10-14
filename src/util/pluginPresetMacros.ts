import { replaceGenerationAliases, type GenerationAliases } from './generationAliases';
import { replaceGenerationMvuMacros, type GenerationMvuSnapshot } from './generationMvu';
import { replacePluginMacros } from './pluginMacros';
import { getSillyTavernContext } from './runtime';

export type GenerationMacroContext = {
  aliases: GenerationAliases;
  phoneUserInput: string;
  variables: Record<string, string>;
  mvuSnapshot?: GenerationMvuSnapshot | null;
};

export function replaceGenerationPromptMacros(content: string, context: GenerationMacroContext) {
  let result = content.replace(/\{\{\s*phoneUserInput\s*\}\}/gi, () => context.phoneUserInput);
  for (const [name, value] of Object.entries(context.variables)) {
    if (!/^[\w.-]+$/u.test(name) || name.toLowerCase() === 'phoneuserinput') continue;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    result = result.replace(new RegExp(`\\{\\{\\s*${escapedName}\\s*\\}\\}`, 'giu'), () => value);
  }
  result = replaceGenerationAliases(replacePluginMacros(result), context.aliases) || '';
  return context.mvuSnapshot ? replaceGenerationMvuMacros(result, context.mvuSnapshot) : result;
}

export function preparePluginPresetMacroConfig(config: Record<string, unknown>, context: GenerationMacroContext) {
  if (!Array.isArray(config.ordered_prompts)) return config;
  const tavern = getSillyTavernContext();
  const substitute = tavern?.substituteParamsExtended;
  if (typeof substitute !== 'function') throw new Error('当前酒馆缺少原生宏解析接口，无法解析插件预设');
  const aliases: Record<string, string> = {};
  if (context.aliases.userReplacement) aliases.user = context.aliases.userReplacement;
  if (context.aliases.charReplacement) aliases.char = context.aliases.charReplacement;

  // Resolve only custom preset entries, once and in order. Host placeholders stay host-owned.
  const orderedPrompts = config.ordered_prompts.map((prompt, index) => {
    if (typeof prompt === 'string') return prompt;
    try {
      const prepared = replaceGenerationPromptMacros(prompt.content, context);
      const resolved = substitute.call(tavern, prepared, aliases) as string;
      return { ...prompt, content: replaceGenerationPromptMacros(resolved, context) };
    } catch (error) {
      throw new Error(
        `插件预设第 ${index + 1} 个提示条目宏解析失败：${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  });
  return { ...config, ordered_prompts: orderedPrompts };
}
