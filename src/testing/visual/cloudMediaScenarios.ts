import { CloudMediaSettingsSchema, useCloudMediaStore } from '@/apps/cloud-media/store';

type CloudMediaVisualScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function setControlValue(control: HTMLInputElement | HTMLSelectElement, value: string) {
  control.value = value;
  control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

async function selectCloudProfile(label: string, context: CloudMediaVisualScenarioContext) {
  const picker = document.querySelector<HTMLElement>('.pc-cloud-profile-picker');
  const input = picker?.querySelector<HTMLInputElement>('.pc-combobox-input');
  if (!picker || !input) throw new Error('Cloud media profile picker is missing');
  input.click();
  await context.waitForPaint();
  const option = [...picker.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
    button.textContent?.includes(label),
  );
  if (!option) throw new Error(`Cloud media profile option is missing: ${label}`);
  option.click();
  await context.waitForPaint();
}

async function confirmCloudProfileDeletion(label: '取消' | '删除', context: CloudMediaVisualScenarioContext) {
  if (!(await context.waitForCondition(() => Boolean(document.querySelector('.pc-phone-notice-action'))))) {
    throw new Error('Cloud media profile deletion confirmation is missing');
  }
  const action = [...document.querySelectorAll<HTMLButtonElement>('.pc-phone-notice-action')].find(button =>
    button.textContent?.includes(label),
  );
  if (!action) throw new Error(`Cloud media profile confirmation action is missing: ${label}`);
  action.click();
  await context.waitForPaint();
}

export async function applyCloudMediaVisualScenario(name: string, context: CloudMediaVisualScenarioContext) {
  if (name !== 'cloud-media-profile-crud') return false;

  const cloudMedia = useCloudMediaStore();
  const initialSettings = CloudMediaSettingsSchema.parse(cloudMedia.settings);
  const fixture = CloudMediaSettingsSchema.parse({
    activeProfileId: 'visual-cloud-original',
    profiles: [
      {
        id: 'visual-cloud-original',
        kind: 'image',
        name: '原始配置',
        provider: 'fal',
      },
    ],
  });
  Object.assign(cloudMedia.settings, fixture);

  try {
    context.resetPhoneToRoute('cloud-media', 'settings', '云媒体配置');
    await context.waitForPaint();
    document.querySelector<HTMLButtonElement>('button[title="新增配置"]')?.click();
    if (!(await context.waitForCondition(() => cloudMedia.settings.profiles.length === 2))) {
      throw new Error('Cloud media UI did not create a profile');
    }
    const createdId = cloudMedia.settings.activeProfileId;

    const settingsCard = document.querySelector<HTMLElement>('.pc-cloud-settings-card');
    const nameInput = settingsCard?.querySelector<HTMLInputElement>('input[type="text"]');
    const selects = settingsCard?.querySelectorAll<HTMLSelectElement>('select');
    if (!settingsCard || !nameInput || !selects || selects.length < 2) {
      throw new Error('Cloud media profile editor fields are missing');
    }
    setControlValue(nameInput, '视觉云配置');
    setControlValue(selects[0], 'minimax');
    await context.waitForPaint();
    const refreshedSelects = document.querySelectorAll<HTMLSelectElement>('.pc-cloud-settings-card select');
    setControlValue(refreshedSelects[1], 'audio');
    if (
      !(await context.waitForCondition(() => {
        const profile = cloudMedia.settings.profiles.find(item => item.id === createdId);
        return (
          profile?.name === '视觉云配置' &&
          profile.provider === 'minimax' &&
          profile.kind === 'audio' &&
          profile.model === 'music-2.6'
        );
      }))
    ) {
      throw new Error('Cloud media provider === \'minimax\' or kind === \'audio\' defaults did not persist');
    }

    await selectCloudProfile('原始配置', context);
    if (cloudMedia.settings.activeProfileId !== 'visual-cloud-original') {
      throw new Error('Cloud media combobox did not select the original profile');
    }
    await selectCloudProfile('视觉云配置', context);
    if (cloudMedia.settings.activeProfileId !== createdId) {
      throw new Error('Cloud media combobox did not return to the created profile');
    }

    const deleteButton = document.querySelector<HTMLButtonElement>('.pc-cloud-profile-picker button[title="删除配置"]');
    if (!deleteButton) throw new Error('Cloud media profile delete action is missing');
    deleteButton.click();
    await confirmCloudProfileDeletion('取消', context);
    if (cloudMedia.settings.profiles.length !== 2) {
      throw new Error('Cancelling cloud media profile deletion changed settings.profiles');
    }
    deleteButton.click();
    await confirmCloudProfileDeletion('删除', context);
    if (
      !(await context.waitForCondition(
        () =>
          cloudMedia.settings.profiles.length === 1 &&
          cloudMedia.settings.profiles[0]?.id === 'visual-cloud-original' &&
          cloudMedia.settings.activeProfileId === 'visual-cloud-original',
      ))
    ) {
      throw new Error('Confirmed cloud media profile deletion did not preserve the original profile');
    }
  } finally {
    Object.assign(cloudMedia.settings, CloudMediaSettingsSchema.parse(initialSettings));
  }

  return true;
}
