export type NormalizedGenerationResponse = {
  content: string;
  reasoning: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function readText(value: unknown) {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return '';
  return typeof value.content === 'string' ? value.content : '';
}

function readFirstField(records: Array<Record<string, unknown> | null>, keys: string[]) {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const value = readText(record[key]);
      if (value) return value;
    }
  }
  return '';
}

export function normalizeGenerationResponse(rawResult: unknown): NormalizedGenerationResponse {
  if (typeof rawResult === 'string') return { content: rawResult, reasoning: '' };
  if (!isRecord(rawResult)) return { content: String(rawResult ?? ''), reasoning: '' };

  const firstChoice = Array.isArray(rawResult.choices) && isRecord(rawResult.choices[0]) ? rawResult.choices[0] : null;
  const message = isRecord(firstChoice?.message)
    ? firstChoice.message
    : isRecord(rawResult.message)
      ? rawResult.message
      : null;
  const delta = isRecord(firstChoice?.delta) ? firstChoice.delta : isRecord(rawResult.delta) ? rawResult.delta : null;
  const records = [rawResult, firstChoice, message, delta];
  const content = readFirstField(records, ['pipe', 'text', 'content']);
  const reasoning = readFirstField(records, ['reasoning_content', 'reasoningContent', 'reasoning', 'thinking']);
  return { content: content || (reasoning ? '' : String(rawResult)), reasoning };
}

export function mergeGenerationReasoning(...parts: string[]) {
  return [...new Set(parts.map(part => part.trim()).filter(Boolean))].join('\n\n');
}
