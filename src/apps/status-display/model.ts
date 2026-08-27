import type { MvuStatData } from '@/apps/mvu-modifier/api';

export type MvuTemplateLeaf = {
  path: string;
  preview: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMvuValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function renderMvuStatusTemplate(template: string, statData: MvuStatData) {
  return template.replace(/\{\{\s*mvu:([^{}]+?)\s*\}\}/g, (_match, rawPath: string) => {
    return formatMvuValue(_.get(statData, rawPath.trim()));
  });
}

export function flattenMvuTemplateLeaves(statData: MvuStatData) {
  const result: MvuTemplateLeaf[] = [];

  function visit(value: unknown, path: string[]) {
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, child]) => visit(child, [...path, key]));
      return;
    }
    const resolvedPath = path.join('.');
    result.push({ path: resolvedPath, preview: formatMvuValue(value) });
  }

  Object.entries(statData).forEach(([key, value]) => visit(value, [key]));
  return result;
}

export function renderTextStatus(content: string) {
  return `<pre style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(content)}</pre>`;
}
