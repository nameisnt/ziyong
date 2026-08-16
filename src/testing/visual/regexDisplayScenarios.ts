type RegexDisplayFixture = {
  getUsage: (appId: string) => { displayRuleIds: string[] };
  importBackup: (data: unknown) => void;
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

  const usageTab = findButton('使用设置', document.querySelector('.pc-regex-view-tabs') || document);
  if (!usageTab) throw new Error('Regex display usage tab is missing');
  usageTab.click();
  await waitForPaint();
  const usageOption = [...document.querySelectorAll<HTMLElement>('.pc-regex-target-option')].find(option =>
    option.textContent?.includes('视觉显示规则'),
  );
  const usageCheckbox = usageOption?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!usageCheckbox) throw new Error('Regex display reader usage checkbox is missing');
  usageCheckbox.click();
  if (!(await waitForCondition(() => regexDisplay.getUsage('reader').displayRuleIds.includes(editedRule.id)))) {
    throw new Error('Regex display usage did not enable the edited rule for reader');
  }

  const rulesTab = findButton('规则库', document.querySelector('.pc-regex-view-tabs') || document);
  if (!rulesTab) throw new Error('Regex display rules tab is missing');
  rulesTab.click();
  await waitForPaint();
  const duplicateButton = findButton('复制规则', document.querySelector('.pc-regex-display-app') || document);
  if (!duplicateButton) throw new Error('Regex display duplicate action is missing');
  duplicateButton.click();
  if (!(await waitForCondition(() => regexDisplay.rules.some(rule => rule.name === '视觉显示规则 副本')))) {
    throw new Error('Regex display did not duplicate the active rule');
  }
  const duplicate = regexDisplay.rules.find(rule => rule.name === '视觉显示规则 副本');
  if (!duplicate) throw new Error('Regex display duplicate is missing');

  const deleteButton = findButton('删除规则', document.querySelector('.pc-regex-display-app') || document);
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
  if (
    !regexDisplay.getUsage('reader').displayRuleIds.includes(editedRule.id) ||
    regexDisplay.getUsage('reader').displayRuleIds.includes(duplicate.id)
  ) {
    throw new Error('Regex display usage no longer matches the surviving original rule');
  }

  usageTab.click();
  await waitForPaint();
  return true;
}
