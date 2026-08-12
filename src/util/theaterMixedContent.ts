export type TheaterContentSegment = {
  content: string;
  kind: 'html' | 'text';
};

export const THEATER_HTML_FENCE_OPEN = '```html';
export const THEATER_HTML_FENCE_CLOSE = '```';

export function parseTheaterContentSegments(content: string): TheaterContentSegment[] {
  const segments: TheaterContentSegment[] = [];
  let cursor = 0;
  while (cursor < content.length) {
    const openIndex = content.indexOf(THEATER_HTML_FENCE_OPEN, cursor);
    if (openIndex < 0) {
      const text = content.slice(cursor);
      if (text) segments.push({ content: text, kind: 'text' });
      break;
    }
    const htmlStart = openIndex + THEATER_HTML_FENCE_OPEN.length;
    const closeIndex = content.indexOf(THEATER_HTML_FENCE_CLOSE, htmlStart);
    if (closeIndex < 0) {
      const text = content.slice(cursor);
      if (text) segments.push({ content: text, kind: 'text' });
      break;
    }
    const text = content.slice(cursor, openIndex);
    if (text) segments.push({ content: text, kind: 'text' });
    segments.push({ content: content.slice(htmlStart, closeIndex).replace(/^\r?\n|\r?\n$/gu, ''), kind: 'html' });
    cursor = closeIndex + THEATER_HTML_FENCE_CLOSE.length;
  }
  return segments;
}

export function hasTheaterHtmlFence(content: string) {
  return parseTheaterContentSegments(content).some(segment => segment.kind === 'html');
}

export function wrapLegacyTheaterFrontend(content: string) {
  if (!content || hasTheaterHtmlFence(content)) return content;
  return `${THEATER_HTML_FENCE_OPEN}\n${content}\n${THEATER_HTML_FENCE_CLOSE}`;
}
