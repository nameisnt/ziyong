<template>
  <div
    v-show="isOpen"
    class="pc-phone-root"
    :data-reader-blank-lines="settings.reader.blankLineBetweenLines ? 'true' : 'false'"
    :data-reader-indent="settings.reader.firstLineIndent ? 'true' : 'false'"
    :data-theme="settings.theme"
    :style="rootStyle"
    aria-label="酒馆手机创作助手"
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
          <button v-if="canGoBack" class="pc-top-btn" type="button" @click.stop="phone.goBack()">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <span v-else class="pc-top-btn ghost" aria-hidden="true"></span>
          <button v-if="currentRoute.appId !== 'home'" class="pc-top-btn" type="button" @click.stop="phone.goHome()">
            <i class="fa-solid fa-house"></i>
          </button>
          <span v-else class="pc-top-btn ghost" aria-hidden="true"></span>
        </div>
        <strong class="pc-top-title">{{ currentTitle }}</strong>
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

      <main class="pc-screen">
        <section v-if="currentRoute.appId === 'home'" class="pc-home">
          <div class="pc-home-main">
            <section class="pc-home-context">
              <div class="pc-home-context-copy">
                <span>{{ isViewingCurrentChat ? t`酒馆当前聊天` : t`历史聊天只读` }}</span>
                <strong>{{ viewingScopeMeta.ownerName }} / {{ viewingScopeMeta.chatTitle }}</strong>
              </div>
              <div class="pc-home-context-actions">
                <button
                  class="pc-top-btn"
                  type="button"
                  :disabled="isViewingCurrentChat"
                  :title="isViewingCurrentChat ? t`当前已经是酒馆当前聊天` : t`跳转酒馆聊天`"
                  @click.stop="jumpViewingChatToTavern"
                >
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </button>
                <button
                  class="pc-top-btn"
                  type="button"
                  :disabled="isViewingCurrentChat"
                  :title="t`回到酒馆当前聊天`"
                  @click.stop="phone.returnToCurrentScope()"
                >
                  <i class="fa-solid fa-location-crosshairs"></i>
                </button>
                <button
                  class="pc-top-btn"
                  type="button"
                  :disabled="refreshingPhoneData || generationTasks.hasRunningTasks"
                  :title="generationTasks.hasRunningTasks ? t`生成任务运行中，暂不可刷新` : t`刷新插件数据`"
                  @click.stop="refreshPhoneData"
                >
                  <i :class="['fa-solid fa-rotate-right', { 'fa-spin': refreshingPhoneData }]"></i>
                </button>
              </div>
            </section>

            <GenerationTaskCenter />

            <section
              ref="homeGridEl"
              class="pc-home-grid-wrap"
              @pointercancel="onHomeSwipePointerCancel"
              @pointerdown="onHomeSwipePointerDown"
              @pointermove="onHomeSwipePointerMove"
              @pointerup="onHomeSwipePointerUp"
            >
              <section :class="['pc-grid', { sorting: appDrag.isDragging }]">
                <button
                  v-for="app in currentHomePageApps"
                  :key="app.id"
                  type="button"
                  :class="[
                    'pc-app-tile',
                    {
                      dragging: appDrag.appId === app.id && appDrag.isDragging,
                      'insert-before': insertBeforeAppId === app.id,
                      'insert-end': insertBeforeAppId === '__end__' && currentPageLastAppId === app.id,
                    },
                  ]"
                  :data-app-id="app.id"
                  :style="getDisplayAppStyle(app)"
                  @click="openHomeApp(app.id)"
                  @pointercancel="onAppPointerCancel"
                  @pointerdown="onAppPointerDown($event, app.id)"
                  @pointermove="onAppPointerMove"
                  @pointerup="onAppPointerUp"
                >
                  <span class="pc-app-icon"><i class="fa-solid" :class="getDisplayAppIcon(app)"></i></span>
                  <strong>{{ app.name }}</strong>
                  <small v-if="getHomeAppSubtitle(app)">{{ getHomeAppSubtitle(app) }}</small>
                </button>
              </section>

              <div v-if="homePages.length > 1" class="pc-page-dots">
                <button
                  v-for="(_, pageIndex) in homePages"
                  :key="pageIndex"
                  :class="['pc-page-dot', { active: pageIndex === homePageIndex }]"
                  type="button"
                  :title="`第 ${pageIndex + 1} 页`"
                  @click="homePageIndex = pageIndex"
                  @pointerenter="switchDragPage(pageIndex)"
                ></button>
              </div>
            </section>
          </div>

          <nav v-if="dockApps.length" class="pc-home-dock" aria-label="底部 Dock">
            <button
              v-for="app in dockApps"
              :key="app.id"
              class="pc-dock-tile"
              type="button"
              :style="getDisplayAppStyle(app)"
              @click="openHomeApp(app.id)"
            >
              <span class="pc-app-icon"><i class="fa-solid" :class="getDisplayAppIcon(app)"></i></span>
              <strong>{{ app.name }}</strong>
            </button>
          </nav>
        </section>

        <KeepAlive>
          <component :is="currentAppComponent" v-if="currentAppComponent" :key="currentRoute.appId" />
        </KeepAlive>

        <section v-if="!currentAppComponent && currentApp" class="pc-app-view">
          <div class="pc-app-banner" :style="getDisplayAppStyle(currentApp)">
            <h2>{{ currentApp.name }}</h2>
          </div>
        </section>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import GenerationTaskCenter from '@/components/GenerationTaskCenter.vue';
import { getRegisteredPhoneAppComponent, getRegisteredPhoneBackupRehydrateHandlers } from '@/core/appRegistry';
import { PHONE_APPS, normalizeHomeLayout } from '@/data/apps';
import { getWallpaperPreset } from '@/data/wallpapers';
import { useBaguStore } from '@/store/bagu';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useReaderStore } from '@/store/reader';
import { useRecoveryStore } from '@/store/recovery';
import { getCustomFontFamily, useSettingsStore } from '@/store/settings';
import { useStatsStore } from '@/store/stats';
import { getChatArchiveDomains } from '@/util/chatArchive';
import { jumpToTavernChat } from '@/util/tavernNavigation';
import { storeToRefs } from 'pinia';

const bagu = useBaguStore();
const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const reader = useReaderStore();
const recovery = useRecoveryStore();
const settingsStore = useSettingsStore();
const stats = useStatsStore();
const { settings } = storeToRefs(settingsStore);
const {
  canGoBack,
  currentApp,
  currentRoute,
  currentTitle,
  isOpen,
  isViewingCurrentChat,
  notices,
  viewingScopeKey,
  viewingScopeMeta,
} = storeToRefs(phone);
const currentAppComponent = computed(() => getRegisteredPhoneAppComponent(currentRoute.value.appId));
const shellEl = ref<HTMLElement | null>(null);
const topbarEl = ref<HTMLElement | null>(null);
const homeGridEl = ref<HTMLElement | null>(null);
const refreshingPhoneData = ref(false);
type ToastrKind = 'error' | 'info' | 'success' | 'warning';
type ToastrMethod = (message?: unknown, title?: unknown, options?: unknown) => unknown;

const toastrOriginals = new Map<ToastrKind, ToastrMethod>();
let toastrBridgeInstalled = false;
const positionX = ref(0);
const positionY = ref(0);
const pointerId = ref<number | null>(null);
const startX = ref(0);
const startY = ref(0);
const originX = ref(0);
const originY = ref(0);
const dragging = ref(false);
const appDrag = reactive({
  appId: '',
  insertIndex: -1,
  isDragging: false,
  longPressReady: false,
  pointerId: null as number | null,
  startX: 0,
  startY: 0,
});
const homeSwipe = reactive({
  pointerId: null as number | null,
  startX: 0,
  startY: 0,
  swiping: false,
  tracking: false,
});
const suppressHomeClickUntil = ref(0);
const homePageIndex = ref(0);
const homePageSize = computed(() => settings.value.interfaceSize.homeColumns * settings.value.interfaceSize.homeRows);
let dragPageTimer: ReturnType<typeof window.setTimeout> | null = null;
let appDragLongPressTimer: ReturnType<typeof window.setTimeout> | null = null;

const homeApps = computed(() => {
  const layout = normalizeHomeLayout(settings.value.layout);
  return layout.appOrder
    .map(id => PHONE_APPS.find(app => app.id === id))
    .filter((app): app is (typeof PHONE_APPS)[number] => Boolean(app));
});

const dockApps = computed(() => homeApps.value.filter(app => app.defaultDock));
const gridApps = computed(() => homeApps.value.filter(app => !app.defaultDock));
const homePages = computed(() => {
  const pages: (typeof gridApps.value)[] = [];
  for (let index = 0; index < gridApps.value.length; index += homePageSize.value) {
    pages.push(gridApps.value.slice(index, index + homePageSize.value));
  }
  return pages.length ? pages : [[]];
});
const currentHomePageApps = computed(() => homePages.value[homePageIndex.value] ?? homePages.value[0] ?? []);
const currentPageStartIndex = computed(() => homePageIndex.value * homePageSize.value);
const currentPageLastAppId = computed(() => currentHomePageApps.value[currentHomePageApps.value.length - 1]?.id || '');
const homeArchiveDomains = computed(() => getChatArchiveDomains(viewingScopeKey.value));
const homeArchiveDomainByApp = computed(() => new Map(homeArchiveDomains.value.map(domain => [domain.appId, domain])));
const insertBeforeAppId = computed(() => {
  if (!appDrag.isDragging || !appDrag.appId) return '';
  const order = gridApps.value.map(app => app.id).filter(id => id !== appDrag.appId);
  if (appDrag.insertIndex < 0) return '';
  const currentPageIds = currentHomePageApps.value.map(app => app.id).filter(id => id !== appDrag.appId);
  const currentPageEnd = currentPageStartIndex.value + currentPageIds.length;
  if (
    currentPageIds.length &&
    appDrag.insertIndex >= currentPageEnd &&
    appDrag.insertIndex <= currentPageStartIndex.value + homePageSize.value
  ) {
    return '__end__';
  }
  if (appDrag.insertIndex >= order.length) return '__end__';
  return order[appDrag.insertIndex] || '';
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

function getHomeAppSubtitle(app: (typeof PHONE_APPS)[number]) {
  const subtitleAppIds = new Set(['summary', 'diary', 'extras', 'forum', 'theater', 'letters']);
  if (!subtitleAppIds.has(app.id)) return '';
  const domain = homeArchiveDomainByApp.value.get(app.id);
  if (!domain) {
    return '暂无内容';
  }
  if (app.id === 'extras') return `${domain.collections}本`;
  if (app.id === 'forum') return `${domain.collections}板块`;
  const itemLabels: Record<string, string> = {
    diary: '篇',
    letters: '封',
    summary: '篇',
    theater: '篇',
  };
  return `${domain.items}${itemLabels[app.id] || domain.itemLabel}`;
}

function getDisplayAppIcon(app: (typeof PHONE_APPS)[number]) {
  return settings.value.visualTheme.appIconOverrides[app.id] || app.icon;
}

function getDisplayAppAccent(app: (typeof PHONE_APPS)[number]) {
  return settings.value.visualTheme.appAccentOverrides[app.id] || settings.value.visualTheme.appIconColor || app.accent;
}

function getDisplayAppStyle(app: (typeof PHONE_APPS)[number]) {
  const accent = getDisplayAppAccent(app);
  return {
    '--pc-accent': accent,
    '--pc-app-icon-bg':
      settings.value.visualTheme.appIconBackgroundColor ||
      `color-mix(in srgb, ${accent} 18%, var(--pc-surface-strong) 82%)`,
  };
}

function cssColor(value: string) {
  return value.trim() || undefined;
}

const rootStyle = computed(() => {
  const visualTheme = settings.value.visualTheme;
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
    '--pc-hint': cssColor(visualTheme.hintColor),
    '--pc-icon-radius': `${visualTheme.iconRadius}px`,
    '--pc-primary-text': cssColor(visualTheme.primaryTextColor),
    '--pc-reader-font-family': toFontStack(settings.value.reader.fontFamily, 'var(--pc-font-sans)'),
    '--pc-reader-font-size': `${settings.value.reader.fontSize}px`,
    '--pc-reader-line-height': String(settings.value.reader.lineHeight),
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

function formatToastrMessage(message: unknown) {
  if (message instanceof Error) return message.message;
  if (typeof message === 'string') return message;
  if (message === null || message === undefined) return '';
  return String(message);
}

function formatToastrTitle(title: unknown, kind: ToastrKind) {
  if (typeof title === 'string' && title.trim()) return title.trim();
  if (kind === 'success') return '完成';
  if (kind === 'error') return '出错';
  return '提示';
}

function showPhoneToastr(kind: ToastrKind, message: unknown, title: unknown) {
  const text = formatToastrMessage(message);
  if (!text.trim()) return;
  const options = {
    title: formatToastrTitle(title, kind),
  };
  if (kind === 'success') {
    phone.noticeSuccess(text, options);
    return;
  }
  if (kind === 'error') {
    phone.noticeError(text, options);
    return;
  }
  if (kind === 'warning') {
    phone.noticeWarning(text, options);
    return;
  }
  phone.noticeInfo(text, options);
}

function installToastrBridge() {
  if (toastrBridgeInstalled || typeof toastr === 'undefined') return;
  (['success', 'info', 'warning', 'error'] as ToastrKind[]).forEach(kind => {
    const original = toastr[kind] as ToastrMethod | undefined;
    if (typeof original !== 'function') return;
    toastrOriginals.set(kind, original.bind(toastr));
    toastr[kind] = ((message?: unknown, title?: unknown, options?: unknown) => {
      if (phone.isOpen) {
        showPhoneToastr(kind, message, title);
        return undefined;
      }
      return toastrOriginals.get(kind)?.(message, title, options);
    }) as (typeof toastr)[typeof kind];
  });
  toastrBridgeInstalled = true;
}

function restoreToastrBridge() {
  if (!toastrBridgeInstalled || typeof toastr === 'undefined') return;
  toastrOriginals.forEach((original, kind) => {
    toastr[kind] = original as (typeof toastr)[typeof kind];
  });
  toastrOriginals.clear();
  toastrBridgeInstalled = false;
}

onMounted(() => {
  installToastrBridge();
});

onBeforeUnmount(() => {
  restoreToastrBridge();
});

function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function getShellSize() {
  const rect = shellEl.value?.getBoundingClientRect();
  return {
    width: rect?.width ?? Math.min(360, window.innerWidth),
    height: rect?.height ?? Math.min(700, window.innerHeight),
  };
}

function clampPosition(nextX: number, nextY: number) {
  const margin = 0;
  const viewport = getViewportSize();
  const shell = getShellSize();
  return {
    x: Math.min(Math.max(margin, nextX), Math.max(margin, viewport.width - shell.width - margin)),
    y: Math.min(Math.max(margin, nextY), Math.max(margin, viewport.height - shell.height - margin)),
  };
}

function getDefaultPosition() {
  const viewport = getViewportSize();
  const shell = getShellSize();
  if (viewport.width <= 640) {
    return clampPosition((viewport.width - shell.width) / 2, viewport.height - shell.height);
  }
  return clampPosition(viewport.width - shell.width, viewport.height - shell.height);
}

function syncPositionFromSettings() {
  if (typeof window === 'undefined') return;
  const nextPosition =
    settings.value.phoneWindowX === null || settings.value.phoneWindowY === null
      ? getDefaultPosition()
      : clampPosition(settings.value.phoneWindowX, settings.value.phoneWindowY);
  positionX.value = nextPosition.x;
  positionY.value = nextPosition.y;
}

function persistPosition() {
  settingsStore.setPhoneWindowPosition(positionX.value, positionY.value);
}

function getHomeOrder() {
  return gridApps.value.map(app => app.id);
}

function clampHomePageIndex(pageIndex: number) {
  return Math.max(0, Math.min(pageIndex, homePages.value.length - 1));
}

function goHomePage(pageIndex: number) {
  homePageIndex.value = clampHomePageIndex(pageIndex);
}

function clearAppDragLongPressTimer() {
  if (!appDragLongPressTimer) return;
  window.clearTimeout(appDragLongPressTimer);
  appDragLongPressTimer = null;
}

function resetAppDrag() {
  clearAppDragLongPressTimer();
  appDrag.appId = '';
  appDrag.insertIndex = -1;
  appDrag.isDragging = false;
  appDrag.longPressReady = false;
  appDrag.pointerId = null;
  appDrag.startX = 0;
  appDrag.startY = 0;
  if (dragPageTimer) {
    window.clearTimeout(dragPageTimer);
    dragPageTimer = null;
  }
}

function resetHomeSwipe() {
  homeSwipe.pointerId = null;
  homeSwipe.startX = 0;
  homeSwipe.startY = 0;
  homeSwipe.swiping = false;
  homeSwipe.tracking = false;
}

function resolveInsertIndex(clientX: number, clientY: number) {
  const tiles = Array.from(homeGridEl.value?.querySelectorAll<HTMLElement>('.pc-app-tile[data-app-id]') ?? []).filter(
    tile => tile.dataset.appId && tile.dataset.appId !== appDrag.appId,
  );

  for (let index = 0; index < tiles.length; index += 1) {
    const rect = tiles[index].getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const centerX = rect.left + rect.width / 2;
    const isBeforeRow = clientY < centerY && clientY < rect.bottom;
    const isBeforeInRow = clientY >= rect.top && clientY <= rect.bottom && clientX < centerX;
    if (isBeforeRow || isBeforeInRow) return currentPageStartIndex.value + index;
  }

  return currentPageStartIndex.value + tiles.length;
}

function switchDragPage(pageIndex: number) {
  if (!appDrag.isDragging) return;
  goHomePage(pageIndex);
}

function scheduleDragPageSwitch(direction: -1 | 1) {
  const nextPage = homePageIndex.value + direction;
  if (nextPage < 0 || nextPage >= homePages.value.length) return;
  if (dragPageTimer) return;
  dragPageTimer = window.setTimeout(() => {
    goHomePage(nextPage);
    appDrag.insertIndex =
      direction > 0
        ? Math.min((nextPage + 1) * homePageSize.value, getHomeOrder().length)
        : nextPage * homePageSize.value;
    dragPageTimer = null;
  }, 420);
}

function updateDragPageSwitch(clientX: number) {
  if (!homeGridEl.value || homePages.value.length <= 1) return;
  const rect = homeGridEl.value.getBoundingClientRect();
  const edgeSize = Math.min(54, rect.width * 0.22);
  if (clientX < rect.left + edgeSize) {
    scheduleDragPageSwitch(-1);
    return;
  }
  if (clientX > rect.right - edgeSize) {
    scheduleDragPageSwitch(1);
    return;
  }
  if (dragPageTimer) {
    window.clearTimeout(dragPageTimer);
    dragPageTimer = null;
  }
}

function onAppPointerDown(event: PointerEvent, appId: string) {
  if (event.button !== 0) return;
  appDrag.appId = appId;
  appDrag.pointerId = event.pointerId;
  appDrag.startX = event.clientX;
  appDrag.startY = event.clientY;
  appDrag.insertIndex = Math.max(0, getHomeOrder().indexOf(appId));
  appDrag.isDragging = false;
  appDrag.longPressReady = false;
  clearAppDragLongPressTimer();
  appDragLongPressTimer = window.setTimeout(() => {
    if (appDrag.pointerId !== event.pointerId || appDrag.appId !== appId) return;
    appDrag.longPressReady = true;
    appDragLongPressTimer = null;
  }, 360);
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function onAppPointerMove(event: PointerEvent) {
  if (appDrag.pointerId !== event.pointerId || !appDrag.appId) return;
  const distance = Math.hypot(event.clientX - appDrag.startX, event.clientY - appDrag.startY);
  if (!appDrag.longPressReady) {
    if (distance > 8) clearAppDragLongPressTimer();
    return;
  }
  if (!appDrag.isDragging && distance > 6) {
    appDrag.isDragging = true;
  }
  if (!appDrag.isDragging) return;

  event.preventDefault();
  updateDragPageSwitch(event.clientX);
  appDrag.insertIndex = resolveInsertIndex(event.clientX, event.clientY);
}

function commitAppDrag() {
  if (!appDrag.appId || !appDrag.isDragging) return;
  const nextOrder = getHomeOrder().filter(id => id !== appDrag.appId);
  const insertIndex = Math.max(0, Math.min(appDrag.insertIndex, nextOrder.length));
  nextOrder.splice(insertIndex, 0, appDrag.appId);
  settingsStore.reorderHomeApps([...nextOrder, ...dockApps.value.map(app => app.id)]);
  suppressHomeClickUntil.value = Date.now() + 250;
}

function onAppPointerUp(event: PointerEvent) {
  if (appDrag.pointerId !== event.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  if (appDrag.longPressReady || appDrag.isDragging) {
    suppressHomeClickUntil.value = Date.now() + 250;
  }
  commitAppDrag();
  resetAppDrag();
}

function onAppPointerCancel(event: PointerEvent) {
  if (appDrag.pointerId !== event.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  resetAppDrag();
}

function onHomeSwipePointerDown(event: PointerEvent) {
  if (event.button !== 0 || homePages.value.length <= 1) return;
  const target = event.target;
  if (
    target instanceof Element &&
    target.closest('.pc-page-dots, .pc-home-context, .pc-generation-task-center, .pc-home-dock')
  )
    return;
  homeSwipe.pointerId = event.pointerId;
  homeSwipe.startX = event.clientX;
  homeSwipe.startY = event.clientY;
  homeSwipe.swiping = false;
  homeSwipe.tracking = true;
}

function onHomeSwipePointerMove(event: PointerEvent) {
  if (!homeSwipe.tracking || homeSwipe.pointerId !== event.pointerId) return;
  if (appDrag.longPressReady || appDrag.isDragging) {
    resetHomeSwipe();
    return;
  }

  const deltaX = event.clientX - homeSwipe.startX;
  const deltaY = event.clientY - homeSwipe.startY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (!homeSwipe.swiping && absX > 12 && absX > absY * 1.25) {
    homeSwipe.swiping = true;
    clearAppDragLongPressTimer();
  }
  if (!homeSwipe.swiping) return;
  event.preventDefault();
}

function onHomeSwipePointerUp(event: PointerEvent) {
  if (!homeSwipe.tracking || homeSwipe.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - homeSwipe.startX;
  const deltaY = event.clientY - homeSwipe.startY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (homeSwipe.swiping && absX >= 48 && absX > absY * 1.25) {
    goHomePage(homePageIndex.value + (deltaX < 0 ? 1 : -1));
    suppressHomeClickUntil.value = Date.now() + 250;
    event.preventDefault();
  }
  resetHomeSwipe();
}

function onHomeSwipePointerCancel(event: PointerEvent) {
  if (homeSwipe.pointerId !== event.pointerId) return;
  resetHomeSwipe();
}

function openHomeApp(appId: string) {
  if (Date.now() < suppressHomeClickUntil.value) return;
  phone.openApp(appId);
}

async function jumpViewingChatToTavern() {
  if (isViewingCurrentChat.value) return;
  const target = phone.getTavernJumpTarget();
  if (!target) {
    toastr.warning('当前阅览没有对应的酒馆聊天');
    return;
  }

  try {
    await jumpToTavernChat({
      chatFile: target.chatId,
      characterId: target.characterId,
      ownerName: target.ownerName,
    });
    phone.closePhone();
    window.setTimeout(() => void phone.syncCurrentTavernScope(true), 2400);
    toastr.success('正在跳转到酒馆聊天');
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : '跳转酒馆聊天失败';
    toastr.error(message);
  }
}

async function refreshPhoneData() {
  if (refreshingPhoneData.value) return;
  if (generationTasks.hasRunningTasks) {
    phone.noticeWarning('生成任务运行中，请暂停或等待任务完成后再刷新');
    return;
  }
  refreshingPhoneData.value = true;
  await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));

  try {
    settingsStore.rehydrateFromSettings();
    prompts.rehydrateFromSettings();
    bagu.rehydrateFromSettings();
    recovery.rehydrateFromSettings();
    reader.rehydrateFromSettings();
    generationTasks.rehydrateFromSettings();
    getRegisteredPhoneBackupRehydrateHandlers().forEach(handler => handler());
    stats.refresh();
    await nextTick();
    phone.noticeSuccess('插件数据已刷新');
  } catch (caughtError) {
    phone.noticeError(caughtError instanceof Error ? caughtError.message : '刷新插件数据失败');
  } finally {
    refreshingPhoneData.value = false;
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  const target = event.target;
  if (target instanceof Element && target.closest('button, input, textarea, select, a, label')) return;
  pointerId.value = event.pointerId;
  startX.value = event.clientX;
  startY.value = event.clientY;
  originX.value = positionX.value;
  originY.value = positionY.value;
  dragging.value = false;
  topbarEl.value?.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  const deltaX = event.clientX - startX.value;
  const deltaY = event.clientY - startY.value;
  if (!dragging.value && Math.hypot(deltaX, deltaY) > 6) {
    dragging.value = true;
  }
  if (!dragging.value) return;
  const nextPosition = clampPosition(originX.value + deltaX, originY.value + deltaY);
  positionX.value = nextPosition.x;
  positionY.value = nextPosition.y;
}

function onPointerUp(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  topbarEl.value?.releasePointerCapture?.(event.pointerId);
  if (dragging.value) {
    persistPosition();
  }
  pointerId.value = null;
  dragging.value = false;
}

watch(
  () => [
    settings.value.phoneWindowX,
    settings.value.phoneWindowY,
    settings.value.interfaceSize.phoneWidth,
    settings.value.interfaceSize.phoneHeight,
  ],
  () => {
    if (!isOpen.value) return;
    void nextTick(() => syncPositionFromSettings());
  },
);

watch(
  () => homePages.value.length,
  pageCount => {
    homePageIndex.value = Math.min(homePageIndex.value, Math.max(0, pageCount - 1));
  },
);

watch(isOpen, async nextIsOpen => {
  window.__sillytavernPhoneSyncNativeLauncher__?.();
  if (!nextIsOpen) return;
  await nextTick();
  syncPositionFromSettings();
  window.__sillytavernPhoneSyncNativeLauncher__?.();
});

onMounted(() => {
  syncPositionFromSettings();
});

useEventListener(window, 'resize', async () => {
  if (!isOpen.value) return;
  await nextTick();
  syncPositionFromSettings();
});

useEventListener(window, 'orientationchange', async () => {
  if (!isOpen.value) return;
  await nextTick();
  syncPositionFromSettings();
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
  gap: 8px;
  padding: 10px 14px 8px;
  background: color-mix(in srgb, var(--pc-surface) 88%, transparent);
  backdrop-filter: blur(20px);
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.pc-top-left {
  display: flex;
  min-width: 80px;
  gap: 8px;
  justify-content: flex-start;
  position: relative;
  z-index: 1;
}

.pc-topbar:active {
  cursor: grabbing;
}

.pc-top-actions {
  display: flex;
  min-width: 80px;
  gap: 8px;
  justify-content: flex-end;
  position: relative;
  z-index: 1;
}

.pc-top-title {
  position: absolute;
  left: 50%;
  max-width: calc(100% - 176px);
  transform: translateX(-50%);
  text-align: center;
  font-size: 14px;
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
  width: 36px;
  height: 36px;
}

.pc-top-btn.ghost {
  pointer-events: none;
  opacity: 0;
}

.pc-phone-notices {
  position: absolute;
  z-index: 80;
  top: 56px;
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
  background: color-mix(in srgb, var(--pc-surface) 94%, transparent 6%);
  color: var(--pc-text);
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
  background: var(--pc-surface-strong);
  color: var(--pc-text);
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
  background: var(--pc-surface-strong);
  color: var(--pc-text);
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
  background: color-mix(in srgb, var(--pc-danger) 14%, var(--pc-surface-strong) 86%);
  color: var(--pc-danger);
}

.pc-screen {
  flex: 1;
  overflow: auto;
  padding: 8px 14px 16px;
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

.pc-home,
.pc-app-view {
  min-height: 100%;
}

.pc-home {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 0;
}

.pc-home-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pc-home-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}

.pc-home-context-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.pc-home-context-copy span,
.pc-home-context-copy strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-home-context-copy span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-home-context-copy strong {
  margin-top: 3px;
  font-size: 14px;
}

.pc-home-context-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
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
.pc-check-card p,
.pc-app-tile small {
  margin: 8px 0 0;
  color: var(--pc-muted);
  line-height: 1.45;
}

.pc-grid {
  display: grid;
  grid-template-columns: repeat(var(--pc-home-columns), minmax(0, 1fr));
  gap: 10px;
  align-content: start;
}

.pc-home-grid-wrap {
  flex: 1 1 auto;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  gap: 10px;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.pc-app-tile {
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--pc-text);
  cursor: pointer;
  touch-action: none;
  transition:
    background 0.16s ease,
    opacity 0.16s ease,
    transform 0.16s ease;
}

.pc-app-tile:hover {
  background: transparent;
}

.pc-app-tile:active {
  transform: scale(0.98);
}

.pc-app-tile {
  min-height: 104px;
  border-radius: var(--pc-card-radius);
  padding: 10px 8px;
  text-align: center;
}

.pc-app-tile strong,
.pc-check-card strong {
  display: block;
  font-style: normal;
}

.pc-app-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--pc-icon-radius);
  display: grid;
  place-items: center;
  margin: 0 auto 10px;
  background: var(--pc-app-icon-bg);
  color: var(--pc-accent);
  font-size: 17px;
}

.pc-app-tile strong {
  font-size: 12px;
  line-height: 1.25;
}

.pc-app-tile small {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-page-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 20px;
}

.pc-page-dot {
  width: 7px;
  height: 7px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: color-mix(in srgb, var(--pc-muted) 42%, transparent 58%);
  cursor: pointer;
}

.pc-page-dot.active {
  width: 18px;
  background: var(--pc-dock-active);
}

.pc-home-dock {
  display: grid;
  grid-template-columns: repeat(var(--pc-dock-columns), minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: calc(var(--pc-card-radius) + 4px);
  background: color-mix(in srgb, var(--pc-dock-bg) 82%, transparent 18%);
  backdrop-filter: blur(18px);
}

.pc-dock-tile {
  min-width: 0;
  border: 0;
  border-radius: var(--pc-card-radius);
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  padding: 4px 2px 3px;
}

.pc-dock-tile .pc-app-icon {
  width: 38px;
  height: 38px;
  margin-bottom: 5px;
  border-radius: var(--pc-icon-radius);
  font-size: 15px;
}

.pc-dock-tile strong {
  display: block;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-grid.sorting .pc-app-tile {
  cursor: grabbing;
}

.pc-app-tile.dragging {
  opacity: 0.55;
  transform: scale(0.94);
}

.pc-app-tile.insert-before,
.pc-app-tile.insert-end {
  position: relative;
}

.pc-app-tile.insert-before::before,
.pc-app-tile.insert-end::after {
  content: '';
  position: absolute;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 999px;
  background: var(--pc-dock-active);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pc-dock-active) 16%, transparent);
}

.pc-app-tile.insert-before::before {
  left: -6px;
}

.pc-app-tile.insert-end::after {
  right: -6px;
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
