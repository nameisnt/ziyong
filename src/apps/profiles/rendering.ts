import type { RegexDisplayRule } from '@/apps/regex-display/store';
import { applyRegexDisplayRules } from '@/util/regexDisplay';
import type { ProfileEntry, ProfileTable, ProfileTableColumn } from './store';

function getEntryValue(entry: ProfileEntry, columnId: string) {
  if (columnId === 'title') return entry.title;
  if (columnId === 'summary') return entry.summary;
  if (columnId === 'tags') return entry.tags.join('、');
  return entry.fields[columnId] || '';
}

function getFormatColumns(table: ProfileTable) {
  return table.columns.filter(column => column.enabled && column.id !== 'content');
}

export function createDefaultProfileDisplayFormat(table: ProfileTable) {
  const lines = getFormatColumns(table).map(column => `  ${column.label}：{{${column.id}}}`);
  return [`<${table.kind}>`, ...lines, `</${table.kind}>`].join('\n');
}

export function formatProfileRenderSource(entry: ProfileEntry, table: ProfileTable) {
  const template = table.displayFormat.trim() || createDefaultProfileDisplayFormat(table);
  const enabledColumnIds = new Set(getFormatColumns(table).map(column => column.id));
  const disabledColumnIds = new Set(table.columns.filter(column => !column.enabled).map(column => column.id));
  return template
    .split('\n')
    .filter(line => {
      const placeholders = [...line.matchAll(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g)];
      return !placeholders.some(match => disabledColumnIds.has(match[1] || ''));
    })
    .join('\n')
    .replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (_match, columnId: string) => {
      return enabledColumnIds.has(columnId) ? getEntryValue(entry, columnId) : '';
    });
}

export function formatProfileMarkdown(entry: ProfileEntry, table: ProfileTable) {
  const lines = getFormatColumns(table)
    .map(column => ({ column, value: getEntryValue(entry, column.id) }))
    .filter(({ value }) => value.trim())
    .map(({ column, value }) => `${column.label}：${value}`);
  return lines.join('\n\n');
}

export function getProfileListPreview(entry: ProfileEntry, table: ProfileTable | null) {
  if (table?.columns.some(column => column.id === 'summary' && column.enabled) && entry.summary.trim()) {
    return entry.summary.trim();
  }
  const column = table?.columns.find(
    item =>
      item.enabled &&
      !['title', 'summary', 'tags', 'content'].includes(item.id) &&
      getEntryValue(entry, item.id).trim(),
  );
  if (column) return `${column.label}：${getEntryValue(entry, column.id)}`;
  return '';
}

export function renderProfileFrontend(entry: ProfileEntry, table: ProfileTable, rules: RegexDisplayRule[]) {
  const enabledRules = rules.filter(rule => rule.enabled && rule.pattern.trim());
  const source = formatProfileRenderSource(entry, table);
  const result = applyRegexDisplayRules(source, enabledRules);
  if (result.applied.length) return result;
  return {
    ...result,
    content: `<pre>${source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>`,
  };
}

export function getProfileColumnValue(entry: ProfileEntry, column: ProfileTableColumn) {
  return getEntryValue(entry, column.id);
}
