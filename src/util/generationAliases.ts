import type { GenerationRequestParts } from '@/type/generation';
import { getOptionalGlobalFunction, getOptionalGlobalValue } from '@/util/runtime';

export interface GenerationAliases {
  charReplacement: string;
  userReplacement: string;
}

export function resolveGenerationIdentityAliases(aliases: GenerationAliases): GenerationAliases {
  return {
    charReplacement:
      aliases.charReplacement.trim() ||
      getOptionalGlobalFunction<() => string | null | undefined>('getCurrentCharacterName')?.()?.trim() ||
      '',
    userReplacement: aliases.userReplacement.trim() || String(getOptionalGlobalValue('name1') || '').trim(),
  };
}

export function replaceGenerationAliases(text: string | undefined, aliases: GenerationAliases) {
  if (typeof text !== 'string' || !text) return text;

  let result = text;
  const charName = aliases.charReplacement.trim();
  const userName = aliases.userReplacement.trim();
  if (charName) result = result.replace(/<char>|\{\{char\}\}/gi, charName);
  if (userName) result = result.replace(/<user>|\{\{user\}\}/gi, userName);
  return result;
}

export function applyGenerationAliases(
  request: GenerationRequestParts,
  aliases: GenerationAliases,
): GenerationRequestParts {
  return {
    ...request,
    appPrompt: replaceGenerationAliases(request.appPrompt, aliases),
    context: replaceGenerationAliases(request.context, aliases),
    outputFormat: replaceGenerationAliases(request.outputFormat, aliases) || '',
    taskInstruction: replaceGenerationAliases(request.taskInstruction, aliases),
    typePrompt: replaceGenerationAliases(request.typePrompt, aliases),
    userRequirement: replaceGenerationAliases(request.userRequirement, aliases),
  };
}
