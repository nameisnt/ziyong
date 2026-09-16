import { getOptionalGlobalFunction } from '@/util/runtime';

export const NATIVE_USER_PREFIX = '{{pc_native_user}}: ';
export type NativeUserPrefixLink = { scriptId: string; originalPrefix: string };

function scriptsIn(trees: ScriptTree[]) {
  return trees.flatMap(tree => (tree.type === 'folder' ? tree.scripts : [tree]));
}

export function setNativeUserPrefixLink(previous: NativeUserPrefixLink | null): NativeUserPrefixLink | null {
  const updateTrees =
    getOptionalGlobalFunction<
      (update: (trees: ScriptTree[]) => ScriptTree[], options: { type: 'global' }) => ScriptTree[]
    >('updateScriptTreesWith');
  if (!updateTrees) throw new Error('酒馆助手脚本接口不可用');
  let next: NativeUserPrefixLink | null = null;
  updateTrees(
    trees => {
      const scripts = scriptsIn(trees);
      const candidates = previous
        ? scripts.filter(script => script.id === previous.scriptId)
        : trees.flatMap(tree => {
            const items = tree.type === 'folder' ? (tree.enabled ? tree.scripts : []) : [tree];
            return items.filter(script => script.enabled && script.content.includes('/压缩相邻消息/index.js'));
          });
      if (candidates.length !== 1)
        throw new Error(previous ? '原压缩脚本不存在，无法恢复前缀' : '需要且只能启用一个全局压缩相邻消息脚本');
      const script = candidates[0];
      const history = script.data?.chat_history;
      if (!history || typeof history.user_prefix !== 'string') throw new Error('压缩脚本缺少用户前缀配置');
      if (previous && history.user_prefix !== NATIVE_USER_PREFIX)
        throw new Error('压缩脚本前缀已被修改，未覆盖；请先确认脚本配置');
      next = previous ? null : { scriptId: script.id, originalPrefix: history.user_prefix };
      history.user_prefix = previous ? previous.originalPrefix : NATIVE_USER_PREFIX;
      return trees;
    },
    { type: 'global' },
  );
  return next;
}
