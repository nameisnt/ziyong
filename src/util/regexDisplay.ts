export type RegexDisplayRenderMode = 'html' | 'text';

export function contentRegexUsageKey(appId: string, identity: (string | number)[]) {
  return identity.length ? `content:${JSON.stringify([appId, ...identity])}` : '';
}

function parseContentRegexUsageKey(key: string): (string | number)[] | null {
  if (!key.startsWith('content:')) return null;
  try {
    const value: unknown = JSON.parse(key.slice('content:'.length));
    return Array.isArray(value) && value.every(item => typeof item === 'string' || typeof item === 'number')
      ? value
      : null;
  } catch {
    return null;
  }
}

function moveUsage<T>(usages: Record<string, T>, source: string, target: string) {
  if (!Object.hasOwn(usages, target)) usages[target] = usages[source];
  delete usages[source];
}

export function deleteContentRegexUsages<T>(
  usages: Record<string, T>,
  appId: string,
  identity: readonly (string | number)[],
) {
  for (const key of Object.keys(usages)) {
    const parts = parseContentRegexUsageKey(key);
    if (!parts || parts[0] !== appId || parts.length < identity.length + 1) continue;
    if (identity.every((value, index) => parts[index + 1] === value)) delete usages[key];
  }
}

export function migrateOriginalRegexUsages<T>(
  usages: Record<string, T>,
  appId: string,
  entryId: string | number,
  versions: readonly { id: string; origin: string }[],
) {
  const originals = versions.filter(version => version.origin === 'original');
  if (originals.length !== 1) return;
  // Only the original inherits unversioned selections, including its forum replies.
  for (const key of Object.keys(usages)) {
    const parts = parseContentRegexUsageKey(key);
    if (!parts || parts[1] !== entryId || parts[2] !== '') continue;
    if (
      !(parts[0] === appId && parts.length === 3) &&
      !(appId === 'forum' && parts[0] === 'forum-reply' && parts.length === 4)
    )
      continue;
    parts[2] = originals[0].id;
    moveUsage(usages, key, contentRegexUsageKey(String(parts[0]), parts.slice(1)));
  }
}

export function migrateReaderRegexUsages<T>(usages: Record<string, T>, sources: readonly string[], target: string) {
  let replacements = 0;
  for (const key of Object.keys(usages)) {
    const parts = parseContentRegexUsageKey(key);
    if (
      !parts ||
      parts.length !== 4 ||
      parts[0] !== 'reader' ||
      typeof parts[1] !== 'string' ||
      parts[1] === target ||
      !sources.includes(parts[1])
    )
      continue;
    parts[1] = target;
    moveUsage(usages, key, contentRegexUsageKey('reader', parts.slice(1)));
    replacements++;
  }
  return replacements;
}

export function parseTavernRegexImport(payload: unknown) {
  const items = Array.isArray(payload) ? payload : [payload];
  return items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`第 ${index + 1} 条不是正则对象`);
    const raw = item as Record<string, unknown>;
    // Tavern JSON exports and TavernHelper expose different field names.
    const name = raw.scriptName ?? raw.script_name;
    const pattern = raw.findRegex ?? raw.find_regex;
    const replacement = raw.replaceString ?? raw.replace_string;
    if (typeof name !== 'string' || typeof pattern !== 'string' || !pattern.trim() || typeof replacement !== 'string') {
      throw new Error(`第 ${index + 1} 条缺少名称、匹配式或替换式`);
    }
    const literal = pattern.match(/^\/([\s\S]*)\/([dgimsuvy]*)$/);
    const source = literal ? literal[1] : pattern;
    const flags = literal ? literal[2] : '';
    let expression: RegExp;
    try {
      expression = new RegExp(source, flags);
    } catch (error) {
      throw new Error(`${name}：${error instanceof Error ? error.message : String(error)}`);
    }
    // Keep delimiters so execution cannot trim meaningful boundary whitespace.
    return {
      name,
      pattern: literal ? pattern : expression.toString(),
      flags,
      replacement,
      operation: 'replace' as const,
    };
  });
}

export function moveRegexRulesToGroup<T extends { id: string; groupId: string }>(
  rules: T[],
  ids: string[],
  groupId: string,
) {
  const selected = new Set(ids);
  return [
    ...rules.filter(rule => !selected.has(rule.id)),
    ...rules.filter(rule => selected.has(rule.id)).map(rule => ({ ...rule, groupId })),
  ];
}

export interface RegexDisplayRuleLike {
  enabled?: boolean;
  flags: string;
  id?: string;
  name: string;
  operation?: 'extract' | 'replace';
  order?: number;
  pattern: string;
  renderMode: RegexDisplayRenderMode;
  replacement: string;
}

export function getRegexRulesByOperation(rules: RegexDisplayRuleLike[], operation: 'extract' | 'replace') {
  return rules
    .filter(rule => rule.enabled !== false && rule.pattern.trim() && (rule.operation ?? 'replace') === operation)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

export function getRegexRulesByIds(rules: RegexDisplayRuleLike[], ruleIds: string[], operation: 'extract' | 'replace') {
  const selected = new Set(ruleIds);
  return getRegexRulesByOperation(rules, operation).filter(rule => Boolean(rule.id && selected.has(rule.id)));
}

export function extractWithRegexRules(input: string, rules: RegexDisplayRuleLike[]): RegexDisplayApplyResult {
  const errors: string[] = [];
  for (const rule of rules) {
    try {
      const regex = createDisplayRegex(rule.pattern, rule.flags);
      const matchRegex = regex.global ? new RegExp(regex.source, regex.flags.replace(/g/g, '')) : regex;
      const firstMatch = input.match(matchRegex);
      if (!firstMatch) continue;
      const replacement = String(rule.replacement || '');
      const usesCapture = /\$(?:\d+|<[^>]+>)/.test(replacement);
      const hasCapture = firstMatch.length > 1 && firstMatch.slice(1).some(value => value !== undefined);
      let content = '';
      if (usesCapture && hasCapture) {
        const matches = regex.global ? Array.from(input.matchAll(regex)) : [firstMatch];
        content = matches
          .map(match => match[0].replace(matchRegex, replacement).trim())
          .filter(Boolean)
          .join('\n\n');
      }
      if (!content) {
        content = input.replace(regex, replacement).trim();
      }
      return {
        applied: [rule.name.trim() || rule.pattern],
        content: content || input,
        errors,
        renderMode: rule.renderMode,
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : '正则无效';
      errors.push(`${rule.name.trim() || rule.pattern}：${message}`);
    }
  }
  return { applied: [], content: input, errors, renderMode: 'text' };
}

export interface RegexDisplayApplyResult {
  applied: string[];
  content: string;
  errors: string[];
  renderMode: RegexDisplayRenderMode;
}

const allowedFlags = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);

export function normalizeRegexFlags(flags: string) {
  const normalized: string[] = [];
  for (const flag of flags.trim()) {
    if (!allowedFlags.has(flag) || normalized.includes(flag)) continue;
    normalized.push(flag);
  }
  return normalized.join('');
}

export function createDisplayRegex(pattern: string, flags: string) {
  const source = pattern.trim();
  const literal = source.match(/^\/([\s\S]*)\/([dgimsuvy]*)$/);
  if (!literal) return new RegExp(source, normalizeRegexFlags(flags));
  return new RegExp(literal[1], normalizeRegexFlags(`${literal[2] || ''}${flags}`));
}

export function applyRegexDisplayRules(input: string, rules: RegexDisplayRuleLike[] = []): RegexDisplayApplyResult {
  let content = input;
  let renderMode: RegexDisplayRenderMode = 'text';
  const applied: string[] = [];
  const errors: string[] = [];

  rules.forEach(rule => {
    if (rule.enabled === false) return;
    const pattern = rule.pattern.trim();
    if (!pattern) return;

    try {
      const regex = createDisplayRegex(pattern, rule.flags);
      if (!regex.test(content)) return;
      regex.lastIndex = 0;
      content = content.replace(regex, rule.replacement);
      applied.push(rule.name.trim() || pattern);
      renderMode = rule.renderMode;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : '正则无效';
      errors.push(`${rule.name.trim() || pattern}：${message}`);
    }
  });

  return {
    applied,
    content,
    errors,
    renderMode,
  };
}
