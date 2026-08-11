import { usePromptStore } from '@/store/prompts';

type PromptsScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForPaint: () => Promise<void>;
};

export async function applyPromptsVisualScenario(name: string, context: PromptsScenarioContext) {
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
    const variable = document.querySelector<HTMLButtonElement>('.pc-app-prompt-editor-area ~ .pc-field-group button');
    if (!editor || !variable) throw new Error('Prompt task editor did not render its editable task template');
    variable.click();
    await context.waitForPaint();
    if (!editor.value.includes(variable.textContent?.trim() || '')) {
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
    context.resetPhoneToRoute('prompts', 'type-editor', '编辑类型提示词', { promptId: 'prompt_type_theater_daily' });
    await context.waitForPaint();
    if (!document.querySelector<HTMLInputElement>('input[placeholder="类型名称"]')) {
      throw new Error('Prompt type editor did not render its editable fields');
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
    if (!editor || !outputFormat?.value.trim()) throw new Error('Prompt output editor did not load its output format draft');
    editor.querySelector<HTMLInputElement>('.pc-output-parser-toggle input')?.click();
    await context.waitForPaint();
    if (!editor.querySelector('.pc-output-field-list')) {
      throw new Error('Prompt output editor did not reveal parser field mappings');
    }
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

  return false;
}
