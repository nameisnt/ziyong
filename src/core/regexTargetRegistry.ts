export type RegexRuleField = 'content' | 'title';
export type RegexRuleOperation = 'extract' | 'replace';

export interface RegexTargetDefinition {
  appId: string;
  fields: RegexRuleField[];
  id: string;
  label: string;
  operations: RegexRuleOperation[];
}

const targets = new Map<string, RegexTargetDefinition>();
const providers = new Set<() => RegexTargetDefinition[]>();

export function registerRegexTarget(target: RegexTargetDefinition) {
  targets.set(target.id, target);
  return () => targets.delete(target.id);
}

export function registerRegexTargetProvider(provider: () => RegexTargetDefinition[]) {
  providers.add(provider);
  return () => providers.delete(provider);
}

export function getRegexTargets() {
  const result = new Map(targets);
  providers.forEach(provider => {
    provider().forEach(target => {
      if (!result.has(target.id)) result.set(target.id, target);
    });
  });
  return [...result.values()].sort((left, right) => left.label.localeCompare(right.label));
}

registerRegexTarget({
  appId: 'reader',
  fields: ['title', 'content'],
  id: 'reader',
  label: '阅读聊天',
  operations: ['extract', 'replace'],
});

registerRegexTarget({
  appId: 'summary',
  fields: ['content'],
  id: 'summary',
  label: '总结',
  operations: ['extract'],
});

registerRegexTarget({
  appId: 'profiles',
  fields: ['content'],
  id: 'profiles',
  label: '资料表',
  operations: ['replace'],
});
