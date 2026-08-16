import { mvuModifierField, MvuModifierSettingsSchema, useMvuModifierPersistenceStore } from '@/store/mvuModifier';
import { extension_settings } from '@sillytavern/scripts/extensions';

type MvuData = Record<string, unknown> & { stat_data?: Record<string, unknown> };

type MvuRuntime = {
  getMvuData: (options: { message_id: 'latest'; type: 'message' }) => MvuData;
  replaceMvuData: (data: MvuData, options: { message_id: 'latest'; type: 'message' }) => Promise<void>;
};

type MvuModifierVisualScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function clonePlainValue<T>(value: T): T {
  if (typeof value === 'undefined') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function getVisualMvuRuntime() {
  const runtime = (globalThis as typeof globalThis & { Mvu?: MvuRuntime }).Mvu;
  if (!runtime) throw new Error('Visual MVU runtime is missing');
  return runtime;
}

function findTreeNode(label: string) {
  return [...document.querySelectorAll<HTMLElement>('.pc-mvu-tree-node')].find(
    node => node.querySelector<HTMLElement>(':scope > .pc-mvu-tree-row .pc-mvu-tree-main strong')?.textContent === label,
  );
}

function setInputValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function confirmMvuAction(
  label: '取消' | '删除' | '清空',
  { waitForCondition, waitForPaint }: MvuModifierVisualScenarioContext,
) {
  if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-action'))))) {
    throw new Error(`MVU shared confirmation is missing for: ${label}`);
  }
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes(label),
  );
  if (!action) throw new Error(`MVU confirmation action is missing: ${label}`);
  action.click();
  await waitForPaint();
}

function storedRecordCount(records: Record<string, unknown[]>) {
  return Object.values(records).reduce((sum, items) => sum + items.length, 0);
}

export async function applyMvuModifierVisualScenario(
  name: string,
  context: MvuModifierVisualScenarioContext,
) {
  if (name !== 'mvu-modifier-crud') return false;

  const runtime = getVisualMvuRuntime();
  const options = { message_id: 'latest' as const, type: 'message' as const };
  const originalData = clonePlainValue(runtime.getMvuData(options));
  const settings = extension_settings as Record<string, unknown>;
  const hadSettings = Object.prototype.hasOwnProperty.call(settings, mvuModifierField);
  const originalSettings = clonePlainValue(settings[mvuModifierField]);
  const persistence = useMvuModifierPersistenceStore();
  settings[mvuModifierField] = MvuModifierSettingsSchema.parse({});
  persistence.rehydrateFromSettings();
  await runtime.replaceMvuData(
    {
      initialized_lorebooks: { 视觉世界书: [1] },
      stat_data: { 人物: { 等级: 3 } },
    },
    options,
  );

  try {
    context.resetPhoneToRoute('mvu-modifier', 'root', 'MVU 修改器');
    if (!(await context.waitForCondition(() => Boolean(findTreeNode('人物'))))) {
      throw new Error('MVU fixture root did not load');
    }
    findTreeNode('人物')?.querySelector<HTMLButtonElement>('.pc-mvu-tree-main')?.click();
    await context.waitForPaint();

    const levelNode = findTreeNode('等级');
    const favoriteButton = levelNode?.querySelector<HTMLButtonElement>('button[title="收藏变量"]');
    if (!levelNode || !favoriteButton) throw new Error('MVU favorite action is missing');
    favoriteButton.click();
    if (!(await context.waitForCondition(() => storedRecordCount(persistence.favoriteStorage) === 1))) {
      throw new Error('MVU favorite did not persist');
    }

    const characterNode = findTreeNode('人物');
    characterNode?.querySelector<HTMLButtonElement>('button[title="新增子项"]')?.click();
    await context.waitForPaint();
    const addRow = characterNode?.querySelector<HTMLElement>('.pc-mvu-add-row');
    const keyInput = addRow?.querySelector<HTMLInputElement>('input[placeholder="属性名"]');
    const valueInput = addRow?.querySelector<HTMLInputElement>('input[placeholder="输入值"]');
    if (!addRow || !keyInput || !valueInput) throw new Error('MVU add-child fields are missing');
    setInputValue(keyInput, '状态');
    setInputValue(valueInput, '在线');
    addRow.querySelector<HTMLButtonElement>('button[title="确认新增"]')?.click();
    if (
      !(await context.waitForCondition(
        () => _.get(runtime.getMvuData(options), 'stat_data.人物.状态') === '在线' && Boolean(findTreeNode('状态')),
      ))
    ) {
      throw new Error('MVU child addition did not reach the runtime and tree');
    }

    const statusNode = findTreeNode('状态');
    if (!statusNode) throw new Error('MVU added child node disappeared before deletion');
    statusNode.querySelector<HTMLButtonElement>('.pc-mvu-tree-main.leaf')?.click();
    await context.waitForPaint();
    statusNode.querySelector<HTMLButtonElement>('button[title="删除变量"]')?.click();
    await confirmMvuAction('取消', context);
    if (_.get(runtime.getMvuData(options), 'stat_data.人物.状态') !== '在线') {
      throw new Error('Cancelling MVU variable deletion changed runtime data');
    }
    statusNode.querySelector<HTMLButtonElement>('button[title="删除变量"]')?.click();
    await confirmMvuAction('删除', context);
    if (
      !(await context.waitForCondition(
        () => typeof _.get(runtime.getMvuData(options), 'stat_data.人物.状态') === 'undefined',
      ))
    ) {
      throw new Error('Confirmed MVU variable deletion did not remove the added child');
    }

    document.querySelector<HTMLButtonElement>('.pc-mvu-history-toggle')?.click();
    await context.waitForPaint();
    const historyCount = storedRecordCount(persistence.historyStorage);
    if (historyCount < 2 || !document.querySelector('.pc-mvu-history-row')) {
      throw new Error('MVU mutation history did not render');
    }
    document.querySelector<HTMLButtonElement>('button[title="清空记录"]')?.click();
    await confirmMvuAction('取消', context);
    if (storedRecordCount(persistence.historyStorage) !== historyCount) {
      throw new Error('Cancelling MVU history cleanup changed persisted records');
    }
    document.querySelector<HTMLButtonElement>('button[title="清空记录"]')?.click();
    await confirmMvuAction('清空', context);
    if (!(await context.waitForCondition(() => storedRecordCount(persistence.historyStorage) === 0))) {
      throw new Error('Confirmed MVU history cleanup did not clear the active chat records');
    }

    findTreeNode('等级')?.querySelector<HTMLButtonElement>('button[title="取消收藏"]')?.click();
    if (!(await context.waitForCondition(() => storedRecordCount(persistence.favoriteStorage) === 0))) {
      throw new Error('MVU favorite toggle did not remove the saved favorite');
    }
  } finally {
    await runtime.replaceMvuData(originalData, options);
    if (hadSettings) settings[mvuModifierField] = clonePlainValue(originalSettings);
    else delete settings[mvuModifierField];
    persistence.rehydrateFromSettings();
  }

  return true;
}
