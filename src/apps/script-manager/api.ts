import { getOptionalGlobalFunction } from '@/util/runtime';
import {
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

type ScriptScopeChanges = Partial<Record<ScriptScope, ScriptTree[]>>;

function requireScriptApi() {
  const getTrees = getOptionalGlobalFunction<GetScriptTrees>('getScriptTrees');
  const updateTrees = getOptionalGlobalFunction<UpdateScriptTrees>('updateScriptTreesWith');
  if (!getTrees || !updateTrees) {
    throw new Error('酒馆助手脚本接口不可用');
  }
  return { getTrees, updateTrees };
}

function isScriptTree(value: unknown): value is ScriptTree {
  if (!value || typeof value !== 'object') return false;
  const node = value as Partial<ScriptTree>;
  if (node.type === 'script') return true;
  return (
    node.type === 'folder' && Array.isArray(node.scripts) && node.scripts.every(script => script?.type === 'script')
  );
}

function runScriptScopeTransaction(buildChanges: (snapshot: Record<ScriptScope, ScriptTree[]>) => ScriptScopeChanges) {
  const { getTrees } = requireScriptApi();
  const replaceTrees = getOptionalGlobalFunction<ReplaceScriptTrees>('replaceScriptTrees');
  if (!replaceTrees) throw new Error('酒馆助手脚本替换接口不可用');

  const snapshot = Object.fromEntries(
    SCRIPT_SCOPES.map(scope => [scope.id, structuredClone(getTrees({ type: scope.id }))]),
  ) as Record<ScriptScope, ScriptTree[]>;
  const changes = buildChanges(structuredClone(snapshot));
  for (const scope of SCRIPT_SCOPES) {
    const trees = changes[scope.id];
    if (trees && !trees.every(isScriptTree)) throw new Error(`${scope.label}脚本树格式无效`);
  }

  const applied: ScriptScope[] = [];
  try {
    for (const scope of SCRIPT_SCOPES) {
      const trees = changes[scope.id];
      if (!trees) continue;
      replaceTrees(trees, { type: scope.id });
      applied.push(scope.id);
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const scope of applied.reverse()) {
      try {
        replaceTrees(snapshot[scope], { type: scope });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length)
      throw new AggregateError([error, ...rollbackErrors], '助手脚本写入失败，且部分作用域回滚失败');
    throw error;
  }
}

export function readAllScriptTrees() {
  const { getTrees } = requireScriptApi();
  return Object.fromEntries(SCRIPT_SCOPES.map(scope => [scope.id, getTrees({ type: scope.id })])) as Record<
    ScriptScope,
    ScriptTree[]
  >;
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
  runScriptScopeTransaction(snapshot =>
    Object.fromEntries(
      SCRIPT_SCOPES.flatMap(scope => {
        const ids = new Set(items.filter(item => item.scope === scope.id).map(item => item.id));
        return ids.size ? [[scope.id, pruneScriptTrees(snapshot[scope.id], ids)]] : [];
      }),
    ),
  );
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
  const changes: ScriptScopeChanges = {};
  for (const scope of SCRIPT_SCOPES) {
    const trees = bundle.script_trees[scope.id];
    if (!Array.isArray(trees)) throw new Error(`缺少${scope.label}脚本树`);
    if (!trees.every(isScriptTree)) throw new Error(`${scope.label}脚本树格式无效`);
    changes[scope.id] = structuredClone(trees);
  }
  runScriptScopeTransaction(() => changes);
}

function createScriptTreeId(type: ScriptTree['type']) {
  return `phone_import_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  updateTrees(trees => trees.map(node => (node.type === 'folder' && node.id === folderId ? { ...node, name } : node)), {
    type: scope,
  });
}

export function setAssistantScriptFolderEnabled(scope: ScriptScope, folderId: string, enabled: boolean) {
  const { updateTrees } = requireScriptApi();
  updateTrees(
    trees => trees.map(node => (node.type === 'folder' && node.id === folderId ? { ...node, enabled } : node)),
    { type: scope },
  );
}

export function setAssistantScriptEnabled(scope: ScriptScope, scriptId: string, enabled: boolean) {
  const { updateTrees } = requireScriptApi();
  updateTrees(
    trees =>
      trees.map(node => {
        if (node.type === 'script') return node.id === scriptId ? { ...node, enabled } : node;
        return {
          ...node,
          scripts: node.scripts.map(script => (script.id === scriptId ? { ...script, enabled } : script)),
        };
      }),
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
  runScriptScopeTransaction(snapshot =>
    Object.fromEntries(
      SCRIPT_SCOPES.flatMap(scope => {
        const selected = items.filter(item => item.scope === scope.id);
        if (!selected.length) return [];
        const ids = new Set(selected.map(item => item.id));
        const next = pruneScriptTrees(snapshot[scope.id], ids);
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
        return [[scope.id, next]];
      }),
    ),
  );
}
