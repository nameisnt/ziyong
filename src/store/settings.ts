<<<<<<< HEAD
import { buildDefaultHomeLayout, migrateHomeLayoutDockCapacity, normalizeHomeLayout } from '@/core/appLayout';
import { stripRetiredMediaPhoneSettings } from '@/core/retiredMedia';
import { WALLPAPER_PRESETS } from '@/data/wallpapers';
import {
  setting_field,
  Settings,
  type CustomFontItem,
  type CustomWallpaperSettings,
  type ExternalApiPresetId,
  type Settings as PhoneSettings,
  type TimekeeperCalendarTemplate,
  type ThemeAppearanceProfile,
  type ThemeMode,
} from '@/type/settings';
import { commitSettingsResourceDeletion } from '@/util/settingsResourceTransaction';
import { getExternalApiPreset, normalizeExternalApiUrl } from '@/util/textProvider';
import { validateInplace } from '@/util/zod';
// eslint-disable-next-line import-x/no-nodejs-modules
import { getRequestHeaders, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

const CUSTOM_FONT_FAMILY_PREFIX = 'TavernPhoneImportedFont';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getCustomFontFamily(fontId: string) {
  const safeId = fontId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${CUSTOM_FONT_FAMILY_PREFIX}_${safeId}`;
}

function getCustomFontIdFromFamily(fontFamily: string) {
  if (!fontFamily.startsWith(`${CUSTOM_FONT_FAMILY_PREFIX}_`)) return '';
  return fontFamily.slice(CUSTOM_FONT_FAMILY_PREFIX.length + 1);
}

function normalizeCustomAssets(nextSettings: PhoneSettings) {
  const wallpaperItems: CustomWallpaperSettings[] = [];
  const wallpaperPaths = new Set<string>();
  const pushWallpaper = (item: Partial<CustomWallpaperSettings>) => {
    const path = item.path?.trim() || '';
    if (!path || wallpaperPaths.has(path)) return;
    wallpaperPaths.add(path);
    wallpaperItems.push({
      id: item.id?.trim() || createId('wallpaper'),
      name: item.name?.trim() || path.split('/').pop() || '自定义壁纸',
      path,
    });
  };

  const customWallpapers = Array.isArray(nextSettings.wallpaper.customWallpapers)
    ? nextSettings.wallpaper.customWallpapers
    : [];
  customWallpapers.forEach(pushWallpaper);
  pushWallpaper({
    name: nextSettings.wallpaper.customName,
    path: nextSettings.wallpaper.customPath,
  });
  nextSettings.wallpaper.customWallpapers = wallpaperItems;

  const selectedWallpaper =
    wallpaperItems.find(item => item.id === nextSettings.wallpaper.selectedCustomId) ??
    wallpaperItems.find(item => item.path === nextSettings.wallpaper.customPath) ??
    null;
  if (selectedWallpaper) {
    nextSettings.wallpaper.selectedCustomId = selectedWallpaper.id;
    nextSettings.wallpaper.customPath = selectedWallpaper.path;
    nextSettings.wallpaper.customName = selectedWallpaper.name;
  } else {
    nextSettings.wallpaper.selectedCustomId = '';
    nextSettings.wallpaper.customPath = '';
    nextSettings.wallpaper.customName = '';
    if (nextSettings.wallpaper.mode === 'custom') nextSettings.wallpaper.mode = 'none';
  }

  const fontItems: CustomFontItem[] = [];
  const fontPaths = new Set<string>();
  const pushFont = (item: Partial<CustomFontItem>) => {
    const path = item.path?.trim() || '';
    if (!path || fontPaths.has(path)) return;
    fontPaths.add(path);
    fontItems.push({
      id: item.id?.trim() || createId('font'),
      name: item.name?.trim() || path.split('/').pop() || '自定义字体',
      path,
    });
  };

  const customFonts = Array.isArray(nextSettings.customFont.fonts) ? nextSettings.customFont.fonts : [];
  customFonts.forEach(pushFont);
  pushFont({
    name: nextSettings.customFont.name,
    path: nextSettings.customFont.path,
  });
  nextSettings.customFont.fonts = fontItems;

  const fontFamilyId = getCustomFontIdFromFamily(nextSettings.fontFamily);
  const readerFontFamilyId = getCustomFontIdFromFamily(nextSettings.reader.fontFamily);
  const selectedFont =
    fontItems.find(item => item.id === nextSettings.customFont.selectedFontId) ??
    fontItems.find(item => item.id === fontFamilyId) ??
    fontItems.find(item => item.id === readerFontFamilyId) ??
    fontItems.find(item => item.path === nextSettings.customFont.path) ??
    null;
  if (selectedFont) {
    nextSettings.customFont.selectedFontId = selectedFont.id;
    nextSettings.customFont.path = selectedFont.path;
    nextSettings.customFont.name = selectedFont.name;
    if (nextSettings.fontFamily === CUSTOM_FONT_FAMILY_PREFIX) {
      nextSettings.fontFamily = getCustomFontFamily(selectedFont.id);
    }
    if (nextSettings.reader.fontFamily === CUSTOM_FONT_FAMILY_PREFIX) {
      nextSettings.reader.fontFamily = getCustomFontFamily(selectedFont.id);
    }
  } else {
    nextSettings.customFont.selectedFontId = '';
    nextSettings.customFont.path = '';
    nextSettings.customFont.name = '';
    if (nextSettings.fontFamily.startsWith(CUSTOM_FONT_FAMILY_PREFIX)) nextSettings.fontFamily = '';
  }
  if (
    nextSettings.reader.fontFamily.startsWith(CUSTOM_FONT_FAMILY_PREFIX) &&
    !fontItems.some(item => nextSettings.reader.fontFamily === getCustomFontFamily(item.id))
  ) {
    nextSettings.reader.fontFamily = '';
  }
}

function captureThemeProfile(nextSettings: PhoneSettings): ThemeAppearanceProfile {
  return {
    fontFamily: nextSettings.fontFamily,
    readerFontFamily: nextSettings.reader.fontFamily,
    visualTheme: klona(nextSettings.visualTheme),
    wallpaperMode: nextSettings.wallpaper.mode,
    wallpaperPresetId: nextSettings.wallpaper.presetId,
    wallpaperCustomId: nextSettings.wallpaper.selectedCustomId,
  };
}

function applyThemeProfile(nextSettings: PhoneSettings, profile: ThemeAppearanceProfile) {
  nextSettings.fontFamily = profile.fontFamily;
  nextSettings.reader.fontFamily = profile.readerFontFamily;
  nextSettings.visualTheme = klona(profile.visualTheme);
  nextSettings.wallpaper.mode = profile.wallpaperMode;
  nextSettings.wallpaper.presetId = profile.wallpaperPresetId;

  const customWallpaper =
    nextSettings.wallpaper.customWallpapers.find(item => item.id === profile.wallpaperCustomId) ?? null;
  if (profile.wallpaperMode === 'custom' && customWallpaper) {
    nextSettings.wallpaper.selectedCustomId = customWallpaper.id;
    nextSettings.wallpaper.customPath = customWallpaper.path;
    nextSettings.wallpaper.customName = customWallpaper.name;
  } else {
    nextSettings.wallpaper.selectedCustomId = '';
    nextSettings.wallpaper.customPath = '';
    nextSettings.wallpaper.customName = '';
    if (profile.wallpaperMode === 'custom') nextSettings.wallpaper.mode = 'none';
  }
}

function hasStoredThemeProfiles(rawSettings: unknown) {
  if (!rawSettings || typeof rawSettings !== 'object') return false;
  const profiles = (rawSettings as Record<string, unknown>).themeProfiles;
  if (!profiles || typeof profiles !== 'object') return false;
  const record = profiles as Record<string, unknown>;
  return Boolean(record.light && typeof record.light === 'object' && record.dark && typeof record.dark === 'object');
}

function normalizeThemeProfileAssets(nextSettings: PhoneSettings, profile: ThemeAppearanceProfile) {
  if (
    profile.wallpaperMode === 'custom' &&
    !nextSettings.wallpaper.customWallpapers.some(item => item.id === profile.wallpaperCustomId)
  ) {
    profile.wallpaperMode = profile.wallpaperPresetId ? 'preset' : 'none';
    profile.wallpaperCustomId = '';
  }

  const hasFontFamily = (fontFamily: string) => {
    if (!fontFamily.startsWith(`${CUSTOM_FONT_FAMILY_PREFIX}_`)) return true;
    return nextSettings.customFont.fonts.some(item => fontFamily === getCustomFontFamily(item.id));
  };
  if (!hasFontFamily(profile.fontFamily)) profile.fontFamily = '';
  if (!hasFontFamily(profile.readerFontFamily)) profile.readerFontFamily = '';
}

function normalizeSettings(rawSettings: unknown) {
  const hadThemeProfiles = hasStoredThemeProfiles(rawSettings);
  const source = rawSettings && typeof rawSettings === 'object' ? (klona(rawSettings) as Record<string, unknown>) : {};
  stripRetiredMediaPhoneSettings(source);
  const rawTextProvider =
    source.textProvider && typeof source.textProvider === 'object'
      ? (source.textProvider as Record<string, unknown>)
      : {};
  if (!Array.isArray(rawTextProvider.externalProfiles)) {
    const apiUrl = typeof rawTextProvider.apiUrl === 'string' ? normalizeExternalApiUrl(rawTextProvider.apiUrl) : '';
    const apiKey = typeof rawTextProvider.apiKey === 'string' ? rawTextProvider.apiKey : '';
    const model = typeof rawTextProvider.model === 'string' ? rawTextProvider.model : '';
    const hasLegacyProfile = Boolean(apiUrl || apiKey || model);
    rawTextProvider.externalProfiles = hasLegacyProfile
      ? [
          {
            apiKey,
            apiUrl,
            id: 'external_legacy',
            model,
            name: '原外部 API',
            presetId: 'custom',
          },
        ]
      : [];
    rawTextProvider.activeExternalProfileId = hasLegacyProfile ? 'external_legacy' : '';
    source.textProvider = rawTextProvider;
  }

  const nextSettings = validateInplace(Settings, source);
  nextSettings.interfaceSize.dockColumns = Math.min(5, Math.max(3, nextSettings.interfaceSize.dockColumns));
  nextSettings.layout = migrateHomeLayoutDockCapacity(
    normalizeHomeLayout(nextSettings.layout.appOrder.length ? nextSettings.layout : buildDefaultHomeLayout()),
    nextSettings.interfaceSize.dockColumns,
  );
  const seenHomeIconAssetIds = new Set<string>();
  nextSettings.homeIconAssets = nextSettings.homeIconAssets.filter(asset => {
    if (!asset.id.trim() || !asset.path.trim() || seenHomeIconAssetIds.has(asset.id)) return false;
    seenHomeIconAssetIds.add(asset.id);
    asset.name = asset.name.trim() || '图片图标';
    asset.path = asset.path.replace(/^\/+/, '');
    return true;
  });
  const pruneIconReferences = (references: Record<string, string>) => {
    Object.entries(references).forEach(([appId, assetId]) => {
      if (!seenHomeIconAssetIds.has(assetId)) delete references[appId];
    });
  };
  pruneIconReferences(nextSettings.visualTheme.appIconAssetIds);
  pruneIconReferences(nextSettings.themeProfiles.light.visualTheme.appIconAssetIds);
  pruneIconReferences(nextSettings.themeProfiles.dark.visualTheme.appIconAssetIds);
  nextSettings.layout.folders.forEach(folder => {
    if (!seenHomeIconAssetIds.has(folder.iconAssetId)) folder.iconAssetId = '';
  });
  nextSettings.textProvider.contextWindow = null;
  nextSettings.textProvider.maxOutputTokens = null;
  const profileIds = new Set<string>();
  nextSettings.textProvider.externalProfiles = nextSettings.textProvider.externalProfiles.map((profile, index) => {
    let id = profile.id.trim() || `external_${index + 1}`;
    while (profileIds.has(id)) id = `${id}_${index + 1}`;
    profileIds.add(id);
    return {
      ...profile,
      apiUrl: profile.presetId === 'custom' ? normalizeExternalApiUrl(profile.apiUrl) : '',
      id,
      name: profile.name.trim() || `外部 API ${index + 1}`,
    };
  });
  if (!profileIds.has(nextSettings.textProvider.activeExternalProfileId)) {
    nextSettings.textProvider.activeExternalProfileId = nextSettings.textProvider.externalProfiles[0]?.id ?? '';
  }
  normalizeCustomAssets(nextSettings);
  if (hadThemeProfiles) {
    normalizeThemeProfileAssets(nextSettings, nextSettings.themeProfiles.light);
    normalizeThemeProfileAssets(nextSettings, nextSettings.themeProfiles.dark);
    applyThemeProfile(nextSettings, nextSettings.themeProfiles[nextSettings.theme]);
  } else {
    const migratedProfile = captureThemeProfile(nextSettings);
    nextSettings.themeProfiles.light = klona(migratedProfile);
    nextSettings.themeProfiles.dark = klona(migratedProfile);
  }
  return nextSettings;
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(normalizeSettings(_.get(extension_settings, setting_field)));

  function persist(newSettings: typeof settings.value) {
    const nextSettings = validateInplace(Settings, klona(newSettings));
    nextSettings.interfaceSize.dockColumns = Math.min(5, Math.max(3, nextSettings.interfaceSize.dockColumns));
    nextSettings.layout = migrateHomeLayoutDockCapacity(
      normalizeHomeLayout(nextSettings.layout),
      nextSettings.interfaceSize.dockColumns,
    );
    nextSettings.themeProfiles[nextSettings.theme] = captureThemeProfile(nextSettings);
    _.set(extension_settings, setting_field, nextSettings);
    void saveSettingsDebounced();
  }
=======
import { setting_field, Settings } from '@/type/settings';
import { validateInplace } from '@/util/zod';
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(validateInplace(Settings, _.get(extension_settings, setting_field)));
>>>>>>> a5b9d5fa09489da971f8abba1664ce02a1e4eabb

  watch(
    settings,
    new_settings => {
<<<<<<< HEAD
      persist(new_settings);
    },
    { deep: true },
  );

  function setTheme(theme: ThemeMode) {
    settings.value.themeProfiles[settings.value.theme] = captureThemeProfile(settings.value);
    if (settings.value.theme === theme) return;
    settings.value.theme = theme;
    normalizeThemeProfileAssets(settings.value, settings.value.themeProfiles[theme]);
    applyThemeProfile(settings.value, settings.value.themeProfiles[theme]);
  }

  function setVisualAccentColor(color: string) {
    settings.value.visualTheme.accentColor = color.trim() || '#007aff';
  }

  function setVisualRadius(kind: 'cardRadius' | 'controlRadius' | 'iconRadius', value: number) {
    const ranges = {
      cardRadius: [8, 32],
      controlRadius: [8, 28],
      iconRadius: [8, 24],
    } satisfies Record<typeof kind, [number, number]>;
    const [min, max] = ranges[kind];
    settings.value.visualTheme[kind] = Math.min(max, Math.max(min, Math.round(value)));
  }

  function setAppThemeOverride(appId: string, input: { accent?: string; icon?: string }) {
    const safeAppId = appId.trim();
    if (!safeAppId) return;

    if (input.accent !== undefined) {
      const accent = input.accent.trim();
      if (accent) {
        settings.value.visualTheme.appAccentOverrides[safeAppId] = accent;
      } else {
        delete settings.value.visualTheme.appAccentOverrides[safeAppId];
      }
    }

    if (input.icon !== undefined) {
      const icon = input.icon.trim();
      if (icon) {
        settings.value.visualTheme.appIconOverrides[safeAppId] = icon;
      } else {
        delete settings.value.visualTheme.appIconOverrides[safeAppId];
      }
    }
  }

  function resetVisualTheme() {
    settings.value.visualTheme = {
      accentColor: '#007aff',
      appAccentOverrides: {},
      appIconBackgroundColor: '',
      appIconAssetIds: {},
      appIconOverrides: {},
      appIconColor: '',
      backgroundColor: '',
      borderColor: '',
      cardRadius: 20,
      controlRadius: 16,
      dangerColor: '#ff5a5f',
      dockActiveColor: '',
      dockColor: '',
      hintColor: '#2d9cdb',
      iconRadius: 14,
      mutedTextColor: '',
      primaryTextColor: '#ffffff',
      readerTextColor: '',
      softButtonColor: '',
      surfaceColor: '',
      surfaceStrongColor: '',
      textColor: '',
    };
  }

  function getCustomWallpaper(wallpaperId: string) {
    return settings.value.wallpaper.customWallpapers.find(item => item.id === wallpaperId) ?? null;
  }

  function getHomeIconAsset(assetId: string) {
    return settings.value.homeIconAssets.find(asset => asset.id === assetId) ?? null;
  }

  async function uploadHomeIconAsset(file: File) {
    await validateImageFile(file, '图片图标');
    const extension = getFileExtension(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = await uploadUserFile(`phone-icon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`, bytes);
    const asset = { id: createId('home_icon'), name: file.name, path };
    settings.value.homeIconAssets.push(asset);
    return asset;
  }

  function getHomeIconAssetReferenceCount(assetId: string) {
    const inactiveProfile = settings.value.theme === 'light'
      ? settings.value.themeProfiles.dark
      : settings.value.themeProfiles.light;
    return (
      Object.values(settings.value.visualTheme.appIconAssetIds).filter(value => value === assetId).length +
      Object.values(inactiveProfile.visualTheme.appIconAssetIds).filter(value => value === assetId).length +
      settings.value.layout.folders.filter(folder => folder.iconAssetId === assetId).length
    );
  }

  async function deleteHomeIconAsset(assetId: string) {
    const asset = getHomeIconAsset(assetId);
    if (!asset) return;
    const references = getHomeIconAssetReferenceCount(assetId);
    if (references) throw new Error(`该图标仍被 ${references} 处引用，解除引用后才能删除`);
    await commitSettingsResourceDeletion({
      deleteResource: () => deleteUserFile(asset.path),
      removeReference: () => {
        settings.value.homeIconAssets = settings.value.homeIconAssets.filter(item => item.id !== assetId);
      },
    });
  }

  function syncSelectedWallpaper(item: CustomWallpaperSettings | null) {
    settings.value.wallpaper.selectedCustomId = item?.id || '';
    settings.value.wallpaper.customPath = item?.path || '';
    settings.value.wallpaper.customName = item?.name || '';
  }

  async function selectWallpaperPreset(presetId: string) {
    if (!WALLPAPER_PRESETS.some(item => item.id === presetId)) return;
    settings.value.wallpaper.mode = 'preset';
    settings.value.wallpaper.presetId = presetId;
  }

  async function clearWallpaperSelection() {
    settings.value.wallpaper.mode = 'none';
  }

  function selectCustomWallpaper(wallpaperId: string) {
    const item = getCustomWallpaper(wallpaperId);
    if (!item) return;
    settings.value.wallpaper.mode = 'custom';
    syncSelectedWallpaper(item);
  }

  function renameCustomWallpaper(wallpaperId: string, name: string) {
    const item = getCustomWallpaper(wallpaperId);
    if (!item) return;
    item.name = name.trim() || item.name;
    if (settings.value.wallpaper.selectedCustomId === wallpaperId) {
      syncSelectedWallpaper(item);
    }
  }

  function setFontFamily(fontFamily: string) {
    settings.value.fontFamily = fontFamily.trim();
  }

  function resetFontFamily() {
    settings.value.fontFamily = '';
  }

  function getFontExtension(file: File) {
    return file.name.split('.').pop()?.trim().toLowerCase() || '';
  }

  function getFileExtension(file: File) {
    const direct = file.name.split('.').pop()?.trim().toLowerCase();
    if (direct) return direct;
    if (file.type === 'image/jpeg') return 'jpg';
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'image/gif') return 'gif';
    return '';
  }

  async function validateImageFile(file: File, label: '图片图标' | '壁纸') {
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    const extension = getFileExtension(file);
    const allowedExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

    if (!allowedTypes.has(file.type) || !allowedExtensions.has(extension)) {
      throw new Error(`${label}仅支持 PNG / JPEG / WebP / GIF`);
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`${label}文件不能超过 10 MiB`);
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`${label}无法解码`));
        img.src = objectUrl;
      });

      if (image.naturalWidth > 8192 || image.naturalHeight > 8192) {
        throw new Error(`${label}分辨率不能超过 8192×8192`);
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function validateFontFile(file: File) {
    const extension = getFontExtension(file);
    const allowedExtensions = new Set(['ttf', 'otf', 'woff', 'woff2']);

    if (!allowedExtensions.has(extension)) {
      throw new Error('仅支持 TTF / OTF / WOFF / WOFF2 字体');
    }

    if (file.size > 30 * 1024 * 1024) {
      throw new Error('字体文件不能超过 30 MiB');
    }
  }

  function bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

  function normalizeFilePath(path: string) {
    return String(path || '').replace(/^\/+/, '');
  }

  async function uploadUserFile(fileName: string, bytes: Uint8Array) {
    if (typeof getRequestHeaders !== 'function') {
      throw new Error('当前环境不支持 user/files 上传');
    }

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({
        name: fileName,
        data: bytesToBase64(bytes),
      }),
    });

    if (!response.ok) {
      throw new Error(`文件上传失败：HTTP ${response.status}`);
    }

    const result = await response.json();
    return normalizeFilePath(result.path || `user/files/${fileName}`);
  }

  async function deleteUserFile(path: string) {
    if (!path) return;
    if (typeof getRequestHeaders !== 'function') {
      throw new Error('当前环境不支持 user/files 删除');
    }
    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify({ path }),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`文件删除失败：HTTP ${response.status}`);
    }
  }

  async function uploadCustomWallpaper(file: File) {
    await validateImageFile(file, '壁纸');
    const extension = getFileExtension(file);
    const fileName = `phone-wallpaper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = await uploadUserFile(fileName, bytes);
    const item = {
      id: createId('wallpaper'),
      name: file.name,
      path,
    };

    settings.value.wallpaper.customWallpapers.push(item);
    settings.value.wallpaper.mode = 'custom';
    settings.value.wallpaper.presetId = settings.value.wallpaper.presetId || 'aurora';
    syncSelectedWallpaper(item);
  }

  async function clearCustomWallpaper() {
    const selectedId = settings.value.wallpaper.selectedCustomId;
    if (!selectedId) return;
    await deleteCustomWallpaper(selectedId);
  }

  async function deleteCustomWallpaper(wallpaperId: string) {
    const item = getCustomWallpaper(wallpaperId);
    if (!item) return;

    await commitSettingsResourceDeletion({
      deleteResource: () => deleteUserFile(item.path),
      removeReference: () => {
        settings.value.wallpaper.customWallpapers = settings.value.wallpaper.customWallpapers.filter(
          wallpaper => wallpaper.id !== wallpaperId,
        );
        if (settings.value.wallpaper.selectedCustomId === wallpaperId) {
          const nextItem = settings.value.wallpaper.customWallpapers[0] ?? null;
          if (nextItem) {
            settings.value.wallpaper.mode = 'custom';
            syncSelectedWallpaper(nextItem);
          } else {
            settings.value.wallpaper.mode = 'none';
            syncSelectedWallpaper(null);
          }
        }
      }
    });
  }

  function getCustomFont(fontId: string) {
    return settings.value.customFont.fonts.find(item => item.id === fontId) ?? null;
  }

  function syncSelectedFont(item: CustomFontItem | null) {
    settings.value.customFont.selectedFontId = item?.id || '';
    settings.value.customFont.path = item?.path || '';
    settings.value.customFont.name = item?.name || '';
  }

  function selectCustomFont(fontId: string) {
    const item = getCustomFont(fontId);
    if (!item) return;
    syncSelectedFont(item);
    settings.value.fontFamily = getCustomFontFamily(item.id);
  }

  function selectCustomFontAsset(fontId: string) {
    syncSelectedFont(getCustomFont(fontId));
  }

  function renameCustomFont(fontId: string, name: string) {
    const item = getCustomFont(fontId);
    if (!item) return;
    item.name = name.trim() || item.name;
    if (settings.value.customFont.selectedFontId === fontId) {
      syncSelectedFont(item);
    }
  }

  async function uploadCustomFont(file: File) {
    await validateFontFile(file);
    const extension = getFontExtension(file);
    const fileName = `phone-font-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = await uploadUserFile(fileName, bytes);
    const item = {
      id: createId('font'),
      path,
      name: file.name,
    };

    settings.value.customFont.fonts.push(item);
    syncSelectedFont(item);
    return item;
  }

  async function clearCustomFont() {
    const selectedId = settings.value.customFont.selectedFontId;
    if (!selectedId) return;
    await deleteCustomFont(selectedId);
  }

  async function deleteCustomFont(fontId: string) {
    const item = getCustomFont(fontId);
    if (!item) return;

    const wasSelectedAsset = settings.value.customFont.selectedFontId === fontId;
    const wasPhoneFont = settings.value.fontFamily === getCustomFontFamily(fontId);
    await commitSettingsResourceDeletion({
      deleteResource: () => deleteUserFile(item.path),
      removeReference: () => {
        settings.value.customFont.fonts = settings.value.customFont.fonts.filter(font => font.id !== fontId);
        if (settings.value.reader.fontFamily === getCustomFontFamily(fontId)) {
          settings.value.reader.fontFamily = '';
        }
        if (wasSelectedAsset) {
          const nextItem = settings.value.customFont.fonts[0] ?? null;
          syncSelectedFont(nextItem);
        }
        if (wasPhoneFont) settings.value.fontFamily = '';
      },
    });
  }

  function resetGenerationDefaults() {
    settings.value.generation = {
      fromStartEnd: 20,
      outputCleaningEnabled: false,
      outputCleaningEndTags: '</think>',
      rpmLimit: 10,
      sourceMode: 'latest',
      tavernPresetName: '',
      resultMode: 'preview',
      stream: true,
    };
  }

  function setReaderFontSize(fontSize: number) {
    settings.value.reader.fontSize = Math.min(24, Math.max(14, Math.round(fontSize)));
  }

  function setReaderBackgroundColor(color: string) {
    settings.value.reader.backgroundColor = color.trim();
  }

  function setReaderBackgroundImage(image: string) {
    settings.value.reader.backgroundImage = image.trim();
  }

  function setReaderFontFamily(fontFamily: string) {
    settings.value.reader.fontFamily = fontFamily.trim();
  }

  function setReaderLineHeight(lineHeight: number) {
    settings.value.reader.lineHeight = Math.min(2.2, Math.max(1.4, Math.round(lineHeight * 10) / 10));
  }

  function setReaderFirstLineIndent(enabled: boolean) {
    settings.value.reader.firstLineIndent = enabled;
  }

  function setReaderBlankLineBetweenLines(enabled: boolean) {
    settings.value.reader.blankLineBetweenLines = enabled;
  }

  function resetReaderAppearance() {
    settings.value.reader = {
      backgroundColor: '',
      backgroundImage: '',
      blankLineBetweenLines: true,
      firstLineIndent: false,
      fontFamily: '',
      fontSize: 16,
      lineHeight: 1.6,
    };
  }

  function setPhoneWindowWidth(width: number) {
    settings.value.interfaceSize.phoneWidth = Math.min(720, Math.max(320, Math.round(width)));
  }

  function setPhoneWindowHeight(height: number) {
    settings.value.interfaceSize.phoneHeight = Math.min(980, Math.max(560, Math.round(height)));
  }

  function setReaderScale(scale: number) {
    settings.value.interfaceSize.readerScale = Math.min(120, Math.max(80, Math.round(scale)));
  }

  function setHomeColumns(columns: number) {
    settings.value.interfaceSize.homeColumns = Math.min(5, Math.max(3, Math.round(columns)));
  }

  function setHomeRows(rows: number) {
    settings.value.interfaceSize.homeRows = Math.min(5, Math.max(2, Math.round(rows)));
  }

  function setDockColumns(columns: number) {
    settings.value.interfaceSize.dockColumns = Math.min(5, Math.max(3, Math.round(columns)));
  }

  function resetInterfaceSize() {
    settings.value.interfaceSize = {
      dockColumns: 4,
      homeColumns: 4,
      homeRows: 3,
      phoneHeight: 700,
      phoneWidth: 360,
      readerScale: 100,
    };
  }

  function setTextProviderApiUrl(apiUrl: string) {
    const profile = settings.value.textProvider.externalProfiles.find(
      item => item.id === settings.value.textProvider.activeExternalProfileId,
    );
    if (!profile || profile.presetId !== 'custom') return;
    profile.apiUrl = normalizeExternalApiUrl(apiUrl);
  }

  function createExternalApiProfile(presetId: ExternalApiPresetId = 'custom') {
    const preset = getExternalApiPreset(presetId);
    const existingNames = new Set(settings.value.textProvider.externalProfiles.map(profile => profile.name));
    const baseName = preset?.label || '外部 API';
    let name = baseName;
    let suffix = 2;
    while (existingNames.has(name)) {
      name = `${baseName} ${suffix}`;
      suffix += 1;
    }
    const profile = {
      apiKey: '',
      apiUrl: '',
      id: createId('external'),
      model: '',
      name,
      presetId,
    };
    settings.value.textProvider.externalProfiles = [...settings.value.textProvider.externalProfiles, profile];
    settings.value.textProvider.activeExternalProfileId = profile.id;
    settings.value.textProvider.mode = 'external';
    return profile;
  }

  function deleteExternalApiProfile(profileId: string) {
    settings.value.textProvider.externalProfiles = settings.value.textProvider.externalProfiles.filter(
      profile => profile.id !== profileId,
    );
    if (settings.value.textProvider.activeExternalProfileId === profileId) {
      settings.value.textProvider.activeExternalProfileId = settings.value.textProvider.externalProfiles[0]?.id ?? '';
    }
    if (!settings.value.textProvider.externalProfiles.length) {
      settings.value.textProvider.mode = 'tavern';
    }
  }

  function setActiveExternalApiProfile(profileId: string) {
    if (!settings.value.textProvider.externalProfiles.some(profile => profile.id === profileId)) return;
    settings.value.textProvider.activeExternalProfileId = profileId;
    settings.value.textProvider.mode = 'external';
  }

  function setExternalApiProfilePreset(profileId: string, presetId: ExternalApiPresetId) {
    const profile = settings.value.textProvider.externalProfiles.find(item => item.id === profileId);
    if (!profile) return;
    profile.presetId = presetId;
    if (presetId !== 'custom') profile.apiUrl = '';
    profile.model = '';
  }

  function renameExternalApiProfile(profileId: string, name: string) {
    const normalized = name.trim();
    if (!normalized) throw new Error('配置名称不能为空');
    if (
      settings.value.textProvider.externalProfiles.some(
        profile => profile.id !== profileId && profile.name === normalized,
      )
    ) {
      throw new Error('已经存在同名外部 API 配置');
    }
    const profile = settings.value.textProvider.externalProfiles.find(item => item.id === profileId);
    if (profile) profile.name = normalized;
  }

  function createTimekeeperCalendarTemplate(input: Omit<TimekeeperCalendarTemplate, 'id'>) {
    const name = input.name.trim();
    if (!name) throw new Error('历法名称不能为空');
    if (settings.value.timekeeperCalendarTemplates.some(template => template.name === name)) {
      throw new Error('已经存在同名历法');
    }
    const template: TimekeeperCalendarTemplate = {
      ...input,
      eraName: input.eraName.trim() || '世界历',
      id: createId('calendar'),
      monthDaysText: input.monthDaysText.trim() || '30',
      name,
    };
    settings.value.timekeeperCalendarTemplates = [...settings.value.timekeeperCalendarTemplates, template];
    return template;
  }

  function deleteTimekeeperCalendarTemplate(templateId: string) {
    settings.value.timekeeperCalendarTemplates = settings.value.timekeeperCalendarTemplates.filter(
      template => template.id !== templateId,
    );
  }

  function resetTextProvider() {
    settings.value.textProvider.mode = 'tavern';
  }

  function toggleTheme() {
    setTheme(settings.value.theme === 'light' ? 'dark' : 'light');
  }

  function setFloatBallPosition(x: number, y: number) {
    settings.value.floatBallX = Math.round(x);
    settings.value.floatBallY = Math.round(y);
  }

  function resetFloatBallPosition() {
    settings.value.floatBallX = null;
    settings.value.floatBallY = null;
  }

  function setPhoneWindowPosition(x: number, y: number) {
    settings.value.phoneWindowX = Math.round(x);
    settings.value.phoneWindowY = Math.round(y);
  }

  function resetPhoneWindowPosition() {
    settings.value.phoneWindowX = null;
    settings.value.phoneWindowY = null;
  }

  function resetHomeLayout() {
    settings.value.layout = buildDefaultHomeLayout();
  }

  function reorderHomeApps(appOrder: string[]) {
    settings.value.layout = {
      ...settings.value.layout,
      appOrder,
    };
  }

  function setHomeLayout(layout: PhoneSettings['layout']) {
    settings.value.layout = migrateHomeLayoutDockCapacity(normalizeHomeLayout(layout));
  }

  function rehydrateFromSettings() {
    settings.value = normalizeSettings(_.get(extension_settings, setting_field));
  }

  return {
    settings,
    clearCustomFont,
    clearCustomWallpaper,
    clearWallpaperSelection,
    createExternalApiProfile,
    createTimekeeperCalendarTemplate,
    deleteExternalApiProfile,
    deleteTimekeeperCalendarTemplate,
    rehydrateFromSettings,
    resetFontFamily,
    resetFloatBallPosition,
    resetPhoneWindowPosition,
    resetGenerationDefaults,
    resetHomeLayout,
    setHomeLayout,
    resetInterfaceSize,
    resetReaderAppearance,
    resetTextProvider,
    resetVisualTheme,
    deleteCustomFont,
    deleteCustomWallpaper,
    deleteHomeIconAsset,
    getCustomFontFamily,
    getHomeIconAsset,
    getHomeIconAssetReferenceCount,
    renameCustomFont,
    renameCustomWallpaper,
    renameExternalApiProfile,
    selectCustomFont,
    selectCustomFontAsset,
    selectCustomWallpaper,
    selectWallpaperPreset,
    setFloatBallPosition,
    setFontFamily,
    setDockColumns,
    setHomeColumns,
    setHomeRows,
    setPhoneWindowPosition,
    setPhoneWindowHeight,
    setPhoneWindowWidth,
    setReaderBlankLineBetweenLines,
    setReaderBackgroundColor,
    setReaderBackgroundImage,
    setReaderFirstLineIndent,
    setReaderFontFamily,
    setReaderFontSize,
    setReaderLineHeight,
    setReaderScale,
    setTextProviderApiUrl,
    uploadHomeIconAsset,
    setActiveExternalApiProfile,
    setExternalApiProfilePreset,
    setTheme,
    setAppThemeOverride,
    setVisualAccentColor,
    setVisualRadius,
    toggleTheme,
    uploadCustomFont,
    uploadCustomWallpaper,
    reorderHomeApps,
=======
      _.set(extension_settings, setting_field, klona(new_settings)); // 用 klona 克隆对象从而去除 proxy 层
      saveSettingsDebounced();
    },
    { deep: true },
  );
  return {
    settings,
>>>>>>> a5b9d5fa09489da971f8abba1664ce02a1e4eabb
  };
});
