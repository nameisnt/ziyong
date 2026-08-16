type RegexDisplayFixture = {
  getUsage: (appId: string) => { contentRuleId: string };
  importBackup: (data: unknown) => void;
  rules: Array<{ id: string; name: string; operation: string }>;
};

type RegexWizardVisualContext = {
  getRegexDisplay: () => RegexDisplayFixture;
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function setInputValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function findButton(label: string, root: ParentNode = document) {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes(label));
}

async function selectSaveTarget(label: string, waitForPaint: () => Promise<void>) {
  const saveTargetGroup = [...document.querySelectorAll<HTMLElement>('.pc-regex-wizard-save .pc-field-group')].find(group =>
    group.querySelector('.pc-field-label')?.textContent?.includes('保存并使用到'),
  );
  const input = saveTargetGroup?.querySelector<HTMLInputElement>('.pc-combobox-input');
  if (!input) throw new Error('Regex wizard save target selector is missing');
  input.click();
  await waitForPaint();
  const option = [...document.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
    button.textContent?.includes(label),
  );
  if (!option) throw new Error(`Regex wizard save target option is missing: ${label}`);
  option.click();
  await waitForPaint();
}

export async function applyRegexWizardVisualScenario(
  name: string,
  { getRegexDisplay, resetPhoneToRoute, waitForCondition, waitForPaint }: RegexWizardVisualContext,
) {
  if (name !== 'regex-wizard-save') return false;

  const regexDisplay = getRegexDisplay();
  regexDisplay.importBackup({ previewInput: '', rules: [], usages: {} });
  resetPhoneToRoute('regex-wizard', 'root', '正则向导');
  await waitForPaint();

  const ruleName = document.querySelector<HTMLInputElement>('.pc-regex-wizard-save input.pc-field:not(.pc-combobox-input)');
  if (!ruleName) throw new Error('Regex wizard rule name input is missing');
  setInputValue(ruleName, '视觉阅读正文规则');
  await selectSaveTarget('全局阅读正文', waitForPaint);

  const rulesBefore = regexDisplay.rules.length;
  const saveButton = findButton('保存到规则库', document.querySelector('.pc-regex-wizard-save') || document);
  if (!saveButton) throw new Error('Regex wizard save action is missing');
  saveButton.click();
  const saved = await waitForCondition(() => regexDisplay.rules.length === rulesBefore + 1);
  if (!saved) throw new Error('Regex wizard did not add a rule');
  const savedRule = regexDisplay.rules.find(rule => rule.name === '视觉阅读正文规则');
  if (!savedRule || savedRule.operation !== 'extract') throw new Error('Regex wizard did not save the named extraction rule');
  if (regexDisplay.getUsage('reader').contentRuleId !== savedRule.id) {
    throw new Error('Regex wizard saved the rule without binding the same id to reader content');
  }

  const openLibrary = findButton('打开正则替换', document.querySelector('.pc-regex-wizard-save') || document);
  if (!openLibrary) throw new Error('Regex wizard library action is missing');
  openLibrary.click();
  if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-regex-display-app'))))) {
    throw new Error('Regex wizard did not open the regex library after saving');
  }
  const ruleSelector = document.querySelector<HTMLInputElement>('.pc-regex-display-app .pc-combobox-input');
  if (!ruleSelector) throw new Error('Regex library rule selector is missing');
  ruleSelector.click();
  await waitForPaint();
  const savedOption = [...document.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
    button.textContent?.includes('视觉阅读正文规则'),
  );
  if (!savedOption) throw new Error('Saved regex wizard rule is missing from the regex library');
  savedOption.click();
  await waitForPaint();
  return true;
}
