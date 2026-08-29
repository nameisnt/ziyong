import { usePromptStore } from '@/store/prompts';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';

type PromptsScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function findButton(label: string, root: ParentNode = document) {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find(button =>
    `${button.title}\n${button.textContent}`.includes(label),
  );
}

function setControlValue(control: HTMLInputElement | HTMLTextAreaElement, value: string) {
  control.value = value;
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

function findPromptGroup(name: string) {
  return [...document.querySelectorAll<HTMLElement>('.pc-prompts-app .pc-page-section')].find(group =>
    group.querySelector('.pc-accordion-title-button strong')?.textContent?.includes(name),
  );
}

async function waitForPromptsRoot(context: PromptsScenarioContext) {
  if (!(await context.waitForCondition(() => Boolean(document.querySelector('.pc-prompts-hero'))))) {
    throw new Error('Prompt library did not return to its root page');
  }
  await context.waitForPaint();
}

async function selectPromptLibraryTab(tab: 'phrase' | 'template' | 'type', context: PromptsScenarioContext) {
  const menu = document.querySelector<HTMLButtonElement>('.pc-prompts-menu-anchor > .pc-icon-btn');
  if (!menu) throw new Error('Prompt library category menu is missing');
  menu.click();
  await context.waitForPaint();
  const tabButton = document.querySelector<HTMLButtonElement>(`[data-prompt-tab="${tab}"]`);
  if (!tabButton) throw new Error(`Prompt library category is missing: ${tab}`);
  tabButton.click();
  await context.waitForPaint();
}

async function confirmPromptDeletion(context: PromptsScenarioContext) {
  if (!(await context.waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-action'))))) {
    throw new Error('Prompt library deletion confirmation is missing');
  }
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes('删除'),
  );
  if (!action) throw new Error('Prompt library deletion action is missing');
  action.click();
  await context.waitForPaint();
}

export async function applyPromptsVisualScenario(name: string, context: PromptsScenarioContext) {
  if (name === 'prompts-app-list' || name === 'prompts-app-list-dark') {
    const settings = useSettingsStore();
    settings.setTheme(name.endsWith('-dark') ? 'dark' : 'light');
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    await context.waitForPaint();
    if (!document.querySelector('.pc-app-prompt-grid .pc-app-prompt-tile')) {
      throw new Error('Prompt App choices did not render');
    }
    return true;
  }

  if (name === 'prompts-type-group-batch') {
    const prompts = usePromptStore();
    prompts.resetDefaults();
    const sourceGroup = prompts.createTypePromptGroup('theater', '__pc_test__来源分组');
    const targetGroup = prompts.createTypePromptGroup('theater', '__pc_test__目标分组');
    const first = prompts.createTypePrompt({
      domain: 'theater',
      groupId: sourceGroup.id,
      name: '__pc_test__跨组类型甲',
      prompt: '甲的正文保持不变。',
    });
    const second = prompts.createTypePrompt({
      domain: 'theater',
      groupId: targetGroup.id,
      name: '__pc_test__跨组类型乙',
      prompt: '乙的正文保持不变。',
    });
    const unrelated = prompts.typePrompts.find(item => item.domain !== 'theater');
    const unrelatedSnapshot = unrelated ? { groupId: unrelated.groupId, prompt: unrelated.prompt } : null;

    context.resetPhoneToRoute('prompts', 'root', '提示词');
    await context.waitForPaint();
    await selectPromptLibraryTab('type', context);

    const findTypeTile = (label: string) =>
      [...document.querySelectorAll<HTMLButtonElement>('.pc-type-prompt-tile')].find(button =>
        button.textContent?.includes(label),
      );
    const openOrganize = async () => {
      const button = findButton('整理', document.querySelector('.pc-prompts-app') || document);
      if (!button) throw new Error('Prompt type organizer action is missing');
      button.click();
      await context.waitForPaint();
      if (!document.querySelector('.pc-type-organize-panel')) throw new Error('Prompt type organizer did not open');
    };

    await openOrganize();
    findButton('全选小剧场类型', document.querySelector('.pc-type-organize-panel') || document)?.click();
    await context.waitForPaint();
    if (
      document.querySelectorAll('.pc-type-prompt-tile[aria-pressed="true"]').length !==
      prompts.typePrompts.filter(item => item.domain === 'theater').length
    ) {
      throw new Error('Prompt type organizer did not select all Theater types');
    }
    findButton('清空选择', document.querySelector('.pc-type-organize-panel') || document)?.click();
    const sourceSection = [...document.querySelectorAll<HTMLElement>('.pc-type-group-section')].find(section =>
      section.querySelector('.pc-type-group-head strong')?.textContent?.includes(sourceGroup.name),
    );
    findButton('全选本组', sourceSection || document)?.click();
    findButton('取消', document.querySelector('.pc-type-organize-panel') || document)?.click();
    await context.waitForPaint();
    if (prompts.getTypePrompt(first.id)?.groupId !== sourceGroup.id) {
      throw new Error('Cancelling type organization changed a prompt group');
    }

    await openOrganize();
    const firstTile = findTypeTile(first.name);
    const secondTile = findTypeTile(second.name);
    if (!firstTile || !secondTile) throw new Error('Prompt type organizer omitted cross-group fixture types');
    firstTile.click();
    secondTile.click();
    const targetInput = document.querySelector<HTMLInputElement>('.pc-type-organize-panel .pc-combobox-input');
    if (!targetInput) throw new Error('Prompt type organizer target group selector is missing');
    targetInput.click();
    await context.waitForPaint();
    const targetOption = [...document.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(
      option => option.textContent?.trim() === targetGroup.name,
    );
    if (!targetOption) throw new Error('Prompt type organizer target group option is missing');
    targetOption.click();
    findButton('移动所选', document.querySelector('.pc-type-organize-panel') || document)?.click();
    await context.waitForPaint();
    if (
      prompts.getTypePrompt(first.id)?.groupId !== targetGroup.id ||
      prompts.getTypePrompt(second.id)?.groupId !== targetGroup.id ||
      prompts.getTypePrompt(first.id)?.prompt !== '甲的正文保持不变。' ||
      prompts.getTypePrompt(second.id)?.prompt !== '乙的正文保持不变。'
    ) {
      throw new Error('Prompt type batch move changed the wrong fields or failed across groups');
    }
    if (
      unrelated &&
      (unrelated.groupId !== unrelatedSnapshot?.groupId || unrelated.prompt !== unrelatedSnapshot?.prompt)
    ) {
      throw new Error('Prompt type batch move leaked into another type domain');
    }

    await openOrganize();
    findTypeTile(first.name)?.click();
    findTypeTile(second.name)?.click();
    document.querySelector<HTMLElement>('.pc-type-organize-panel')?.scrollIntoView({ block: 'start' });
    const settings = useSettingsStore();
    settings.setTheme('dark');
    await context.waitForPaint();
    if (!document.querySelector('.pc-type-organize-panel .pc-primary-btn')) {
      throw new Error('Prompt type organizer actions disappeared in dark mode');
    }
    settings.setTheme('light');
    await context.waitForPaint();
    return true;
  }

  if (name === 'prompts-config-save') {
    const prompts = usePromptStore();
    const phone = usePhoneStore();
    prompts.resetDefaults();

    const taskDefinition = prompts.taskTemplateDefinitions.find(item => item.variables?.length);
    const taskVariable = taskDefinition?.variables?.[0];
    if (!taskDefinition || !taskVariable) throw new Error('Prompt config fixture could not find a task template');
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    phone.pushPage('app-prompt-editor', `编辑${taskDefinition.label}`, {
      openKey: `task:${taskDefinition.key}`,
    });
    await context.waitForPaint();
    const taskEditor = document.querySelector<HTMLTextAreaElement>('.pc-app-prompt-editor-area');
    if (!taskEditor) throw new Error('Prompt task template editor is missing');
    const taskValue = `视觉任务模板 {{${taskVariable.key}}}`;
    setControlValue(taskEditor, taskValue);
    findButton('保存', document.querySelector('.pc-form-actions') || document)?.click();
    await waitForPromptsRoot(context);
    if (prompts.taskTemplates[taskDefinition.key] !== taskValue) {
      throw new Error('Prompt task template save did not write to taskTemplates');
    }

    const typePrompt = prompts.typePrompts.find(item => item.domain === 'theater') ?? prompts.typePrompts[0];
    if (!typePrompt) throw new Error('Prompt config fixture could not find a type prompt');
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    phone.pushPage('type-editor', '编辑类型提示词', { promptId: typePrompt.id });
    await context.waitForPaint();
    const typeName = document.querySelector<HTMLInputElement>('input[placeholder="类型名称"]');
    const typeBody = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="类型提示词正文"]');
    if (!typeName || !typeBody) throw new Error('Prompt type editor is incomplete');
    setControlValue(typeName, '视觉保存类型');
    setControlValue(typeBody, '视觉保存后的类型提示词正文。');
    findButton('保存', document.querySelector('.pc-form-actions') || document)?.click();
    await waitForPromptsRoot(context);
    const savedTypePrompt = prompts.getTypePrompt(typePrompt.id);
    if (savedTypePrompt?.name !== '视觉保存类型' || savedTypePrompt.prompt !== '视觉保存后的类型提示词正文。') {
      throw new Error('Prompt type save did not write to the existing type prompt');
    }

    const outputDefinition = prompts.outputFormatDefinitions[0];
    if (!outputDefinition) throw new Error('Prompt config fixture could not find an output rule');
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    phone.pushPage('output-editor', '输出与解析', { outputId: outputDefinition.id });
    await context.waitForPaint();
    const outputEditor = document.querySelector<HTMLElement>('.pc-output-editor');
    const outputFormat = outputEditor?.querySelector<HTMLTextAreaElement>('.pc-field-group textarea.pc-area-long');
    if (!outputEditor || !outputFormat) throw new Error('Prompt output editor is missing');
    setControlValue(outputFormat, '<result><content>视觉输出规则</content></result>');
    findButton('保存', outputEditor)?.click();
    await waitForPromptsRoot(context);
    if (prompts.outputRules[outputDefinition.id]?.outputFormat !== '<result><content>视觉输出规则</content></result>') {
      throw new Error('Prompt output rule save did not write to outputRules');
    }

    prompts.resetDefaults();
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    await context.waitForPaint();
    if (
      prompts.taskTemplates[taskDefinition.key] === taskValue ||
      prompts.getTypePrompt(typePrompt.id)?.name === '视觉保存类型' ||
      prompts.outputRules[outputDefinition.id]
    ) {
      throw new Error('Prompt config scenario did not restore its isolated defaults');
    }
    return true;
  }

  if (name === 'prompts-library-crud') {
    const prompts = usePromptStore();
    prompts.resetDefaults();
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    await context.waitForPaint();
    await selectPromptLibraryTab('phrase', context);

    const createPhraseGroup = findButton('新增分组', document.querySelector('.pc-prompts-app') || document);
    if (!createPhraseGroup) throw new Error('Prompt phrase group create action is missing');
    createPhraseGroup.click();
    const groupNameInputReady = await context.waitForCondition(() =>
      Boolean(document.querySelector<HTMLInputElement>('input[placeholder="分组名称"]')),
    );
    if (!groupNameInputReady) throw new Error('Prompt phrase group editor did not open');
    const groupName = document.querySelector<HTMLInputElement>('input[placeholder="分组名称"]');
    if (!groupName) throw new Error('Prompt phrase group name input is missing');
    setControlValue(groupName, '视觉 CRUD 短语组');
    findButton('保存', document.querySelector('.pc-form-actions') || document)?.click();
    await waitForPromptsRoot(context);
    const phraseGroup = prompts.quickPhraseGroups.find(group => group.name === '视觉 CRUD 短语组');
    if (!phraseGroup) throw new Error('Prompt phrase group save did not persist');

    const phraseGroupRow = findPromptGroup('视觉 CRUD 短语组');
    const createPhrase = phraseGroupRow?.querySelector<HTMLButtonElement>('button[title="新增快速短语"]');
    if (!phraseGroupRow || !createPhrase) throw new Error('新增快速短语 action is missing');
    createPhrase.click();
    if (!(await context.waitForCondition(() => Boolean(document.querySelector('textarea[placeholder="输入这条快速短语"]'))))) {
      throw new Error('Prompt phrase editor did not open');
    }
    const phraseArea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="输入这条快速短语"]');
    if (!phraseArea) throw new Error('Prompt phrase text area is missing');
    setControlValue(phraseArea, '第一条视觉短语');
    findButton('保存', document.querySelector('.pc-form-actions') || document)?.click();
    await waitForPromptsRoot(context);
    const phrase = phraseGroup.phrases.find(item => item.text === '第一条视觉短语');
    if (!phrase) throw new Error('Prompt phrase save did not persist');

    const savedPhraseRow = [...(findPromptGroup('视觉 CRUD 短语组')?.querySelectorAll<HTMLElement>('.pc-phrase-card') ?? [])].find(
      row => row.textContent?.includes('第一条视觉短语'),
    );
    const editPhrase = savedPhraseRow?.querySelector<HTMLButtonElement>('button[title="编辑快速短语"]');
    if (!savedPhraseRow || !editPhrase) throw new Error('编辑快速短语 action is missing');
    editPhrase.click();
    if (!(await context.waitForCondition(() => Boolean(document.querySelector('textarea[placeholder="输入这条快速短语"]'))))) {
      throw new Error('Prompt phrase edit page did not open');
    }
    const editArea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="输入这条快速短语"]');
    if (!editArea) throw new Error('Prompt phrase edit area is missing');
    setControlValue(editArea, '修改后的视觉短语');
    findButton('保存', document.querySelector('.pc-form-actions') || document)?.click();
    await waitForPromptsRoot(context);
    if (phraseGroup.phrases[0]?.text !== '修改后的视觉短语') {
      throw new Error('Prompt phrase edit did not persist');
    }

    const editedPhraseRow = [...(findPromptGroup('视觉 CRUD 短语组')?.querySelectorAll<HTMLElement>('.pc-phrase-card') ?? [])].find(
      row => row.textContent?.includes('修改后的视觉短语'),
    );
    const deletePhrase = editedPhraseRow?.querySelector<HTMLButtonElement>('button[title="删除快速短语"]');
    if (!deletePhrase) throw new Error('删除快速短语 action is missing');
    deletePhrase.click();
    await confirmPromptDeletion(context);
    if (phraseGroup.phrases.length) throw new Error('Prompt phrase confirmed deletion did not persist');

    await selectPromptLibraryTab('template', context);
    const createTemplateGroup = findButton('新增分组', document.querySelector('.pc-prompts-app') || document);
    if (!createTemplateGroup) throw new Error('Prompt template group create action is missing');
    createTemplateGroup.click();
    if (!(await context.waitForCondition(() => Boolean(document.querySelector('input[placeholder="分组名称"]'))))) {
      throw new Error('Prompt template group editor did not open');
    }
    const templateGroupName = document.querySelector<HTMLInputElement>('input[placeholder="分组名称"]');
    if (!templateGroupName) throw new Error('Prompt template group name input is missing');
    setControlValue(templateGroupName, '视觉 CRUD 模板组');
    findButton('保存', document.querySelector('.pc-form-actions') || document)?.click();
    await waitForPromptsRoot(context);
    const templateGroup = prompts.quickTemplateGroups.find(group => group.name === '视觉 CRUD 模板组');
    if (!templateGroup) throw new Error('Prompt template group save did not persist');

    const templateGroupRow = findPromptGroup('视觉 CRUD 模板组');
    const createTemplate = templateGroupRow?.querySelector<HTMLButtonElement>('button[title="新增快捷模板"]');
    if (!templateGroupRow || !createTemplate) throw new Error('新增快捷模板 action is missing');
    createTemplate.click();
    if (!(await context.waitForCondition(() => Boolean(document.querySelector('textarea[placeholder="输入格式模板"]'))))) {
      throw new Error('Prompt template editor did not open');
    }
    const templateArea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="输入格式模板"]');
    if (!templateArea) throw new Error('Prompt template text area is missing');
    setControlValue(templateArea, '<content>{{正文}}</content>');
    findButton('保存', document.querySelector('.pc-form-actions') || document)?.click();
    await waitForPromptsRoot(context);
    if (templateGroup.phrases[0]?.text !== '<content>{{正文}}</content>') {
      throw new Error('Prompt template save did not persist through the template branch');
    }
    if (phraseGroup.phrases.length) throw new Error('Prompt template creation leaked into the phrase group');

    const savedTemplateGroup = findPromptGroup('视觉 CRUD 模板组');
    const deleteTemplateGroup = savedTemplateGroup?.querySelector<HTMLButtonElement>('button[title="删除模板分组"]');
    if (!deleteTemplateGroup) throw new Error('删除模板分组 action is missing');
    deleteTemplateGroup.click();
    await confirmPromptDeletion(context);
    if (prompts.quickTemplateGroups.some(group => group.id === templateGroup.id)) {
      throw new Error('Prompt template group confirmed deletion did not persist');
    }

    await selectPromptLibraryTab('phrase', context);
    const savedPhraseGroup = findPromptGroup('视觉 CRUD 短语组');
    const deletePhraseGroup = savedPhraseGroup?.querySelector<HTMLButtonElement>('button[title="删除短语分组"]');
    if (!deletePhraseGroup) throw new Error('Prompt phrase group delete action is missing');
    deletePhraseGroup.click();
    await confirmPromptDeletion(context);
    if (prompts.quickPhraseGroups.some(group => group.id === phraseGroup.id)) {
      throw new Error('Prompt phrase group confirmed deletion did not persist');
    }
    await context.waitForPaint();
    return true;
  }

  if (['prompts-output-list', 'prompts-phrase-list', 'prompts-template-list'].includes(name)) {
    const tabByScenario: Record<string, string> = {
      'prompts-output-list': 'output',
      'prompts-phrase-list': 'phrase',
      'prompts-template-list': 'template',
    };
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-prompts-menu-anchor > .pc-icon-btn')?.click();
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>(`[data-prompt-tab="${tabByScenario[name]}"]`)?.click();
    await context.waitForPaint();
    const expectedSelector = name === 'prompts-output-list' ? '.pc-output-rule-card' : '.pc-phrase-card';
    if (!document.querySelector(expectedSelector)) throw new Error(`${name} did not render its migrated prompt list`);
    return true;
  }

  if (name === 'prompts-app-detail') {
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('[data-prompt-app-id="extras"]')?.click();
    return true;
  }

  if (name === 'prompts-task-detail') {
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-prompts-menu-anchor > .pc-icon-btn')?.click();
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('[data-prompt-tab="task"]')?.click();
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('[data-task-template-app-id="diary"]')?.click();
    await context.waitForPaint();
    const taskDialog = document.querySelector<HTMLElement>('.pc-prompt-detail-dialog');
    if (!taskDialog?.textContent?.includes('{{perspectiveName}}')) {
      throw new Error('Diary task template did not expose its dynamic perspective placeholder');
    }
    return true;
  }

  if (name === 'prompts-task-editor') {
    const definition = usePromptStore().taskTemplateDefinitions.find(item => item.variables?.length);
    if (!definition) throw new Error('Prompt task editor fixture could not find a templated task');
    context.resetPhoneToRoute('prompts', 'app-prompt-editor', `编辑${definition.label}`, {
      openKey: `task:${definition.key}`,
    });
    await context.waitForPaint();
    const editor = document.querySelector<HTMLTextAreaElement>('.pc-app-prompt-editor-area');
    const variable = document.querySelector<HTMLButtonElement>('.pc-task-template-help .pc-task-variable-btn');
    if (!editor || !variable) throw new Error('Prompt task editor did not render its editable task template');
    const placeholder = variable.querySelector('code')?.textContent?.trim() || '';
    if (!placeholder) throw new Error('Prompt task editor variable did not explain its placeholder');
    variable.click();
    await context.waitForPaint();
    if (!editor.value.includes(placeholder)) {
      throw new Error('Prompt task editor did not insert the selected placeholder');
    }
    return true;
  }

  if (name === 'prompts-type-detail') {
    context.resetPhoneToRoute('prompts', 'root', '提示词');
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-prompts-menu-anchor > .pc-icon-btn')?.click();
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('[data-prompt-tab="type"]')?.click();
    await context.waitForPaint();
    const screen = document.querySelector<HTMLElement>('.pc-screen');
    screen?.scrollTo({ top: screen.scrollHeight });
    await context.waitForPaint();
    const typeTiles = document.querySelectorAll<HTMLButtonElement>('.pc-type-prompt-tile');
    typeTiles[typeTiles.length - 1]?.click();
    return true;
  }

  if (name === 'prompts-type-editor') {
    const prompts = usePromptStore();
    prompts.createTypePromptGroup('theater', '需要完整显示并可搜索的超长小剧场类型分组名称');
    context.resetPhoneToRoute('prompts', 'type-editor', '编辑类型提示词', { promptId: 'prompt_type_theater_daily' });
    await context.waitForPaint();
    if (!document.querySelector<HTMLInputElement>('input[placeholder="类型名称"]')) {
      throw new Error('Prompt type editor did not render its editable fields');
    }
    const groupControl = document.querySelector<HTMLElement>('.pc-theater-type-group-field .pc-combobox');
    if (!groupControl) throw new Error('Prompt type editor did not render its group selector');
    groupControl.scrollIntoView({ block: 'center' });
    const groupInput = groupControl.querySelector<HTMLInputElement>('.pc-combobox-input');
    groupInput?.click();
    await context.waitForPaint();
    if (groupInput && !document.querySelector('.pc-combobox-menu')?.textContent?.includes('超长小剧场类型分组名称')) {
      throw new Error('Prompt type group combobox omitted the user-created long group');
    }
    return true;
  }

  if (name === 'prompts-output-editor') {
    const definition = usePromptStore().outputFormatDefinitions[0];
    if (!definition) throw new Error('Prompt output editor fixture could not find an output definition');
    context.resetPhoneToRoute('prompts', 'output-editor', '输出与解析', { outputId: definition.id });
    await context.waitForPaint();
    const editor = document.querySelector<HTMLElement>('.pc-output-editor');
    const outputFormat = editor?.querySelector<HTMLTextAreaElement>('textarea');
    if (!editor || !outputFormat?.value.trim())
      throw new Error('Prompt output editor did not load its output format draft');
    editor.querySelector<HTMLInputElement>('.pc-output-parser-toggle input')?.click();
    await context.waitForPaint();
    if (!editor.querySelector('.pc-output-field-list')) {
      throw new Error('Prompt output editor did not reveal parser field mappings');
    }
    const sample = editor.querySelector<HTMLTextAreaElement>('textarea[placeholder="粘贴一段 AI 输出"]');
    if (!sample) throw new Error('Prompt output editor did not reveal its parser test sample');
    const sampleGroup = sample.closest<HTMLElement>('.pc-field-group');
    if (!sampleGroup) throw new Error('Prompt output editor sample lost its field group');
    for (const child of [...editor.children]) {
      if (child !== sampleGroup && child !== sampleGroup.nextElementSibling && !child.classList.contains('pc-form-actions')) {
        (child as HTMLElement).style.display = 'none';
      }
    }
    await context.waitForPaint();
    return true;
  }

  if (name === 'prompts-group-editor') {
    context.resetPhoneToRoute('prompts', 'group-editor', '新增短语分组');
    await context.waitForPaint();
    if (!document.querySelector<HTMLInputElement>('input[placeholder="分组名称"]')) {
      throw new Error('Prompt group editor did not render its editable name field');
    }
    return true;
  }

  if (name === 'prompts-phrase-editor') {
    const prompts = usePromptStore();
    const group = prompts.quickPhraseGroups[0] ?? prompts.createQuickPhraseGroup('视觉短语分组');
    context.resetPhoneToRoute('prompts', 'phrase-editor', '新增快速短语', { groupId: group.id });
    await context.waitForPaint();
    if (!document.querySelector<HTMLTextAreaElement>('textarea[placeholder="输入这条快速短语"]')) {
      throw new Error('Prompt phrase editor did not render its editable text field');
    }
    return true;
  }

  if (name === 'prompts-template-editor') {
    const prompts = usePromptStore();
    const group = prompts.quickTemplateGroups[0] ?? prompts.createQuickTemplateGroup('视觉模板分组');
    context.resetPhoneToRoute('prompts', 'template-editor', '新增格式模板', { groupId: group.id });
    await context.waitForPaint();
    if (!document.querySelector<HTMLTextAreaElement>('textarea[placeholder="输入格式模板"]')) {
      throw new Error('Prompt template editor did not render its editable template field');
    }
    return true;
  }

  return false;
}
