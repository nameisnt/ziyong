import { flattenScriptTrees, pruneScriptTrees, SCRIPT_SCOPES, type ScriptListItem, type ScriptScope } from './model';

function assertScriptApi() {
  if (typeof getScriptTrees !== 'function' || typeof updateScriptTreesWith !== 'function') {
    throw new Error('酒馆助手脚本接口不可用');
  }
}

export function readAllScriptTrees() {
  assertScriptApi();
  return Object.fromEntries(SCRIPT_SCOPES.map(scope => [scope.id, getScriptTrees({ type: scope.id })])) as Record<
    ScriptScope,
    ScriptTree[]
  >;
}

export function listAssistantScripts(): ScriptListItem[] {
  const trees = readAllScriptTrees();
  return SCRIPT_SCOPES.flatMap(scope => flattenScriptTrees(trees[scope.id], scope.id)).sort((left, right) =>
    left.name.localeCompare(right.name, 'zh-Hans-CN'),
  );
}

export function removeAssistantScripts(items: ScriptListItem[]) {
  assertScriptApi();
  for (const scope of SCRIPT_SCOPES) {
    const ids = new Set(items.filter(item => item.scope === scope.id).map(item => item.id));
    if (!ids.size) continue;
    updateScriptTreesWith(trees => pruneScriptTrees(trees, ids), { type: scope.id });
  }
}
