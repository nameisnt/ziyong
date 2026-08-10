export type RegexDisplayRenderMode = 'html' | 'text';

export interface RegexDisplayRuleLike {
  enabled?: boolean;
  field?: 'content' | 'title';
  flags: string;
  name: string;
  operation?: 'extract' | 'replace';
  order?: number;
  pattern: string;
  renderMode: RegexDisplayRenderMode;
  replacement: string;
  targetId?: string;
  targetIds?: string[];
}

function getRuleTargetIds(rule: RegexDisplayRuleLike) {
  return rule.targetIds?.length ? rule.targetIds : rule.targetId ? [rule.targetId] : [];
}

export function getRegexRulesForTarget(
  rules: RegexDisplayRuleLike[],
  targetId: string,
  field: 'content' | 'title',
  operation: 'extract' | 'replace',
) {
  return rules
    .filter(
      rule =>
        rule.enabled !== false &&
        rule.pattern.trim() &&
        getRuleTargetIds(rule).includes(targetId) &&
        (rule.field ?? 'content') === field &&
        (rule.operation ?? 'replace') === operation,
    )
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

export function extractWithRegexRules(input: string, rules: RegexDisplayRuleLike[]): RegexDisplayApplyResult {
  const errors: string[] = [];
  for (const rule of rules) {
    try {
      const regex = createDisplayRegex(rule.pattern, rule.flags);
      if (!regex.test(input)) continue;
      regex.lastIndex = 0;
      return {
        applied: [rule.name.trim() || rule.pattern],
        content: input.replace(regex, rule.replacement),
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
