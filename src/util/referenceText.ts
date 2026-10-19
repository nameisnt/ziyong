function htmlText(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document
    .querySelectorAll(
      'script,style,template,noscript,iframe,object,embed,button,input,select,textarea,[hidden],[aria-hidden="true"]',
    )
    .forEach(node => node.remove());
  document.body.querySelectorAll<HTMLElement>('[style]').forEach(node => {
    if (node.style.display === 'none' || node.style.visibility === 'hidden') node.remove();
  });
  const blocks = new Set([
    'P',
    'DIV',
    'SECTION',
    'ARTICLE',
    'HEADER',
    'FOOTER',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'LI',
    'TR',
    'PRE',
    'BLOCKQUOTE',
    'DETAILS',
    'SUMMARY',
  ]);
  function read(node: Node): string {
    if (node.nodeType === 3) return node.textContent ?? '';
    if (node.nodeType !== 1) return '';
    const element = node as Element;
    if (element.tagName === 'BR') return '\n';
    const text = [...node.childNodes].map(read).join('');
    if (element.tagName === 'TD' || element.tagName === 'TH') return `${text}\t`;
    return blocks.has(element.tagName) ? `\n${text}\n` : text;
  }
  return read(document.body)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function referenceText(content: string) {
  const fenced = /```html[^\S\r\n]*\r?\n([\s\S]*?)\r?\n```/gi;
  if (fenced.test(content)) return content.replace(fenced, (_, html: string) => htmlText(html)).trim();
  if (/<(?:!doctype|html|body|div|p|section|article|table|script|style|details|h[1-6])(?:\s|>)/i.test(content))
    return htmlText(content);
  return content.trim();
}
