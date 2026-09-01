export interface TheaterFrontendBuildOptions {
  channelId: string;
  documentFlow?: boolean;
  flushContent?: boolean;
  hostBridge?: boolean;
  securityMode?: 'safe' | 'trusted';
  theme: 'dark' | 'light';
  title?: string;
}

const FRONTEND_FRAME_SOURCE = 'st-phone-theater';
const TRUSTED_FRONTEND_IFRAME_CSP = [
  "default-src 'none'",
  "img-src 'self' http: https: data: blob:",
  "media-src 'self' http: https: data: blob:",
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
    "img-src 'self' http: https: data: blob:",
    "media-src 'self' http: https: data: blob:",
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
    '  height: auto;',
    '  min-height: 0;',
    '  background: var(--pc-frame-bg);',
    '  color: var(--pc-frame-text);',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '}',
    'body {',
    '  margin: 0;',
    '  min-height: 0;',
    '  padding: 0;',
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

function createLayoutGuardStyle(flushContent: boolean, documentFlow: boolean) {
  return [
    'html, body {',
    '  height: auto !important;',
    '  min-height: 0 !important;',
    '}',
    'body {',
    '  margin: 0 !important;',
    '  padding: 0 !important;',
    '}',
    '#pc-frame-content {',
    '  display: flow-root;',
    '  width: 100%;',
    '  min-height: 0;',
    `  padding: ${flushContent ? '0' : '16px'};`,
    '  box-sizing: border-box;',
    '  background: var(--pc-frame-bg);',
    '  overflow-y: visible !important;',
    '}',
    '#pc-frame-content[data-pc-frame-compat="true"] {',
    '  min-height: var(--pc-frame-compat-height, 220px);',
    '}',
    ...(documentFlow
      ? [
          '#pc-frame-content > [data-pc-frame-flow-root] {',
          '  height: auto !important;',
          '  min-height: 0 !important;',
          '  max-height: none !important;',
          '  overflow-y: visible !important;',
          '}',
          '#pc-frame-content[data-pc-frame-compat="true"] > [data-pc-frame-flow-root] {',
          '  min-height: var(--pc-frame-compat-height, 220px) !important;',
          '  overflow-y: visible !important;',
          '}',
          '#pc-frame-content [data-pc-frame-collapsed] {',
          '  height: auto !important;',
          '  min-height: var(--pc-frame-compat-height, 220px) !important;',
          '  max-height: none !important;',
          '  overflow-y: visible !important;',
          '}',
        ]
      : []),
  ].join('\n');
}

function escapeHtmlText(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function createHostBridgeScript() {
  return [
    '(() => {',
    '  const parentWin = window.parent;',
    '  const helper = parentWin.TavernHelper;',
    '  window.parentWin = parentWin;',
    '  window.parentDoc = parentWin.document;',
    "  for (const name of ['$', '_', 'toastr']) {",
    '    if (parentWin[name] !== undefined) window[name] = parentWin[name];',
    '  }',
    '  window.TavernHelper = helper;',
    '  if (helper) {',
    '    for (const name of Object.keys(helper)) {',
    "      if (typeof helper[name] === 'function' && window[name] === undefined) {",
    '        window[name] = helper[name].bind(helper);',
    '      }',
    '    }',
    '  }',
    '  window.Mvu = parentWin.__th_ufb_bridge__?.Mvu || parentWin.Mvu;',
    '  if (parentWin.MVU !== undefined) window.MVU = parentWin.MVU;',
    '})();',
  ].join('\n');
}

function createRuntimeDiagnosticsScript(channelId: string) {
  return [
    '(() => {',
    `  const CHANNEL_ID = ${JSON.stringify(channelId)};`,
    `  const SOURCE = ${JSON.stringify(FRONTEND_FRAME_SOURCE)};`,
    '  let reported = false;',
    '  const report = value => {',
    '    if (reported) return;',
    '    reported = true;',
    '    const message = value instanceof Error ? value.message : String(value || "网页脚本执行失败");',
    "    parent.postMessage({ source: SOURCE, channelId: CHANNEL_ID, type: 'runtime-error', message: message.slice(0, 240) }, '*');",
    '  };',
    "  window.addEventListener('error', event => report(event.error || event.message));",
    "  window.addEventListener('unhandledrejection', event => report(event.reason));",
    '})();',
  ].join('\n');
}

function createResizeBridgeScript(channelId: string, documentFlow: boolean) {
  return [
    '(() => {',
    `  const CHANNEL_ID = ${JSON.stringify(channelId)};`,
    `  const SOURCE = ${JSON.stringify(FRONTEND_FRAME_SOURCE)};`,
    `  const DOCUMENT_FLOW = ${JSON.stringify(documentFlow)};`,
    "  const content = document.getElementById('pc-frame-content');",
    '  let heightQueued = false;',
    '  let lastHeight = -1;',
    '  let compatibilityApplied = false;',
    '  let compatibilityReported = false;',
    '  const syncDocumentFlowRoots = () => {',
    '    if (!DOCUMENT_FLOW || !content) return;',
    '    for (const child of content.children) {',
    '      const position = getComputedStyle(child).position;',
    "      const shouldFlow = position === 'static' || position === 'relative';",
    "      if (child.hasAttribute('data-pc-frame-flow-root') !== shouldFlow) {",
    "        child.toggleAttribute('data-pc-frame-flow-root', shouldFlow);",
    '      }',
    '    }',
    '  };',
    '  const getVisualHeight = () => {',
    '    if (!content) return 0;',
    '    const contentBounds = content.getBoundingClientRect();',
    '    let bottom = contentBounds.bottom;',
    '    let inspected = 0;',
    '    for (const element of content.querySelectorAll("*")) {',
    '      if (inspected >= 800) break;',
    '      inspected += 1;',
    '      const style = getComputedStyle(element);',
    "      if (style.display === 'none' || style.visibility === 'hidden') continue;",
    '      const rect = element.getBoundingClientRect();',
    '      if (rect.width <= 0 && rect.height <= 0) continue;',
    '      bottom = Math.max(bottom, rect.bottom);',
    '    }',
    '    return Math.max(0, Math.ceil(bottom - contentBounds.top));',
    '  };',
    '  const hasVisibleText = () => {',
    '    if (!content) return false;',
    '    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);',
    '    let inspected = 0;',
    '    while (inspected < 160) {',
    '      const node = walker.nextNode();',
    '      if (!node) break;',
    '      inspected += 1;',
    '      if (!String(node.textContent || "").trim()) continue;',
    '      const range = document.createRange();',
    '      range.selectNodeContents(node);',
    '      const rect = range.getBoundingClientRect();',
    '      if (rect.width > 0 && rect.height > 0) return true;',
    '    }',
    '    return false;',
    '  };',
    '  const applyCompatibilityLayout = measuredHeight => {',
    '    if (!DOCUMENT_FLOW || !content || compatibilityApplied) return false;',
    '    const textLength = String(content.textContent || "").replace(/\\s+/g, "").length;',
    '    if (textLength < 20 || measuredHeight > 80) return false;',
    '    compatibilityApplied = true;',
    '    const repairHeight = Math.max(220, Math.min(560, Math.round(window.innerHeight || 320)));',
    "    content.setAttribute('data-pc-frame-compat', 'true');",
    "    content.style.setProperty('--pc-frame-compat-height', repairHeight + 'px');",
    '    for (const root of content.children) {',
    '      if (!(root instanceof HTMLElement)) continue;',
    '      let current = root;',
    '      for (let depth = 0; depth < 4 && current; depth += 1) {',
    '        const rect = current.getBoundingClientRect();',
    '        if (rect.height <= 48) current.setAttribute("data-pc-frame-collapsed", "true");',
    '        const children = [...current.children].filter(child => !["SCRIPT", "STYLE", "LINK", "META"].includes(child.tagName));',
    '        current = children.length === 1 && children[0] instanceof HTMLElement ? children[0] : null;',
    '      }',
    '    }',
    '    return true;',
    '  };',
    '  const reportCompatibility = state => {',
    '    if (compatibilityReported && state !== "failed") return;',
    '    compatibilityReported = true;',
    "    parent.postMessage({ source: SOURCE, channelId: CHANNEL_ID, type: 'layout-state', state }, '*');",
    '  };',
    '  const postHeight = () => {',
    '    if (!content) return;',
    '    syncDocumentFlowRoots();',
    '    const bounds = content.getBoundingClientRect();',
    '    let height = Math.max(',
    '      content.scrollHeight || 0,',
    '      content.offsetHeight || 0,',
    '      Math.ceil(content.getBoundingClientRect().height || bounds.height || 0),',
    '      getVisualHeight(),',
    '    );',
    '    if (applyCompatibilityLayout(height)) {',
    '      reportCompatibility("applied");',
    '      requestAnimationFrame(queueHeight);',
    '      return;',
    '    }',
    '    if (compatibilityApplied && !hasVisibleText()) reportCompatibility("failed");',
    '    if (Math.abs(height - lastHeight) <= 1) return;',
    '    lastHeight = height;',
    "    parent.postMessage({ source: SOURCE, channelId: CHANNEL_ID, type: 'height', height, viewportHeight: window.innerHeight }, '*');",
    '  };',
    '  const queueHeight = () => {',
    '    if (heightQueued) return;',
    '    heightQueued = true;',
    '    requestAnimationFrame(() => {',
    '      heightQueued = false;',
    '      postHeight();',
    '    });',
    '  };',
    '  const INTERACTIVE_TARGETS = "a, button, input, textarea, select, label, summary, audio, video, [contenteditable=true], [role=button]";',
    '  let pointer = null;',
    "  document.addEventListener('pointerdown', event => {",
    '    if (!event.isPrimary || event.button !== 0) return;',
    '    const target = event.target instanceof Element ? event.target : null;',
    '    if (target?.closest(INTERACTIVE_TARGETS)) return;',
    '    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };',
    '  }, true);',
    "  document.addEventListener('pointercancel', () => { pointer = null; }, true);",
    "  document.addEventListener('pointerup', event => {",
    '    if (!pointer || pointer.id !== event.pointerId) return;',
    '    const active = pointer;',
    '    pointer = null;',
    '    const moved = Math.hypot(event.clientX - active.x, event.clientY - active.y);',
    '    const selected = String(window.getSelection?.() || "").trim();',
    '    if (moved <= 10 && performance.now() - active.time <= 500 && !selected) {',
    "      parent.postMessage({ source: SOURCE, channelId: CHANNEL_ID, type: 'reader-tap', clientY: event.clientY }, '*');",
    '    }',
    '  }, true);',
    "  window.addEventListener('load', queueHeight);",
    "  document.addEventListener('DOMContentLoaded', queueHeight);",
    '  if (typeof ResizeObserver === "function") {',
    '    const resizeObserver = new ResizeObserver(queueHeight);',
    '    if (content) resizeObserver.observe(content);',
    '  }',
    '  if (typeof MutationObserver === "function") {',
    '    const mutationObserver = new MutationObserver(() => {',
    '      syncDocumentFlowRoots();',
    '      queueHeight();',
    '    });',
    '    if (content) mutationObserver.observe(content, {',
    '      attributes: true,',
    '      characterData: true,',
    '      childList: true,',
    '      subtree: true,',
    '    });',
    '  }',
    '  setTimeout(queueHeight, 80);',
    '  setTimeout(queueHeight, 320);',
    '  syncDocumentFlowRoots();',
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
    headHtml: document.head.innerHTML.trim(),
  };
}

export function buildFrontendDocument(rawHtml: string, options: TheaterFrontendBuildOptions) {
  const securityMode = options.securityMode ?? 'trusted';
  const sanitized = sanitizeFrontendHtml(rawHtml, securityMode);
  const title = options.title?.trim() || '小剧场';
  const nonce = `pc${options.channelId.replace(/[^A-Za-z0-9]/g, '')}`;
  const csp = securityMode === 'safe' ? createSafeFrontendCsp(nonce) : TRUSTED_FRONTEND_IFRAME_CSP;
  const hostBridge =
    options.hostBridge && securityMode === 'trusted' ? `  <script>${createHostBridgeScript()}</script>` : '';
  const diagnostics = `  <script${securityMode === 'safe' ? ` nonce="${nonce}"` : ''}>${createRuntimeDiagnosticsScript(options.channelId)}</script>`;

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    `  <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
    `  <title>${escapeHtmlText(title)}</title>`,
    `  <style>${createBaseStyle(options.theme)}</style>`,
    hostBridge,
    diagnostics,
    sanitized.headHtml,
    `  <style>${createLayoutGuardStyle(options.flushContent ?? false, options.documentFlow ?? false)}</style>`,
    '</head>',
    '<body>',
    '  <main id="pc-frame-content">',
    sanitized.bodyHtml,
    '  </main>',
    `  <script${securityMode === 'safe' ? ` nonce="${nonce}"` : ''}>${createResizeBridgeScript(options.channelId, options.documentFlow ?? false)}</script>`,
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}

export function getFrontendFrameSource() {
  return FRONTEND_FRAME_SOURCE;
}
