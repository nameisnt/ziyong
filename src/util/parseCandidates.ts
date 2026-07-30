import type { XmlParseResult } from '@/type/generation';

export interface OutputCandidate {
  index: number;
  raw: string;
}

export function stripOutputCodeFence(raw: string) {
  return raw
    .trim()
    .replace(/^```(?:xml|json|html|text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractTaggedOutputCandidates(raw: string, rootName: string): OutputCandidate[] {
  const normalized = stripOutputCodeFence(raw);
  const root = rootName.trim();
  if (!root) return normalized ? [{ index: 0, raw: normalized }] : [];

  const pattern = new RegExp(`<${escapeRegExp(root)}(?:\\s[^>]*)?>[\\s\\S]*?</${escapeRegExp(root)}>`, 'gi');
  return Array.from(normalized.matchAll(pattern), (match, index) => ({
    index,
    raw: match[0],
  }));
}

export function diagnoseTaggedRoot(raw: string, rootName: string) {
  const normalized = stripOutputCodeFence(raw);
  const root = rootName.trim();
  if (!root) return normalized ? [] : ['没有找到可解析内容'];

  const escapedRoot = escapeRegExp(root);
  const openingCount = normalized.match(new RegExp(`<${escapedRoot}(?:\\s[^>]*)?>`, 'gi'))?.length || 0;
  const closingCount = normalized.match(new RegExp(`</${escapedRoot}\\s*>`, 'gi'))?.length || 0;

  if (!openingCount && !closingCount) return [`没有找到根标签 <${root}>`];
  if (!openingCount) return [`找到了 </${root}>，但缺少 <${root}> 开始标签`];
  if (!closingCount) return [`找到了 <${root}>，但缺少 </${root}> 结束标签`];
  if (openingCount !== closingCount) {
    return [`<${root}> 开始标签有 ${openingCount} 个，结束标签有 ${closingCount} 个，数量不一致`];
  }
  return [`<${root}> 标签顺序或嵌套不正确，没有找到完整结果`];
}

export function getIncompleteTaggedRootWarning(raw: string, rootName: string, completeCount: number) {
  const normalized = stripOutputCodeFence(raw);
  const escapedRoot = escapeRegExp(rootName.trim());
  const openingCount = normalized.match(new RegExp(`<${escapedRoot}(?:\\s[^>]*)?>`, 'gi'))?.length || 0;
  const closingCount = normalized.match(new RegExp(`</${escapedRoot}\\s*>`, 'gi'))?.length || 0;
  if (openingCount === completeCount && closingCount === completeCount) return '';
  return `另有未完整闭合的 <${rootName}>：开始标签 ${openingCount} 个，结束标签 ${closingCount} 个，已忽略残缺部分`;
}

function extractBalancedJson(raw: string) {
  const normalized = stripOutputCodeFence(raw);
  const candidates: OutputCandidate[] = [];
  let start = -1;
  let quote = '';
  let escaped = false;
  const stack: string[] = [];

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]!;
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = '';
      }
      continue;
    }

    if (character === '"' || character === "'") {
      if (start >= 0) quote = character;
      continue;
    }

    if (character === '{' || character === '[') {
      if (!stack.length) start = index;
      stack.push(character);
      continue;
    }

    if (character !== '}' && character !== ']') continue;
    const expectedOpening = character === '}' ? '{' : '[';
    if (stack.at(-1) !== expectedOpening) {
      stack.length = 0;
      start = -1;
      continue;
    }
    stack.pop();
    if (!stack.length && start >= 0) {
      candidates.push({
        index: candidates.length,
        raw: normalized.slice(start, index + 1),
      });
      start = -1;
    }
  }

  return candidates;
}

export function extractJsonOutputCandidates(raw: string) {
  return extractBalancedJson(raw);
}

export function getMeaningfulCharacterCount(value: unknown): number {
  if (typeof value === 'string') {
    return value
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/[`*_~>#\-[\](){}|]/g, '')
      .replace(/\s+/g, '')
      .trim().length;
  }
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + getMeaningfulCharacterCount(item), 0);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((total, item) => total + getMeaningfulCharacterCount(item), 0);
  }
  return 0;
}

function uniqueWarnings(warnings: string[]) {
  return [...new Set(warnings.filter(Boolean))];
}

export function selectBestParsedCandidate<T>(
  raw: string,
  candidates: OutputCandidate[],
  parse: (candidate: OutputCandidate) => XmlParseResult<T>,
  candidateLabel = '结果',
): XmlParseResult<T> | null {
  if (!candidates.length) return null;

  const attempts = candidates.map(candidate => ({
    candidate,
    parsed: parse(candidate),
  }));
  const successes = attempts
    .filter(
      (attempt): attempt is typeof attempt & { parsed: Extract<XmlParseResult<T>, { ok: true }> } => attempt.parsed.ok,
    )
    .map(attempt => ({
      ...attempt,
      contentLength: getMeaningfulCharacterCount(attempt.parsed.data),
    }))
    .sort(
      (left, right) =>
        right.contentLength - left.contentLength ||
        left.parsed.warnings.length - right.parsed.warnings.length ||
        left.candidate.index - right.candidate.index,
    );

  if (!successes.length) {
    const warnings =
      candidates.length > 1
        ? [
            `检测到 ${candidates.length} 个${candidateLabel}候选，但都未通过格式校验`,
            ...attempts.flatMap(({ candidate, parsed }) =>
              parsed.warnings.map(warning => `候选 ${candidate.index + 1}：${warning}`),
            ),
          ]
        : attempts[0]!.parsed.warnings;
    return {
      ok: false,
      raw,
      warnings: uniqueWarnings(warnings),
    };
  }

  const selected = successes[0]!;
  const selectionWarning =
    candidates.length > 1
      ? `检测到 ${candidates.length} 个${candidateLabel}候选，已选择第 ${selected.candidate.index + 1} 个（有效内容 ${selected.contentLength} 字）`
      : '';
  return {
    ...selected.parsed,
    raw,
    warnings: uniqueWarnings([selectionWarning, ...selected.parsed.warnings]),
  };
}

export function parseTaggedOutputCandidates<T>(
  raw: string,
  rootName: string,
  parse: (candidateRaw: string) => XmlParseResult<T>,
): XmlParseResult<T> {
  const candidates = extractTaggedOutputCandidates(raw, rootName);
  const selected = selectBestParsedCandidate(raw, candidates, candidate => parse(candidate.raw), ` <${rootName}> `);
  if (selected) {
    const incompleteWarning = getIncompleteTaggedRootWarning(raw, rootName, candidates.length);
    return {
      ...selected,
      warnings: [...new Set([...selected.warnings, incompleteWarning].filter(Boolean))],
    };
  }
  return {
    ok: false,
    raw,
    warnings: diagnoseTaggedRoot(raw, rootName),
  };
}
