import type { ChatReaderRegexRule } from '@/store/reader';

export interface ReaderRegexInput {
  messageIndex: number;
  rawText: string;
}

export interface ReaderRegexOutput {
  body: string;
  title: string;
}

const READER_REGEX_WORKER_SOURCE = `
function normalizeFlags(flags) {
  const allowed = new Set(['g', 'i', 'm', 's', 'u', 'y']);
  let normalized = '';
  for (const char of String(flags || '').trim()) {
    if (allowed.has(char) && !normalized.includes(char)) normalized += char;
  }
  return normalized;
}

function parsePattern(find, flags) {
  const source = String(find || '').trim();
  const literal = source.match(/^\\/([\\s\\S]*)\\/([gimsuy]*)$/);
  if (!literal) return { pattern: source, flags: normalizeFlags(flags) };
  return { pattern: literal[1], flags: normalizeFlags(String(literal[2] || '') + String(flags || '')) };
}

function buildRegex(rule) {
  if (!rule || !String(rule.find || '').trim()) return null;
  try {
    const parsed = parsePattern(rule.find, rule.flags);
    return new RegExp(parsed.pattern, parsed.flags);
  } catch {
    return null;
  }
}

function cloneRegexForSingleMatch(regex) {
  return regex.global ? new RegExp(regex.source, regex.flags.replace(/g/g, '')) : regex;
}

function hasCaptureReference(replaceText) {
  return /\\$(?:\\d+|<[^>]+>)/.test(replaceText);
}

function hasDefinedCapture(match) {
  return match.length > 1 && match.slice(1).some(value => value !== undefined);
}

function extractCapturedReplacement(source, regex, matchRegex, replaceText) {
  const matches = regex.global ? Array.from(source.matchAll(regex)) : [source.match(matchRegex)].filter(Boolean);
  return matches
    .map(match => match[0].replace(matchRegex, replaceText).trim())
    .filter(Boolean)
    .join('\\n\\n');
}

function applyRegexRule(rawText, rule, fallback) {
  const source = String(rawText);
  const regex = buildRegex(rule);
  if (!regex) return fallback;
  const replaceText = String(rule.replace || '');
  const matchRegex = cloneRegexForSingleMatch(regex);
  const firstMatch = source.match(matchRegex);
  if (!firstMatch) return fallback;

  if (hasDefinedCapture(firstMatch) && hasCaptureReference(replaceText)) {
    const extracted = extractCapturedReplacement(source, regex, matchRegex, replaceText);
    if (extracted) return extracted;
  }

  const replaced = source.replace(regex, replaceText).trim();
  return replaced || fallback;
}

function applyTitleRule(rawText, rule, messageIndex) {
  const fallback = '第 ' + messageIndex + ' 楼';
  return applyRegexRule(rawText, rule, fallback);
}

function applyBodyRule(rawText, rule) {
  return applyRegexRule(rawText, rule, String(rawText));
}

self.onmessage = event => {
  const payload = event.data || {};
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const titleRule = payload.titleRule || {};
  const bodyRule = payload.bodyRule || {};
  const result = messages.map(message => ({
    title: applyTitleRule(message.rawText || '', titleRule, Number(message.messageIndex) || 0),
    body: applyBodyRule(message.rawText || '', bodyRule),
  }));
  self.postMessage({ ok: true, result });
};
`;

function transformReaderMessagesSync(messages: ReaderRegexInput[], titleRule: ChatReaderRegexRule, bodyRule: ChatReaderRegexRule): ReaderRegexOutput[] {
  function normalizeFlags(flags: string) {
    const allowed = new Set(['g', 'i', 'm', 's', 'u', 'y']);
    let normalized = '';
    for (const char of flags.trim()) {
      if (allowed.has(char) && !normalized.includes(char)) normalized += char;
    }
    return normalized;
  }

  function parsePattern(find: string, flags: string) {
    const source = find.trim();
    const literal = source.match(/^\/([\s\S]*)\/([gimsuy]*)$/);
    if (!literal) return { pattern: source, flags: normalizeFlags(flags) };
    return { pattern: literal[1], flags: normalizeFlags(`${literal[2] || ''}${flags}`) };
  }

  function buildRegex(rule: ChatReaderRegexRule) {
    if (!rule.find.trim()) return null;
    try {
      const parsed = parsePattern(rule.find, rule.flags);
      return new RegExp(parsed.pattern, parsed.flags);
    } catch {
      return null;
    }
  }

  function cloneRegexForSingleMatch(regex: RegExp) {
    return regex.global ? new RegExp(regex.source, regex.flags.replace(/g/g, '')) : regex;
  }

  function hasCaptureReference(replaceText: string) {
    return /\$(?:\d+|<[^>]+>)/.test(replaceText);
  }

  function hasDefinedCapture(match: RegExpMatchArray) {
    return match.length > 1 && match.slice(1).some(value => value !== undefined);
  }

  function extractCapturedReplacement(source: string, regex: RegExp, matchRegex: RegExp, replaceText: string) {
    const matches = regex.global ? Array.from(source.matchAll(regex)) : [source.match(matchRegex)].filter((item): item is RegExpMatchArray => Boolean(item));
    return matches
      .map(match => match[0].replace(matchRegex, replaceText).trim())
      .filter(Boolean)
      .join('\n\n');
  }

  function applyRegexRule(rawText: string, rule: ChatReaderRegexRule, fallback: string) {
    const regex = buildRegex(rule);
    if (!regex) return fallback;
    const replaceText = rule.replace;
    const matchRegex = cloneRegexForSingleMatch(regex);
    const firstMatch = rawText.match(matchRegex);
    if (!firstMatch) return fallback;

    if (hasDefinedCapture(firstMatch) && hasCaptureReference(replaceText)) {
      const extracted = extractCapturedReplacement(rawText, regex, matchRegex, replaceText);
      if (extracted) return extracted;
    }

    const replaced = rawText.replace(regex, replaceText).trim();
    return replaced || fallback;
  }

  function applyTitleRule(rawText: string, rule: ChatReaderRegexRule, messageIndex: number) {
    const fallback = `第 ${messageIndex} 楼`;
    return applyRegexRule(rawText, rule, fallback);
  }

  function applyBodyRule(rawText: string, rule: ChatReaderRegexRule) {
    return applyRegexRule(rawText, rule, rawText);
  }

  return messages.map(message => ({
    title: applyTitleRule(message.rawText, titleRule, message.messageIndex),
    body: applyBodyRule(message.rawText, bodyRule),
  }));
}

export function transformReaderMessages(messages: ReaderRegexInput[], titleRule: ChatReaderRegexRule, bodyRule: ChatReaderRegexRule, timeoutMs = 1500) {
  if (!messages.length) return Promise.resolve<ReaderRegexOutput[]>([]);

  if (typeof Worker === 'undefined') {
    return Promise.resolve(transformReaderMessagesSync(messages, titleRule, bodyRule));
  }

  const safeMessages = messages.map(message => ({
    messageIndex: Number(message.messageIndex) || 0,
    rawText: typeof message.rawText === 'string' ? message.rawText : String(message.rawText ?? ''),
  }));
  const safeTitleRule = {
    find: String(titleRule.find || ''),
    replace: String(titleRule.replace || ''),
    flags: String(titleRule.flags || ''),
  } satisfies ChatReaderRegexRule;
  const safeBodyRule = {
    find: String(bodyRule.find || ''),
    replace: String(bodyRule.replace || ''),
    flags: String(bodyRule.flags || ''),
  } satisfies ChatReaderRegexRule;

  return new Promise<ReaderRegexOutput[]>((resolve, reject) => {
    const blob = new Blob([READER_REGEX_WORKER_SOURCE], { type: 'text/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      fn();
    };

    const timer = window.setTimeout(() => {
      finish(() => reject(new Error('正则处理超时，请检查规则是否过于复杂')));
    }, timeoutMs);

    worker.onmessage = event => {
      window.clearTimeout(timer);
      finish(() => {
        const result = event.data?.result;
        if (!Array.isArray(result) || result.length !== messages.length) {
          reject(new Error('正则处理结果无效'));
          return;
        }
        resolve(result.map(item => ({
          title: typeof item?.title === 'string' ? item.title : '',
          body: typeof item?.body === 'string' ? item.body : '',
        })));
      });
    };

    worker.onerror = () => {
      window.clearTimeout(timer);
      finish(() => resolve(transformReaderMessagesSync(safeMessages, safeTitleRule, safeBodyRule)));
    };

    try {
      worker.postMessage({
        messages: safeMessages,
        titleRule: safeTitleRule,
        bodyRule: safeBodyRule,
      });
    } catch {
      window.clearTimeout(timer);
      finish(() => resolve(transformReaderMessagesSync(safeMessages, safeTitleRule, safeBodyRule)));
    }
  });
}
