import { getOptionalGlobalFunction } from '@/util/runtime';
import {
  flattenScriptTrees,
  groupScriptTrees,
  pruneScriptTrees,
  SCRIPT_SCOPES,
  type ScriptListItem,
  type ScriptScope,
  type ScriptScopeCatalog,
} from './model';

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
  return SCRIPT_SCOPES.flatMap(scope => flattenScriptTrees(trees[scope.id], scope.id));
}

export function listAssistantScriptCatalog(): ScriptScopeCatalog[] {
  const trees = readAllScriptTrees();
  return SCRIPT_SCOPES.map(scope => ({
    groups: groupScriptTrees(trees[scope.id], scope.id),
    label: scope.label,
    scope: scope.id,
  }));
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

function createScriptTreeId(type: ScriptTree['type']) {
  return `phone_import_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isScriptTree(value: unknown): value is ScriptTree {
  if (!value || typeof value !== 'object') return false;
  const node = value as Partial<ScriptTree>;
  return node.type === 'script' || (node.type === 'folder' && Array.isArray(node.scripts));
}

function prepareImportedTree(value: ScriptTree): ScriptTree {
  const tree = structuredClone(value);
  tree.enabled = false;
  tree.id = createScriptTreeId(tree.type);
  if (tree.type === 'folder') {
    tree.scripts = tree.scripts.map(script => ({ ...script, enabled: false, id: createScriptTreeId('script') }));
  }
  return tree;
}

export function importAssistantScriptFile(value: unknown, scope: ScriptScope) {
  const bundle = value as Partial<AssistantScriptBundle>;
  if (bundle?.format === 'sillytavern-phone-script-bundle-v1') {
    importAssistantScriptBundle(value);
    return { kind: 'bundle' as const, scope: null };
  }
  if (!isScriptTree(value)) throw new Error('不是可识别的助手脚本或脚本文件夹');
  const tree = prepareImportedTree(value);
  const { updateTrees } = requireScriptApi();
  updateTrees(trees => [...trees, tree], { type: scope });
  return { kind: tree.type, scope } as const;
}

export function createAssistantScriptFolder(scope: ScriptScope, folderName: string) {
  const name = folderName.trim();
  if (!name) throw new Error('分组名称不能为空');
  const { updateTrees } = requireScriptApi();
  updateTrees(
    trees => [
      ...trees,
      {
        color: '',
        enabled: true,
        icon: '',
        id: createScriptTreeId('folder'),
        name,
        scripts: [],
        type: 'folder',
      },
    ],
    { type: scope },
  );
}

export function renameAssistantScriptFolder(scope: ScriptScope, folderId: string, folderName: string) {
  const name = folderName.trim();
  if (!name) throw new Error('分组名称不能为空');
  const { updateTrees } = requireScriptApi();
  updateTrees(
    trees => trees.map(node => (node.type === 'folder' && node.id === folderId ? { ...node, name } : node)),
    { type: scope },
  );
}

export function getAssistantScriptFolder(scope: ScriptScope, folderId: string) {
  const folder = readAllScriptTrees()[scope].find(
    (node): node is ScriptFolder => node.type === 'folder' && node.id === folderId,
  );
  if (!folder) throw new Error('脚本分组不存在');
  return structuredClone(folder);
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
