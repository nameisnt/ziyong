export type GenerationOutputCleaningSettings = {
  enabled: boolean;
  endTags: string;
};

export type GenerationOutputCleaningResult = {
  content: string;
  matchedTag: string;
  removedContent: string;
  removedLength: number;
};

function normalizeEndTag(value: string) {
  const normalized = value.trim();
  if (!normalized) return '';
  const fullTagMatch = normalized.match(/^<\/\s*([A-Za-z][\w:.-]*)\s*>$/u);
  const nameMatch = normalized.match(/^([A-Za-z][\w:.-]*)$/u);
  const tagName = fullTagMatch?.[1] || nameMatch?.[1] || '';
  return tagName ? `</${tagName}>` : '';
}

export function parseGenerationOutputEndTags(value: string) {
  return [...new Set(value.split(/\r?\n/u).map(normalizeEndTag).filter(Boolean))];
}

export function cleanGenerationOutput(
  rawOutput: string,
  settings: GenerationOutputCleaningSettings,
): GenerationOutputCleaningResult {
  if (!settings.enabled || !rawOutput) {
    return { content: rawOutput, matchedTag: '', removedContent: '', removedLength: 0 };
  }

  const tags = parseGenerationOutputEndTags(settings.endTags);
  if (!tags.length) return { content: rawOutput, matchedTag: '', removedContent: '', removedLength: 0 };

  const lowerOutput = rawOutput.toLowerCase();
  // 每个标签取最后一次出现的位置，再取其中最靠后的那个。
  const matches = tags
    .map(tag => ({ index: lowerOutput.lastIndexOf(tag.toLowerCase()), tag }))
    .filter(match => match.index >= 0)
    .sort((left, right) => left.index - right.index);
  const lastMatch = matches[matches.length - 1];
  if (!lastMatch) return { content: rawOutput, matchedTag: '', removedContent: '', removedLength: 0 };

  // 以最后一个已配置结束标签为界：思维链可能分成多段，第一个标签之后仍会残留标签和过程文字，
  // 只切到第一段会让这些残留进入正文并干扰格式校验。
  let cutEnd = lastMatch.index + lastMatch.tag.length;
  while (cutEnd < rawOutput.length) {
    const remaining = rawOutput.slice(cutEnd);
    const whitespaceLength = remaining.match(/^\s*/u)?.[0].length ?? 0;
    const candidateStart = cutEnd + whitespaceLength;
    const candidate = tags.find(
      tag => rawOutput.slice(candidateStart, candidateStart + tag.length).toLowerCase() === tag.toLowerCase(),
    );
    if (!candidate) break;
    cutEnd = candidateStart + candidate.length;
  }

  return {
    content: rawOutput.slice(cutEnd).trimStart(),
    matchedTag: lastMatch.tag,
    removedContent: rawOutput.slice(0, cutEnd).trim(),
    removedLength: cutEnd,
  };
}
