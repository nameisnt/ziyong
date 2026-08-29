import { getRegisteredPhoneApps } from '@/core/appRegistry';
import { useSettingsStore } from '@/store/settings';
import { installMemoryFileService } from '@/testing/visual/memoryFileService';
import { setting_field } from '@/type/settings';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { klona } from 'klona';

export const settingsScenarioNames = [
  'settings',
  'settings-data-management',
  'settings-data-management-dark',
  'settings-interface',
  'settings-reader-font',
  'settings-generation',
  'settings-theme-persistence',
  'settings-connection',
  'settings-connection-external',
  'settings-connection-dark',
  'settings-advanced',
  'theme-form-control-isolation',
  'theme-home-icon-assets',
  'theme-home-xuan',
  'theme-home-parchment',
  'theme-home-cardstock',
] as const;

type SettingsScenarioContext = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForPaint: () => Promise<void>;
};

export async function applySettingsVisualScenario(name: string, context: SettingsScenarioContext) {
  if (!settingsScenarioNames.includes(name as (typeof settingsScenarioNames)[number])) return false;
  const settings = useSettingsStore();

  if (name === 'settings') context.resetPhoneToRoute('settings', 'root', '设置');
  else if (name === 'settings-data-management' || name === 'settings-data-management-dark') {
    settings.setTheme(name.endsWith('-dark') ? 'dark' : 'light');
    context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'data' });
    await context.waitForPaint();
    if (!document.querySelector('.pc-data-management-page')) {
      throw new Error('Settings data category did not open');
    }
  } else if (name === 'settings-interface') context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'interface' });
  else if (name === 'settings-reader-font') {
    const fontId = 'visual-reader-font';
    settings.settings.customFont.fonts = [
      {
        id: fontId,
        name: '需要在阅读器设置中完整显示的超长已导入字体名称',
        path: 'user/files/visual-reader-font.woff2',
      },
    ];
    settings.setReaderFontFamily('');
    context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'reader' });
    await context.waitForPaint();
    const fontGroup = document.querySelector<HTMLElement>('.pc-reader-font-row');
    if (!fontGroup) throw new Error('Reader settings font control is missing');
    fontGroup.scrollIntoView({ block: 'center' });
    const input = fontGroup.querySelector<HTMLInputElement>('.pc-combobox-input');
    if (input) {
      input.click();
      await context.waitForPaint();
      const option = [...document.querySelectorAll<HTMLButtonElement>('.pc-combobox-option')].find(button =>
        button.textContent?.includes('超长已导入字体名称'),
      );
      if (!option) throw new Error('Reader font selector omitted the imported font');
      option.click();
      await context.waitForPaint();
      if (settings.settings.reader.fontFamily !== settings.getCustomFontFamily(fontId)) {
        throw new Error('Reader font selector did not map the imported font to its registered family');
      }
      input.click();
      await context.waitForPaint();
      input.value = '超长';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await context.waitForPaint();
      if (!document.querySelector('.pc-combobox-menu')?.textContent?.includes('超长已导入字体名称')) {
        throw new Error('Reader font selector could not search the imported font');
      }
    }
  } else if (name === 'settings-generation') {
    context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'generation' });
  } else if (name === 'settings-theme-persistence') {
    settings.resetInterfaceSize();
    context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'interface' });
    await context.waitForPaint();
    const increaseColumns = document.querySelector<HTMLButtonElement>('button[aria-label="图标列数加一"]');
    if (!increaseColumns) throw new Error('Settings interface column control is missing');
    increaseColumns.click();
    await context.waitForPaint();
    const interfaceSnapshot = klona(extension_settings[setting_field]) as typeof settings.settings;
    if (interfaceSnapshot?.interfaceSize?.homeColumns !== 5) {
      throw new Error('Settings interface value was not written to the persistent source');
    }

    settings.resetInterfaceSize();
    extension_settings[setting_field] = interfaceSnapshot;
    settings.rehydrateFromSettings();
    await context.waitForPaint();
    const columnsOutput = document.querySelector<HTMLOutputElement>('output[aria-label="图标列数"]');
    if (settings.settings.interfaceSize.homeColumns !== 5 || columnsOutput?.textContent?.trim() !== '5') {
      throw new Error('Settings interface value did not survive rehydrate');
    }

    context.resetPhoneToRoute('theme', 'root', '主题');
    await context.waitForPaint();
    const themeButtons = [...document.querySelectorAll<HTMLButtonElement>('.pc-theme-pack-btn')];
    const selectedPack = themeButtons.find(button => !button.classList.contains('active'));
    const selectedName = selectedPack?.textContent?.trim() || '';
    if (!selectedPack || !selectedName) throw new Error('Theme persistence fixture needs a non-active built-in pack');
    selectedPack.click();
    await context.waitForPaint();
    const themeSnapshot = klona(extension_settings[setting_field]) as typeof settings.settings;

    settings.setVisualAccentColor('#123456');
    extension_settings[setting_field] = themeSnapshot;
    settings.rehydrateFromSettings();
    await context.waitForPaint();
    const activePackName = document.querySelector<HTMLButtonElement>('.pc-theme-pack-btn.active')?.textContent?.trim();
    if (activePackName !== selectedName) throw new Error('Theme pack did not survive rehydrate');
  } else if (name === 'settings-connection')
    context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'connection' });
  else if (name === 'settings-connection-external') {
    settings.settings.textProvider.externalProfiles = [];
    const profile = settings.createExternalApiProfile('custom');
    profile.name = '视觉测试 API';
    profile.apiUrl = 'https://api.example.com/v1';
    context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'connection' });
    await context.waitForPaint();
    const profileEntry = [...document.querySelectorAll<HTMLButtonElement>('.pc-setting-row')].find(button =>
      button.textContent?.includes('视觉测试 API'),
    );
    if (!profileEntry) throw new Error('External API profile entry is missing');
    profileEntry.click();
    await context.waitForPaint();
    if (!document.querySelector('.pc-external-api-page')) throw new Error('External API editor did not open');
  } else if (name === 'settings-connection-dark') {
    settings.setTheme('dark');
    context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'connection' });
    await context.waitForPaint();
    const category = document.querySelector<HTMLSelectElement>('.pc-settings-category .pc-select');
    if (!category || category.scrollWidth > category.clientWidth + 1) {
      throw new Error('Settings category selector overflows the narrow phone layout');
    }
  } else if (name === 'settings-advanced') context.resetPhoneToRoute('settings', 'root', '设置', { tab: 'advanced' });
  else if (name === 'theme-home-xuan' || name === 'theme-home-parchment' || name === 'theme-home-cardstock') {
    const paper = name.slice('theme-home-'.length) as 'cardstock' | 'parchment' | 'xuan';
    settings.setTheme(paper === 'cardstock' ? 'dark' : 'light');
    settings.settings.visualTheme.paperTextureId = paper;
    context.resetPhoneToRoute('home', 'root', '主页');
  } else if (name === 'theme-home-icon-assets') {
    const fileService = installMemoryFileService();
    context.resetPhoneToRoute('theme', 'root', '主题');
    await context.waitForPaint();
    const iconEntry = [...document.querySelectorAll<HTMLButtonElement>('.pc-theme-entry')].find(button =>
      button.textContent?.includes('图标风格'),
    );
    if (!iconEntry) throw new Error('Theme icon entry is missing');
    iconEntry.click();
    await context.waitForPaint();

    const appButton = document.querySelector<HTMLButtonElement>('.pc-app-grid-item');
    const app = getRegisteredPhoneApps().find(item => item.name === appButton?.title);
    if (!appButton || !app) throw new Error('Theme app icon editor has no selectable app');
    appButton.click();
    await context.waitForPaint();

    const pngBytes = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZukQAAAAASUVORK5CYII='),
      character => character.charCodeAt(0),
    );
    const asset = await settings.uploadHomeIconAsset(new File([pngBytes], '视觉首页图标.png', { type: 'image/png' }));
    if (!fileService.has(asset.path)) throw new Error('Home icon upload did not reach user/files');
    asset.path =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2214%22 fill=%22%23007aff%22/%3E%3Ccircle cx=%2232%22 cy=%2232%22 r=%2212%22 fill=%22white%22/%3E%3C/svg%3E';
    const imageField = [...document.querySelectorAll<HTMLLabelElement>('.pc-inline-field')].find(label =>
      label.textContent?.includes('图片图标'),
    );
    const select = imageField?.querySelector<HTMLSelectElement>('select');
    if (!select || ![...select.options].some(option => option.value === asset.id)) {
      throw new Error('Uploaded home icon was not exposed by the theme editor');
    }
    select.value = asset.id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await context.waitForPaint();
    if (!document.querySelector('.pc-selected-icon-editor img')) {
      throw new Error('Selected image icon was not rendered in the theme editor');
    }

    await assertRejects(() => settings.deleteHomeIconAsset(asset.id), 'Referenced home icon deletion was not rejected');
    const disposable = await settings.uploadHomeIconAsset(
      new File([pngBytes], '视觉待删除图标.png', { type: 'image/png' }),
    );
    if (!fileService.has(disposable.path)) throw new Error('Home icon upload did not reach user/files');
    await settings.deleteHomeIconAsset(disposable.id);
    if (fileService.has(disposable.path)) throw new Error('Unreferenced home icon was not deleted from user/files');

    settings.setHomeLayout({
      ...settings.settings.layout,
      appOrder: [app.id],
      dockOrder: settings.settings.layout.dockOrder.filter(appId => appId !== app.id),
      folders: [],
    });
    context.resetPhoneToRoute('home', 'root', '主页');
    await context.waitForPaint();
    const homeTile = [...document.querySelectorAll<HTMLButtonElement>('.pc-app-tile')].find(button =>
      button.textContent?.includes(app.name),
    );
    if (!homeTile?.querySelector('img')) throw new Error('Image icon was not rendered on the home grid');
  } else {
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

async function assertRejects(action: () => Promise<unknown>, message: string) {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error(message);
}
