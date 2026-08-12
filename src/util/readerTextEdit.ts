export interface ReaderTextOccurrence {
  index: number;
  offset: number;
  sentence: string;
  sentenceEnd: number;
  sentenceStart: number;
}

const SENTENCE_BOUNDARY = /[。！？!?；;\n]/u;

function findSentenceStart(body: string, offset: number) {
  for (let index = Math.max(0, offset - 1); index >= 0; index -= 1) {
    if (SENTENCE_BOUNDARY.test(body[index] || '')) return index + 1;
  }
  return 0;
}

function findSentenceEnd(body: string, offset: number) {
  for (let index = Math.max(0, offset); index < body.length; index += 1) {
    if (SENTENCE_BOUNDARY.test(body[index] || '')) return index + 1;
  }
  return body.length;
}

export function findReaderTextOccurrences(body: string, selectedText: string): ReaderTextOccurrence[] {
  if (!selectedText) return [];
  const result: ReaderTextOccurrence[] = [];
  let cursor = 0;
  while (cursor <= body.length - selectedText.length) {
    const offset = body.indexOf(selectedText, cursor);
    if (offset < 0) break;
    const sentenceStart = findSentenceStart(body, offset);
    const sentenceEnd = findSentenceEnd(body, offset + selectedText.length - 1);
    result.push({
      index: result.length,
      offset,
      sentence: body.slice(sentenceStart, sentenceEnd),
      sentenceEnd,
      sentenceStart,
    });
    cursor = offset + Math.max(1, selectedText.length);
  }
  return result;
}
