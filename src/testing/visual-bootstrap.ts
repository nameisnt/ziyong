function getByPath(source: unknown, path: string, fallback?: unknown) {
  if (!path) return source ?? fallback;
  const result = path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
  return typeof result === 'undefined' ? fallback : result;
}

function setByPath(source: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return source;
  let current = source;
  parts.slice(0, -1).forEach(part => {
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) current[part] = {};
    current = current[part] as Record<string, unknown>;
  });
  current[parts[parts.length - 1]] = value;
  return source;
}

const visualBaseGlobals = {
  _: {
    assign: Object.assign,
    get: getByPath,
    isEqual: (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right),
    mapValues: (source: Record<string, unknown>, iteratee: (value: unknown, key: string) => unknown) =>
      Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [key, iteratee(value, key)])),
    set: setByPath,
    shuffle: <T>(items: T[]) => [...items].reverse(),
  },
  toastr: {
    error: console.error,
    info: console.info,
    success: console.info,
    warning: console.warn,
  },
};

Object.assign(globalThis, visualBaseGlobals);

export interface VisualGlobalFixtureControls {
  setReaderFixtureReasoning: (reasoning: string) => void;
  setReaderFixtureSwipes: () => void;
}

export function setupVisualGlobals(): VisualGlobalFixtureControls {
  let visualMvuData = {
    initialized_lorebooks: { 视觉世界书: [1] },
    stat_data: {
      世界: {
        当前套餐: '基础套餐',
        套餐详情: '包含基础探索权限',
      },
      角色: {
        艾莉娅: {
          好感度: 42,
          是否在队: true,
          状态: '正在城镇休息',
        },
      },
      任务: {
        主线: ['查看告示板', '前往北门'],
      },
      背包: {
        金币: 128,
        道具: ['治疗药水', '旧地图'],
      },
    },
  };
  const visualBriefs = [
    {
      file_name: 'visual-current.json',
      last_mes: '2026-07-20',
      mes: '视觉测试聊天摘要',
      mes_cnt: 4,
      title: '视觉测试聊天',
    },
  ];
  const visualMessages = [
    { is_user: true, mes: '用户输入：这是一段用于视觉测试的聊天内容。', name: 'User' },
    {
      is_user: false,
      mes: [
        '<content>',
        '这是第一段正文，用来检测阅读详情页的排版、目录按钮、底部操作区以及长文本换行。',
        '',
        '第二段故意写得更长一点，避免只测到空状态。这里应该能自然换行，不应该让手机界面横向变宽。',
        '</content>',
      ].join('\n'),
      name: 'Assistant',
      send_date: '第 2 楼',
    },
    {
      is_user: false,
      mes: '<content>另一条 AI 回复，用来填充阅读列表。包含一些较长的中文内容，方便发现文本溢出。</content>',
      name: 'Assistant',
      send_date: '第 3 楼',
    },
  ];
  const setReaderFixtureReasoning = (reasoning: string) => {
    const target = visualMessages.find(message => !message.is_user);
    if (!target) throw new Error('Reader reasoning fixture has no assistant message');
    Object.assign(target, { extra: { reasoning } });
  };
  const setReaderFixtureSwipes = () => {
    const target = visualMessages.find(message => !message.is_user);
    if (!target) throw new Error('Reader swipe fixture has no assistant message');
    Object.assign(target, {
      mes: '<content>当前候选正文</content>',
      swipe_id: 1,
      swipes: ['<content>备选回复一</content>', '<content>当前候选正文</content>', '<content>备选回复三</content>'],
      swipes_data: [{ reasoning: '候选一思维链' }, { reasoning: '当前候选思维链' }, { reasoning: '候选三思维链' }],
    });
  };
  let visualLoadedPresetName = '视觉预设';
  let visualLegacyWorldbook = {
    entries: {
      1: {
        comment: '缺少关键词数组的旧条目',
        constant: true,
        content: '这个条目用于验证原始世界书兼容读取与开关写入。',
        disable: false,
        enabled: true,
        order: 10,
        selective: false,
        uid: 1,
      },
      2: {
        comment: '显式关键词触发条目',
        constant: false,
        content: '这个条目用于验证 selective 策略显示为绿灯。',
        disable: false,
        enabled: true,
        key: [],
        order: 20,
        selective: true,
        uid: 2,
      },
    },
    name: '【视觉】旧格式世界书',
  };
  const visualPresetStore: Record<string, Record<string, unknown>> = {
    视觉预设: {
      extensions: {
        baibaiToolkit: {
          presetPromptGroups: {
            version: 1,
            groups: [
              {
                id: 'visual-group-writing',
                name: '正文规则',
                order: 0,
                collapsed: true,
                enabled: true,
              },
            ],
            prompts: {
              'visual-style': { groupId: 'visual-group-writing' },
              'visual-format': { groupId: 'visual-group-writing' },
            },
          },
        },
      },
      prompts: [
        {
          id: 'main',
          name: '系统提示词',
          enabled: true,
          role: 'system',
          content: '你负责完成视觉测试生成任务。',
        },
        {
          id: 'visual-style',
          name: '文风与人物一致性',
          enabled: true,
          role: 'system',
          content: '保持人物语言与原聊天一致。',
        },
        {
          id: 'visual-format',
          name: '输出格式',
          enabled: false,
          role: 'user',
          content: '按照指定 XML 结构输出。',
        },
        {
          id: 'chatHistory',
          name: '聊天记录',
          enabled: true,
          role: 'system',
          position: { type: 'relative' },
        },
      ],
      prompts_unused: [],
      settings: {},
    },
    简洁写作: {
      extensions: {
        regex_scripts: [{ enabled: true, name: '视觉正则' }],
      },
      prompts: [
        {
          id: 'main',
          name: '简洁正文',
          enabled: true,
          role: 'system',
          content: '使用简洁自然的文字。',
        },
      ],
      prompts_unused: [],
      settings: {},
    },
    长篇剧情测试预设: {
      extensions: {},
      prompts: [],
      prompts_unused: [],
      settings: {},
    },
  };
  visualPresetStore.in_use = structuredClone(visualPresetStore[visualLoadedPresetName]);

  Object.assign(globalThis, {
    ...visualBaseGlobals,
    chatId: 'visual-chat',
    characters: [{ avatar: 'visual-user.png', name: '测试角色' }],
    eventClearAll: () => {},
    getCurrentCharacterId: () => 0,
    getCurrentCharacterName: () => '测试角色',
    getCurrentChatId: () => 'visual-chat',
    getCharWorldbookNames: () => ({ additional: [], primary: null }),
    getChatWorldbookName: () => null,
    getGlobalWorldbookNames: () => ['视觉世界书'],
    getLastMessageId: () => 3,
    getRequestHeaders: () => ({}),
    getTokenCountAsync: (content: string) => Math.ceil(String(content || '').length / 2),
    getWorldbookNames: () => ['视觉世界书', '【视觉】旧格式世界书'],
    groupId: '',
    loadWorldInfo: async (name: string) =>
      name === '【视觉】旧格式世界书' ? structuredClone(visualLegacyWorldbook) : null,
    Mvu: {
      events: {},
      getMvuData: () => structuredClone(visualMvuData),
      replaceMvuData: async (data: typeof visualMvuData) => {
        visualMvuData = structuredClone(data);
      },
    },
    reloadCurrentChat: async () => {},
    reloadWorldInfoEditor: () => {},
    registerMacroLike: () => ({ unregister() {} }),
    rebindGlobalWorldbooks: async () => {},
    saveWorldInfo: async (name: string, data: typeof visualLegacyWorldbook) => {
      if (name === '【视觉】旧格式世界书') visualLegacyWorldbook = structuredClone(data);
    },
    SillyTavern: {
      chat: visualMessages,
      chatId: 'visual-chat',
      getContext: () => ({
        chat: visualMessages,
        eventSource: {
          off() {},
          on() {},
          removeListener() {},
        },
        eventTypes: {},
      }),
      groupId: '',
    },
    TavernHelper: {
      deletePreset: async (presetName: string) => {
        if (!visualPresetStore[presetName] || presetName === visualLoadedPresetName || presetName === 'in_use') {
          return false;
        }
        delete visualPresetStore[presetName];
        return true;
      },
      getChatHistoryBrief: async () => visualBriefs,
      getChatHistoryDetail: async () => ({
        'visual-current.json': visualMessages,
      }),
      getLoadedPresetName: () => visualLoadedPresetName,
      getPreset: (presetName: string) => structuredClone(visualPresetStore[presetName]),
      getPresetNames: () => Object.keys(visualPresetStore).filter(name => name !== 'in_use'),
      getWorldbook: async (name: string) => {
        if (name === '【视觉】旧格式世界书') {
          throw new TypeError("Cannot read properties of undefined (reading 'map')");
        }
        return Array.from({ length: 12 }, (_, index) => ({
          content: `第 ${index + 1} 条视觉世界书内容，用于检查收藏列表、批量选择和独立滚动区域。`,
          enabled: true,
          name: `世界书条目 ${index + 1}`,
          uid: index + 1,
        }));
      },
      getWorldbookNames: () => ['视觉世界书', '【视觉】旧格式世界书'],
      loadPreset: (presetName: string) => {
        if (!visualPresetStore[presetName] || presetName === 'in_use') return false;
        visualLoadedPresetName = presetName;
        visualPresetStore.in_use = structuredClone(visualPresetStore[presetName]);
        const regexes = (visualPresetStore[presetName].extensions as { regex_scripts?: Array<{ enabled?: boolean }> })
          .regex_scripts;
        if (regexes?.some(regex => regex.enabled !== false)) {
          const toast = document.createElement('div');
          toast.className = 'toast toast-info';
          toast.textContent = `预设“${presetName}”包含被启用的正则，重新加载聊天以使正则生效`;
          document.body.append(toast);
        }
        return true;
      },
      updatePresetWith: async (
        presetName: string,
        updater: (preset: Record<string, unknown>) => Record<string, unknown>,
      ) => {
        const preset = visualPresetStore[presetName];
        if (!preset) throw new Error(`Unknown visual preset: ${presetName}`);
        const updated = updater(structuredClone(preset));
        visualPresetStore[presetName] = structuredClone(updated);
        return structuredClone(updated);
      },
    },
    createPreset: async (presetName: string, preset: Record<string, unknown>) => {
      if (!presetName || presetName === 'in_use' || visualPresetStore[presetName]) return false;
      visualPresetStore[presetName] = structuredClone(preset);
      return true;
    },
    this_chid: 0,
    tavern_events: {},
  });

  return { setReaderFixtureReasoning, setReaderFixtureSwipes };
}
