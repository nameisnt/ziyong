import '@fortawesome/fontawesome-free/css/all.min.css';
import '@/global.css';
import type { PhoneRoute } from '@/store/phone';
import type { ExtraChapterGenerationRecord } from '@/type/extra';
import { createVisualScenarioGroups, flattenVisualScenarioGroups } from '@/testing/visual/scenarioCatalog';
import { applySettingsVisualScenario } from '@/testing/visual/settingsScenarios';
import { applyForumGenerationVisualScenario, createForumFixture } from '@/testing/visual/forumGenerationScenarios';
import {
  applyExtrasGenerationVisualScenario,
  createExtrasSummaryFixture,
} from '@/testing/visual/extrasGenerationScenarios';
import { applyPromptsVisualScenario } from '@/testing/visual/promptsScenarios';
import {
  applyContentBookVisualScenario,
  createDiaryFixture,
  createLettersFixture,
  createSummaryFixture,
} from '@/testing/visual/contentBookScenarios';
import { applyTheaterVisualScenario, createTheaterFixture } from '@/testing/visual/theaterScenarios';
import { applyRecoveryVisualScenario } from '@/testing/visual/recoveryScenarios';
import { configureVisualPhoneSize, resetVisualPhoneRoute, waitForVisualPaint } from '@/testing/visual/context';
import { createGenerationTaskFixture } from '@/testing/visual/generationTaskFixtures';
import { computed, effectScope, nextTick, ref } from 'vue';

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
  let visualLoadedPresetName = '视觉预设';
  let visualLegacyWorldbook = {
    entries: {
      1: {
        comment: '缺少关键词数组的旧条目',
        content: '这个条目用于验证原始世界书兼容读取与开关写入。',
        disable: false,
        enabled: true,
        order: 10,
        uid: 1,
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
      isEqual: (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right),
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

const waitForPaint = waitForVisualPaint;

async function waitForVisualCondition(condition: () => boolean, timeout = 1000) {
  const startedAt = performance.now();
  while (!condition()) {
    if (performance.now() - startedAt > timeout) return false;
    await new Promise<void>(resolve => window.setTimeout(resolve, 20));
  }
  return true;
}

async function toggleReaderFooter() {
  const readerShell = document.querySelector<HTMLElement>('.pc-reader-detail-shell');
  if (!readerShell) throw new Error('Reader detail shell is missing');
  const rect = readerShell.getBoundingClientRect();
  const pointerInit: PointerEventInit = {
    bubbles: true,
    button: 0,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    isPrimary: true,
    pointerId: 1,
  };
  readerShell.dispatchEvent(new PointerEvent('pointerdown', pointerInit));
  readerShell.dispatchEvent(new PointerEvent('pointerup', pointerInit));
  await waitForPaint();
}

async function openReaderCatalog() {
  await toggleReaderFooter();
  const catalogButton = document.querySelector<HTMLButtonElement>('.pc-detail-nav .catalog');
  if (!catalogButton) throw new Error('Reader catalog button is missing after revealing the footer');
  catalogButton.click();
  await waitForPaint();
  if (!document.querySelector('.pc-catalog-mask')) throw new Error('Reader catalog modal did not open');
}

setupVisualGlobals();

const { initPhoneLifecycle } = await import('@/core/phoneLifecycle');
const { PHONE_APPS } = await import('@/data/apps');
const { useForumStore } = await import('@/store/forum');
const { ForumBoardSchema } = await import('@/type/forum');
const { useExtrasStore } = await import('@/store/extras');
const { useMediaStore } = await import('@/apps/media/store');
const { usePhoneStore } = await import('@/store/phone');
const { usePromptStore } = await import('@/store/prompts');
const { useGenerationAliasesStore } = await import('@/store/generationAliases');
const { useGenerationOverrideStore } = await import('@/store/generationOverrides');
const { useReaderStore } = await import('@/store/reader');
const { useSettingsStore } = await import('@/store/settings');
const { useSummaryStore } = await import('@/store/summary');
const { usePreviewDraftStore } = await import('@/store/previewDrafts');
const { usePreviewDraftPersistence } = await import('@/util/previewDrafts');
const { useLettersStore } = await import('@/store/letters');
const { useTheaterStore } = await import('@/store/theater');
const { WorkbenchStepConfigSchema, useWorkbenchStore } = await import('@/apps/workbench/store');
const { ProfileEntrySchema, ProfileTableColumnSchema, profilesField, useProfilesStore } =
  await import('@/apps/profiles/store');
const { usePresetLinkStore } = await import('@/apps/preset-link/store');
const { useWorldSlotsStore, worldSlotsField } = await import('@/apps/world-slots/store');
const { getCurrentChatScopeKey } = await import('@/store/chatScoped');
const { extension_settings } = await import('@sillytavern/scripts/extensions');
const { createExtraChapterGenerationAdapter, createExtraChapterGenerationRecord, resolveGeneratedExtraBookTitle } =
  await import('@/core/extrasGeneration');
const { GenerationReplaySnapshotSchema } = await import('@/type/generation');
const { restoreGenerationReplayDraft } = await import('@/util/generationReplay');
const { createHiddenGenerationRecord } = await import('@/util/hiddenGenerationRecord');
const { buildBaguSentenceReplacement, groupBaguHitsBySentence, scanTextWithBaguRules } = await import('@/util/bagu');
const { buildSourceSelection } = await import('@/util/generationSource');
const { buildPhoneUserInput } = await import('@/util/generation');
const { getRegisteredPhoneAppReferenceTrees } = await import('@/core/appRegistry');
const { ENTRY_LIBRARY_CONTENT_PLACEHOLDER, renderEntryLibraryBindingContent, useEntryLibraryStore } =
  await import('@/apps/entry-library/store');
const { deleteTavernPresetPrompt, duplicateTavernPresetPrompt, readTavernPreset, reorderTavernPresetPrompts } =
  await import('@/apps/preset-manager/api');
const { applyTextProviderSelection } = await import('@/util/textProvider');
const { buildExtraHistoryContext, getSummarizableChapters } = await import('@/util/extrasSummary');
const { resolveExtraChapterGenerationRecords, synchronizeExtraChapterGenerationRecords } =
  await import('@/util/extraGenerationRecords');

initPhoneLifecycle();

const visualTaskInstruction = usePromptStore().resolveTaskTemplate(
  'diary.generate',
  { perspectiveName: '林见夏', timeInstruction: '日记发生或写作时间：当晚' },
  '',
);
const visualPhoneUserInput = buildPhoneUserInput(
  {
    appPrompt: 'App 预设',
    outputFormat: '输出格式',
    references: '不应进入宏的引用',
    taskInstruction: visualTaskInstruction,
    typePrompt: '类型预设',
  },
  '追加要求',
);
if (
  visualPhoneUserInput !==
  [
    '请严格以林见夏的第一人称口吻书写这篇日记，不要写成旁白总结。\n日记发生或写作时间：当晚',
    'App 预设',
    '类型预设',
    '追加要求',
    '输出格式',
  ].join('\n\n')
) {
  throw new Error('{{phoneUserInput}} 没有按任务、App、类型、追加要求、输出格式的顺序组成');
}
if (visualPhoneUserInput.includes('不应进入宏的引用')) {
  throw new Error('{{phoneUserInput}} 不应包含引用内容');
}

function createVisualHiddenGenerationRecord(
  actionId: string,
  userRequirement: string,
  config: Record<string, unknown> = {},
) {
  const replay = GenerationReplaySnapshotSchema.parse({
    config: { ...config, userRequirement },
    request: { outputFormat: '<content>正文</content>', userRequirement },
    source: {
      chatIdAtGeneration: 'visual-chat',
      label: '最近 7 楼',
      messageIds: [14, 15, 16, 17, 18, 19, 20],
      mode: 'recent',
      ranges: [{ end: 20, start: 14 }],
      scopeId: 'visual-scope',
      sortKey: 20,
    },
    sourceInput: { recentCount: 7 },
  });
  return createHiddenGenerationRecord(actionId, replay);
}

const rootAppScenarios = PHONE_APPS.map(app => `app:${app.id}`);
const scenarioGroups = createVisualScenarioGroups(rootAppScenarios);
const scenarios: VisualScenarioName[] = flattenVisualScenarioGroups(scenarioGroups);

const configurePhoneSize = configureVisualPhoneSize;
const resetPhoneToRoute = resetVisualPhoneRoute;

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

function createExtrasContinuationReferencesFixture() {
  const extras = useExtrasStore();
  extras.resetCurrentScope();
  const sourceBook = extras.createBook({ title: '续写引用资料', typeName: '参考资料' });
  const sourceChapters = [
    extras.createChapter(sourceBook.id, { content: '实时引用 A：雨声已经停了。', title: '雨停' }),
    extras.createChapter(sourceBook.id, { content: '实时引用 B：灯仍然亮着。', title: '留灯' }),
    extras.createChapter(sourceBook.id, { content: '候选版本引用：不应被续写继承。', title: '候选引用' }),
  ];
  if (sourceChapters.some(chapter => !chapter)) throw new Error('Continuation source fixture creation failed');
  const sourceA = sourceChapters[0]!;
  const sourceB = sourceChapters[1]!;
  const sourceCandidate = sourceChapters[2]!;
  const makeReference = (chapter: typeof sourceA, historicalContent: string) => ({
    content: historicalContent,
    id: `extras:${sourceBook.id}:chapter:${chapter.id}`,
    sourcePath: ['番外', sourceBook.title],
    title: chapter.title,
  });
  const missingReference = {
    content: '历史引用：原条目虽然已经删除，但重写与续写仍可使用这份快照。',
    id: 'extras:deleted-book:chapter:deleted-chapter',
    sourcePath: ['番外', '已删除资料'],
    title: '已删除的引用',
  };
  const createRecord = (
    id: string,
    references: ExtraChapterGenerationRecord['references'],
  ): ExtraChapterGenerationRecord => ({
    chapterMode: '续写上一章',
    createdAt: new Date().toISOString(),
    fromStartEnd: 20,
    id,
    rangeText: '',
    recentCount: 20,
    references,
    singleMessageId: 0,
    sourceLabel: '最近 20 楼',
    sourceMessageIds: [],
    sourceMode: 'latest',
    tavernPresetName: '',
    typeId: '',
    typeName: '阅读体',
    typePrompt: '',
    userRequirement: '',
  });
  const targetBook = extras.createBook({ title: '引用继承测试', typeName: '阅读体' });
  const adoptedReferences = [makeReference(sourceB, '旧快照 B'), missingReference, makeReference(sourceA, '旧快照 A')];
  const targetChapter = extras.createChapter(targetBook.id, {
    content: '当前采用的第一版章节。',
    generationRecord: createRecord('visual_adopted_record', adoptedReferences),
    title: '当前采用版本',
  });
  if (!targetChapter) throw new Error('Continuation target fixture creation failed');
  extras.appendChapterVersion(targetBook.id, targetChapter.id, {
    content: '尚未采用的候选版本。',
    generationRecord: createRecord('visual_candidate_record', [makeReference(sourceCandidate, '候选版本引用旧快照')]),
    title: '候选版本',
  });
  const adoptedVersionId = targetChapter.versions[0]?.id || '';
  extras.activateChapterVersion(targetBook.id, targetChapter.id, adoptedVersionId);
  return { adoptedReferences, sourceA, sourceB, targetBook };
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

function createWorkbenchForumFixture() {
  const workbench = useWorkbenchStore();
  workbench.settings.insertDrafts = [];
  workbench.settings.logs = [];
  workbench.settings.workflows = [];
  const workflow = workbench.createWorkflow('论坛内容整理');
  const step = workbench.addStep(workflow.id, { actionId: 'generate-thread', appId: 'forum' });
  step.config.forumBoardName = '夜话';
  step.config.forumBoardTypeName = '闲聊';
  step.config.forumBoardTypePrompt = '围绕当前剧情生成轻松但有信息量的主题帖。';
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
        enabled: true,
      },
      {
        description: '人物身份。',
        id: 'identity',
        label: '身份',
        options: [],
        required: false,
        type: 'text',
        enabled: true,
      },
      {
        description: '人物当前状态。',
        id: 'status',
        label: '当前状态',
        options: ['在场', '失联', '未知'],
        required: false,
        type: 'select',
        enabled: true,
      },
      {
        description: '一句话摘要。',
        id: 'summary',
        label: '摘要',
        options: [],
        required: false,
        type: 'text',
        enabled: true,
      },
    ],
  });
  const characterTable = profiles.getDefaultTable('character');
  if (!characterTable) throw new Error('Profiles visual fixture did not create the character table');
  const firstEntry = profiles.createEntry({
    fields: {
      details: '她在雨夜留下了一封没有署名的信，目前仍在城中调查旧案。',
      identity: '调查员',
      status: '在场',
    },
    kind: 'character',
    summary: '追查旧案的调查员，与主角互相隐瞒关键线索。',
    tableId: characterTable.id,
    tags: ['旧案', '雨夜'],
    title: '林见夏',
  });
  profiles.createEntry({
    fields: {
      details: '他掌管港口仓库，知道失踪货物最后一次出现的位置。',
      identity: '仓库管理员',
      status: '未知',
    },
    kind: 'character',
    summary: '寡言的港口管理员。',
    tableId: characterTable.id,
    tags: ['港口'],
    title: '周临川',
  });
  return { firstEntry, table };
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

  if (await applySettingsVisualScenario(name, { resetPhoneToRoute, waitForPaint })) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyForumGenerationVisualScenario(name, {
      createHiddenGenerationRecord: createVisualHiddenGenerationRecord,
      resetPhoneToRoute,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (await applyExtrasGenerationVisualScenario(name, { resetPhoneToRoute, waitForPaint })) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (await applyPromptsVisualScenario(name, { resetPhoneToRoute, waitForPaint })) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyContentBookVisualScenario(name, {
      createHiddenGenerationRecord: createVisualHiddenGenerationRecord,
      openReaderCatalog,
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyTheaterVisualScenario(name, {
      createHiddenGenerationRecord: createVisualHiddenGenerationRecord,
      resetPhoneToRoute,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (applyRecoveryVisualScenario(name, { resetPhoneToRoute })) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (name === 'home') {
    await phone.goHome();
  } else if (name === 'custom-app-extract-rules') {
    const { CustomAppDefinitionsSettingsSchema, customAppDefinitionsField } = await import('@/apps/app-builder/schema');
    const { useCustomAppsStore } = await import('@/apps/app-builder/store');
    const { createRegexDisplayRule, RegexDisplaySettingsSchema, regexDisplayField, useRegexDisplayStore } =
      await import('@/apps/regex-display/store');
    const timestamp = '2026-08-10T08:00:00.000Z';
    const appId = 'custom-visual-extract';
    _.set(
      extension_settings,
      customAppDefinitionsField,
      CustomAppDefinitionsSettingsSchema.parse({
        definitions: [
          {
            id: appId,
            name: '聊天片段提取',
            icon: 'fa-highlighter',
            description: '验证自制 App 独立提取规则',
            dataScope: 'global',
            creation: { manual: true, extract: true, generate: false },
            naming: { mode: 'first-line', template: '{{appName}} {{index}}' },
            extraction: { saveMode: 'separate' },
            display: { mode: 'markdown', sortDesc: false },
            referenceEnabled: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }),
    );
    _.set(
      extension_settings,
      regexDisplayField,
      RegexDisplaySettingsSchema.parse({
        rules: [
          createRegexDisplayRule({
            id: 'visual-custom-content',
            name: '自制 App 正文',
            operation: 'extract',
            order: 0,
            pattern: '/^[\\s\\S]*?<custom-body>([\\s\\S]*?)<\\/custom-body>[\\s\\S]*$/i',
            replacement: '$1',
          }),
          createRegexDisplayRule({
            id: 'visual-custom-title',
            name: '自制 App 标题',
            operation: 'extract',
            order: 1,
            pattern: '/^[\\s\\S]*?<custom-title>([\\s\\S]*?)<\\/custom-title>[\\s\\S]*$/i',
            replacement: '$1',
          }),
          createRegexDisplayRule({
            id: 'visual-reader-conflict',
            name: '不应应用的阅读器规则',
            operation: 'extract',
            order: 2,
            pattern: '/^[\\s\\S]+$/',
            replacement: '错误的阅读器结果',
          }),
        ],
        usages: {
          [appId]: {
            contentRuleId: 'visual-custom-content',
            displayRuleIds: [],
            titleRuleId: 'visual-custom-title',
          },
        },
      }),
    );
    useCustomAppsStore().rehydrateFromSettings();
    useRegexDisplayStore().rehydrateFromSettings();

    const visualGlobal = globalThis as unknown as {
      SillyTavern: { chat: Array<Record<string, unknown>> };
    };
    const chat = visualGlobal.SillyTavern.chat;
    const originalLength = chat.length;
    chat.push(
      {
        is_user: false,
        mes: '<custom-title>可见标题</custom-title><custom-body>可见 AI 正文</custom-body>',
        name: 'Assistant',
      },
      {
        is_system: true,
        is_user: false,
        mes: '<custom-title>隐藏标题</custom-title><custom-body>隐藏 AI 正文</custom-body>',
        name: 'Assistant',
      },
      {
        is_user: true,
        mes: '<custom-title>用户标题</custom-title><custom-body>用户正文</custom-body>',
        name: 'User',
      },
    );

    resetPhoneToRoute(appId, 'extract', '提取内容');
    await waitForPaint();
    const previewButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button =>
      button.textContent?.includes('预览提取'),
    );
    if (!previewButton) throw new Error('Custom app extract preview button was not rendered');
    previewButton.click();
    await waitForPaint();
    chat.splice(originalLength);

    const previewText = document.querySelector<HTMLElement>('.pc-extract-preview-list')?.textContent || '';
    if (!previewText.includes('待保存 2 / 2')) {
      throw new Error(`Custom app extraction did not retain both AI floors: ${previewText}`);
    }
    for (const expected of ['可见标题', '可见 AI 正文', '隐藏标题', '隐藏 AI 正文']) {
      if (!previewText.includes(expected)) throw new Error(`Custom app extraction missed ${expected}`);
    }
    for (const unexpected of ['用户标题', '用户正文', '错误的阅读器结果']) {
      if (previewText.includes(unexpected)) throw new Error(`Custom app extraction leaked ${unexpected}`);
    }
    const saveButton = document.querySelector<HTMLButtonElement>('.pc-extract-save-actions .pc-primary-btn');
    if (!saveButton) throw new Error('Custom app extract save button was not rendered');
    saveButton.click();
    const savedListReady = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-custom-entry-list')));
    if (!savedListReady) throw new Error('Custom app became blank after saving extracted entries');
    const savedListText = document.querySelector<HTMLElement>('.pc-custom-entry-list')?.textContent || '';
    for (const expected of ['可见标题', '可见 AI 正文', '隐藏标题', '隐藏 AI 正文']) {
      if (!savedListText.includes(expected)) throw new Error(`Saved custom app list missed ${expected}`);
    }
  } else if (name === 'custom-app-save-flow') {
    const { useCustomAppsStore } = await import('@/apps/app-builder/store');
    const { getRegisteredPhoneAppComponent } = await import('@/core/appRegistry');
    resetPhoneToRoute('app-builder', 'templates', '选择模板');
    await waitForPaint();
    const blankTemplate = [...document.querySelectorAll<HTMLButtonElement>('.pc-template-row')].find(button =>
      button.textContent?.includes('空白 App'),
    );
    if (!blankTemplate) throw new Error('Custom app blank template was not rendered');
    blankTemplate.click();
    await waitForPaint();
    const appNameField = document.querySelector<HTMLInputElement>('.pc-app-builder-editor .pc-field-group .pc-field');
    if (!appNameField) throw new Error('Custom app name field was not rendered');
    appNameField.value = '视觉保存测试';
    appNameField.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    const saveAppButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.offsetParent !== null && button.textContent?.includes('保存 App'),
    );
    if (!saveAppButton) throw new Error('Custom app save button was not rendered');
    await new Promise<void>(resolve => window.setTimeout(resolve, 50));
    saveAppButton.click();
    await waitForPaint();
    const definition = useCustomAppsStore().definitions.find(item => item.name === '视觉保存测试');
    if (!definition) {
      const savedNames = useCustomAppsStore()
        .definitions.map(item => item.name)
        .join(', ');
      const notices = [...document.querySelectorAll<HTMLElement>('.toast-message')]
        .map(item => item.textContent)
        .join(' | ');
      throw new Error(
        `Clicking save App did not create a custom app definition (field=${appNameField.value}; saved=${savedNames}; notices=${notices})`,
      );
    }
    resetPhoneToRoute(definition.id, 'root', definition.name);
    await waitForPaint();
    const addButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent?.trim() === '新增',
    );
    if (!addButton) throw new Error('Saved custom app did not expose its manual create action');
    addButton.click();
    await waitForPaint();
    const contentArea = document.querySelector<HTMLTextAreaElement>('.pc-saved-content-area');
    if (!contentArea) throw new Error('Custom app content editor was not rendered');
    contentArea.value = '这是一条用于验证保存与转换入口的正文。';
    contentArea.dispatchEvent(new Event('input', { bubbles: true }));
    const saveEntryButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent?.trim() === '保存',
    );
    if (!saveEntryButton) throw new Error('Custom app entry save button was not rendered');
    await new Promise<void>(resolve => window.setTimeout(resolve, 50));
    saveEntryButton.click();
    await waitForPaint();
    const convertButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button =>
      button.textContent?.includes('转换到其他 App'),
    );
    if (!convertButton) {
      const buttonTitles = [...document.querySelectorAll<HTMLButtonElement>('button')]
        .map(button => `${button.title}:${button.textContent?.trim()}`)
        .filter(Boolean)
        .join(' | ');
      throw new Error(
        `Saved custom app entry did not expose its conversion action (route=${usePhoneStore().currentRoute.page}; open=${usePhoneStore().isOpen}; registered=${Boolean(getRegisteredPhoneAppComponent(definition.id))}; entries=${useCustomAppsStore().getEntries(definition.id).length}; buttons=${buttonTitles})`,
      );
    }
    convertButton.click();
    await waitForPaint();
    if (!document.querySelector('.pc-conversion-panel')) {
      throw new Error('Custom app conversion panel did not open from the saved entry');
    }
  } else if (
    name === 'generation-preview-long-title' ||
    name === 'generation-preview-long-title-edit' ||
    name === 'generation-preview-long-title-raw'
  ) {
    const longTitle = '解析异常时误入标题的超长内容'.repeat(28);
    const raw = `<title>${longTitle}</title><content>这是仍然需要编辑和重新解析的正文内容。</content>`;
    usePreviewDraftStore().upsertPreviewDraft({
      appId: 'theater',
      page: 'preview',
      preview: {
        content: '这是仍然需要编辑和重新解析的正文内容。',
        draftId: null,
        mode: 'create',
        raw,
        renderMode: 'markdown',
        source: { label: '最近 20 楼' },
        targetEntryId: '',
        targetVersionId: '',
        title: longTitle,
        typeName: '视觉测试',
        warnings: ['标题长度异常'],
      },
      routeParams: {},
      title: '生成预览',
    });
    resetPhoneToRoute('theater', 'preview', '生成预览');
    const previewOpened = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-generation-preview')));
    if (!previewOpened) throw new Error('Long-title generation preview did not open');
    await waitForPaint();

    if (name === 'generation-preview-long-title-edit') {
      document.querySelector<HTMLButtonElement>('.pc-preview-toolbar .pc-soft-btn')?.click();
      await waitForPaint();
    } else if (name === 'generation-preview-long-title-raw') {
      const rawButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-preview-actions .pc-soft-btn')].find(
        button => button.textContent?.includes('原始输出'),
      );
      rawButton?.click();
      await waitForPaint();
    }

    const previewHeader = document.querySelector('.pc-generation-preview-head');
    if (name === 'generation-preview-long-title') {
      const title = previewHeader?.querySelector('h2');
      if (!title || title.getBoundingClientRect().height > 54) {
        throw new Error('Long generation title was not clamped in normal preview');
      }
    } else {
      const editor = document.querySelector<HTMLTextAreaElement>('.pc-generation-preview textarea');
      if (previewHeader || !editor || editor.getBoundingClientRect().height < 180) {
        throw new Error('Generated title still occupies the input workspace');
      }
    }
  } else if (name === 'generation-rewrite-replay') {
    const adapter = createExtraChapterGenerationAdapter({
      appendChapterVersion: () => null,
      createChapter: () => null,
    });
    const baseConfig = {
      appPrompt: '原章节提示词',
      bookId: 'visual-rewrite-book',
      chapterId: 'visual-rewrite-chapter',
      chapterMode: '重写当前章节' as const,
      fromStartEnd: 20,
      outputFormat: '<title>标题</title><content>正文</content>',
      previousChapterContext: '',
      rangeText: '',
      recentCount: 20,
      references: [],
      singleMessageId: 0,
      sourceMode: 'recent' as const,
      tavernPresetName: '',
      typeId: '',
      typeName: '',
      typePrompt: '',
      userRequirement: '',
    };
    const newBookRequest = adapter.buildRequest({ ...baseConfig, generationIntent: '新开一本书' });
    const continuationRequest = adapter.buildRequest({
      ...baseConfig,
      generationIntent: '续写上一章',
      previousChapterContext: '上一章正文',
    });
    if (
      !newBookRequest.taskInstruction?.includes('本书第一章') ||
      !continuationRequest.taskInstruction?.includes('紧接上述最后一章续写') ||
      [newBookRequest, continuationRequest].some(request => /候选版本|重新生成/.test(request.taskInstruction || ''))
    ) {
      throw new Error('Extras rewrite no longer reuses the original new-book/continuation task');
    }

    const replay = GenerationReplaySnapshotSchema.parse({
      config: { userRequirement: '旧格式追加要求' },
      request: { outputFormat: '<content>正文</content>' },
      source: {
        chatIdAtGeneration: 'visual-chat',
        label: '最近 7 楼',
        messageIds: [14, 15, 16, 17, 18, 19, 20],
        mode: 'recent',
        ranges: [{ end: 20, start: 14 }],
        scopeId: 'visual-scope',
        sortKey: 20,
      },
      sourceInput: { recentCount: 7 },
    });
    const replayDraft = {
      fromStartEnd: 20,
      rangeText: '1-2',
      recentCount: 20,
      singleMessageId: 0,
      userRequirement: '',
    };
    const restoredMode = restoreGenerationReplayDraft(replay, replayDraft);
    if (
      restoredMode !== 'recent' ||
      replayDraft.recentCount !== 7 ||
      replayDraft.rangeText ||
      replayDraft.userRequirement !== '旧格式追加要求'
    ) {
      throw new Error('Generation replay changed the saved source mode into a custom range');
    }

    const emptySource = buildSourceSelection({
      chatIdAtGeneration: 'visual-chat',
      mode: 'none',
      scopeId: 'visual-scope',
      visibleMessages: [],
    });
    if (
      emptySource.maxChatHistory !== 0 ||
      emptySource.requiresVisibilityTransaction ||
      emptySource.selection.messageIds.length ||
      emptySource.selection.label !== '不使用聊天楼层'
    ) {
      throw new Error('No-chat source mode still depends on visible chat messages');
    }
    await phone.goHome();
  } else if (name === 'legacy-data-migrations') {
    const timestamp = '2026-07-31T00:00:00.000Z';
    const scopeKey = getCurrentChatScopeKey();
    _.set(extension_settings, profilesField, {
      __chatScoped: true,
      legacyScopeMigrations: {},
      scopes: {
        [scopeKey]: {
          entries: [
            {
              content: '旧版资料正文',
              createdAt: timestamp,
              fields: { identity: '调查员' },
              id: 'legacy-profile',
              kind: 'character',
              summary: '旧版摘要',
              tableId: 'profile_table_character',
              tags: ['旧数据'],
              title: '旧版人物',
              updatedAt: timestamp,
            },
          ],
          tables: [],
        },
      },
    });
    _.set(extension_settings, worldSlotsField, {
      __chatScoped: true,
      legacyScopeMigrations: {},
      scopes: {
        [scopeKey]: {
          bookName: '旧自定义世界书',
          slots: [
            {
              content: '旧槽位正文',
              createdAt: timestamp,
              id: 'legacy-slot',
              profileEntryIds: ['legacy-profile'],
              title: '旧槽位',
              type: 'relationship',
              updatedAt: timestamp,
            },
          ],
        },
      },
    });

    const profile = ProfileEntrySchema.parse({
      content: '旧版资料正文',
      createdAt: timestamp,
      fields: {},
      id: 'legacy-profile-schema',
      kind: 'character',
      title: '旧版人物',
      updatedAt: timestamp,
    });
    if (profile.fields.details !== '旧版资料正文' || 'content' in profile) {
      throw new Error('Legacy profile content was not migrated to the details field');
    }

    const board = ForumBoardSchema.parse({
      createdAt: timestamp,
      description: '旧板块说明',
      id: 'legacy-board',
      name: '旧板块',
      updatedAt: timestamp,
    });
    if (board.typePrompt !== '旧板块说明' || 'description' in board) {
      throw new Error('Legacy forum board description was not migrated to the type prompt');
    }

    const stepConfig = WorkbenchStepConfigSchema.parse({ forumBoardDescription: '旧工作台板块说明' });
    if (stepConfig.forumBoardTypePrompt !== '旧工作台板块说明' || 'forumBoardDescription' in stepConfig) {
      throw new Error('Legacy workbench board description was not migrated to the type prompt');
    }

    const worldSlots = useWorldSlotsStore();
    worldSlots.rehydrateFromSettings();
    const migratedSlot = worldSlots.getSlot('legacy-slot');
    const rawWorldEnvelope = _.get(extension_settings, worldSlotsField) as
      { scopes?: Record<string, unknown> } | undefined;
    const rawWorldScope = rawWorldEnvelope?.scopes?.[scopeKey] as Record<string, unknown> | undefined;
    const rawSlot = Array.isArray(rawWorldScope?.slots) ? (rawWorldScope.slots[0] as Record<string, unknown>) : null;
    if (
      !migratedSlot?.content.includes('旧版人物') ||
      !migratedSlot.content.includes('旧版资料正文') ||
      !rawSlot ||
      'profileEntryIds' in rawSlot ||
      'type' in rawSlot ||
      'bookName' in (rawWorldScope ?? {})
    ) {
      throw new Error('Legacy world slot fields were not migrated into the current slot content');
    }
    await phone.goHome();
  } else if (name === 'home-tasks' || name === 'home-tasks-dark') {
    if (name === 'home-tasks-dark') useSettingsStore().setTheme('dark');
    createGenerationTaskFixture();
    await phone.goHome();
  } else if (name === 'bagu-scan-actions' || name === 'bagu-scan-applied') {
    const templateText = '开头，这是一个漫长等待的眼神，结尾。';
    const createTemplateRule = (suggestion: string) => ({
      createdAt: '2026-08-09T00:00:00.000Z',
      enabled: true,
      flags: '',
      id: `visual-template-${suggestion || 'empty'}`,
      note: '',
      pattern: '{这|那}是{一个|一种|某种}…{动作|姿态|神情|眼神|表情}',
      replacements: [],
      sources: [],
      suggestion,
      targets: [],
      template: '{这|那}是{一个|一种|某种}…{动作|姿态|神情|眼神|表情}',
      title: '视觉句式规则',
      type: 'template' as const,
      updatedAt: '2026-08-09T00:00:00.000Z',
    });
    const emptyTemplateGroups = groupBaguHitsBySentence(
      templateText,
      scanTextWithBaguRules(templateText, [createTemplateRule('')]),
    );
    const capturedTemplateGroups = groupBaguHitsBySentence(
      templateText,
      scanTextWithBaguRules(templateText, [createTemplateRule('{{中间内容}}')]),
    );
    const emptyTemplatePreview = buildBaguSentenceReplacement(emptyTemplateGroups[0]);
    const capturedTemplatePreview = buildBaguSentenceReplacement(capturedTemplateGroups[0]);
    if (emptyTemplatePreview !== '开头，，结尾。' || capturedTemplatePreview !== '开头，漫长等待的，结尾。') {
      throw new Error('Template replacement did not respect the explicit middle-content placeholder');
    }

    const entry = createTheaterBaguFixture();
    resetPhoneToRoute('theater', 'bagu-scan', '八股检测', { entryId: entry.id });
    await waitForPaint();
    const sentenceCards = document.querySelectorAll('.pc-bagu-hit-card');
    const matchRows = document.querySelectorAll('.pc-bagu-match-row');
    const mergedPreview = document.querySelector<HTMLTextAreaElement>('.pc-bagu-edit textarea')?.value || '';
    if (
      sentenceCards.length !== 1 ||
      matchRows.length !== 4 ||
      !['犹如', '下意识', '愣住', '目光中透出'].every(replacement => mergedPreview.includes(replacement))
    ) {
      throw new Error('Bagu hits in one sentence were not merged into one editable sentence card');
    }
    if (name === 'bagu-scan-applied') {
      document.querySelector<HTMLButtonElement>('.pc-bagu-scan-actions .accent')?.click();
      await waitForPaint();
    }
  } else if (name === 'cloud-media-generate') {
    resetPhoneToRoute('cloud-media', 'generate', 'AI 云媒体');
  } else if (name === 'cloud-media-settings') {
    resetPhoneToRoute('cloud-media', 'settings', '云媒体配置');
  } else if (name === 'entry-library-action-menu') {
    resetPhoneToRoute('entry-library', 'root', '条目库');
    await waitForPaint();
    document.querySelector<HTMLDetailsElement>('.pc-entry-library-head .pc-action-menu')?.setAttribute('open', '');
  } else if (name === 'entry-library-manual-create') {
    const library = useEntryLibraryStore();
    library.importBackup({ bindings: [], groups: [], items: [], version: 1 });
    resetPhoneToRoute('entry-library', 'root', '条目库');
    await waitForPaint();
    const addMenu = document.querySelectorAll<HTMLDetailsElement>('.pc-entry-library-head .pc-action-menu')[1];
    addMenu?.setAttribute('open', '');
    await waitForPaint();
    [...(addMenu?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find(button => button.textContent?.includes('手动新建'))
      ?.click();
    await waitForPaint();
    const titleField = document.querySelector<HTMLInputElement>('.pc-entry-item-editor .pc-field');
    const contentField = document.querySelector<HTMLTextAreaElement>('.pc-entry-item-editor .pc-area');
    if (!titleField || !contentField) throw new Error('Entry library manual editor did not open');
    titleField.value = '手动建立的文风条目';
    titleField.dispatchEvent(new Event('input', { bubbles: true }));
    contentField.value = '这是不依赖预设或世界书来源的手动条目内容。';
    contentField.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLButtonElement>('.pc-entry-item-editor .pc-primary-btn')?.click();
    const saved = await waitForVisualCondition(
      () => library.items.some(item => item.sourceType === 'manual') && usePhoneStore().currentRoute.page === 'root',
    );
    if (!saved) {
      throw new Error('Entry library manual item was not saved back to the directory');
    }
  } else if (name === 'comfy-action-menu') {
    resetPhoneToRoute('comfy', 'root', 'ComfyUI');
    await waitForPaint();
    document.querySelector<HTMLDetailsElement>('.pc-comfy-actions .pc-action-menu')?.setAttribute('open', '');
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
    const collectComboboxes = document.querySelectorAll<HTMLElement>('.pc-entry-library-collect-scroll .pc-combobox');
    const sourceCombobox = collectComboboxes[0];
    const groupCombobox = collectComboboxes[1];
    if (!sourceCombobox || !groupCombobox) throw new Error('Entry library collect selectors are missing');
    sourceCombobox.querySelector<HTMLInputElement>('.pc-combobox-input')?.click();
    await waitForPaint();
    [...sourceCombobox.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')]
      .find(option => option.textContent?.includes('视觉世界书'))
      ?.click();
    await waitForPaint();
    groupCombobox.querySelector<HTMLInputElement>('.pc-combobox-input')?.click();
    await waitForPaint();
    const groupNames = [...groupCombobox.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')]
      .map(option => option.textContent?.trim() ?? '')
      .filter(name => name.startsWith('分组'));
    if (groupNames.join('|') !== '分组 2|分组 10') {
      throw new Error(`Entry library groups are not naturally sorted: ${groupNames.join('|')}`);
    }
    groupCombobox.querySelector<HTMLButtonElement>('.pc-combobox-toggle')?.click();
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
    const addMenu = document.querySelectorAll<HTMLDetailsElement>('.pc-entry-library-head .pc-action-menu')[1];
    addMenu?.setAttribute('open', '');
    await waitForPaint();
    [...(addMenu?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find(button => button.textContent?.includes('预设或世界书'))
      ?.click();
    await waitForPaint();
    document.querySelectorAll<HTMLButtonElement>('.pc-entry-library-page .pc-segment-btn')[1]?.click();
    await waitForPaint();
    const sourceCombobox = document.querySelector<HTMLElement>('.pc-entry-library-collect-scroll .pc-combobox');
    if (!sourceCombobox) throw new Error('Entry library source selector is missing');
    sourceCombobox.querySelector<HTMLInputElement>('.pc-combobox-input')?.click();
    await waitForPaint();
    [...sourceCombobox.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')]
      .find(option => option.textContent?.includes('视觉世界书'))
      ?.click();
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
    const addMenu = [...document.querySelectorAll<HTMLElement>('.pc-entry-library-head .pc-action-menu')].find(menu =>
      menu.querySelector('summary')?.textContent?.includes('新增'),
    );
    addMenu?.querySelector<HTMLElement>('summary')?.click();
    await waitForPaint();
    const manualCreateButton = [
      ...(addMenu?.querySelectorAll<HTMLButtonElement>('.pc-action-menu-panel button') ?? []),
    ].find(button => button.textContent?.includes('手动新建'));
    if (!manualCreateButton) throw new Error('Entry library manual create action is missing');
    manualCreateButton.click();
    await waitForPaint();
    if (screen.scrollTop !== 0) throw new Error('New entry library route did not start at the top');
    await usePhoneStore().goBack();
    await waitForPaint();
    if (Math.abs(screen.scrollTop - rootScrollTop) > 1) {
      throw new Error(`Entry library root scroll was not restored: ${screen.scrollTop} !== ${rootScrollTop}`);
    }
  } else if (name === 'world-slots-entry-library') {
    useSettingsStore().setTheme('light');
    const { firstEntry } = createProfilesFixture();
    const profileReference = getRegisteredPhoneAppReferenceTrees()
      .flatMap(root => (root.kind === 'branch' ? root.children : [root]))
      .find(node => node.kind === 'leaf' && node.item.id === `profiles:${firstEntry.id}`);
    if (
      !profileReference ||
      profileReference.kind !== 'leaf' ||
      profileReference.item.content.includes('分类：人物') ||
      profileReference.item.timeLabel === '人物'
    ) {
      throw new Error('Profile reference still duplicates its type metadata');
    }
    const library = useEntryLibraryStore();
    library.importBackup({
      bindings: [],
      groups: [
        {
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          id: 'visual-world-slot-library',
          name: '世界书素材',
        },
      ],
      items: [
        {
          content: `这是从条目库插入的测试正文。${'LONG_UNBROKEN_REFERENCE_CONTENT_'.repeat(12)}`,
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          groupId: 'visual-world-slot-library',
          id: 'visual-world-slot-entry',
          order: 1,
          sourceEntryId: '1',
          sourceName: '视觉世界书',
          sourceType: 'worldbook',
          title: '条目库测试条目',
          updatedAt: '2026-07-31T00:00:02.000Z',
        },
      ],
      version: 1,
    });
    resetPhoneToRoute('world-slots', 'editor', '新增槽位');
    await waitForPaint();
    const referenceToggle = document.querySelector<HTMLButtonElement>('.pc-reference-toggle');
    if (!referenceToggle?.textContent?.includes('插入条目库或 App 内容')) {
      throw new Error('World slot entry library insertion control is missing');
    }
    if (!document.querySelector('.pc-reference-body')) {
      referenceToggle.click();
      await waitForPaint();
    }
    const firstRoot = document.querySelector<HTMLElement>('.pc-reference-tree > .pc-reference-branch > .branch');
    if (!firstRoot?.textContent?.includes('条目库')) {
      throw new Error('Entry library is not the first world slot reference source');
    }
    const libraryGroup = [...document.querySelectorAll<HTMLButtonElement>('.pc-reference-node.branch')].find(button =>
      button.textContent?.includes('世界书素材'),
    );
    if (!libraryGroup) throw new Error('Entry library group is missing from the world slot reference picker');
    libraryGroup.click();
    await waitForPaint();
    const entryOption = [...document.querySelectorAll<HTMLElement>('.pc-reference-node.leaf')].find(option =>
      option.textContent?.includes('条目库测试条目'),
    );
    if (!entryOption) throw new Error('Entry library item is missing from the world slot reference picker');
    entryOption.click();
    await waitForPaint();
    const selectedList = document.querySelector<HTMLElement>('.pc-reference-selected-list.compact');
    if (
      !selectedList ||
      selectedList.querySelector('textarea') ||
      !selectedList.querySelector('.pc-reference-drag-handle')
    ) {
      throw new Error('World slot selected references are not compact and reorderable');
    }
    const slotsApp = document.querySelector<HTMLElement>('.pc-world-slots-app');
    if (!slotsApp || slotsApp.scrollWidth > slotsApp.clientWidth + 1) {
      throw new Error('Selected reference content expanded the world slot editor width');
    }
    const mergeButton = document.querySelector<HTMLButtonElement>('.pc-world-import-controls .pc-primary-btn');
    if (!mergeButton?.textContent?.includes('合并所选')) throw new Error('World slot merge action is missing');
    mergeButton.click();
    await waitForPaint();
    const contentArea = document.querySelector<HTMLTextAreaElement>('.pc-world-area');
    if (
      !contentArea?.value.startsWith('这是从条目库插入的测试正文。') ||
      contentArea.value.includes('## 条目库测试条目')
    ) {
      throw new Error('Entry library item was not inserted as prefix-free content');
    }
    const titleField = document.querySelector<HTMLInputElement>('input[placeholder="槽位名称"]');
    if (titleField?.value !== '条目库测试条目') {
      throw new Error('Single merged reference did not populate the empty world slot title');
    }
    if (!titleField || !contentArea) throw new Error('World slot editor fields are missing');
    titleField.value = '';
    titleField.dispatchEvent(new Event('input', { bubbles: true }));
    contentArea.value = '';
    contentArea.dispatchEvent(new Event('input', { bubbles: true }));
    if (!document.querySelector('.pc-reference-body')) {
      referenceToggle.click();
      await waitForPaint();
    }
    const profilesRoot = [
      ...document.querySelectorAll<HTMLButtonElement>('.pc-reference-tree > .pc-reference-branch > button.branch'),
    ].find(button => button.textContent?.includes('资料表'));
    if (!profilesRoot) throw new Error('Profiles source is missing from the world slot reference picker');
    let profileOption = [...document.querySelectorAll<HTMLElement>('.pc-reference-node.leaf')].find(option =>
      option.textContent?.includes(firstEntry.title),
    );
    if (!profileOption) {
      profilesRoot.click();
      await waitForPaint();
      profileOption = [...document.querySelectorAll<HTMLElement>('.pc-reference-node.leaf')].find(option =>
        option.textContent?.includes(firstEntry.title),
      );
    }
    if (!profileOption) throw new Error('Profile entry is missing from the world slot reference picker');
    profileOption.click();
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-world-import-controls .pc-primary-btn')?.click();
    await waitForPaint();
    if (titleField.value !== firstEntry.title || contentArea.value !== profileReference.item.content.trim()) {
      throw new Error('Merged profile reference did not preserve its title and prefix-free content');
    }
  } else if (name === 'world-slots-root-cleanup') {
    const worldSlots = useWorldSlotsStore();
    worldSlots.resetCurrentScope();
    worldSlots.createSlot({
      content: 'LONG_UNBROKEN_WORLD_SLOT_CONTENT_'.repeat(20),
      title: '关系变化'.repeat(20),
    });
    resetPhoneToRoute('world-slots', 'root', '世界书槽位');
    await waitForPaint();
    if (!document.querySelector<HTMLInputElement>('.pc-world-search-toolbar input[type="search"]')) {
      throw new Error('World slot search field is missing');
    }
    if (document.querySelector('.pc-world-search-toolbar select, .pc-world-search-toolbar .pc-combobox')) {
      throw new Error('Legacy world slot type filter is still visible');
    }
    const slotsApp = document.querySelector<HTMLElement>('.pc-world-slots-app');
    if (!slotsApp || slotsApp.scrollWidth > slotsApp.clientWidth + 1) {
      throw new Error('Long world slot content expanded the App width');
    }
  } else if (name === 'world-slots-batch-import') {
    useSettingsStore().setTheme('light');
    const worldSlots = useWorldSlotsStore();
    worldSlots.resetCurrentScope();
    const library = useEntryLibraryStore();
    library.importBackup({
      bindings: [],
      groups: [
        {
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          id: 'visual-world-slot-batch-library',
          name: '批量素材',
        },
      ],
      items: [
        {
          content: '条目库批量正文。',
          createdAt: '2026-07-31T00:00:02.000Z',
          enabled: true,
          groupId: 'visual-world-slot-batch-library',
          id: 'visual-world-slot-batch-entry',
          order: 1,
          sourceEntryId: '1',
          sourceName: '视觉世界书',
          sourceType: 'worldbook',
          title: '条目库批量条目',
          updatedAt: '2026-07-31T00:00:02.000Z',
        },
      ],
      version: 1,
    });
    const theater = useTheaterStore();
    theater.resetCurrentScope();
    theater.createEntry({
      content: '小剧场批量正文。',
      participants: [],
      renderMode: 'markdown',
      title: '小剧场批量条目',
      typeName: '批量素材',
    });
    resetPhoneToRoute('world-slots', 'editor', '新增槽位');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-reference-toggle')?.click();
    await waitForPaint();
    const openReferenceGroup = (rootLabel: string, groupLabel: string) => {
      const root = [...document.querySelectorAll<HTMLElement>('.pc-reference-tree > .pc-reference-branch')].find(
        branch =>
          branch.querySelector<HTMLElement>(':scope > .pc-reference-node.branch .pc-reference-node-title')
            ?.textContent === rootLabel,
      );
      const group = root
        ? [...root.querySelectorAll<HTMLButtonElement>('.pc-reference-node.branch')].find(
            button => button.querySelector('.pc-reference-node-title')?.textContent === groupLabel,
          )
        : null;
      if (!group) throw new Error(`World slot reference group is missing: ${rootLabel} / ${groupLabel}`);
      group.click();
    };
    openReferenceGroup('条目库', '批量素材');
    openReferenceGroup('小剧场', '批量素材');
    await waitForPaint();
    const selectReference = (title: string) => {
      const option = [...document.querySelectorAll<HTMLElement>('.pc-reference-node.leaf')].find(element =>
        element.textContent?.includes(title),
      );
      if (!option) throw new Error(`World slot batch reference is missing: ${title}`);
      option.click();
    };
    selectReference('条目库批量条目');
    await waitForPaint();
    selectReference('小剧场批量条目');
    await waitForPaint();
    const orderField = document.querySelector<HTMLInputElement>('.pc-world-basic-grid input[type="number"]');
    if (!orderField) throw new Error('World slot insertion order field is missing');
    orderField.value = '240';
    orderField.dispatchEvent(new Event('input', { bubbles: true }));
    const separateMode = [
      ...document.querySelectorAll<HTMLButtonElement>('.pc-world-import-controls .pc-segment-btn'),
    ].find(button => button.textContent?.includes('每项一条'));
    separateMode?.click();
    await waitForPaint();
    const createButton = document.querySelector<HTMLButtonElement>('.pc-world-import-controls .pc-primary-btn');
    if (!createButton?.textContent?.includes('创建 2 条')) {
      throw new Error('World slot separate batch action is missing');
    }
    createButton.click();
    await waitForPaint();
    const created = worldSlots.slots.slice(0, 2);
    if (
      created.map(slot => slot.title).join('|') !== '条目库批量条目|小剧场批量条目' ||
      created.map(slot => slot.insertionOrder).join('|') !== '240|241' ||
      created.map(slot => slot.content).join('|') !== '条目库批量正文。|小剧场批量正文。'
    ) {
      throw new Error('World slot separate batch import did not preserve selection order, content, and numeric order');
    }
    resetPhoneToRoute('world-slots', 'editor', '新增槽位');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-reference-toggle')?.click();
    await waitForPaint();
    openReferenceGroup('条目库', '批量素材');
    openReferenceGroup('小剧场', '批量素材');
    await waitForPaint();
    selectReference('条目库批量条目');
    await waitForPaint();
    selectReference('小剧场批量条目');
    await waitForPaint();
    [...document.querySelectorAll<HTMLButtonElement>('.pc-world-import-controls .pc-segment-btn')]
      .find(button => button.textContent?.includes('每项一条'))
      ?.click();
    await waitForPaint();
  } else if (name === 'mvu-modifier-tree') {
    useSettingsStore().setTheme('light');
    resetPhoneToRoute('mvu-modifier', 'root', 'MVU 修改器');
    await waitForPaint();
    const worldRow = [...document.querySelectorAll<HTMLButtonElement>('.pc-mvu-tree-main')].find(button =>
      button.textContent?.includes('世界'),
    );
    if (!worldRow) throw new Error('MVU variable tree did not render stat_data root objects');
    worldRow.click();
    await waitForPaint();
    const packageRow = [...document.querySelectorAll<HTMLButtonElement>('.pc-mvu-tree-main.leaf')].find(button =>
      button.textContent?.includes('当前套餐'),
    );
    if (!packageRow) throw new Error('MVU variable tree did not expand nested values');
    packageRow.click();
    await waitForPaint();
    const editor = document.querySelector<HTMLTextAreaElement>('.pc-mvu-inline-editor textarea');
    if (!editor || editor.value !== '基础套餐') throw new Error('MVU string editor did not load the current value');
    editor.value = '豪华套餐';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    const applyButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-mvu-editor-actions button')].find(
      button => button.textContent?.includes('应用'),
    );
    if (!applyButton) throw new Error('MVU inline editor apply button is missing');
    if (applyButton.disabled) throw new Error('MVU inline editor apply button remained disabled after loading');
    applyButton.click();
    const editPersisted = await waitForVisualCondition(
      () => _.get(Mvu.getMvuData({ type: 'message', message_id: 'latest' }), 'stat_data.世界.当前套餐') === '豪华套餐',
    );
    if (!editPersisted) {
      const toastText = document.querySelector('.toast')?.textContent?.trim() || 'no toast';
      const runtimeValue = _.get(Mvu.getMvuData({ type: 'message', message_id: 'latest' }), 'stat_data.世界.当前套餐');
      const editorState = document.querySelector<HTMLTextAreaElement>('.pc-mvu-inline-editor textarea');
      const treeText = [...document.querySelectorAll<HTMLButtonElement>('.pc-mvu-tree-main.leaf')]
        .find(button => button.textContent?.includes('当前套餐'))
        ?.textContent?.trim();
      throw new Error(
        `MVU inline edit was not persisted: value=${String(runtimeValue)}, editor=${editorState?.value ?? 'closed'}, tree=${treeText ?? 'missing'}, ${toastText}`,
      );
    }
    document.querySelector<HTMLButtonElement>('.pc-mvu-undo')?.click();
    const undoPersisted = await waitForVisualCondition(
      () => _.get(Mvu.getMvuData({ type: 'message', message_id: 'latest' }), 'stat_data.世界.当前套餐') === '基础套餐',
    );
    if (!undoPersisted) {
      throw new Error('MVU undo did not restore the previous value');
    }
    document.querySelector<HTMLButtonElement>('.pc-mvu-redo')?.click();
    const redoPersisted = await waitForVisualCondition(
      () => _.get(Mvu.getMvuData({ type: 'message', message_id: 'latest' }), 'stat_data.世界.当前套餐') === '豪华套餐',
    );
    if (!redoPersisted) {
      throw new Error('MVU redo did not restore the edited value');
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
    const visualGlobal = globalThis as typeof globalThis & {
      chatId: string;
      SillyTavern: { chatId: string };
    };
    const originalChatId = visualGlobal.chatId;
    const originalTavernChatId = visualGlobal.SillyTavern.chatId;
    try {
      visualGlobal.chatId = 'visual-chat-switched';
      visualGlobal.SillyTavern.chatId = 'visual-chat-switched';
      library.rehydrateFromSettings();
      const retainedBinding = library.bindings.find(binding => binding.targetPromptId === 'main');
      if (retainedBinding?.presetName !== '视觉预设' || retainedBinding.groupId !== 'visual-entry-group-2') {
        throw new Error('Entry library binding changed after switching chats');
      }
    } finally {
      visualGlobal.chatId = originalChatId;
      visualGlobal.SillyTavern.chatId = originalTavernChatId;
    }
    if (
      renderEntryLibraryBindingContent(`保留前文${ENTRY_LIBRARY_CONTENT_PLACEHOLDER}保留后文`, '') !==
      '保留前文保留后文'
    ) {
      throw new Error('Entry library empty group rendering removed static preset content');
    }
    resetPhoneToRoute('entry-library', 'bindings', '分组绑定');
    await waitForPaint();
    const bindingComboboxes = document.querySelectorAll<HTMLElement>('.pc-entry-binding-editor .pc-combobox');
    const presetCombobox = bindingComboboxes[0];
    const promptCombobox = bindingComboboxes[1];
    if (!presetCombobox || !promptCombobox) throw new Error('Entry library binding selectors are missing');
    const selectComboboxOption = async (combobox: HTMLElement, label: string) => {
      combobox.querySelector<HTMLInputElement>('.pc-combobox-input')?.click();
      await waitForPaint();
      const option = [...combobox.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
        button.textContent?.includes(label),
      );
      if (!option) throw new Error(`Entry library binding option is missing: ${label}`);
      option.click();
      await waitForPaint();
    };
    await selectComboboxOption(presetCombobox, '视觉预设');
    await waitForPaint();
    promptCombobox.querySelector<HTMLInputElement>('.pc-combobox-input')?.click();
    await waitForPaint();
    const boundOption = [...promptCombobox.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(option =>
      option.textContent?.includes('系统提示词'),
    );
    if (!boundOption?.disabled || !boundOption.textContent?.includes('已绑定')) {
      throw new Error('Already bound preset prompt is not disabled in the entry library binding form');
    }
    await selectComboboxOption(promptCombobox, '文风与人物一致性');
    const templateField = document.querySelector<HTMLTextAreaElement>('.pc-entry-binding-template textarea');
    const originalContent = '保持人物语言与原聊天一致。';
    if (templateField?.value !== originalContent) {
      throw new Error('Selected preset prompt content was not loaded into the entry library binding template');
    }
    templateField.focus();
    templateField.setSelectionRange(2, 4);
    document.querySelector<HTMLButtonElement>('.pc-entry-binding-template .pc-soft-btn')?.click();
    await waitForPaint();
    const expectedTemplate = `${originalContent.slice(0, 4)}${ENTRY_LIBRARY_CONTENT_PLACEHOLDER}${originalContent.slice(4)}`;
    if (
      templateField.value !== expectedTemplate ||
      templateField.selectionStart !== 4 + ENTRY_LIBRARY_CONTENT_PLACEHOLDER.length ||
      templateField.selectionEnd !== templateField.selectionStart
    ) {
      throw new Error('Entry library placeholder insertion removed selected text or restored the caret incorrectly');
    }
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
      readerContentRuleId: '',
      readerTitleRuleId: '',
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
    const combobox = document.querySelector<HTMLElement>('.pc-entry-item-editor .pc-combobox');
    if (!combobox) throw new Error('Searchable select fixture is missing its combobox');
    combobox.querySelector<HTMLInputElement>('.pc-combobox-input')?.click();
    await waitForPaint();
    const search = combobox.querySelector<HTMLInputElement>('.pc-combobox-input');
    if (!search || !combobox.querySelector('.pc-combobox-menu')) {
      throw new Error('Shared searchable selector did not open in place');
    }
    search.value = '目标';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    const matchingOptions = combobox.querySelectorAll<HTMLButtonElement>('.pc-combobox-option');
    if (matchingOptions.length !== 1 || matchingOptions[0]?.textContent?.trim() !== '目标分组') {
      throw new Error('Shared searchable selector did not filter its options');
    }
    matchingOptions[0]?.click();
    await waitForPaint();
    if (search.value !== '目标分组') {
      throw new Error('Shared searchable selector did not update the selected value');
    }
    search.click();
    await waitForPaint();
    if (combobox.querySelectorAll('.pc-combobox-option').length !== 2) {
      throw new Error('Reopened searchable selector did not restore the full option list');
    }
  } else if (
    name === 'content-converter-source' ||
    name === 'content-converter-target' ||
    name === 'content-converter-complete'
  ) {
    const book = createSummaryFixture();
    const entry = book.entries[0];
    const diaryBook = name === 'content-converter-complete' ? createDiaryFixture() : null;
    const diaryEntryCount = diaryBook?.entries.length ?? 0;
    resetPhoneToRoute(
      'content-converter',
      'root',
      '内容转换',
      name !== 'content-converter-source' && entry ? { sourceAppId: 'summary', sourceIds: entry.id } : undefined,
    );
    if (name === 'content-converter-complete') {
      await waitForVisualCondition(
        () =>
          [...document.querySelectorAll<HTMLButtonElement>('button')].some(button =>
            button.textContent?.includes('确认转换'),
          ),
        2000,
      );
      const confirmButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button =>
        button.textContent?.includes('确认转换'),
      );
      if (!confirmButton) throw new Error('Cross-app conversion submit button was not rendered');
      confirmButton.click();
      await waitForPaint();
      if (!diaryBook || diaryBook.entries.length !== diaryEntryCount + 1) {
        throw new Error('Cross-app summary to diary conversion did not create an entry');
      }
      if (!document.querySelector<HTMLElement>('.pc-status-card.success')?.textContent?.includes('转换完成')) {
        throw new Error('Cross-app conversion did not reach its completion state');
      }
    }
  } else if (
    name === 'custom-app-conversion' ||
    name === 'custom-app-conversion-complete' ||
    name === 'custom-app-conversion-merge'
  ) {
    const {
      CustomAppContentDataSchema,
      CustomAppDefinitionsSettingsSchema,
      customAppDefinitionsField,
      customAppGlobalDataField,
    } = await import('@/apps/app-builder/schema');
    const { useCustomAppsStore } = await import('@/apps/app-builder/store');
    const timestamp = '2026-08-10T08:00:00.000Z';
    const appId = 'custom-visual-conversion';
    _.set(
      extension_settings,
      customAppDefinitionsField,
      CustomAppDefinitionsSettingsSchema.parse({
        definitions: [
          {
            id: appId,
            name: '灵感片段',
            icon: 'fa-lightbulb',
            description: '视觉测试自制 App',
            dataScope: 'global',
            creation: { manual: true, extract: true, generate: false },
            naming: { mode: 'first-line', template: '{{appName}} {{index}}' },
            extraction: { saveMode: 'separate' },
            display: { mode: 'markdown', sortDesc: false },
            referenceEnabled: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }),
    );
    _.set(
      extension_settings,
      customAppGlobalDataField,
      CustomAppContentDataSchema.parse({
        entries: [
          {
            id: 'visual-conversion-entry-1',
            appId,
            title: '雨夜重逢',
            content: '她在雨棚下停住脚步，认出了多年未见的人。',
            sourceLabel: '第 8 楼',
            sourceFloorEnd: 8,
            tags: ['重逢', '雨夜'],
            directoryOrder: 8,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          {
            id: 'visual-conversion-entry-2',
            appId,
            title: '未寄出的信',
            content: '抽屉里那封信没有署名，却留下了熟悉的墨水气味。',
            sourceLabel: '第 12 楼',
            sourceFloorEnd: 12,
            tags: ['书信', '线索'],
            directoryOrder: 12,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }),
    );
    useCustomAppsStore().rehydrateFromSettings();
    resetPhoneToRoute(appId, 'convert', '转换内容', {
      entryIds: 'visual-conversion-entry-1,visual-conversion-entry-2',
    });
    if (name !== 'custom-app-conversion') {
      await waitForPaint();
      if (name === 'custom-app-conversion-merge') {
        const mergeButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button =>
          button.textContent?.includes('合并为一条'),
        );
        if (!mergeButton) throw new Error('Custom app conversion merge mode was not rendered');
        mergeButton.click();
        await waitForPaint();
      }
      const confirmButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button =>
        button.textContent?.includes('确认转换'),
      );
      if (!confirmButton) throw new Error('Custom app conversion submit button was not rendered');
      confirmButton.click();
      await waitForPaint();
      const sourceEntries = useCustomAppsStore().getEntries(appId);
      if (sourceEntries.some(entry => entry.conversions.length !== 1)) {
        throw new Error('Custom app conversion records were not saved to every source entry');
      }
      const expectedTargetCount = name === 'custom-app-conversion-merge' ? 1 : 2;
      const targetIds = new Set(sourceEntries.flatMap(entry => entry.conversions[0]?.targetEntryIds ?? []));
      if (targetIds.size !== expectedTargetCount) {
        throw new Error('Custom app conversion target mapping did not match the selected batch mode');
      }
      const status = document.querySelector<HTMLElement>('.pc-status-card.success');
      if (!status?.textContent?.includes('转换完成')) {
        throw new Error('Custom app conversion did not reach its completion state');
      }
    }
  } else if (name === 'preview-session-navigation') {
    resetPhoneToRoute('settings', 'root', '设置');
    phone.pushPage('preview', '无会话预览');
    await phone.goBack();
    if (phone.currentRoute.page !== 'root') {
      throw new Error('A preview-named route without a registered session was still blocked by page-name inference');
    }

    const status = ref<'saved' | 'unsaved'>('unsaved');
    const stopPreviewSession = phone.registerPreviewSession({
      appId: 'settings',
      getStatus: () => status.value,
      page: 'preview',
    });
    try {
      phone.pushPage('preview', '显式预览会话');
      const leaveAttempt = phone.goBack();
      const leaveNoticeShown = await waitForVisualCondition(() =>
        [...document.querySelectorAll<HTMLElement>('.pc-phone-notice strong')].some(item =>
          item.textContent?.includes('离开预览'),
        ),
      );
      if (!leaveNoticeShown) throw new Error('An unsaved explicit preview session did not block navigation');
      const continueEditing = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(
        button => button.textContent?.includes('继续编辑'),
      );
      if (!continueEditing) throw new Error('Explicit preview session confirmation did not offer continued editing');
      continueEditing.click();
      await leaveAttempt;
      if (String(phone.currentRoute.page) !== 'preview') {
        throw new Error('Explicit preview session left after cancelling confirmation');
      }

      status.value = 'saved';
      await phone.goBack();
      if (String(phone.currentRoute.page) !== 'root') {
        throw new Error('A saved explicit preview session still blocked navigation');
      }
    } finally {
      stopPreviewSession();
    }
  } else if (name === 'card-writer-saved-preview') {
    const { useCardWriterStore } = await import('@/apps/card-writer/store');
    const writer = useCardWriterStore();
    writer.settings.documents = [];
    const savedDocument = writer.saveDocument({
      content: '## 角色基础\n\n这是已经保存的写卡成品。',
      sourceOwnerLabel: '测试角色',
      sourceLabel: '已保存测试成品',
      sourceScopeKey: 'char:0:chat:visual-current',
      targetWorldbookName: '',
      taskId: 'full-card',
      taskLabel: '一键写卡',
      title: '视觉写卡成品',
      worldbookIncluded: false,
      worldbookWritten: false,
    });
    resetPhoneToRoute('card-writer', 'library', '写卡成品');
    await waitForPaint();
    const documentMeta = document.querySelector<HTMLElement>('.pc-card-writer-document small');
    if (!documentMeta?.textContent?.includes('测试角色 / visual-current')) {
      throw new Error('Saved card writer document did not expose its source chat');
    }
    const cardWriterReferences = getRegisteredPhoneAppReferenceTrees().find(node => node.id === 'app:card-writer');
    if (
      cardWriterReferences?.kind !== 'branch' ||
      cardWriterReferences.children[0]?.kind !== 'branch' ||
      cardWriterReferences.children[0].children[0]?.kind !== 'leaf' ||
      cardWriterReferences.children[0].children[0].item.content !== savedDocument.content
    ) {
      throw new Error('Saved card writer document was not exposed as final-content reference data');
    }
    document.querySelector<HTMLButtonElement>('.pc-card-writer-document-open')?.click();
    const previewOpened = await waitForVisualCondition(
      () => phone.currentRoute.appId === 'card-writer' && phone.currentRoute.page === 'preview',
    );
    if (!previewOpened) throw new Error('Saved card writer document did not open its preview');
    if (!document.querySelector<HTMLButtonElement>('.pc-preview-toolbar button[title="复制生成内容"]')) {
      throw new Error('Card writer preview did not expose the copy action');
    }
    await phone.goBack();
    if (phone.currentRoute.page !== 'library') {
      throw new Error('Unchanged saved card writer preview still required leave confirmation');
    }

    document.querySelector<HTMLButtonElement>('.pc-card-writer-document-open')?.click();
    await waitForVisualCondition(() => phone.currentRoute.page === 'preview');
    const editButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-preview-toolbar button')].find(button =>
      button.textContent?.includes('编辑输出'),
    );
    if (!editButton) throw new Error('Card writer preview edit action is missing');
    editButton.click();
    await waitForPaint();
    const editor = document.querySelector<HTMLTextAreaElement>('.pc-content-edit-area');
    if (!editor) throw new Error('Card writer preview editor did not open');
    editor.value = `${savedDocument.content}\n\n已修改但尚未保存。`;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    const leaveAttempt = phone.goBack();
    const leaveNoticeShown = await waitForVisualCondition(() =>
      [...document.querySelectorAll<HTMLElement>('.pc-phone-notice strong')].some(item =>
        item.textContent?.includes('离开预览'),
      ),
    );
    if (!leaveNoticeShown) throw new Error('Modified card writer preview did not require leave confirmation');
    const continueEditing = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
      button.textContent?.includes('继续编辑'),
    );
    if (!continueEditing) throw new Error('Card writer leave confirmation did not offer continued editing');
    continueEditing.click();
    await leaveAttempt;
    if (String(phone.currentRoute.page) !== 'preview')
      throw new Error('Card writer preview left after cancelling confirmation');
  } else if (name.startsWith('app:')) {
    const appId = name.slice('app:'.length);
    const app = PHONE_APPS.find(item => item.id === appId);
    if (!app) throw new Error(`Unknown app visual scenario: ${name}`);
    resetPhoneToRoute(app.id, app.defaultRoute, app.name);
    if (appId === 'card-writer') {
      await waitForPaint();
      const materialToggle = document.querySelector<HTMLInputElement>(
        '.pc-card-writer-worldbook input[aria-label="使用世界书素材"]',
      );
      if (!materialToggle || materialToggle.checked) {
        throw new Error('Card writer worldbook material toggle is missing or enabled by default');
      }
      const targetInput = document.querySelector<HTMLInputElement>('.pc-card-writer-worldbook-select input');
      if (!targetInput || targetInput.value) {
        throw new Error('Card writer target worldbook is missing or selected automatically');
      }
    }
  } else if (name === 'archive-owner-list') {
    resetPhoneToRoute('archive', 'root', '聊天档案');
    await waitForPaint();
    const unusedTab = [...document.querySelectorAll<HTMLButtonElement>('.pc-tab-row .pc-segment-btn')].find(button =>
      button.textContent?.includes('未使用'),
    );
    if (!unusedTab) throw new Error('Archive unused-character tab is missing');
    unusedTab.click();
    await waitForPaint();
    const ownerRow = document.querySelector<HTMLElement>('.pc-owner-row');
    const avatar = ownerRow?.querySelector<HTMLElement>('.pc-owner-avatar');
    const copy = ownerRow?.querySelector<HTMLElement>('.pc-owner-main');
    const arrow = ownerRow?.querySelector<HTMLElement>('.fa-chevron-right');
    if (!ownerRow || !avatar || !copy || !arrow) throw new Error('Archive character row is incomplete');
    const rowRect = ownerRow.getBoundingClientRect();
    const centers = [avatar, copy, arrow].map(element => {
      const rect = element.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    if (rowRect.height > 64) throw new Error(`Archive character row is too tall: ${rowRect.height}px`);
    if (Math.max(...centers) - Math.min(...centers) > 6) {
      throw new Error('Archive character row content wrapped onto multiple lines');
    }
  } else if (name === 'preset-detail') {
    resetPhoneToRoute('preset-manager', 'detail', '预设条目', { presetName: '视觉预设' });
  } else if (name === 'preset-copy-reorder') {
    const copied = await duplicateTavernPresetPrompt('视觉预设', 'visual-style', {
      content: '这是复制后修改过的视觉提示词，保存时应位于原条目下方。',
      enabled: false,
      name: '文风与人物一致性 - 副本',
      role: 'system',
    });
    let preset = readTavernPreset('视觉预设');
    const sourceIndex = preset.prompts.findIndex(prompt => prompt.id === 'visual-style');
    if (preset.prompts[sourceIndex + 1]?.id !== copied.copiedPromptId) {
      throw new Error('Copied preset prompt was not inserted below its source');
    }
    const groupPrompts = (
      (preset.extensions.baibaiToolkit as Record<string, unknown>)?.presetPromptGroups as {
        prompts?: Record<string, { groupId?: string }>;
      }
    )?.prompts;
    if (groupPrompts?.[copied.copiedPromptId]?.groupId !== 'visual-group-writing') {
      throw new Error('Copied preset prompt did not inherit its source group');
    }
    const reorderedIds = preset.prompts.map(prompt => prompt.id);
    reorderedIds.splice(reorderedIds.indexOf(copied.copiedPromptId), 1);
    reorderedIds.splice(reorderedIds.indexOf('visual-style'), 0, copied.copiedPromptId);
    await reorderTavernPresetPrompts('视觉预设', reorderedIds);
    await deleteTavernPresetPrompt('视觉预设', 'visual-format');
    preset = readTavernPreset('视觉预设');
    if (preset.prompts.some(prompt => prompt.id === 'visual-format')) {
      throw new Error('Deleted preset prompt remained in the prompt list');
    }
    const metadataAfterDelete = (
      (preset.extensions.baibaiToolkit as Record<string, unknown>)?.presetPromptGroups as {
        prompts?: Record<string, { groupId?: string }>;
      }
    )?.prompts;
    if (metadataAfterDelete?.['visual-format']) {
      throw new Error('Deleted preset prompt remained in BaiBai group metadata');
    }
    resetPhoneToRoute('preset-manager', 'detail', '预设条目', { presetName: '视觉预设' });
  } else if (name === 'preset-copy-editor') {
    resetPhoneToRoute('preset-manager', 'copy', '复制预设条目', {
      presetName: '视觉预设',
      sourcePromptId: 'visual-style',
    });
  } else if (name === 'preset-editor') {
    resetPhoneToRoute('preset-manager', 'edit', '编辑预设条目', {
      presetName: '视觉预设',
      promptId: 'visual-style',
    });
  } else if (name === 'preset-scroll-return') {
    resetPhoneToRoute('preset-manager', 'detail', '预设条目', { presetName: '视觉预设' });
    const loaded = await waitForVisualCondition(() => document.querySelectorAll('.pc-preset-prompt-main').length > 2);
    if (!loaded) throw new Error('Preset detail did not load for scroll restoration');
    const page = document.querySelector<HTMLElement>('.pc-preset-page');
    if (!page) throw new Error('Preset detail scroll container is missing');
    page.scrollTop = Math.max(80, page.scrollHeight - page.clientHeight - 20);
    await waitForPaint();
    const expectedScrollTop = page.scrollTop;
    const promptButtons = [...document.querySelectorAll<HTMLButtonElement>('.pc-preset-prompt-main')];
    promptButtons[promptButtons.length - 1]?.click();
    const editorLoaded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-editor-page')));
    if (!editorLoaded) throw new Error('Preset editor did not open for scroll restoration');
    await usePhoneStore().goBack();
    const returned = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-nodes')));
    if (!returned) throw new Error('Preset detail did not return from editor');
    await new Promise(resolve => window.setTimeout(resolve, 320));
    const restoredPage = document.querySelector<HTMLElement>('.pc-preset-page');
    if (!restoredPage || restoredPage.scrollTop < Math.max(0, expectedScrollTop - 8)) {
      throw new Error(`Preset scroll position was not restored: ${restoredPage?.scrollTop ?? -1}/${expectedScrollTop}`);
    }
  } else if (name === 'tutorial-article') {
    resetPhoneToRoute('tutorial', 'article', '{{phoneUserInput}} 宏', { articleId: 'phone-user-input' });
  } else if (name === 'tutorial-app-directory') {
    resetPhoneToRoute('tutorial', 'article', '全部 App 快速索引', { articleId: 'all-app-directory' });
    await waitForPaint();
    const directoryToggles = [...document.querySelectorAll<HTMLButtonElement>('.pc-tutorial-directory-toggle')];
    if (directoryToggles[0]?.getAttribute('aria-expanded') !== 'true') {
      throw new Error('Tutorial App directory did not expand the first group by default');
    }
    if (directoryToggles.slice(1).some(toggle => toggle.getAttribute('aria-expanded') !== 'false')) {
      throw new Error('Tutorial App directory expanded more than the first group by default');
    }
  } else if (name === 'tutorial-missing-article') {
    resetPhoneToRoute('tutorial', 'article', '不存在的教程', { articleId: 'missing-article' });
  } else if (name === 'tutorial-scroll-return') {
    resetPhoneToRoute('tutorial', 'root', '教程');
    await waitForPaint();
    const screen = document.querySelector<HTMLElement>('.pc-screen');
    if (!screen) throw new Error('Tutorial scroll fixture could not find the phone screen');
    screen.scrollTop = Math.min(360, screen.scrollHeight - screen.clientHeight);
    const expectedScrollTop = screen.scrollTop;
    if (expectedScrollTop < 100) throw new Error('Tutorial root was not tall enough to verify scroll restoration');
    phone.pushRoute('tutorial', 'article', '全部 App 快速索引', { articleId: 'all-app-directory' });
    await waitForPaint();
    await phone.goBack();
    await waitForPaint();
    if (Math.abs(screen.scrollTop - expectedScrollTop) > 2) {
      throw new Error(`Tutorial scroll was not restored: ${screen.scrollTop} !== ${expectedScrollTop}`);
    }
  } else if (name === 'tutorial-search-results') {
    resetPhoneToRoute('tutorial', 'root', '教程');
    await waitForPaint();
    const search = document.querySelector<HTMLInputElement>('.pc-tutorial-search input');
    if (!search) throw new Error('Tutorial search fixture could not find the search input');
    search.value = '中间内容';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    const snippet = document.querySelector<HTMLElement>('.pc-tutorial-match');
    if (!snippet?.textContent?.includes('中间内容')) {
      throw new Error('Tutorial search did not expose a matching body snippet');
    }
  } else if (name === 'app-deferred-mount-order') {
    const phone = usePhoneStore();
    phone.isOpen = false;
    phone.stack = [{ appId: 'home', page: 'home', title: '酒馆手机' }];
    await waitForPaint();

    resetPhoneToRoute('summary', 'root', '总结');
    resetPhoneToRoute('theater', 'root', '小剧场');
    await waitForPaint();
    if (!document.querySelector('.pc-theater-app') || document.querySelector('.pc-summary-app')) {
      throw new Error('Deferred app mount rendered a stale app after a rapid route switch');
    }

    phone.isOpen = false;
    await waitForPaint();
    if (document.querySelector('.pc-theater-app')) {
      throw new Error('Deferred app mount kept the active app DOM rendered while the phone was closed');
    }

    phone.isOpen = true;
    await waitForPaint();
    if (!document.querySelector('.pc-theater-app')) {
      throw new Error('Deferred app mount did not reactivate the cached app when the phone reopened');
    }
  } else if (name === 'worldbook-link-legacy-entry') {
    resetPhoneToRoute('worldbook-link', 'detail', '【视觉】旧格式世界书', { bookName: '【视觉】旧格式世界书' });
    const loaded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-worldbook-entry')));
    if (!loaded) throw new Error('Legacy worldbook entry did not load through the raw fallback');
    const toggle = document.querySelector<HTMLInputElement>('.pc-worldbook-entry .pc-toggle input');
    if (!toggle?.checked) throw new Error('Legacy worldbook entry did not preserve its enabled state');
    toggle.click();
    const toggled = await waitForVisualCondition(() => {
      const current = document.querySelector<HTMLInputElement>('.pc-worldbook-entry .pc-toggle input');
      return Boolean(current && !current.disabled && !current.checked);
    });
    if (!toggled) throw new Error('Legacy worldbook enabled/disable fields were not updated together');
  } else if (name === 'worldbook-entry-editor') {
    resetPhoneToRoute('worldbook-link', 'detail', '【视觉】旧格式世界书', { bookName: '【视觉】旧格式世界书' });
    const loaded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-worldbook-entry-open')));
    if (!loaded) throw new Error('Worldbook entry list did not load');
    document.querySelector<HTMLButtonElement>('.pc-worldbook-entry-open')?.click();
    const editorLoaded = await waitForVisualCondition(() =>
      Boolean(document.querySelector('.pc-worldbook-entry-editor')),
    );
    if (!editorLoaded) throw new Error('Worldbook entry editor did not open');
  } else if (name === 'reader-detail') {
    const reader = useReaderStore();
    reader.resetAllCaches();
    const briefs = await reader.loadBriefs(true);
    const brief = briefs[0];
    const messages = brief ? await reader.loadChat(brief.fileName, true) : [];
    const message = messages[0];
    if (!message) throw new Error('Reader visual fixture did not create a message');
    resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
  } else if (name === 'reader-theme-appearance') {
    const settingsStore = useSettingsStore();
    settingsStore.settings.reader.fontFamily = 'Courier New, monospace';
    settingsStore.settings.visualTheme.readerTextColor = '#7b3fe4';
    const reader = useReaderStore();
    reader.resetAllCaches();
    const briefs = await reader.loadBriefs(true);
    const brief = briefs[0];
    const messages = brief ? await reader.loadChat(brief.fileName, true) : [];
    const message = messages[0];
    if (!message) throw new Error('Reader appearance fixture did not create a message');
    resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
    const contentLoaded = await waitForVisualCondition(
      () => Boolean(document.querySelector('.pc-reader-content')),
      2_000,
    );
    if (!contentLoaded) throw new Error('Reader appearance content did not finish loading');
    const content = document.querySelector<HTMLElement>('.pc-reader-content');
    if (!content) throw new Error('Reader appearance content is missing');
    const appearance = getComputedStyle(content);
    if (!appearance.fontFamily.toLowerCase().includes('courier new')) {
      throw new Error('Reader font family did not reach the rendered content');
    }
    if (appearance.color !== 'rgb(123, 63, 228)') {
      throw new Error('Reader text color did not reach the rendered content');
    }
    const renderedText = content.querySelector<HTMLElement>('h1, h2, h3, p, li, blockquote');
    if (!renderedText || !getComputedStyle(renderedText).fontFamily.toLowerCase().includes('courier new')) {
      throw new Error('Reader font family did not reach nested rendered text');
    }
  } else if (name === 'reader-footer-persistence') {
    const reader = useReaderStore();
    reader.resetAllCaches();
    const briefs = await reader.loadBriefs(true);
    const brief = briefs[0];
    const messages = brief ? await reader.loadChat(brief.fileName, true) : [];
    const message = messages[0];
    if (!message) throw new Error('Reader footer fixture did not create a message');
    resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
    await waitForPaint();
    await toggleReaderFooter();
    const stackLength = phone.stack.length;
    const nextButton = document.querySelector<HTMLButtonElement>('.pc-detail-nav button:last-child:not(:disabled)');
    if (!nextButton) throw new Error('Reader next button is missing from the persistent footer');
    nextButton.click();
    await waitForPaint();
    if (!document.querySelector('.pc-reader-footer-popover')) {
      throw new Error('Reader footer disappeared after an adjacent navigation action');
    }
    if (phone.stack.length !== stackLength) {
      throw new Error('Reader adjacent navigation added an unnecessary history entry');
    }
    await toggleReaderFooter();
    if (document.querySelector('.pc-reader-footer-popover')) {
      throw new Error('Reader center tap did not hide the persistent footer');
    }
    await toggleReaderFooter();
  } else if (name === 'content-directory-sort-persistence') {
    const settings = useSettingsStore();
    settings.settings.directorySort.summaryDesc = false;
    settings.settings.directorySort.diaryDesc = false;
    settings.settings.directorySort.lettersDesc = false;

    const summaryBook = createSummaryFixture();
    resetPhoneToRoute('summary', 'book', summaryBook.title, { bookId: summaryBook.id });
    await waitForPaint();
    const summarySortButton = document.querySelector<HTMLButtonElement>('.pc-summary-book-toolbar .pc-directory-sort');
    summarySortButton?.click();
    await waitForPaint();
    phone.pushPage('root', '总结集');
    await waitForPaint();
    await phone.goBack();
    await waitForPaint();
    if (
      !settings.settings.directorySort.summaryDesc ||
      document.querySelector<HTMLButtonElement>('.pc-summary-book-toolbar .pc-directory-sort')?.title !==
        '当前倒序，切换正序'
    ) {
      throw new Error('Summary directory sort did not survive navigation');
    }

    const diaryBook = createDiaryFixture();
    resetPhoneToRoute('diary', 'book', diaryBook.title, { bookId: diaryBook.id });
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-diary-book-toolbar .pc-directory-sort')?.click();
    await waitForPaint();
    phone.pushPage('root', '日记');
    await waitForPaint();
    await phone.goBack();
    await waitForPaint();
    if (
      !settings.settings.directorySort.diaryDesc ||
      document.querySelector<HTMLButtonElement>('.pc-diary-book-toolbar .pc-directory-sort')?.title !==
        '当前倒序，切换正序'
    ) {
      throw new Error('Diary directory sort did not survive navigation');
    }

    const lettersBook = createLettersFixture();
    resetPhoneToRoute('letters', 'book', lettersBook.title, { bookId: lettersBook.id });
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-letters-book-filter .pc-directory-sort')?.click();
    await waitForPaint();
    phone.pushPage('root', '书信');
    await waitForPaint();
    await phone.goBack();
    await waitForPaint();
    if (
      !settings.settings.directorySort.lettersDesc ||
      document.querySelector<HTMLButtonElement>('.pc-letters-book-filter .pc-directory-sort')?.title !==
        '当前倒序，切换正序'
    ) {
      throw new Error('Letters directory sort did not survive navigation');
    }
  } else if (name === 'extras-summary-overview') {
    const { book, chapters } = createExtrasSummaryFixture();
    const historyContext = buildExtraHistoryContext(book, chapters);
    const expectedOrder = ['第 1-2 章压缩总结。', '第 3 章原文', '第 4-5 章压缩总结。'];
    if (
      expectedOrder.some((fragment, index) => {
        const position = historyContext.indexOf(fragment);
        const previousPosition = index > 0 ? historyContext.indexOf(expectedOrder[index - 1]!) : -1;
        return position < 0 || position <= previousPosition;
      }) ||
      historyContext.includes('第 1 章原文') ||
      historyContext.includes('第 2 章原文') ||
      historyContext.includes('第 4 章原文') ||
      historyContext.includes('第 5 章原文')
    ) {
      throw new Error('Enabled extra summaries did not replace covered chapters in chronological order');
    }
    const summarizable = getSummarizableChapters(book);
    if (summarizable.length !== 1 || summarizable[0]?.id !== chapters[2]?.id) {
      throw new Error('Previously summarized extra chapters were not hidden from summary selection');
    }

    resetPhoneToRoute('extras', 'book', book.title, { bookId: book.id });
    await waitForPaint();
    const summarySection = document.querySelector<HTMLDetailsElement>('.pc-summary-section');
    if (!summarySection || summarySection.open) throw new Error('Extra summary management did not start collapsed');
    if (document.querySelectorAll('.pc-entry-main').length !== chapters.length) {
      throw new Error('Extra summary compression removed chapters from the book directory');
    }

    document.querySelector<HTMLButtonElement>('.pc-entry-main')?.click();
    await waitForPaint();
    await openReaderCatalog();
    const catalogItems = [...document.querySelectorAll<HTMLElement>('.pc-catalog-item')];
    if (catalogItems.length !== chapters.length || catalogItems.some(item => item.textContent?.includes('总结'))) {
      throw new Error('Extra chapter navigation included summaries or omitted original chapters');
    }
    resetPhoneToRoute('extras', 'book', book.title, { bookId: book.id });
  } else if (name === 'content-versions') {
    const extras = useExtrasStore();
    const extraBook = createLegacyExtrasFixture();
    const chapter = extraBook.chapters[0];
    if (!chapter) throw new Error('Content version fixture did not create an extra chapter');
    chapter.updatedAt = '2000-01-01T00:00:00.000Z';
    extraBook.updatedAt = '2000-01-01T00:00:00.000Z';
    const extraSaved = extras.appendChapterVersion(extraBook.id, chapter.id, {
      content: '这是番外章节的重写版本，保存后立即成为当前版本。',
      title: '第一章候选版',
    });
    if (!extraSaved || chapter.content !== extraSaved.version.content || chapter.versions.length !== 2) {
      throw new Error('Extra rewrite did not activate the saved version');
    }
    if (chapter.updatedAt === '2000-01-01T00:00:00.000Z' || extraBook.updatedAt === '2000-01-01T00:00:00.000Z') {
      throw new Error('Extra active rewrite version did not update ordering timestamps');
    }

    const theater = useTheaterStore();
    const theaterEntry = createTheaterFixture();
    theaterEntry.updatedAt = '2000-01-01T00:00:00.000Z';
    const theaterSaved = theater.appendEntryVersion(theaterEntry.id, {
      content: '小剧场候选版本。',
      renderMode: 'markdown',
      title: '小剧场候选版',
    });
    if (!theaterSaved || theaterEntry.content !== theaterSaved.version.content) {
      throw new Error('Theater rewrite did not activate the saved version');
    }
    if (theaterEntry.updatedAt === '2000-01-01T00:00:00.000Z') {
      throw new Error('Theater active rewrite version did not update the ordering timestamp');
    }
    theater.updateEntryMetadata(theaterEntry.id, {
      participants: [{ name: '候选编辑参与者' }],
      typeId: 'visual-type-edited',
      typeName: '候选编辑类型',
    });
    if (
      theaterEntry.typeId !== 'visual-type-edited' ||
      theaterEntry.typeName !== '候选编辑类型' ||
      theaterEntry.participants[0]?.name !== '候选编辑参与者'
    ) {
      throw new Error('Theater version editor did not preserve shared type and participant fields');
    }

    const letters = useLettersStore();
    const letterBook = createLettersFixture();
    const letter = letterBook.entries[0];
    if (!letter) throw new Error('Content version fixture did not create a letter');
    letter.updatedAt = '2000-01-01T00:00:00.000Z';
    letterBook.updatedAt = '2000-01-01T00:00:00.000Z';
    const letterSaved = letters.appendEntryVersion(letterBook.id, letter.id, {
      content: '书信重写候选版本。',
      format: letter.format,
      title: '第一封信候选版',
    });
    if (!letterSaved || letter.content !== letterSaved.version.content) {
      throw new Error('Letter rewrite did not activate the saved version');
    }
    if (letter.updatedAt === '2000-01-01T00:00:00.000Z' || letterBook.updatedAt === '2000-01-01T00:00:00.000Z') {
      throw new Error('Letter active rewrite version did not update ordering timestamps');
    }

    resetPhoneToRoute('extras', 'chapter', extraSaved.version.title, {
      bookId: extraBook.id,
      chapterId: chapter.id,
      versionId: extraSaved.version.id,
    });
  } else if (name === 'content-version-interactions') {
    const extras = useExtrasStore();
    const book = createLegacyExtrasFixture();
    const chapter = book.chapters[0];
    if (!chapter) throw new Error('Content interaction fixture did not create an extra chapter');
    const saved = extras.appendChapterVersion(book.id, chapter.id, {
      content: '用于验证左右切换和采用操作的候选正文。',
      title: '番外交互候选版',
    });
    const originalVersion = chapter.versions[0];
    if (!saved || !originalVersion) throw new Error('Content interaction fixture did not create two versions');
    resetPhoneToRoute('extras', 'chapter', saved.version.title, {
      bookId: book.id,
      chapterId: chapter.id,
      versionId: saved.version.id,
    });
    await waitForPaint();

    const previousButton = document.querySelector<HTMLButtonElement>(
      '.pc-version-navigator button[title="上一个版本"]',
    );
    if (!previousButton) throw new Error('Version navigator did not expose the previous-version action');
    previousButton.click();
    const selectedOriginal = await waitForVisualCondition(
      () => usePhoneStore().currentRoute.params?.versionId === originalVersion.id,
    );
    if (!selectedOriginal || usePhoneStore().currentRoute.title !== originalVersion.title) {
      throw new Error('Previous-version action did not update the route and title');
    }

    const nextButton = document.querySelector<HTMLButtonElement>('.pc-version-navigator button[title="下一个版本"]');
    if (!nextButton) throw new Error('Version navigator did not expose the next-version action');
    nextButton.click();
    const selectedCandidate = await waitForVisualCondition(
      () => usePhoneStore().currentRoute.params?.versionId === saved.version.id,
    );
    if (!selectedCandidate || usePhoneStore().currentRoute.title !== saved.version.title) {
      throw new Error('Next-version action did not restore the candidate route and title');
    }

    nextButton.click();
    const wrappedToOriginal = await waitForVisualCondition(
      () => usePhoneStore().currentRoute.params?.versionId === originalVersion.id,
    );
    if (!wrappedToOriginal) throw new Error('Last version did not cycle back to the first version');

    const versionInput = document.querySelector<HTMLInputElement>('.pc-version-navigator input[type="number"]');
    if (!versionInput) throw new Error('Version navigator did not expose numeric jump input');
    versionInput.value = '2';
    versionInput.dispatchEvent(new Event('input', { bubbles: true }));
    versionInput.dispatchEvent(new Event('blur'));
    const jumpedToCandidate = await waitForVisualCondition(
      () => usePhoneStore().currentRoute.params?.versionId === saved.version.id,
    );
    if (!jumpedToCandidate) throw new Error('Numeric version jump did not select the requested version');

    if (chapter.activeVersionId !== saved.version.id || chapter.content !== saved.version.content) {
      throw new Error('Version selection did not immediately activate the viewed chapter');
    }
    if (document.querySelector('.pc-version-navigator .pc-primary-btn, .pc-version-actions')) {
      throw new Error('Version navigator still exposed separate adoption or deletion actions');
    }
    await toggleReaderFooter();
    const deleteButton = document.querySelector<HTMLButtonElement>('.pc-reader-footer-popover .danger');
    if (!deleteButton) throw new Error('Detail footer did not expose contextual version deletion');
    deleteButton.click();
    const deleteNoticeOpened = await waitForVisualCondition(() =>
      Boolean(document.querySelector('.pc-phone-notice-actions button[data-role="danger"]')),
    );
    if (!deleteNoticeOpened) throw new Error('Contextual version deletion did not request confirmation');
    document.querySelector<HTMLButtonElement>('.pc-phone-notice-actions button[data-role="danger"]')?.click();
    const deletedCurrentVersion = await waitForVisualCondition(
      () =>
        chapter.versions.length === 1 &&
        chapter.activeVersionId === originalVersion.id &&
        usePhoneStore().currentRoute.params?.versionId === originalVersion.id,
    );
    if (!deletedCurrentVersion)
      throw new Error('Deleting the viewed version did not show and activate its predecessor');
    phone.stack = [
      { appId: 'home', page: 'home', title: '酒馆手机' },
      { appId: 'extras', page: 'book', params: { bookId: book.id }, title: book.title },
      {
        appId: 'extras',
        page: 'chapter',
        params: { bookId: book.id, chapterId: chapter.id, versionId: originalVersion.id },
        title: originalVersion.title,
      },
      {
        appId: 'extras',
        page: 'chapter-generate',
        params: { bookId: book.id, chapterId: chapter.id },
        title: '重写章节',
      },
    ];
    phone.replacePage('chapter', originalVersion.title, {
      bookId: book.id,
      chapterId: chapter.id,
      versionId: originalVersion.id,
    });
    if (phone.stack.length !== 3) throw new Error('Returning from rewrite kept a duplicate detail route');
    await phone.goBack();
    if (phone.currentRoute.page !== 'book')
      throw new Error('Detail back navigation did not return directly to the catalog');
  } else if (name === 'content-version-deletion') {
    const extras = useExtrasStore();
    const extraBook = createLegacyExtrasFixture();
    const chapter = extraBook.chapters[0];
    if (!chapter) throw new Error('Version deletion fixture did not create an extra chapter');
    const originalGenerationRecord = createExtraChapterGenerationRecord({
      appPrompt: '',
      bookId: extraBook.id,
      chapterId: chapter.id,
      chapterMode: '新开一本书',
      fromStartEnd: 20,
      outputFormat: '',
      previousChapterContext: '',
      rangeText: '',
      recentCount: 20,
      references: [],
      singleMessageId: 0,
      sourceMode: 'latest',
      tavernPresetName: '',
      typeId: '',
      typeName: extraBook.typeName,
      typePrompt: '',
      userRequirement: '原版生成要求，应在删除重写版后保留。',
    });
    chapter.generationRecords = [originalGenerationRecord];
    const deletedGenerationRecord = createExtraChapterGenerationRecord({
      appPrompt: '',
      bookId: extraBook.id,
      chapterId: chapter.id,
      chapterMode: '重写当前章节',
      fromStartEnd: 20,
      outputFormat: '',
      previousChapterContext: '',
      rangeText: '',
      recentCount: 20,
      references: [],
      singleMessageId: 0,
      sourceMode: 'latest',
      tavernPresetName: '',
      typeId: '',
      typeName: extraBook.typeName,
      typePrompt: '',
      userRequirement: '重写版本要求，删除该版本后必须消失。',
    });
    const extraSaved = extras.appendChapterVersion(extraBook.id, chapter.id, {
      content: '准备删除的番外采用版本。',
      generationRecord: deletedGenerationRecord,
      title: '准备删除的番外版本',
    });
    const originalChapterVersion = chapter.versions[0];
    if (
      !extraSaved ||
      !originalChapterVersion ||
      resolveExtraChapterGenerationRecords(chapter).length !== 2 ||
      originalChapterVersion.generationRecord?.id !== originalGenerationRecord.id
    ) {
      throw new Error('Extra deletion fixture did not preserve distinct original and rewrite records');
    }
    extras.activateChapterVersion(extraBook.id, chapter.id, extraSaved.version.id);
    const extraResult = extras.deleteChapterVersion(extraBook.id, chapter.id, extraSaved.version.id);
    if (
      !extraResult ||
      chapter.versions.length !== 1 ||
      chapter.activeVersionId !== originalChapterVersion.id ||
      chapter.content !== originalChapterVersion.content ||
      chapter.generationRecords.some(record => record.id === deletedGenerationRecord.id) ||
      resolveExtraChapterGenerationRecords(chapter).length !== 1 ||
      resolveExtraChapterGenerationRecords(chapter)[0]?.id !== originalGenerationRecord.id
    ) {
      throw new Error('Deleting an extra version did not restore its neighbor or remove its generation record');
    }
    chapter.generationRecords = [originalGenerationRecord, deletedGenerationRecord];
    if (
      !synchronizeExtraChapterGenerationRecords(chapter) ||
      chapter.generationRecords.length !== 1 ||
      chapter.generationRecords[0]?.id !== originalGenerationRecord.id
    ) {
      throw new Error('Extra startup migration did not remove an orphaned generation record');
    }

    const theater = useTheaterStore();
    const theaterEntry = createTheaterFixture();
    const originalTheaterRecord = createVisualHiddenGenerationRecord('generate', '原小剧场版本要求');
    const deletedTheaterRecord = createVisualHiddenGenerationRecord('generate', '待删除小剧场版本要求');
    theaterEntry.generationRecord = originalTheaterRecord;
    const theaterSaved = theater.appendEntryVersion(theaterEntry.id, {
      content: '准备删除的小剧场采用版本。',
      generationRecord: deletedTheaterRecord,
      renderMode: theaterEntry.renderMode === 'markdown' ? 'frontend' : 'markdown',
      title: '准备删除的小剧场版本',
    });
    const originalTheaterVersion = theaterEntry.versions[0];
    if (!theaterSaved || !originalTheaterVersion)
      throw new Error('Theater deletion fixture did not create two versions');
    theater.activateEntryVersion(theaterEntry.id, theaterSaved.version.id);
    const theaterResult = theater.deleteEntryVersion(theaterEntry.id, theaterSaved.version.id);
    if (
      !theaterResult ||
      theaterEntry.activeVersionId !== originalTheaterVersion.id ||
      theaterEntry.content !== originalTheaterVersion.content ||
      theaterEntry.renderMode !== originalTheaterVersion.renderMode ||
      theaterEntry.generationRecord?.id !== originalTheaterRecord.id
    ) {
      throw new Error('Deleting the active theater version did not synchronize its content and render mode');
    }

    const forum = useForumStore();
    const { board, thread } = createForumFixture();
    const originalForumRecord = createVisualHiddenGenerationRecord('generate-thread', '原论坛版本要求');
    const deletedForumRecord = createVisualHiddenGenerationRecord('generate-thread', '待删除论坛版本要求');
    thread.generationRecord = originalForumRecord;
    const originalReplies = JSON.stringify(thread.replies);
    const forumSaved = forum.appendThreadVersion(board.id, thread.id, {
      author: '待删除版本楼主',
      content: '准备删除的论坛候选版本。',
      generationRecord: deletedForumRecord,
      replies: thread.replies.map(reply => ({
        ...reply,
        content: `待删除：${reply.content}`,
        id: `${reply.id}_delete`,
      })),
      title: '准备删除的论坛版本',
    });
    const originalForumVersion = thread.versions[0];
    if (!forumSaved || !originalForumVersion) throw new Error('Forum deletion fixture did not create two versions');
    const forumResult = forum.deleteThreadVersion(board.id, thread.id, forumSaved.version.id);
    if (
      !forumResult ||
      thread.activeVersionId !== originalForumVersion.id ||
      thread.content !== originalForumVersion.content ||
      thread.generationRecord?.id !== originalForumRecord.id ||
      JSON.stringify(thread.replies) !== originalReplies
    ) {
      throw new Error('Deleting a forum candidate version changed the active post or its replies');
    }

    const letters = useLettersStore();
    const letterBook = createLettersFixture();
    const letter = letterBook.entries[0];
    if (!letter) throw new Error('Letter deletion fixture did not create a letter');
    const originalLetterRecord = createVisualHiddenGenerationRecord('generate', '原书信版本要求');
    const deletedLetterRecord = createVisualHiddenGenerationRecord('generate', '待删除书信版本要求');
    letter.generationRecord = originalLetterRecord;
    const letterSaved = letters.appendEntryVersion(letterBook.id, letter.id, {
      content: '准备删除的书信采用版本。',
      format: letter.format === 'formal' ? 'email' : 'formal',
      generationRecord: deletedLetterRecord,
      title: '准备删除的书信版本',
    });
    const originalLetterVersion = letter.versions[0];
    if (!letterSaved || !originalLetterVersion) throw new Error('Letter deletion fixture did not create two versions');
    letters.activateEntryVersion(letterBook.id, letter.id, letterSaved.version.id);
    const letterResult = letters.deleteEntryVersion(letterBook.id, letter.id, letterSaved.version.id);
    if (
      !letterResult ||
      letter.activeVersionId !== originalLetterVersion.id ||
      letter.content !== originalLetterVersion.content ||
      letter.format !== originalLetterVersion.format ||
      letter.generationRecord?.id !== originalLetterRecord.id
    ) {
      throw new Error('Deleting the active letter version did not synchronize its content and format');
    }

    resetPhoneToRoute('extras', 'chapter', originalChapterVersion.title, {
      bookId: extraBook.id,
      chapterId: chapter.id,
      versionId: originalChapterVersion.id,
    });
    await waitForPaint();
    if (document.querySelector('.pc-generation-history')) {
      throw new Error('Extra generation records are still visible in the chapter detail UI');
    }
  } else if (name === 'extras-book-name-fallback') {
    if (resolveGeneratedExtraBookTitle(' ', ' IF线 ') !== 'IF线') {
      throw new Error('Generated extra book did not use its type as the missing title fallback');
    }
    if (resolveGeneratedExtraBookTitle(' ', ' ') !== '未命名番外') {
      throw new Error('Generated extra book did not preserve the final unnamed fallback');
    }
    resetPhoneToRoute('extras', 'book-editor', '新建番外');
  } else if (name === 'generation-connection-override') {
    const settingsStore = useSettingsStore();
    const generationAliases = useGenerationAliasesStore();
    const externalProfile = {
      apiKey: 'visual-key',
      apiUrl: 'https://visual.example/v1',
      id: 'visual-external-profile-3',
      model: 'visual-model-3',
      name: '视觉连接配置 3',
      presetId: 'custom' as const,
    };
    settingsStore.settings.textProvider.mode = 'tavern';
    settingsStore.settings.textProvider.activeExternalProfileId = '';
    settingsStore.settings.textProvider.externalProfiles = [externalProfile];
    settingsStore.settings.generation.tavernPresetName = '';
    generationAliases.charReplacement = '';
    generationAliases.userReplacement = '';
    const book = createSummaryFixture();
    resetPhoneToRoute('summary', 'generate', '生成总结', { bookId: book.id });
    await waitForPaint();
    document.querySelector<HTMLDetailsElement>('.pc-generation-advanced')?.setAttribute('open', '');
    await waitForPaint();

    const connectionCombobox = document.querySelector<HTMLElement>('.pc-generation-advanced-body .pc-combobox');
    if (!connectionCombobox) throw new Error('Generation connection selector is missing');
    const initialOverride = useGenerationOverrideStore().getOverride('summary', 'generate');
    if (initialOverride?.connectionSelection !== 'tavern') {
      throw new Error('Generation connection selector did not resolve the current concrete connection by default');
    }
    connectionCombobox.querySelector<HTMLButtonElement>('.pc-combobox-toggle')?.click();
    await waitForPaint();
    const connectionOptions = [...connectionCombobox.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')];
    if (connectionOptions.some(option => option.textContent?.includes('跟随连接设置'))) {
      throw new Error('Generation connection selector still exposes the legacy inherit option');
    }
    const externalOption = connectionOptions.find(option => option.textContent?.includes(externalProfile.name));
    if (!externalOption) throw new Error('Generation external connection option is missing');
    externalOption.click();
    await waitForPaint();

    const presetCombobox = document.querySelector<HTMLElement>('.pc-preset-field .pc-combobox');
    if (!presetCombobox) throw new Error('Generation temporary preset selector is missing');
    presetCombobox.querySelector<HTMLButtonElement>('.pc-combobox-toggle')?.click();
    await waitForPaint();
    const presetOption = [...presetCombobox.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(option =>
      option.textContent?.includes('视觉预设'),
    );
    if (!presetOption) throw new Error('Generation temporary preset option is missing');
    presetOption.click();
    await waitForPaint();

    const aliasInputs = [...document.querySelectorAll<HTMLInputElement>('.pc-generation-alias-grid input')];
    if (aliasInputs.length !== 2) throw new Error('Generation alias inputs are missing');
    aliasInputs[0].value = '玛修';
    aliasInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    aliasInputs[1].value = '藤丸立香';
    aliasInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    if (
      String(generationAliases.charReplacement) !== '玛修' ||
      String(generationAliases.userReplacement) !== '藤丸立香'
    ) {
      throw new Error('Generation alias inputs did not update the chat-scoped alias store');
    }
    const swapAliasButton = document.querySelector<HTMLButtonElement>(
      '.pc-generation-aliases button[title="互换角色与用户称呼"]',
    );
    if (!swapAliasButton) throw new Error('Generation alias swap action is missing');
    swapAliasButton.click();
    await waitForPaint();
    if (
      String(generationAliases.charReplacement) !== '藤丸立香' ||
      String(generationAliases.userReplacement) !== '玛修'
    ) {
      throw new Error('Generation alias swap action did not update both values');
    }
    swapAliasButton.click();
    await waitForPaint();
    const advancedSummary = document.querySelector('.pc-generation-advanced summary small')?.textContent || '';
    if (!advancedSummary.includes('玛修') || !advancedSummary.includes('藤丸立香')) {
      throw new Error('Generation advanced summary did not expose the active aliases');
    }

    const override = useGenerationOverrideStore().getOverride('summary', 'generate');
    if (override?.connectionSelection !== `external:${externalProfile.id}`) {
      throw new Error('Generation connection selection was not stored as a request-level override');
    }
    if (override.tavernPresetName !== '视觉预设') {
      throw new Error('Generation preset selection was not stored as a request-level override');
    }
    if (
      settingsStore.settings.textProvider.mode !== 'tavern' ||
      settingsStore.settings.textProvider.activeExternalProfileId ||
      settingsStore.settings.generation.tavernPresetName
    ) {
      throw new Error('Temporary generation overrides mutated the global connection or preset defaults');
    }
    const resolvedProvider = applyTextProviderSelection(
      settingsStore.settings.textProvider,
      override.connectionSelection,
    );
    if (resolvedProvider.mode !== 'external' || resolvedProvider.activeExternalProfileId !== externalProfile.id) {
      throw new Error('Generation request did not resolve the selected external connection profile');
    }
  } else if (name === 'preview-draft-deferred-save') {
    const previewDrafts = usePreviewDraftStore();
    const probePreview = ref({ content: '首次保存的预览内容' });
    let probeRouteParams: Record<string, string> = { bookId: 'visual_preserved_book' };
    const scope = effectScope();
    const persistence = scope.run(() =>
      usePreviewDraftPersistence({
        appId: 'visual-preview-probe',
        getPreview: () => probePreview.value,
        getRouteParams: () => ({ ...probeRouteParams }),
        page: 'preview',
        route: computed(() => usePhoneStore().currentRoute),
        setPreview: preview => {
          if (preview) probePreview.value = preview;
        },
        title: '草稿参数保留测试',
      }),
    );
    if (!persistence) throw new Error('Preview draft persistence probe did not initialize');
    persistence.persistPreviewDraft({ bookId: 'visual_preserved_book' });
    probeRouteParams = {};
    probePreview.value.content = '离开生成页后自动更新的预览内容';
    await nextTick();
    await waitForPaint();
    const probeDraft = previewDrafts.getPreviewDraft('visual-preview-probe', 'preview');
    if (probeDraft?.routeParams.bookId !== 'visual_preserved_book') {
      throw new Error('Preview draft auto-update overwrote its original target route parameters');
    }
    scope.stop();
    previewDrafts.deleteAppPreviewDrafts('visual-preview-probe');

    const extras = useExtrasStore();
    extras.resetCurrentScope();
    const book = extras.createBook({ title: '稍后处理测试番外', typeName: '测试' });
    previewDrafts.deleteAppPreviewDrafts('extras');
    resetPhoneToRoute('extras', 'root', '番外书架');
    await waitForPaint();
    previewDrafts.upsertPreviewDraft({
      appId: 'extras',
      page: 'chapter-preview',
      preview: {
        bookId: book.id,
        chapterId: '',
        content: '这是稍后处理的番外章节正文，用于确认离开生成页后仍然能够保存到原来的番外。',
        draftId: null,
        mode: '续写上一章',
        raw: '<title>稍后处理章节</title><content>这是稍后处理的番外章节正文。</content>',
        title: '稍后处理章节',
        warnings: [],
      },
      routeParams: { bookId: book.id },
      title: '番外预览',
    });
    await waitForPaint();
    const openDraftButton = document.querySelector<HTMLButtonElement>('.pc-preview-draft-notice .pc-primary-btn');
    if (!openDraftButton) throw new Error('Deferred preview draft notice did not appear');
    openDraftButton.click();
    await waitForPaint();
    usePhoneStore().replacePage('chapter-preview', '番外预览');
    await waitForPaint();
    const saveButton = document.querySelector<HTMLButtonElement>('.pc-preview-actions .pc-primary-btn');
    if (!saveButton) throw new Error('Deferred preview save button did not appear');
    saveButton.click();
    await waitForPaint();
    if (extras.getBook(book.id)?.chapters.length !== 1) {
      throw new Error('Deferred preview draft was not saved to its original extras book');
    }

    const summary = useSummaryStore();
    const summaryBook = createSummaryFixture();
    const summaryEntryCount = summaryBook.entries.length;
    previewDrafts.deleteAppPreviewDrafts('summary');
    resetPhoneToRoute('summary', 'root', '总结');
    await waitForPaint();
    previewDrafts.upsertPreviewDraft({
      appId: 'summary',
      page: 'preview',
      preview: {
        bookId: summaryBook.id,
        content: '这是一条稍后处理的总结正文，保存时应使用预览自身记录的目标总结集。',
        draftId: null,
        raw: '<title>稍后处理总结</title><content>这是一条稍后处理的总结正文。</content>',
        source: { label: '视觉测试楼层' },
        title: '稍后处理总结',
        warnings: [],
      },
      routeParams: {},
      title: '生成预览',
    });
    await waitForPaint();
    const openSummaryDraftButton = document.querySelector<HTMLButtonElement>(
      '.pc-preview-draft-notice .pc-primary-btn',
    );
    if (!openSummaryDraftButton) throw new Error('Deferred summary draft notice did not appear');
    openSummaryDraftButton.click();
    await waitForPaint();
    const saveSummaryButton = document.querySelector<HTMLButtonElement>('.pc-preview-actions .pc-primary-btn');
    if (!saveSummaryButton) throw new Error('Deferred summary save button did not appear');
    saveSummaryButton.click();
    await waitForPaint();
    if (summary.getBook(summaryBook.id)?.entries.length !== summaryEntryCount + 1) {
      throw new Error('Deferred preview draft was not saved to its original summary book');
    }
  } else if (name === 'extras-legacy-continuation') {
    const book = createLegacyExtrasFixture();
    resetPhoneToRoute('extras', 'chapter-generate', '生成章节', { bookId: book.id });
  } else if (name === 'extras-continuation-references') {
    const { adoptedReferences, sourceA, sourceB, targetBook } = createExtrasContinuationReferencesFixture();
    resetPhoneToRoute('extras', 'chapter-generate', '生成章节', { bookId: targetBook.id });
    await waitForPaint();
    const advanced = document.querySelector<HTMLDetailsElement>('.pc-generation-advanced');
    if (!advanced) throw new Error('Extras continuation advanced settings are missing');
    advanced.open = true;
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-reference-toggle')?.click();
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-reference-selected-toggle')?.click();
    await waitForPaint();
    const cards = [...document.querySelectorAll<HTMLElement>('.pc-reference-card')];
    const cardContents = cards.map(card => card.querySelector<HTMLTextAreaElement>('textarea')?.value || '');
    if (cards.length !== adoptedReferences.length) {
      const selectedCount = document.querySelector<HTMLElement>('.pc-reference-toggle b')?.textContent?.trim() || '0';
      throw new Error(
        `Continuation did not inherit all references from the currently adopted version (${cards.length}/${adoptedReferences.length}, selected ${selectedCount})`,
      );
    }
    if (cardContents[0] !== sourceB.content || cardContents[1] !== adoptedReferences[1]?.content) {
      throw new Error('Continuation did not preserve reference order or resolve current reference content');
    }
    if (cardContents[2] !== sourceA.content || cardContents.some(content => content.includes('候选版本引用'))) {
      throw new Error('Continuation inherited references from the unadopted candidate version');
    }
    if (!cards[1]?.querySelector('.pc-reference-unavailable')) {
      throw new Error('Missing continuation reference did not show its historical-content status');
    }
    cards[1].scrollIntoView({ block: 'center' });
    await waitForPaint();
  } else if (name === 'extras-chapter-detail') {
    const { book } = createExtrasGenerationRecordFixture();
    resetPhoneToRoute('extras', 'book', book.title, { bookId: book.id });
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-entry-main')?.click();
    await waitForPaint();
    if (document.querySelector('.pc-generation-history')) {
      throw new Error('Extra chapter detail still exposes hidden generation records');
    }
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
  } else if (name === 'workbench-forum-step') {
    createWorkbenchForumFixture();
    resetPhoneToRoute('workbench', 'root', '工作台');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-workflow-title')?.click();
    await waitForPaint();
    const forumStep = [...document.querySelectorAll<HTMLElement>('.pc-step-card')].find(card =>
      card.textContent?.includes('论坛'),
    );
    const typePromptArea = forumStep?.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder="板块类型提示词，可编辑"]',
    );
    if (!forumStep || !typePromptArea || forumStep.textContent?.includes('板块说明')) {
      throw new Error('Workbench forum step still uses the legacy board description design');
    }
    typePromptArea.scrollIntoView({ block: 'center' });
    await waitForPaint();
  } else if (name === 'profiles-empty-toolbar') {
    const profiles = useProfilesStore();
    profiles.resetCurrentScope();
    resetPhoneToRoute('profiles', 'root', '资料表');
    await waitForPaint();
    document.querySelector<HTMLInputElement>('.pc-profile-table-switcher .pc-combobox-input')?.click();
    await waitForPaint();
    const toolbar = document.querySelector<HTMLElement>('.pc-profiles-toolbar');
    const menu = document.querySelector<HTMLElement>('.pc-profile-table-switcher .pc-combobox-menu');
    if (!toolbar || !menu || menu.scrollHeight <= menu.clientHeight) {
      throw new Error('Profiles searchable table menu is missing or does not keep its own scroll area');
    }
  } else if (
    name === 'profiles-table' ||
    name === 'profiles-table-grid' ||
    name === 'profiles-table-editor' ||
    name === 'profiles-detail'
  ) {
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
    if (name === 'profiles-table-grid') {
      await waitForPaint();
      document.querySelectorAll<HTMLButtonElement>('.pc-profile-view-toggle .pc-segment-btn')[1]?.click();
      await waitForPaint();
      if (!document.querySelector('.pc-profile-table-header')) {
        throw new Error('Profiles table view did not render after switching modes');
      }
    }
  } else if (name === 'profiles-field-detail') {
    const { table } = createProfilesFixture();
    resetPhoneToRoute('profiles', 'table-editor', table.name, { tableId: table.id });
    await waitForPaint();
    document.querySelector<HTMLElement>('[data-profile-column-id="identity"] .pc-profile-column-main')?.click();
    await waitForPaint();
    if (!document.querySelector('.pc-profile-field-editor')) {
      throw new Error('Profile field detail page did not open from the compact field list');
    }
  } else if (name === 'profiles-field-management') {
    const migratedColumn = ProfileTableColumnSchema.parse({
      description: '旧字段',
      id: 'legacy_hidden',
      label: '旧隐藏字段',
      options: [],
      required: false,
      type: 'text',
      visible: false,
    });
    if (migratedColumn.enabled || 'visible' in migratedColumn) {
      throw new Error('Legacy profile column visibility did not migrate to enabled state');
    }

    const profiles = useProfilesStore();
    const { table } = createProfilesFixture();
    const entry = profiles.createEntry({
      fields: { identity: '不会进入停用后的引用', status: '在场' },
      kind: table.kind,
      summary: '字段管理测试资料',
      tableId: table.id,
      tags: ['字段管理'],
      title: '字段管理对象',
    });
    resetPhoneToRoute('profiles', 'table-editor', table.name, { tableId: table.id });
    await waitForPaint();

    const initialRows = [...document.querySelectorAll<HTMLElement>('.pc-profile-column-row')];
    if (!initialRows.length || initialRows.some(row => row.querySelector('input, textarea, select'))) {
      throw new Error('Profile field list still renders expanded field forms');
    }

    const dragHandle = initialRows[0]?.querySelector<HTMLButtonElement>('.pc-profile-column-drag-handle');
    const targetRow = initialRows.at(-1);
    if (!dragHandle || !targetRow) throw new Error('Profile field drag fixture is incomplete');
    const dragRect = dragHandle.getBoundingClientRect();
    const targetRect = targetRow.getBoundingClientRect();
    const pointerId = 91;
    dragHandle.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientY: dragRect.top + dragRect.height / 2,
        pointerId,
      }),
    );
    dragHandle.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        button: 0,
        clientY: targetRect.bottom + 8,
        pointerId,
      }),
    );
    dragHandle.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        button: 0,
        clientY: targetRect.bottom + 8,
        pointerId,
      }),
    );
    await waitForPaint();
    const reorderedRows = [...document.querySelectorAll<HTMLElement>('.pc-profile-column-row')];
    if (reorderedRows.at(-1)?.dataset.profileColumnId !== initialRows[0]?.dataset.profileColumnId) {
      throw new Error('Profile field drag did not move the field to the selected position');
    }

    document.querySelector<HTMLButtonElement>('.pc-profile-fields-head .pc-icon-btn')?.click();
    await waitForPaint();
    const newFieldName = document.querySelector<HTMLInputElement>('input[placeholder="例如：身份"]');
    if (!newFieldName) throw new Error('Profile new field detail page did not open');
    newFieldName.value = '临时字段';
    newFieldName.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLButtonElement>('.pc-profile-field-editor .pc-primary-btn')?.click();
    await waitForPaint();
    if (![...document.querySelectorAll('.pc-profile-column-main')].some(row => row.textContent?.includes('临时字段'))) {
      throw new Error('Profile new field was not added after saving its detail page');
    }

    const identityRow = [...document.querySelectorAll<HTMLElement>('.pc-profile-column-row')].find(
      row => row.dataset.profileColumnId === 'identity',
    );
    identityRow?.querySelector<HTMLButtonElement>('.pc-profile-column-main')?.click();
    await waitForPaint();
    const enabledToggle = document.querySelector<HTMLInputElement>('.pc-profile-field-toggle .pc-toggle input');
    if (!enabledToggle?.checked) throw new Error('Profile field enabled toggle did not restore the saved state');
    enabledToggle.click();
    document.querySelector<HTMLButtonElement>('.pc-profile-field-editor .pc-primary-btn')?.click();
    await waitForPaint();
    if (!document.querySelector<HTMLElement>('[data-profile-column-id="identity"]')?.classList.contains('disabled')) {
      throw new Error('Profile field list did not reflect the disabled field state');
    }

    document.querySelector<HTMLButtonElement>('.pc-profile-table-editor > .pc-form-actions .pc-primary-btn')?.click();
    await waitForPaint();
    const savedIdentity = profiles.getTable(table.id)?.columns.find(column => column.id === 'identity');
    const profileReference = getRegisteredPhoneAppReferenceTrees()
      .flatMap(root => (root.kind === 'branch' ? root.children : [root]))
      .find(node => node.kind === 'leaf' && node.item.id === `profiles:${entry.id}`);
    if (
      savedIdentity?.enabled ||
      !profileReference ||
      profileReference.kind !== 'leaf' ||
      profileReference.item.content.includes('不会进入停用后的引用')
    ) {
      throw new Error('Disabled profile field still participates in saved references');
    }
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
    await openReaderCatalog();
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
