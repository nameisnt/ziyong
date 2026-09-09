import manifest from '../../manifest.json';

export const RUNNING_VERSION = manifest.version;
export const RELEASE_SEEN_FIELD = 'sillytavern_phone_last_seen_release';
export const RELEASE_HISTORY = [
  {
    version: '1.2.1',
    notes: [
      '插件生成按最后选中的楼层读取消息级 MVU；目标快照已清理时，在当前聊天中双向查找最近快照，距离相同优先较早楼层，不再直接使用最新状态。',
      '来源楼层设置显示实际使用的 MVU 层数；使用邻近快照时明确标注，避免误认为目标层的准确历史状态。',
      '日记、小剧场、番外、书信等共享生成入口及提示词捕获统一处理 MVU 变量宏；全部快照缺失且提示词需要 MVU 时明确报错并取消请求。',
      '修复部分未填写隐藏标记的 AI 楼层被生成范围遗漏的问题。',
      '上述调整仅作用于本插件请求，不修改真实聊天变量、世界书或预设，不影响酒馆普通聊天；不使用聊天楼层的生成保持原有行为。',
    ],
  },
  {
    version: '1.2.0',
    notes: [
      '预设管理的条目分组可选择应用到酒馆原生开关，默认关闭；启用单选组内一项会关闭同组其他项，复选组保持原有行为。',
      '修复预设绑定解除或切换时只恢复部分开关的问题，受影响的单选组完整恢复；原生手动切换不会修改已保存的绑定选择。',
      '预设绑定仅在首次初始化、真正切换聊天或手动应用时生效；打开页面、聊天改名和同一聊天重载不再重置手动调整的条目开关。',
      '设置改为两行可见标签页，“更新”排在第一位并默认打开，分类不再隐藏在下拉框内。',
      '更新说明按版本保留，历史版本默认折叠，可在设置的“更新”中按版本展开查看。',
    ],
  },
  {
    version: '1.1.0',
    notes: [
      '状态栏方案默认仅当前聊天可用，可主动开启跨聊天共用；共用方案仍需在各聊天中手动启用。',
      '旧状态栏方案按原绑定聊天转为私有，多聊天绑定分别保留独立副本；没有当前聊天时暂缓处理。',
      '修复手动保存的 MVU 状态栏网页加载失败，支持内嵌 data 模块，补齐 MVU、楼层和事件桥接；切换楼层、聊天或关闭网页时清理桥接监听器，其他生成网页限制不变。',
      '插件内的角色和用户替换称呼可选择用于酒馆普通聊天，默认关闭，仅当前聊天生效，需启用酒馆新版宏引擎。',
      '设置新增版本与更新，可查看本版说明并手动检查更新。',
    ],
  },
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
