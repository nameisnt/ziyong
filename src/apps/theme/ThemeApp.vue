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
          <span>{{ settings.theme === 'light' ? t`日间方案` : t`夜间方案` }}</span>
        </div>
        <div class="pc-preview-copy">
          <strong>{{ t`主题预览` }}</strong>
          <span>{{ activePresetLabel }}</span>
        </div>
        <div class="pc-preview-icons">
          <span
            v-for="app in previewApps"
            :key="app.id"
            class="pc-preview-app-icon"
            :style="getAppPreviewStyle(app)"
            :title="app.name"
          >
            <i class="fa-solid" :class="getAppIcon(app)"></i>
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

      <section class="pc-theme-presets pc-page-section">
        <div class="pc-section-head">
          <strong>{{ t`单个方案` }}</strong>
        </div>
        <div class="pc-preset-grid">
          <button
            v-for="preset in visibleThemePresets"
            :key="preset.id"
            :class="['pc-preset-btn', { active: activePresetLabel === preset.name }]"
            type="button"
            :style="{
              '--preview-accent': preset.accentColor,
              '--preview-bg': preset.backgroundColor,
              '--preview-surface': preset.surfaceColor,
            }"
            @click="applyPreset(preset)"
          >
            <span class="pc-preset-sample">
              <i></i>
              <b></b>
            </span>
            <strong>{{ preset.name }}</strong>
          </button>
        </div>
      </section>

      <button class="pc-list-row pc-theme-entry" type="button" @click="openView('icons')">
        <span class="pc-entry-icon-stack" aria-hidden="true">
          <i
            v-for="app in previewApps.slice(0, 4)"
            :key="app.id"
            class="fa-solid"
            :class="getAppIcon(app)"
            :style="getAppPreviewStyle(app)"
          ></i>
        </span>
        <span class="pc-entry-copy">
          <strong>{{ t`图标风格` }}</strong>
          <small
            >{{ iconStyleLabel }} · {{ customizedAppCount ? `${customizedAppCount} 个单独调整` : t`整套设置` }}</small
          >
        </span>
        <i class="fa-solid fa-chevron-right pc-entry-chevron"></i>
      </button>

      <button class="pc-list-row pc-theme-entry" type="button" @click="openView('advanced')">
        <span class="pc-entry-symbol"><i class="fa-solid fa-sliders"></i></span>
        <span class="pc-entry-copy">
          <strong>{{ t`高级外观` }}</strong>
          <small>{{ appearanceSummary }}</small>
        </span>
        <i class="fa-solid fa-chevron-right pc-entry-chevron"></i>
      </button>
    </template>

    <template v-else-if="view === 'icons'">
      <div class="pc-theme-subhead">
        <button class="pc-icon-btn" type="button" :title="t`返回`" @click="view = 'root'">
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
              <i v-for="icon in pack.previewIcons" :key="icon" class="fa-solid" :class="icon"></i>
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
              <i class="fa-solid fa-book"></i>
              <i class="fa-solid fa-comments"></i>
              <i class="fa-solid fa-image"></i>
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
            <span :style="getAppPreviewStyle(app)"><i class="fa-solid" :class="getAppIcon(app)"></i></span>
            <small>{{ app.name }}</small>
          </button>
        </div>

        <div v-if="selectedApp" class="pc-selected-icon-editor">
          <div class="pc-selected-app-head">
            <span :style="getAppPreviewStyle(selectedApp)"
              ><i class="fa-solid" :class="getAppIcon(selectedApp)"></i
            ></span>
            <div>
              <strong>{{ selectedApp.name }}</strong>
              <small>{{ t`只修改这个 App` }}</small>
            </div>
            <button class="pc-icon-btn" type="button" :title="t`清除覆盖`" @click="clearAppOverride(selectedApp.id)">
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
              <i class="fa-solid" :class="icon"></i>
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
        <button class="pc-icon-btn" type="button" :title="t`返回`" @click="view = 'root'">
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
          <strong>{{ t`字体与背景` }}</strong>
          <button class="pc-icon-btn" type="button" :title="t`导入字体`" @click="fontInputEl?.click()">
            <i class="fa-solid fa-file-import"></i>
          </button>
        </div>
        <label class="pc-select-field">
          <span class="pc-field-label">{{ t`壁纸` }}</span>
          <select :value="wallpaperSelectionValue" class="pc-select" @change="onWallpaperSelect">
            <option value="none">{{ t`默认背景` }}</option>
            <optgroup :label="t`预设壁纸`">
              <option v-for="preset in WALLPAPER_PRESETS" :key="preset.id" :value="`preset:${preset.id}`">
                {{ preset.name }}
              </option>
            </optgroup>
            <optgroup v-if="settings.wallpaper.customWallpapers.length" :label="t`自定义壁纸`">
              <option
                v-for="wallpaper in settings.wallpaper.customWallpapers"
                :key="wallpaper.id"
                :value="`custom:${wallpaper.id}`"
              >
                {{ wallpaper.name }}
              </option>
            </optgroup>
          </select>
        </label>
        <label class="pc-select-field">
          <span class="pc-field-label">{{ t`手机字体` }}</span>
          <select :value="fontSelectionValue" class="pc-select" @change="onFontSelect">
            <option v-for="option in fontOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            <optgroup v-if="settings.customFont.fonts.length" :label="t`自定义字体`">
              <option v-for="font in settings.customFont.fonts" :key="font.id" :value="`custom:${font.id}`">
                {{ font.name }}
              </option>
            </optgroup>
          </select>
        </label>
        <label class="pc-select-field">
          <span class="pc-field-label">{{ t`阅读器字体` }}</span>
          <select :value="readerFontSelectionValue" class="pc-select" @change="onReaderFontSelect">
            <option value="">{{ t`跟随手机字体` }}</option>
            <option v-for="option in fontOptions.filter(item => item.value)" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
            <optgroup v-if="settings.customFont.fonts.length" :label="t`自定义字体`">
              <option v-for="font in settings.customFont.fonts" :key="font.id" :value="`custom:${font.id}`">
                {{ font.name }}
              </option>
            </optgroup>
          </select>
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
import { getPhoneApps, type PhoneAppDefinition } from '@/data/apps';
import { WALLPAPER_PRESETS, getWallpaperPreset } from '@/data/wallpapers';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { VisualThemeSettingsSchema, type Settings, type ThemeAppearanceProfile } from '@/type/settings';
import { storeToRefs } from 'pinia';

type ThemeView = 'root' | 'icons' | 'advanced';
type VisualTheme = Settings['visualTheme'];
type RadiusKey = 'cardRadius' | 'controlRadius' | 'iconRadius';
type ColorKey = keyof Pick<
  VisualTheme,
  | 'accentColor'
  | 'appIconBackgroundColor'
  | 'appIconColor'
  | 'backgroundColor'
  | 'dockColor'
  | 'readerTextColor'
  | 'surfaceColor'
>;
type IconStyleId = 'native' | 'soft' | 'unified';

interface ThemePreset extends Omit<VisualTheme, 'appAccentOverrides' | 'appIconOverrides' | 'readerTextColor'> {
  id: string;
  mode: Settings['theme'];
  name: string;
  readerTextColor?: string;
}

interface ThemePack {
  dark: ThemePreset;
  description: string;
  iconStyle: IconStyleId;
  id: string;
  light: ThemePreset;
  name: string;
}

interface BuiltinIconPack {
  description: string;
  icons: Record<string, string>;
  id: string;
  name: string;
  previewIcons: string[];
}

const themePresets: ThemePreset[] = [
  {
    id: 'clear',
    name: '清透',
    mode: 'light',
    accentColor: '#007aff',
    appIconBackgroundColor: '#ffffff',
    appIconColor: '',
    backgroundColor: '#f2f2f7',
    borderColor: 'rgba(28, 28, 30, 0.08)',
    cardRadius: 20,
    controlRadius: 16,
    dangerColor: '#ff5a5f',
    dockActiveColor: '#007aff',
    dockColor: 'rgba(255, 255, 255, 0.82)',
    hintColor: '#2d9cdb',
    iconRadius: 14,
    mutedTextColor: '#6d6d74',
    primaryTextColor: '#ffffff',
    softButtonColor: 'rgba(255, 255, 255, 0.96)',
    surfaceColor: 'rgba(255, 255, 255, 0.82)',
    surfaceStrongColor: 'rgba(255, 255, 255, 0.96)',
    textColor: '#1c1c1e',
  },
  {
    id: 'soft',
    name: '柔和',
    mode: 'light',
    accentColor: '#ef476f',
    appIconBackgroundColor: '#fff8fa',
    appIconColor: '',
    backgroundColor: '#fff1f5',
    borderColor: 'rgba(160, 45, 78, 0.12)',
    cardRadius: 22,
    controlRadius: 18,
    dangerColor: '#e0314f',
    dockActiveColor: '#ef476f',
    dockColor: 'rgba(255, 246, 249, 0.86)',
    hintColor: '#b846d6',
    iconRadius: 16,
    mutedTextColor: '#7d5964',
    primaryTextColor: '#ffffff',
    softButtonColor: 'rgba(255, 248, 250, 0.98)',
    surfaceColor: 'rgba(255, 249, 251, 0.84)',
    surfaceStrongColor: 'rgba(255, 255, 255, 0.98)',
    textColor: '#2b171d',
  },
  {
    id: 'mint',
    name: '薄荷',
    mode: 'light',
    accentColor: '#2a9d8f',
    appIconBackgroundColor: '#f8fffd',
    appIconColor: '',
    backgroundColor: '#edf8f5',
    borderColor: 'rgba(28, 102, 94, 0.13)',
    cardRadius: 18,
    controlRadius: 14,
    dangerColor: '#d94f62',
    dockActiveColor: '#2a9d8f',
    dockColor: 'rgba(246, 255, 252, 0.86)',
    hintColor: '#268bd2',
    iconRadius: 12,
    mutedTextColor: '#526b68',
    primaryTextColor: '#ffffff',
    softButtonColor: 'rgba(248, 255, 253, 0.98)',
    surfaceColor: 'rgba(248, 255, 253, 0.84)',
    surfaceStrongColor: 'rgba(255, 255, 255, 0.98)',
    textColor: '#142421',
  },
  {
    id: 'midnight',
    name: '午夜',
    mode: 'dark',
    accentColor: '#a78bfa',
    appIconBackgroundColor: 'rgba(255, 255, 255, 0.12)',
    appIconColor: '',
    backgroundColor: '#17151d',
    borderColor: 'rgba(237, 233, 254, 0.12)',
    cardRadius: 20,
    controlRadius: 16,
    dangerColor: '#ff6b81',
    dockActiveColor: '#c4b5fd',
    dockColor: 'rgba(38, 34, 48, 0.84)',
    hintColor: '#67d4ff',
    iconRadius: 14,
    mutedTextColor: '#b8b1c4',
    primaryTextColor: '#17151d',
    softButtonColor: 'rgba(255, 255, 255, 0.12)',
    surfaceColor: 'rgba(255, 255, 255, 0.07)',
    surfaceStrongColor: 'rgba(255, 255, 255, 0.12)',
    textColor: '#f7f5fa',
  },
  {
    id: 'ocean',
    name: '深海',
    mode: 'dark',
    accentColor: '#38bdf8',
    appIconBackgroundColor: 'rgba(56, 189, 248, 0.12)',
    appIconColor: '',
    backgroundColor: '#071923',
    borderColor: 'rgba(186, 230, 253, 0.12)',
    cardRadius: 18,
    controlRadius: 14,
    dangerColor: '#fb7185',
    dockActiveColor: '#38bdf8',
    dockColor: 'rgba(12, 39, 52, 0.88)',
    hintColor: '#22d3ee',
    iconRadius: 12,
    mutedTextColor: '#9fb8c4',
    primaryTextColor: '#06202d',
    softButtonColor: 'rgba(186, 230, 253, 0.11)',
    surfaceColor: 'rgba(186, 230, 253, 0.07)',
    surfaceStrongColor: 'rgba(186, 230, 253, 0.11)',
    textColor: '#edfaff',
  },
  {
    id: 'graphite',
    name: '石墨',
    mode: 'dark',
    accentColor: '#f5b942',
    appIconBackgroundColor: 'rgba(255, 255, 255, 0.11)',
    appIconColor: '',
    backgroundColor: '#18191b',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    cardRadius: 16,
    controlRadius: 12,
    dangerColor: '#ff6b6b',
    dockActiveColor: '#f5b942',
    dockColor: 'rgba(38, 39, 42, 0.9)',
    hintColor: '#66c7f2',
    iconRadius: 10,
    mutedTextColor: '#a9aaad',
    primaryTextColor: '#1a1b1d',
    softButtonColor: 'rgba(255, 255, 255, 0.1)',
    surfaceColor: 'rgba(255, 255, 255, 0.06)',
    surfaceStrongColor: 'rgba(255, 255, 255, 0.1)',
    textColor: '#f5f5f5',
  },
  {
    id: 'velvet',
    name: '绒夜',
    mode: 'dark',
    accentColor: '#f472b6',
    appIconBackgroundColor: 'rgba(255, 255, 255, 0.1)',
    appIconColor: '',
    backgroundColor: '#25131f',
    borderColor: 'rgba(253, 242, 248, 0.12)',
    cardRadius: 22,
    controlRadius: 18,
    dangerColor: '#fb7185',
    dockActiveColor: '#f9a8d4',
    dockColor: 'rgba(65, 29, 49, 0.88)',
    hintColor: '#c084fc',
    iconRadius: 16,
    mutedTextColor: '#d0aebb',
    primaryTextColor: '#2a1321',
    softButtonColor: 'rgba(255, 255, 255, 0.11)',
    surfaceColor: 'rgba(255, 255, 255, 0.07)',
    surfaceStrongColor: 'rgba(255, 255, 255, 0.11)',
    textColor: '#fff4f8',
  },
  {
    id: 'cypress',
    name: '青岚',
    mode: 'dark',
    accentColor: '#34d399',
    appIconBackgroundColor: 'rgba(209, 250, 229, 0.11)',
    appIconColor: '',
    backgroundColor: '#10241f',
    borderColor: 'rgba(209, 250, 229, 0.12)',
    cardRadius: 18,
    controlRadius: 14,
    dangerColor: '#fb7185',
    dockActiveColor: '#6ee7b7',
    dockColor: 'rgba(19, 55, 45, 0.88)',
    hintColor: '#67e8f9',
    iconRadius: 12,
    mutedTextColor: '#a7c6bb',
    primaryTextColor: '#102820',
    softButtonColor: 'rgba(209, 250, 229, 0.11)',
    surfaceColor: 'rgba(209, 250, 229, 0.07)',
    surfaceStrongColor: 'rgba(209, 250, 229, 0.11)',
    textColor: '#effff8',
  },
  {
    id: 'sky',
    name: '晴空',
    mode: 'light',
    accentColor: '#0284c7',
    appIconBackgroundColor: '#f7fcff',
    appIconColor: '',
    backgroundColor: '#eaf6ff',
    borderColor: 'rgba(2, 132, 199, 0.12)',
    cardRadius: 18,
    controlRadius: 14,
    dangerColor: '#e4546f',
    dockActiveColor: '#0284c7',
    dockColor: 'rgba(248, 253, 255, 0.88)',
    hintColor: '#0ea5e9',
    iconRadius: 12,
    mutedTextColor: '#577181',
    primaryTextColor: '#ffffff',
    softButtonColor: 'rgba(248, 253, 255, 0.98)',
    surfaceColor: 'rgba(248, 253, 255, 0.84)',
    surfaceStrongColor: 'rgba(255, 255, 255, 0.98)',
    textColor: '#102634',
  },
];

const themePresetById = new Map(themePresets.map(preset => [preset.id, preset]));
const getThemePreset = (id: string) => themePresetById.get(id)!;
const themePacks: ThemePack[] = [
  {
    id: 'clear-night',
    name: '清透晨昏',
    description: '蓝调日间，柔和紫夜',
    iconStyle: 'soft',
    light: getThemePreset('clear'),
    dark: getThemePreset('midnight'),
  },
  {
    id: 'rose-velvet',
    name: '蔷薇绒夜',
    description: '明亮玫粉，低饱和夜色',
    iconStyle: 'soft',
    light: getThemePreset('soft'),
    dark: getThemePreset('velvet'),
  },
  {
    id: 'mint-cypress',
    name: '薄荷青岚',
    description: '清新薄荷，深绿夜读',
    iconStyle: 'unified',
    light: getThemePreset('mint'),
    dark: getThemePreset('cypress'),
  },
  {
    id: 'sky-ocean',
    name: '晴空深海',
    description: '轻快天蓝，沉静海蓝',
    iconStyle: 'unified',
    light: getThemePreset('sky'),
    dark: getThemePreset('ocean'),
  },
];

const settingsStore = useSettingsStore();
const phone = usePhoneStore();
const { settings } = storeToRefs(settingsStore);
const view = ref<ThemeView>('root');
const selectedAppId = ref('');
const themeInputEl = ref<HTMLInputElement | null>(null);
const iconInputEl = ref<HTMLInputElement | null>(null);
const fontInputEl = ref<HTMLInputElement | null>(null);

const fontOptions = [
  { label: '系统默认', value: '' },
  { label: '苹方 / 系统黑体', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { label: '思源黑体', value: '"Noto Sans SC", sans-serif' },
  { label: '宋体', value: 'SimSun, "Songti SC", serif' },
  { label: '楷体', value: 'KaiTi, "Kaiti SC", serif' },
];
const iconOptions = [
  'fa-note-sticky',
  'fa-book',
  'fa-feather-pointed',
  'fa-comments',
  'fa-masks-theater',
  'fa-envelope-open-text',
  'fa-bookmark',
  'fa-wand-magic-sparkles',
  'fa-chart-column',
  'fa-folder-open',
  'fa-glasses',
  'fa-sliders',
  'fa-diagram-project',
  'fa-address-card',
  'fa-code',
  'fa-image',
  'fa-photo-film',
  'fa-highlighter',
  'fa-clock',
  'fa-calendar-days',
  'fa-heart',
  'fa-star',
  'fa-user',
  'fa-users',
  'fa-house',
  'fa-pen',
  'fa-scroll',
  'fa-music',
  'fa-video',
  'fa-camera-retro',
  'fa-plus',
  'fa-palette',
];
const iconStyleOptions: { id: IconStyleId; name: string }[] = [
  { id: 'native', name: '跟随 App' },
  { id: 'soft', name: '柔和底色' },
  { id: 'unified', name: '统一色' },
];
const builtinIconPacks: BuiltinIconPack[] = [
  {
    id: 'native',
    name: '原生',
    description: '恢复每个 App 的默认图标',
    icons: {},
    previewIcons: ['fa-house', 'fa-book', 'fa-sliders'],
  },
  {
    id: 'writing',
    name: '书写',
    description: '笔记、书页与阅读',
    icons: {
      archive: 'fa-folder-open',
      bagu: 'fa-highlighter',
      'chat-insert': 'fa-pen',
      comfy: 'fa-image',
      diary: 'fa-book',
      digest: 'fa-note-sticky',
      extras: 'fa-feather-pointed',
      favorites: 'fa-bookmark',
      forum: 'fa-comments',
      gallery: 'fa-photo-film',
      games: 'fa-masks-theater',
      letters: 'fa-envelope-open-text',
      media: 'fa-image',
      music: 'fa-music',
      'preset-manager': 'fa-wand-magic-sparkles',
      profiles: 'fa-address-card',
      prompts: 'fa-quote-left',
      reader: 'fa-glasses',
      'regex-display': 'fa-highlighter',
      relationship: 'fa-users',
      'scene-planner': 'fa-pen',
      settings: 'fa-sliders',
      storylines: 'fa-book-open',
      stats: 'fa-chart-column',
      summary: 'fa-note-sticky',
      theater: 'fa-masks-theater',
      theme: 'fa-palette',
      timekeeper: 'fa-clock',
      tutorial: 'fa-book-open',
      video: 'fa-video',
      workbench: 'fa-pen',
      'world-slots': 'fa-book',
      'worldbook-link': 'fa-book-open-reader',
    },
    previewIcons: ['fa-feather-pointed', 'fa-book-open', 'fa-pen'],
  },
  {
    id: 'workspace',
    name: '工作台',
    description: '结构、分析与管理',
    icons: {
      archive: 'fa-folder-open',
      bagu: 'fa-filter-circle-xmark',
      'chat-insert': 'fa-plus',
      comfy: 'fa-image',
      diary: 'fa-calendar-days',
      digest: 'fa-highlighter',
      extras: 'fa-file-pen',
      favorites: 'fa-star',
      forum: 'fa-table-columns',
      gallery: 'fa-images',
      games: 'fa-gamepad',
      letters: 'fa-inbox',
      media: 'fa-photo-film',
      music: 'fa-music',
      'preset-manager': 'fa-sliders',
      profiles: 'fa-address-card',
      prompts: 'fa-wand-magic-sparkles',
      reader: 'fa-list',
      'regex-display': 'fa-code',
      relationship: 'fa-users',
      'scene-planner': 'fa-diagram-project',
      settings: 'fa-gear',
      storylines: 'fa-list-check',
      stats: 'fa-chart-line',
      summary: 'fa-list-check',
      theater: 'fa-clapperboard',
      theme: 'fa-palette',
      timekeeper: 'fa-calendar-days',
      tutorial: 'fa-circle-question',
      video: 'fa-video',
      workbench: 'fa-table-columns',
      'world-slots': 'fa-table-cells-large',
      'worldbook-link': 'fa-book-open-reader',
    },
    previewIcons: ['fa-table-columns', 'fa-chart-line', 'fa-diagram-project'],
  },
  {
    id: 'media',
    name: '影像',
    description: '镜头、声音与舞台',
    icons: {
      archive: 'fa-box-archive',
      bagu: 'fa-wand-magic-sparkles',
      'chat-insert': 'fa-comment-dots',
      comfy: 'fa-camera-retro',
      diary: 'fa-book-open',
      digest: 'fa-bookmark',
      extras: 'fa-scroll',
      favorites: 'fa-heart',
      forum: 'fa-comment-dots',
      gallery: 'fa-images',
      games: 'fa-gamepad',
      letters: 'fa-envelope',
      media: 'fa-film',
      music: 'fa-headphones',
      'preset-manager': 'fa-sliders',
      profiles: 'fa-user',
      prompts: 'fa-wand-magic-sparkles',
      reader: 'fa-glasses',
      'regex-display': 'fa-code',
      relationship: 'fa-users',
      'scene-planner': 'fa-clapperboard',
      settings: 'fa-gear',
      storylines: 'fa-film',
      stats: 'fa-chart-column',
      summary: 'fa-note-sticky',
      theater: 'fa-masks-theater',
      theme: 'fa-palette',
      timekeeper: 'fa-clock',
      tutorial: 'fa-circle-play',
      video: 'fa-video',
      workbench: 'fa-photo-film',
      'world-slots': 'fa-images',
      'worldbook-link': 'fa-book-open-reader',
    },
    previewIcons: ['fa-camera-retro', 'fa-headphones', 'fa-clapperboard'],
  },
];
const colorControls: { key: ColorKey; label: string }[] = [
  { key: 'accentColor', label: '强调色' },
  { key: 'backgroundColor', label: '手机背景' },
  { key: 'surfaceColor', label: '卡片背景' },
  { key: 'readerTextColor', label: '阅读正文' },
  { key: 'appIconColor', label: '图标颜色' },
  { key: 'appIconBackgroundColor', label: '图标背景' },
  { key: 'dockColor', label: 'Dock 背景' },
];
const radiusControls: { key: RadiusKey; label: string; min: number; max: number }[] = [
  { key: 'cardRadius', label: '卡片圆角', min: 8, max: 32 },
  { key: 'controlRadius', label: '控件圆角', min: 8, max: 28 },
  { key: 'iconRadius', label: '图标圆角', min: 8, max: 24 },
];

const visibleApps = computed(() => getPhoneApps().filter(app => app.id !== 'home'));
const previewApps = computed(() => visibleApps.value.slice(0, 6));
const selectedApp = computed(() => visibleApps.value.find(app => app.id === selectedAppId.value) ?? null);
const visibleThemePresets = computed(() => themePresets.filter(preset => preset.mode === settings.value.theme));
const customizedAppCount = computed(
  () =>
    new Set([
      ...Object.keys(settings.value.visualTheme.appIconOverrides),
      ...Object.keys(settings.value.visualTheme.appAccentOverrides),
    ]).size,
);
const selectedCustomFont = computed(
  () =>
    settings.value.customFont.fonts.find(
      item => settings.value.fontFamily === settingsStore.getCustomFontFamily(item.id),
    ) ?? null,
);
const readerSelectedCustomFont = computed(
  () =>
    settings.value.customFont.fonts.find(
      item => settings.value.reader.fontFamily === settingsStore.getCustomFontFamily(item.id),
    ) ?? null,
);
const fontSelectionValue = computed(() =>
  selectedCustomFont.value ? `custom:${selectedCustomFont.value.id}` : settings.value.fontFamily,
);
const readerFontSelectionValue = computed(() =>
  readerSelectedCustomFont.value ? `custom:${readerSelectedCustomFont.value.id}` : settings.value.reader.fontFamily,
);
const selectedCustomWallpaper = computed(() => {
  if (settings.value.wallpaper.mode !== 'custom') return null;
  return (
    settings.value.wallpaper.customWallpapers.find(item => item.id === settings.value.wallpaper.selectedCustomId) ??
    settings.value.wallpaper.customWallpapers.find(item => item.path === settings.value.wallpaper.customPath) ??
    null
  );
});
const wallpaperSelectionValue = computed(() => {
  if (settings.value.wallpaper.mode === 'preset') return `preset:${settings.value.wallpaper.presetId}`;
  if (settings.value.wallpaper.mode === 'custom')
    return `custom:${selectedCustomWallpaper.value?.id || settings.value.wallpaper.selectedCustomId}`;
  return 'none';
});
const activePresetLabel = computed(() => {
  const matched = visibleThemePresets.value.find(
    preset =>
      preset.accentColor.toLowerCase() === settings.value.visualTheme.accentColor.toLowerCase() &&
      preset.backgroundColor.toLowerCase() === settings.value.visualTheme.backgroundColor.toLowerCase() &&
      preset.surfaceColor.toLowerCase() === settings.value.visualTheme.surfaceColor.toLowerCase() &&
      preset.cardRadius === settings.value.visualTheme.cardRadius &&
      preset.controlRadius === settings.value.visualTheme.controlRadius &&
      preset.iconRadius === settings.value.visualTheme.iconRadius,
  );
  return matched?.name || '自定义';
});
const iconStyleId = computed<IconStyleId>(() => {
  if (settings.value.visualTheme.appIconColor) return 'unified';
  if (settings.value.visualTheme.appIconBackgroundColor) return 'soft';
  return 'native';
});
const iconStyleLabel = computed(() => iconStyleOptions.find(item => item.id === iconStyleId.value)?.name || '跟随 App');
const appearanceSummary = computed(() => {
  const wallpaper =
    settings.value.wallpaper.mode === 'preset'
      ? getWallpaperPreset(settings.value.wallpaper.presetId)?.name || '预设壁纸'
      : settings.value.wallpaper.mode === 'custom'
        ? selectedCustomWallpaper.value?.name || '自定义壁纸'
        : '默认背景';
  const font =
    fontOptions.find(item => item.value === settings.value.fontFamily)?.label ||
    selectedCustomFont.value?.name ||
    '自定义字体';
  return `${wallpaper} · ${font}`;
});
const previewStyle = computed(() => {
  const wallpaper =
    settings.value.wallpaper.mode === 'preset' ? getWallpaperPreset(settings.value.wallpaper.presetId)?.background : '';
  const customPath = selectedCustomWallpaper.value?.path || settings.value.wallpaper.customPath;
  const backgroundImage =
    settings.value.wallpaper.mode === 'custom' && customPath
      ? `url("/${encodeURI(customPath.replace(/^\/+/, ''))}")`
      : wallpaper || 'none';
  return {
    backgroundColor:
      settings.value.visualTheme.backgroundColor || (settings.value.theme === 'dark' ? '#1c1c1e' : '#f2f2f7'),
    backgroundImage,
    color: settings.value.visualTheme.textColor || (settings.value.theme === 'dark' ? '#f5f5f7' : '#1c1c1e'),
  };
});

function openView(nextView: Exclude<ThemeView, 'root'>) {
  selectedAppId.value = '';
  view.value = nextView;
}

function applyPreset(preset: ThemePreset) {
  const nextVisualTheme = normalizeImportedVisualTheme(preset);
  if (!nextVisualTheme) return;
  settings.value.visualTheme = {
    ...nextVisualTheme,
    appAccentOverrides: settings.value.visualTheme.appAccentOverrides,
    appIconOverrides: settings.value.visualTheme.appIconOverrides,
  };
  settings.value.floatBallColor = preset.accentColor;
  toastr.success(`已应用${settings.value.theme === 'light' ? '日间' : '夜间'}主题：${preset.name}`);
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
    wallpaperMode: 'none',
    wallpaperPresetId: 'aurora',
    wallpaperCustomId: '',
  };
}

function applyThemePackProfile(profile: ThemeAppearanceProfile) {
  settings.value.fontFamily = profile.fontFamily;
  settings.value.reader.fontFamily = profile.readerFontFamily;
  settings.value.visualTheme = klona(profile.visualTheme);
  settings.value.wallpaper.mode = profile.wallpaperMode;
  settings.value.wallpaper.presetId = profile.wallpaperPresetId;
  settings.value.wallpaper.selectedCustomId = '';
  settings.value.wallpaper.customPath = '';
  settings.value.wallpaper.customName = '';
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

function getAppAccent(app: PhoneAppDefinition) {
  return settings.value.visualTheme.appAccentOverrides[app.id] || settings.value.visualTheme.appIconColor || app.accent;
}

function getAppPreviewStyle(app: PhoneAppDefinition) {
  const accent = getAppAccent(app);
  return {
    '--preview-app-accent': accent,
    '--preview-app-bg':
      settings.value.visualTheme.appIconBackgroundColor ||
      `color-mix(in srgb, ${accent} 18%, var(--pc-surface-strong) 82%)`,
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

function onFontSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value.startsWith('custom:')) settingsStore.selectCustomFont(value.slice('custom:'.length));
  else settingsStore.setFontFamily(value);
}

function onReaderFontSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value.startsWith('custom:'))
    settingsStore.setReaderFontFamily(settingsStore.getCustomFontFamily(value.slice('custom:'.length)));
  else settingsStore.setReaderFontFamily(value);
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

async function onWallpaperSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value === 'none') await settingsStore.clearWallpaperSelection();
  else if (value.startsWith('preset:')) await settingsStore.selectWallpaperPreset(value.slice('preset:'.length));
  else if (value.startsWith('custom:')) settingsStore.selectCustomWallpaper(value.slice('custom:'.length));
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
  await settingsStore.clearWallpaperSelection();
  toastr.success('已恢复当前方案默认值');
}

function exportTheme() {
  const payload = {
    version: 2,
    theme: settings.value.theme,
    fontFamily: settings.value.fontFamily,
    readerFontFamily: settings.value.reader.fontFamily,
    visualTheme: settings.value.visualTheme,
    wallpaper: {
      mode: settings.value.wallpaper.mode,
      presetId: settings.value.wallpaper.presetId,
      selectedCustomId: settings.value.wallpaper.selectedCustomId,
    },
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
      wallpaper?: { mode?: unknown; presetId?: unknown; selectedCustomId?: unknown };
    };
    const visualTheme = normalizeImportedVisualTheme(parsed.visualTheme);
    if (!visualTheme) throw new Error('主题文件格式不正确');
    settings.value.visualTheme = visualTheme;
    if (typeof parsed.fontFamily === 'string') settingsStore.setFontFamily(parsed.fontFamily);
    if (typeof parsed.readerFontFamily === 'string') settingsStore.setReaderFontFamily(parsed.readerFontFamily);
    if (parsed.wallpaper?.mode === 'none') await settingsStore.clearWallpaperSelection();
    else if (parsed.wallpaper?.mode === 'preset' && typeof parsed.wallpaper.presetId === 'string')
      await settingsStore.selectWallpaperPreset(parsed.wallpaper.presetId);
    else if (parsed.wallpaper?.mode === 'custom' && typeof parsed.wallpaper.selectedCustomId === 'string') {
      settingsStore.selectCustomWallpaper(parsed.wallpaper.selectedCustomId);
    }
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

.pc-preview-status span,
.pc-preview-copy span {
  font-size: 12px;
  font-weight: 800;
  opacity: 0.7;
}

.pc-preview-icons {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.pc-preview-app-icon,
.pc-app-grid-item > span,
.pc-selected-app-head > span {
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  border-radius: var(--pc-icon-radius);
  background: var(--preview-app-bg);
  color: var(--preview-app-accent);
}

.pc-theme-presets {
  display: grid;
  gap: 10px;
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
  grid-template-columns: 68px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px;
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
  height: 52px;
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

.pc-theme-pack-copy small {
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-preset-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.pc-preset-btn,
.pc-icon-style-option,
.pc-app-grid-item {
  min-width: 0;
  border: 1px solid var(--pc-border);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
}

.pc-preset-btn {
  display: grid;
  gap: 8px;
  padding: 8px;
  border-radius: var(--pc-control-radius);
}

.pc-preset-btn.active,
.pc-icon-style-option.active,
.pc-app-grid-item.active {
  border-color: var(--pc-theme-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pc-theme-accent) 16%, transparent);
}

.pc-preset-sample {
  position: relative;
  display: block;
  height: 52px;
  overflow: hidden;
  border-radius: max(8px, calc(var(--pc-control-radius) - 5px));
  background: var(--preview-bg);
}

.pc-preset-sample i,
.pc-preset-sample b {
  position: absolute;
  display: block;
  border-radius: 6px;
}

.pc-preset-sample i {
  inset: 10px 10px auto;
  height: 18px;
  background: var(--preview-surface);
}

.pc-preset-sample b {
  right: 10px;
  bottom: 8px;
  width: 18px;
  height: 18px;
  background: var(--preview-accent);
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

.pc-entry-icon-stack i {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: max(6px, calc(var(--pc-icon-radius) - 4px));
  background: var(--preview-app-bg);
  color: var(--preview-app-accent);
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

.pc-icon-pack-preview i {
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

.pc-style-icons i {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--pc-theme-accent) 15%, var(--pc-surface) 85%);
  color: var(--pc-theme-accent);
  font-size: 11px;
}

.pc-style-icons.style-native i:nth-child(2) {
  color: #34a853;
}
.pc-style-icons.style-native i:nth-child(3) {
  color: #ef476f;
}
.pc-style-icons.style-unified i {
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
