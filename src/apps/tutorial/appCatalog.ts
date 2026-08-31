import type { PhoneAppDefinition } from '@/core/appRegistry';

export type TutorialAppGroupId = 'automation' | 'creative' | 'media' | 'planning' | 'tavern';

export type TutorialAppGuide = {
  appId: string;
  firstAction: string;
  groupId: TutorialAppGroupId;
};

export type TutorialAppDirectoryItem = TutorialAppGuide & {
  app: PhoneAppDefinition;
};

export type TutorialAppDirectoryGroup = {
  id: TutorialAppGroupId;
  items: TutorialAppDirectoryItem[];
  label: string;
};

export const tutorialAppGroups: Array<{ id: TutorialAppGroupId; label: string }> = [
  { id: 'creative', label: '创作成品' },
  { id: 'planning', label: '资料、规划与统计' },
  { id: 'tavern', label: '提示词与酒馆联动' },
  { id: 'automation', label: '阅读、写回与自动化' },
  { id: 'media', label: '外观与系统' },
];

export const tutorialAppGuides: TutorialAppGuide[] = [
  { appId: 'summary', groupId: 'creative', firstAction: '点击生成书脊，再选择提取、单条或批量并确认来源。' },
  { appId: 'diary', groupId: 'creative', firstAction: '点击生成书脊选择单篇或批量，已有日记还可生成角色反应。' },
  { appId: 'extras', groupId: 'creative', firstAction: '新开一本或进入目标章节，再选择续写、重写或章节总结。' },
  { appId: 'forum', groupId: 'creative', firstAction: '先确定板块名和板块类型提示词，再生成帖子或继续回帖。' },
  {
    appId: 'theater',
    groupId: 'creative',
    firstAction: '选择类型并生成内容；保存后可重写版本或把当前版本拆成独立小剧场。',
  },
  { appId: 'letters', groupId: 'creative', firstAction: '选择发信人与收信人，已有往来可以直接继续回信。' },

  { appId: 'digest', groupId: 'planning', firstAction: '手动新建摘抄，或在阅读聊天中选中文字后加入。' },
  { appId: 'profiles', groupId: 'planning', firstAction: '选择资料类型，再手动编辑或让 AI 从聊天中提取。' },
  { appId: 'relationship', groupId: 'planning', firstAction: '创建关系时分别确认起点、终点和单向态度。' },
  { appId: 'timekeeper', groupId: 'planning', firstAction: '先统一当前世界时间，再记录生日、年龄并换算。' },
  { appId: 'stats', groupId: 'planning', firstAction: '查看已经正式保存的聊天和各 App 内容统计。' },
  { appId: 'archive', groupId: 'planning', firstAction: '按角色卡和聊天进入历史手机数据的只读视图。' },

  { appId: 'prompts', groupId: 'tavern', firstAction: '选择主提示词、类型提示词、解析规则或快捷短语进行编辑。' },
  { appId: 'preset-manager', groupId: 'tavern', firstAction: '选择酒馆预设，或导入只供插件生成使用的私有预设。' },
  { appId: 'preset-link', groupId: 'tavern', firstAction: '为当前或历史聊天选择要自动使用的酒馆预设。' },
  {
    appId: 'macro-builder',
    groupId: 'tavern',
    firstAction: '选择骰点、随机抽取或身份分配并填写参数，然后复制生成的宏。',
  },
  { appId: 'script-manager', groupId: 'tavern', firstAction: '筛选当前范围的助手脚本，再导出备份或进入批量管理。' },
  { appId: 'entry-library', groupId: 'tavern', firstAction: '手动新建条目，或选择预设、世界书来源和分组批量收藏。' },
  { appId: 'worldbook-link', groupId: 'tavern', firstAction: '选择世界书并保存当前聊天需要启用的条目状态。' },
  {
    appId: 'card-writer',
    groupId: 'tavern',
    firstAction: '选择目标世界书和一键写卡、只生成人设或单独模块，再填写需要的角色素材。',
  },
  { appId: 'world-slots', groupId: 'tavern', firstAction: '新建当前聊天专用槽位，再同步到固定世界书。' },
  { appId: 'status-display', groupId: 'tavern', firstAction: '打开后直接查看当前聊天绑定的状态栏。' },
  {
    appId: 'status-display-settings',
    groupId: 'tavern',
    firstAction: '选择当前聊天使用的方案，或新建正则和 MVU 状态方案。',
  },
  { appId: 'mvu-modifier', groupId: 'tavern', firstAction: '展开变量树，编辑字段并点击该字段的保存。' },
  {
    appId: 'regex-display',
    groupId: 'tavern',
    firstAction: '先维护全局规则库，再到使用设置为各 App 选择提取和正文显示规则。',
  },
  {
    appId: 'regex-wizard',
    groupId: 'tavern',
    firstAction: '选择双边界或固定字段，粘贴示例测试，再复制表达式或保存到正则替换。',
  },
  {
    appId: 'app-builder',
    groupId: 'tavern',
    firstAction: '选择模板创建自制 App，再配置创建方式、命名、显示和内容转换。',
  },
  {
    appId: 'content-converter',
    groupId: 'tavern',
    firstAction: '选择阅读聊天或其他 App 内容，再选择目标 App，逐条转换或合并保存。',
  },
  { appId: 'bagu', groupId: 'tavern', firstAction: '配置词汇和句式规则，再到正文扫描并选择修复。' },

  { appId: 'reader', groupId: 'automation', firstAction: '选择聊天进入连续阅读，轻点正文中部打开导航工具。' },
  {
    appId: 'recovery',
    groupId: 'automation',
    firstAction: '按角色查看备份；可阅读并导入为新聊天，也可清理小备份或删除完全相同的旧副本。',
  },
  { appId: 'chat-insert', groupId: 'automation', firstAction: '选择其他 App 内容作为引用，再写入酒馆当前聊天。' },
  { appId: 'favorites', groupId: 'automation', firstAction: '按类型筛选当前聊天中已经标记收藏的成品。' },
  { appId: 'workbench', groupId: 'automation', firstAction: '新建工作流并配置步骤，每一步可单独选择 API 与预设。' },

  { appId: 'theme', groupId: 'media', firstAction: '调整颜色、圆角、图标和阅读外观，并检查明暗模式。' },
  {
    appId: 'settings',
    groupId: 'media',
    firstAction: '配置首页、生成连接、聊天称呼替换、阅读器、RPM、备份和数据清理。',
  },
  {
    appId: 'file-repository',
    groupId: 'media',
    firstAction: '开启自动快照并设置保留数量；进入具体版本后可保护、导出或确认恢复。',
  },
  {
    appId: 'extension-transfer',
    groupId: 'media',
    firstAction: '导出第三方扩展清单，或选择清单预览安装范围后批量安装。',
  },
  { appId: 'game-2048', groupId: 'media', firstAction: '滑动或使用方向键合并相同数字。' },
  { appId: 'game-snake', groupId: 'media', firstAction: '选择速度后开始，滑动控制贪吃蛇方向。' },
  { appId: 'game-minesweeper', groupId: 'media', firstAction: '选择翻开或插旗模式，再点击棋盘格。' },
  { appId: 'game-sudoku', groupId: 'media', firstAction: '选择空格，再使用数字键盘填数。' },
  { appId: 'game-sliding-puzzle', groupId: 'media', firstAction: '移动相邻数字块，把数字恢复为顺序。' },
  { appId: 'game-guess-number', groupId: 'media', firstAction: '输入四位数字，根据提示继续推理。' },
  { appId: 'game-gomoku', groupId: 'media', firstAction: '点击棋盘落子，与电脑进行五子棋对局。' },
  { appId: 'game-reversi', groupId: 'media', firstAction: '选择合法位置落子并翻转对方棋子。' },
  { appId: 'game-solitaire', groupId: 'media', firstAction: '点击牌库发牌，按接龙规则整理牌组。' },
  { appId: 'tutorial', groupId: 'media', firstAction: '按分类浏览，或搜索按钮文字、错误关键词和 App 名。' },
];

export function buildTutorialAppDirectory(apps: PhoneAppDefinition[]): TutorialAppDirectoryGroup[] {
  const appById = new Map(apps.map(app => [app.id, app]));
  return tutorialAppGroups.map(group => ({
    ...group,
    items: tutorialAppGuides.flatMap(guide => {
      if (guide.groupId !== group.id) return [];
      const app = appById.get(guide.appId);
      return app ? [{ ...guide, app }] : [];
    }),
  }));
}

export function getTutorialAppDirectorySearchText(apps: PhoneAppDefinition[]) {
  return buildTutorialAppDirectory(apps)
    .flatMap(group => [
      group.label,
      ...group.items.flatMap(item => [item.app.name, item.app.description, item.firstAction]),
    ])
    .join('\n');
}

export function validateTutorialAppCatalog(apps: PhoneAppDefinition[]) {
  const errors: string[] = [];
  const registeredIds = new Set(apps.map(app => app.id));
  const guideCounts = new Map<string, number>();

  tutorialAppGuides.forEach(guide => {
    guideCounts.set(guide.appId, (guideCounts.get(guide.appId) ?? 0) + 1);
    if (!registeredIds.has(guide.appId)) errors.push(`教程目录引用了不存在的 App：${guide.appId}`);
    if (!tutorialAppGroups.some(group => group.id === guide.groupId)) {
      errors.push(`教程 App ${guide.appId} 使用了不存在的分组：${guide.groupId}`);
    }
  });

  apps
    .filter(app => app.tutorialGuideRequired !== false)
    .forEach(app => {
      const count = guideCounts.get(app.id) ?? 0;
      if (count === 0) errors.push(`App 缺少教程目录记录：${app.id}`);
      if (count > 1) errors.push(`App 存在 ${count} 条教程目录记录：${app.id}`);
    });

  return errors;
}
