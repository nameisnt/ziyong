<template>
  <div
    v-show="isOpen"
    id="tavern-phone-root"
    class="pc-phone-root"
    :data-home-columns="settings.interfaceSize.homeColumns"
    :data-reader-blank-lines="settings.reader.blankLineBetweenLines ? 'true' : 'false'"
    :data-reader-indent="settings.reader.firstLineIndent ? 'true' : 'false'"
    :data-theme="settings.theme"
    :style="rootStyle"
    aria-label="功能性阅读器创作助手"
  >
    <section ref="shellEl" class="pc-phone-shell" :style="shellStyle">
      <header
        ref="topbarEl"
        class="pc-topbar"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div class="pc-top-left">
          <button v-if="canGoBack" class="pc-top-btn" type="button" @click.stop="requestPhoneBack">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <span v-else class="pc-top-btn ghost" aria-hidden="true"></span>
          <button v-if="currentRoute.appId !== 'home'" class="pc-top-btn" type="button" @click.stop="phone.goHome()">
            <i class="fa-solid fa-house"></i>
          </button>
          <span v-else class="pc-top-btn ghost" aria-hidden="true"></span>
        </div>
        <strong ref="topTitleEl" class="pc-top-title">{{ currentTitle }}</strong>
        <div class="pc-top-actions">
          <button class="pc-top-btn" type="button" @click.stop="settingsStore.toggleTheme()">
            <i class="fa-solid" :class="settings.theme === 'light' ? 'fa-moon' : 'fa-sun'"></i>
          </button>
          <button class="pc-top-btn" type="button" @click.stop="phone.closePhone()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </header>

      <div v-if="notices.length" class="pc-phone-notices" aria-live="polite">
        <article
          v-for="notice in notices"
          :key="notice.id"
          class="pc-phone-notice"
          :data-kind="notice.kind"
          @click="!notice.actions?.length && phone.dismissNotice(notice.id)"
        >
          <strong>{{ notice.title }}</strong>
          <span>{{ notice.message }}</span>
          <input
            v-if="notice.input"
            class="pc-phone-notice-input"
            :placeholder="notice.input.placeholder"
            type="text"
            :value="notice.inputValue"
            @click.stop
            @input="phone.updateNoticeInput(notice.id, ($event.target as HTMLInputElement).value)"
            @keydown.enter.stop.prevent="phone.chooseNoticeAction(notice.id, 'confirm')"
            @keydown.esc.stop.prevent="phone.dismissNotice(notice.id)"
          />
          <div v-if="notice.actions?.length" class="pc-phone-notice-actions">
            <button
              v-for="action in notice.actions"
              :key="action.id"
              class="pc-phone-notice-action"
              type="button"
              :data-role="action.role || 'soft'"
              @click.stop="phone.chooseNoticeAction(notice.id, action.id)"
            >
              {{ action.label }}
            </button>
          </div>
        </article>
      </div>

      <main
        ref="screenEl"
        :class="['pc-screen', { 'pc-screen-status-display': currentRoute.appId === 'status-display' }]"
      >
        <PhoneHome
          v-if="currentRoute.appId === 'home'"
          :get-display-app-icon="getDisplayAppIcon"
          :get-display-app-icon-asset-path="getDisplayAppIconAssetPath"
          :get-display-app-style="getDisplayAppStyle"
        />

        <KeepAlive>
          <component :is="currentAppComponent" v-if="isOpen && currentAppComponent" :key="currentRoute.appId" />
        </KeepAlive>

        <section v-if="appMountReady && !currentAppComponent && currentApp" class="pc-app-view">
          <div class="pc-app-banner" :style="getDisplayAppStyle(currentApp)">
            <h2>{{ currentApp.name }}</h2>
          </div>
        </section>
      </main>
      <SearchableSelectOverlay />
    </section>
  </div>
</template>

<script setup lang="ts">
import PhoneHome from '@/components/PhoneHome.vue';
import SearchableSelectOverlay from '@/components/SearchableSelectOverlay.vue';
import { useDeferredAppMount } from '@/composables/useDeferredAppMount';
import { usePhoneRouteScroll } from '@/composables/usePhoneRouteScroll';
import { usePhoneTitleFit } from '@/composables/usePhoneTitleFit';
import { usePhoneToastrBridge } from '@/composables/usePhoneToastrBridge';
import { usePhoneWindowPosition } from '@/composables/usePhoneWindowPosition';
import { getRegisteredPhoneAppComponent } from '@/core/appRegistry';
import type { PhoneAppDefinition } from '@/data/apps';
import { getWallpaperPreset } from '@/data/wallpapers';
import { useFileRepositoryStore } from '@/store/fileRepository';
import { usePhoneStore } from '@/store/phone';
import { getCustomFontFamily, useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const fileRepository = useFileRepositoryStore();
const phone = usePhoneStore();
usePhoneToastrBridge();

function requestPhoneBack() {
  const event = new CustomEvent('phone-before-back', { cancelable: true });
  if (!window.dispatchEvent(event)) return;
  void phone.goBack();
}
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const { canGoBack, currentApp, currentRoute, currentTitle, isOpen, notices } = storeToRefs(phone);
const currentAppId = computed(() => currentRoute.value.appId);
const { mountedAppId } = useDeferredAppMount(isOpen, currentAppId);
const appMountReady = computed(
  () => currentRoute.value.appId === 'home' || mountedAppId.value === currentRoute.value.appId,
);
const currentAppComponent = computed(() =>
  appMountReady.value && currentRoute.value.appId !== 'home'
    ? getRegisteredPhoneAppComponent(currentRoute.value.appId)
    : null,
);
const screenEl = ref<HTMLElement | null>(null);
usePhoneRouteScroll({
  currentRoute,
  mountedAppId,
  screenEl,
});
const { onPointerDown, onPointerMove, onPointerUp, positionX, positionY, shellEl, syncPositionFromSettings, topbarEl } =
  usePhoneWindowPosition(isOpen);
const { scheduleTopTitleFit, topTitleEl } = usePhoneTitleFit({
  currentTitle,
  fontFamily: computed(() => settings.value.fontFamily),
  isOpen,
  topbarEl,
});
function escapeCssString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toFontStack(fontFamily: string, fallback: string) {
  const value = fontFamily.trim();
  if (!value) return fallback;
  if (value.includes(',') || value.startsWith('var(')) return value;
  return `"${escapeCssString(value)}", ${fallback}`;
}

function getDisplayAppIcon(app: PhoneAppDefinition) {
  return settings.value.visualTheme.appIconOverrides[app.id] || app.icon;
}

function getDisplayAppIconAssetPath(app: PhoneAppDefinition) {
  const assetId = settings.value.visualTheme.appIconAssetIds[app.id] || '';
  return settings.value.homeIconAssets.find(asset => asset.id === assetId)?.path || '';
}

function getDisplayAppAccent(app: PhoneAppDefinition) {
  return settings.value.visualTheme.appAccentOverrides[app.id] || settings.value.visualTheme.appIconColor || app.accent;
}

function getDisplayAppStyle(app: PhoneAppDefinition) {
  const accent = getDisplayAppAccent(app);
  const iconBase =
    settings.value.visualTheme.appIconBackgroundColor ||
    `color-mix(in srgb, ${accent} 18%, var(--pc-surface-strong) 82%)`;
  return {
    '--pc-accent': accent,
    '--pc-app-icon-bg': iconBase,
    '--pc-icon-material-accent': accent,
    '--pc-icon-material-base': iconBase,
    '--pc-icon-material-foreground': settings.value.visualTheme.appIconColor || '#ffffff',
  };
}

function cssColor(value: string) {
  return value.trim() || undefined;
}

const rootStyle = computed(() => {
  const visualTheme = settings.value.visualTheme;
  const dark = settings.value.theme === 'dark';
  return {
    '--pc-bg': cssColor(visualTheme.backgroundColor),
    '--pc-surface': cssColor(visualTheme.surfaceColor),
    '--pc-surface-strong': cssColor(visualTheme.surfaceStrongColor),
    '--pc-border': cssColor(visualTheme.borderColor),
    '--pc-text': cssColor(visualTheme.textColor),
    '--pc-muted': cssColor(visualTheme.mutedTextColor),
    '--pc-card-radius': `${visualTheme.cardRadius}px`,
    '--pc-font-sans': toFontStack(settings.value.fontFamily, 'var(--pc-font-sans-default)'),
    '--pc-control-radius': `${visualTheme.controlRadius}px`,
    '--pc-danger': cssColor(visualTheme.dangerColor),
    '--pc-dock-bg': cssColor(visualTheme.dockColor),
    '--pc-dock-active': cssColor(visualTheme.dockActiveColor),
    '--pc-form-control-bg': dark ? '#2c2c2e' : '#ffffff',
    '--pc-form-control-text': dark ? '#f5f5f7' : '#1c1c1e',
    '--pc-hint': cssColor(visualTheme.hintColor),
    '--pc-icon-radius': `${visualTheme.iconRadius}px`,
    '--pc-primary-text': cssColor(visualTheme.primaryTextColor),
    '--pc-reader-font-family': toFontStack(settings.value.reader.fontFamily, 'var(--pc-font-sans)'),
    '--pc-reader-background': cssColor(settings.value.reader.backgroundColor) || 'transparent',
    '--pc-reader-font-size': `${settings.value.reader.fontSize}px`,
    '--pc-reader-line-height': String(settings.value.reader.lineHeight),
    '--pc-reader-text': cssColor(visualTheme.readerTextColor) || 'var(--pc-text)',
    '--pc-reader-scale': String(settings.value.interfaceSize.readerScale / 100),
    '--pc-reader-body-min-height': `${Math.round(180 * (settings.value.interfaceSize.readerScale / 100))}px`,
    '--pc-reader-body-height': `clamp(${Math.round(260 * (settings.value.interfaceSize.readerScale / 100))}px, calc(${settings.value.interfaceSize.phoneHeight}px - 270px), ${Math.round(520 * (settings.value.interfaceSize.readerScale / 100))}px)`,
    '--pc-reader-width': `${settings.value.interfaceSize.readerScale}%`,
    '--pc-soft-button-bg': cssColor(visualTheme.softButtonColor),
    '--pc-theme-accent': visualTheme.accentColor,
    '--pc-home-columns': String(settings.value.interfaceSize.homeColumns),
    '--pc-dock-columns': String(settings.value.interfaceSize.dockColumns),
    left: `${positionX.value}px`,
    top: `${positionY.value}px`,
  };
});

const shellStyle = computed(() => {
  const highlightLayer =
    'radial-gradient(circle at top, color-mix(in srgb, var(--pc-theme-accent) 18%, transparent 82%), transparent 30%)';
  const baseLayer = 'linear-gradient(180deg, color-mix(in srgb, var(--pc-bg) 88%, white 12%), var(--pc-bg))';
  const baseStyle = {
    height: `${settings.value.interfaceSize.phoneHeight}px`,
    width: `${settings.value.interfaceSize.phoneWidth}px`,
  };

  const customWallpaper =
    settings.value.wallpaper.customWallpapers.find(item => item.id === settings.value.wallpaper.selectedCustomId) ??
    settings.value.wallpaper.customWallpapers.find(item => item.path === settings.value.wallpaper.customPath) ??
    null;
  const customWallpaperPath = customWallpaper?.path || settings.value.wallpaper.customPath;

  if (settings.value.wallpaper.mode === 'custom' && customWallpaperPath.trim()) {
    const path = customWallpaperPath.replace(/^\/+/, '');
    const overlayOpacity = settings.value.theme === 'dark' ? '0.34' : '0.16';
    return {
      ...baseStyle,
      backgroundImage: `linear-gradient(180deg, rgba(12, 15, 22, ${overlayOpacity}), rgba(12, 15, 22, ${overlayOpacity})), url("/${encodeURI(path)}"), ${baseLayer}`,
      backgroundSize: 'cover, cover, cover',
      backgroundPosition: 'center, center, center',
      backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
    };
  }

  if (settings.value.wallpaper.mode === 'preset') {
    const preset = getWallpaperPreset(settings.value.wallpaper.presetId);
    if (preset) {
      return {
        ...baseStyle,
        backgroundImage: `${highlightLayer}, ${preset.background}, ${baseLayer}`,
      };
    }
  }

  return {
    ...baseStyle,
    backgroundImage: `${highlightLayer}, ${baseLayer}`,
  };
});

watch(
  () => settings.value.customFont,
  customFont => {
    const styleId = 'tavern-phone-imported-font';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    const fontItems = customFont.fonts.length
      ? customFont.fonts
      : customFont.path
        ? [{ id: 'legacy', name: customFont.name, path: customFont.path }]
        : [];

    if (!fontItems.length) {
      styleEl?.remove();
      return;
    }

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const loadedFamilies: string[] = [];
    styleEl.textContent = fontItems
      .map((item, index) => {
        const normalizedPath = item.path.replace(/^\/+/, '');
        const fontUrl = new URL(`/${normalizedPath}`, window.location.origin).href;
        const family = item.id === 'legacy' ? 'TavernPhoneImportedFont' : getCustomFontFamily(item.id);
        loadedFamilies.push(family);
        const shouldCreateLegacyAlias =
          item.id === customFont.selectedFontId ||
          (settings.value.fontFamily === 'TavernPhoneImportedFont' && index === 0);
        const legacyAlias = shouldCreateLegacyAlias
          ? `\n@font-face { font-family: "TavernPhoneImportedFont"; src: url("${fontUrl}"); font-display: swap; }`
          : '';
        return `@font-face { font-family: "${family}"; src: url("${fontUrl}"); font-display: swap; }${legacyAlias}`;
      })
      .join('\n');

    if ('fonts' in document) {
      loadedFamilies.forEach(family => {
        void document.fonts.load(`16px "${escapeCssString(family)}"`).catch(() => undefined);
      });
    }
  },
  { deep: true, immediate: true },
);

watch(isOpen, async nextIsOpen => {
  window.__sillytavernPhoneSyncNativeLauncher__?.();
  if (!nextIsOpen) return;
  await nextTick();
  syncPositionFromSettings();
  scheduleTopTitleFit();
  window.__sillytavernPhoneSyncNativeLauncher__?.();
});

onMounted(() => {
  syncPositionFromSettings();
  fileRepository.startAutoSnapshots();
});

onBeforeUnmount(() => {
  fileRepository.stopAutoSnapshots();
});
</script>

<style scoped>
.pc-phone-root {
  position: fixed;
  z-index: 2147483647;
  font-family:
    var(--pc-font-sans),
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: var(--pc-text);
}

.pc-phone-root[data-theme='light'] {
  color-scheme: light;
  --pc-bg: #f2f2f7;
  --pc-surface: rgba(255, 255, 255, 0.82);
  --pc-surface-strong: rgba(255, 255, 255, 0.96);
  --pc-border: rgba(28, 28, 30, 0.08);
  --pc-text: #1c1c1e;
  --pc-muted: #6d6d74;
  --pc-danger: #ff5a5f;
  --pc-dock-bg: rgba(255, 255, 255, 0.82);
  --pc-dock-active: var(--pc-theme-accent);
  --pc-hint: #2d9cdb;
  --pc-primary-text: #ffffff;
  --pc-form-control-bg: #ffffff;
  --pc-form-control-text: #1c1c1e;
  --pc-soft-button-bg: rgba(255, 255, 255, 0.96);
}

.pc-phone-root[data-theme='dark'] {
  color-scheme: dark;
  --pc-bg: #1c1c1e;
  --pc-surface: rgba(255, 255, 255, 0.08);
  --pc-surface-strong: rgba(255, 255, 255, 0.12);
  --pc-border: rgba(255, 255, 255, 0.1);
  --pc-text: #f5f5f7;
  --pc-muted: #b0b0ba;
  --pc-danger: #ff6b81;
  --pc-dock-bg: rgba(255, 255, 255, 0.08);
  --pc-dock-active: var(--pc-theme-accent);
  --pc-hint: #45caff;
  --pc-primary-text: #ffffff;
  --pc-form-control-bg: #2c2c2e;
  --pc-form-control-text: #f5f5f7;
  --pc-soft-button-bg: rgba(255, 255, 255, 0.12);
}

.pc-phone-shell {
  position: relative;
  width: 360px;
  height: 700px;
  max-width: 100vw;
  max-height: 100vh;
  border-radius: calc(var(--pc-card-radius) + 24px);
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(0, 122, 255, 0.16), transparent 30%),
    linear-gradient(180deg, color-mix(in srgb, var(--pc-bg) 88%, white 12%), var(--pc-bg));
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
  border: 1px solid var(--pc-border);
  display: flex;
  flex-direction: column;
}

.pc-topbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 10px;
  background: color-mix(in srgb, var(--pc-surface) 88%, transparent);
  backdrop-filter: blur(20px);
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.pc-top-left {
  display: flex;
  min-width: 70px;
  gap: 6px;
  justify-content: flex-start;
  position: relative;
  z-index: 1;
}

.pc-topbar:active {
  cursor: grabbing;
}

.pc-top-actions {
  display: flex;
  min-width: 70px;
  gap: 6px;
  justify-content: flex-end;
  position: relative;
  z-index: 1;
}

.pc-top-title {
  position: absolute;
  left: 50%;
  max-width: calc(100% - 152px);
  transform: translateX(-50%);
  text-align: center;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.pc-top-btn {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  cursor: pointer;
}

.pc-topbar .pc-top-btn {
  width: 32px;
  height: 32px;
  font-size: 13px;
}

.pc-top-btn.ghost {
  pointer-events: none;
  opacity: 0;
}

.pc-phone-notices {
  position: absolute;
  z-index: 80;
  top: 42px;
  right: 12px;
  left: 12px;
  display: grid;
  gap: 7px;
  pointer-events: none;
}

.pc-phone-notice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  border: 1px solid var(--pc-border);
  border-radius: 14px;
  padding: 9px 11px;
  background: var(--pc-form-control-bg);
  color: var(--pc-form-control-text);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1.35;
  pointer-events: auto;
  text-align: left;
}

.pc-phone-notice:has(.pc-phone-notice-actions) {
  cursor: default;
}

.pc-phone-notice strong,
.pc-phone-notice span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pc-phone-notice strong {
  white-space: nowrap;
}

.pc-phone-notice span {
  display: -webkit-box;
  color: var(--pc-muted);
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.pc-phone-notice strong {
  color: var(--pc-theme-accent);
  font-weight: 850;
}

.pc-phone-notice[data-kind='success'] strong {
  color: #16a34a;
}

.pc-phone-notice[data-kind='warning'] strong {
  color: #d97706;
}

.pc-phone-notice[data-kind='error'] strong {
  color: var(--pc-danger);
}

.pc-phone-notice-input {
  grid-column: 1 / -1;
  width: 100%;
  min-width: 0;
  height: 32px;
  border: 1px solid var(--pc-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--pc-form-control-text) 7%, var(--pc-form-control-bg) 93%);
  color: var(--pc-form-control-text);
  font: inherit;
  font-size: 12px;
  outline: none;
  padding: 0 10px;
}

.pc-phone-notice-actions {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-top: 2px;
}

.pc-phone-notice-action {
  min-width: 0;
  height: 30px;
  border: 0;
  border-radius: 10px;
  background: color-mix(in srgb, var(--pc-form-control-text) 10%, var(--pc-form-control-bg) 90%);
  color: var(--pc-form-control-text);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.pc-phone-notice-action[data-role='primary'] {
  background: var(--pc-theme-accent);
  color: white;
}

.pc-phone-notice-action[data-role='danger'] {
  background: color-mix(in srgb, var(--pc-danger) 14%, var(--pc-form-control-bg) 86%);
  color: var(--pc-danger);
}

.pc-screen {
  flex: 1;
  overflow: auto;
  padding: 8px 14px 16px;
}

.pc-screen.pc-screen-status-display {
  padding: 0;
}

.pc-screen :deep(.pc-detail-card),
.pc-screen :deep(.pc-message-detail-card) {
  width: min(100%, var(--pc-reader-width));
  margin-left: auto;
  margin-right: auto;
}

.pc-screen :deep(.pc-detail-content),
.pc-screen :deep(.pc-message-body) {
  min-height: var(--pc-reader-body-min-height);
}

.pc-app-view {
  min-height: 100%;
}

.pc-top-btn:disabled {
  cursor: default;
  opacity: 0.45;
}

.pc-app-banner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 14px;
  border-radius: var(--pc-card-radius);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  border: 1px solid var(--pc-border);
  backdrop-filter: blur(12px);
}

.pc-kicker {
  display: inline-block;
  margin-bottom: 6px;
  color: var(--pc-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.pc-app-banner h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-app-copy p,
.pc-check-card p {
  margin: 8px 0 0;
  color: var(--pc-muted);
  line-height: 1.45;
}

.pc-check-card strong {
  display: block;
  font-style: normal;
}

.pc-app-copy {
  margin-top: 14px;
  padding: 16px 18px;
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
  border: 1px solid var(--pc-border);
}

.pc-check-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.pc-check-card {
  padding: 16px;
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
  border: 1px solid var(--pc-border);
}

@media (max-width: 640px) {
  .pc-phone-shell {
    border-radius: 28px;
  }

  .pc-check-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
