<template>
  <section class="pc-theme-app">
    <template v-if="view === 'root'">
      <div class="pc-theme-mode pc-segment" role="tablist" :aria-label="t`主题模式`">
        <button
          :class="['pc-segment-btn', { active: settings.theme === 'light' }]"
          type="button"
          role="tab"
          :aria-selected="settings.theme === 'light'"
          @click="settingsStore.setTheme('light')"
        >
          <i class="fa-solid fa-sun"></i>
          <span>{{ t`日间` }}</span>
        </button>
        <button
          :class="['pc-segment-btn', { active: settings.theme === 'dark' }]"
          type="button"
          role="tab"
          :aria-selected="settings.theme === 'dark'"
          @click="settingsStore.setTheme('dark')"
        >
          <i class="fa-solid fa-moon"></i>
          <span>{{ t`夜间` }}</span>
        </button>
      </div>

      <section class="pc-theme-preview" :style="previewStyle">
        <div class="pc-preview-status">
          <strong>10:08</strong>
        </div>
        <div class="pc-preview-copy">
          <strong>{{ t`主题预览` }}</strong>
        </div>
        <div class="pc-preview-icons">
          <span
            v-for="app in previewApps"
            :key="app.id"
            class="pc-preview-app-icon pc-app-icon-material"
            :style="getAppPreviewStyle(app)"
            :title="app.name"
          >
            <AppIcon
              :app-id="app.id"
              :asset-path="getAppIconAssetPath(app)"
              :default-icon="app.icon"
              :icon="getAppIcon(app)"
            />
          </span>
        </div>
      </section>

      <section class="pc-theme-packs pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`内置主题包` }}<InfoHint text="主题包会同时设置日间与夜间方案。" /></strong>
        </div>
        <div class="pc-theme-pack-grid">
          <button
            v-for="pack in themePacks"
            :key="pack.id"
            :class="['pc-theme-pack-btn', { active: isThemePackActive(pack) }]"
            type="button"
            :style="{
              '--pack-dark': pack.dark.accentColor,
              '--pack-light': pack.light.accentColor,
              '--pack-surface': pack.light.surfaceColor,
            }"
            @click="applyThemePack(pack)"
          >
            <span class="pc-theme-pack-sample" aria-hidden="true">
              <i></i>
              <b></b>
              <em></em>
            </span>
            <span class="pc-theme-pack-copy">
              <strong>{{ pack.name }}</strong>
            </span>
          </button>
        </div>
      </section>

      <button class="pc-list-row pc-theme-entry" type="button" @click="openView('icons')">
        <span class="pc-entry-icon-stack" aria-hidden="true">
          <span
            v-for="app in previewApps.slice(0, 4)"
            :key="app.id"
            class="pc-app-icon-material"
            :style="getAppPreviewStyle(app)"
          >
            <AppIcon
              :app-id="app.id"
              :asset-path="getAppIconAssetPath(app)"
              :default-icon="app.icon"
              :icon="getAppIcon(app)"
            />
          </span>
        </span>
        <span class="pc-entry-copy">
          <strong>{{ t`图标风格` }}</strong>
        </span>
        <i class="fa-solid fa-chevron-right pc-entry-chevron"></i>
      </button>

      <button class="pc-list-row pc-theme-entry" type="button" @click="openView('advanced')">
        <span class="pc-entry-symbol"><i class="fa-solid fa-sliders"></i></span>
        <span class="pc-entry-copy">
          <strong>{{ t`高级外观` }}</strong>
        </span>
        <i class="fa-solid fa-chevron-right pc-entry-chevron"></i>
      </button>
    </template>

    <template v-else-if="view === 'icons'">
      <div class="pc-theme-subhead">
        <button class="pc-icon-btn" type="button" :title="t`返回`" :aria-label="t`返回`" @click="view = 'root'">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <div>
          <strong>{{ t`图标风格` }}</strong>
          <span>{{ settings.theme === 'light' ? t`日间方案` : t`夜间方案` }}</span>
        </div>
      </div>

      <section class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`内置图标包` }}<InfoHint text="图标包会同步应用到日间与夜间方案。" /></strong>
        </div>
        <div class="pc-icon-pack-grid">
          <button
            v-for="pack in builtinIconPacks"
            :key="pack.id"
            :class="['pc-icon-pack-btn', { active: isBuiltinIconPackActive(pack) }]"
            type="button"
            @click="applyBuiltinIconPack(pack)"
          >
            <span class="pc-icon-pack-preview" aria-hidden="true">
              <AppIcon v-for="icon in pack.previewIcons" :key="icon" :icon="icon" />
            </span>
            <span>
              <strong>{{ pack.name }}</strong>
              <small>{{ pack.description }}</small>
            </span>
          </button>
        </div>
      </section>

      <section class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`整套风格` }}</strong>
        </div>
        <div class="pc-icon-style-grid">
          <button
            v-for="option in iconStyleOptions"
            :key="option.id"
            :class="['pc-icon-style-option', { active: iconStyleId === option.id }]"
            type="button"
            @click="applyIconStyle(option.id)"
          >
            <span class="pc-style-icons" :class="`style-${option.id}`">
              <AppIcon icon="fa-book" />
              <AppIcon icon="fa-comments" />
              <AppIcon icon="fa-image" />
            </span>
            <strong>{{ option.name }}</strong>
          </button>
        </div>
      </section>

      <section class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`单独调整` }}</strong>
          <span>{{ selectedApp ? selectedApp.name : t`选择一个 App` }}</span>
        </div>

        <div class="pc-app-grid">
          <button
            v-for="app in visibleApps"
            :key="app.id"
            :class="['pc-app-grid-item', { active: selectedAppId === app.id }]"
            type="button"
            :title="app.name"
            @click="selectedAppId = app.id"
          >
            <span :style="getAppPreviewStyle(app)">
              <AppIcon
                :app-id="app.id"
                :asset-path="getAppIconAssetPath(app)"
                :default-icon="app.icon"
                :icon="getAppIcon(app)"
              />
            </span>
            <small>{{ app.name }}</small>
          </button>
        </div>

        <div v-if="selectedApp" class="pc-selected-icon-editor">
          <div class="pc-selected-app-head">
            <span :style="getAppPreviewStyle(selectedApp)">
              <AppIcon
                :app-id="selectedApp.id"
                :asset-path="getAppIconAssetPath(selectedApp)"
                :default-icon="selectedApp.icon"
                :icon="getAppIcon(selectedApp)"
              />
            </span>
            <div>
              <strong>{{ selectedApp.name }}</strong>
            </div>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`清除覆盖`"
              :aria-label="t`清除覆盖`"
              @click="clearAppOverride(selectedApp.id)"
            >
              <i class="fa-solid fa-rotate-left"></i>
            </button>
          </div>

          <div class="pc-icon-picker">
            <button
              v-for="icon in iconOptions"
              :key="`${selectedApp.id}:${icon}`"
              :class="['pc-icon-choice', { active: getAppIcon(selectedApp) === icon }]"
              type="button"
              :title="icon"
              @click="setAppIcon(selectedApp.id, icon)"
            >
              <AppIcon :icon="icon" />
            </button>
          </div>

          <label class="pc-inline-field">
            <span class="pc-field-label">{{ t`图标类名` }}</span>
            <input
              class="pc-field"
              type="text"
              :value="settings.visualTheme.appIconOverrides[selectedApp.id] || ''"
              :placeholder="selectedApp.icon"
              @change="onAppIconChange(selectedApp.id, $event)"
            />
          </label>
          <label class="pc-inline-field">
            <span class="pc-field-label">图片图标</span>
            <select
              class="pc-select"
              :value="settings.visualTheme.appIconAssetIds[selectedApp.id] || ''"
              @change="setAppIconAsset(selectedApp.id, $event)"
            >
              <option value="">使用字体图标</option>
              <option v-for="asset in settings.homeIconAssets" :key="asset.id" :value="asset.id">
                {{ asset.name }}
              </option>
            </select>
          </label>
          <div class="pc-form-actions">
            <button class="pc-soft-btn" type="button" @click="homeIconInputEl?.click()">
              <i class="fa-solid fa-upload"></i><span>上传图片</span>
            </button>
            <button
              class="pc-soft-btn danger"
              type="button"
              :disabled="!settings.visualTheme.appIconAssetIds[selectedApp.id]"
              @click="deleteSelectedHomeIcon"
            >
              <i class="fa-solid fa-trash"></i><span>删除图片</span>
            </button>
            <input
              ref="homeIconInputEl"
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              @change="uploadHomeIcon"
            />
          </div>
          <label class="pc-inline-field">
            <span class="pc-field-label">{{ t`图标颜色` }}</span>
            <input
              class="pc-color-input"
              type="color"
              :value="getAppAccent(selectedApp)"
              @input="onAppAccentInput(selectedApp.id, selectedApp.accent, $event)"
            />
          </label>
        </div>
      </section>

      <section class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`图标包` }}<InfoHint text="导入 JSON 文件可批量覆盖 App 图标。" /></strong>
        </div>
        <button class="pc-soft-btn" type="button" @click="iconInputEl?.click()">
          <i class="fa-solid fa-file-import"></i>
          <span>{{ t`导入图标包` }}</span>
        </button>
      </section>
    </template>

    <template v-else>
      <div class="pc-theme-subhead">
        <button class="pc-icon-btn" type="button" :title="t`返回`" :aria-label="t`返回`" @click="view = 'root'">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <div>
          <strong>{{ t`高级外观` }}</strong>
          <span>{{ settings.theme === 'light' ? t`日间方案` : t`夜间方案` }}</span>
        </div>
      </div>

      <section class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`颜色` }}</strong>
        </div>
        <label v-for="control in colorControls" :key="control.key" class="pc-color-row">
          <span>
            <strong>{{ control.label }}</strong>
            <small>{{ getThemeColor(control.key) }}</small>
          </span>
          <input
            :value="getColorInputValue(control.key)"
            type="color"
            @input="onVisualColorInput(control.key, $event)"
          />
        </label>
      </section>

      <section class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`圆角` }}</strong>
        </div>
        <div v-for="control in radiusControls" :key="control.key" class="pc-control-row">
          <div>
            <strong>{{ control.label }}</strong>
            <p>{{ `${settings.visualTheme[control.key]}px` }}</p>
          </div>
          <input
            :value="settings.visualTheme[control.key]"
            type="range"
            :min="control.min"
            :max="control.max"
            step="1"
            @input="onRadiusInput(control.key, $event)"
          />
        </div>
      </section>

      <section class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`字体与纸张` }}</strong>
          <button
            class="pc-icon-btn"
            type="button"
            :title="t`导入字体`"
            :aria-label="t`导入字体`"
            @click="fontInputEl?.click()"
          >
            <i class="fa-solid fa-file-import"></i>
          </button>
        </div>
        <label class="pc-select-field">
          <span class="pc-field-label">{{ t`纸张材质` }}</span>
          <SearchableCombobox
            :model-value="settings.visualTheme.paperTextureId"
            input-label="选择纸张材质"
            :options="paperTextureOptions"
            placeholder="A4 白纸"
            @update:model-value="onPaperTextureSelect"
          />
        </label>
        <label class="pc-select-field">
          <span class="pc-field-label">{{ t`手机字体` }}</span>
          <SearchableCombobox
            :model-value="fontSelectionValue"
            input-label="选择手机字体"
            :options="fontSelectionOptions"
            placeholder="系统默认"
            @update:model-value="onFontSelect"
          />
        </label>
      </section>

      <section class="pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`导入与导出` }}</strong>
        </div>
        <div class="pc-action-grid">
          <button class="pc-soft-btn" type="button" @click="exportTheme">
            <i class="fa-solid fa-file-export"></i>
            <span>{{ t`导出当前方案` }}</span>
          </button>
          <button class="pc-soft-btn" type="button" @click="themeInputEl?.click()">
            <i class="fa-solid fa-file-import"></i>
            <span>{{ t`导入到当前方案` }}</span>
          </button>
        </div>
        <button class="pc-soft-btn danger" type="button" @click="resetCurrentTheme">
          <i class="fa-solid fa-rotate-left"></i>
          <span>{{ t`恢复当前方案默认值` }}</span>
        </button>
      </section>
    </template>

    <input
      ref="iconInputEl"
      class="pc-hidden-input"
      type="file"
      accept="application/json,.json"
      @change="onIconPackSelected"
    />
    <input
      ref="themeInputEl"
      class="pc-hidden-input"
      type="file"
      accept="application/json,.json"
      @change="onThemeSelected"
    />
    <input
      ref="fontInputEl"
      class="pc-hidden-input"
      type="file"
      accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
      @change="onThemeFontSelected"
    />
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import AppIcon from '@/components/AppIcon.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { getPhoneApps, type PhoneAppDefinition } from '@/data/apps';
import { getPaperTexture, PAPER_TEXTURES } from '@/data/paperTextures';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { VisualThemeSettingsSchema, type PaperTextureId, type ThemeAppearanceProfile } from '@/type/settings';
import { storeToRefs } from 'pinia';
import {
  builtinIconPacks,
  colorControls,
  fontOptions,
  iconOptions,
  iconStyleOptions,
  radiusControls,
  themePacks,
  type BuiltinIconPack,
  type ColorKey,
  type IconStyleId,
  type RadiusKey,
  type ThemePack,
  type ThemePreset,
  type VisualTheme,
} from './themeCatalog';

type ThemeView = 'root' | 'icons' | 'advanced';
const settingsStore = useSettingsStore();
const phone = usePhoneStore();
const { settings } = storeToRefs(settingsStore);
const view = ref<ThemeView>('root');
const selectedAppId = ref('');
const themeInputEl = ref<HTMLInputElement | null>(null);
const iconInputEl = ref<HTMLInputElement | null>(null);
const homeIconInputEl = ref<HTMLInputElement | null>(null);
const fontInputEl = ref<HTMLInputElement | null>(null);

const visibleApps = computed(() => getPhoneApps().filter(app => app.id !== 'home'));
const previewApps = computed(() => visibleApps.value.slice(0, 6));
const selectedApp = computed(() => visibleApps.value.find(app => app.id === selectedAppId.value) ?? null);
const selectedCustomFont = computed(
  () =>
    settings.value.customFont.fonts.find(
      item => settings.value.fontFamily === settingsStore.getCustomFontFamily(item.id),
    ) ?? null,
);
const fontSelectionValue = computed(() =>
  selectedCustomFont.value ? `custom:${selectedCustomFont.value.id}` : settings.value.fontFamily,
);
const paperTextureOptions = PAPER_TEXTURES.map(texture => ({ label: texture.name, value: texture.id }));
function createFontSelectionOptions(selected: string) {
  const options = [
    ...fontOptions,
    ...settings.value.customFont.fonts.map(font => ({
      group: '自定义字体',
      label: font.name,
      value: `custom:${font.id}`,
    })),
  ];
  if (selected && !options.some(option => option.value === selected)) {
    options.unshift({ label: '当前字体资源已失效', value: selected });
  }
  return options;
}
const fontSelectionOptions = computed(() => createFontSelectionOptions(fontSelectionValue.value));
const iconStyleId = computed<IconStyleId>(() => {
  if (settings.value.visualTheme.appIconColor) return 'unified';
  if (settings.value.visualTheme.appIconBackgroundColor) return 'soft';
  return 'native';
});
const previewStyle = computed(() => {
  const texture = getPaperTexture(settings.value.visualTheme.paperTextureId);
  return {
    backgroundColor:
      settings.value.visualTheme.backgroundColor || (settings.value.theme === 'dark' ? '#1c1c1e' : '#f2f2f7'),
    backgroundImage: `url("${texture.url}")`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    color: settings.value.visualTheme.textColor || (settings.value.theme === 'dark' ? '#f5f5f7' : '#1c1c1e'),
  };
});

function openView(nextView: Exclude<ThemeView, 'root'>) {
  selectedAppId.value = '';
  view.value = nextView;
}

function createThemePackProfile(preset: ThemePreset, iconStyle: IconStyleId): ThemeAppearanceProfile {
  const visualTheme = normalizeImportedVisualTheme(preset);
  if (!visualTheme) throw new Error('内置主题包格式不正确');
  visualTheme.appAccentOverrides = {};
  visualTheme.appIconOverrides = {};
  const surfaceColor = visualTheme.surfaceStrongColor || (preset.mode === 'dark' ? '#2c2c2e' : '#ffffff');
  visualTheme.appIconBackgroundColor = iconStyle === 'native' ? '' : surfaceColor;
  visualTheme.appIconColor = iconStyle === 'unified' ? visualTheme.accentColor : '';
  return {
    fontFamily: '',
    readerFontFamily: '',
    visualTheme,
  };
}

function applyThemePackProfile(profile: ThemeAppearanceProfile) {
  settings.value.fontFamily = profile.fontFamily;
  settings.value.reader.fontFamily = profile.readerFontFamily;
  settings.value.visualTheme = klona(profile.visualTheme);
}

function isThemePackActive(pack: ThemePack) {
  const light = settings.value.themeProfiles.light.visualTheme;
  const dark = settings.value.themeProfiles.dark.visualTheme;
  return (
    light.accentColor.toLowerCase() === pack.light.accentColor.toLowerCase() &&
    light.backgroundColor.toLowerCase() === pack.light.backgroundColor.toLowerCase() &&
    dark.accentColor.toLowerCase() === pack.dark.accentColor.toLowerCase() &&
    dark.backgroundColor.toLowerCase() === pack.dark.backgroundColor.toLowerCase()
  );
}

function applyThemePack(pack: ThemePack) {
  const lightProfile = createThemePackProfile(pack.light, pack.iconStyle);
  const darkProfile = createThemePackProfile(pack.dark, pack.iconStyle);
  settings.value.themeProfiles.light = lightProfile;
  settings.value.themeProfiles.dark = darkProfile;
  applyThemePackProfile(settings.value.theme === 'light' ? lightProfile : darkProfile);
  settings.value.floatBallColor = settings.value.visualTheme.accentColor;
  toastr.success(`已应用主题包：${pack.name}`);
}

function getAppIcon(app: PhoneAppDefinition) {
  return settings.value.visualTheme.appIconOverrides[app.id] || app.icon;
}

function getAppIconAssetPath(app: PhoneAppDefinition) {
  const assetId = settings.value.visualTheme.appIconAssetIds[app.id] || '';
  return settings.value.homeIconAssets.find(asset => asset.id === assetId)?.path || '';
}

function getAppAccent(app: PhoneAppDefinition) {
  return settings.value.visualTheme.appAccentOverrides[app.id] || settings.value.visualTheme.appIconColor || app.accent;
}

function getAppPreviewStyle(app: PhoneAppDefinition) {
  const accent = getAppAccent(app);
  const iconBase =
    settings.value.visualTheme.appIconBackgroundColor ||
    `color-mix(in srgb, ${accent} 18%, var(--pc-surface-strong) 82%)`;
  return {
    '--preview-app-accent': accent,
    '--preview-app-bg': iconBase,
    '--pc-icon-material-accent': accent,
    '--pc-icon-material-base': iconBase,
    '--pc-icon-material-foreground': settings.value.visualTheme.appIconColor || '#ffffff',
  };
}

function applyIconStyle(style: IconStyleId) {
  if (style === 'native') {
    settings.value.visualTheme.appIconColor = '';
    settings.value.visualTheme.appIconBackgroundColor = '';
    return;
  }
  const surfaceFallback = settings.value.theme === 'dark' ? '#2c2c2e' : '#ffffff';
  settings.value.visualTheme.appIconBackgroundColor = getColorInputValue('surfaceColor') || surfaceFallback;
  settings.value.visualTheme.appIconColor = style === 'unified' ? settings.value.visualTheme.accentColor : '';
}

function haveSameIconOverrides(left: Record<string, string>, right: Record<string, string>) {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return leftEntries.length === rightEntries.length && leftEntries.every(([appId, icon]) => right[appId] === icon);
}

function isBuiltinIconPackActive(pack: BuiltinIconPack) {
  return (
    haveSameIconOverrides(settings.value.themeProfiles.light.visualTheme.appIconOverrides, pack.icons) &&
    haveSameIconOverrides(settings.value.themeProfiles.dark.visualTheme.appIconOverrides, pack.icons)
  );
}

function applyBuiltinIconPack(pack: BuiltinIconPack) {
  const nextIcons = klona(pack.icons);
  settings.value.themeProfiles.light.visualTheme.appIconOverrides = klona(nextIcons);
  settings.value.themeProfiles.dark.visualTheme.appIconOverrides = klona(nextIcons);
  settings.value.visualTheme.appIconOverrides = nextIcons;
  toastr.success(`已应用图标包：${pack.name}`);
}

function setAppIcon(appId: string, icon: string) {
  settingsStore.setAppThemeOverride(appId, { icon });
}

function onAppIconChange(appId: string, event: Event) {
  settingsStore.setAppThemeOverride(appId, { icon: (event.target as HTMLInputElement).value });
}

function onAppAccentInput(appId: string, fallback: string, event: Event) {
  settingsStore.setAppThemeOverride(appId, { accent: (event.target as HTMLInputElement).value || fallback });
}

function clearAppOverride(appId: string) {
  settingsStore.setAppThemeOverride(appId, { accent: '', icon: '' });
  delete settings.value.visualTheme.appIconAssetIds[appId];
}

function setAppIconAsset(appId: string, event: Event) {
  const assetId = (event.target as HTMLSelectElement).value;
  if (assetId) settings.value.visualTheme.appIconAssetIds[appId] = assetId;
  else delete settings.value.visualTheme.appIconAssetIds[appId];
}

async function uploadHomeIcon(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !selectedApp.value) return;
  try {
    const asset = await settingsStore.uploadHomeIconAsset(file);
    settings.value.visualTheme.appIconAssetIds[selectedApp.value.id] = asset.id;
    toastr.success('图片图标已上传');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '图片图标上传失败');
  }
}

async function deleteSelectedHomeIcon() {
  const app = selectedApp.value;
  if (!app) return;
  const assetId = settings.value.visualTheme.appIconAssetIds[app.id] || '';
  if (!assetId) return;
  delete settings.value.visualTheme.appIconAssetIds[app.id];
  try {
    await settingsStore.deleteHomeIconAsset(assetId);
    toastr.success('图片图标已删除');
  } catch (error) {
    settings.value.visualTheme.appIconAssetIds[app.id] = assetId;
    toastr.error(error instanceof Error ? error.message : '图片图标删除失败');
  }
}

function getColorFallback(key: ColorKey) {
  const dark = settings.value.theme === 'dark';
  const fallbacks: Record<ColorKey, string> = {
    accentColor: dark ? '#0a84ff' : '#007aff',
    appIconBackgroundColor: dark ? '#2c2c2e' : '#ffffff',
    appIconColor: settings.value.visualTheme.accentColor,
    backgroundColor: dark ? '#1c1c1e' : '#f2f2f7',
    dockColor: dark ? '#2c2c2e' : '#ffffff',
    readerTextColor: settings.value.visualTheme.textColor || (dark ? '#f5f5f7' : '#1c1c1e'),
    surfaceColor: dark ? '#2c2c2e' : '#ffffff',
  };
  return fallbacks[key];
}

function getThemeColor(key: ColorKey) {
  return settings.value.visualTheme[key].trim() || getColorFallback(key);
}

function getColorInputValue(key: ColorKey) {
  const value = getThemeColor(key);
  return /^#[0-9a-f]{6}$/i.test(value) ? value : getColorFallback(key);
}

function onVisualColorInput(key: ColorKey, event: Event) {
  const value = (event.target as HTMLInputElement).value;
  settings.value.visualTheme[key] = value;
  if (key === 'accentColor') settings.value.floatBallColor = value;
}

function onRadiusInput(kind: RadiusKey, event: Event) {
  settingsStore.setVisualRadius(kind, Number((event.target as HTMLInputElement).value));
}

function onFontSelect(value: string) {
  if (value.startsWith('custom:')) settingsStore.selectCustomFont(value.slice('custom:'.length));
  else settingsStore.setFontFamily(value);
}

function onPaperTextureSelect(value: string) {
  settings.value.visualTheme.paperTextureId = value as PaperTextureId;
}

async function onThemeFontSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const font = await settingsStore.uploadCustomFont(file);
    settingsStore.selectCustomFont(font.id);
    toastr.success(`已导入并使用字体：${font.name}`);
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '导入字体失败');
  }
}

async function resetCurrentTheme() {
  const confirmed = await phone.confirmNotice(
    `恢复${settings.value.theme === 'light' ? '日间' : '夜间'}方案的默认外观吗？`,
    {
      confirmLabel: '恢复默认',
      title: '恢复主题',
    },
  );
  if (!confirmed) return;
  settingsStore.resetVisualTheme();
  settingsStore.resetFontFamily();
  settingsStore.setReaderFontFamily('');
  toastr.success('已恢复当前方案默认值');
}

function exportTheme() {
  const payload = {
    version: 3,
    theme: settings.value.theme,
    fontFamily: settings.value.fontFamily,
    readerFontFamily: settings.value.reader.fontFamily,
    visualTheme: settings.value.visualTheme,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sillytavern-phone-${settings.value.theme}-theme-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function normalizeImportedVisualTheme(input: unknown): VisualTheme | null {
  if (!input || typeof input !== 'object') return null;
  const parsed = VisualThemeSettingsSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function readIconPack(input: unknown) {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const source =
    record.appIconOverrides ??
    record.icons ??
    (record.visualTheme && typeof record.visualTheme === 'object'
      ? (record.visualTheme as Record<string, unknown>).appIconOverrides
      : null);
  if (!source || typeof source !== 'object') return null;
  const overrides: Record<string, string> = {};
  Object.entries(source as Record<string, unknown>).forEach(([appId, icon]) => {
    if (typeof icon === 'string' && appId.trim() && icon.trim()) overrides[appId.trim()] = icon.trim();
  });
  return Object.keys(overrides).length ? overrides : null;
}

async function onIconPackSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const overrides = readIconPack(JSON.parse(await file.text()));
    if (!overrides) throw new Error('图标文件格式不正确');
    settings.value.visualTheme.appIconOverrides = { ...settings.value.visualTheme.appIconOverrides, ...overrides };
    toastr.success(`已导入 ${Object.keys(overrides).length} 个图标`);
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '导入图标失败');
  }
}

async function onThemeSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as {
      fontFamily?: unknown;
      readerFontFamily?: unknown;
      visualTheme?: unknown;
    };
    const visualTheme = normalizeImportedVisualTheme(parsed.visualTheme);
    if (!visualTheme) throw new Error('主题文件格式不正确');
    settings.value.visualTheme = visualTheme;
    if (typeof parsed.fontFamily === 'string') settingsStore.setFontFamily(parsed.fontFamily);
    if (typeof parsed.readerFontFamily === 'string') settingsStore.setReaderFontFamily(parsed.readerFontFamily);
    toastr.success(`已导入到${settings.value.theme === 'light' ? '日间' : '夜间'}方案`);
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '导入主题失败');
  }
}
</script>

<style scoped>
.pc-theme-app {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-bottom: 8px;
}

.pc-theme-mode {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
  margin-bottom: 14px;
}

.pc-theme-mode .pc-segment-btn {
  min-width: 0;
}

.pc-theme-preview {
  display: grid;
  min-height: 210px;
  align-content: space-between;
  gap: 14px;
  overflow: hidden;
  padding: 18px;
  border: 1px solid var(--pc-border);
  border-radius: max(8px, calc(var(--pc-card-radius) - 6px));
  background-position: center;
  background-size: cover;
}

.pc-preview-status,
.pc-preview-copy {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.pc-preview-status strong {
  font-size: 28px;
}

.pc-preview-icons {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.pc-app-grid-item > span,
.pc-selected-app-head > span {
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  border-radius: var(--pc-icon-radius);
  background: var(--preview-app-bg);
  color: var(--preview-app-accent);
}

.pc-preview-app-icon {
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  border-radius: var(--pc-icon-radius);
}

.pc-theme-packs {
  display: grid;
  gap: 10px;
}

.pc-theme-pack-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pc-theme-pack-btn {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 7px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-theme-pack-btn.active {
  border-color: var(--pc-theme-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pc-theme-accent) 16%, transparent);
}

.pc-theme-pack-sample {
  position: relative;
  display: block;
  height: 46px;
  overflow: hidden;
  border-radius: max(8px, calc(var(--pc-control-radius) - 5px));
  background: linear-gradient(135deg, var(--pack-light) 0 50%, var(--pack-dark) 50% 100%);
}

.pc-theme-pack-sample i,
.pc-theme-pack-sample b,
.pc-theme-pack-sample em {
  position: absolute;
  display: block;
  border-radius: 6px;
}

.pc-theme-pack-sample i {
  top: 9px;
  left: 8px;
  width: 28px;
  height: 13px;
  background: var(--pack-surface);
}

.pc-theme-pack-sample b {
  right: 8px;
  bottom: 8px;
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.88);
}

.pc-theme-pack-sample em {
  bottom: 9px;
  left: 8px;
  width: 20px;
  height: 9px;
  background: rgba(255, 255, 255, 0.38);
}

.pc-theme-pack-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-theme-pack-copy strong,
.pc-theme-pack-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-theme-pack-copy strong {
  font-size: 13px;
}

.pc-theme-pack-copy small {
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-icon-style-option,
.pc-app-grid-item {
  min-width: 0;
  border: 1px solid var(--pc-border);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
}

.pc-icon-style-option.active,
.pc-app-grid-item.active {
  border-color: var(--pc-theme-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pc-theme-accent) 16%, transparent);
}

.pc-theme-entry {
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  text-align: left;
  color: var(--pc-text);
  cursor: pointer;
}

.pc-entry-icon-stack {
  display: grid;
  grid-template-columns: repeat(2, 24px);
  gap: 4px;
}

.pc-entry-icon-stack > span {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: max(6px, calc(var(--pc-icon-radius) - 4px));
  background: var(--preview-app-bg);
  color: var(--preview-app-accent);
}

.pc-entry-icon-stack :is(i, svg) {
  width: 12px;
  height: 12px;
  font-size: 11px;
}

.pc-entry-symbol {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: var(--pc-icon-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface-strong) 86%);
  color: var(--pc-theme-accent);
}

.pc-entry-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pc-entry-copy small,
.pc-theme-subhead span,
.pc-selected-app-head small,
.pc-color-row small,
.pc-control-row p {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-icon-pack-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-icon-pack-btn {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-icon-pack-btn.active {
  border-color: var(--pc-theme-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pc-theme-accent) 16%, transparent);
}

.pc-icon-pack-preview {
  display: grid;
  grid-template-columns: repeat(3, 16px);
  gap: 3px;
}

.pc-icon-pack-preview :is(i, svg) {
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 5px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
  font-size: 8px;
}

.pc-icon-pack-btn > span:last-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.pc-icon-pack-btn strong,
.pc-icon-pack-btn small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-icon-pack-btn small {
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-entry-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-entry-chevron {
  color: var(--pc-muted);
}

.pc-theme-subhead {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pc-theme-subhead > div {
  display: grid;
  gap: 3px;
}

.pc-icon-style-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-icon-style-option {
  display: grid;
  gap: 8px;
  padding: 10px 6px;
  border-radius: var(--pc-control-radius);
}

.pc-style-icons {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.pc-style-icons :is(i, svg) {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--pc-theme-accent) 15%, var(--pc-surface) 85%);
  color: var(--pc-theme-accent);
  font-size: 11px;
}

.pc-style-icons.style-native :is(i, svg):nth-child(2) {
  color: #34a853;
}
.pc-style-icons.style-native :is(i, svg):nth-child(3) {
  color: #ef476f;
}
.pc-style-icons.style-unified :is(i, svg) {
  background: var(--pc-theme-accent);
  color: var(--pc-primary-text);
}

.pc-app-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.pc-app-grid-item {
  display: grid;
  gap: 5px;
  justify-items: center;
  padding: 7px 4px;
  border-radius: var(--pc-control-radius);
}

.pc-app-grid-item > span {
  width: 34px;
}

.pc-app-grid-item small {
  width: 100%;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-selected-icon-editor {
  display: grid;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--pc-border);
}

.pc-selected-app-head {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.pc-selected-app-head > div {
  display: grid;
  gap: 3px;
}

.pc-icon-picker {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
}

.pc-icon-choice {
  display: grid;
  aspect-ratio: 1;
  min-width: 0;
  place-items: center;
  border: 1px solid var(--pc-border);
  border-radius: max(8px, calc(var(--pc-icon-radius) - 3px));
  background: var(--pc-surface-strong);
  color: var(--pc-muted);
  cursor: pointer;
}

.pc-icon-choice.active {
  border-color: var(--pc-theme-accent);
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface-strong) 84%);
  color: var(--pc-theme-accent);
}

.pc-color-row,
.pc-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
}

.pc-color-row + .pc-color-row,
.pc-control-row + .pc-control-row {
  border-top: 1px solid var(--pc-border);
}

.pc-color-row > span,
.pc-control-row > div {
  display: grid;
  gap: 3px;
}

.pc-color-row small,
.pc-control-row p {
  margin: 0;
}

.pc-color-row input[type='color'],
.pc-color-input {
  width: 42px;
  height: 34px;
  border: 0;
  background: transparent;
}

.pc-control-row input[type='range'] {
  width: min(180px, 52%);
}

.pc-select-field {
  display: grid;
  gap: 8px;
}

.pc-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 380px) {
  .pc-preview-icons {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .pc-preview-icons > :last-child {
    display: none;
  }
  .pc-app-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .pc-icon-picker {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}
</style>
