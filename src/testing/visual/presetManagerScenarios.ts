import { installMemoryFileService } from './memoryFileService';
import { movePresetTransactional, PresetMigrationError } from '@/apps/preset-manager/presetMigration';

type PluginPresetFixture = {
  id: string;
  name: string;
  raw: Record<string, unknown>;
};

type PluginPresetStoreFixture = {
  deletePreset: (id: string) => Promise<void>;
  getDefaultAppIds: (presetId: string) => string[];
  importPreset: (value: unknown, fileName?: string) => Promise<PluginPresetFixture>;
  items: PluginPresetFixture[];
  readPreset: (id: string) => Record<string, unknown>;
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

function getVisualTavernPresetApi() {
  return globalThis as unknown as {
    createPreset: (name: string, preset: Record<string, unknown>) => Promise<boolean>;
    TavernHelper: {
      deletePreset: (name: string) => Promise<boolean>;
      getPreset: (name: string) => Record<string, unknown>;
    };
  };
}

async function submitMoveDialog(targetName: string) {
  if (!(await waitForElement('.pc-phone-notice-input'))) throw new Error('Preset move name prompt did not open');
  const input = document.querySelector<HTMLInputElement>('.pc-phone-notice-input');
  if (!input) throw new Error('Preset move target input is missing');
  input.value = targetName;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  clickNoticeAction('继续');
  const startedAt = performance.now();
  while (!findButton('移动', document.querySelector('.pc-phone-notice') || document)) {
    if (performance.now() - startedAt > 1000) throw new Error('Preset move confirmation did not open');
    await new Promise<void>(resolve => window.setTimeout(resolve, 20));
  }
  clickNoticeAction('移动');
}

async function waitForElement(selector: string) {
  const startedAt = performance.now();
  while (!document.querySelector(selector)) {
    if (performance.now() - startedAt > 1000) return false;
    await new Promise<void>(resolve => window.setTimeout(resolve, 20));
  }
  return true;
}

async function verifyFailureTransaction(name: string) {
  type FixturePreset = {
    extensions: Record<string, unknown>;
    prompts: Array<{ enabled: boolean; id: string; name: string; role: string }>;
  };
  const source: FixturePreset = {
    extensions: {},
    prompts: [{ enabled: true, id: 'fixture', name: 'fixture', role: 'system' }],
  };
  let target: FixturePreset | null = null;
  let sourceExists = true;
  let targetRemoved = false;
  try {
    await movePresetTransactional<FixturePreset>({
      createTarget: payload => {
        if (name === 'preset-move-target-failure') throw new Error('mock create failure');
        const created = structuredClone(payload);
        if (name === 'preset-move-verify-rollback') created.prompts[0]!.name = 'corrupt';
        target = created;
      },
      deleteSource: () => {
        if (name === 'preset-move-source-delete-failure') throw new Error('mock delete failure');
        sourceExists = false;
      },
      deleteTarget: () => {
        target = null;
        targetRemoved = true;
      },
      readSource: () => structuredClone(source),
      readTarget: () => {
        if (!target) throw new Error('mock target missing');
        return structuredClone(target);
      },
      sourceDeletable: true,
      sourceName: '来源预设',
      targetExists: () => name === 'preset-move-conflict',
      targetName: '目标预设',
    });
    throw new Error(`Preset migration failure fixture unexpectedly succeeded: ${name}`);
  } catch (error) {
    if (!(error instanceof PresetMigrationError)) throw error;
    if (!sourceExists) throw new Error(`Preset migration failure removed its source: ${name}`);
    if (name === 'preset-move-verify-rollback' && (!targetRemoved || target)) {
      throw new Error('Preset verification failure did not roll back its invalid target');
    }
    if (name === 'preset-move-source-delete-failure' && (!target || error.stage !== 'source-delete')) {
      throw new Error('Preset source deletion failure did not preserve the verified target');
    }
  }
}

export async function applyPresetManagerVisualScenario(
  name: string,
  { getPluginPresets, resetPhoneToRoute, waitForCondition, waitForPaint }: PresetManagerVisualContext,
) {
  const migrationScenarios = new Set([
    'preset-move-tavern-to-plugin',
    'preset-move-plugin-to-tavern',
    'preset-move-conflict',
    'preset-move-target-failure',
    'preset-move-verify-rollback',
    'preset-move-source-delete-failure',
  ]);
  if (migrationScenarios.has(name)) {
    installMemoryFileService();
    const pluginPresets = getPluginPresets();
    await pluginPresets.whenReady();
    if (name === 'preset-move-tavern-to-plugin') {
      const sourceName = '__pc_test__酒馆迁移来源';
      const targetName = '__pc_test__酒馆移入插件';
      const oldTarget = pluginPresets.items.find(item => item.name === targetName);
      if (oldTarget) await pluginPresets.deletePreset(oldTarget.id);
      const tavernApi = getVisualTavernPresetApi();
      await tavernApi.TavernHelper.deletePreset(sourceName);
      const created = await tavernApi.createPreset(sourceName, tavernApi.TavernHelper.getPreset('视觉预设'));
      if (!created) throw new Error('Tavern migration source fixture could not be created');
      resetPhoneToRoute('preset-manager', 'detail', '预设条目', {
        presetName: sourceName,
        presetSource: 'tavern',
      });
      if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-preset-nodes'))))) {
        throw new Error('Tavern preset detail did not open for migration');
      }
      document.querySelector<HTMLElement>('.pc-action-menu > summary[aria-label="管理"]')?.click();
      findButton('移到插件预设', document.querySelector('.pc-action-menu-panel') || document)?.click();
      await submitMoveDialog(targetName);
      if (
        !(await waitForCondition(() =>
          pluginPresets.items.some(item => item.name === targetName) &&
          document.body.textContent?.includes(targetName),
        ))
      ) {
        throw new Error('Tavern-to-plugin migration did not reach the verified plugin target');
      }
    } else if (name === 'preset-move-plugin-to-tavern') {
      const builtin = pluginPresets.items[0];
      if (!builtin) throw new Error('Plugin-to-tavern migration fixture requires the built-in preset');
      const targetName = '__pc_test__插件移入酒馆';
      await getVisualTavernPresetApi().TavernHelper.deletePreset(targetName);
      const source = await pluginPresets.importPreset(
        JSON.parse(JSON.stringify(builtin.raw)) as Record<string, unknown>,
        `__pc_test__插件迁移来源_${Date.now()}.json`,
      );
      resetPhoneToRoute('preset-manager', 'detail', '插件预设条目', {
        presetId: source.id,
        presetSource: 'plugin',
      });
      if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-preset-nodes'))))) {
        throw new Error('Plugin preset detail did not open for migration');
      }
      document.querySelector<HTMLElement>('.pc-action-menu > summary[aria-label="管理"]')?.click();
      findButton('移到酒馆预设', document.querySelector('.pc-action-menu-panel') || document)?.click();
      await submitMoveDialog(targetName);
      if (
        !(await waitForCondition(() =>
          !pluginPresets.items.some(item => item.id === source.id) && document.body.textContent?.includes(targetName),
        ))
      ) {
        throw new Error('Plugin-to-tavern migration did not reach the verified Tavern target');
      }
    } else {
      await verifyFailureTransaction(name);
      resetPhoneToRoute('preset-manager', 'root', '预设管理');
    }
    await waitForPaint();
    return true;
  }

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
