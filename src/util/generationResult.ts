export type NormalizedGenerationResponse = {
  content: string;
  reasoning: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readText(value: unknown, depth = 0): string {
  if (typeof value === 'string') return value;
  if (depth >= 8) return '';
  if (Array.isArray(value)) return value.map(item => readText(item, depth + 1)).join('');
  if (!isRecord(value)) return '';
  for (const key of ['text', 'content', 'value', 'thinking', 'reasoning']) {
    const text = readText(value[key], depth + 1);
    if (text) return text;
  }
  return '';
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

function readStructuredValue(value: unknown, depth = 0): NormalizedGenerationResponse {
  if (typeof value === 'string') return { content: value, reasoning: '' };
  if (depth >= 8 || value === null || value === undefined) return { content: '', reasoning: '' };
  if (Array.isArray(value)) {
    return value.reduce<NormalizedGenerationResponse>(
      (result, item) => {
        const next = readStructuredValue(item, depth + 1);
        result.content += next.content;
        result.reasoning += next.reasoning;
        return result;
      },
      { content: '', reasoning: '' },
    );
  }
  if (!isRecord(value)) return { content: '', reasoning: '' };

  const blockType = typeof value.type === 'string' ? value.type.trim().toLocaleLowerCase() : '';
  if (blockType.includes('tool') || blockType.includes('function')) return { content: '', reasoning: '' };
  if (blockType.includes('reasoning') || blockType.includes('thinking')) {
    return { content: '', reasoning: readText(value, depth + 1) };
  }

  const reasoning = readFirstField(
    [value],
    ['reasoning_content', 'reasoningContent', 'reasoning', 'thinking'],
  );
  for (const key of ['pipe', 'text', 'content', 'value']) {
    if (!(key in value)) continue;
    const nested = readStructuredValue(value[key], depth + 1);
    return {
      content: nested.content,
      reasoning: `${reasoning}${nested.reasoning}`,
    };
  }
  return { content: '', reasoning };
}

function readFirstStructuredField(records: Array<Record<string, unknown> | null>, keys: string[]) {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      if (!(key in record)) continue;
      const result = readStructuredValue(record[key]);
      if (result.content || result.reasoning) return result;
    }
  }
  return { content: '', reasoning: '' };
}

function serializeDiagnostic(value: unknown) {
  try {
    return JSON.stringify(value) || '';
  } catch {
    return '[无法序列化的结构化响应]';
  }
}

export function normalizeGenerationResponse(rawResult: unknown): NormalizedGenerationResponse {
  if (typeof rawResult === 'string') return { content: rawResult, reasoning: '' };
  if (Array.isArray(rawResult)) {
    const result = readStructuredValue(rawResult);
    return result.content || result.reasoning
      ? result
      : { content: serializeDiagnostic(rawResult), reasoning: '' };
  }
  if (!isRecord(rawResult)) return { content: String(rawResult ?? ''), reasoning: '' };

  const firstChoice = Array.isArray(rawResult.choices) && isRecord(rawResult.choices[0]) ? rawResult.choices[0] : null;
  const message = isRecord(firstChoice?.message)
    ? firstChoice.message
    : isRecord(rawResult.message)
      ? rawResult.message
      : null;
  const delta = isRecord(firstChoice?.delta) ? firstChoice.delta : isRecord(rawResult.delta) ? rawResult.delta : null;
  const records = [rawResult, firstChoice, message, delta];
  const contentResult = readFirstStructuredField(records, ['pipe', 'text', 'content']);
  const providerReasoning = readFirstField(records, [
    'reasoning_content',
    'reasoningContent',
    'reasoning',
    'thinking',
  ]);
  const reasoning = mergeGenerationReasoning(providerReasoning, contentResult.reasoning);
  return {
    content: contentResult.content || (reasoning ? '' : serializeDiagnostic(rawResult)),
    reasoning,
  };
}

export function mergeGenerationReasoning(...parts: string[]) {
  return [...new Set(parts.map(part => part.trim()).filter(Boolean))].join('\n\n');
}
