const blockTags = new Set(['blockquote', 'ol', 'pre', 'ul']);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function flushParagraph(lines: string[], output: string[]) {
  if (!lines.length) return;
  const content = lines.map(renderInline).join('<br>');
  output.push(`<p>${content}</p>`);
  lines.length = 0;
}

function flushList(lines: string[], output: string[]) {
  if (!lines.length) return;
  output.push(`<ul>${lines.map(line => `<li>${renderInline(line)}</li>`).join('')}</ul>`);
  lines.length = 0;
}

export function renderMarkdown(value: string) {
  const source = String(value || '')
    .replace(/\r\n?/g, '\n')
    .trim();
  if (!source) return '';

  const output: string[] = [];
  const paragraphLines: string[] = [];
  const listLines: string[] = [];
  const lines = source.split('\n');
  let codeLines: string[] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith('```')) {
      if (codeLines) {
        output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = null;
      } else {
        flushParagraph(paragraphLines, output);
        flushList(listLines, output);
        codeLines = [];
      }
      continue;
    }

    if (codeLines) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph(paragraphLines, output);
      flushList(listLines, output);
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph(paragraphLines, output);
      flushList(listLines, output);
      const level = Math.min(heading[1].length + 2, 6);
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const quote = /^>\s?(.+)$/.exec(line);
    if (quote) {
      flushParagraph(paragraphLines, output);
      flushList(listLines, output);
      output.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    const list = /^[-*]\s+(.+)$/.exec(line);
    if (list) {
      flushParagraph(paragraphLines, output);
      listLines.push(list[1]);
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph(paragraphLines, output);
      flushList(listLines, output);
      output.push(`<ol><li>${renderInline(ordered[1])}</li></ol>`);
      continue;
    }

    flushList(listLines, output);
    paragraphLines.push(line);
  }

  if (codeLines) output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  flushParagraph(paragraphLines, output);
  flushList(listLines, output);

  return output
    .map(block => {
      const match = /^<([a-z0-9]+)/i.exec(block);
      return match && blockTags.has(match[1]) ? block : block;
    })
    .join('');
}
