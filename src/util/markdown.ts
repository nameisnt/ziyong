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

function flushList(lines: string[], output: string[], tag: 'ol' | 'ul') {
  if (!lines.length) return;
  output.push(`<${tag}>${lines.map(line => `<li>${renderInline(line)}</li>`).join('')}</${tag}>`);
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
  let listTag: 'ol' | 'ul' | null = null;

  const flushActiveList = () => {
    if (!listTag) return;
    flushList(listLines, output, listTag);
    listTag = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith('```')) {
      if (codeLines) {
        output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = null;
      } else {
        flushParagraph(paragraphLines, output);
        flushActiveList();
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
      flushActiveList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph(paragraphLines, output);
      flushActiveList();
      const level = Math.min(heading[1].length + 2, 6);
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const quote = /^>\s?(.+)$/.exec(line);
    if (quote) {
      flushParagraph(paragraphLines, output);
      flushActiveList();
      output.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    const list = /^[-*]\s+(.+)$/.exec(line);
    if (list) {
      flushParagraph(paragraphLines, output);
      if (listTag && listTag !== 'ul') flushActiveList();
      listTag = 'ul';
      listLines.push(list[1]);
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph(paragraphLines, output);
      if (listTag && listTag !== 'ol') flushActiveList();
      listTag = 'ol';
      listLines.push(ordered[1]);
      continue;
    }

    flushActiveList();
    paragraphLines.push(line);
  }

  if (codeLines) output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  flushParagraph(paragraphLines, output);
  flushActiveList();

  return output.join('');
}
