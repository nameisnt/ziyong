export type GenerationOutputCleaningSettings = {
  enabled: boolean;
  endTags: string;
};

export type GenerationOutputCleaningResult = {
  content: string;
  matchedTag: string;
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
    return { content: rawOutput, matchedTag: '', removedLength: 0 };
  }

  const tags = parseGenerationOutputEndTags(settings.endTags);
  if (!tags.length) return { content: rawOutput, matchedTag: '', removedLength: 0 };

  const lowerOutput = rawOutput.toLowerCase();
  const matches = tags
    .map(tag => ({ index: lowerOutput.indexOf(tag.toLowerCase()), tag }))
    .filter(match => match.index >= 0)
    .sort((left, right) => left.index - right.index);
  const firstMatch = matches[0];
  if (!firstMatch) return { content: rawOutput, matchedTag: '', removedLength: 0 };

  let cutEnd = firstMatch.index + firstMatch.tag.length;
  // 兼容 </think> 后紧接另一层已配置结束标签；只扫描连续标签，不误删后续正文中的同名标签。
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
    matchedTag: firstMatch.tag,
    removedLength: cutEnd,
  };
}
