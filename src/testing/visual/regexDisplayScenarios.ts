type RegexDisplayFixture = {
  addGroup: (name: string) => { id: string };
  importBackup: (data: unknown) => void;
  moveRuleToGroup: (ruleId: string, groupId: string) => void;
  rules: Array<{ id: string; name: string; operation: string; pattern: string; replacement: string }>;
};

type RegexDisplayVisualContext = {
  getRegexDisplay: () => RegexDisplayFixture;
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
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

function findEditorControl<T extends HTMLInputElement | HTMLTextAreaElement>(label: string, selector: string) {
  const field = [...document.querySelectorAll<HTMLElement>('.pc-regex-display-app .pc-select-field')].find(item =>
    item.querySelector('.pc-field-label')?.textContent?.includes(label),
  );
  return field?.querySelector<T>(selector) ?? null;
}

export async function applyRegexDisplayVisualScenario(
  name: string,
  { getRegexDisplay, resetPhoneToRoute, waitForCondition, waitForPaint }: RegexDisplayVisualContext,
) {
  if (name !== 'regex-display-crud') return false;

  const regexDisplay = getRegexDisplay();
  regexDisplay.importBackup({ previewInput: '', rules: [], usages: {} });
  resetPhoneToRoute('regex-display', 'root', '正则替换');
  await waitForPaint();

  const rulesBefore = regexDisplay.rules.length;
  const addButton = findButton('新增规则', document.querySelector('.pc-regex-display-app') || document);
  if (!addButton) throw new Error('Regex display add rule action is missing');
  addButton.click();
  if (!(await waitForCondition(() => regexDisplay.rules.length === rulesBefore + 1))) {
    throw new Error('Regex display did not add a rule');
  }

  const nameInput = findEditorControl<HTMLInputElement>('规则名称', 'input.pc-field');
  const patternArea = findEditorControl<HTMLTextAreaElement>('匹配正则', 'textarea.pc-area');
  const replacementArea = findEditorControl<HTMLTextAreaElement>('替换模板', 'textarea.pc-area');
  if (!nameInput || !patternArea || !replacementArea) throw new Error('Regex display rule editor is incomplete');
  setControlValue(nameInput, '视觉显示规则');
  setControlValue(patternArea, '雨夜');
  setControlValue(replacementArea, '晴天');
  await waitForPaint();
  const editedRule = regexDisplay.rules.find(rule => rule.name === '视觉显示规则');
  if (!editedRule || editedRule.pattern !== '雨夜' || editedRule.replacement !== '晴天') {
    throw new Error('Regex display rule edits did not persist to the store');
  }

  const closeEditor = findButton('关闭', document.querySelector('.pc-regex-editor-dialog') || document);
  if (!closeEditor) throw new Error('Regex display editor close action is missing');
  closeEditor.click();
  await waitForPaint();
  const editedRow = [...document.querySelectorAll<HTMLElement>('[data-regex-rule-id]')].find(row =>
    row.textContent?.includes('视觉显示规则'),
  );
  const duplicateButton = findButton('复制规则', editedRow || document);
  if (!duplicateButton) throw new Error('Regex display duplicate action is missing');
  duplicateButton.click();
  if (!(await waitForCondition(() => regexDisplay.rules.some(rule => rule.name === '视觉显示规则 副本')))) {
    throw new Error('Regex display did not duplicate the active rule');
  }
  const duplicate = regexDisplay.rules.find(rule => rule.name === '视觉显示规则 副本');
  if (!duplicate) throw new Error('Regex display duplicate is missing');

  const closeDuplicateEditor = findButton('关闭', document.querySelector('.pc-regex-editor-dialog') || document);
  closeDuplicateEditor?.click();
  await waitForPaint();

  const group = regexDisplay.addGroup('视觉分组');
  regexDisplay.moveRuleToGroup(editedRule.id, group.id);
  await waitForPaint();
  const groupSection = [...document.querySelectorAll<HTMLElement>('[data-regex-group-id]')].find(
    section => section.dataset.regexGroupId === group.id,
  );
  if (!groupSection?.textContent?.includes('视觉显示规则'))
    throw new Error('Regex display grouping did not move the rule');

  const duplicateRow = [...document.querySelectorAll<HTMLElement>('[data-regex-rule-id]')].find(
    row => row.dataset.regexRuleId === duplicate.id,
  );
  const deleteButton = findButton('删除规则', duplicateRow || document);
  if (!deleteButton) throw new Error('Regex display delete action is missing');
  deleteButton.click();
  if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-action'))))) {
    throw new Error('Regex display delete confirmation is missing');
  }
  const confirmDelete = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes('删除'),
  );
  if (!confirmDelete) throw new Error('Regex display delete confirmation action is missing');
  confirmDelete.click();
  if (!(await waitForCondition(() => !regexDisplay.rules.some(rule => rule.id === duplicate.id)))) {
    throw new Error('Regex display confirmed deletion did not remove the duplicate');
  }
  if (!regexDisplay.rules.some(rule => rule.id === editedRule.id)) {
    throw new Error('Regex display deleted the original rule with its duplicate');
  }
  return true;
}
