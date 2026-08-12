import { useSettingsStore } from '@/store/settings';

export const settingsScenarioNames = [
  'settings',
  'settings-interface',
  'settings-connection',
  'settings-connection-external',
  'settings-connection-dark',
  'settings-advanced',
  'theme-form-control-isolation',
] as const;

type SettingsScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForPaint: () => Promise<void>;
};

export async function applySettingsVisualScenario(name: string, context: SettingsScenarioContext) {
  if (!settingsScenarioNames.includes(name as (typeof settingsScenarioNames)[number])) return false;
  const settings = useSettingsStore();

  if (name === 'settings') context.resetPhoneToRoute('settings', 'root', '设置');
  else if (name === 'settings-interface') context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'interface' });
  else if (name === 'settings-connection') context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'connection' });
  else if (name === 'settings-connection-external') {
    settings.settings.textProvider.externalProfiles = [];
    const profile = settings.createExternalApiProfile('custom');
    profile.name = '视觉测试 API';
    profile.apiUrl = 'https://api.example.com/v1';
    context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'connection' });
    await context.waitForPaint();
    Array.from(document.querySelectorAll<HTMLElement>('.pc-field-label'))
      .find(element => element.textContent?.includes('外部 API 配置'))
      ?.scrollIntoView({ block: 'start' });
  } else if (name === 'settings-connection-dark') {
    settings.setTheme('dark');
    context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'connection' });
  } else if (name === 'settings-advanced') context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'advanced' });
  else {
    const hostThemeOverride = document.createElement('style');
    hostThemeOverride.id = 'visual-host-theme-override';
    hostThemeOverride.textContent = `
      input:not([type='checkbox']), select, textarea {
        background-color: rgb(22, 22, 26) !important;
        color: rgb(245, 245, 247) !important;
      }
    `;
    document.head.append(hostThemeOverride);
    settings.setTheme('light');
    context.resetPhoneToRoute('theater', 'generate', '小剧场配置');
    await context.waitForPaint();
    const control = document.querySelector<HTMLTextAreaElement>('.pc-theater-app textarea.pc-area');
    if (!control) throw new Error('Theme isolation fixture did not render a form control');
    const channels = (value: string) =>
      value
        .match(/\d+(?:\.\d+)?/g)
        ?.slice(0, 3)
        .map(Number) ?? [];
    const assertContrast = (theme: 'dark' | 'light') => {
      const style = getComputedStyle(control);
      const background = channels(style.backgroundColor);
      const text = channels(style.color);
      if (background.length !== 3 || text.length !== 3)
        throw new Error(
          `Theme isolation returned unreadable computed colors: ${style.backgroundColor} / ${style.color}`,
        );
      const backgroundLightness = background.reduce((sum, channel) => sum + channel, 0);
      const textLightness = text.reduce((sum, channel) => sum + channel, 0);
      const valid =
        theme === 'light'
          ? backgroundLightness > 600 && textLightness < 500
          : backgroundLightness < 400 && textLightness > 600;
      if (!valid)
        throw new Error(
          `Phone ${theme} form colors leaked from the host theme: ${style.backgroundColor} / ${style.color}`,
        );
    };
    assertContrast('light');
    settings.setTheme('dark');
    await context.waitForPaint();
    assertContrast('dark');
  }

  return true;
}
