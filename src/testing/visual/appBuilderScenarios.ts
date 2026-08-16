import { getRegisteredPhoneAppComponent } from '@/core/appRegistry';
import {
  createCustomAppDefinition,
  customAppChatDataField,
  customAppDefinitionsField,
  customAppGlobalDataField,
  CustomAppContentDataSchema,
  CustomAppDefinitionsSettingsSchema,
} from '@/apps/app-builder/schema';
import { useCustomAppsStore } from '@/apps/app-builder/store';
import { extension_settings } from '@sillytavern/scripts/extensions';

type AppBuilderVisualScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

type SettingsSnapshot = {
  exists: boolean;
  field: string;
  value: unknown;
};

function clonePlainValue<T>(value: T): T {
  if (typeof value === 'undefined') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function snapshotSetting(field: string): SettingsSnapshot {
  const settings = extension_settings as Record<string, unknown>;
  return {
    exists: Object.prototype.hasOwnProperty.call(settings, field),
    field,
    value: clonePlainValue(settings[field]),
  };
}

function restoreSetting(snapshot: SettingsSnapshot) {
  const settings = extension_settings as Record<string, unknown>;
  if (snapshot.exists) settings[snapshot.field] = clonePlainValue(snapshot.value);
  else delete settings[snapshot.field];
}

function findDefinitionRow(name: string) {
  return [...document.querySelectorAll<HTMLElement>('.pc-app-builder-row')].find(
    row => row.querySelector('strong')?.textContent?.trim() === name,
  );
}

async function confirmAppDefinitionDeletion(
  label: '取消' | '删除',
  { waitForCondition, waitForPaint }: AppBuilderVisualScenarioContext,
) {
  if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-action'))))) {
    throw new Error('App Builder definition deletion confirmation is missing');
  }
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes(label),
  );
  if (!action) throw new Error(`App Builder definition confirmation action is missing: ${label}`);
  action.click();
  await waitForPaint();
}

export async function applyAppBuilderVisualScenario(
  name: string,
  context: AppBuilderVisualScenarioContext,
) {
  if (name !== 'custom-app-definition-crud') return false;

  const snapshots = [
    snapshotSetting(customAppDefinitionsField),
    snapshotSetting(customAppGlobalDataField),
    snapshotSetting(customAppChatDataField),
  ];
  const customApps = useCustomAppsStore();
  const source = createCustomAppDefinition('blank');
  Object.assign(source, {
    dataScope: 'global',
    id: 'custom-visual-definition-crud',
    name: '视觉定义原件',
  });
  _.set(
    extension_settings,
    customAppDefinitionsField,
    CustomAppDefinitionsSettingsSchema.parse({ definitions: [source] }),
  );
  _.set(extension_settings, customAppGlobalDataField, CustomAppContentDataSchema.parse({}));
  _.set(extension_settings, customAppChatDataField, {
    __chatScoped: true,
    legacyScopeMigrations: {},
    scopes: {},
  });
  customApps.rehydrateFromSettings();

  try {
    context.resetPhoneToRoute('app-builder', 'root', 'App 工坊');
    await context.waitForPaint();
    const sourceRow = findDefinitionRow('视觉定义原件');
    const duplicateButton = sourceRow?.querySelector<HTMLButtonElement>('button[title="复制 App"]');
    if (!sourceRow || !duplicateButton) throw new Error('App Builder source definition or duplicate action is missing');
    duplicateButton.click();
    if (!(await context.waitForCondition(() => customApps.definitions.length === 2))) {
      throw new Error('App Builder did not duplicate the source definition');
    }
    const copy = customApps.definitions.find(definition => definition.name === '视觉定义原件 副本');
    if (!copy || !getRegisteredPhoneAppComponent(copy.id)) {
      throw new Error('App Builder duplicate did not enter the dynamic App catalog');
    }
    await context.waitForPaint();

    let copyRow = findDefinitionRow('视觉定义原件 副本');
    const firstDeleteButton = copyRow?.querySelector<HTMLButtonElement>('button[title="删除 App"]');
    if (!copyRow || !firstDeleteButton) throw new Error('App Builder copied definition or delete action is missing');
    firstDeleteButton.click();
    await confirmAppDefinitionDeletion('取消', context);
    if (!customApps.getDefinition(copy.id) || customApps.definitions.length !== 2) {
      throw new Error('Cancelling App Builder definition deletion changed the catalog');
    }

    copyRow = findDefinitionRow('视觉定义原件 副本');
    copyRow?.querySelector<HTMLButtonElement>('button[title="删除 App"]')?.click();
    await confirmAppDefinitionDeletion('删除', context);
    if (
      !(await context.waitForCondition(
        () =>
          customApps.definitions.length === 1 &&
          customApps.getDefinition(source.id)?.name === '视觉定义原件' &&
          !customApps.getDefinition(copy.id),
      ))
    ) {
      throw new Error('Confirmed App Builder deletion did not remove only the copied definition');
    }
  } finally {
    snapshots.forEach(restoreSetting);
    customApps.rehydrateFromSettings();
  }

  return true;
}
