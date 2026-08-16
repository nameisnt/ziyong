import { installMemoryFileService } from './memoryFileService';

type PluginPresetFixture = {
  id: string;
  name: string;
  raw: Record<string, unknown>;
};

type PluginPresetStoreFixture = {
  getDefaultAppIds: (presetId: string) => string[];
  importPreset: (value: unknown, fileName?: string) => Promise<PluginPresetFixture>;
  items: PluginPresetFixture[];
  whenReady: () => Promise<unknown>;
};

type PresetManagerVisualContext = {
  getPluginPresets: () => PluginPresetStoreFixture;
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function findButton(label: string, root: ParentNode = document) {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes(label));
}

function clickNoticeAction(label: string) {
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes(label),
  );
  if (!action) throw new Error(`Preset lifecycle notice action is missing: ${label}`);
  action.click();
}

export async function applyPresetManagerVisualScenario(
  name: string,
  { getPluginPresets, resetPhoneToRoute, waitForCondition, waitForPaint }: PresetManagerVisualContext,
) {
  if (name !== 'plugin-preset-lifecycle') return false;

  installMemoryFileService();
  const pluginPresets = getPluginPresets();
  await pluginPresets.whenReady();
  const builtin = pluginPresets.items[0];
  if (!builtin) throw new Error('Plugin preset lifecycle fixture requires the built-in preset');
  const imported = await pluginPresets.importPreset(
    JSON.parse(JSON.stringify(builtin.raw)),
    '__pc_test__私有预设.json',
  );

  resetPhoneToRoute('preset-manager', 'root', '预设管理');
  if (
    !(await waitForCondition(() =>
      [...document.querySelectorAll<HTMLElement>('.pc-preset-row')].some(row =>
        row.textContent?.includes(imported.name),
      ),
    ))
  ) {
    throw new Error('Imported plugin preset did not appear in preset management');
  }
  const importedRow = [...document.querySelectorAll<HTMLElement>('.pc-preset-row')].find(row =>
    row.textContent?.includes(imported.name),
  );
  importedRow?.querySelector<HTMLButtonElement>('.pc-preset-open')?.click();
  if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-preset-default-apps'))))) {
    throw new Error('Imported plugin preset detail did not open');
  }

  const diaryOption = [...document.querySelectorAll<HTMLLabelElement>('.pc-preset-app-option')].find(label =>
    label.textContent?.includes('日记'),
  );
  const diaryToggle = diaryOption?.querySelector<HTMLInputElement>('input');
  if (!diaryToggle) throw new Error('Plugin preset default App toggle is missing');
  diaryToggle.click();
  if (!(await waitForCondition(() => pluginPresets.getDefaultAppIds(imported.id).includes('diary')))) {
    throw new Error('Plugin preset toggle-default-app did not persist the diary selection');
  }

  document.querySelector<HTMLElement>('.pc-action-menu > summary[aria-label="管理"]')?.click();
  findButton('预设改名', document.querySelector('.pc-action-menu-panel') || document)?.click();
  if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-input'))))) {
    throw new Error('Plugin preset rename prompt did not open');
  }
  const renamed = '__pc_test__已改名预设';
  const renameInput = document.querySelector<HTMLInputElement>('.pc-phone-notice-input');
  if (!renameInput) throw new Error('Plugin preset rename input is missing');
  renameInput.value = renamed;
  renameInput.dispatchEvent(new Event('input', { bubbles: true }));
  clickNoticeAction('继续');
  if (
    !(await waitForCondition(() =>
      [...document.querySelectorAll<HTMLElement>('.pc-phone-notice')].some(notice =>
        notice.textContent?.includes('确认把预设'),
      ),
    ))
  ) {
    throw new Error('Plugin preset rename confirmation did not open');
  }
  clickNoticeAction('改名');
  if (!(await waitForCondition(() => pluginPresets.items.find(item => item.id === imported.id)?.name === renamed))) {
    throw new Error('Plugin preset rename did not persist to its file-backed record');
  }

  document.querySelector<HTMLElement>('.pc-action-menu > summary[aria-label="管理"]')?.click();
  findButton('删除预设', document.querySelector('.pc-action-menu-panel') || document)?.click();
  if (
    !(await waitForCondition(() =>
      [...document.querySelectorAll<HTMLElement>('.pc-phone-notice')].some(notice =>
        notice.textContent?.includes(`确认删除插件预设“${renamed}”`),
      ),
    ))
  ) {
    throw new Error('Plugin preset delete confirmation did not open');
  }
  clickNoticeAction('删除');
  if (
    !(await waitForCondition(() =>
      !pluginPresets.items.some(item => item.id === imported.id) &&
      pluginPresets.getDefaultAppIds(imported.id).length === 0 &&
      Boolean(document.querySelector('.pc-preset-source-tabs')),
    ))
  ) {
    throw new Error('Plugin preset deletion did not clear its record, default selection and detail route');
  }
  await waitForPaint();
  return true;
}
