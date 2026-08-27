<template>
  <section class="pc-home">
    <div class="pc-home-main">
      <HomeContextBar
        @open-folder-creator="openFolderCreator"
        @refreshed="refreshHomeArchiveDomains"
        @toggle-organizing="manageActiveHomeGroup"
      />

      <section ref="homeGridEl" class="pc-home-grid-wrap" @click.capture="onHomeSwipeClickCapture">
        <HomeActivityPage :active="true" @open="openHomeActivityItem" />
        <label class="pc-search-field pc-home-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="appSearch" placeholder="搜索 App" />
          <button
            v-if="appSearch"
            class="pc-icon-btn"
            type="button"
            title="清除搜索"
            aria-label="清除搜索"
            @click="appSearch = ''"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </label>

        <div v-if="homeGroups.length" class="pc-home-group-bar">
          <nav class="pc-home-group-tabs" aria-label="主页分组">
            <button
              v-for="group in homeGroups"
              :key="group.id"
              :class="[
                'pc-segment-btn compact',
                {
                  active: group.id === activeHomeGroupId,
                  'folder-target': appDrag.folderTargetToken === homeFolderToken(group.id),
                },
              ]"
              type="button"
              :data-home-token="homeFolderToken(group.id)"
              @click="activeHomeGroupId = group.id"
            >
              {{ group.name }}
            </button>
          </nav>
          <button class="pc-soft-btn compact" type="button" @click="manageActiveHomeGroup">
            <i class="fa-solid fa-sliders"></i><span>管理分组</span>
          </button>
        </div>

        <section v-for="section in homeSections" :key="section.id" class="pc-home-app-section">
          <div v-if="section.title" class="pc-section-head pc-home-section-head">
            <strong>{{ section.title }}</strong
            ><span>{{ `${section.apps.length} 个 App` }}</span>
          </div>
          <div class="pc-home-app-grid">
            <button
              v-for="app in section.apps"
              :key="app.id"
              type="button"
              :class="['pc-app-tile', { dragging: appDrag.itemToken === app.id && appDrag.isDragging }]"
              :data-home-token="section.draggable ? app.id : undefined"
              :style="[
                getDisplayAppStyle(app),
                section.draggable ? getHomeTileDragStyle({ app, folder: null, token: app.id }) : {},
              ]"
              @click="openHomeApp(app.id, section.folderId)"
              @pointercancel="section.draggable && onAppPointerCancel($event)"
              @pointerdown="section.draggable && onAppPointerDown($event, app.id)"
              @pointermove="section.draggable && onAppPointerMove($event)"
              @pointerup="section.draggable && onAppPointerUp($event)"
            >
              <span class="pc-app-icon pc-app-icon-material">
                <AppIcon :asset-path="getDisplayAppIconAssetPath(app)" :icon="getDisplayAppIcon(app)" />
                <span v-if="getHomeAppCount(app)" class="pc-app-count-badge">{{ formatHomeAppCount(app) }}</span>
              </span>
              <strong :title="app.name">{{ app.name }}</strong>
            </button>
          </div>
        </section>
        <EmptyState v-if="!homeSections.some(section => section.apps.length)" compact title="没有匹配的 App" />
      </section>
    </div>

    <nav ref="homeDockEl" class="pc-home-dock" aria-label="底部 Dock" data-home-zone="dock">
      <button
        v-for="item in dockItems"
        :key="item.token"
        :class="['pc-dock-tile', { dragging: appDrag.itemToken === item.token && appDrag.isDragging }]"
        type="button"
        :data-home-token="item.token"
        :style="[item.app ? getDisplayAppStyle(item.app) : getFolderStyle(item), getHomeTileDragStyle(item)]"
        @click="openHomeItem(item)"
        @pointercancel="onAppPointerCancel"
        @pointerdown="onAppPointerDown($event, item.token)"
        @pointermove="onAppPointerMove"
        @pointerup="onAppPointerUp"
      >
        <span class="pc-app-icon pc-app-icon-material">
          <AppIcon
            :asset-path="item.app ? getDisplayAppIconAssetPath(item.app) : getFolderIconAssetPath(item)"
            :icon="item.app ? getDisplayAppIcon(item.app) : 'fa-folder'"
          />
          <span v-if="item.folder" class="pc-app-count-badge">{{ item.folder.appIds.length }}</span>
        </span>
        <strong>{{ item.app?.name || item.folder?.name }}</strong>
      </button>
    </nav>

    <Transition name="pc-home-folder">
      <section
        v-if="activeHomeFolder"
        :class="['pc-modal-backdrop pc-home-folder-backdrop', { dissolving: folderDissolving }]"
        @click.self="closeHomeFolder"
      >
        <article
          ref="homeFolderDialogRef"
          class="pc-section-card pc-modal-dialog pc-home-folder-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="主页分组管理"
          tabindex="-1"
        >
          <header class="pc-section-head pc-home-folder-head">
            <input
              :value="activeHomeFolder.name"
              class="pc-field pc-home-folder-name"
              maxlength="24"
              @change="renameActiveHomeFolder(($event.target as HTMLInputElement).value)"
            />
            <button
              class="pc-soft-btn compact"
              type="button"
              :aria-pressed="isOrganizing"
              @click="isOrganizing = !isOrganizing"
            >
              {{ isOrganizing ? '完成' : '整理' }}
            </button>
            <button
              v-if="activeHomeFolder.id !== 'home_default_tools'"
              class="pc-icon-btn danger"
              type="button"
              :disabled="folderDissolving"
              title="解散分组"
              aria-label="解散分组"
              @click="dissolveActiveHomeFolder"
            >
              <i class="fa-solid fa-folder-minus"></i>
            </button>
            <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" @click="closeHomeFolder">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="pc-home-folder-grid">
            <article
              v-for="(app, index) in activeHomeFolderApps"
              :key="app.id"
              :class="[
                'pc-home-folder-app',
                {
                  dragging: folderDrag.appId === app.id && folderDrag.isDragging,
                  'drop-target': folderDrag.isDragging && folderDrag.targetIndex === index,
                },
              ]"
              :data-folder-index="index"
              :style="getFolderTileDragStyle(app.id)"
              @pointercancel="onFolderAppPointerCancel"
              @pointerdown="onFolderAppPointerDown($event, app.id, index)"
              @pointermove="onFolderAppPointerMove"
              @pointerup="onFolderAppPointerUp"
            >
              <button type="button" :style="getDisplayAppStyle(app)" @click="openFolderApp(app.id)">
                <span class="pc-app-icon pc-app-icon-material"
                  ><AppIcon :asset-path="getDisplayAppIconAssetPath(app)" :icon="getDisplayAppIcon(app)"
                /></span>
                <strong>{{ app.name }}</strong>
              </button>
              <button
                v-if="isOrganizing && activeHomeFolder.id !== 'home_default_tools'"
                class="pc-icon-btn pc-home-folder-remove"
                type="button"
                title="移到插件工具"
                aria-label="移到插件工具"
                @pointerdown.stop
                @click.stop="removeFolderApp(app.id)"
              >
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </button>
            </article>
          </div>
        </article>
      </section>
    </Transition>

    <Transition name="pc-home-folder">
      <section
        v-if="folderCreateOpen"
        class="pc-modal-backdrop pc-home-folder-create-backdrop"
        @click.self="closeFolderCreator"
      >
        <form
          ref="folderCreateDialogRef"
          class="pc-section-card pc-modal-dialog pc-home-folder-create-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="新建分组"
          tabindex="-1"
          @submit.prevent="createSelectedHomeFolder"
        >
          <header class="pc-section-head"><strong>新建分组</strong></header>
          <label class="pc-field-group">
            <span class="pc-field-label">名称</span>
            <input v-model="folderCreateName" class="pc-field" maxlength="24" placeholder="分组名称" />
          </label>
          <fieldset class="pc-home-folder-picker">
            <legend>选择 App（至少一个）</legend>
            <label v-for="app in folderCreationApps" :key="app.id" class="pc-home-folder-choice">
              <input
                type="checkbox"
                :checked="folderCreateAppIds.includes(app.id)"
                @change="toggleFolderCreateApp(app.id)"
              />
              <span class="pc-app-icon pc-app-icon-material"
                ><AppIcon :asset-path="getDisplayAppIconAssetPath(app)" :icon="getDisplayAppIcon(app)"
              /></span>
              <strong>{{ app.name }}</strong>
            </label>
          </fieldset>
          <footer class="pc-form-actions">
            <button class="pc-soft-btn" type="button" @click="closeFolderCreator">取消</button>
            <button class="pc-primary-btn" type="submit" :disabled="!folderCreateAppIds.length">创建</button>
          </footer>
        </form>
      </section>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import HomeActivityPage from '@/components/home/HomeActivityPage.vue';
import HomeContextBar from '@/components/home/HomeContextBar.vue';
import { useHomeLayoutProjection, type HomeDisplayItem } from '@/components/home/useHomeLayoutProjection';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import {
  createHomeFolder,
  homeFolderToken,
  moveHomeLayoutItem,
  putHomeAppInFolder,
  readHomeFolderToken,
  reorderHomeFolderApp,
  removeHomeAppFromFolder,
} from '@/core/appLayout';
import { getPhoneApps, type PhoneAppDefinition } from '@/data/apps';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { getChatArchiveDomains } from '@/util/chatArchive';
import type { GenerationActivityItem } from '@/util/generationActivity';
import { storeToRefs } from 'pinia';

type AppStyle = Record<string, string>;

const { getDisplayAppIcon, getDisplayAppIconAssetPath, getDisplayAppStyle } = defineProps<{
  getDisplayAppIcon: (app: PhoneAppDefinition) => string;
  getDisplayAppIconAssetPath: (app: PhoneAppDefinition) => string;
  getDisplayAppStyle: (app: PhoneAppDefinition) => AppStyle;
}>();

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { currentRoute, isOpen, viewingScopeKey } = storeToRefs(phone);
const { settings } = storeToRefs(settingsStore);
const homeGridEl = ref<HTMLElement | null>(null);
const homeDockEl = ref<HTMLElement | null>(null);
const appDrag = reactive({
  itemToken: '',
  destination: 'home' as 'dock' | 'home',
  deltaX: 0,
  deltaY: 0,
  folderTargetToken: '',
  insertIndex: -1,
  isDragging: false,
  longPressReady: false,
  pointerId: null as number | null,
  startX: 0,
  startY: 0,
});
const folderDrag = reactive({
  appId: '',
  deltaX: 0,
  deltaY: 0,
  isDragging: false,
  pointerId: null as number | null,
  sourceIndex: -1,
  startX: 0,
  startY: 0,
  targetIndex: -1,
});
const suppressHomeClickUntil = ref(0);
const activeHomeGroupId = ref('');
const appSearch = ref('');
const isOrganizing = ref(false);
const activeHomeFolderId = ref('');
const homeFolderDialogRef = ref<HTMLElement | null>(null);
const folderCreateDialogRef = ref<HTMLElement | null>(null);
const folderCreateOpen = ref(false);
const folderCreateName = ref('');
const folderCreateAppIds = ref<string[]>([]);
const folderDissolving = ref(false);
let appDragLongPressTimer: ReturnType<typeof window.setTimeout> | null = null;
let folderHoverTimer: ReturnType<typeof window.setTimeout> | null = null;
let potentialFolderTargetToken = '';

const {
  activeHomeFolder,
  activeHomeFolderApps,
  dockItems,
  folderCreationApps,
  getFolderApps,
  homeLayout,
  phoneAppById,
} = useHomeLayoutProjection(activeHomeFolderId);
const homeGroups = computed(() => homeLayout.value.folders);
const activeHomeGroup = computed(
  () => homeGroups.value.find(group => group.id === activeHomeGroupId.value) ?? homeGroups.value[0] ?? null,
);
const activeHomeGroupApps = computed(() =>
  (activeHomeGroup.value?.appIds ?? []).flatMap(appId => {
    const app = phoneAppById.value.get(appId);
    return app ? [app] : [];
  }),
);
const homeSections = computed(() => {
  const query = appSearch.value.trim().toLocaleLowerCase();
  if (query) {
    return [
      {
        apps: getPhoneApps().filter(app => `${app.name} ${app.id}`.toLocaleLowerCase().includes(query)),
        draggable: false,
        folderId: '',
        id: 'search',
        title: '搜索结果',
      },
    ].filter(section => section.apps.length);
  }
  return [
    {
      apps: activeHomeGroupApps.value,
      draggable: false,
      folderId: activeHomeGroup.value?.id ?? '',
      id: `group:${activeHomeGroup.value?.id ?? 'none'}`,
      title: '',
    },
  ].filter(section => section.apps.length);
});
const homeArchiveDomains = ref(getChatArchiveDomains(viewingScopeKey.value));
const homeArchiveDomainByApp = computed(() => new Map(homeArchiveDomains.value.map(domain => [domain.appId, domain])));

usePhoneModalLifecycle({
  dialogRef: homeFolderDialogRef,
  isOpen: () => Boolean(activeHomeFolder.value),
  onClose: closeHomeFolder,
});

usePhoneModalLifecycle({
  dialogRef: folderCreateDialogRef,
  isOpen: () => folderCreateOpen.value,
  onClose: closeFolderCreator,
});

function refreshHomeArchiveDomains() {
  homeArchiveDomains.value = getChatArchiveDomains(viewingScopeKey.value);
}

function getHomeAppCount(app: PhoneAppDefinition) {
  const subtitleAppIds = new Set(['summary', 'diary', 'extras', 'forum', 'theater', 'letters']);
  if (!subtitleAppIds.has(app.id)) return 0;
  const domain = homeArchiveDomainByApp.value.get(app.id);
  if (!domain) return 0;
  return app.id === 'extras' || app.id === 'forum' ? domain.collections : domain.items;
}

function formatHomeAppCount(app: PhoneAppDefinition) {
  const count = getHomeAppCount(app);
  return count > 99 ? '99+' : String(count);
}

function getHomeOrder() {
  return homeLayout.value.appOrder;
}

function clearAppDragLongPressTimer() {
  if (!appDragLongPressTimer) return;
  window.clearTimeout(appDragLongPressTimer);
  appDragLongPressTimer = null;
}

function resetAppDrag() {
  clearAppDragLongPressTimer();
  if (folderHoverTimer) window.clearTimeout(folderHoverTimer);
  folderHoverTimer = null;
  potentialFolderTargetToken = '';
  appDrag.itemToken = '';
  appDrag.destination = 'home';
  appDrag.deltaX = 0;
  appDrag.deltaY = 0;
  appDrag.folderTargetToken = '';
  appDrag.insertIndex = -1;
  appDrag.isDragging = false;
  appDrag.longPressReady = false;
  appDrag.pointerId = null;
  appDrag.startX = 0;
  appDrag.startY = 0;
}

function getHomeTileDragStyle(item: HomeDisplayItem): AppStyle {
  if (!appDrag.isDragging || appDrag.itemToken !== item.token) return {};
  return {
    '--pc-drag-x': `${appDrag.deltaX}px`,
    '--pc-drag-y': `${appDrag.deltaY}px`,
  };
}

function scheduleFolderTarget(token: string) {
  if (potentialFolderTargetToken === token) return;
  if (folderHoverTimer) window.clearTimeout(folderHoverTimer);
  folderHoverTimer = null;
  potentialFolderTargetToken = token;
  appDrag.folderTargetToken = '';
  if (!token) return;
  folderHoverTimer = window.setTimeout(() => {
    if (potentialFolderTargetToken === token && appDrag.isDragging) appDrag.folderTargetToken = token;
    folderHoverTimer = null;
  }, 380);
}

function resolveInsertIndex(clientX: number, clientY: number) {
  const order = getHomeOrder().filter(token => token !== appDrag.itemToken);
  const tiles = Array.from(homeGridEl.value?.querySelectorAll<HTMLElement>('.pc-app-tile[data-home-token]') ?? [])
    .filter(tile => tile.dataset.homeToken && tile.dataset.homeToken !== appDrag.itemToken)
    .sort((left, right) => {
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      return Math.abs(leftRect.top - rightRect.top) > 4 ? leftRect.top - rightRect.top : leftRect.left - rightRect.left;
    });
  for (const tile of tiles) {
    const rect = tile.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const centerX = rect.left + rect.width / 2;
    const isBeforeRow = clientY < centerY && clientY < rect.bottom;
    const isBeforeInRow = clientY >= rect.top && clientY <= rect.bottom && clientX < centerX;
    if (isBeforeRow || isBeforeInRow) return Math.max(0, order.indexOf(tile.dataset.homeToken || ''));
  }
  return order.length;
}

function onAppPointerDown(event: PointerEvent, appId: string) {
  if (event.button !== 0) return;
  appDrag.itemToken = appId;
  appDrag.destination = homeLayout.value.dockOrder.includes(appId) ? 'dock' : 'home';
  appDrag.pointerId = event.pointerId;
  appDrag.startX = event.clientX;
  appDrag.startY = event.clientY;
  appDrag.deltaX = 0;
  appDrag.deltaY = 0;
  appDrag.insertIndex = Math.max(0, getHomeOrder().indexOf(appId));
  appDrag.isDragging = false;
  appDrag.longPressReady = isOrganizing.value;
  clearAppDragLongPressTimer();
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  if (isOrganizing.value) return;
  appDragLongPressTimer = window.setTimeout(() => {
    if (appDrag.pointerId !== event.pointerId || appDrag.itemToken !== appId) return;
    appDrag.longPressReady = true;
    isOrganizing.value = true;
    appDragLongPressTimer = null;
  }, 360);
}

function onAppPointerMove(event: PointerEvent) {
  if (appDrag.pointerId !== event.pointerId || !appDrag.itemToken) return;
  const distance = Math.hypot(event.clientX - appDrag.startX, event.clientY - appDrag.startY);
  if (!appDrag.longPressReady) {
    if (distance > 8) clearAppDragLongPressTimer();
    return;
  }
  if (!appDrag.isDragging && distance > 6) appDrag.isDragging = true;
  if (!appDrag.isDragging) return;
  event.preventDefault();
  appDrag.deltaX = event.clientX - appDrag.startX;
  appDrag.deltaY = event.clientY - appDrag.startY;
  const dockRect = homeDockEl.value?.getBoundingClientRect();
  const inDock = Boolean(
    dockRect &&
    event.clientX >= dockRect.left &&
    event.clientX <= dockRect.right &&
    event.clientY >= dockRect.top &&
    event.clientY <= dockRect.bottom,
  );
  appDrag.destination = inDock ? 'dock' : 'home';
  let folderCandidate = '';
  if (!readHomeFolderToken(appDrag.itemToken)) {
    const target = [...(homeGridEl.value?.querySelectorAll<HTMLElement>('[data-home-token]') ?? [])]
      .filter(item => item.dataset.homeToken !== appDrag.itemToken)
      .find(item => {
        const rect = item.getBoundingClientRect();
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );
      });
    const targetToken = target?.dataset.homeToken || '';
    if (targetToken && targetToken !== appDrag.itemToken) {
      const rect = target.getBoundingClientRect();
      const centered =
        Math.abs(event.clientX - (rect.left + rect.width / 2)) < rect.width * 0.28 &&
        Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height * 0.28;
      if (centered) folderCandidate = targetToken;
    }
  }
  scheduleFolderTarget(inDock ? '' : folderCandidate);
  if (inDock && !appDrag.folderTargetToken) {
    const dockTiles = Array.from(homeDockEl.value?.querySelectorAll<HTMLElement>('[data-home-token]') ?? []).filter(
      tile => tile.dataset.homeToken !== appDrag.itemToken,
    );
    appDrag.insertIndex = dockTiles.findIndex(
      tile => event.clientX < tile.getBoundingClientRect().left + tile.offsetWidth / 2,
    );
    if (appDrag.insertIndex < 0) appDrag.insertIndex = dockTiles.length;
    return;
  }
  appDrag.insertIndex = resolveInsertIndex(event.clientX, event.clientY);
}

function commitAppDrag() {
  if (!appDrag.itemToken || !appDrag.isDragging) return;
  if (appDrag.destination === 'dock') {
    if (readHomeFolderToken(appDrag.itemToken)) {
      phone.noticeWarning('Dock 只能放置 App，分组请留在主界面');
      return;
    }
    const isAlreadyDocked = homeLayout.value.dockOrder.includes(appDrag.itemToken);
    if (!isAlreadyDocked && homeLayout.value.dockOrder.length >= settings.value.interfaceSize.dockColumns) {
      phone.noticeWarning('Dock 已满，请先移出一个 App');
      return;
    }
  }
  const layout = appDrag.folderTargetToken
    ? putHomeAppInFolder(homeLayout.value, appDrag.itemToken, appDrag.folderTargetToken)
    : moveHomeLayoutItem(
        homeLayout.value,
        appDrag.itemToken,
        appDrag.destination,
        appDrag.insertIndex,
        settings.value.interfaceSize.dockColumns,
      );
  settingsStore.setHomeLayout(layout);
  suppressHomeClickUntil.value = Date.now() + 250;
}

function onAppPointerUp(event: PointerEvent) {
  if (appDrag.pointerId !== event.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  if (appDrag.longPressReady || appDrag.isDragging) suppressHomeClickUntil.value = Date.now() + 250;
  commitAppDrag();
  resetAppDrag();
}

function onAppPointerCancel(event: PointerEvent) {
  if (appDrag.pointerId !== event.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  resetAppDrag();
}

function onHomeSwipeClickCapture(event: MouseEvent) {
  if (Date.now() >= suppressHomeClickUntil.value) return;
  event.preventDefault();
  event.stopPropagation();
}

function rememberHomeSource(folderId = '') {
  phone.recordHomeSource({ folderId: folderId || undefined, pageIndex: 1 });
}

function openHomeApp(appId: string, folderId = '') {
  if (Date.now() < suppressHomeClickUntil.value) return;
  rememberHomeSource(folderId);
  phone.openApp(appId);
}

function openHomeActivityItem(item: GenerationActivityItem) {
  rememberHomeSource();
  phone.pushRoute(item.appId, item.routePage, item.title, item.routeParams);
}

function getFolderStyle(item: HomeDisplayItem) {
  const firstApp = getFolderApps(item)[0];
  return firstApp ? getDisplayAppStyle(firstApp) : { '--app-accent': 'var(--pc-theme-accent)' };
}

function getFolderIconAssetPath(item: HomeDisplayItem) {
  const assetId = item.folder?.iconAssetId || '';
  return settings.value.homeIconAssets.find(asset => asset.id === assetId)?.path || '';
}

function openHomeItem(item: HomeDisplayItem) {
  if (Date.now() < suppressHomeClickUntil.value) return;
  if (item.folder) activeHomeFolderId.value = item.folder.id;
  else if (item.app) openHomeApp(item.app.id);
}

function resetHomeInteractionState() {
  resetAppDrag();
  resetFolderDrag();
  suppressHomeClickUntil.value = 0;
  isOrganizing.value = false;
  folderDissolving.value = false;
}

function closeHomeFolder() {
  if (folderDissolving.value) return;
  resetHomeInteractionState();
  activeHomeFolderId.value = '';
}

function openFolderCreator() {
  folderCreateName.value = '';
  folderCreateAppIds.value = [];
  folderCreateOpen.value = true;
}

function manageActiveHomeGroup() {
  const group = activeHomeGroup.value;
  if (!group) return openFolderCreator();
  activeHomeFolderId.value = group.id;
  isOrganizing.value = true;
}

function closeFolderCreator() {
  folderCreateOpen.value = false;
  folderCreateName.value = '';
  folderCreateAppIds.value = [];
}

function toggleFolderCreateApp(appId: string) {
  folderCreateAppIds.value = folderCreateAppIds.value.includes(appId)
    ? folderCreateAppIds.value.filter(id => id !== appId)
    : [...folderCreateAppIds.value, appId];
}

function createSelectedHomeFolder() {
  if (!folderCreateAppIds.value.length) return;
  const id = `home_folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  settingsStore.setHomeLayout(
    createHomeFolder(homeLayout.value, {
      appIds: folderCreateAppIds.value,
      id,
      name: folderCreateName.value,
    }),
  );
  closeFolderCreator();
  resetHomeInteractionState();
  activeHomeFolderId.value = id;
}

function renameActiveHomeFolder(name: string) {
  const folder = activeHomeFolder.value;
  if (!folder) return;
  settingsStore.setHomeLayout({
    ...homeLayout.value,
    folders: homeLayout.value.folders.map(item =>
      item.id === folder.id ? { ...item, name: name.trim() || '分组' } : item,
    ),
  });
}

function openFolderApp(appId: string) {
  if (isOrganizing.value || folderDrag.isDragging || Date.now() < suppressHomeClickUntil.value) return;
  const folderId = activeHomeFolderId.value;
  closeHomeFolder();
  openHomeApp(appId, folderId);
}

function resetFolderDrag() {
  folderDrag.appId = '';
  folderDrag.deltaX = 0;
  folderDrag.deltaY = 0;
  folderDrag.isDragging = false;
  folderDrag.pointerId = null;
  folderDrag.sourceIndex = -1;
  folderDrag.startX = 0;
  folderDrag.startY = 0;
  folderDrag.targetIndex = -1;
}

function getFolderTileDragStyle(appId: string): AppStyle {
  if (!folderDrag.isDragging || folderDrag.appId !== appId) return {};
  return {
    '--pc-drag-x': `${folderDrag.deltaX}px`,
    '--pc-drag-y': `${folderDrag.deltaY}px`,
  };
}

function onFolderAppPointerDown(event: PointerEvent, appId: string, index: number) {
  if (!isOrganizing.value || event.button !== 0) return;
  folderDrag.appId = appId;
  folderDrag.pointerId = event.pointerId;
  folderDrag.sourceIndex = index;
  folderDrag.targetIndex = index;
  folderDrag.startX = event.clientX;
  folderDrag.startY = event.clientY;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function onFolderAppPointerMove(event: PointerEvent) {
  if (folderDrag.pointerId !== event.pointerId || !folderDrag.appId) return;
  folderDrag.deltaX = event.clientX - folderDrag.startX;
  folderDrag.deltaY = event.clientY - folderDrag.startY;
  if (!folderDrag.isDragging && Math.hypot(folderDrag.deltaX, folderDrag.deltaY) > 6) folderDrag.isDragging = true;
  if (!folderDrag.isDragging) return;
  event.preventDefault();
  const target = [...document.querySelectorAll<HTMLElement>('.pc-home-folder-app[data-folder-index]')]
    .filter(item => Number(item.dataset.folderIndex) !== folderDrag.sourceIndex)
    .find(item => {
      const rect = item.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    });
  const targetIndex = Number(target?.dataset.folderIndex);
  if (Number.isInteger(targetIndex)) folderDrag.targetIndex = targetIndex;
}

function onFolderAppPointerUp(event: PointerEvent) {
  if (folderDrag.pointerId !== event.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  const folder = activeHomeFolder.value;
  if (folder && folderDrag.isDragging && folderDrag.targetIndex >= 0) {
    settingsStore.setHomeLayout(
      reorderHomeFolderApp(homeLayout.value, folder.id, folderDrag.appId, folderDrag.targetIndex),
    );
    suppressHomeClickUntil.value = Date.now() + 250;
  }
  resetFolderDrag();
}

function onFolderAppPointerCancel(event: PointerEvent) {
  if (folderDrag.pointerId !== event.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  resetFolderDrag();
}

function removeFolderApp(appId: string) {
  const folder = activeHomeFolder.value;
  if (!folder) return;
  settingsStore.setHomeLayout(
    removeHomeAppFromFolder(homeLayout.value, folder.id, appId, homeLayout.value.appOrder.length),
  );
  if (!settings.value.layout.folders.some(item => item.id === folder.id)) closeHomeFolder();
}

async function dissolveActiveHomeFolder() {
  const folder = activeHomeFolder.value;
  if (!folder || folderDissolving.value) return;
  folderDissolving.value = true;
  try {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    await new Promise(resolve => window.setTimeout(resolve, reduceMotion ? 0 : 160));
    const token = homeFolderToken(folder.id);
    const appOrder = homeLayout.value.appOrder.filter(item => item !== token);
    const dockOrder = homeLayout.value.dockOrder.filter(item => item !== token);
    const wasDocked = homeLayout.value.dockOrder.includes(token);
    const target = wasDocked ? dockOrder : appOrder;
    const sourceOrder = wasDocked ? homeLayout.value.dockOrder : homeLayout.value.appOrder;
    const index = Math.max(0, sourceOrder.indexOf(token));
    if (wasDocked) {
      const [firstAppId, ...remainingAppIds] = folder.appIds;
      if (firstAppId) dockOrder.splice(index, 0, firstAppId);
      appOrder.unshift(...remainingAppIds);
    } else {
      target.splice(index, 0, ...folder.appIds);
    }
    settingsStore.setHomeLayout({
      ...homeLayout.value,
      appOrder,
      dockOrder,
      folders: homeLayout.value.folders.filter(item => item.id !== folder.id),
    });
  } catch (caughtError) {
    phone.noticeError(caughtError instanceof Error ? caughtError.message : '解散分组失败');
  } finally {
    resetHomeInteractionState();
    activeHomeFolderId.value = '';
  }
}

watch(
  () => homeGroups.value.map(group => group.id).join('|'),
  () => {
    if (!homeGroups.value.some(group => group.id === activeHomeGroupId.value)) {
      activeHomeGroupId.value = homeGroups.value[0]?.id ?? '';
    }
  },
  { immediate: true },
);
watch(viewingScopeKey, refreshHomeArchiveDomains);
watch(
  () => currentRoute.value,
  async route => {
    if (route.appId !== 'home') {
      resetHomeInteractionState();
      activeHomeFolderId.value = '';
      folderCreateOpen.value = false;
      return;
    }
    activeHomeGroupId.value = homeGroups.value.some(group => group.id === route.homeSource?.folderId)
      ? route.homeSource?.folderId || ''
      : activeHomeGroupId.value || homeGroups.value[0]?.id || '';
    await nextTick();
    activeHomeFolderId.value = '';
    refreshHomeArchiveDomains();
  },
  { deep: true, immediate: true },
);
watch(isOpen, async nextIsOpen => {
  if (!nextIsOpen) {
    resetHomeInteractionState();
    activeHomeFolderId.value = '';
    folderCreateOpen.value = false;
    return;
  }
  await nextTick();
  refreshHomeArchiveDomains();
});

onBeforeUnmount(resetHomeInteractionState);
</script>

<style scoped>
.pc-home {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 0;
}
.pc-home-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pc-home-grid-wrap {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 6px;
  overflow-y: auto;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}
.pc-home-grid-wrap :deep(.pc-home-activity-page) {
  flex: 0 0 auto;
  max-height: 220px;
}
.pc-home-search {
  flex: 0 0 auto;
}
.pc-home-group-bar {
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid var(--pc-border);
  padding-bottom: 6px;
}
.pc-home-group-tabs {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.pc-home-group-tabs::-webkit-scrollbar {
  display: none;
}
.pc-home-group-tabs .pc-segment-btn {
  flex: 0 0 auto;
  white-space: nowrap;
}
.pc-home-group-tabs .pc-segment-btn.folder-target {
  outline: 2px solid var(--pc-theme-accent);
  outline-offset: -2px;
}
.pc-home-group-bar > .pc-soft-btn {
  flex: 0 0 auto;
}
.pc-home-app-section {
  display: grid;
  flex: 0 0 auto;
  gap: 6px;
}
.pc-home-section-head {
  padding-inline: 2px;
}
.pc-home-app-grid {
  display: grid;
  grid-template-columns: repeat(var(--pc-home-columns), minmax(0, 1fr));
  align-content: start;
  gap: 10px 6px;
}
.pc-app-tile {
  min-width: 0;
  min-height: 74px;
  border: 0;
  border-radius: var(--pc-card-radius);
  padding: 6px 4px;
  background: transparent;
  box-shadow: none;
  color: var(--pc-text);
  cursor: pointer;
  text-align: center;
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
.pc-app-tile strong {
  display: block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  font-style: normal;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-app-icon {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: var(--pc-icon-radius);
  display: grid;
  place-items: center;
  margin: 0 auto 10px;
  font-size: 17px;
}
.pc-app-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
:global(.pc-phone-root[data-home-columns='5'] .pc-home-app-grid) {
  gap: 4px;
}
:global(.pc-phone-root[data-home-columns='5'] .pc-app-tile) {
  padding-inline: 1px;
}
:global(.pc-phone-root[data-home-columns='5'] .pc-app-tile strong) {
  font-size: 10px;
}
:global(.pc-phone-root[data-home-columns='5'] .pc-app-count-badge) {
  top: -6px;
  right: -4px;
}
.pc-app-count-badge {
  position: absolute;
  top: -7px;
  right: -10px;
  display: grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  border: 2px solid var(--pc-surface);
  border-radius: 999px;
  padding: 0 4px;
  background: var(--pc-danger);
  color: var(--pc-primary-text);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  box-sizing: border-box;
}
.pc-home-dock {
  display: grid;
  grid-template-columns: repeat(var(--pc-dock-columns), minmax(0, 1fr));
  gap: 5px;
  padding: 4px 4px 3px;
  border: 0;
  border-top: 1px solid var(--pc-border);
  border-radius: 0;
  background: color-mix(in srgb, var(--pc-bg) 94%, var(--pc-dock-bg) 6%);
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
.pc-app-tile.dragging,
.pc-dock-tile.dragging {
  z-index: 3;
  opacity: 0.8;
  transform: translate3d(var(--pc-drag-x, 0), var(--pc-drag-y, 0), 0) scale(1.04);
  box-shadow: 0 12px 26px color-mix(in srgb, var(--pc-text) 18%, transparent 82%);
}
.pc-app-tile.folder-target {
  transform: scale(1.06);
  filter: brightness(1.08);
}
.pc-home-folder-backdrop {
  --pc-modal-z: 30;
  backdrop-filter: blur(8px);
  transition: opacity 0.18s ease;
}
.pc-home-folder-dialog {
  width: min(100%, 430px);
  height: calc(100% - 20px);
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
  transform-origin: center;
}
.pc-home-folder-head {
  flex-wrap: nowrap;
}
.pc-home-folder-name {
  min-width: 0;
  flex: 1;
}
.pc-home-folder-grid {
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(var(--pc-home-columns), minmax(0, 1fr));
  align-content: start;
  gap: 14px 8px;
  padding: 4px;
}
.pc-home-folder-app,
.pc-home-folder-app > button {
  min-width: 0;
}
.pc-home-folder-app {
  position: relative;
  border-radius: var(--pc-card-radius);
  touch-action: none;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.pc-home-folder-app > button {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  display: grid;
  justify-items: center;
  gap: 6px;
}
.pc-home-folder-app strong {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.pc-home-folder-app.dragging {
  z-index: 2;
  opacity: 0.8;
  transform: translate3d(var(--pc-drag-x, 0), var(--pc-drag-y, 0), 0) scale(1.04);
}
.pc-home-folder-app.drop-target:not(.dragging) {
  transform: scale(0.94);
  opacity: 0.7;
}
.pc-home-folder-remove {
  position: absolute;
  top: -4px;
  right: 0;
  width: 26px;
  height: 26px;
  font-size: 11px;
}
.pc-home-folder-create-backdrop {
  --pc-modal-z: 32;
}
.pc-home-folder-create-dialog {
  width: min(100%, 400px);
  max-height: calc(100% - 24px);
  min-height: 0;
  overflow: hidden;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
}
.pc-home-folder-picker {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(var(--pc-home-columns), minmax(0, 1fr));
  align-content: start;
  gap: 8px;
  margin: 0;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  padding: 10px;
}
.pc-home-folder-picker legend {
  padding: 0 5px;
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}
.pc-home-folder-choice {
  min-width: 0;
  position: relative;
  display: grid;
  justify-items: center;
  gap: 5px;
  border: 1px solid transparent;
  border-radius: var(--pc-control-radius);
  padding: 8px 2px;
  cursor: pointer;
}
.pc-home-folder-choice:has(input:checked) {
  border-color: var(--pc-theme-accent);
  background: color-mix(in srgb, var(--pc-theme-accent) 10%, transparent 90%);
}
.pc-home-folder-choice input {
  position: absolute;
  top: 4px;
  right: 4px;
}
.pc-home-folder-choice .pc-app-icon {
  margin-bottom: 0;
}
.pc-home-folder-choice strong {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
}
.pc-home-folder-enter-active,
.pc-home-folder-leave-active {
  transition: opacity 0.18s ease;
}
.pc-home-folder-enter-active .pc-home-folder-dialog,
.pc-home-folder-leave-active .pc-home-folder-dialog,
.pc-home-folder-enter-active .pc-home-folder-create-dialog,
.pc-home-folder-leave-active .pc-home-folder-create-dialog {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.pc-home-folder-enter-from,
.pc-home-folder-leave-to,
.pc-home-folder-backdrop.dissolving {
  opacity: 0;
}
.pc-home-folder-enter-from .pc-home-folder-dialog,
.pc-home-folder-leave-to .pc-home-folder-dialog,
.pc-home-folder-enter-from .pc-home-folder-create-dialog,
.pc-home-folder-leave-to .pc-home-folder-create-dialog,
.pc-home-folder-backdrop.dissolving .pc-home-folder-dialog {
  opacity: 0;
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
@media (prefers-reduced-motion: reduce) {
  .pc-app-tile,
  .pc-home-folder-app,
  .pc-home-folder-backdrop,
  .pc-home-folder-dialog,
  .pc-home-folder-enter-active,
  .pc-home-folder-leave-active,
  .pc-home-folder-enter-active .pc-home-folder-dialog,
  .pc-home-folder-leave-active .pc-home-folder-dialog,
  .pc-home-folder-enter-active .pc-home-folder-create-dialog,
  .pc-home-folder-leave-active .pc-home-folder-create-dialog {
    transition-duration: 0.01ms;
  }
}
</style>
