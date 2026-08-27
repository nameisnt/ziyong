import { getOptionalGlobalFunction } from '@/util/runtime';
import { flattenScriptTrees, pruneScriptTrees, SCRIPT_SCOPES, type ScriptListItem, type ScriptScope } from './model';

type GetScriptTrees = (options: { type: ScriptScope }) => ScriptTree[];
type UpdateScriptTrees = (
  updater: (trees: ScriptTree[]) => TypeFest.PartialDeep<ScriptTree>[],
  options: { type: ScriptScope },
) => ScriptTree[];
type ReplaceScriptTrees = (trees: TypeFest.PartialDeep<ScriptTree>[], options: { type: ScriptScope }) => void;

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

export type AssistantScriptBundle = {
  format: 'sillytavern-phone-script-bundle-v1';
  script_trees: Record<ScriptScope, ScriptTree[]>;
};

export function createAssistantScriptBundle(): AssistantScriptBundle {
  return { format: 'sillytavern-phone-script-bundle-v1', script_trees: readAllScriptTrees() };
}

export function importAssistantScriptBundle(value: unknown) {
  const bundle = value as Partial<AssistantScriptBundle>;
  if (bundle?.format !== 'sillytavern-phone-script-bundle-v1' || !bundle.script_trees) {
    throw new Error('不是本插件导出的助手脚本文件');
  }
  const replaceTrees = getOptionalGlobalFunction<ReplaceScriptTrees>('replaceScriptTrees');
  if (!replaceTrees) throw new Error('酒馆助手脚本替换接口不可用');
  for (const scope of SCRIPT_SCOPES) {
    const trees = bundle.script_trees[scope.id];
    if (!Array.isArray(trees)) throw new Error(`缺少${scope.label}脚本树`);
    replaceTrees(trees, { type: scope.id });
  }
}

export function moveAssistantScriptsToFolder(items: ScriptListItem[], folderName: string) {
  const name = folderName.trim();
  if (!name) throw new Error('分组名称不能为空');
  const { updateTrees } = requireScriptApi();
  for (const scope of SCRIPT_SCOPES) {
    const selected = items.filter(item => item.scope === scope.id);
    if (!selected.length) continue;
    const ids = new Set(selected.map(item => item.id));
    updateTrees(
      trees => {
        const next = pruneScriptTrees(trees, ids);
        const target = next.find((node): node is ScriptFolder => node.type === 'folder' && node.name === name);
        if (target) target.scripts.push(...selected.map(item => item.script));
        else {
          next.push({
            color: '',
            enabled: true,
            icon: '',
            id: `phone_script_folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name,
            scripts: selected.map(item => item.script),
            type: 'folder',
          });
        }
        return next;
      },
      { type: scope.id },
    );
  }
}
