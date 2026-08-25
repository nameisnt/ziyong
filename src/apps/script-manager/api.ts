import { getOptionalGlobalFunction } from '@/util/runtime';
import { flattenScriptTrees, pruneScriptTrees, SCRIPT_SCOPES, type ScriptListItem, type ScriptScope } from './model';

type GetScriptTrees = (options: { type: ScriptScope }) => ScriptTree[];
type UpdateScriptTrees = (
  updater: (trees: ScriptTree[]) => TypeFest.PartialDeep<ScriptTree>[],
  options: { type: ScriptScope },
) => ScriptTree[];

function requireScriptApi() {
  const getTrees = getOptionalGlobalFunction<GetScriptTrees>('getScriptTrees');
  const updateTrees = getOptionalGlobalFunction<UpdateScriptTrees>('updateScriptTreesWith');
  if (!getTrees || !updateTrees) {
    throw new Error('酒馆助手脚本接口不可用');
  }
  return { getTrees, updateTrees };
}

export function readAllScriptTrees() {
  const { getTrees } = requireScriptApi();
  return Object.fromEntries(SCRIPT_SCOPES.map(scope => [scope.id, getTrees({ type: scope.id })])) as Record<
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
  const { updateTrees } = requireScriptApi();
  for (const scope of SCRIPT_SCOPES) {
    const ids = new Set(items.filter(item => item.scope === scope.id).map(item => item.id));
    if (!ids.size) continue;
    updateTrees(trees => pruneScriptTrees(trees, ids), { type: scope.id });
  }
}
