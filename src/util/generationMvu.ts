import { stringify } from 'yaml';

export type MvuMessage = {
  swipe_id?: number;
  variables?: Record<number, unknown>;
};

export type GenerationMvuSnapshot = {
  targetId: number;
  messageId: number | null;
  statData: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function findGenerationMvuSnapshot(chat: MvuMessage[], messageIds: number[]): GenerationMvuSnapshot | null {
  if (!messageIds.length) return null;
  const targetId = Math.max(...messageIds);
  for (let distance = 0; distance <= Math.max(targetId, chat.length - 1 - targetId); distance++) {
    const candidates = distance === 0 ? [targetId] : [targetId - distance, targetId + distance];
    for (const messageId of candidates) {
      const message = chat[messageId];
      const variables = message?.variables?.[message.swipe_id ?? 0];
      const statData = isRecord(variables) ? variables.stat_data : null;
      if (isRecord(statData) && Object.keys(statData).length) {
        return { targetId, messageId, statData };
      }
    }
  }
  return { targetId, messageId: null, statData: null };
}

export function describeGenerationMvu(snapshot: GenerationMvuSnapshot | null) {
  if (!snapshot) return '';
  if (snapshot.messageId === null) return `MVU：目标第 ${snapshot.targetId} 层，当前聊天没有有效快照`;
  if (snapshot.messageId === snapshot.targetId) return `MVU：第 ${snapshot.messageId} 层`;
  return `MVU：第 ${snapshot.messageId} 层 · 目标第 ${snapshot.targetId} 层快照缺失，使用最近快照`;
}

function withoutInternalKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutInternalKeys);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, entry]) => [key, withoutInternalKeys(entry)]),
  );
}

export function replaceGenerationMvuMacros(text: string, snapshot: GenerationMvuSnapshot) {
  return text.replace(
    /\{\{(format|get)_message_variable::(stat_data(?:[.[][\s\S]*?)?)\}\}/giu,
    (_match, kind: string, path: string, offset: number) => {
      if (!snapshot.statData) throw new Error(describeGenerationMvu(snapshot));
      const value = withoutInternalKeys(_.get({ stat_data: snapshot.statData }, _.unescape(path), null));
      if (kind.toLowerCase() === 'get') return typeof value === 'string' ? value : JSON.stringify(value);
      const formatted = typeof value === 'string' ? value : stringify(value, { blockQuote: 'literal' }).trimEnd();
      const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
      return formatted.replaceAll('\n', '\n' + ' '.repeat(offset - lineStart));
    },
  );
}

type PromptMessage = { content?: string | Array<{ type: string; text?: string }> };

// The marker identifies this request before the host expands its message-variable macros.
export function applyGenerationMvuToPrompt(
  payload: { prompt?: PromptMessage[] },
  marker: string,
  snapshot: GenerationMvuSnapshot,
) {
  const messages = payload.prompt;
  if (!Array.isArray(messages)) return false;
  const texts = messages.flatMap(message =>
    typeof message.content === 'string'
      ? [message.content]
      : (message.content || []).filter(part => part.type === 'text').map(part => part.text || ''),
  );
  if (!texts.some(text => text.includes(marker))) return false;
  const transform = (text: string) => replaceGenerationMvuMacros(text.replaceAll(marker, ''), snapshot);
  for (const message of messages) {
    if (typeof message.content === 'string') message.content = transform(message.content);
    else
      for (const part of message.content || [])
        if (part.type === 'text' && typeof part.text === 'string') part.text = transform(part.text);
  }
  return true;
}
