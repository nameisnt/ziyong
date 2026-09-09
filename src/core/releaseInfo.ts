import manifest from '../../manifest.json';

export const RUNNING_VERSION = manifest.version;
export const RELEASE_SEEN_FIELD = 'sillytavern_phone_last_seen_release';
export const RELEASE_NOTES = [
  '状态栏方案默认仅当前聊天可用，可主动开启跨聊天共用；共用方案仍需在各聊天中手动启用。',
  '旧状态栏方案按原绑定聊天转为私有，多聊天绑定分别保留独立副本；没有当前聊天时暂缓处理。',
  '修复手动保存的 MVU 状态栏网页加载失败，支持内嵌 data 模块，补齐 MVU、楼层和事件桥接；切换楼层、聊天或关闭网页时清理桥接监听器，其他生成网页限制不变。',
  '插件内的角色和用户替换称呼可选择用于酒馆普通聊天，默认关闭，仅当前聊天生效，需启用酒馆新版宏引擎。',
  '设置新增版本与更新，可查看本版说明并手动检查更新。',
] as const;

export function acknowledgeRelease(settings: Record<string, unknown>, version = RUNNING_VERSION): boolean {
  const previous = settings[RELEASE_SEEN_FIELD];
  if (typeof previous === 'string') {
    const before = previous.split('.').map(Number);
    const after = version.split('.').map(Number);
    const firstDifference = after.findIndex((part, index) => part !== before[index]);
    if (firstDifference < 0 || after[firstDifference] < before[firstDifference]) return false;
  }
  settings[RELEASE_SEEN_FIELD] = version;
  return true;
}
