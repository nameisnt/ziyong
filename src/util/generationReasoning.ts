type GenerationReasoningTarget = {
  generationRecord?: {
    reasoning?: string;
  } | null;
};

export function updateGenerationRecordReasoning(
  target: GenerationReasoningTarget | null | undefined,
  reasoning: string,
) {
  if (!target?.generationRecord) return false;
  target.generationRecord.reasoning = reasoning;
  return true;
}

const STREAM_ENVELOPE_LINE =
  /^[\t ]*\{\{?(?=[^\r\n]*"id"\s*:\s*"chatcmpl-)(?=[^\r\n]*"object"\s*:\s*"chat\.completion\.chunk")(?=[^\r\n]*"created"\s*:)(?=[^\r\n]*"model"\s*:)(?=[^\r\n]*"choices"\s*:)[^\r\n]*\}\}?[\t ]*(?:\r?\n|$)/gmu;

export function cleanSavedGenerationReasoning(reasoning: string) {
  return reasoning
    .replace(STREAM_ENVELOPE_LINE, '')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}
