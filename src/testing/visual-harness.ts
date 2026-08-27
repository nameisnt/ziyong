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
import { applyMinigameVisualScenario } from '@/testing/visual/minigameScenarios';
import {
  applyContentBookVisualScenario,
  createDiaryFixture,
  createLettersFixture,
  createSummaryFixture,
} from '@/testing/visual/contentBookScenarios';
import { applyTheaterVisualScenario, createTheaterFixture } from '@/testing/visual/theaterScenarios';
import { applyRecoveryVisualScenario } from '@/testing/visual/recoveryScenarios';
import { applyReaderVisualScenario } from '@/testing/visual/readerScenarios';
import {
  configureVisualPhoneSize,
  resetVisualPhoneRoute,
  waitForVisualCondition,
  waitForVisualPaint,
} from '@/testing/visual/context';
import { setupVisualGlobals } from '@/testing/visual-bootstrap';
import { openReaderCatalog, openReaderTools, toggleReaderFooter } from '@/testing/visual/navigation/readerNavigation';
import { createGenerationTaskFixture } from '@/testing/visual/generationTaskFixtures';
import { applyBusinessContentVisualScenario } from '@/testing/visual/businessContentScenarios';
import { applyFileRepositoryVisualScenario } from '@/testing/visual/fileRepositoryScenarios';
import { applyPresetManagerVisualScenario } from '@/testing/visual/presetManagerScenarios';
import { applyRelationshipVisualScenario } from '@/testing/visual/relationshipScenarios';
import { applyRegexWizardVisualScenario } from '@/testing/visual/regexWizardScenarios';
import { applyRegexDisplayVisualScenario } from '@/testing/visual/regexDisplayScenarios';
import { applyWorkbenchVisualScenario } from '@/testing/visual/workbenchScenarios';
import { applyChatInsertVisualScenario } from '@/testing/visual/chatInsertScenarios';
import { applyAppBuilderVisualScenario } from '@/testing/visual/appBuilderScenarios';
import { applyMvuModifierVisualScenario } from '@/testing/visual/mvuModifierScenarios';
import { applyScenePlannerVisualScenario } from '@/testing/visual/scenePlannerScenarios';
import {
  applyManagementToolsVisualScenario,
  prepareManagementToolsVisualRuntime,
} from '@/testing/visual/managementToolsScenarios';
import { seedArchiveFloorBackupFixture } from '@/testing/visual/archiveScenarios';
import { useStorylinesStore } from '@/apps/storylines/store';
import { useBaguStore } from '@/store/bagu';
import { useGenerationTaskStore } from '@/store/generationTasks';
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

const waitForPaint = waitForVisualPaint;

const { setReaderFixtureReasoning, setReaderFixtureSwipes } = setupVisualGlobals();

const { initPhoneLifecycle } = await import('@/core/phoneLifecycle');
const { PHONE_APPS } = await import('@/data/apps');
const { useForumStore } = await import('@/store/forum');
const { ForumBoardSchema } = await import('@/type/forum');
const { useExtrasStore } = await import('@/store/extras');
const { usePhoneStore } = await import('@/store/phone');
const { usePromptStore } = await import('@/store/prompts');
const { useGenerationAliasesStore } = await import('@/store/generationAliases');
const { useGenerationOverrideStore } = await import('@/store/generationOverrides');
const { useSettingsStore } = await import('@/store/settings');
const { useSummaryStore } = await import('@/store/summary');
const { usePreviewDraftStore } = await import('@/store/previewDrafts');
const { usePreviewDraftPersistence } = await import('@/util/previewDrafts');
const { useLettersStore } = await import('@/store/letters');
const { useTheaterStore } = await import('@/store/theater');
const { WorkbenchStepConfigSchema, useWorkbenchStore } = await import('@/apps/workbench/store');
const { profilesField, runLegacyProfilesCleanup } = await import('@/apps/profiles/legacyCleanup');
const { useExternalProfileGenerationStore } = await import('@/apps/profiles/generationDrafts');
const { usePresetLinkStore } = await import('@/apps/preset-link/store');
const { useWorldSlotsStore, worldSlotsField } = await import('@/apps/world-slots/store');
const { useFileRepositoryStore } = await import('@/store/fileRepository');
const { usePluginPresetStore } = await import('@/store/pluginPresets');
const { useRelationshipStore } = await import('@/apps/relationship/store');
const { useRegexDisplayStore } = await import('@/apps/regex-display/store');
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
const {
  deleteTavernPresetPrompt,
  duplicateTavernPresetPrompt,
  loadTavernPreset,
  readTavernPreset,
  reorderTavernPresetPrompts,
} = await import('@/apps/preset-manager/api');
const { getWorldbookEntries } = await import('@/apps/worldbook-link/api');
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
const presetMigrationVisualScenarioIds = [
  'preset-move-tavern-to-plugin',
  'preset-move-plugin-to-tavern',
  'preset-move-conflict',
  'preset-move-target-failure',
  'preset-move-verify-rollback',
  'preset-move-source-delete-failure',
] as const;
if (presetMigrationVisualScenarioIds.some(name => !scenarios.includes(name))) {
  throw new Error('Preset migration visual scenarios are missing from the scenario catalog');
}

const configurePhoneSize = configureVisualPhoneSize;
const resetPhoneToRoute = resetVisualPhoneRoute;

function createTheaterBaguFixture() {
  const theater = useTheaterStore();
  theater.resetCurrentScope();
  return theater.createEntry({
    content: Array.from(
      { length: 12 },
      (_, index) => `第${index + 1}句，他仿佛听见雨声靠近，忍不住微微一愣，眼中闪过一丝迟疑。`,
    ).join(''),
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
      reasoning: [
        '## 雨夜里的迟疑',
        '',
        '先回顾这一章和上一章的衔接，再确认人物此刻不知道哪些信息。',
        '',
        '*不能把尚未揭晓的真相提前写进角色认知。*',
      ].join('\n'),
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

async function applyScenario(name: VisualScenarioName, options: { height?: number; width?: number } = {}) {
  if (!scenarios.includes(name)) {
    throw new Error(`Unknown visual scenario: ${name}`);
  }

  configurePhoneSize(options.width, options.height);
  document.querySelector('#visual-host-theme-override')?.remove();
  useSettingsStore().setTheme(
    name === 'diary-entry-editor-dark' ||
      name === 'preview-draft-deferred-save-dark' ||
      name === 'profiles-external-dark' ||
      name === 'preset-link-dark' ||
      name === 'macro-builder-dark' ||
      name === 'status-display-settings-dark'
      ? 'dark'
      : 'light',
  );
  const phone = usePhoneStore();
  await phone.goHome();
  phone.openPhone();

  if (name === 'preset-link-dark' || name === 'macro-builder-dark') {
    const appId = name === 'preset-link-dark' ? 'preset-link' : 'macro-builder';
    resetPhoneToRoute(appId, 'root', appId === 'preset-link' ? '预设绑定' : '宏生成器');
    await waitForPaint();
    return { name, route: phone.currentRoute };
  }

  if (name === 'status-display-mvu') {
    const { createStatusDisplayScheme, useStatusDisplayStore } = await import('@/apps/status-display/store');
    const statusDisplay = useStatusDisplayStore();
    statusDisplay.settings.schemes = [];
    statusDisplay.settings.activeSchemeByScope = {};
    const scheme = createStatusDisplayScheme('mvu');
    scheme.name = '角色状态';
    scheme.template = [
      '<style>',
      '.status { display: grid; gap: 10px; padding: 16px; }',
      '.status h2 { margin: 0; font-size: 18px; }',
      '.row { display: flex; justify-content: space-between; gap: 12px; padding-block: 8px; border-bottom: 1px solid var(--pc-frame-border); }',
      '</style>',
      '<section class="status">',
      '  <h2>艾莉娅</h2>',
      '  <div class="row"><span>好感度</span><strong>{{mvu:角色.艾莉娅.好感度}}</strong></div>',
      '  <div class="row"><span>当前状态</span><strong>{{mvu:角色.艾莉娅.状态}}</strong></div>',
      '  <div class="row"><span>金币</span><strong>{{mvu:背包.金币}}</strong></div>',
      '  <button id="status-toggle" type="button">切换详情</button>',
      '  <p id="status-action-result">未操作</p>',
      '  <p id="status-mvu-bridge-result">未读取</p>',
      '</section>',
      '<script>',
      '(async () => {',
      "  await waitGlobalInitialized('Mvu');",
      "  const variables = await getVariables({ type: 'message', message_id: 'latest' });",
      "  document.getElementById('status-mvu-bridge-result').textContent = variables.stat_data.角色.艾莉娅.状态;",
      '})();',
      "document.getElementById('status-toggle').addEventListener('click', () => {",
      "  document.getElementById('status-action-result').textContent = '已响应';",
      '});',
      '</script>',
    ].join('\n');
    statusDisplay.upsertScheme(scheme);
    statusDisplay.setActiveScheme(phone.currentTavernScopeKey, scheme.id);
    resetPhoneToRoute('status-display', 'root', '状态栏');
    const rendered = await waitForVisualCondition(() => {
      const frame = document.querySelector<HTMLIFrameElement>('.pc-status-display-app iframe');
      return Boolean(frame?.srcdoc.includes('正在城镇休息') && frame.sandbox.contains('allow-same-origin'));
    });
    if (!rendered) throw new Error('Status display MVU template did not render inside the frontend frame');
    await waitForPaint();
    return { name, route: phone.currentRoute };
  }

  if (name === 'status-display-settings' || name === 'status-display-settings-dark') {
    const { createStatusDisplayScheme, useStatusDisplayStore } = await import('@/apps/status-display/store');
    const statusDisplay = useStatusDisplayStore();
    statusDisplay.settings.schemes = [];
    statusDisplay.settings.activeSchemeByScope = {};
    const regexScheme = createStatusDisplayScheme('regex');
    regexScheme.name = '正文状态';
    const mvuScheme = createStatusDisplayScheme('mvu');
    mvuScheme.name = '角色状态';
    statusDisplay.upsertScheme(regexScheme);
    statusDisplay.upsertScheme(mvuScheme);
    statusDisplay.setActiveScheme(phone.currentTavernScopeKey, mvuScheme.id);
    resetPhoneToRoute('status-display-settings', 'root', '状态栏设置');
    await waitForPaint();
    return { name, route: phone.currentRoute };
  }

  if (name === 'status-display-regex') {
    const { createRegexDisplayRule, useRegexDisplayStore } = await import('@/apps/regex-display/store');
    const { createStatusDisplayScheme, statusDisplayRegexTargetId, useStatusDisplayStore } =
      await import('@/apps/status-display/store');
    const statusDisplay = useStatusDisplayStore();
    const regexDisplay = useRegexDisplayStore();
    statusDisplay.settings.schemes = [];
    statusDisplay.settings.activeSchemeByScope = {};
    const scheme = createStatusDisplayScheme('regex');
    scheme.name = '正文状态';
    statusDisplay.upsertScheme(scheme);
    statusDisplay.setActiveScheme(phone.currentTavernScopeKey, scheme.id);
    const extractRule = createRegexDisplayRule({
      flags: 'i',
      name: '提取正文状态',
      operation: 'extract',
      pattern: '<content>([\\s\\S]*?)</content>',
      replacement: '$1',
    });
    const displayRule = createRegexDisplayRule({
      flags: '',
      name: '正文状态网页',
      operation: 'replace',
      pattern: '^([\\s\\S]+)$',
      renderMode: 'html',
      replacement:
        '<style>.status { padding: 16px; line-height: 1.8; }.status strong { display: block; margin-bottom: 8px; }</style><section class="status"><strong>最新状态</strong><div>$1</div></section>',
    });
    regexDisplay.settings.rules = [extractRule, displayRule];
    const usage = regexDisplay.getUsage(statusDisplayRegexTargetId(scheme.id));
    usage.contentRuleId = extractRule.id;
    usage.displayRuleIds = [displayRule.id];
    resetPhoneToRoute('status-display', 'root', '状态栏');
    const rendered = await waitForVisualCondition(() => {
      const frame = document.querySelector<HTMLIFrameElement>('.pc-status-display-app iframe');
      return Boolean(frame?.srcdoc.includes('另一条 AI 回复'));
    });
    if (!rendered) throw new Error('Status display regex rules did not render the latest matching assistant message');
    await waitForPaint();
    return { name, route: phone.currentRoute };
  }

  if (
    await applyManagementToolsVisualScenario(name, {
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (await applySettingsVisualScenario(name, { resetPhoneToRoute, waitForPaint })) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyWorkbenchVisualScenario(name, {
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyChatInsertVisualScenario(name, {
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyAppBuilderVisualScenario(name, {
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyMvuModifierVisualScenario(name, {
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyScenePlannerVisualScenario(name, {
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (applyBusinessContentVisualScenario(name, { resetPhoneToRoute })) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyFileRepositoryVisualScenario(name, {
      repository: useFileRepositoryStore(),
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyPresetManagerVisualScenario(name, {
      getPluginPresets: usePluginPresetStore,
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyRelationshipVisualScenario(name, {
      getRelationship: useRelationshipStore,
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyRegexWizardVisualScenario(name, {
      getRegexDisplay: useRegexDisplayStore,
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyRegexDisplayVisualScenario(name, {
      getRegexDisplay: useRegexDisplayStore,
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
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

  if (
    await applyPromptsVisualScenario(name, {
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (
    await applyMinigameVisualScenario(name, {
      resetPhoneToRoute,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
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
      waitForCondition: waitForVisualCondition,
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

  if (
    await applyReaderVisualScenario(name, {
      openReaderCatalog,
      openReaderTools,
      resetPhoneToRoute,
      setReaderFixtureReasoning,
      setReaderFixtureSwipes,
      toggleReaderFooter,
      waitForCondition: waitForVisualCondition,
      waitForPaint,
    })
  ) {
    await waitForPaint();
    return { name, route: usePhoneStore().currentRoute };
  }

  if (name === 'home') {
    const settings = useSettingsStore();
    await phone.goHome();
    await waitForPaint();
    const context = document.querySelector<HTMLElement>('.pc-home-context');
    const contextCopy = context?.querySelector<HTMLElement>('.pc-home-context-copy');
    const actionMenu = context?.querySelector<HTMLDetailsElement>('.pc-home-context-actions .pc-action-menu');
    const actionTrigger = actionMenu?.querySelector<HTMLElement>('summary');
    if (!context || !contextCopy || !actionMenu || !actionTrigger) {
      throw new Error('Home chat status omitted its shared action menu');
    }
    if (
      actionTrigger.textContent?.trim() ||
      actionTrigger.getAttribute('aria-label') !== '操作' ||
      actionTrigger.getBoundingClientRect().right > contextCopy.getBoundingClientRect().left + 1
    ) {
      throw new Error('Home action menu is not an accessible icon-only trigger on the left');
    }
    actionTrigger.click();
    await waitForPaint();
    const actionPanel = actionMenu.querySelector<HTMLElement>('.pc-action-menu-panel');
    if (
      !actionMenu.open ||
      !actionPanel ||
      actionPanel.getBoundingClientRect().left < context.getBoundingClientRect().left - 1 ||
      actionPanel.getBoundingClientRect().right > context.getBoundingClientRect().right + 1
    ) {
      throw new Error('Home action menu did not open toward the available right-hand space');
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await waitForPaint();
    if (actionMenu.open) throw new Error('Home action menu ignored Escape');
    settings.setTheme('dark');
    await waitForPaint();
    if (
      actionTrigger.getBoundingClientRect().right > contextCopy.getBoundingClientRect().left + 1 ||
      getComputedStyle(actionTrigger).visibility !== 'visible'
    ) {
      throw new Error('Home action menu lost its left-side geometry in dark mode');
    }
    settings.setTheme('light');
    await waitForPaint();
    const dataBankContainer = document.querySelector('#data_bank_wand_container');
    const readerContainer = document.querySelector('#pc_reader_wand_container');
    const readerEntry = readerContainer?.querySelector('#pc-menu-entry');
    if (
      !dataBankContainer ||
      dataBankContainer.nextElementSibling !== readerContainer ||
      readerContainer?.className !== 'extension_container' ||
      readerEntry?.tagName !== 'DIV' ||
      !readerEntry.querySelector('.extensionsMenuExtensionButton')
    ) {
      throw new Error('Native reader launcher does not match SillyTavern menu structure or position');
    }
    const groupTabs = [...document.querySelectorAll<HTMLButtonElement>('.pc-home-group-tabs .pc-segment-btn')];
    if (
      groupTabs.length !== settings.settings.layout.folders.length ||
      document.querySelector('.pc-home-folder-tile, .pc-page-dot')
    ) {
      throw new Error('Home did not render the saved folders as direct group tabs');
    }
    const activeGroupId = groupTabs.find(tab => tab.classList.contains('active'))?.dataset.homeToken?.slice(7) || '';
    const activeGroup = settings.settings.layout.folders.find(folder => folder.id === activeGroupId);
    const activeGrid = document.querySelector<HTMLElement>('.pc-home-app-section .pc-home-app-grid');
    if (!activeGroup || activeGrid?.querySelectorAll('.pc-app-tile').length !== activeGroup.appIds.length) {
      throw new Error('Selected home group did not expose every App directly');
    }

    const firstGroupApp = activeGrid?.querySelector<HTMLButtonElement>('.pc-app-tile');
    const firstGroupAppId = activeGroup.appIds[0] || '';
    firstGroupApp?.click();
    await waitForPaint();
    if (!firstGroupAppId || phone.currentRoute.appId !== firstGroupAppId) {
      throw new Error('Home group App did not open directly');
    }
    await phone.goBack();
    await waitForPaint();
    if (
      !document
        .querySelector<HTMLButtonElement>(`[data-home-token="folder:${activeGroupId}"]`)
        ?.classList.contains('active') ||
      document.querySelector('.pc-home-folder-dialog')
    ) {
      throw new Error('Home group source was not restored without reopening its management dialog');
    }

    const gameFolder = settings.settings.layout.folders.find(folder => folder.name === '小游戏');
    const gameTab = gameFolder
      ? document.querySelector<HTMLButtonElement>(`[data-home-token="folder:${gameFolder.id}"]`)
      : null;
    gameTab?.click();
    await waitForPaint();
    const gameGrid = document.querySelector<HTMLElement>('.pc-home-app-section .pc-home-app-grid');
    if (!gameFolder || gameFolder.appIds.length !== 10 || gameGrid?.querySelectorAll('.pc-app-tile').length !== 10) {
      throw new Error('Minigame group did not expose all ten App entries');
    }
    gameGrid.querySelector<HTMLButtonElement>('.pc-app-tile')?.click();
    await waitForPaint();
    if (phone.currentRoute.appId !== 'game-2048' || !document.querySelector('.pc-game2048-board')) {
      throw new Error('Minigame group entry did not open 2048 directly');
    }
    phone.pushPage('visual-detail', '视觉详情');
    await phone.goBack();
    if (phone.currentRoute.page !== 'root') throw new Error('Nested App detail did not return to its root');
    await phone.closePhone({ skipConfirm: true });
    phone.openPhone();
    if (phone.currentRoute.appId !== 'game-2048') throw new Error('Closed phone lost its App route');
    await phone.goBack();
    await waitForPaint();
    if (!gameTab?.classList.contains('active') || document.querySelector('.pc-home-folder-dialog')) {
      throw new Error('Closed phone did not restore the source group');
    }

    const search = document.querySelector<HTMLInputElement>('.pc-home-search input');
    if (!search) throw new Error('Home App search is missing');
    search.value = '聊天档案';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    const searchResults = [...document.querySelectorAll<HTMLButtonElement>('.pc-home-app-grid .pc-app-tile')];
    if (searchResults.length !== 1 || !searchResults[0]?.textContent?.includes('聊天档案')) {
      throw new Error('Home App search did not find chat archive in the fixed Dock');
    }
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-home-group-bar > .pc-soft-btn')?.click();
    await waitForPaint();
    if (!document.querySelector('.pc-home-folder-dialog')) {
      throw new Error('Home group management action did not open the selected group');
    }
    document.querySelector<HTMLButtonElement>('.pc-home-folder-head button[title="关闭"]')?.click();
    await waitForPaint();
  } else if (name === 'home-five-columns') {
    const settings = useSettingsStore();
    settings.setPhoneWindowWidth(350);
    settings.setHomeColumns(5);
    await phone.goHome();
    await waitForPaint();
    const grid = document.querySelector<HTMLElement>('.pc-home-grid-wrap .pc-home-app-grid');
    const tile = document.querySelector<HTMLElement>('.pc-home-grid-wrap .pc-app-tile');
    const label = tile?.querySelector<HTMLElement>('strong');
    if (!grid || !tile || !label) throw new Error('Five-column home layout did not render App tiles');
    const gridGap = Number.parseFloat(getComputedStyle(grid).columnGap);
    const tilePadding = Number.parseFloat(getComputedStyle(tile).paddingInline);
    const labelFontSize = Number.parseFloat(getComputedStyle(label).fontSize);
    if (gridGap > 4 || tilePadding > 1 || labelFontSize > 10 || label.clientWidth < 50) {
      throw new Error('Five-column App label does not reserve enough width for five Chinese characters');
    }
  } else if (
    name === 'storylines-generation-background' ||
    name === 'storylines-generation-failed-background' ||
    name === 'scene-planner-generation-background'
  ) {
    const isStorylines = name.startsWith('storylines-generation-');
    const isFailedResult = name === 'storylines-generation-failed-background';
    const appId = isStorylines ? 'storylines' : 'scene-planner';
    const actionId = isStorylines ? 'extract' : 'generate';
    const output = isFailedResult
      ? '<result><line><summary>离页后完成，但故意缺少必填标题以进入失败草稿。</summary></line></result>'
      : isStorylines
        ? [
            '<result>',
            '  <line>',
            '    <title>离页后完成的剧情线</title>',
            '    <kind>main</kind>',
            '    <status>active</status>',
            '    <summary>请求在来源页面卸载后继续完成。</summary>',
            '    <goal>验证持久任务会话</goal>',
            '    <stakes>不得被卸载钩子停止</stakes>',
            '  </line>',
            '</result>',
          ].join('\n')
        : [
            '<result>',
            '  <title>离页后完成的下一章</title>',
            '  <analysis>请求在场景编排页面卸载后继续运行，并把结果保存到原预览事实源。</analysis>',
            '  <prompt>请续写下一章正文，让角色在雨夜车站确认彼此的误会仍未解除。</prompt>',
            '</result>',
          ].join('\n');
    const generationTasks = useGenerationTaskStore();
    generationTasks.tasks.slice().forEach(task => generationTasks.removeTask(task.id));
    const previewDrafts = usePreviewDraftStore();
    previewDrafts.deleteAppPreviewDrafts(appId);
    const settingsStore = useSettingsStore();
    settingsStore.settings.generation.resultMode = isStorylines ? 'preview' : 'save';
    settingsStore.settings.generation.rpmLimit = 0;
    settingsStore.settings.generation.stream = false;
    settingsStore.settings.textProvider.mode = 'tavern';
    const visualRuntime = globalThis as typeof globalThis & {
      generate?: (config: Record<string, unknown>) => Promise<string>;
      generateRaw?: (config: Record<string, unknown>) => Promise<string>;
    };
    const mockGenerate = async () => {
      await new Promise<void>(resolve => window.setTimeout(resolve, 120));
      return output;
    };
    visualRuntime.generate = mockGenerate;
    visualRuntime.generateRaw = mockGenerate;

    resetPhoneToRoute(appId, isStorylines ? 'generate' : 'root', isStorylines ? '梳理剧情' : '场景编排');
    await waitForPaint();
    if (!isStorylines) {
      const brief = document.querySelector<HTMLTextAreaElement>('.pc-scene-brief');
      if (!brief) throw new Error('Scene planner brief input is missing');
      brief.value = '让两人在雨夜车站再次相遇，但暂时不要和解。';
      brief.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const generateButton = document.querySelector<HTMLButtonElement>('.pc-generation-actions .pc-primary-btn');
    if (!generateButton) throw new Error(`${appId} shared generation action is missing`);
    generateButton.click();
    const started = await waitForVisualCondition(
      () => generationTasks.getSingleTask(appId, actionId)?.status === 'running',
      1500,
    );
    if (!started) {
      const failedStart = generationTasks.getSingleTask(appId, actionId);
      throw new Error(
        `${appId} single generation task did not enter running state: status=${failedStart?.status ?? 'missing'}, error=${failedStart?.error ?? ''}`,
      );
    }
    await phone.goHome();
    await waitForPaint();
    if (document.querySelector(`.pc-${appId}-app`)) throw new Error(`${appId} source App did not unmount`);

    const completed = await waitForVisualCondition(
      () => generationTasks.getSingleTask(appId, actionId)?.status === 'completed',
      2500,
    );
    delete (visualRuntime as { generate?: (config: Record<string, unknown>) => Promise<string> }).generate;
    delete (visualRuntime as { generateRaw?: (config: Record<string, unknown>) => Promise<string> }).generateRaw;
    const task = generationTasks.getSingleTask(appId, actionId);
    const expectedPage = isFailedResult ? 'failed-draft' : 'preview';
    const persistedResult = isFailedResult
      ? useStorylinesStore().failedDrafts.some(draft => draft.rawOutput.includes('故意缺少必填标题'))
      : Boolean(previewDrafts.getPreviewDraft(appId, 'preview'));
    if (
      !completed ||
      task?.routePage !== expectedPage ||
      !task.rawOutput.includes('离页后完成') ||
      !persistedResult ||
      phone.currentRoute.appId === appId
    ) {
      throw new Error(`${appId} did not finish into its persisted preview after leaving the source App`);
    }
  } else if (
    name === 'digest-generation-background' ||
    name === 'relationship-generation-background' ||
    name === 'summary-generation-background' ||
    name === 'theater-generation-background'
  ) {
    const isDigest = name === 'digest-generation-background';
    const isRelationship = name === 'relationship-generation-background';
    const isSummary = name === 'summary-generation-background';
    const appId = isDigest ? 'digest' : isRelationship ? 'relationship' : isSummary ? 'summary' : 'theater';
    const actionId = 'generate';
    const output = isDigest
      ? [
          '<result>',
          '  <title>离页后完成的摘抄</title>',
          '  <content>离页后完成的摘抄正文，验证预览事实源仍会写回。</content>',
          '</result>',
        ].join('\n')
      : isRelationship
        ? [
            '<result>',
            '  <characters><character>离页甲</character><character>离页乙</character></characters>',
            '  <relations><relation><from>离页甲</from><to>离页乙</to><label>仍在等待回应</label></relation></relations>',
            '</result>',
          ].join('\n')
        : [
            '<result>',
            `  <title>离页后完成的${isSummary ? '总结' : '小剧场'}</title>`,
            `  <content>离页后完成的${isSummary ? '总结' : '小剧场'}正文，验证内容域预览仍会写回。</content>`,
            '</result>',
          ].join('\n');
    const generationTasks = useGenerationTaskStore();
    generationTasks.tasks.slice().forEach(task => generationTasks.removeTask(task.id));
    const previewDrafts = usePreviewDraftStore();
    previewDrafts.deleteAppPreviewDrafts(appId);
    const settingsStore = useSettingsStore();
    settingsStore.settings.generation.resultMode = 'preview';
    settingsStore.settings.generation.rpmLimit = 0;
    settingsStore.settings.generation.stream = false;
    settingsStore.settings.textProvider.mode = 'tavern';
    const visualRuntime = globalThis as typeof globalThis & {
      generate?: (config: Record<string, unknown>) => Promise<string>;
      generateRaw?: (config: Record<string, unknown>) => Promise<string>;
    };
    const mockGenerate = async () => {
      await new Promise<void>(resolve => window.setTimeout(resolve, 120));
      return output;
    };
    visualRuntime.generate = mockGenerate;
    visualRuntime.generateRaw = mockGenerate;

    const summaryBook = isSummary ? createSummaryFixture() : null;
    resetPhoneToRoute(
      appId,
      'generate',
      isDigest ? 'AI 摘抄' : isRelationship ? 'AI 关系识别' : isSummary ? 'AI 总结' : '生成小剧场',
      summaryBook ? { bookId: summaryBook.id } : undefined,
    );
    await waitForPaint();
    const generateButton = document.querySelector<HTMLButtonElement>('.pc-generation-actions .pc-primary-btn');
    if (!generateButton) throw new Error(`${appId} shared generation action is missing`);
    generateButton.click();
    const started = await waitForVisualCondition(
      () => generationTasks.getSingleTask(appId, actionId)?.status === 'running',
      1500,
    );
    if (!started) throw new Error(`${appId} single generation task did not enter running state`);
    await phone.goHome();
    await waitForPaint();
    if (document.querySelector(`.pc-${appId}-app`)) throw new Error(`${appId} source App did not unmount`);

    const completed = await waitForVisualCondition(
      () => generationTasks.getSingleTask(appId, actionId)?.status === 'completed',
      2500,
    );
    delete (visualRuntime as { generate?: (config: Record<string, unknown>) => Promise<string> }).generate;
    delete (visualRuntime as { generateRaw?: (config: Record<string, unknown>) => Promise<string> }).generateRaw;
    const task = generationTasks.getSingleTask(appId, actionId);
    if (
      !completed ||
      task?.routePage !== 'preview' ||
      (!task.rawOutput.includes('离页后完成') && !task.rawOutput.includes('离页甲')) ||
      !previewDrafts.getPreviewDraft(appId, 'preview') ||
      phone.currentRoute.appId === appId
    ) {
      throw new Error(`${appId} did not finish into its persisted preview after leaving the source App`);
    }
  } else if (
    name === 'storylines-detail' ||
    name === 'storylines-editor' ||
    name === 'storylines-profile-reference' ||
    name === 'storylines-profile-reference-dark'
  ) {
    const isProfileReference = name.startsWith('storylines-profile-reference');
    if (isProfileReference) {
      useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
      const visualGlobal = globalThis as typeof globalThis & { AutoCardUpdaterAPI?: Record<string, unknown> };
      visualGlobal.AutoCardUpdaterAPI = {
        exportTableAsJson: () => ({
          mate: { type: 'chatSheets' },
          sheet_people: {
            content: [
              ['row_id', '姓名'],
              ['person-1', '林见夏'],
              ['person-2', '周临川'],
            ],
            name: '人物表',
            uid: 'people',
          },
        }),
      };
    }
    const storylines = useStorylinesStore();
    storylines.resetCurrentScope();
    const line = storylines.createLine({
      goal: '查明旧港仓库失火的真正原因。',
      kind: 'main',
      stakes: '证据一旦被销毁，周临川将永远无法洗清嫌疑。',
      status: 'active',
      summary: '众人沿着失踪钥匙追查旧港火灾，并发现证词相互矛盾。',
      tags: ['旧港', '调查'],
      title: '旧港火灾真相',
      ...(isProfileReference ? { relatedProfileIds: ['legacy-profile-id'] } : {}),
    });
    storylines.createLine({
      goal: '确认动态剧情线选择器可以搜索并完整辨识长名称。',
      kind: 'branch',
      stakes: '错误绑定会让后续剧情节点归入另一条支线。',
      status: 'planned',
      summary: '用于选择器视觉回归的第二条剧情线。',
      tags: ['选择器'],
      title: '这是一条需要在窄屏选择器中完整显示的超长用户剧情线名称',
    });
    storylines.createBeat({
      lineId: line.id,
      order: 0,
      status: 'done',
      summary: '主角在仓库废墟里找到一枚不属于管理员的钥匙齿。',
      title: '发现钥匙齿',
    });
    const hook = storylines.createHook({
      lineId: line.id,
      payoff: '钥匙最终被证明属于伪造证词的巡夜人。',
      seed: '火灾当晚，备用钥匙从值班室无故失踪。',
      status: 'ready',
      tags: ['钥匙'],
      title: '失踪的备用钥匙',
    });

    if (isProfileReference) {
      resetPhoneToRoute('storylines', 'editor', '编辑剧情线', { id: line.id, kind: 'line' });
      await waitForPaint();
      document.querySelector<HTMLButtonElement>('.pc-storyline-profile-editor button[title="增加关联资料"]')?.click();
      await waitForPaint();
      let picker = document.querySelector<HTMLElement>('.pc-storyline-profile-row .pc-external-profile-picker');
      let combos = picker?.querySelectorAll<HTMLElement>('.pc-combobox');
      if (!picker || !combos || combos.length !== 2) throw new Error('Storyline external profile picker is missing');
      const selectProfileOption = async (combo: HTMLElement, label: string) => {
        combo.querySelector<HTMLInputElement>('.pc-combobox-input')?.click();
        await waitForPaint();
        const option = [...combo.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
          button.textContent?.includes(label),
        );
        if (!option) throw new Error(`Storyline external profile option is missing: ${label}`);
        option.click();
        await waitForPaint();
      };
      await selectProfileOption(combos[0], '人物表');
      picker = document.querySelector<HTMLElement>('.pc-storyline-profile-row .pc-external-profile-picker');
      combos = picker?.querySelectorAll<HTMLElement>('.pc-combobox');
      if (!picker || !combos || combos.length !== 2)
        throw new Error('Storyline profile row disappeared after table selection');
      await selectProfileOption(combos[1], '林见夏');
      [...document.querySelectorAll<HTMLButtonElement>('.pc-storyline-editor-card .pc-form-actions button')]
        .find(button => button.textContent?.includes('保存'))
        ?.click();
      if (
        !(await waitForVisualCondition(() => {
          const saved = storylines.getLine(line.id);
          return Boolean(
            saved?.relatedProfileIds.includes('legacy-profile-id') &&
            saved.relatedProfiles.some(
              profile => profile.profileSheetKey === 'sheet_people' && profile.profileRowIndex === 1,
            ) &&
            usePhoneStore().currentRoute.page === 'detail',
          );
        }))
      ) {
        throw new Error('Storyline profile reference did not preserve legacy ids and save the selected row');
      }
      await waitForPaint();
      const detailText = document.querySelector('.pc-storyline-detail-page')?.textContent || '';
      if (!detailText.includes('林见夏') || !detailText.includes('旧资料关联待重新选择')) {
        throw new Error('Storyline detail did not show new and unresolved legacy profile references');
      }
      return { name, route: usePhoneStore().currentRoute };
    }

    resetPhoneToRoute('storylines', 'detail', '失效剧情记录', { id: 'missing', kind: 'line' });
    await waitForPaint();
    if (!document.body.textContent?.includes('这条剧情记录无法打开')) {
      throw new Error('Missing storyline detail route rendered a blank page');
    }

    resetPhoneToRoute('storylines', 'root', '剧情梳理');
    await waitForPaint();
    const lineButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-storyline-item-main')].find(button =>
      button.textContent?.includes(line.title),
    );
    if (!lineButton) throw new Error('Storyline list item is not interactive');
    lineButton.click();
    await waitForPaint();
    const lineDetailText =
      document.querySelector('.pc-storyline-detail-page .pc-reader-detail-card')?.textContent || '';
    if (!lineDetailText.includes(line.goal) || !lineDetailText.includes(line.stakes)) {
      throw new Error('Storyline detail omitted goal or stakes');
    }

    const hookButton = [
      ...document.querySelectorAll<HTMLButtonElement>('.pc-storyline-detail-section .pc-list-row'),
    ].find(button => button.textContent?.includes(hook.title));
    if (!hookButton) throw new Error('Storyline detail did not link its foreshadowing item');
    hookButton.click();
    await waitForPaint();
    const hookDetailText =
      document.querySelector('.pc-storyline-detail-page .pc-reader-detail-card')?.textContent || '';
    if (!hookDetailText.includes(hook.seed) || !hookDetailText.includes(hook.payoff)) {
      throw new Error('Foreshadowing detail did not show seed and payoff separately');
    }

    if (name === 'storylines-editor') {
      const openDetailEditor = async () => {
        document.querySelector<HTMLButtonElement>('.pc-storyline-detail-page .pc-reader-tool-trigger')?.click();
        await waitForPaint();
        [...document.querySelectorAll<HTMLButtonElement>('.pc-storyline-detail-page .pc-reader-tool-menu button')]
          .find(button => button.textContent?.includes('编辑'))
          ?.click();
        await waitForPaint();
      };
      await openDetailEditor();
      const editor = document.querySelector<HTMLElement>('.pc-storyline-editor-card');
      const payoffField = [...(editor?.querySelectorAll<HTMLTextAreaElement>('textarea') ?? [])].find(
        field => field.value === hook.payoff,
      );
      if (!editor || !payoffField) throw new Error('Foreshadowing editor did not load the complete record');
      payoffField.value = '巡夜人承认自己调换钥匙并伪造了值班记录。';
      payoffField.dispatchEvent(new Event('input', { bubbles: true }));
      [...editor.querySelectorAll<HTMLButtonElement>('button')]
        .find(button => button.textContent?.includes('保存'))
        ?.click();
      await waitForPaint();
      if (storylines.getHook(hook.id)?.payoff !== payoffField.value || usePhoneStore().currentRoute.page !== 'detail') {
        throw new Error('Foreshadowing editor did not save and return to detail');
      }
      await openDetailEditor();
      const lineControl = [...document.querySelectorAll<HTMLElement>('.pc-storyline-editor-card .pc-field-group')].find(
        group => group.textContent?.includes('所属剧情线'),
      );
      if (!lineControl) {
        throw new Error('Foreshadowing editor did not render its storyline selector');
      }
      lineControl.scrollIntoView({ block: 'center' });
      const lineInput = lineControl.querySelector<HTMLInputElement>('.pc-combobox-input');
      lineInput?.click();
      await waitForPaint();
      if (lineInput && !document.querySelector('.pc-combobox-menu')?.textContent?.includes('超长用户剧情线名称')) {
        throw new Error('Storyline combobox omitted the user-created long storyline');
      }
    }
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
  } else if (name === 'custom-app-generation-background') {
    const { CustomAppDefinitionsSettingsSchema, customAppDefinitionsField } = await import('@/apps/app-builder/schema');
    const { useCustomAppsStore } = await import('@/apps/app-builder/store');
    const appId = 'custom-visual-generation';
    const timestamp = '2026-08-14T08:00:00.000Z';
    _.set(
      extension_settings,
      customAppDefinitionsField,
      CustomAppDefinitionsSettingsSchema.parse({
        definitions: [
          {
            id: appId,
            name: '离页生成测试',
            icon: 'fa-wand-magic-sparkles',
            description: '验证动态自制 App 的持久单次任务',
            dataScope: 'global',
            creation: { manual: true, extract: false, generate: true },
            naming: { mode: 'ai', template: '{{title}}' },
            extraction: { saveMode: 'separate' },
            display: { mode: 'markdown', sortDesc: false },
            referenceEnabled: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }),
    );
    useCustomAppsStore().rehydrateFromSettings();
    const generationTasks = useGenerationTaskStore();
    generationTasks.tasks.slice().forEach(task => generationTasks.removeTask(task.id));
    const previewDrafts = usePreviewDraftStore();
    previewDrafts.deleteAppPreviewDrafts(appId);
    const settingsStore = useSettingsStore();
    settingsStore.settings.generation.resultMode = 'preview';
    settingsStore.settings.generation.rpmLimit = 0;
    settingsStore.settings.generation.stream = false;
    settingsStore.settings.textProvider.mode = 'tavern';
    const output = [
      '<result>',
      '  <title>离页后完成的自制内容</title>',
      '  <content>动态 appId 的请求在宿主卸载后继续完成。</content>',
      '</result>',
    ].join('\n');
    const visualRuntime = globalThis as typeof globalThis & {
      generate?: (config: Record<string, unknown>) => Promise<string>;
      generateRaw?: (config: Record<string, unknown>) => Promise<string>;
    };
    const mockGenerate = async () => {
      await new Promise<void>(resolve => window.setTimeout(resolve, 120));
      return output;
    };
    visualRuntime.generate = mockGenerate;
    visualRuntime.generateRaw = mockGenerate;

    resetPhoneToRoute(appId, 'generate', 'AI 生成');
    await waitForPaint();
    const generateButton = document.querySelector<HTMLButtonElement>('.pc-generation-actions .pc-primary-btn');
    if (!generateButton) throw new Error('Dynamic custom app generation action is missing');
    generateButton.click();
    const started = await waitForVisualCondition(
      () => generationTasks.getSingleTask(appId, 'generate')?.status === 'running',
      1500,
    );
    if (!started) throw new Error('Dynamic custom app task did not enter running state');
    await phone.goHome();
    await waitForPaint();
    if (document.querySelector('.pc-custom-app')) throw new Error('Dynamic custom host did not unmount');
    const completed = await waitForVisualCondition(
      () => generationTasks.getSingleTask(appId, 'generate')?.status === 'completed',
      2500,
    );
    delete (visualRuntime as { generate?: (config: Record<string, unknown>) => Promise<string> }).generate;
    delete (visualRuntime as { generateRaw?: (config: Record<string, unknown>) => Promise<string> }).generateRaw;
    const task = generationTasks.getSingleTask(appId, 'generate');
    if (
      !completed ||
      task?.routePage !== 'preview' ||
      !task.rawOutput.includes('动态 appId') ||
      !previewDrafts.getPreviewDraft(appId, 'preview') ||
      phone.currentRoute.appId === appId
    ) {
      throw new Error('Dynamic custom app did not finish into its own persisted preview after leaving the host');
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
  } else if (name === 'content-transfer-dialog') {
    useSettingsStore().setTheme('dark');
    resetPhoneToRoute('settings', 'root', '设置');
    await waitForPaint();
    const dataEntry = [...document.querySelectorAll<HTMLButtonElement>('.pc-settings-entry')].find(button =>
      button.textContent?.includes('数据管理'),
    );
    if (!dataEntry) throw new Error('Settings data-management entry is missing');
    dataEntry.click();
    await waitForPaint();
    const appInput = document.querySelector<HTMLInputElement>('.pc-transfer-app-field .pc-combobox-input');
    if (!appInput) throw new Error('App content transfer selector is missing');
    appInput.click();
    appInput.value = 'App 工坊';
    appInput.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    const appOption = [...document.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
      button.textContent?.includes('App 工坊'),
    );
    if (!appOption) throw new Error('App Builder is missing from the content transfer selector');
    appOption.click();
    await waitForPaint();
    const transferButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-transfer-app-field button')].find(
      button => button.textContent?.includes('管理内容'),
    );
    if (!transferButton) throw new Error('App content transfer action is missing from data management');
    transferButton.click();
    await waitForPaint();
    const dialog = document.querySelector<HTMLElement>('.pc-content-transfer-dialog');
    if (!dialog) throw new Error('App content transfer dialog did not open');
    const dialogBackground = getComputedStyle(dialog).backgroundColor;
    const commaAlpha = dialogBackground.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/)?.[1];
    const slashAlpha = dialogBackground.match(/\/\s*([\d.]+)(%)?\s*\)$/);
    const backgroundAlpha = commaAlpha
      ? Number(commaAlpha)
      : slashAlpha
        ? Number(slashAlpha[1]) / (slashAlpha[2] ? 100 : 1)
        : 1;
    if (backgroundAlpha < 0.99) {
      throw new Error(`App content transfer dialog is translucent in dark mode (${dialogBackground})`);
    }
    const domainSelect = dialog.querySelector<HTMLSelectElement>('.pc-select');
    if (!domainSelect || domainSelect.options.length !== 3) {
      throw new Error('Multi-domain App transfer selector is incomplete');
    }
    const { buildContentTransfer } = await import('@/util/contentTransfer');
    const input = dialog.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('App content transfer file input is missing');
    const file = new File([JSON.stringify(buildContentTransfer('custom-app-definitions'))], 'app-transfer.json', {
      type: 'application/json',
    });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const modesVisible = await waitForVisualCondition(
      () => dialog.querySelectorAll<HTMLButtonElement>('.pc-segment-btn').length === 3,
    );
    if (!modesVisible) throw new Error('App content transfer conflict modes did not appear after file preview');
    const modes = [...dialog.querySelectorAll<HTMLButtonElement>('.pc-segment-btn')].map(button =>
      button.textContent?.trim(),
    );
    if (!['创建副本', '合并', '覆盖'].every(label => modes.includes(label))) {
      throw new Error('App content transfer conflict modes are incomplete');
    }
    const actions = [...dialog.querySelectorAll<HTMLButtonElement>('button')].map(button => button.textContent?.trim());
    if (!['导出内容', '选择文件'].every(label => actions.includes(label))) {
      throw new Error('App content transfer actions are incomplete');
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
      const rawButton = [
        ...document.querySelectorAll<HTMLButtonElement>('.pc-preview-mode-switch .pc-segment-btn'),
      ].find(button => button.textContent?.includes('原文'));
      if (!rawButton) throw new Error('Generation preview raw view switch is missing');
      rawButton.click();
      await waitForPaint();
    }

    const previewHeader = document.querySelector('.pc-generation-preview-head');
    const previewToolbar = document.querySelector<HTMLElement>('.pc-preview-toolbar');
    const previewPanel = document.querySelector<HTMLElement>('.pc-preview-panel');
    const previewActions = document.querySelector<HTMLElement>('.pc-preview-actions');
    if (!previewToolbar || !previewPanel || !previewActions) {
      throw new Error('Generation preview shared toolbar, panel or save area is missing');
    }
    const toolbarRect = previewToolbar.getBoundingClientRect();
    const panelRect = previewPanel.getBoundingClientRect();
    const actionsRect = previewActions.getBoundingClientRect();
    const saveButtonRect = previewActions.querySelector<HTMLButtonElement>('button')?.getBoundingClientRect();
    const screenRect = document.querySelector<HTMLElement>('.pc-screen')?.getBoundingClientRect();
    if (toolbarRect.bottom > panelRect.top + 1 || panelRect.bottom > actionsRect.top + 1) {
      throw new Error('Generation preview toolbar, content and save action overlap');
    }
    if (!screenRect || actionsRect.bottom > screenRect.bottom + 1) {
      throw new Error(
        `Generation preview save action left the phone viewport (${actionsRect.bottom.toFixed(1)} > ${screenRect?.bottom.toFixed(1) || 'missing'})`,
      );
    }
    if (!saveButtonRect || saveButtonRect.height < 28 || saveButtonRect.bottom > screenRect.bottom + 1) {
      throw new Error(
        `Generation preview save button is not visibly laid out (${saveButtonRect?.height.toFixed(1) || 'missing'}px)`,
      );
    }
    const saveButtonHit = document.elementFromPoint(
      saveButtonRect.left + saveButtonRect.width / 2,
      saveButtonRect.top + saveButtonRect.height / 2,
    );
    if (
      !saveButtonHit ||
      !(saveButtonHit === previewActions.querySelector('button') || saveButtonHit.closest('.pc-preview-actions'))
    ) {
      throw new Error(
        `Generation preview save button is covered by ${saveButtonHit?.className || saveButtonHit?.tagName || 'nothing'}`,
      );
    }
    const toolbarButtons = [...previewToolbar.querySelectorAll<HTMLButtonElement>('button')];
    toolbarButtons.forEach((button, index) => {
      const rect = button.getBoundingClientRect();
      toolbarButtons.slice(index + 1).forEach(other => {
        const otherRect = other.getBoundingClientRect();
        const overlaps =
          rect.left < otherRect.right &&
          rect.right > otherRect.left &&
          rect.top < otherRect.bottom &&
          rect.bottom > otherRect.top;
        if (overlaps) throw new Error('Generation preview toolbar buttons overlap');
      });
    });
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

    const cleanupResult = runLegacyProfilesCleanup();
    if (
      !cleanupResult.deleted ||
      cleanupResult.embeddedEntries !== 1 ||
      typeof _.get(extension_settings, profilesField) !== 'undefined'
    ) {
      throw new Error(`Legacy profile cleanup did not delete the old domain: ${cleanupResult.error}`);
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
    await waitForPaint();
    const sourceGroupToken =
      document.querySelector<HTMLButtonElement>('.pc-home-group-tabs .active')?.dataset.homeToken;
    const singleTaskRow = [...document.querySelectorAll<HTMLElement>('.pc-task-row')].find(row =>
      row.textContent?.includes('剧情梳理 · 单次生成'),
    );
    if (!singleTaskRow) throw new Error('Single interrupted generation task is missing from TaskCenter');
    if (singleTaskRow.querySelector('[aria-label="继续任务"]')) {
      throw new Error('Single interrupted generation task exposes a fake resume action');
    }
    const rawToggle = singleTaskRow.querySelector<HTMLButtonElement>('[aria-label="查看原始输出"]');
    if (!rawToggle) throw new Error('Single interrupted generation task has no raw output action');
    rawToggle.click();
    await waitForPaint();
    const expandedSingleTaskRow = [...document.querySelectorAll<HTMLElement>('.pc-task-row')].find(row =>
      row.textContent?.includes('剧情梳理 · 单次生成'),
    );
    const rawArea = expandedSingleTaskRow?.querySelector<HTMLTextAreaElement>('.pc-task-raw-area');
    if (
      !rawArea?.value.includes('已保留的部分原始输出') ||
      !expandedSingleTaskRow?.textContent?.includes('复制原始输出')
    ) {
      throw new Error(
        `Single interrupted generation raw output cannot be inspected and copied: area=${Boolean(rawArea)}, value=${rawArea?.value ?? ''}, text=${expandedSingleTaskRow?.textContent ?? ''}`,
      );
    }

    const dispatchHomeSwipe = (target: Element, startX: number, endX: number, pointerId: number) => {
      target.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: startX, clientY: 260, pointerId }),
      );
      target.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: endX, clientY: 264, pointerId }));
      target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: endX, clientY: 264, pointerId }));
    };
    dispatchHomeSwipe(rawArea, 300, 90, 71);
    await waitForPaint();
    if (
      document.querySelector<HTMLButtonElement>('.pc-home-group-tabs .active')?.dataset.homeToken !== sourceGroupToken
    ) {
      throw new Error('Generation task raw editor incorrectly changed the active home group');
    }
    rawToggle?.click();
    await waitForPaint();

    const taskHead = document.querySelector<HTMLElement>('.pc-task-center-head');
    if (!taskHead || !document.querySelector('.pc-task-list'))
      throw new Error('Generation TaskCenter header fixture is missing');
    dispatchHomeSwipe(taskHead, 90, 290, 72);
    await waitForPaint();
    if (!document.querySelector('.pc-task-list')) {
      throw new Error('Generation task page swipe hid the permanent task list');
    }
    await new Promise(resolve => window.setTimeout(resolve, 280));

    const taskCopy = document.querySelector<HTMLElement>('.pc-task-copy');
    if (!taskCopy) throw new Error('Generation task swipe surface fixture is missing');
    dispatchHomeSwipe(taskCopy, 300, 90, 73);
    await waitForPaint();
    if (
      document.querySelector<HTMLButtonElement>('.pc-home-group-tabs .active')?.dataset.homeToken !== sourceGroupToken
    ) {
      throw new Error('Generation task horizontal scroll incorrectly changed the active home group');
    }
    await new Promise(resolve => window.setTimeout(resolve, 280));
    const restoredTaskHead = document.querySelector<HTMLElement>('.pc-task-center-head');
    if (!restoredTaskHead || !document.querySelector('.pc-task-list')) {
      throw new Error('Generation TaskCenter did not remain expanded after page navigation');
    }
    const generationTaskStore = useGenerationTaskStore();
    const clearSavedButton = document.querySelector<HTMLButtonElement>('[aria-label="清理已完成通知"]');
    if (generationTaskStore.getClearableTasks().length !== 2 || !clearSavedButton?.textContent?.includes('清理 2')) {
      throw new Error('Generation TaskCenter did not expose the completed-notification cleanup count in its header');
    }
    clearSavedButton.click();
    await waitForPaint();
    if (
      generationTaskStore.getClearableTasks().length !== 0 ||
      generationTaskStore.currentScopeTasks.length !== 3 ||
      !generationTaskStore.currentScopeTasks.some(task => task.status === 'running') ||
      !generationTaskStore.currentScopeTasks.some(task => task.status === 'paused') ||
      !generationTaskStore.currentScopeTasks.some(task => task.status === 'interrupted')
    ) {
      throw new Error('Saved-task cleanup removed a running, paused, or interrupted generation task');
    }
    if (!document.querySelector<HTMLButtonElement>('[aria-label="清理已完成通知"]')?.disabled) {
      throw new Error('Generation TaskCenter did not keep a disabled cleanup action after clearing');
    }
  } else if (name === 'bagu-scan-actions' || name === 'bagu-scan-applied' || name === 'bagu-hit-details') {
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
    const mergedPreview = document.querySelector<HTMLTextAreaElement>('.pc-bagu-edit textarea')?.value || '';
    if (
      sentenceCards.length !== 12 ||
      document.querySelector('.pc-bagu-match-row') ||
      !['犹如', '下意识', '愣住', '目光中透出'].every(replacement => mergedPreview.includes(replacement))
    ) {
      throw new Error('Bagu hits were not merged into sentence-level editable cards');
    }
    if (name === 'bagu-scan-applied') {
      document.querySelector<HTMLButtonElement>('.pc-bagu-select-row .pc-mini-btn')?.click();
      await waitForPaint();
      document.querySelector<HTMLButtonElement>('.pc-bagu-scan-actions .pc-primary-btn')?.click();
      await waitForPaint();
    } else if (name === 'bagu-hit-details') {
      document.querySelector<HTMLButtonElement>('.pc-bagu-hit-detail-trigger')?.click();
      await waitForPaint();
      if (document.querySelectorAll('.pc-bagu-hit-modal-item').length !== 4) {
        throw new Error('Bagu hit detail dialog did not show all hits from the selected sentence');
      }
    }
  } else if (name === 'bagu-delete-confirm') {
    resetPhoneToRoute('bagu', 'root', '八股去除');
    await waitForPaint();
    const bagu = useBaguStore();
    const initialCount = bagu.rules.length;
    const deleteButton = document.querySelector<HTMLButtonElement>('.pc-rule-row .pc-icon-btn.danger');
    if (!deleteButton || !initialCount) throw new Error('Bagu delete confirmation fixture is missing');
    deleteButton.click();
    await waitForPaint();
    const cancelButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
      button.textContent?.includes('取消'),
    );
    if (!cancelButton) throw new Error('Bagu delete cancellation action is missing');
    cancelButton.click();
    await waitForPaint();
    if (bagu.rules.length !== initialCount) throw new Error('Cancelling Bagu deletion changed the persisted rules');
    document.querySelector<HTMLButtonElement>('.pc-rule-row .pc-icon-btn.danger')?.click();
    await waitForPaint();
    const confirmButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
      button.textContent?.includes('删除'),
    );
    if (!confirmButton) throw new Error('Bagu delete confirmation action is missing');
    confirmButton.click();
    await waitForPaint();
    if (bagu.rules.length !== initialCount - 1)
      throw new Error('Confirming Bagu deletion did not remove exactly one rule');
  } else if (name === 'entry-library-action-menu') {
    useSettingsStore().setTheme('dark');
    resetPhoneToRoute('entry-library', 'root', '条目库');
    await waitForPaint();
    const actionMenu = document.querySelector<HTMLDetailsElement>('.pc-entry-library-head .pc-action-menu');
    const longLabel = actionMenu?.querySelector<HTMLButtonElement>('.pc-action-menu-panel button span');
    if (longLabel) longLabel.textContent = '这是一个需要在三百五十像素手机菜单内完整换行显示的超长功能名称';
    actionMenu?.querySelector<HTMLButtonElement>('summary')?.click();
    await waitForPaint();
    const panel = actionMenu?.querySelector<HTMLElement>('.pc-action-menu-panel');
    const panelBackground = panel ? getComputedStyle(panel).backgroundColor : '';
    const panelAlpha = Number(panelBackground.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1] ?? 1);
    if (!panel || panelAlpha < 0.99) {
      throw new Error(`Action menu panel is transparent in dark mode: ${panelBackground || 'missing'}`);
    }
  } else if (name === 'entry-library-manual-create') {
    const library = useEntryLibraryStore();
    library.importBackup({ bindings: [], groups: [], items: [], version: 1 });
    resetPhoneToRoute('entry-library', 'root', '条目库');
    await waitForPaint();
    const addMenu = document.querySelectorAll<HTMLDetailsElement>('.pc-entry-library-head .pc-action-menu')[1];
    addMenu?.querySelector<HTMLButtonElement>('summary')?.click();
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
  } else if (name === 'entry-library-item-editor') {
    const library = useEntryLibraryStore();
    library.importBackup({ bindings: [], groups: [], items: [], version: 1 });
    resetPhoneToRoute('entry-library', 'root', '条目库');
    await waitForPaint();
    const addMenu = document.querySelectorAll<HTMLDetailsElement>('.pc-entry-library-head .pc-action-menu')[1];
    addMenu?.querySelector<HTMLButtonElement>('summary')?.click();
    await waitForPaint();
    [...(addMenu?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find(button => button.textContent?.includes('手动新建'))
      ?.click();
    await waitForPaint();
    const editor = document.querySelector<HTMLElement>('.pc-entry-item-editor');
    const content = editor?.querySelector<HTMLTextAreaElement>('.pc-area');
    if (!editor || !content) throw new Error('Entry library item editor did not render');
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
    addMenu?.querySelector<HTMLButtonElement>('summary')?.click();
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
    const visualGlobal = globalThis as typeof globalThis & { AutoCardUpdaterAPI?: Record<string, unknown> };
    visualGlobal.AutoCardUpdaterAPI = {
      exportTableAsJson: () => ({
        mate: { type: 'chatSheets', version: 1 },
        sheet_people: {
          content: [
            ['row_id', '姓名', '摘要', '人物详情', '未映射备注'],
            ['person-1', '林见夏', '追查旧案的调查员。', '她在雨夜留下了一封没有署名的信。', '不能进入引用'],
          ],
          name: '重要人物表',
          uid: 'important_people',
        },
      }),
    };
    const profileReference = getRegisteredPhoneAppReferenceTrees()
      .flatMap(root => (root.kind === 'branch' ? root.children : [root]))
      .flatMap(node => (node.kind === 'branch' ? node.children : [node]))
      .find(node => node.kind === 'leaf' && node.item.title === '林见夏');
    if (
      !profileReference ||
      profileReference.kind !== 'leaf' ||
      !profileReference.item.content.includes('未映射备注：不能进入引用') ||
      !profileReference.item.content.includes('人物详情：她在雨夜留下了一封没有署名的信。')
    ) {
      throw new Error('External profile reference did not include the direct table columns');
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
      option.textContent?.includes('林见夏'),
    );
    if (!profileOption) {
      let tableGroup = [...document.querySelectorAll<HTMLButtonElement>('.pc-reference-node.branch')].find(button =>
        button.textContent?.includes('重要人物表'),
      );
      if (!tableGroup) {
        profilesRoot.click();
        await waitForPaint();
        tableGroup = [...document.querySelectorAll<HTMLButtonElement>('.pc-reference-node.branch')].find(button =>
          button.textContent?.includes('重要人物表'),
        );
      }
      if (!tableGroup) throw new Error('External profile table group is missing from the reference picker');
      tableGroup.click();
      await waitForPaint();
      profileOption = [...document.querySelectorAll<HTMLElement>('.pc-reference-node.leaf')].find(option =>
        option.textContent?.includes('林见夏'),
      );
    }
    if (!profileOption) throw new Error('Profile entry is missing from the world slot reference picker');
    profileOption.click();
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-world-import-controls .pc-primary-btn')?.click();
    await waitForPaint();
    if (titleField.value !== '林见夏' || contentArea.value !== profileReference.item.content.trim()) {
      throw new Error('Merged profile reference did not preserve its title and prefix-free content');
    }
  } else if (name === 'world-slots-root-cleanup' || name === 'world-slots-root-cleanup-dark') {
    useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
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
    const rootToolbar = document.querySelector<HTMLElement>('.pc-world-root-toolbar.pc-directory-toolbar');
    const managementTrigger = rootToolbar?.querySelector<HTMLElement>('.pc-action-menu > summary[aria-label="管理"]');
    const slotCount = rootToolbar?.querySelector<HTMLElement>('.pc-directory-count');
    if (!rootToolbar || !managementTrigger || !slotCount) throw new Error('World slot root toolbar is incomplete');
    const toolbarRect = rootToolbar.getBoundingClientRect();
    const triggerRect = managementTrigger.getBoundingClientRect();
    if (
      Math.abs(toolbarRect.right - triggerRect.right) > 1 ||
      triggerRect.left <= slotCount.getBoundingClientRect().right
    ) {
      throw new Error('World slot management action is not aligned to the far right of the shared toolbar');
    }
    managementTrigger.click();
    await waitForPaint();
    const menuText = rootToolbar.querySelector('.pc-action-menu-panel')?.textContent || '';
    if (!menuText.includes('新增槽位') || !menuText.includes('立即同步')) {
      throw new Error('World slot management menu does not expose add and sync actions');
    }
    if (document.querySelector('.pc-world-card')) throw new Error('Removed fixed worldbook block is still visible');
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
  } else if (name === 'preset-owner-current') {
    resetPhoneToRoute('preset-manager', 'detail', '预设条目', { presetName: '简洁写作' });
    const loaded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-owner')));
    if (!loaded) throw new Error('Preset ownership controls are missing from Tavern preset detail');
    if (document.body.textContent?.includes('绑定此预设') || document.body.textContent?.includes('立即应用')) {
      throw new Error('Preset detail still exposes chat binding actions');
    }
    document.querySelector<HTMLButtonElement>('.pc-preset-owner-rule-action button')?.click();
    if (!usePresetLinkStore().getReaderProfile('简洁写作')) {
      throw new Error('Preset detail did not save its shared reader profile');
    }
  } else if (name === 'preset-owner-history') {
    useSettingsStore().setTheme('dark');
    const historyScopeKey = 'char:0:chat:visual-history';
    await phone.setViewingScope(historyScopeKey, {
      chatTitle: '旧章节讨论',
      ownerName: '测试角色',
    });
    resetPhoneToRoute('preset-manager', 'detail', '预设条目', { presetName: '简洁写作' });
    const loaded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-owner')));
    if (!loaded || document.body.textContent?.includes('立即应用')) {
      throw new Error('Historical chat preset detail did not keep the reading-rule-only boundary');
    }
  } else if (name === 'searchable-select' || name === 'searchable-select-dark-long') {
    useSettingsStore().setTheme(name === 'searchable-select-dark-long' ? 'dark' : 'light');
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
        {
          createdAt: '2026-07-31T00:00:03.000Z',
          enabled: true,
          id: 'visual-search-group-long',
          name: '这是一个需要在窄屏菜单中完整显示的超长动态分组名称',
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
    if (combobox.querySelectorAll('.pc-combobox-option').length !== 3) {
      throw new Error('Reopened searchable selector did not restore the full option list');
    }
    search.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    await waitForPaint();
    if (combobox.querySelector('.pc-combobox-menu')) throw new Error('Escape did not close the searchable selector');
    search.click();
    await waitForPaint();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await waitForPaint();
    if (combobox.querySelector('.pc-combobox-menu'))
      throw new Error('Outside pointerdown did not close the searchable selector');
    search.click();
    search.value = '当前';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    search.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    search.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    await waitForPaint();
    if (search.value !== '当前分组') throw new Error('Keyboard selection did not update the searchable selector');
    search.click();
    await waitForPaint();
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
    name === 'custom-app-conversion-merge' ||
    name === 'custom-app-conversion-profiles' ||
    name === 'custom-app-conversion-profiles-dark'
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
    let externalConversionData: null | {
      mate: { type: string };
      sheet_notes: { content: string[][]; name: string; uid: string };
    } = null;
    const isProfilesConversion =
      name === 'custom-app-conversion-profiles' || name === 'custom-app-conversion-profiles-dark';
    if (isProfilesConversion) {
      externalConversionData = {
        mate: { type: 'chatSheets' },
        sheet_notes: { content: [['row_id', '标题', '正文']], name: '片段资料表', uid: 'notes' },
      };
      const visualGlobal = globalThis as typeof globalThis & { AutoCardUpdaterAPI?: Record<string, unknown> };
      visualGlobal.AutoCardUpdaterAPI = {
        exportTableAsJson: () => externalConversionData,
        insertRow: (tableName: string, values: Record<string, unknown>) => {
          if (!externalConversionData || tableName !== externalConversionData.sheet_notes.name) return -1;
          const header = externalConversionData.sheet_notes.content[0] ?? [];
          externalConversionData.sheet_notes.content.push(header.map(column => String(values[column] ?? '')));
          return externalConversionData.sheet_notes.content.length - 1;
        },
      };
    }
    if (name.endsWith('-dark')) useSettingsStore().setTheme('dark');
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
      if (isProfilesConversion) {
        const targetCombobox = document.querySelector<HTMLElement>('.pc-conversion-panel .pc-field-group .pc-combobox');
        targetCombobox?.querySelector<HTMLInputElement>('.pc-combobox-input')?.click();
        await waitForPaint();
        const profilesOption = [...document.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
          button.textContent?.includes('资料表'),
        );
        if (!profilesOption) throw new Error('Profiles conversion target option was not rendered');
        profilesOption.click();
        await waitForPaint();
        const selectConversionField = async (inputLabel: string, optionLabel: string) => {
          const input = document.querySelector<HTMLInputElement>(
            `.pc-conversion-panel input[aria-label="${inputLabel}"]`,
          );
          const combo = input?.closest<HTMLElement>('.pc-combobox');
          input?.click();
          await waitForPaint();
          const option = [...(combo?.querySelectorAll<HTMLButtonElement>('.pc-combobox-option') ?? [])].find(button =>
            button.textContent?.includes(optionLabel),
          );
          if (!option) throw new Error(`Profiles conversion option was not rendered: ${inputLabel}/${optionLabel}`);
          option.click();
          await waitForPaint();
        };
        await selectConversionField('标题写入列', '标题');
        await selectConversionField('正文写入列', '正文');
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
        throw new Error('Custom app conversion target count did not match the selected batch mode');
      }
      const status = document.querySelector<HTMLElement>('.pc-status-card.success');
      if (!status?.textContent?.includes('转换完成')) {
        throw new Error('Custom app conversion did not reach its completion state');
      }
      if (isProfilesConversion && externalConversionData?.sheet_notes.content.length !== 3) {
        throw new Error('Profiles conversion did not insert one external row per source');
      }
    }
  } else if (name === 'preview-session-navigation') {
    useSettingsStore().setTheme('dark');
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
      const leaveNotice = document.querySelector<HTMLElement>('.pc-phone-notice');
      const noticeBackground = leaveNotice ? getComputedStyle(leaveNotice).backgroundColor : '';
      const noticeAlpha = Number(noticeBackground.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1] ?? 1);
      if (!leaveNotice || noticeAlpha < 0.99) {
        throw new Error(`Phone notice is transparent in dark mode: ${noticeBackground || 'missing'}`);
      }
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
  } else if (name === 'card-writer-generation-background') {
    const generationTasks = useGenerationTaskStore();
    generationTasks.tasks.slice().forEach(task => generationTasks.removeTask(task.id));
    const previewDrafts = usePreviewDraftStore();
    previewDrafts.deleteAppPreviewDrafts('card-writer');
    const settingsStore = useSettingsStore();
    settingsStore.settings.generation.rpmLimit = 0;
    settingsStore.settings.generation.stream = false;
    settingsStore.settings.textProvider.mode = 'tavern';
    const output = [
      '<content>',
      '  <artifact>离页后完成的写卡阶段；前序阶段会继续供后续阶段使用。</artifact>',
      '</content>',
    ].join('\n');
    const visualRuntime = globalThis as typeof globalThis & {
      generate?: (config: Record<string, unknown>) => Promise<string>;
      generateRaw?: (config: Record<string, unknown>) => Promise<string>;
    };
    const mockGenerate = async () => {
      await new Promise<void>(resolve => window.setTimeout(resolve, 140));
      return output;
    };
    visualRuntime.generate = mockGenerate;
    visualRuntime.generateRaw = mockGenerate;

    resetPhoneToRoute('card-writer', 'root', '写卡工坊');
    await waitForPaint();
    const fillExample = [...document.querySelectorAll<HTMLButtonElement>('.pc-card-writer-brief button')].find(button =>
      button.textContent?.includes('填入示例'),
    );
    if (!fillExample) throw new Error('Card writer full-card example action is missing');
    fillExample.click();
    await waitForPaint();
    const generateButton = document.querySelector<HTMLButtonElement>('.pc-generation-actions .pc-primary-btn');
    if (!generateButton) throw new Error('Card writer generation action is missing');
    generateButton.click();
    const started = await waitForVisualCondition(
      () => generationTasks.getSingleTask('card-writer', 'generate-sequence')?.status === 'running',
      1500,
    );
    if (!started) {
      const task = generationTasks.getSingleTask('card-writer', 'generate-sequence');
      const error = document.querySelector<HTMLElement>('.pc-generation-error')?.textContent?.trim() || '';
      throw new Error(
        `Card writer sequence task did not enter running state: status=${task?.status ?? 'missing'}, error=${task?.error || error}`,
      );
    }
    await phone.goHome();
    await waitForPaint();
    if (document.querySelector('.pc-card-writer-app')) throw new Error('Card writer source App did not unmount');

    const completed = await waitForVisualCondition(
      () => generationTasks.getSingleTask('card-writer', 'generate-sequence')?.status === 'completed',
      6000,
    );
    delete (visualRuntime as { generate?: (config: Record<string, unknown>) => Promise<string> }).generate;
    delete (visualRuntime as { generateRaw?: (config: Record<string, unknown>) => Promise<string> }).generateRaw;
    const task = generationTasks.getSingleTask('card-writer', 'generate-sequence');
    const draft = previewDrafts.getPreviewDraft('card-writer', 'preview');
    const payload = draft?.preview as { stages?: Array<{ status?: string }> } | undefined;
    if (
      !completed ||
      task?.routePage !== 'preview' ||
      !task.rawOutput.includes('离页后完成的写卡阶段') ||
      !payload?.stages?.length ||
      payload.stages.some(stage => stage.status !== 'completed') ||
      phone.currentRoute.appId === 'card-writer'
    ) {
      throw new Error('Card writer sequence did not finish into its persisted preview after leaving the App');
    }
  } else if (name === 'card-writer-reasoning-modal') {
    const { useCardWriterStore } = await import('@/apps/card-writer/store');
    const writer = useCardWriterStore();
    writer.settings.documents = [];
    writer.saveDocument({
      content: '## 角色基础\n\n这是带思维链记录的写卡成品。',
      sourceOwnerLabel: '测试角色',
      sourceLabel: '思维链弹窗测试成品',
      sourceScopeKey: 'char:0:chat:visual-current',
      stages: [
        {
          content: '## 角色基础\n\n这是带思维链记录的写卡成品。',
          error: '',
          id: 'visual-reasoning-stage',
          label: '角色基础',
          raw: '<content><artifact>这是带思维链记录的写卡成品。</artifact></content>',
          reasoning: '<thinking>先确认角色身份，再整理资料字段。</thinking>',
          status: 'completed',
        },
      ],
      targetWorldbookName: '',
      taskId: 'full-card',
      taskLabel: '一键写卡',
      title: '思维链视觉成品',
      worldbookIncluded: false,
      worldbookWritten: false,
    });
    resetPhoneToRoute('card-writer', 'library', '写卡成品');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-card-writer-document-open')?.click();
    const previewOpened = await waitForVisualCondition(
      () => phone.currentRoute.appId === 'card-writer' && phone.currentRoute.page === 'preview',
    );
    if (!previewOpened) throw new Error('Card writer reasoning fixture did not open its preview');
    const reasoningSummary = document.querySelector<HTMLElement>(
      '.pc-generation-preview .pc-reasoning-disclosure > summary',
    );
    if (!reasoningSummary) throw new Error('Card writer reasoning disclosure did not render from the saved stage');
    reasoningSummary.click();
    const disclosureOpened = await waitForVisualCondition(
      () =>
        document.querySelector<HTMLDetailsElement>('.pc-generation-preview .pc-reasoning-disclosure')?.open === true,
    );
    if (
      !disclosureOpened ||
      !document.querySelector('.pc-reasoning-disclosure')?.textContent?.includes('先确认角色身份')
    ) {
      throw new Error('Card writer reasoning disclosure did not expand with saved content');
    }
    const findReasoningAction = (label: string) =>
      [...document.querySelectorAll<HTMLButtonElement>('.pc-reasoning-actions button')].find(
        button => button.textContent?.trim() === label,
      );
    findReasoningAction('编辑')?.click();
    await waitForPaint();
    const firstEditor = document.querySelector<HTMLTextAreaElement>('.pc-reasoning-editor');
    if (!firstEditor) throw new Error('Card writer reasoning edit action did not open the shared editor');
    firstEditor.value = '这次修改应被取消。';
    firstEditor.dispatchEvent(new Event('input', { bubbles: true }));
    findReasoningAction('取消')?.click();
    await waitForPaint();
    if (!document.querySelector('.pc-reasoning-disclosure')?.textContent?.includes('先确认角色身份')) {
      throw new Error('Card writer reasoning cancel did not preserve the saved stage');
    }
    findReasoningAction('编辑')?.click();
    await waitForPaint();
    const appliedEditor = document.querySelector<HTMLTextAreaElement>('.pc-reasoning-editor');
    if (!appliedEditor) throw new Error('Card writer reasoning editor did not reopen');
    appliedEditor.value = '已修改的写卡思维链。';
    appliedEditor.dispatchEvent(new Event('input', { bubbles: true }));
    findReasoningAction('应用')?.click();
    const reasoningApplied = await waitForVisualCondition(
      () => document.querySelector('.pc-reasoning-disclosure')?.textContent?.includes('已修改的写卡思维链') === true,
    );
    if (!reasoningApplied) throw new Error('Card writer reasoning apply did not update the active preview stage');
    findReasoningAction('编辑')?.click();
    await waitForPaint();
    findReasoningAction('清空')?.click();
    await waitForPaint();
    const clearedEditor = document.querySelector<HTMLTextAreaElement>('.pc-reasoning-editor');
    if (!clearedEditor || clearedEditor.value !== '') {
      throw new Error('Card writer reasoning clear did not empty the local edit draft');
    }
    useSettingsStore().setTheme('dark');
    await waitForPaint();
    const darkActions = [...document.querySelectorAll<HTMLElement>('.pc-reasoning-actions button')];
    const darkEditor = document.querySelector<HTMLElement>('.pc-reasoning-editor');
    if (
      darkActions.length !== 3 ||
      darkActions.some(
        button => button.getBoundingClientRect().width <= 0 || getComputedStyle(button).color === 'transparent',
      ) ||
      !darkEditor ||
      darkEditor.getBoundingClientRect().height < 96
    ) {
      throw new Error('Card writer reasoning editor is not readable in dark mode');
    }
    useSettingsStore().setTheme('light');
    await waitForPaint();
  } else if (name === 'card-writer-profile-direct-import' || name === 'card-writer-profile-direct-import-dark') {
    const visualGlobal = globalThis as typeof globalThis & { AutoCardUpdaterAPI?: Record<string, unknown> };
    const data = {
      mate: { type: 'chatSheets' },
      sheet_people: {
        content: [['姓名', 'details', 'birthDate']],
        name: '人物表',
        uid: 'people',
      },
    };
    visualGlobal.AutoCardUpdaterAPI = {
      exportTableAsJson: () => data,
      insertRow: (tableName: string, values: Record<string, unknown>) => {
        if (tableName !== data.sheet_people.name) return -1;
        const header = data.sheet_people.content[0] ?? [];
        data.sheet_people.content.push(header.map(column => String(values[column] ?? '')));
        return data.sheet_people.content.length - 1;
      },
      updateRow: () => true,
      deleteRow: () => true,
    };
    const { useCardWriterStore } = await import('@/apps/card-writer/store');
    const writer = useCardWriterStore();
    writer.settings.documents = [];
    writer.saveDocument({
      content: '<character>\n姓名：林见夏\n出生日期：2002-03-04\n身份：调查员\n</character>',
      sourceOwnerLabel: '测试角色',
      sourceLabel: '外部映射导入测试',
      sourceScopeKey: getCurrentChatScopeKey(),
      stages: [],
      targetWorldbookName: '',
      taskId: 'full-card',
      taskLabel: '一键写卡',
      title: '外部资料导入测试',
      worldbookIncluded: false,
      worldbookWritten: false,
    });
    if (name.endsWith('-dark')) useSettingsStore().setTheme('dark');
    resetPhoneToRoute('card-writer', 'library', '写卡成品');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('button[title="导入资料表"]')?.click();
    const importOpened = await waitForVisualCondition(() => phone.currentRoute.page === 'profile-import');
    if (!importOpened || !document.querySelector('.pc-card-writer-import-mapping')) {
      throw new Error('Card writer profile mapping import page did not open');
    }
    document.querySelector<HTMLButtonElement>('.pc-form-actions .pc-primary-btn')?.click();
    const confirmButton = await waitForVisualCondition(() =>
      [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].some(button =>
        button.textContent?.includes('确认导入'),
      ),
    );
    if (!confirmButton) throw new Error('Card writer external import confirmation did not open');
    [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')]
      .find(button => button.textContent?.includes('确认导入'))
      ?.click();
    const imported = await waitForVisualCondition(() => data.sheet_people.content.length === 2);
    if (
      !imported ||
      data.sheet_people.content[1]?.[0] !== '林见夏' ||
      data.sheet_people.content[1]?.[2] !== '2002-03-04'
    ) {
      throw new Error(`Card writer did not insert the external row: ${JSON.stringify(data.sheet_people.content)}`);
    }
    const returnedToLibrary = await waitForVisualCondition(() => phone.currentRoute.page === 'library');
    if (!returnedToLibrary) throw new Error('Card writer did not return to its library after external import');
    document.querySelector<HTMLButtonElement>('button[title="导入资料表"]')?.click();
    const reopened = await waitForVisualCondition(
      () =>
        phone.currentRoute.page === 'profile-import' &&
        Boolean(document.querySelector('.pc-card-writer-import-mapping')),
    );
    if (!reopened) throw new Error('Card writer profile import page did not reopen for visual verification');
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
  } else if (name === 'regex-display-preview') {
    resetPhoneToRoute('regex-display', 'root', '正则展示');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-regex-rule-open')?.click();
    await waitForPaint();
    const previewArea = document.querySelector<HTMLTextAreaElement>('.pc-area.preview-source');
    if (!previewArea) throw new Error('Regex display preview textarea is missing');
    const previewSection = previewArea.closest<HTMLElement>('.pc-regex-preview-section');
    const displayApp = previewArea.closest<HTMLElement>('.pc-regex-display-app');
    if (!previewSection || !displayApp) throw new Error('Regex display preview layout container is missing');
    previewArea.scrollIntoView({ block: 'center' });
    await waitForPaint();
  } else if (name === 'regex-wizard-test') {
    resetPhoneToRoute('regex-wizard', 'root', '正则向导');
    await waitForPaint();
    const testArea = document.querySelector<HTMLTextAreaElement>('.pc-regex-wizard-test .pc-area');
    if (!testArea) throw new Error('Regex wizard test textarea is missing');
    const testSection = testArea.closest<HTMLElement>('.pc-regex-wizard-test');
    const wizardApp = testArea.closest<HTMLElement>('.pc-regex-wizard-app');
    if (!testSection || !wizardApp) throw new Error('Regex wizard test layout container is missing');
    for (const child of wizardApp.children) {
      if (child !== testSection) (child as HTMLElement).style.display = 'none';
    }
    testArea.scrollIntoView({ block: 'center' });
    await waitForPaint();
  } else if (name === 'regex-wizard-fields') {
    resetPhoneToRoute('regex-wizard', 'root', '正则向导');
    await waitForPaint();
    const fieldsButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-regex-wizard-mode-tabs button')].find(
      button => button.textContent?.includes('多个字段'),
    );
    if (!fieldsButton) throw new Error('Regex wizard fields mode is missing');
    fieldsButton.click();
    await waitForPaint();
  } else if (name === 'digest-editor') {
    resetPhoneToRoute('digest', 'editor', '新建摘抄');
    await waitForPaint();
    const sourceArea = document.querySelector<HTMLTextAreaElement>('.pc-digest-editor-section .pc-area.compact');
    if (!sourceArea) throw new Error('Digest source-text textarea is missing');
    sourceArea.scrollIntoView({ block: 'center' });
    await waitForPaint();
  } else if (name === 'game-guess-number-input') {
    resetPhoneToRoute('game-guess-number', 'root', '猜数字');
    await waitForPaint();
    const input = document.querySelector<HTMLInputElement>('.pc-guess-form .pc-guess-number-input');
    if (!input) throw new Error('Guess-number input is missing from its isolated scenario');
    if (input.value) throw new Error('Guess-number visual scenario must not prefill or submit a guess');
    const styles = getComputedStyle(input);
    if (styles.fontSize !== '22px' || styles.fontWeight !== '800' || styles.textAlign !== 'center') {
      throw new Error(
        `Guess-number input semantic changed: ${styles.fontSize}/${styles.fontWeight}/${styles.textAlign}`,
      );
    }
    const stats = document.querySelector<HTMLElement>('.pc-minigame-stats');
    if (!stats) throw new Error('Guess-number stats fixture is missing');
    stats.style.display = 'none';
    input.scrollIntoView({ block: 'center' });
    await waitForPaint();
  } else if (name.startsWith('app:')) {
    const appId = name.slice('app:'.length);
    const app = PHONE_APPS.find(item => item.id === appId);
    if (!app) throw new Error(`Unknown app visual scenario: ${name}`);
    prepareManagementToolsVisualRuntime(appId);
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
    } else if (appId === 'theme') {
      await waitForPaint();
      const packNames = [...document.querySelectorAll<HTMLElement>('.pc-theme-pack-copy strong')];
      if (!packNames.length || packNames.some(name => name.scrollWidth > name.clientWidth + 1)) {
        throw new Error('Theme pack names are truncated in the narrow phone layout');
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
  } else if (name === 'archive-current-browser') {
    await seedArchiveFloorBackupFixture();
    resetPhoneToRoute('archive', 'root', '聊天档案');
    const loaded = await waitForVisualCondition(() =>
      [...document.querySelectorAll<HTMLButtonElement>('.pc-current-chat-browser .pc-chat-row')].some(button =>
        button.textContent?.includes('视觉旧聊天 B'),
      ),
    );
    if (!loaded) throw new Error('Archive current page did not load all chats for the current owner');
    await waitForPaint();
    const backupStatus = document.querySelector<HTMLElement>('.pc-current-backup-status');
    const statusCopy = backupStatus?.querySelector<HTMLElement>('p');
    if (!backupStatus || !statusCopy) throw new Error('Archive current backup status card is incomplete');
    const statusRect = backupStatus.getBoundingClientRect();
    const copyRect = statusCopy.getBoundingClientRect();
    if (copyRect.left < statusRect.left || copyRect.right > statusRect.right + 1) {
      throw new Error('Archive current backup status escaped its card on a narrow phone');
    }
    const rows = [...document.querySelectorAll<HTMLButtonElement>('.pc-current-chat-browser .pc-chat-row')];
    if (rows.length !== 3) throw new Error(`Archive current browser expected 3 chats, received ${rows.length}`);
    const originalTavernScope = phone.currentTavernScopeKey;
    const historicalRow = rows.find(button => button.textContent?.includes('视觉旧聊天 B'));
    historicalRow?.click();
    const detailOpened = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-readonly-card')));
    if (
      !historicalRow ||
      !detailOpened ||
      phone.currentRoute.page !== 'detail' ||
      phone.currentTavernScopeKey !== originalTavernScope ||
      phone.viewingScopeKey === originalTavernScope
    ) {
      throw new Error('Archive list selection switched the tavern chat or missed the shared read-only detail path');
    }
    await phone.goBack();
    await waitForVisualCondition(() => Boolean(document.querySelector('.pc-current-chat-browser .pc-chat-row')));
    const randomButton = document.querySelector<HTMLButtonElement>(
      '.pc-current-chat-browser button[title="随机查看聊天"]',
    );
    if (!randomButton || randomButton.disabled) throw new Error('Archive random read-only action is unavailable');
    const originalRandom = Math.random;
    try {
      Math.random = () => 0.5;
      randomButton.click();
      await waitForVisualCondition(() => phone.currentRoute.page === 'detail');
    } finally {
      Math.random = originalRandom;
    }
    if (phone.currentRoute.page !== 'detail' || phone.currentTavernScopeKey !== originalTavernScope) {
      throw new Error('Archive random action changed the tavern chat instead of opening an archive detail');
    }
    await phone.goBack();
    const returned = await waitForVisualCondition(() =>
      Boolean(document.querySelector('.pc-current-chat-browser .pc-chat-row')),
    );
    const currentTab = document.querySelector<HTMLButtonElement>('.pc-tab-row .pc-segment-btn.active');
    if (!returned || !currentTab?.textContent?.includes('当前聊天')) {
      throw new Error('Archive random detail did not return to the current-chat browser');
    }
  } else if (name === 'archive-floor-backup') {
    await new Promise(resolve => window.setTimeout(resolve, 1000));
    await seedArchiveFloorBackupFixture();
    resetPhoneToRoute('settings', 'root', '设置');
    await waitForPaint();
    resetPhoneToRoute('archive', 'root', '聊天档案');
    await waitForPaint();
    const unusedTab = [...document.querySelectorAll<HTMLButtonElement>('.pc-tab-row .pc-segment-btn')].find(button =>
      button.textContent?.includes('未使用'),
    );
    if (!unusedTab) throw new Error('Archive unused-character tab is missing');
    unusedTab.click();
    await waitForPaint();
    const refresh = document.querySelector<HTMLButtonElement>('.pc-archive-search-row .pc-icon-btn');
    if (!refresh) throw new Error('Archive character refresh action is missing');
    refresh.click();
    await waitForVisualCondition(() => Boolean(document.querySelector('.pc-owner-row')));
    await waitForPaint();
    const ownerRow = document.querySelector<HTMLButtonElement>('.pc-owner-row');
    if (!ownerRow) throw new Error('Archive floor backup owner is missing');
    ownerRow.click();
    await waitForVisualCondition(() => Boolean(document.querySelector('.pc-archive-toolbar .pc-icon-btn')));
    await waitForPaint();
    const chatRefresh = document.querySelector<HTMLButtonElement>('.pc-archive-toolbar .pc-icon-btn');
    if (!chatRefresh) throw new Error('Archive chat refresh action is missing');
    chatRefresh.click();
    await waitForVisualCondition(() =>
      [...document.querySelectorAll<HTMLButtonElement>('.pc-chat-row')].some(
        button => button.textContent?.includes('visual-chat.jsonl') && button.textContent.includes('已备份 2 层'),
      ),
    );
    await waitForPaint();
    const chatRows = [...document.querySelectorAll<HTMLButtonElement>('.pc-chat-row')];
    const backupChat = chatRows.find(
      button => button.textContent?.includes('visual-chat.jsonl') && button.textContent.includes('已备份'),
    );
    if (!backupChat) {
      throw new Error(
        `Archive floor backup chat is missing: ${chatRows.map(button => button.textContent?.trim() ?? '').join(' | ')}`,
      );
    }
    backupChat.click();
    await waitForPaint();
    const actions = [...document.querySelectorAll<HTMLButtonElement>('.pc-archive-backup-actions button')];
    if (
      !['阅读备份', '导出备份', '导入备份', '立即备份', '聊天改名', '删除备份'].every(label =>
        actions.some(button => button.textContent?.includes(label)),
      )
    ) {
      throw new Error('Archive floor backup actions are incomplete');
    }
    const actionRects = actions.slice(0, 6).map(button => button.getBoundingClientRect());
    const rowTops = new Set(actionRects.map(rect => Math.round(rect.top)));
    const columnLefts = new Set(actionRects.map(rect => Math.round(rect.left)));
    if (rowTops.size !== 2 || columnLefts.size !== 3) {
      throw new Error(`Archive floor backup actions are not 3 columns × 2 rows: ${columnLefts.size} × ${rowTops.size}`);
    }
    const readBackup = actions.find(button => button.textContent?.includes('阅读备份'));
    if (!readBackup || readBackup.disabled) throw new Error('Archive seeded floor backup is not readable');
    readBackup.click();
    await waitForPaint();
    const hasMessage = Boolean(document.querySelector('.pc-floor-message'));
    const hasReasoning = Boolean(document.querySelector('.pc-floor-message details'));
    const hasFooter = Boolean(document.querySelector('.pc-floor-backup-footer'));
    if (!hasMessage || !hasReasoning || !hasFooter) {
      const messageText = [...document.querySelectorAll<HTMLElement>('.pc-floor-message')]
        .map(item => item.textContent?.trim() ?? '')
        .join(' | ');
      throw new Error(
        `Archive floor backup reader is incomplete: message=${hasMessage}, reasoning=${hasReasoning}, footer=${hasFooter}, text=${messageText}`,
      );
    }
  } else if (name === 'preset-builtin-diary') {
    resetPhoneToRoute('preset-manager', 'root', '预设管理');
    await waitForPaint();
    const sourceTabs = [...document.querySelectorAll<HTMLButtonElement>('.pc-preset-source-tabs .pc-segment-btn')];
    sourceTabs.find(button => button.textContent?.includes('插件预设'))?.click();
    const loaded = await waitForVisualCondition(() =>
      [...document.querySelectorAll<HTMLElement>('.pc-preset-row')].some(row =>
        row.textContent?.includes('日记（内置）'),
      ),
    );
    if (!loaded) throw new Error('Built-in diary preset is missing from plugin preset management');
    const row = [...document.querySelectorAll<HTMLElement>('.pc-preset-row')].find(item =>
      item.textContent?.includes('日记（内置）'),
    );
    row?.querySelector<HTMLButtonElement>('.pc-preset-open')?.click();
    const detailLoaded = await waitForVisualCondition(() =>
      Boolean(document.querySelector('.pc-preset-nodes .pc-preset-prompt-main')),
    );
    if (!detailLoaded) {
      const route = usePhoneStore().currentRoute;
      const detailError = document.querySelector<HTMLElement>('.pc-preset-error')?.textContent?.trim() || 'none';
      throw new Error(
        `Built-in diary preset detail did not open from preset management; route=${route.appId}/${route.page}; error=${detailError}`,
      );
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
  } else if (name === 'preset-editor-role-save') {
    resetPhoneToRoute('preset-manager', 'detail', '预设条目', { presetName: '视觉预设' });
    phone.pushRoute('preset-manager', 'edit', '编辑预设条目', {
      presetName: '视觉预设',
      promptId: 'visual-style',
    });
    const loaded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-editor-page')));
    const roleSelect = document.querySelector<HTMLSelectElement>('.pc-preset-editor-page .pc-select');
    if (!loaded || !roleSelect) throw new Error('Saved preset prompt role selector is missing');
    roleSelect.value = 'assistant';
    roleSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForPaint();
    const saveButton = [
      ...document.querySelectorAll<HTMLButtonElement>('.pc-preset-editor-page .pc-form-actions button'),
    ].find(button => button.textContent?.trim() === '保存');
    if (!saveButton || saveButton.disabled) throw new Error('Changing a saved prompt role did not enable save');
    saveButton.click();
    const returned = await waitForVisualCondition(() => usePhoneStore().currentRoute.page === 'detail');
    const savedRole = readTavernPreset('视觉预设').prompts.find(prompt => prompt.id === 'visual-style')?.role;
    if (!returned || savedRole !== 'assistant') {
      throw new Error(`Saved preset prompt role did not persist: ${savedRole || 'missing'}`);
    }
  } else if (name === 'preset-scroll-return' || name === 'preset-scroll-return-dark') {
    if (name.endsWith('-dark')) useSettingsStore().setTheme('dark');
    await loadTavernPreset('简洁写作');
    resetPhoneToRoute('preset-manager', 'root', '预设管理');
    const tabsLoaded = await waitForVisualCondition(() =>
      [...document.querySelectorAll<HTMLButtonElement>('.pc-preset-source-tabs .pc-segment-btn')].some(button =>
        button.textContent?.includes('酒馆预设'),
      ),
    );
    const tavernTab = [...document.querySelectorAll<HTMLButtonElement>('.pc-preset-source-tabs .pc-segment-btn')].find(
      button => button.textContent?.includes('酒馆预设'),
    );
    if (!tabsLoaded || !tavernTab) throw new Error('Tavern preset source tab did not load');
    tavernTab.click();
    const catalogLoaded = await waitForVisualCondition(() =>
      Boolean(document.querySelector('.pc-preset-current')?.textContent?.includes('当前：简洁写作')),
    );
    const firstPresetName = document.querySelector<HTMLElement>('.pc-preset-row strong')?.textContent?.trim();
    if (!catalogLoaded || firstPresetName !== '简洁写作') {
      throw new Error(`Current Tavern preset was not placed first: ${firstPresetName || 'missing'}`);
    }
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    await loadTavernPreset('视觉预设');
    resetPhoneToRoute('preset-manager', 'detail', '预设条目', { presetName: '视觉预设' });
    const loaded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-group-head')));
    if (!loaded || document.querySelector('.pc-preset-group-body')) {
      throw new Error('Preset detail did not start with its collapsed fixture group');
    }
    document.querySelector<HTMLButtonElement>('.pc-preset-group-head')?.click();
    const expanded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-group-body')));
    if (!expanded) throw new Error('Preset group did not expand before opening its content');
    const page = document.querySelector<HTMLElement>('.pc-preset-page');
    if (!page) throw new Error('Preset detail scroll container is missing');
    page.scrollTop = Math.max(80, page.scrollHeight - page.clientHeight - 20);
    await waitForPaint();
    const expectedScrollTop = page.scrollTop;
    document.querySelector<HTMLButtonElement>('.pc-preset-group-body .pc-preset-prompt-main')?.click();
    const editorLoaded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-editor-page')));
    if (!editorLoaded) throw new Error('Preset editor did not open for scroll restoration');
    await usePhoneStore().goBack();
    const returned = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-nodes')));
    if (!returned) throw new Error('Preset detail did not return from editor');
    await new Promise(resolve => window.setTimeout(resolve, 320));
    const restoredPage = document.querySelector<HTMLElement>('.pc-preset-page');
    if (!document.querySelector('.pc-preset-group-body')) {
      throw new Error('Expanded preset group collapsed after returning from its prompt');
    }
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
    phone.stack = [{ appId: 'home', page: 'home', title: '功能性阅读器' }];
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
  } else if (name === 'worldbook-entry-copy' || name === 'worldbook-entry-copy-dark') {
    if (name.endsWith('-dark')) useSettingsStore().setTheme('dark');
    resetPhoneToRoute('worldbook-link', 'detail', '【视觉】旧格式世界书', { bookName: '【视觉】旧格式世界书' });
    const loaded = await waitForVisualCondition(() => Boolean(document.querySelector('.pc-worldbook-entry-copy-btn')));
    if (!loaded) throw new Error('Worldbook entry copy action did not load');
    document.querySelector<HTMLButtonElement>('.pc-worldbook-entry-copy-btn')?.click();
    const copyLoaded = await waitForVisualCondition(
      () =>
        usePhoneStore().currentRoute.page === 'copy' && Boolean(document.querySelector('.pc-worldbook-entry-editor')),
    );
    const copyName = document.querySelector<HTMLInputElement>('.pc-worldbook-entry-editor .pc-field')?.value;
    if (!copyLoaded || copyName !== '缺少关键词数组的旧条目 - 副本') {
      throw new Error(`Worldbook copy editor did not preload a distinct copy name: ${copyName || 'missing'}`);
    }
    const saveCopy = [
      ...document.querySelectorAll<HTMLButtonElement>('.pc-worldbook-entry-editor-actions button'),
    ].find(button => button.textContent?.trim() === '保存副本');
    saveCopy?.click();
    const returned = await waitForVisualCondition(
      () =>
        usePhoneStore().currentRoute.page === 'detail' && document.querySelectorAll('.pc-worldbook-entry').length === 3,
    );
    const entries = await getWorldbookEntries('【视觉】旧格式世界书');
    const source = entries.find(entry => entry.uid === 1);
    const copy = entries.find(entry => entry.name === '缺少关键词数组的旧条目 - 副本');
    if (
      !returned ||
      !source ||
      !copy ||
      copy.enabled !== source.enabled ||
      copy.strategy.type !== source.strategy.type ||
      copy.content !== source.content
    ) {
      throw new Error('Copied worldbook entry did not preserve the source entry configuration');
    }
  } else if (name === 'world-strategy-lamps') {
    const worldSlots = useWorldSlotsStore();
    await worldSlots.resetCurrentScope();
    worldSlots.createSlot({
      content: 'constant 即使保留关键词也必须显示蓝灯。',
      keys: ['不参与灯色判断'],
      strategyType: 'constant',
      title: '常驻策略',
    });
    worldSlots.createSlot({
      content: 'selective 即使暂未填写关键词也必须显示绿灯。',
      keys: [],
      strategyType: 'selective',
      title: '触发策略',
    });
    resetPhoneToRoute('world-slots', 'root', '世界书槽位');
    await waitForPaint();
    if (
      document.querySelectorAll('.pc-world-entry-lamp.blue').length !== 1 ||
      document.querySelectorAll('.pc-world-entry-lamp.green').length !== 1
    ) {
      throw new Error('World slot lamps did not map constant to blue and selective to green');
    }

    resetPhoneToRoute('worldbook-link', 'detail', '【视觉】旧格式世界书', { bookName: '【视觉】旧格式世界书' });
    const strategiesLoaded = await waitForVisualCondition(
      () => document.querySelectorAll('.pc-worldbook-entry').length === 2,
    );
    if (!strategiesLoaded) throw new Error('Worldbook strategy fixtures did not load');
    if (
      document.querySelectorAll('.pc-worldbook-entry-lamp.blue').length !== 1 ||
      document.querySelectorAll('.pc-worldbook-entry-lamp.green').length !== 1
    ) {
      throw new Error('Worldbook lamps did not map constant to blue and selective to green');
    }
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
  } else if (name === 'version-navigator-stepper') {
    const extras = useExtrasStore();
    const book = createLegacyExtrasFixture();
    const chapter = book.chapters[0];
    if (!chapter) throw new Error('Version stepper fixture did not create an extra chapter');
    const saved = extras.appendChapterVersion(book.id, chapter.id, {
      content: '用于验证版本序号跳转器的候选正文。',
      title: '版本序号候选版',
    });
    if (!saved || chapter.versions.length !== 2) throw new Error('Version stepper fixture did not create two versions');
    resetPhoneToRoute('extras', 'chapter', saved.version.title, {
      bookId: book.id,
      chapterId: chapter.id,
      versionId: saved.version.id,
    });
    await waitForPaint();
    const navigator = document.querySelector<HTMLElement>('.pc-version-navigator');
    const status = navigator?.querySelector<HTMLElement>('.pc-version-status');
    const buttons = navigator?.querySelectorAll<HTMLButtonElement>('.pc-version-step');
    if (!navigator || !status || buttons?.length !== 2) {
      throw new Error('Compact version navigator is missing from its isolated scenario');
    }
    if (status.textContent?.trim() !== '2 / 2') {
      throw new Error(`Version navigator opened the wrong index: ${status.textContent?.trim()}`);
    }
    const buttonStyles = getComputedStyle(buttons[0]);
    if (buttonStyles.width !== '30px' || buttonStyles.height !== '30px') {
      throw new Error(`Version step button size changed: ${buttonStyles.width}/${buttonStyles.height}`);
    }
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
    await waitForPaint();
    await openReaderTools();
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
    await openReaderTools();

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

    nextButton.click();
    const returnedToCandidate = await waitForVisualCondition(
      () => usePhoneStore().currentRoute.params?.versionId === saved.version.id,
    );
    if (!returnedToCandidate) throw new Error('Repeated next-version action did not select the candidate version');
    if (document.querySelector<HTMLElement>('.pc-version-status')?.textContent?.trim() !== '2 / 2') {
      throw new Error('Version navigator count did not follow the selected version');
    }

    if (chapter.activeVersionId !== saved.version.id || chapter.content !== saved.version.content) {
      throw new Error('Version selection did not immediately activate the viewed chapter');
    }
    if (document.querySelector('.pc-version-navigator .pc-primary-btn, .pc-version-actions')) {
      throw new Error('Version navigator still exposed separate adoption or deletion actions');
    }
    const deleteButton = document.querySelector<HTMLButtonElement>('.pc-reader-tool-menu .danger');
    if (!deleteButton) throw new Error('Reader tool menu did not expose contextual version deletion');
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
      { appId: 'home', page: 'home', title: '功能性阅读器' },
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

    const presetField = document.querySelector<HTMLElement>('.pc-generation-provider-fields .pc-preset-field');
    const presetHead = presetField?.querySelector<HTMLElement>('.pc-field-head');
    const presetSelect = presetField?.querySelector<HTMLElement>('.pc-combobox');
    const refreshButton = presetHead?.querySelector<HTMLButtonElement>('button[aria-label="刷新预设列表"]');
    if (!presetField || !presetHead || !presetSelect || !refreshButton) {
      throw new Error('Generation preset refresh field did not render the shared heading structure');
    }
    const fieldRect = presetField.getBoundingClientRect();
    const headRect = presetHead.getBoundingClientRect();
    const selectRect = presetSelect.getBoundingClientRect();
    const refreshRect = refreshButton.getBoundingClientRect();
    if (Math.abs(refreshRect.top + refreshRect.height / 2 - (headRect.top + headRect.height / 2)) > 2) {
      throw new Error('Generation preset refresh action is not aligned with the field label');
    }
    if (selectRect.top < headRect.bottom || selectRect.width < fieldRect.width * 0.95) {
      throw new Error('Generation preset selector did not keep its own full-width row');
    }
    refreshButton.click();
    await waitForPaint();
    if (!refreshButton.disabled || !refreshButton.querySelector('.fa-spin')) {
      throw new Error('Generation preset refresh action did not expose its active feedback');
    }

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
  } else if (name === 'preview-draft-deferred-save' || name === 'preview-draft-deferred-save-dark') {
    const previewDrafts = usePreviewDraftStore();
    const probePreview = ref<{ content: string } | null>({ content: '首次保存的预览内容' });
    let probeRouteParams: Record<string, string> = { bookId: 'visual_preserved_book' };
    const scope = effectScope();
    const persistence = scope.run(() =>
      usePreviewDraftPersistence<{ content: string }>({
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
    const initialProbePreview = probePreview.value;
    if (!initialProbePreview) throw new Error('Preview draft probe lost its initial content');
    initialProbePreview.content = '离开生成页后自动更新的预览内容';
    await nextTick();
    await waitForPaint();
    const probeDraft = previewDrafts.getPreviewDraft('visual-preview-probe', 'preview');
    if (probeDraft?.routeParams.bookId !== 'visual_preserved_book') {
      throw new Error('Preview draft auto-update overwrote its original target route parameters');
    }
    if (!probeDraft) throw new Error('Preview draft probe did not create its first draft');
    const firstProbeDraftId = probeDraft.id;
    persistence.beginPreviewDraft();
    probePreview.value = { content: '第二份独立预览内容' };
    await nextTick();
    await waitForPaint();
    const probeDrafts = previewDrafts.getPreviewDrafts('visual-preview-probe', 'preview');
    if (probeDrafts.length !== 2) throw new Error('Starting a second preview overwrote the first draft');
    const secondProbeDraft = probeDrafts.find(draft => draft.id !== firstProbeDraftId);
    if (!secondProbeDraft) throw new Error('Second preview draft did not receive a distinct id');

    probePreview.value = null;
    const restoredDraft = persistence.restorePreviewDraft(firstProbeDraftId);
    const restoredPreview = probePreview.value ?? (restoredDraft?.preview as { content: string } | null);
    if (restoredPreview?.content !== '离开生成页后自动更新的预览内容') {
      throw new Error('Restoring an older preview draft did not select its own content');
    }
    const restoredProbePreview = restoredPreview;
    if (!restoredProbePreview) throw new Error('Restored preview draft did not provide editable content');
    probePreview.value = restoredProbePreview;
    restoredProbePreview.content = '只修改第一份预览内容';
    await nextTick();
    await waitForPaint();
    const preservedSecondPreview = previewDrafts.getPreviewDraftById(secondProbeDraft.id)?.preview;
    if (
      !preservedSecondPreview ||
      typeof preservedSecondPreview !== 'object' ||
      !('content' in preservedSecondPreview) ||
      (preservedSecondPreview as { content?: unknown }).content !== '第二份独立预览内容'
    ) {
      throw new Error('Editing the active draft also modified a different preview draft');
    }
    persistence.clearPreviewDraft();
    if (
      previewDrafts.getPreviewDraftById(firstProbeDraftId) ||
      previewDrafts.getPreviewDrafts('visual-preview-probe', 'preview').length !== 1
    ) {
      throw new Error('Saving or clearing the active preview draft removed more than that draft');
    }
    scope.stop();
    previewDrafts.deleteAppPreviewDrafts('visual-preview-probe');

    const extras = useExtrasStore();
    extras.resetCurrentScope();
    const book = extras.createBook({ title: '稍后处理测试番外', typeName: '测试' });
    previewDrafts.deleteAppPreviewDrafts('extras');
    resetPhoneToRoute('extras', 'root', '番外书架');
    await waitForPaint();
    const staleExtrasDraft = previewDrafts.upsertPreviewDraft({
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
      title: '稍后处理章节草稿',
    });
    previewDrafts.createPreviewDraft({
      appId: 'extras',
      page: 'chapter-preview',
      preview: {
        bookId: book.id,
        chapterId: '',
        content: '这是第二份未保存的番外章节正文，用于确认草稿管理可以选择后继续。',
        draftId: null,
        mode: '续写上一章',
        raw: '<title>第二份草稿章节</title><content>这是第二份未保存的番外章节正文。</content>',
        title: '第二份草稿章节',
        warnings: [],
      },
      routeParams: { bookId: book.id },
      title: '第二份草稿章节',
    });
    await waitForPaint();
    const draftCountLabel =
      document.querySelector<HTMLElement>('.pc-preview-draft-notice .pc-kicker')?.textContent || '';
    if (!draftCountLabel.includes('2')) throw new Error('Preview draft notice did not show the multi-draft count');
    const manageDraftButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-preview-draft-notice button')].find(
      button => button.textContent?.includes('管理草稿'),
    );
    if (!manageDraftButton) throw new Error('Preview draft manager entry did not appear');
    manageDraftButton.click();
    await waitForPaint();
    const managerItems = [...document.querySelectorAll<HTMLButtonElement>('.pc-preview-draft-manager-item')];
    if (managerItems.length !== 2) throw new Error('Preview draft manager did not list both unsaved previews');
    const staleExtrasManagerItem = managerItems.find(item => item.dataset.draftId === staleExtrasDraft.id);
    if (!staleExtrasManagerItem) throw new Error('Preview draft manager did not expose the older draft title');
    staleExtrasManagerItem.click();
    document.querySelector<HTMLButtonElement>('.pc-preview-draft-manager .pc-primary-btn')?.click();
    await waitForPaint();
    if (usePhoneStore().currentRoute.page !== 'chapter-preview') {
      throw new Error('Preview draft manager did not continue the selected preview');
    }
    resetPhoneToRoute('extras', 'root', '番外书架');
    await waitForPaint();
    const manageDraftButtonAfterReturn = [
      ...document.querySelectorAll<HTMLButtonElement>('.pc-preview-draft-notice button'),
    ].find(button => button.textContent?.includes('管理草稿'));
    if (!manageDraftButtonAfterReturn) throw new Error('Preview draft manager disappeared after returning home');
    manageDraftButtonAfterReturn.click();
    await waitForPaint();
    const deleteTarget = [...document.querySelectorAll<HTMLButtonElement>('.pc-preview-draft-manager-item')].find(
      item => item.dataset.draftId === staleExtrasDraft.id,
    );
    if (!deleteTarget) throw new Error('Preview draft manager lost the selected older draft');
    deleteTarget.click();
    document.querySelector<HTMLButtonElement>('.pc-preview-draft-manager .pc-soft-btn.danger')?.click();
    await waitForPaint();
    const deleteNotice = usePhoneStore().notices.find(notice => notice.message.includes('要删除未保存预览'));
    if (!deleteNotice) throw new Error('Preview draft deletion did not require confirmation');
    usePhoneStore().chooseNoticeAction(deleteNotice.id, 'confirm');
    await waitForPaint();
    if (previewDrafts.getPreviewDraftById(staleExtrasDraft.id)) {
      throw new Error('Confirmed preview draft deletion did not remove only the selected draft');
    }
    document.querySelector<HTMLButtonElement>('.pc-preview-draft-manager-head .pc-icon-btn')?.click();
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

    previewDrafts.deleteAppPreviewDrafts('extras');
    resetPhoneToRoute('extras', 'root', '番外书架');
    previewDrafts.createPreviewDraft({
      appId: 'extras',
      page: 'chapter-preview',
      preview: {
        bookId: book.id,
        chapterId: '',
        content: '用于展示草稿管理弹窗的第一份预览。',
        draftId: null,
        mode: '续写上一章',
        raw: '<title>草稿管理一</title><content>用于展示草稿管理弹窗的第一份预览。</content>',
        title: '草稿管理一',
        warnings: [],
      },
      routeParams: { bookId: book.id },
      title: '草稿管理一',
    });
    previewDrafts.createPreviewDraft({
      appId: 'extras',
      page: 'chapter-preview',
      preview: {
        bookId: book.id,
        chapterId: '',
        content: '用于展示草稿管理弹窗的第二份预览。',
        draftId: null,
        mode: '续写上一章',
        raw: '<title>草稿管理二</title><content>用于展示草稿管理弹窗的第二份预览。</content>',
        title: '草稿管理二',
        warnings: [],
      },
      routeParams: { bookId: book.id },
      title: '草稿管理二',
    });
    await waitForPaint();
    const finalManageDraftButton = [
      ...document.querySelectorAll<HTMLButtonElement>('.pc-preview-draft-notice button'),
    ].find(button => button.textContent?.includes('管理草稿'));
    if (!finalManageDraftButton)
      throw new Error('Preview draft manager did not remain available for visual inspection');
    finalManageDraftButton.click();
    await waitForPaint();
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
    if (!document.querySelector('.pc-reader-source-label')?.textContent?.includes('第 12-18 楼')) {
      throw new Error('Extra chapter detail omitted its generation source label');
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
    const workflowBody = forumStep.closest<HTMLElement>('.pc-workflow-body');
    const stepList = forumStep.closest<HTMLElement>('.pc-step-list');
    if (!workflowBody || !stepList) throw new Error('Workbench forum step layout container is missing');
    for (const child of workflowBody.children) {
      if (child !== stepList) (child as HTMLElement).style.display = 'none';
    }
    for (const stepCard of stepList.querySelectorAll<HTMLElement>('.pc-step-card')) {
      if (stepCard !== forumStep) stepCard.style.display = 'none';
    }
    typePromptArea.scrollIntoView({ block: 'center' });
    await waitForPaint();
  } else if (name.startsWith('profiles-external-')) {
    const visualGlobal = globalThis as typeof globalThis & { AutoCardUpdaterAPI?: Record<string, unknown> };
    const callbacks = new Set<(data: unknown) => void>();
    let data: Record<string, unknown> = {
      mate: { type: 'chatSheets', version: 1 },
      sheet_people: {
        uid: 'important_people',
        name: '重要人物表',
        content: [
          ['row_id', '姓名', '身份', '出生日期'],
          [1, '李沐晨', '调查员', '1998-04-16'],
          [2, '沈知遥', '记者', '1997-11-02'],
          [3, '周临川', '仓库管理员', '未知'],
        ],
      },
      sheet_events: {
        uid: 'story_events',
        name: '剧情事件表',
        content: [
          ['row_id', '事件', '阶段', '状态'],
          [1, '雨夜旧案重启调查', '第三章', '进行中'],
          [2, '港口仓库失窃', '第四章', '待确认'],
        ],
      },
    };
    let openCount = 0;

    if (name === 'profiles-external-missing') {
      delete visualGlobal.AutoCardUpdaterAPI;
    } else {
      if (name === 'profiles-external-empty') data = { mate: { type: 'chatSheets', version: 1 } };
      if (name === 'profiles-external-long-table') {
        data = {
          mate: { type: 'chatSheets', version: 1 },
          sheet_long: {
            uid: 'long_sheet',
            name: '多字段长表格',
            content: [
              ['row_id', '姓名', '身份', '阵营', '所在地', '状态'],
              ...Array.from({ length: 24 }, (_, index) => [
                index + 1,
                `人物 ${index + 1}`,
                index % 2 ? '联络人' : '调查员',
                index % 3 ? '中立' : '主角方',
                `区域 ${index + 1}`,
                index % 2 ? '未知' : '在场',
              ]),
            ],
          },
        };
      }
      visualGlobal.AutoCardUpdaterAPI = {
        exportTableAsJson: () => {
          if (name === 'profiles-external-error') throw new Error('视觉夹具读取失败');
          return data;
        },
        openVisualizer: () => {
          openCount += 1;
        },
        registerTableUpdateCallback: (callback: (value: unknown) => void) => callbacks.add(callback),
        unregisterTableUpdateCallback: (callback: (value: unknown) => void) => callbacks.delete(callback),
      };
    }

    const failedDraftScenario = name === 'profiles-external-failed-draft';
    const tableScenario = name === 'profiles-external-table' || name === 'profiles-external-long-table';
    if (failedDraftScenario) {
      const draftInput = {
        actionId: 'generate',
        appId: 'profiles',
        context: { sheetKey: 'sheet_people', titleColumn: '姓名', titleHint: '李沐晨' },
        rawOutput: [
          '<result>',
          '  <title>李沐晨</title>',
          '  <summary>调查旧案的学生</summary>',
          '  <fields><field id="身份">在雨夜追查一封旧信。</field></fields>',
          '</result>',
        ].join('\n'),
        rawOutputSemantics: 'original-v1' as const,
        source: {
          chatIdAtGeneration: 'visual-chat',
          label: '不使用聊天楼层',
          messageIds: [],
          mode: 'none' as const,
          ranges: [],
          scopeId: getCurrentChatScopeKey(),
          sortKey: 0,
        },
        warnings: ['视觉夹具：等待重新解析'],
      };
      useExternalProfileGenerationStore().data.failedDrafts = [];
      const draft = useExternalProfileGenerationStore().createFailedDraft(draftInput);
      resetPhoneToRoute('profiles', 'failed-draft', '修复资料生成草稿', {
        draftId: draft.id,
        draftSource: 'external',
      });
    } else {
      resetPhoneToRoute(
        'profiles',
        tableScenario ? 'table' : 'root',
        tableScenario ? (name === 'profiles-external-long-table' ? '多字段长表格' : '重要人物表') : '资料表',
        tableScenario
          ? { sheetKey: name === 'profiles-external-long-table' ? 'sheet_long' : 'sheet_people' }
          : undefined,
      );
    }
    await waitForPaint();

    if (name === 'profiles-external-table') {
      if (!document.querySelector('.pc-external-profile-card-track.is-horizontal')) {
        throw new Error('External Profiles did not default to horizontal cards');
      }
      document.querySelector<HTMLButtonElement>('button[title="竖向卡片"]')?.click();
      await waitForPaint();
      if (
        !document.querySelector('.pc-external-profile-card-track.is-vertical') ||
        useSettingsStore().settings.externalProfilesLayout !== 'vertical'
      ) {
        throw new Error('External Profiles vertical card mode did not persist');
      }
      document.querySelector<HTMLButtonElement>('button[title="横向卡片"]')?.click();
      await waitForPaint();
      if (!document.querySelector('.pc-external-profile-card-track.is-horizontal')) {
        throw new Error('External Profiles did not return to horizontal cards');
      }
    }

    if (failedDraftScenario) {
      const reparseButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-failed-draft-page button')].find(
        button => button.textContent?.includes('重新解析'),
      );
      if (!reparseButton || reparseButton.disabled) throw new Error('External profile failed draft cannot reparse');
      reparseButton.click();
      await waitForPaint();
      if (!document.querySelector('.pc-external-profile-repair-preview')) {
        throw new Error('External profile failed draft did not expose a confirmation preview');
      }
    }

    if (name === 'profiles-external-callback') {
      data = {
        ...data,
        sheet_callback: {
          uid: 'callback',
          name: '回调新增表',
          content: [
            ['row_id', '内容'],
            [1, '已刷新'],
          ],
        },
      };
      callbacks.forEach(callback => callback(data));
      await waitForPaint();
      if (!document.body.textContent?.includes('回调新增表')) {
        throw new Error('External Profiles update callback did not reread the API snapshot');
      }
    }
    if (name === 'profiles-external-catalog') {
      const firstTable = document.querySelector<HTMLButtonElement>('.pc-external-profile-table-row');
      if (!firstTable) throw new Error('External Profiles catalog did not render table rows');
      const openButton = document.querySelector<HTMLButtonElement>('.pc-external-profiles-actions .pc-soft-btn');
      openButton?.click();
      if (openCount !== 1) throw new Error('External Profiles full database button did not call openVisualizer');
    }
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
