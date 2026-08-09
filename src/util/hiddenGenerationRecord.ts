import type { GenerationReplaySnapshot, HiddenGenerationRecord } from '@/type/generation';

export function createHiddenGenerationRecord(
  actionId: string,
  replay: GenerationReplaySnapshot,
): HiddenGenerationRecord {
  return {
    actionId,
    createdAt: new Date().toISOString(),
    id: `generation_record_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    replay,
  };
}

export function resolveHiddenGenerationReplay(input: {
  generationRecord?: HiddenGenerationRecord;
  generationReplay?: GenerationReplaySnapshot;
}) {
  return input.generationRecord?.replay || input.generationReplay;
}
