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
  { id: 'media', label: '媒体、外观与系统' },
];

export const tutorialAppGuides: TutorialAppGuide[] = [
  { appId: 'summary', groupId: 'creative', firstAction: '选择提取、单条或批量，确认来源楼层后生成并保存。' },
  { appId: 'diary', groupId: 'creative', firstAction: '选择或新建日记本，再决定写日记还是生成角色反应。' },
  { appId: 'extras', groupId: 'creative', firstAction: '新开一本或进入目标章节，再选择续写、重写或章节总结。' },
  { appId: 'forum', groupId: 'creative', firstAction: '先确定板块名和板块类型提示词，再生成帖子或继续回帖。' },
  { appId: 'theater', groupId: 'creative', firstAction: '选择类型和参与角色，保存后可续写、重写版本或复制成新番外。' },
  { appId: 'letters', groupId: 'creative', firstAction: '选择发信人与收信人，已有往来可以直接继续回信。' },

  { appId: 'digest', groupId: 'planning', firstAction: '手动新建摘抄，或在阅读聊天中选中文字后加入。' },
  { appId: 'profiles', groupId: 'planning', firstAction: '选择资料类型，再手动编辑或让 AI 从聊天中提取。' },
  { appId: 'relationship', groupId: 'planning', firstAction: '创建关系时分别确认起点、终点和单向态度。' },
  { appId: 'storylines', groupId: 'planning', firstAction: '先准备可用总结，再提炼剧情线、节点和伏笔。' },
  { appId: 'scene-planner', groupId: 'planning', firstAction: '填写下一段剧情目标和限制，再与 AI 沟通细化。' },
  { appId: 'timekeeper', groupId: 'planning', firstAction: '先统一当前世界时间，再记录生日、年龄并换算。' },
  { appId: 'stats', groupId: 'planning', firstAction: '查看已经正式保存的聊天和各 App 内容统计。' },
  { appId: 'archive', groupId: 'planning', firstAction: '按角色卡和聊天进入历史手机数据的只读视图。' },

  { appId: 'prompts', groupId: 'tavern', firstAction: '选择主提示词、类型提示词、解析规则或快捷短语进行编辑。' },
  { appId: 'preset-manager', groupId: 'tavern', firstAction: '选择酒馆预设，查看、筛选或编辑其中条目。' },
  { appId: 'preset-link', groupId: 'tavern', firstAction: '选择预设后保存聊天绑定，需要时再单独立即应用。' },
  { appId: 'entry-library', groupId: 'tavern', firstAction: '手动新建条目，或选择预设、世界书来源和分组批量收藏。' },
  { appId: 'worldbook-link', groupId: 'tavern', firstAction: '选择世界书并保存当前聊天需要启用的条目状态。' },
  { appId: 'world-slots', groupId: 'tavern', firstAction: '新建当前聊天专用槽位，再同步到固定世界书。' },
  { appId: 'mvu-modifier', groupId: 'tavern', firstAction: '展开变量树，编辑字段并点击该字段的保存。' },
  { appId: 'regex-display', groupId: 'tavern', firstAction: '选择目标 App 和提取或替换，再填写规则并测试效果。' },
  {
    appId: 'app-builder',
    groupId: 'tavern',
    firstAction: '选择模板创建自制 App，再配置创建方式、命名、显示和内容转换。',
  },
  { appId: 'bagu', groupId: 'tavern', firstAction: '配置词汇和句式规则，再到正文扫描并选择修复。' },

  { appId: 'reader', groupId: 'automation', firstAction: '选择聊天进入连续阅读，轻点正文中部打开导航工具。' },
  { appId: 'chat-insert', groupId: 'automation', firstAction: '选择其他 App 内容作为引用，再写入酒馆当前聊天。' },
  { appId: 'favorites', groupId: 'automation', firstAction: '按类型筛选当前聊天中已经标记收藏的成品。' },
  { appId: 'workbench', groupId: 'automation', firstAction: '新建工作流并配置步骤，每一步可单独选择 API 与预设。' },

  { appId: 'comfy', groupId: 'media', firstAction: '先保存模型、采样器和工作流连接参数。' },
  { appId: 'media', groupId: 'media', firstAction: '选择 ComfyUI 工作流和参数后生成并保存媒体。' },
  { appId: 'cloud-media', groupId: 'media', firstAction: '配置云端服务，通常先让文本 AI 生成媒体提示词。' },
  { appId: 'gallery', groupId: 'media', firstAction: '集中查看、预览和管理已经保存的图片。' },
  { appId: 'music', groupId: 'media', firstAction: '查看生成音频、播放列表和歌词。' },
  { appId: 'video', groupId: 'media', firstAction: '查看并管理已经完成和保存的视频。' },
  { appId: 'theme', groupId: 'media', firstAction: '调整颜色、圆角、图标和阅读外观，并检查明暗模式。' },
  { appId: 'settings', groupId: 'media', firstAction: '配置首页、生成连接、RPM、备份和数据清理。' },
  { appId: 'games', groupId: 'media', firstAction: '选择一个轻量小游戏，不会读取或修改聊天创作数据。' },
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
