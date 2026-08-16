const REASONING_KEYS = [
  'reasoning',
  'reasoning_content',
  'reasoningContent',
  'mes_reasoning',
  'thinking',
  'thoughts',
] as const;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function readNamedReasoning(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  const record = asObject(value);
  if (!record) return '';
  for (const key of ['content', 'text', 'value']) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
}

export function findMessageReasoning(value: unknown, depth = 0, seen = new WeakSet<object>()): string {
  if (depth > 4) return '';
  const record = asObject(value);
  if (!record || seen.has(record)) return '';
  seen.add(record);

  for (const key of REASONING_KEYS) {
    const reasoning = readNamedReasoning(record[key]);
    if (reasoning) return reasoning;
  }
  for (const candidate of Object.values(record)) {
    const reasoning = findMessageReasoning(candidate, depth + 1, seen);
    if (reasoning) return reasoning;
  }
  return '';
}

export function extractMessageReasoning(message: unknown) {
  return findMessageReasoning(message);
}
