import { useSettingsStore } from '@/store/settings';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useTheaterStore } from '@/store/theater';
import { parseCssColorChannels } from '@/testing/visual/cssColor';
import type { HiddenGenerationRecord } from '@/type/generation';
import { buildItemTransfer } from '@/util/itemTransfer';
import { getFrontendFrameSource } from '@/util/theaterFrontend';

interface TheaterScenarioContext {
  createHiddenGenerationRecord: (
    actionId: string,
    userRequirement: string,
    config?: Record<string, unknown>,
  ) => HiddenGenerationRecord;
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean, timeout?: number) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
}

export function createTheaterFixture() {
  const theater = useTheaterStore();
  theater.resetCurrentScope();
  const firstEntry = theater.createEntry({
    content: '后台灯光还没有完全亮起，角色们在幕布后完成一场短暂而轻快的对话。',
    renderMode: 'markdown',
    title: '【直播】问心台满月宴：全仙门都在等一个笑点',
    typeId: 'prompt_type_theater_funny',
    typeName: '搞笑',
  });
  theater.createEntry({
    content: '两人把争执藏进一句普通的问候里，直到雨声替他们把停顿说出口。',
    renderMode: 'markdown',
    title: '雨夜后台，谢幕之后',
    typeId: 'prompt_type_theater_dialogue',
    typeName: '对话体',
  });
  return firstEntry;
}

export async function applyTheaterVisualScenario(name: string, context: TheaterScenarioContext) {
  if (!name.startsWith('theater-')) return false;
  const { resetPhoneToRoute, waitForCondition, waitForPaint } = context;
  if (name === 'theater-generate') {
    resetPhoneToRoute('theater', 'generate', '小剧场配置');
  } else if (name === 'theater-type-group') {
    const prompts = usePromptStore();
    prompts.resetDefaults();
    const group = prompts.createTypePromptGroup('theater', '视觉生成分组');
    const prompt = prompts.typePrompts.find(item => item.domain === 'theater');
    if (!prompt) throw new Error('Theater type group fixture is missing a type prompt');
    prompts.moveTypePromptsToGroup('theater', [prompt.id], group.id);

    resetPhoneToRoute('theater', 'generate', '小剧场配置', { typeId: prompt.id });
    await waitForPaint();
    const editableGroup = document.querySelector<HTMLInputElement>('.pc-theater-type-group-field .pc-combobox-input');
    if (!editableGroup || editableGroup.readOnly || editableGroup.value !== group.name) {
      throw new Error('Existing Theater type did not show its editable group');
    }

    resetPhoneToRoute('theater', 'generate', '自定义小剧场类型', { customTypeName: '视觉自定义类型' });
    await waitForPaint();
    const groupField = document.querySelector<HTMLElement>('.pc-theater-type-group-field');
    const createGroup = groupField?.querySelector<HTMLButtonElement>('button[aria-label="新建分组"]');
    if (!groupField || !createGroup) throw new Error('Custom Theater type did not reuse the shared group field');
    createGroup.click();
    if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-input'))))) {
      throw new Error('Custom Theater type group create prompt did not open');
    }
    const groupName = '__pc_test__生成现场分组';
    const promptInput = document.querySelector<HTMLInputElement>('.pc-phone-notice-input');
    if (!promptInput) throw new Error('Custom Theater type group name input is missing');
    promptInput.value = groupName;
    promptInput.dispatchEvent(new Event('input', { bubbles: true }));
    const createAction = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
      button.textContent?.includes('创建'),
    );
    if (!createAction) throw new Error('Custom Theater type group create action is missing');
    createAction.click();
    if (!(await waitForCondition(() => prompts.typePromptGroups.some(item => item.name === groupName)))) {
      throw new Error('Custom Theater type group was not created');
    }
    await waitForPaint();
    if (groupField.querySelector<HTMLInputElement>('.pc-combobox-input')?.value !== groupName) {
      throw new Error('New Theater type group was not selected for the custom type');
    }
    useSettingsStore().setTheme('dark');
    await waitForPaint();
  } else if (name === 'theater-type-prompt-session') {
    const prompts = usePromptStore();
    const theater = useTheaterStore();
    prompts.resetDefaults();
    theater.resetCurrentScope();
    const prompt = prompts.typePrompts.find(item => item.domain === 'theater');
    if (!prompt) throw new Error('Theater type prompt session fixture is missing a type');
    const libraryPromptBeforeRewrite = prompt.prompt;
    const historicalPrompt = '这是目标版本实际使用、但尚未写回类型库的提示词。';
    const replayEntry = theater.createEntry({
      content: '版本提示词回放夹具。',
      generationRecord: context.createHiddenGenerationRecord('generate', '', {
        typeId: prompt.id,
        typeName: prompt.name,
        typePrompt: historicalPrompt,
      }),
      renderMode: 'markdown',
      title: '版本提示词回放',
      typeId: prompt.id,
      typeName: prompt.name,
    });
    resetPhoneToRoute('theater', 'generate', '重新生成小剧场', {
      rewriteEntryId: replayEntry.id,
      typeId: prompt.id,
    });
    await waitForPaint();
    const replayPrompt = document.querySelector<HTMLTextAreaElement>('.pc-theater-type-prompt-field textarea');
    if (replayPrompt?.value !== historicalPrompt) {
      throw new Error('Theater rewrite did not prioritize the target version type prompt');
    }
    if (prompts.getTypePrompt(prompt.id)?.prompt !== libraryPromptBeforeRewrite) {
      throw new Error('Opening Theater rewrite unexpectedly changed the type library');
    }
    const explicitSave = [...document.querySelectorAll<HTMLButtonElement>('.pc-theater-type-prompt-field button')].find(
      button => button.textContent?.includes('保存到类型库'),
    );
    if (!explicitSave || explicitSave.disabled)
      throw new Error('Modified replay prompt did not enable explicit library save');
    explicitSave.click();
    await waitForPaint();
    if (prompts.getTypePrompt(prompt.id)?.prompt !== historicalPrompt) {
      throw new Error('Explicit Theater type prompt save did not update the library');
    }

    resetPhoneToRoute('theater', 'generate', '自定义小剧场类型', { customTypeName: '视觉临时类型' });
    await waitForPaint();
    const saveNewToggle = document.querySelector<HTMLInputElement>(
      '.pc-theater-type-library-option input[type="checkbox"]',
    );
    if (
      !saveNewToggle ||
      saveNewToggle.checked ||
      !document.querySelector('.pc-theater-type-library-option')?.textContent?.includes('保存为新类型')
    ) {
      throw new Error('Custom Theater type did not expose an opt-in unchecked library save');
    }

    const legacyValid = theater.createEntry({
      content: '旧条目有效类型夹具。',
      renderMode: 'markdown',
      title: '旧条目有效类型',
      typeId: prompt.id,
      typeName: prompt.name,
    });
    resetPhoneToRoute('theater', 'generate', '重写旧条目', { rewriteEntryId: legacyValid.id, typeId: prompt.id });
    await waitForPaint();
    const validNotice = document.querySelector<HTMLElement>('.pc-theater-type-notice');
    const validPrompt = document.querySelector<HTMLTextAreaElement>('.pc-theater-type-prompt-field textarea');
    const validGenerate = document.querySelector<HTMLButtonElement>('.pc-generation-actions .pc-primary-btn');
    if (!validNotice?.textContent?.includes('旧版本没有生成回放') || validPrompt?.value !== historicalPrompt) {
      throw new Error('Legacy Theater entry did not explicitly load the current type library');
    }
    if (!validGenerate || validGenerate.disabled)
      throw new Error('Valid legacy Theater type incorrectly blocked generation');

    const legacyMissing = theater.createEntry({
      content: '旧条目失效类型夹具。',
      renderMode: 'markdown',
      title: '旧条目失效类型',
      typeId: '__pc_deleted_theater_type__',
      typeName: '已删除类型',
    });
    resetPhoneToRoute('theater', 'generate', '重写失效旧条目', {
      rewriteEntryId: legacyMissing.id,
      typeId: '__pc_deleted_theater_type__',
    });
    await waitForPaint();
    const missingWarning = [...document.querySelectorAll<HTMLElement>('.pc-theater-type-notice')].find(element =>
      element.textContent?.includes('重新选择类型或填写本次类型提示词'),
    );
    const missingGenerate = document.querySelector<HTMLButtonElement>('.pc-generation-actions .pc-primary-btn');
    if (!missingWarning || !missingGenerate?.disabled) {
      throw new Error('Missing legacy Theater type did not visibly disable generation');
    }
    const manualPrompt = document.querySelector<HTMLTextAreaElement>('.pc-theater-type-prompt-field textarea');
    if (!manualPrompt) throw new Error('Missing legacy Theater type prompt editor is unavailable');
    manualPrompt.value = '用户手工填写的本次类型提示词。';
    manualPrompt.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    if (document.querySelector<HTMLButtonElement>('.pc-generation-actions .pc-primary-btn')?.disabled) {
      throw new Error('Manual Theater type prompt did not release the legacy generation block');
    }

    const deletedReplayPrompt = '类型库删除后仍由版本回放保留的提示词。';
    const deletedReplay = theater.createEntry({
      content: '已删除类型的版本回放夹具。',
      generationRecord: context.createHiddenGenerationRecord('generate', '', {
        typeId: '__pc_deleted_replay_type__',
        typeName: '历史自定义类型',
        typePrompt: deletedReplayPrompt,
      }),
      renderMode: 'markdown',
      title: '删除类型后的版本回放',
      typeId: '__pc_deleted_replay_type__',
      typeName: '历史自定义类型',
    });
    resetPhoneToRoute('theater', 'generate', '重写历史自定义类型', {
      rewriteEntryId: deletedReplay.id,
      typeId: '__pc_deleted_replay_type__',
    });
    await waitForPaint();
    if (
      document.querySelector<HTMLTextAreaElement>('.pc-theater-type-prompt-field textarea')?.value !==
        deletedReplayPrompt ||
      document.querySelector<HTMLButtonElement>('.pc-generation-actions .pc-primary-btn')?.disabled ||
      !document.querySelector('.pc-theater-type-library-option')?.textContent?.includes('保存为新类型')
    ) {
      throw new Error('Deleted Theater type did not retain its replay prompt as a usable custom draft');
    }
    useSettingsStore().setTheme('dark');
    document.querySelector('.pc-theater-type-prompt-field')?.scrollIntoView({ block: 'center' });
    await waitForPaint();
  } else if (name === 'theater-source-range') {
    resetPhoneToRoute('theater', 'generate', '自定义楼层范围');
    await waitForPaint();
    const advanced = document.querySelector<HTMLDetailsElement>('.pc-generation-advanced');
    if (!advanced) throw new Error('Theater generation advanced settings are missing');
    advanced.open = true;
    await waitForPaint();
    document.querySelector<HTMLElement>('.pc-generation-provider-fields')?.style.setProperty('display', 'none');
    document.querySelector<HTMLElement>('.pc-generation-aliases')?.style.setProperty('display', 'none');
    const sourceMode = document.querySelector<HTMLSelectElement>('.pc-source-fields .pc-select');
    if (!sourceMode) throw new Error('Theater generation source mode is missing');
    sourceMode.value = 'range';
    sourceMode.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForPaint();
    const range = document.querySelector<HTMLTextAreaElement>('.pc-source-fields .pc-area');
    if (!range) throw new Error('Theater custom source range is missing');
    range.value = '0-5, 0-10, 0-15';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    range.scrollIntoView({ block: 'center' });
    await waitForPaint();
  } else if (name === 'theater-rewrite-generate') {
    const entry = createTheaterFixture();
    const requirement = '小剧场当前版本的隐藏追加要求。';
    entry.generationRecord = context.createHiddenGenerationRecord('generate', requirement, {
      renderMode: entry.renderMode,
      typeId: entry.typeId,
      typeName: entry.typeName,
    });
    resetPhoneToRoute('theater', 'generate', '重写小剧场', { rewriteEntryId: entry.id, typeId: entry.typeId || '' });
    await waitForPaint();
    if (document.querySelector<HTMLTextAreaElement>('.pc-requirement-field textarea')?.value !== requirement) {
      throw new Error('Theater rewrite did not restore the current version hidden generation record');
    }
  } else if (name === 'theater-generate-dark-inputs') {
    const settingsStore = useSettingsStore();
    const hostThemeOverride = document.createElement('style');
    hostThemeOverride.id = 'visual-host-theme-override';
    hostThemeOverride.textContent =
      'textarea:not(#send_textarea) { background-color: rgb(255, 255, 255) !important; color: rgb(60, 60, 70) !important; }';
    document.head.append(hostThemeOverride);
    settingsStore.setTheme('dark');
    settingsStore.settings.visualTheme.backgroundColor = '#242129';
    settingsStore.settings.visualTheme.surfaceColor = 'rgba(255, 255, 255, 0.08)';
    settingsStore.settings.visualTheme.surfaceStrongColor = '#2c2c2e';
    settingsStore.settings.visualTheme.textColor = '#f5f5f7';
    resetPhoneToRoute('theater', 'generate', '小剧场配置');
    await waitForPaint();
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('.pc-theater-app textarea.pc-area');
    if (textareas.length < 2) throw new Error('Theater dark input fixture is incomplete');
    textareas.forEach(textarea => {
      const style = getComputedStyle(textarea);
      const background = parseCssColorChannels(style.backgroundColor);
      const color = parseCssColorChannels(style.color);
      const matches = (actual: number[], expected: number[]) =>
        actual.length === expected.length && actual.every((channel, index) => Math.abs(channel - expected[index]) < 1);
      if (!matches(background, [44, 44, 46]) || !matches(color, [245, 245, 247]))
        throw new Error(`Theater dark input colors are invalid: ${style.backgroundColor} / ${style.color}`);
    });
    const advanced = document.querySelector<HTMLDetailsElement>('.pc-generation-advanced');
    if (!advanced) throw new Error('Theater dark generation settings are missing');
    advanced.open = true;
    await waitForPaint();
    const presetField = document.querySelector<HTMLElement>('.pc-generation-provider-fields .pc-preset-field');
    const presetHead = presetField?.querySelector<HTMLElement>('.pc-field-head');
    const presetSelect = presetField?.querySelector<HTMLElement>('.pc-combobox');
    const refreshButton = presetHead?.querySelector<HTMLButtonElement>('button[aria-label="刷新预设列表"]');
    if (!presetField || !presetHead || !presetSelect || !refreshButton) {
      throw new Error('Theater dark preset refresh field is incomplete');
    }
    const fieldRect = presetField.getBoundingClientRect();
    const headRect = presetHead.getBoundingClientRect();
    const selectRect = presetSelect.getBoundingClientRect();
    const refreshRect = refreshButton.getBoundingClientRect();
    if (
      Math.abs(refreshRect.top + refreshRect.height / 2 - (headRect.top + headRect.height / 2)) > 2 ||
      selectRect.top < headRect.bottom ||
      selectRect.width < fieldRect.width * 0.95
    ) {
      throw new Error('Theater dark preset refresh layout is invalid');
    }
    advanced.open = false;
    await waitForPaint();
  } else if (name === 'theater-editor') {
    const entry = createTheaterFixture();
    resetPhoneToRoute('theater', 'editor', '编辑小剧场', { entryId: entry.id });
  } else if (name === 'theater-frontend-footer') {
    const theater = useTheaterStore();
    theater.resetCurrentScope();
    const entry = theater.createEntry({
      content:
        '围栏前普通文字\n```html\n<!doctype html><html><head><style>.viewport-card{min-height:100vh;padding:12px;box-sizing:border-box}</style></head><body><main class="viewport-card"><button type="button">网页内部按钮</button><p>网页渲染正文</p></main></body></html>\n```\n围栏后普通文字',
      renderMode: 'markdown',
      title: '混合网页渲染测试',
      typeName: '网页测试',
    });
    entry.generationRecord = context.createHiddenGenerationRecord('generate', '小剧场来源可视化夹具');
    resetPhoneToRoute('theater', 'entry', entry.title, { entryId: entry.id });
    await waitForPaint();
    if (!document.querySelector('.pc-frame-shell') || !document.querySelector('.pc-theater-text-segment'))
      throw new Error('Mixed theater detail did not render both text and HTML segments');
    const textSegments = [...document.querySelectorAll<HTMLElement>('.pc-theater-text-segment')];
    if (
      !textSegments.length ||
      textSegments.some(segment => {
        const style = getComputedStyle(segment);
        return style.overflowY !== 'visible' || segment.scrollHeight > segment.clientHeight;
      })
    ) {
      throw new Error('Mixed theater text must use the outer reader scroll container');
    }
    if (!document.querySelector('.pc-reader-source-label')?.textContent?.includes('最近 7 楼')) {
      throw new Error('Theater detail omitted its generation source label');
    }
    const frontendFrame = document.querySelector<HTMLIFrameElement>('.pc-frame');
    if (!frontendFrame) throw new Error('Theater detail omitted its frontend iframe');
    await new Promise(resolve => window.setTimeout(resolve, 350));
    const initialFrameHeight = frontendFrame.getBoundingClientRect().height;
    await new Promise(resolve => window.setTimeout(resolve, 1700));
    const stableFrameHeight = frontendFrame.getBoundingClientRect().height;
    if (stableFrameHeight > initialFrameHeight + 2 || stableFrameHeight > 700) {
      throw new Error(
        `Theater frontend frame kept growing after content settled: ${initialFrameHeight} -> ${stableFrameHeight}`,
      );
    }
    const channelId = frontendFrame.srcdoc.match(/const CHANNEL_ID = ([^;]+);/)?.[1];
    if (!channelId) throw new Error('Theater frontend frame channel is missing');
    const postViewportFollowingHeight = (viewportHeight: number) => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            channelId: JSON.parse(channelId),
            height: viewportHeight + 32,
            source: getFrontendFrameSource(),
            type: 'height',
            viewportHeight,
          },
          source: frontendFrame.contentWindow,
        }),
      );
    };
    postViewportFollowingHeight(stableFrameHeight);
    await waitForPaint();
    postViewportFollowingHeight(frontendFrame.getBoundingClientRect().height);
    await waitForPaint();
    if (!document.querySelector('.pc-frame-height-note')) {
      throw new Error('Theater frontend viewport feedback was not reported as a limited-height state');
    }
    const settings = useSettingsStore();
    settings.setTheme('dark');
    await waitForPaint();
    const darkFrontendFrame = document.querySelector<HTMLIFrameElement>('.pc-frame');
    if (!darkFrontendFrame) throw new Error('Theater frontend iframe disappeared in dark mode');
    await new Promise(resolve => window.setTimeout(resolve, 350));
    const darkInitialHeight = darkFrontendFrame.getBoundingClientRect().height;
    await new Promise(resolve => window.setTimeout(resolve, 1700));
    const darkStableHeight = darkFrontendFrame.getBoundingClientRect().height;
    if (darkStableHeight > darkInitialHeight + 2 || darkStableHeight > 700) {
      throw new Error(`Dark theater frontend frame kept growing: ${darkInitialHeight} -> ${darkStableHeight}`);
    }
    settings.setTheme('light');
    await waitForPaint();
  } else if (name === 'theater-history') {
    createTheaterFixture();
    const theater = useTheaterStore();
    Array.from({ length: 18 }, (_, index) =>
      theater.createEntry({
        content: `标签筛选测试正文 ${index + 1}`,
        renderMode: 'markdown',
        title: `标签筛选测试 ${index + 1}`,
        typeName: `类型 ${index + 1}`,
      }),
    );
    resetPhoneToRoute('theater', 'history', '小剧场记录');
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-theater-filter-toggle')?.click();
    await waitForPaint();
    const tagList = document.querySelector<HTMLElement>('.pc-history-tag-list');
    if (!tagList || tagList.scrollHeight <= tagList.clientHeight)
      throw new Error('Theater history tag panel did not constrain a long tag list');
  } else if (name === 'theater-catalog-transfer') {
    const entry = createTheaterFixture();
    resetPhoneToRoute('theater', 'root', '小剧场');
    await waitForPaint();
    const recordRow = document.querySelector<HTMLElement>('.pc-theater-record-row');
    const importButton = recordRow?.querySelector<HTMLButtonElement>('button[aria-label="导入单条小剧场"]');
    if (!recordRow || !importButton || !recordRow.textContent?.includes('小剧场记录（2）')) {
      throw new Error('Theater catalog did not expose record browsing and single-item import on one row');
    }
    importButton.click();
    await waitForPaint();
    const input = document.querySelector<HTMLInputElement>('.pc-item-transfer-dialog input[type="file"]');
    if (!input) throw new Error('Theater single-item import did not open the shared file dialog');

    const upload = (file: File) => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    upload(new File(['not-json'], 'invalid-theater-item.json', { type: 'application/json' }));
    if (
      !(await waitForCondition(() =>
        Boolean(document.querySelector('.pc-item-transfer-dialog .pc-status-card.warning')),
      ))
    ) {
      throw new Error('Theater single-item import did not retain an invalid-file error');
    }

    upload(
      new File([JSON.stringify(buildItemTransfer('theater', { entryId: entry.id }))], 'theater-item.json', {
        type: 'application/json',
      }),
    );
    if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-item-transfer-preview'))))) {
      throw new Error('Theater single-item import did not preview a valid shared envelope');
    }
    document.querySelector<HTMLButtonElement>('.pc-item-transfer-dialog button[aria-label="关闭"]')?.click();
    await waitForPaint();
    if (document.querySelector('.pc-item-transfer-dialog')) {
      throw new Error('Theater single-item import did not cancel without committing');
    }
    const settingsStore = useSettingsStore();
    settingsStore.setTheme('dark');
    await waitForPaint();
    if (!document.querySelector('.pc-theater-record-row button[aria-label="导入单条小剧场"]')) {
      throw new Error('Theater single-item import disappeared in dark mode');
    }
    settingsStore.setTheme('light');
    await waitForPaint();
  } else if (name === 'theater-random-type') {
    const prompts = usePromptStore();
    const theater = useTheaterStore();
    const phone = usePhoneStore();
    prompts.resetDefaults();
    theater.resetCurrentScope();
    const theaterPrompts = prompts.typePrompts.filter(item => item.domain === 'theater');
    const recentPrompt = theaterPrompts[0];
    const searchPrompt = theaterPrompts.find(item => item.id !== recentPrompt?.id);
    if (!recentPrompt || !searchPrompt) throw new Error('Theater random fixture needs at least two visible types');
    theater.createEntry({
      content: '随机类型最近使用夹具。',
      renderMode: 'markdown',
      title: '随机类型最近记录',
      typeId: recentPrompt.id,
      typeName: recentPrompt.name,
    });

    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      resetPhoneToRoute('theater', 'root', '小剧场');
      await waitForPaint();
      const recentDice = document.querySelector<HTMLButtonElement>('button[aria-label="随机选择当前可见类型"]');
      if (!recentDice || recentDice.disabled)
        throw new Error('Recent Theater type pool did not enable its dice action');
      recentDice.click();
      if (!(await waitForCondition(() => phone.currentRoute.page === 'generate'))) {
        throw new Error('Recent Theater type dice did not enter generation');
      }
      if (phone.currentRoute.params?.typeId !== recentPrompt.id) {
        throw new Error('Recent Theater type dice selected outside the current visible pool');
      }

      resetPhoneToRoute('theater', 'root', '小剧场');
      await waitForPaint();
      const allButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-theater-type-view button')].find(button =>
        button.textContent?.includes('全部类型'),
      );
      allButton?.click();
      await waitForPaint();
      document.querySelector<HTMLButtonElement>('button[aria-label="随机选择当前可见类型"]')?.click();
      if (!(await waitForCondition(() => phone.currentRoute.page === 'generate'))) {
        throw new Error('All Theater type dice did not enter generation');
      }
      if (!theaterPrompts.some(item => item.id === phone.currentRoute.params?.typeId)) {
        throw new Error('All Theater type dice selected outside visible Theater prompts');
      }

      resetPhoneToRoute('theater', 'root', '小剧场');
      await waitForPaint();
      const search = document.querySelector<HTMLInputElement>('.pc-theater-catalog-page .pc-search-field input');
      if (!search) throw new Error('Theater random search field is missing');
      search.value = searchPrompt.name;
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await waitForPaint();
      document.querySelector<HTMLButtonElement>('button[aria-label="随机选择当前可见类型"]')?.click();
      if (!(await waitForCondition(() => phone.currentRoute.params?.typeId === searchPrompt.id))) {
        throw new Error('Searched Theater type dice did not select its only visible result');
      }

      resetPhoneToRoute('theater', 'root', '小剧场');
      await waitForPaint();
      const emptySearch = document.querySelector<HTMLInputElement>('.pc-theater-catalog-page .pc-search-field input');
      if (!emptySearch) throw new Error('Theater random empty-pool search field is missing');
      emptySearch.value = '__pc_no_visible_theater_type__';
      emptySearch.dispatchEvent(new Event('input', { bubbles: true }));
      await waitForPaint();
      if (!document.querySelector<HTMLButtonElement>('button[aria-label="随机选择当前可见类型"]')?.disabled) {
        throw new Error('Empty Theater type pool did not disable its dice action');
      }
    } finally {
      Math.random = originalRandom;
    }

    resetPhoneToRoute('theater', 'root', '小剧场');
    await waitForPaint();
    const finalSearch = document.querySelector<HTMLInputElement>('.pc-theater-catalog-page .pc-search-field input');
    if (!finalSearch) throw new Error('Theater random final search field is missing');
    finalSearch.value = '';
    finalSearch.dispatchEvent(new Event('input', { bubbles: true }));
    const finalAllButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-theater-type-view button')].find(
      button => button.textContent?.includes('全部类型'),
    );
    finalAllButton?.click();
    useSettingsStore().setTheme('dark');
    await waitForPaint();
  } else if (name === 'theater-failed-draft') {
    const theater = useTheaterStore();
    theater.resetCurrentScope();
    const draft = theater.createFailedDraft({
      actionId: 'generate',
      appId: 'theater',
      context: {},
      rawOutput: '<theater><title>未闭合</title><content>等待修复的小剧场',
      source: visualSource(),
      warnings: ['缺少结束标签'],
    });
    resetPhoneToRoute('theater', 'failed-draft', '解析失败草稿', { draftId: draft.id });
  } else {
    return false;
  }
  return true;
}

function visualSource() {
  return {
    chatIdAtGeneration: 'visual-theater-chat',
    label: '第 6-18 楼',
    messageIds: [],
    mode: 'range' as const,
    ranges: [{ end: 18, start: 6 }],
    scopeId: 'visual-theater-scope',
    sortKey: 18,
  };
}
