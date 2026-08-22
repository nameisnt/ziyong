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
