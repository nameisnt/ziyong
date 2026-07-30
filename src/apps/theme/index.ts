import ThemeApp from './ThemeApp.vue';
import { definePhoneApp } from '@/core/appRegistry';
import { useSettingsStore } from '@/store/settings';
import {
  CustomFontSettingsSchema,
  InterfaceSizeSettingsSchema,
  ReaderAppearanceSchema,
  setting_field,
  Settings,
  ThemeMode,
  ThemeProfilesSchema,
  VisualThemeSettingsSchema,
  WallpaperSettingsSchema,
} from '@/type/settings';
import { parsePrettified } from '@/util/zod';
import { extension_settings } from '@sillytavern/scripts/extensions';

const ThemeBackupSchema = z.object({
  customFont: CustomFontSettingsSchema.optional(),
  fontFamily: z.string().optional(),
  interfaceSize: InterfaceSizeSettingsSchema.optional(),
  reader: ReaderAppearanceSchema.optional(),
  theme: ThemeMode.optional(),
  themeProfiles: ThemeProfilesSchema.optional(),
  visualTheme: VisualThemeSettingsSchema.optional(),
  wallpaper: WallpaperSettingsSchema.optional(),
});

function readThemeBackupData() {
  const settings = parsePrettified(Settings, _.get(extension_settings, setting_field, {}));
  return {
    customFont: settings.customFont,
    fontFamily: settings.fontFamily,
    interfaceSize: settings.interfaceSize,
    reader: settings.reader,
    theme: settings.theme,
    themeProfiles: settings.themeProfiles,
    visualTheme: settings.visualTheme,
    wallpaper: settings.wallpaper,
  };
}

export default definePhoneApp({
  id: 'theme',
  name: '主题',
  icon: 'fa-palette',
  description: '颜色、圆角和 App 图标外观',
  accent: '#8e44ad',
  defaultRoute: 'root',
  defaultOrder: 128,
  backupDomains: [{
    key: 'theme',
    exportData: readThemeBackupData,
    importData: data => {
      const current = parsePrettified(Settings, _.get(extension_settings, setting_field, {}));
      const themeData = parsePrettified(ThemeBackupSchema, data ?? {});
      _.set(extension_settings, setting_field, {
        ...current,
        ...themeData,
      });
    },
    rehydrateFromSettings: () => useSettingsStore().rehydrateFromSettings(),
  }],
  component: ThemeApp,
});
