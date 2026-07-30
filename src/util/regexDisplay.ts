export type RegexDisplayRenderMode = 'html' | 'text';

export interface RegexDisplayRuleLike {
  enabled?: boolean;
  flags: string;
  name: string;
  pattern: string;
  renderMode: RegexDisplayRenderMode;
  replacement: string;
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
