export type ScriptScope = 'global' | 'preset' | 'character';

export type ScriptLeaf = Extract<ScriptTree, { type: 'script' }>;

export interface ScriptListItem {
  folder: string;
  id: string;
  key: string;
  name: string;
  scope: ScriptScope;
  script: ScriptLeaf;
}

export const SCRIPT_SCOPES: Array<{ id: ScriptScope; label: string }> = [
  { id: 'global', label: '全局' },
  { id: 'preset', label: '预设' },
  { id: 'character', label: '角色卡' },
];

export function scriptScopeLabel(scope: ScriptScope) {
  return SCRIPT_SCOPES.find(item => item.id === scope)?.label ?? scope;
}

export function flattenScriptTrees(trees: ScriptTree[], scope: ScriptScope): ScriptListItem[] {
  return trees.flatMap(node => {
    if (node.type === 'script') {
      return [{ folder: '', id: node.id, key: `${scope}:${node.id}`, name: node.name, scope, script: node }];
    }
    return node.scripts.map(script => ({
      folder: node.name,
      id: script.id,
      key: `${scope}:${script.id}`,
      name: script.name,
      scope,
      script,
    }));
  });
}

export function pruneScriptTrees(trees: ScriptTree[], ids: Set<string>): ScriptTree[] {
  const result: ScriptTree[] = [];
  for (const node of trees) {
    if (node.type === 'script') {
      if (!ids.has(node.id)) result.push(node);
      continue;
    }
    result.push({ ...node, scripts: node.scripts.filter(script => !ids.has(script.id)) });
  }
  return result;
}
