import '@/global.css';
import type { PhoneRoute } from '@/store/phone';

type VisualScenarioName = string;

export interface VisualScenarioResult {
  name: VisualScenarioName;
  route: PhoneRoute;
}

declare global {
  interface Window {
    __phoneVisualTest__?: {
      applyScenario: (
        name: VisualScenarioName,
        options?: { height?: number; width?: number },
      ) => Promise<VisualScenarioResult>;
      scenarios: VisualScenarioName[];
    };
  }
}

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
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  });
  current[parts[parts.length - 1]] = value;
  return source;
}

function setupVisualGlobals() {
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
  let visualLoadedPresetName = '视觉预设';
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
                collapsed: false,
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
    _: {
      assign: Object.assign,
      get: getByPath,
      mapValues: (source: Record<string, unknown>, iteratee: (value: unknown, key: string) => unknown) =>
        Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [key, iteratee(value, key)])),
      set: setByPath,
    },
    chatId: 'visual-chat',
    characters: [{ avatar: 'visual-user.png', name: '测试角色' }],
    eventClearAll: () => {},
    getCurrentCharacterId: () => 0,
    getCurrentCharacterName: () => '测试角色',
    getCurrentChatId: () => 'visual-chat',
    getLastMessageId: () => 3,
    getRequestHeaders: () => ({}),
    getTokenCountAsync: (content: string) => Math.ceil(String(content || '').length / 2),
    groupId: '',
    reloadCurrentChat: async () => {},
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
      getChatHistoryBrief: async () => visualBriefs,
      getChatHistoryDetail: async () => ({
        'visual-current.json': visualMessages,
      }),
      getLoadedPresetName: () => visualLoadedPresetName,
      getPreset: (presetName: string) => structuredClone(visualPresetStore[presetName]),
      getPresetNames: () => Object.keys(visualPresetStore).filter(name => name !== 'in_use'),
      getWorldbook: async () =>
        Array.from({ length: 12 }, (_, index) => ({
          content: `第 ${index + 1} 条视觉世界书内容，用于检查收藏列表、批量选择和独立滚动区域。`,
          enabled: true,
          name: `世界书条目 ${index + 1}`,
          uid: index + 1,
        })),
      getWorldbookNames: () => ['视觉世界书'],
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
    this_chid: 0,
    toastr: {
      error: console.error,
      info: console.info,
      success: console.info,
      warning: console.warn,
    },
    tavern_events: {},
  });
}

function applyIconFallback() {
  const style = document.createElement('style');
  style.textContent = `
    .fa-solid,
    .fa-regular {
      display: inline-block;
      width: 1em;
      min-width: 1em;
      text-align: center;
    }

    .fa-solid::before,
    .fa-regular::before {
      content: "◆";
      font-size: 0.72em;
    }
  `;
  document.head.appendChild(style);
}

async function waitForPaint() {
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

setupVisualGlobals();
applyIconFallback();

const { initPhoneLifecycle } = await import('@/core/phoneLifecycle');
const { PHONE_APPS } = await import('@/data/apps');
const { useForumStore } = await import('@/store/forum');
const { useExtrasStore } = await import('@/store/extras');
const { useMediaStore } = await import('@/apps/media/store');
const { usePhoneStore } = await import('@/store/phone');
const { useGenerationTaskStore } = await import('@/store/generationTasks');
const { useReaderStore } = await import('@/store/reader');
const { useSettingsStore } = await import('@/store/settings');
const { useSummaryStore } = await import('@/store/summary');
const { useTheaterStore } = await import('@/store/theater');
const { useWorkbenchStore } = await import('@/apps/workbench/store');
const { useProfilesStore } = await import('@/apps/profiles/store');
const { usePresetLinkStore } = await import('@/apps/preset-link/store');
const { ENTRY_LIBRARY_CONTENT_PLACEHOLDER, useEntryLibraryStore } = await import('@/apps/entry-library/store');
const { readTavernPreset } = await import('@/apps/preset-manager/api');

initPhoneLifecycle();

const rootAppScenarios = PHONE_APPS.map(app => `app:${app.id}`);
const scenarios: VisualScenarioName[] = [
  'home',
  'home-tasks',
  'home-tasks-dark',
  ...rootAppScenarios,
  'bagu-scan-actions',
  'bagu-scan-applied',
  'settings',
  'settings-interface',
  'settings-connection',
  'settings-advanced',
  'cloud-media-generate',
  'cloud-media-settings',
  'entry-library-bindings',
  'entry-library-collect-manual-dedupe',
  'entry-library-collect-worldbook',
  'entry-library-ordering',
  'entry-library-scroll-return',
  'preset-link-auto-reload',
  'preset-link-history',
  'forum-generate-thread',
  'forum-board',
  'forum-thread',
  'preset-detail',
  'preset-editor',
  'reader-detail',
  'reader-catalog',
  'searchable-select',
  'diary-batch',
  'extras-book-generate',
  'extras-chapter-detail',
  'extras-chapter-editor',
  'extras-legacy-continuation',
  'summary-create',
  'summary-book',
  'summary-import',
  'summary-batch',
  'prompts-app-detail',
  'prompts-type-detail',
  'prompts-type-editor',
  'theater-generate',
  'theater-generate-dark-inputs',
  'theater-editor',
  'theater-history',
  'tutorial-article',
  'video-viewer',
  'workbench-logs',
  'profiles-table',
  'profiles-table-editor',
  'profiles-detail',
  'settings-connection-dark',
];

function configurePhoneSize(width = 360, height = 700) {
  const settingsStore = useSettingsStore();
  settingsStore.settings.interfaceSize.phoneWidth = width;
  settingsStore.settings.interfaceSize.phoneHeight = height;
  settingsStore.settings.floatBallEnabled = false;
  settingsStore.settings.phoneWindowX = Math.max(8, Math.round((window.innerWidth - width) / 2));
  settingsStore.settings.phoneWindowY = Math.max(8, Math.round((window.innerHeight - height) / 2));
}

function resetPhoneToRoute(appId: string, page: string, title: string, params?: Record<string, string>) {
  const phone = usePhoneStore();
  phone.isOpen = true;
  phone.stack = [
    { appId: 'home', page: 'home', title: '酒馆手机' },
    { appId, page, params, title },
  ];
}

function createForumFixture() {
  const forum = useForumStore();
  forum.resetCurrentScope();
  const board = forum.createBoard({ name: '各个' });
  const longThread = forum.createThread(board.id, {
    author: '楼主',
    content: [
      '这是一个用于 UI 检查的主楼。',
      '正文故意写长一点，方便观察卡片、详情页和底部按钮会不会挤压或遮挡。',
      '如果这里出现横向滚动、按钮变形或内容压住底部，就应该被截图报告标出来。',
    ].join('\n\n'),
    title: '视觉测试帖子：按钮不应该被拉高，正文也不应该横向溢出',
  });
  if (!longThread) throw new Error('Forum visual fixture did not create a thread');
  forum.appendReplies(board.id, longThread.thread.id, [
    { author: '一楼', content: '第一条回复，只显示楼层，不显示现实时间。' },
    { author: '二楼', content: '第二条回复，文字稍微长一点，用来检测回复卡片换行和底部按钮。' },
    { author: '三楼', content: '第三条回复。' },
  ]);
  return {
    board,
    thread: longThread.thread,
  };
}

function createTheaterFixture() {
  const theater = useTheaterStore();
  theater.resetCurrentScope();
  const firstEntry = theater.createEntry({
    content: '后台灯光还没有完全亮起，角色们在幕布后完成一场短暂而轻快的对话。',
    participants: [{ name: 'Nova' }, { name: 'Zod' }],
    renderMode: 'markdown',
    title: '【直播】问心台满月宴：全仙门都在等一个笑点',
    typeId: 'prompt_type_theater_funny',
    typeName: '搞笑',
  });
  theater.createEntry({
    content: '两人把争执藏进一句普通的问候里，直到雨声替他们把停顿说出口。',
    participants: [{ name: 'Kaios' }, { name: 'Mira' }],
    renderMode: 'markdown',
    title: '雨夜后台，谢幕之后',
    typeId: 'prompt_type_theater_dialogue',
    typeName: '对话体',
  });
  return firstEntry;
}

function createTheaterBaguFixture() {
  const theater = useTheaterStore();
  theater.resetCurrentScope();
  return theater.createEntry({
    content: '他仿佛听见雨声靠近，忍不住微微一愣，眼中闪过一丝迟疑。',
    participants: [{ name: 'Nova' }, { name: 'Zod' }],
    renderMode: 'markdown',
    title: '八股检测布局测试',
    typeName: '对话体',
  });
}

function createSummaryFixture() {
  const summary = useSummaryStore();
  summary.resetCurrentScope();
  const book = summary.createBook('第一卷剧情总结');
  summary.createEntry(book.id, {
    content: '主角在雨夜确认了新的线索，但尚未知道线索来自谁。',
    rangeLabel: '第 1-12 楼',
    title: '雨夜线索',
  });
  summary.createEntry(book.id, {
    content: '两人的关系因一次隐瞒出现裂痕，重要物品暂时由配角保管。',
    rangeLabel: '第 13-24 楼',
    title: '关系转折',
  });
  return book;
}

function createLegacyExtrasFixture() {
  const extras = useExtrasStore();
  extras.resetCurrentScope();
  const book = extras.createBook({
    title: '旧版阅读体番外',
    typeName: '阅读体',
  });
  extras.createChapter(book.id, {
    content: '众人刚读完第一段文字，房间里短暂地安静下来。',
    title: '第一章',
  });
  return book;
}

function createExtrasGenerationRecordFixture() {
  const extras = useExtrasStore();
  extras.resetCurrentScope();
  const book = extras.createBook({
    title: '月下回廊番外',
    typeName: '阅读体',
  });
  const chapter = extras.createChapter(book.id, {
    content: [
      '众人刚读完第一段文字，房间里短暂地安静下来。',
      '窗外的雨声压住了没有说出口的话，直到她把书翻到下一页。',
    ].join('\n\n'),
    generationRecord: {
      chapterMode: '续写上一章',
      createdAt: new Date().toISOString(),
      fromStartEnd: 20,
      id: 'visual_extra_generation',
      rangeText: '12-18',
      recentCount: 8,
      references: [],
      singleMessageId: 0,
      sourceLabel: '第 12-18 楼',
      sourceMessageIds: [12, 13, 14, 15, 16, 17, 18],
      sourceMode: 'range',
      tavernPresetName: '剧情续写',
      typeId: '',
      typeName: '阅读体',
      typePrompt: '保持群像反应与原作信息揭示之间的节奏。',
      userRequirement: '保留雨夜氛围，让角色先误会，再通过书中下一段逐渐发现真相。',
    },
    title: '雨夜未尽',
  });
  if (!chapter) throw new Error('Extras generation record fixture did not create a chapter');
  return { book, chapter };
}

function createVideoFixture() {
  const media = useMediaStore();
  media.resetCurrentScope();
  return media.createEntry({
    kind: 'video',
    note: '用于检查视频标题、翻页按钮和详情操作区在手机宽度下是否保持稳定。',
    source: 'link',
    title: '雨夜回廊片段',
    url: 'data:video/mp4;base64,',
  });
}

function createWorkbenchFixture() {
  const workbench = useWorkbenchStore();
  workbench.settings.insertDrafts = [];
  workbench.settings.logs = [];
  workbench.settings.workflows = [];
  const workflow = workbench.createWorkflow('章节收尾整理');
  workbench.addStep(workflow.id, { actionId: 'generate', appId: 'summary' });
  workbench.addStep(workflow.id, { actionId: 'generate', appId: 'diary' });
  const success = workbench.createLog(workflow, 'visual');
  workbench.finishLog(success.id, 'success', '总结与日记生成完成');
  const failed = workbench.createLog(workflow, 'visual');
  workbench.finishLog(failed.id, 'failed', '资料卡解析失败，已保存失败草稿');
}

function createProfilesFixture() {
  const profiles = useProfilesStore();
  profiles.resetCurrentScope();
  const table = profiles.createTable({
    kind: 'character',
    name: '登场人物',
    columns: [
      {
        description: '人物姓名。',
        id: 'title',
        label: '姓名',
        options: [],
        required: true,
        type: 'text',
        visible: true,
      },
      {
        description: '人物身份。',
        id: 'identity',
        label: '身份',
        options: [],
        required: false,
        type: 'text',
        visible: true,
      },
      {
        description: '人物当前状态。',
        id: 'status',
        label: '当前状态',
        options: ['在场', '失联', '未知'],
        required: false,
        type: 'select',
        visible: true,
      },
      {
        description: '一句话摘要。',
        id: 'summary',
        label: '摘要',
        options: [],
        required: false,
        type: 'text',
        visible: true,
      },
    ],
  });
  const characterTable = profiles.getDefaultTable('character');
  if (!characterTable) throw new Error('Profiles visual fixture did not create the character table');
  const firstEntry = profiles.createEntry({
    content: '她在雨夜留下了一封没有署名的信，目前仍在城中调查旧案。',
    fields: { identity: '调查员', status: '在场' },
    kind: 'character',
    summary: '追查旧案的调查员，与主角互相隐瞒关键线索。',
    tableId: characterTable.id,
    tags: ['旧案', '雨夜'],
    title: '林见夏',
  });
  profiles.createEntry({
    content: '他掌管港口仓库，知道失踪货物最后一次出现的位置。',
    fields: { identity: '仓库管理员', status: '未知' },
    kind: 'character',
    summary: '寡言的港口管理员。',
    tableId: characterTable.id,
    tags: ['港口'],
    title: '周临川',
  });
  return { firstEntry, table };
}

function createGenerationTaskFixture() {
  const tasks = useGenerationTaskStore();
  tasks.tasks.slice().forEach(task => tasks.removeTask(task.id));
  const running = tasks.createTask({
    appId: 'summary',
    jobs: Array.from({ length: 8 }, (_, index) => ({
      error: '',
      id: `visual_job_${index}`,
      label: `第 ${index * 5 + 1}-${index * 5 + 5} 楼`,
      mode: 'range' as const,
      rangeText: `${index * 5 + 1}-${index * 5 + 5}`,
      singleMessageId: 0,
      status: index < 3 ? ('saved' as const) : ('pending' as const),
    })),
    kind: 'summary-batch',
    routePage: 'batch-generate',
    title: '批量总结 · 第一卷剧情总结',
  });
  tasks.patchTask(running.id, {
    currentJobIndex: 3,
    currentLabel: '第 16-20 楼',
    savedCount: 3,
    status: 'running',
  });
  const paused = tasks.createTask({
    appId: 'workbench',
    config: { workflowId: 'visual_workflow' },
    kind: 'workbench',
    title: '工作台 · 章节收尾整理',
    total: 6,
  });
  tasks.patchTask(paused.id, {
    currentJobIndex: 2,
    currentLabel: '第 1 批 · 日记',
    error: 'API 暂时不可用，进度已保留',
    savedCount: 2,
    status: 'paused',
  });
}

async function applyScenario(name: VisualScenarioName, options: { height?: number; width?: number } = {}) {
  if (!scenarios.includes(name)) {
    throw new Error(`Unknown visual scenario: ${name}`);
  }

  configurePhoneSize(options.width, options.height);
  document.querySelector('#visual-host-theme-override')?.remove();
  const phone = usePhoneStore();
  await phone.goHome();
  phone.openPhone();

  if (name === 'home') {
    await phone.goHome();
  } else if (name === 'home-tasks' || name === 'home-tasks-dark') {
    if (name === 'home-tasks-dark') useSettingsStore().setTheme('dark');
    createGenerationTaskFixture();
    await phone.goHome();
  } else if (name === 'bagu-scan-actions' || name === 'bagu-scan-applied') {
    const entry = createTheaterBaguFixture();
    resetPhoneToRoute('theater', 'bagu-scan', '八股检测', { entryId: entry.id });
    if (name === 'bagu-scan-applied') {
      await waitForPaint();
      document.querySelector<HTMLButtonElement>('.pc-bagu-scan-actions .accent')?.click();
      await waitForPaint();
    }
  } else if (name === 'settings') {
    resetPhoneToRoute('settings', 'root', '设置');
  } else if (name === 'settings-interface') {
    resetPhoneToRoute('settings', 'root', '设置', { tab: 'interface' });
  } else if (name === 'settings-connection') {
    resetPhoneToRoute('settings', 'root', '设置', { tab: 'connection' });
  } else if (name === 'settings-connection-dark') {
    useSettingsStore().setTheme('dark');
    resetPhoneToRoute('settings', 'root', '设置', { tab: 'connection' });
  } else if (name === 'settings-advanced') {
    resetPhoneToRoute('settings', 'root', '设置', { tab: 'advanced' });
  } else if (name === 'cloud-media-generate') {
    resetPhoneToRoute('cloud-media', 'generate', 'AI 云媒体');
  } else if (name === 'cloud-media-settings') {
    resetPhoneToRoute('cloud-media', 'settings', '云媒体配置');
  } else if (name === 'entry-library-collect-worldbook') {
    useSettingsStore().setTheme('light');
    const library = useEntryLibraryStore();
    library.importBackup({
      bindings: [],
      groups: [
        {
          createdAt: '2026-07-31T00:00:10.000Z',
          enabled: true,
          id: 'visual-entry-group-10',
          name: '分组 10',
        },
        {
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          id: 'visual-entry-group-2',
          name: '分组 2',
        },
      ],
      items: [],
      version: 1,
    });
    resetPhoneToRoute('entry-library', 'collect', '收藏条目');
    await waitForPaint();
    document.querySelectorAll<HTMLButtonElement>('.pc-entry-library-page .pc-segment-btn')[1]?.click();
    await waitForPaint();
    const selects = document.querySelectorAll<HTMLSelectElement>('.pc-entry-library-page .pc-select');
    const sourceSelect = selects[0];
    const groupSelect = selects[1];
    sourceSelect.value = '视觉世界书';
    sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForPaint();
    const groupNames = [...groupSelect.options]
      .map(option => option.textContent?.trim() ?? '')
      .filter(name => name.startsWith('分组'));
    if (groupNames.join('|') !== '分组 2|分组 10') {
      throw new Error(`Entry library groups are not naturally sorted: ${groupNames.join('|')}`);
    }
    const actionButtons = [...document.querySelectorAll<HTMLButtonElement>('.pc-entry-library-select-actions button')];
    actionButtons.find(button => button.textContent?.trim() === '全选')?.click();
    await waitForPaint();
    actionButtons.find(button => button.textContent?.trim() === '反选')?.click();
    await waitForPaint();
    if (document.querySelectorAll<HTMLInputElement>('.pc-entry-source-row input:checked').length) {
      throw new Error('Entry library invert selection did not clear fully selected visible entries');
    }
    document.querySelector<HTMLInputElement>('.pc-entry-source-row input')?.click();
    await waitForPaint();
    const collectScroll = document.querySelector<HTMLElement>('.pc-entry-library-collect-scroll');
    const collectFooter = document.querySelector<HTMLElement>('.pc-entry-library-collect-footer');
    if (!collectScroll || !collectFooter) throw new Error('Entry library fixed collect footer is missing');
    const footerTop = collectFooter.getBoundingClientRect().top;
    collectScroll.scrollTop = 320;
    await waitForPaint();
    if (collectScroll.scrollTop < 100 || Math.abs(collectFooter.getBoundingClientRect().top - footerTop) > 1) {
      throw new Error('Entry library collect footer moved with the entry list');
    }
  } else if (name === 'entry-library-collect-manual-dedupe') {
    useSettingsStore().setTheme('light');
    const library = useEntryLibraryStore();
    library.importBackup({
      bindings: [],
      groups: [
        {
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          id: 'visual-entry-group-manual-dedupe',
          name: '手动查重分组',
        },
      ],
      items: [],
      version: 1,
    });
    resetPhoneToRoute('entry-library', 'root', '条目库');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-entry-library-head .pc-primary-btn')?.click();
    await waitForPaint();
    document.querySelectorAll<HTMLButtonElement>('.pc-entry-library-page .pc-segment-btn')[1]?.click();
    await waitForPaint();
    const sourceSelect = document.querySelector<HTMLSelectElement>('.pc-entry-library-collect-scroll .pc-select');
    if (!sourceSelect) throw new Error('Entry library source selector is missing');
    sourceSelect.value = '视觉世界书';
    sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForPaint();
    document.querySelector<HTMLInputElement>('.pc-entry-source-row input')?.click();
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-entry-library-collect-footer .pc-primary-btn')?.click();
    await waitForPaint();
    if (usePhoneStore().currentRoute.page !== 'root') {
      throw new Error(
        `Entry library collection opened ${usePhoneStore().currentRoute.page} instead of returning to root`,
      );
    }
  } else if (name === 'entry-library-ordering') {
    useSettingsStore().setTheme('light');
    const library = useEntryLibraryStore();
    library.importBackup({
      bindings: [],
      groups: [
        {
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          id: 'visual-entry-group-order',
          name: '顺序测试分组',
        },
      ],
      items: [
        {
          content: '第三条正文',
          createdAt: '2026-07-31T00:00:03.000Z',
          enabled: true,
          groupId: 'visual-entry-group-order',
          id: 'visual-entry-order-3',
          order: 3,
          sourceEntryId: '3',
          sourceName: '视觉世界书',
          sourceType: 'worldbook',
          title: '第三条',
          updatedAt: '2026-07-31T00:00:03.000Z',
        },
        {
          content: '第一条正文',
          createdAt: '2026-07-31T00:00:01.000Z',
          enabled: true,
          groupId: 'visual-entry-group-order',
          id: 'visual-entry-order-1',
          order: 1,
          sourceEntryId: '1',
          sourceName: '视觉世界书',
          sourceType: 'worldbook',
          title: '第一条',
          updatedAt: '2026-07-31T00:00:01.000Z',
        },
        {
          content: '第二条正文',
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          groupId: 'visual-entry-group-order',
          id: 'visual-entry-order-2',
          order: 2,
          sourceEntryId: '2',
          sourceName: '视觉世界书',
          sourceType: 'worldbook',
          title: '第二条',
          updatedAt: '2026-07-31T00:00:02.000Z',
        },
      ],
      version: 1,
    });
    resetPhoneToRoute('entry-library', 'root', '条目库');
    await waitForPaint();
    const readTitles = () =>
      [...document.querySelectorAll<HTMLElement>('.pc-entry-library-item-main strong')].map(
        element => element.textContent?.trim() || '',
      );
    if (readTitles().join('|') !== '第一条|第二条|第三条') {
      throw new Error(`Entry library order was not rendered numerically: ${readTitles().join('|')}`);
    }
    if (
      document.querySelector(
        '.pc-entry-library-item-main p, .pc-entry-library-item-main small, .pc-entry-library-item .fa-arrow-up, .pc-entry-library-item .fa-arrow-down',
      )
    ) {
      throw new Error('Entry library compact rows still render content, source, or arrow controls');
    }
    library.updateItem('visual-entry-order-3', { order: 1 });
    await waitForPaint();
    if (
      readTitles().join('|') !== '第三条|第一条|第二条' ||
      library
        .getGroupItems('visual-entry-group-order')
        .map(item => item.order)
        .join('|') !== '1|2|3'
    ) {
      throw new Error('Entry library numeric reorder did not shift the surrounding item order');
    }
    const groupToggle = document.querySelector<HTMLInputElement>('.pc-entry-library-group-actions .pc-toggle input');
    groupToggle?.click();
    await waitForPaint();
    if (library.getGroupItems('visual-entry-group-order').some(item => item.enabled)) {
      throw new Error('Entry library group switch did not disable every group item');
    }
  } else if (name === 'entry-library-scroll-return') {
    useSettingsStore().setTheme('light');
    const library = useEntryLibraryStore();
    library.importBackup({
      bindings: [],
      groups: [
        {
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          id: 'visual-entry-group-scroll',
          name: '长列表分组',
        },
      ],
      items: Array.from({ length: 20 }, (_, index) => ({
        content: `用于验证滚动位置恢复的收藏正文 ${index + 1}`,
        createdAt: '2026-07-31T00:00:02.000Z',
        enabled: true,
        groupId: 'visual-entry-group-scroll',
        id: `visual-entry-scroll-item-${index + 1}`,
        sourceEntryId: String(index + 1),
        sourceName: '视觉世界书',
        sourceType: 'worldbook' as const,
        title: `滚动测试收藏 ${index + 1}`,
        updatedAt: '2026-07-31T00:00:02.000Z',
      })),
      version: 1,
    });
    resetPhoneToRoute('entry-library', 'root', '条目库');
    await waitForPaint();
    const screen = document.querySelector<HTMLElement>('.pc-screen');
    if (!screen) throw new Error('Phone screen is missing');
    screen.scrollTop = 280;
    await waitForPaint();
    const rootScrollTop = screen.scrollTop;
    if (rootScrollTop < 100) throw new Error('Entry library root fixture is not scrollable');
    document.querySelector<HTMLButtonElement>('.pc-entry-library-head .pc-primary-btn')?.click();
    await waitForPaint();
    if (screen.scrollTop !== 0) throw new Error('New entry library route did not start at the top');
    await usePhoneStore().goBack();
    await waitForPaint();
    if (Math.abs(screen.scrollTop - rootScrollTop) > 1) {
      throw new Error(`Entry library root scroll was not restored: ${screen.scrollTop} !== ${rootScrollTop}`);
    }
  } else if (name === 'entry-library-bindings') {
    useSettingsStore().setTheme('light');
    const library = useEntryLibraryStore();
    library.importBackup({
      bindings: [],
      groups: [
        {
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          id: 'visual-entry-group-2',
          name: '分组 2',
        },
      ],
      items: [
        {
          content: '视觉收藏正文',
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          groupId: 'visual-entry-group-2',
          id: 'visual-entry-item-1',
          sourceEntryId: '1',
          sourceName: '视觉世界书',
          sourceType: 'worldbook',
          title: '视觉收藏',
          updatedAt: '2026-07-31T00:00:02.000Z',
        },
      ],
      version: 1,
    });
    await library.createBinding({
      contentTemplate: `<a>${ENTRY_LIBRARY_CONTENT_PLACEHOLDER}</a>`,
      groupId: 'visual-entry-group-2',
      presetName: '视觉预设',
      targetPromptId: 'main',
      targetPromptName: '系统提示词',
      targetPromptSource: 'prompts',
    });
    const mainPrompt = readTavernPreset('视觉预设').prompts.find(prompt => prompt.id === 'main');
    if (mainPrompt?.content !== '<a>视觉收藏正文</a>') {
      throw new Error('Entry library binding placeholder was not rendered into the preset prompt');
    }
    resetPhoneToRoute('entry-library', 'bindings', '分组绑定');
  } else if (name === 'preset-link-auto-reload') {
    resetPhoneToRoute('preset-link', 'root', '预设绑定');
    const result = await usePresetLinkStore().applySelection(
      phone.viewingScopeKey,
      {
        presetName: '简洁写作',
        reloadRegex: true,
      },
      true,
    );
    await waitForPaint();
    if (!result.reloaded || document.querySelector('.toast')) {
      throw new Error('Preset regex auto-reload notice was not suppressed');
    }
  } else if (name === 'preset-link-history') {
    const historyScopeKey = 'char:0:chat:visual-history';
    usePresetLinkStore().saveBinding(historyScopeKey, {
      presetName: '简洁写作',
      reloadRegex: true,
    });
    await phone.setViewingScope(historyScopeKey, {
      chatTitle: '旧章节讨论',
      ownerName: '测试角色',
    });
    resetPhoneToRoute('preset-link', 'root', '预设绑定');
  } else if (name === 'searchable-select') {
    useSettingsStore().setTheme('light');
    const library = useEntryLibraryStore();
    library.importBackup({
      bindings: [],
      groups: [
        {
          createdAt: '2026-07-31T00:00:01.000Z',
          enabled: true,
          id: 'visual-search-group-current',
          name: '当前分组',
        },
        {
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          id: 'visual-search-group-target',
          name: '目标分组',
        },
      ],
      items: [
        {
          content: '搜索选择器测试正文',
          createdAt: '2026-07-31T00:00:01.000Z',
          enabled: true,
          groupId: 'visual-search-group-current',
          id: 'visual-search-item',
          order: 1,
          sourceEntryId: '1',
          sourceName: '视觉世界书',
          sourceType: 'worldbook',
          title: '搜索选择器测试',
          updatedAt: '2026-07-31T00:00:01.000Z',
        },
      ],
      version: 1,
    });
    resetPhoneToRoute('entry-library', 'edit', '编辑收藏', { itemId: 'visual-search-item' });
    await waitForPaint();
    const select = document.querySelector<HTMLSelectElement>('.pc-entry-item-editor select');
    if (!select) throw new Error('Searchable select fixture is missing its native select');
    select.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
      }),
    );
    await waitForPaint();
    const search = document.querySelector<HTMLInputElement>('.pc-select-overlay-search input');
    if (!search) throw new Error('Native select did not open the shared searchable selector');
    search.value = '目标';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    const matchingOptions = document.querySelectorAll<HTMLButtonElement>('.pc-select-overlay-option');
    if (matchingOptions.length !== 1 || matchingOptions[0]?.textContent?.trim() !== '目标分组') {
      throw new Error('Shared searchable selector did not filter its options');
    }
    matchingOptions[0]?.click();
    await waitForPaint();
    if (select.value !== 'visual-search-group-target') {
      throw new Error('Shared searchable selector did not update the native field value');
    }
    select.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 2,
      }),
    );
    await waitForPaint();
  } else if (name === 'prompts-app-detail') {
    resetPhoneToRoute('prompts', 'root', '提示词');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('[data-prompt-app-id="extras"]')?.click();
  } else if (name === 'prompts-type-detail') {
    resetPhoneToRoute('prompts', 'root', '提示词');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-prompts-menu-anchor > .pc-icon-btn')?.click();
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('[data-prompt-tab="type"]')?.click();
    await waitForPaint();
    const screen = document.querySelector<HTMLElement>('.pc-screen');
    screen?.scrollTo({ top: screen.scrollHeight });
    await waitForPaint();
    const typeTiles = document.querySelectorAll<HTMLButtonElement>('.pc-type-prompt-tile');
    typeTiles[typeTiles.length - 1]?.click();
  } else if (name === 'prompts-type-editor') {
    resetPhoneToRoute('prompts', 'type-editor', '编辑类型提示词', { promptId: 'prompt_type_theater_daily' });
  } else if (name.startsWith('app:')) {
    const appId = name.slice('app:'.length);
    const app = PHONE_APPS.find(item => item.id === appId);
    if (!app) throw new Error(`Unknown app visual scenario: ${name}`);
    resetPhoneToRoute(app.id, app.defaultRoute, app.name);
  } else if (name === 'preset-detail') {
    resetPhoneToRoute('preset-manager', 'detail', '预设条目', { presetName: '视觉预设' });
  } else if (name === 'preset-editor') {
    resetPhoneToRoute('preset-manager', 'edit', '编辑预设条目', {
      presetName: '视觉预设',
      promptId: 'visual-style',
    });
  } else if (name === 'tutorial-article') {
    resetPhoneToRoute('tutorial', 'article', '{{phoneUserInput}} 宏', { articleId: 'phone-user-input' });
  } else if (name === 'forum-generate-thread') {
    resetPhoneToRoute('forum', 'generate-thread', '生成帖子');
  } else if (name === 'forum-board') {
    const { board } = createForumFixture();
    resetPhoneToRoute('forum', 'board', board.name, { boardId: board.id });
  } else if (name === 'forum-thread') {
    const { board, thread } = createForumFixture();
    resetPhoneToRoute('forum', 'thread', thread.title, { boardId: board.id, threadId: thread.id });
  } else if (name === 'reader-detail') {
    const reader = useReaderStore();
    reader.resetAllCaches();
    const briefs = await reader.loadBriefs(true);
    const brief = briefs[0];
    const messages = brief ? await reader.loadChat(brief.fileName, true) : [];
    const message = messages[0];
    if (!message) throw new Error('Reader visual fixture did not create a message');
    resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
  } else if (name === 'summary-book') {
    const book = createSummaryFixture();
    resetPhoneToRoute('summary', 'book', book.title, { bookId: book.id });
  } else if (name === 'summary-import') {
    const book = createSummaryFixture();
    resetPhoneToRoute('summary', 'import-chat', '导入 AI 楼层', { bookId: book.id });
  } else if (name === 'summary-create') {
    resetPhoneToRoute('summary', 'create-book', '生成总结');
  } else if (name === 'summary-batch') {
    const book = createSummaryFixture();
    resetPhoneToRoute('summary', 'batch-generate', '批量生成总结', { bookId: book.id });
  } else if (name === 'diary-batch') {
    resetPhoneToRoute('diary', 'batch-generate', '批量生成日记');
  } else if (name === 'extras-book-generate') {
    resetPhoneToRoute('extras', 'book-editor', '生成番外');
    await waitForPaint();
    const screen = document.querySelector<HTMLElement>('.pc-screen');
    screen?.scrollTo({ top: screen.scrollHeight });
  } else if (name === 'extras-legacy-continuation') {
    const book = createLegacyExtrasFixture();
    resetPhoneToRoute('extras', 'chapter-generate', 'AI 生成章节', { bookId: book.id });
  } else if (name === 'extras-chapter-detail') {
    const { book } = createExtrasGenerationRecordFixture();
    resetPhoneToRoute('extras', 'book', book.title, { bookId: book.id });
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-entry-main')?.click();
    await waitForPaint();
    document.querySelector<HTMLElement>('.pc-generation-history summary')?.click();
  } else if (name === 'extras-chapter-editor') {
    const book = createLegacyExtrasFixture();
    const chapter = book.chapters[0];
    if (!chapter) throw new Error('Extras visual fixture did not create a chapter');
    resetPhoneToRoute('extras', 'chapter-editor', '编辑章节', { bookId: book.id, chapterId: chapter.id });
  } else if (name === 'workbench-logs') {
    createWorkbenchFixture();
    resetPhoneToRoute('workbench', 'root', '工作台');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-workflow-title')?.click();
  } else if (name === 'profiles-table' || name === 'profiles-table-editor' || name === 'profiles-detail') {
    const { firstEntry, table } = createProfilesFixture();
    resetPhoneToRoute(
      'profiles',
      name === 'profiles-table-editor' ? 'table-editor' : name === 'profiles-detail' ? 'entry' : 'root',
      name === 'profiles-table-editor' ? table.name : name === 'profiles-detail' ? firstEntry.title : '资料表',
      name === 'profiles-table-editor'
        ? { tableId: table.id }
        : name === 'profiles-detail'
          ? { entryId: firstEntry.id }
          : undefined,
    );
  } else if (name === 'reader-catalog') {
    const reader = useReaderStore();
    reader.resetAllCaches();
    const briefs = await reader.loadBriefs(true);
    const brief = briefs[0];
    const messages = brief ? await reader.loadChat(brief.fileName, true) : [];
    const message = messages[0];
    if (!message) throw new Error('Reader visual fixture did not create a message');
    resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-detail-nav .catalog')?.click();
  } else if (name === 'theater-generate') {
    resetPhoneToRoute('theater', 'generate', '小剧场配置');
  } else if (name === 'theater-generate-dark-inputs') {
    const settingsStore = useSettingsStore();
    const hostThemeOverride = document.createElement('style');
    hostThemeOverride.id = 'visual-host-theme-override';
    hostThemeOverride.textContent = `
      textarea:not(#send_textarea) {
        background-color: rgb(255, 255, 255) !important;
        color: rgb(60, 60, 70) !important;
      }
    `;
    document.head.append(hostThemeOverride);
    settingsStore.setTheme('dark');
    settingsStore.settings.visualTheme.backgroundColor = '#242129';
    settingsStore.settings.visualTheme.surfaceColor = 'rgba(255, 255, 255, 0.08)';
    settingsStore.settings.visualTheme.surfaceStrongColor = '#ffffff';
    settingsStore.settings.visualTheme.textColor = '#f5f5f7';
    resetPhoneToRoute('theater', 'generate', '小剧场配置');
    await waitForPaint();
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('.pc-theater-page textarea.pc-area');
    if (textareas.length < 2) throw new Error('Theater dark input fixture is incomplete');
    textareas.forEach(textarea => {
      const style = getComputedStyle(textarea);
      const background = style.backgroundColor.replace(/\s+/g, '');
      const color = style.color.replace(/\s+/g, '');
      if (background !== 'rgb(44,44,46)' || color !== 'rgb(245,245,247)') {
        throw new Error(`Theater dark input colors are invalid: ${background} / ${color}`);
      }
    });
  } else if (name === 'theater-editor') {
    const entry = createTheaterFixture();
    resetPhoneToRoute('theater', 'editor', '编辑小剧场', { entryId: entry.id });
  } else if (name === 'theater-history') {
    createTheaterFixture();
    resetPhoneToRoute('theater', 'history', '小剧场记录');
  } else if (name === 'video-viewer') {
    const video = createVideoFixture();
    resetPhoneToRoute('video', 'viewer', video.title, { entryId: video.id });
  }

  await waitForPaint();
  return {
    name,
    route: usePhoneStore().currentRoute,
  };
}

window.__phoneVisualTest__ = {
  applyScenario,
  scenarios,
};

const params = new URLSearchParams(window.location.search);
const scenario = params.get('scenario') as VisualScenarioName | null;
if (scenario) {
  void applyScenario(scenario, {
    height: Number(params.get('height')) || undefined,
    width: Number(params.get('width')) || undefined,
  });
} else if (!params.has('manual')) {
  void applyScenario('home');
}
