import type { GenerationRequestParts } from '@/type/generation';

export interface GenerationAliases {
  charReplacement: string;
  userReplacement: string;
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
