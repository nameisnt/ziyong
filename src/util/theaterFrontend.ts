export interface TheaterFrontendBuildOptions {
  channelId: string;
  securityMode?: 'safe' | 'trusted';
  theme: 'dark' | 'light';
  title?: string;
}

const FRONTEND_FRAME_SOURCE = 'st-phone-theater';
const TRUSTED_FRONTEND_IFRAME_CSP = [
  "default-src 'none'",
  'img-src https: data: blob:',
  'media-src https: data: blob:',
  'font-src https: data:',
  "style-src 'unsafe-inline' https:",
  "script-src 'unsafe-inline' https:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function createSafeFrontendCsp(nonce: string) {
  return [
    "default-src 'none'",
    'img-src https: data: blob:',
    'media-src https: data: blob:',
    'font-src https: data:',
    "style-src 'unsafe-inline' https:",
    `script-src 'nonce-${nonce}'`,
    "connect-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

function hasDocumentShell(raw: string) {
  return /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(raw);
}

function stripDangerousNodes(document: Document) {
  document.querySelectorAll('base, iframe, object, embed').forEach(node => node.remove());
  document.querySelectorAll('meta[http-equiv]').forEach(node => {
    const value = node.getAttribute('http-equiv')?.trim().toLowerCase();
    if (value === 'refresh' || value === 'content-security-policy') {
      node.remove();
    }
  });
}

function stripUntrustedBehavior(document: Document) {
  document.querySelectorAll('script, form').forEach(node => node.remove());
  document.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (
        name.startsWith('on') ||
        ((name === 'href' || name === 'src' || name === 'action') && value.startsWith('javascript:'))
      ) {
        node.removeAttribute(attribute.name);
      }
    });
  });
}

function createBaseStyle(theme: 'dark' | 'light') {
  const palette =
    theme === 'dark'
      ? {
          background: '#111827',
          border: 'rgba(255, 255, 255, 0.08)',
          muted: '#9ca3af',
          text: '#f9fafb',
        }
      : {
          background: '#ffffff',
          border: 'rgba(15, 23, 42, 0.08)',
          muted: '#475569',
          text: '#0f172a',
        };

  return [
    ':root {',
    `  color-scheme: ${theme};`,
    `  --pc-frame-bg: ${palette.background};`,
    `  --pc-frame-text: ${palette.text};`,
    `  --pc-frame-muted: ${palette.muted};`,
    `  --pc-frame-border: ${palette.border};`,
    '}',
    'html {',
    '  min-height: 100%;',
    '  background: var(--pc-frame-bg);',
    '  color: var(--pc-frame-text);',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '}',
    'body {',
    '  margin: 0;',
    '  min-height: 100%;',
    '  padding: 16px;',
    '  background: var(--pc-frame-bg);',
    '  color: var(--pc-frame-text);',
    '  line-height: 1.6;',
    '  word-break: break-word;',
    '}',
    'img, video, canvas, svg {',
    '  max-width: 100%;',
    '  height: auto;',
    '}',
    'table {',
    '  width: 100%;',
    '  border-collapse: collapse;',
    '}',
    'pre {',
    '  white-space: pre-wrap;',
    '  overflow-wrap: anywhere;',
    '}',
    'code, pre {',
    '  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;',
    '}',
    'blockquote {',
    '  margin: 0;',
    '  padding-left: 12px;',
    '  border-left: 3px solid var(--pc-frame-border);',
    '  color: var(--pc-frame-muted);',
    '}',
  ].join('\n');
}

function escapeHtmlText(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function createResizeBridgeScript(channelId: string) {
  return [
    '(() => {',
    `  const CHANNEL_ID = ${JSON.stringify(channelId)};`,
    `  const SOURCE = ${JSON.stringify(FRONTEND_FRAME_SOURCE)};`,
    '  const postHeight = () => {',
    '    const root = document.documentElement;',
    '    const body = document.body;',
    '    const height = Math.max(',
    '      root?.scrollHeight || 0,',
    '      root?.offsetHeight || 0,',
    '      body?.scrollHeight || 0,',
    '      body?.offsetHeight || 0,',
    '    );',
    "    parent.postMessage({ source: SOURCE, channelId: CHANNEL_ID, type: 'height', height }, '*');",
    '  };',
    '  const queueHeight = () => requestAnimationFrame(postHeight);',
    '  const INTERACTIVE_TARGETS = "a, button, input, textarea, select, label, summary, audio, video, [contenteditable=true], [role=button]";',
    '  let pointer = null;',
    "  document.addEventListener('pointerdown', event => {",
    '    if (!event.isPrimary || event.button !== 0) return;',
    '    const target = event.target instanceof Element ? event.target : null;',
    '    if (target?.closest(INTERACTIVE_TARGETS)) return;',
    '    const sideWidth = window.innerWidth * 0.2;',
    '    const direction = event.clientX >= 12 && event.clientX <= sideWidth ? 1 :',
    '      window.innerWidth - event.clientX >= 12 && window.innerWidth - event.clientX <= sideWidth ? -1 : 0;',
    '    pointer = { direction, id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };',
    '  }, true);',
    "  document.addEventListener('pointercancel', () => { pointer = null; }, true);",
    "  document.addEventListener('pointerup', event => {",
    '    if (!pointer || pointer.id !== event.pointerId) return;',
    '    const active = pointer;',
    '    pointer = null;',
    '    const moved = Math.hypot(event.clientX - active.x, event.clientY - active.y);',
    '    const deltaX = event.clientX - active.x;',
    '    const deltaY = event.clientY - active.y;',
    '    const relativeY = window.innerHeight > 0 ? event.clientY / window.innerHeight : -1;',
    '    const selected = String(window.getSelection?.() || "").trim();',
    '    if (active.direction && Math.sign(deltaX) === active.direction && Math.abs(deltaX) >= 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {',
    "      parent.postMessage({ source: SOURCE, channelId: CHANNEL_ID, type: 'side-back' }, '*');",
    '      return;',
    '    }',
    '    if (moved <= 10 && performance.now() - active.time <= 500 && !selected && relativeY >= 0.2 && relativeY <= 0.8) {',
    "      parent.postMessage({ source: SOURCE, channelId: CHANNEL_ID, type: 'reader-tap' }, '*');",
    '    }',
    '  }, true);',
    "  window.addEventListener('load', queueHeight);",
    "  document.addEventListener('DOMContentLoaded', queueHeight);",
    '  if (typeof ResizeObserver === "function") {',
    '    const resizeObserver = new ResizeObserver(queueHeight);',
    '    resizeObserver.observe(document.documentElement);',
    '  }',
    '  if (typeof MutationObserver === "function") {',
    '    const mutationObserver = new MutationObserver(queueHeight);',
    '    mutationObserver.observe(document.documentElement, {',
    '      attributes: true,',
    '      characterData: true,',
    '      childList: true,',
    '      subtree: true,',
    '    });',
    '  }',
    '  setTimeout(queueHeight, 80);',
    '  setTimeout(queueHeight, 320);',
    '  setInterval(postHeight, 1500);',
    '  queueHeight();',
    '})();',
  ].join('\n');
}

function sanitizeFrontendHtml(rawHtml: string, securityMode: 'safe' | 'trusted') {
  const parser = new DOMParser();
  const document = parser.parseFromString(rawHtml, 'text/html');
  stripDangerousNodes(document);
  if (securityMode === 'safe') stripUntrustedBehavior(document);

  if (hasDocumentShell(rawHtml)) {
    return {
      bodyHtml: document.body.innerHTML.trim(),
      headHtml: document.head.innerHTML.trim(),
    };
  }

  return {
    bodyHtml: document.body.innerHTML.trim(),
    headHtml: '',
  };
}

export function buildFrontendDocument(rawHtml: string, options: TheaterFrontendBuildOptions) {
  const securityMode = options.securityMode ?? 'trusted';
  const sanitized = sanitizeFrontendHtml(rawHtml, securityMode);
  const title = options.title?.trim() || '小剧场';
  const nonce = `pc${options.channelId.replace(/[^A-Za-z0-9]/g, '')}`;
  const csp = securityMode === 'safe' ? createSafeFrontendCsp(nonce) : TRUSTED_FRONTEND_IFRAME_CSP;

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    `  <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
    `  <title>${escapeHtmlText(title)}</title>`,
    `  <style>${createBaseStyle(options.theme)}</style>`,
    sanitized.headHtml,
    '</head>',
    '<body>',
    sanitized.bodyHtml,
    `  <script${securityMode === 'safe' ? ` nonce="${nonce}"` : ''}>${createResizeBridgeScript(options.channelId)}</script>`,
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}

export function getFrontendFrameSource() {
  return FRONTEND_FRAME_SOURCE;
}
