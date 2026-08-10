export type RegexDisplayRenderMode = 'html' | 'text';

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

export function applyRegexDisplayRules(input: string, rules: RegexDisplayRuleLike[]): RegexDisplayApplyResult {
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
