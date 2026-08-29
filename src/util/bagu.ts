import type { BaguRule } from '@/store/bagu';

export interface BaguHit {
  end: number;
  id: string;
  match: string;
  originalText: string;
  postContext: string;
  preContext: string;
  replacement: string;
  replacementEnd: number;
  replacementStart: number;
  ruleId: string;
  ruleLabel: string;
  ruleTitle: string;
  sentenceEnd: number;
  sentenceStart: number;
  start: number;
  type: BaguRule['type'];
}

export interface BaguSentenceGroup {
  end: number;
  hits: BaguHit[];
  id: string;
  originalText: string;
  start: number;
}

export interface BaguSentenceEdit {
  end: number;
  originalText: string;
  replacement: string;
  start: number;
}

export interface BaguApplyResult {
  appliedCount: number;
  text: string;
}

export type BaguWritebackResult = string | false;

const sentenceBreaks = new Set(['。', '！', '？', '；', '!', '?', ';', '\n']);
const deleteTokens = new Set(['删除', '(删除)', '（删除）']);

function buildContextSlice(text: string, start: number, end: number) {
  const radius = 18;
  return {
    preContext: text.slice(Math.max(0, start - radius), start),
    postContext: text.slice(end, Math.min(text.length, end + radius)),
  };
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileTemplate(template: string) {
  let source = '';
  for (let index = 0; index < template.length; index += 1) {
    const char = template[index];
    if (char === '{' || char === '[') {
      const close = char === '{' ? '}' : ']';
      const closeIndex = template.indexOf(close, index + 1);
      if (closeIndex === -1) {
        source += escapeRegex(char);
        continue;
      }
      const options = template
        .slice(index + 1, closeIndex)
        .split('|')
        .map(item => item.trim())
        .filter(Boolean);
      if (!options.length) {
        index = closeIndex;
        continue;
      }
      const group = `(?:${options.map(escapeRegex).join('|')})`;
      source += char === '[' ? `${group}?` : group;
      index = closeIndex;
      continue;
    }
    if (char === '…') {
      source += '([^。！？；!?;\\n]*?)';
      continue;
    }
    source += escapeRegex(char);
  }
  return source;
}

function resolveTemplateReplacement(suggestion: string, middleContents: string[]) {
  const replacement = suggestion.trim();
  if (!replacement) return '';
  return replacement.replace(/\{\{\s*中间内容\s*(\d+)?\s*\}\}/g, (_placeholder, rawIndex: string | undefined) => {
    const index = rawIndex ? Number(rawIndex) - 1 : 0;
    return Number.isInteger(index) && index >= 0 ? (middleContents[index] ?? '') : '';
  });
}

function sentenceRanges(text: string) {
  const ranges: Array<{ end: number; start: number }> = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (!sentenceBreaks.has(text[index])) continue;
    const end = index + 1;
    if (end > start) ranges.push({ end, start });
    start = end;
  }
  if (start < text.length) ranges.push({ end: text.length, start });
  return ranges;
}

function normalizeReplacement(replacements: string[]) {
  const replacement = replacements.map(item => item.trim()).find(item => item && !deleteTokens.has(item));
  return replacement || '';
}

function createHit(
  input: Omit<
    BaguHit,
    | 'id'
    | 'originalText'
    | 'postContext'
    | 'preContext'
    | 'replacementEnd'
    | 'replacementStart'
    | 'sentenceEnd'
    | 'sentenceStart'
  >,
  text: string,
  sentenceRange: { end: number; start: number },
): BaguHit {
  const { preContext, postContext } = buildContextSlice(text, input.start, input.end);
  return {
    ...input,
    id: `${input.type}-${input.ruleId}-${input.start}-${input.end}-${input.match}`,
    originalText: text.slice(input.start, input.end),
    postContext,
    preContext,
    replacementEnd: input.end,
    replacementStart: input.start,
    sentenceEnd: sentenceRange.end,
    sentenceStart: sentenceRange.start,
  };
}

export function scanTextWithBaguRules(text: string, rules: BaguRule[]) {
  const hits: BaguHit[] = [];
  if (!text.trim()) return hits;

  for (const range of sentenceRanges(text)) {
    const sentence = text.slice(range.start, range.end);
    let sentenceHasTemplateHit = false;

    rules
      .filter(rule => rule.enabled && rule.type === 'template' && rule.template.trim())
      .forEach(rule => {
        let expression: RegExp;
        try {
          expression = new RegExp(compileTemplate(rule.template.trim()), 'gu');
        } catch {
          return;
        }

        let match = expression.exec(sentence);
        while (match) {
          const rawMatch = match[0];
          if (rawMatch) {
            const start = range.start + match.index;
            const end = start + rawMatch.length;
            hits.push(
              createHit(
                {
                  end,
                  match: rawMatch,
                  replacement: resolveTemplateReplacement(rule.suggestion, match.slice(1)),
                  ruleId: rule.id,
                  ruleLabel: rule.template,
                  ruleTitle: rule.title,
                  start,
                  type: rule.type,
                },
                text,
                range,
              ),
            );
            sentenceHasTemplateHit = true;
          }

          if (expression.lastIndex === match.index) {
            expression.lastIndex += 1;
          }
          match = expression.exec(sentence);
        }
      });

    if (sentenceHasTemplateHit) continue;

    rules
      .filter(rule => rule.enabled && rule.type === 'replacement' && rule.sources.length)
      .forEach(rule => {
        const sources = [...rule.sources]
          .map(item => item.trim())
          .filter(Boolean)
          .sort((left, right) => right.length - left.length);
        const replacement = normalizeReplacement(rule.replacements);
        sources.forEach(source => {
          let searchFrom = 0;
          while (searchFrom < sentence.length) {
            const index = sentence.indexOf(source, searchFrom);
            if (index === -1) break;
            let end = range.start + index + source.length;
            const start = range.start + index;
            if (!replacement && text[end] && '的得地'.includes(text[end])) {
              end += 1;
            }
            hits.push(
              createHit(
                {
                  end,
                  match: text.slice(start, end),
                  replacement,
                  ruleId: rule.id,
                  ruleLabel: source,
                  ruleTitle: rule.title,
                  start,
                  type: rule.type,
                },
                text,
                range,
              ),
            );
            searchFrom = index + source.length;
          }
        });
      });
  }

  hits.sort(
    (left, right) =>
      left.start - right.start || right.end - left.end || left.ruleTitle.localeCompare(right.ruleTitle, 'zh-CN'),
  );

  const nonOverlappingHits: BaguHit[] = [];
  let occupiedEnd = -1;
  hits.forEach(hit => {
    if (hit.start < occupiedEnd) return;
    nonOverlappingHits.push(hit);
    occupiedEnd = hit.end;
  });
  return nonOverlappingHits;
}

export function groupBaguHitsBySentence(text: string, hits: BaguHit[]): BaguSentenceGroup[] {
  const groups = new Map<string, BaguSentenceGroup>();
  hits.forEach(hit => {
    const id = `${hit.sentenceStart}-${hit.sentenceEnd}`;
    const group = groups.get(id);
    if (group) {
      group.hits.push(hit);
      return;
    }
    groups.set(id, {
      end: hit.sentenceEnd,
      hits: [hit],
      id,
      originalText: text.slice(hit.sentenceStart, hit.sentenceEnd),
      start: hit.sentenceStart,
    });
  });
  return [...groups.values()].sort((left, right) => left.start - right.start);
}

export function buildBaguSentenceReplacement(group: BaguSentenceGroup, hits = group.hits) {
  const orderedHits = [...hits].sort((left, right) => right.start - left.start || right.end - left.end);
  let replacement = group.originalText;
  let reservedStart = group.end;

  orderedHits.forEach(hit => {
    if (hit.start < group.start || hit.end > group.end || hit.end > reservedStart) return;
    const localStart = hit.start - group.start;
    const localEnd = hit.end - group.start;
    if (replacement.slice(localStart, localEnd) !== hit.originalText) return;
    replacement = `${replacement.slice(0, localStart)}${hit.replacement}${replacement.slice(localEnd)}`;
    reservedStart = hit.start;
  });

  return replacement;
}

export function applyBaguHits(text: string, hits: BaguHit[]): BaguApplyResult {
  const orderedHits = [...hits]
    .filter(hit => hit.replacementStart >= 0 && hit.replacementEnd > hit.replacementStart)
    .sort(
      (left, right) => right.replacementStart - left.replacementStart || right.replacementEnd - left.replacementEnd,
    );
  let nextText = text;
  let appliedCount = 0;
  let reservedStart = Number.POSITIVE_INFINITY;

  orderedHits.forEach(hit => {
    if (hit.replacementEnd > reservedStart) return;
    if (nextText.slice(hit.replacementStart, hit.replacementEnd) !== hit.originalText) return;
    nextText = `${nextText.slice(0, hit.replacementStart)}${hit.replacement}${nextText.slice(hit.replacementEnd)}`;
    reservedStart = hit.replacementStart;
    appliedCount += 1;
  });

  return { appliedCount, text: nextText };
}

export function applyBaguSentenceEdits(text: string, edits: BaguSentenceEdit[]): BaguApplyResult {
  const orderedEdits = [...edits]
    .filter(edit => edit.start >= 0 && edit.end > edit.start && edit.replacement !== edit.originalText)
    .sort((left, right) => right.start - left.start || right.end - left.end);
  let nextText = text;
  let appliedCount = 0;
  let reservedStart = Number.POSITIVE_INFINITY;

  orderedEdits.forEach(edit => {
    if (edit.end > reservedStart) return;
    if (nextText.slice(edit.start, edit.end) !== edit.originalText) return;
    nextText = `${nextText.slice(0, edit.start)}${edit.replacement}${nextText.slice(edit.end)}`;
    reservedStart = edit.start;
    appliedCount += 1;
  });

  return { appliedCount, text: nextText };
}
