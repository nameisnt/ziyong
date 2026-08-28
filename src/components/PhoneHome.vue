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
          <nav
            ref="homeGroupTabsEl"
            class="pc-home-group-tabs"
            aria-label="主页分组"
            @click.capture="homeGroupScroll.onClickCapture"
            @pointerdown="homeGroupScroll.onPointerDown"
            @pointermove="homeGroupScroll.onPointerMove"
            @pointerup="homeGroupScroll.onPointerUp"
            @pointercancel="homeGroupScroll.onPointerCancel"
            @wheel="homeGroupScroll.onWheel"
          >
            <button
              v-for="group in homeGroups"
              :key="group.id"
              :class="[
                'pc-segment-btn compact',
                {
                  active: group.id === activeHomeGroupId,
                },
              ]"
              type="button"
              :data-home-token="homeFolderToken(group.id)"
              @click="activeHomeGroupId = group.id"
            >
              {{ group.name }}
            </button>
          </nav>
        </div>

        <section v-for="section in homeSections" :key="section.id" class="pc-home-app-section">
          <div v-if="section.title" class="pc-section-head pc-home-section-head">
            <strong>{{ section.title }}</strong
            ><span>{{ `${section.apps.length} 个 App` }}</span>
          </div>
          <div class="pc-home-app-grid">
            <button
              v-for="(app, index) in section.apps"
              :key="app.id"
              type="button"
              :class="[
                'pc-app-tile',
                {
                  dragging: section.draggable && folderDrag.appId === app.id && folderDrag.isDragging,
                  'drop-target': section.draggable && folderDrag.isDragging && folderDrag.targetIndex === index,
                },
              ]"
              :data-folder-id="section.draggable ? section.folderId : undefined"
              :data-folder-index="section.draggable ? index : undefined"
              :style="[getDisplayAppStyle(app), section.draggable ? getFolderTileDragStyle(app.id) : {}]"
              @click="openHomeApp(app.id, section.folderId)"
              @pointercancel="section.draggable && onFolderAppPointerCancel($event)"
              @pointerdown="section.draggable && onFolderAppPointerDown($event, app.id, index, section.folderId)"
              @pointermove="section.draggable && onFolderAppPointerMove($event)"
              @pointerup="section.draggable && onFolderAppPointerUp($event)"
            >
              <span class="pc-app-icon pc-app-icon-material">
                <AppIcon
                  :app-id="app.id"
                  :asset-path="getDisplayAppIconAssetPath(app)"
                  :default-icon="app.icon"
                  :icon="getDisplayAppIcon(app)"
                />
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
            :app-id="item.app?.id"
            :asset-path="item.app ? getDisplayAppIconAssetPath(item.app) : getFolderIconAssetPath(item)"
            :default-icon="item.app?.icon"
            :icon="item.app ? getDisplayAppIcon(item.app) : 'fa-folder'"
          />
          <span v-if="item.folder" class="pc-app-count-badge">{{ item.folder.appIds.length }}</span>
        </span>
        <strong>{{ item.app?.name || item.folder?.name }}</strong>
      </button>
    </nav>

    <Transition name="pc-home-folder">
      <section
        v-if="folderCreateOpen"
        class="pc-modal-backdrop pc-home-group-manager-backdrop"
        @click.self="closeFolderCreator"
      >
        <article
          ref="folderCreateDialogRef"
          class="pc-modal-dialog pc-home-group-manager-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="管理分组"
          tabindex="-1"
        >
          <header class="pc-section-head pc-home-group-manager-head">
            <span>
              <strong>管理分组</strong>
              <small>{{
                folderCreateAppIds.length ? `已选 ${folderCreateAppIds.length}` : '选择 App 后移动或新建分组'
              }}</small>
            </span>
            <div>
              <button
                class="pc-soft-btn compact"
                type="button"
                :disabled="!filteredFolderManagerApps.length"
                @click="toggleAllFolderManagerApps"
              >
                {{ allVisibleManagerAppsSelected ? '取消全选' : '全选' }}
              </button>
              <button class="pc-icon-btn" type="button" title="关闭" aria-label="关闭" @click="closeFolderCreator">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </header>

          <label class="pc-search-field">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="folderManagerQuery" type="search" placeholder="搜索 App" />
          </label>

          <div class="pc-home-group-manager-list">
            <div
              v-for="app in filteredFolderManagerApps"
              :key="app.id"
              class="pc-home-group-manager-row"
              :data-app-id="app.id"
              @click="toggleFolderCreateApp(app.id)"
            >
              <BulkSelectionCheckbox
                :model-value="folderCreateAppIds.includes(app.id)"
                :label="`选择${app.name}`"
                @update:model-value="toggleFolderCreateApp(app.id)"
              />
              <span class="pc-app-icon pc-app-icon-material">
                <AppIcon
                  :app-id="app.id"
                  :asset-path="getDisplayAppIconAssetPath(app)"
                  :default-icon="app.icon"
                  :icon="getDisplayAppIcon(app)"
                />
              </span>
              <span>
                <strong>{{ app.name }}</strong>
                <small>{{ getAppGroupName(app.id) }}</small>
              </span>
            </div>
            <EmptyState v-if="!filteredFolderManagerApps.length" compact title="没有匹配的 App" />
          </div>

          <footer class="pc-home-group-manager-actions">
            <template v-if="folderNewGroupOpen">
              <input v-model="folderCreateName" class="pc-field" maxlength="24" placeholder="新分组名称" />
              <button class="pc-soft-btn" type="button" @click="folderNewGroupOpen = false">取消</button>
              <button
                class="pc-primary-btn"
                type="button"
                :disabled="!folderCreateAppIds.length || !folderCreateName.trim()"
                @click="createSelectedHomeFolder"
              >
                创建并移入
              </button>
            </template>
            <template v-else>
              <select v-model="folderTargetId" class="pc-select" aria-label="目标分组">
                <option v-for="group in homeGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
              </select>
              <button
                class="pc-icon-btn"
                type="button"
                title="新建分组"
                aria-label="新建分组"
                :disabled="!folderCreateAppIds.length"
                @click="folderNewGroupOpen = true"
              >
                <i class="fa-solid fa-folder-plus"></i>
              </button>
              <button
                class="pc-primary-btn"
                type="button"
                :disabled="!folderCreateAppIds.length || !folderTargetId"
                @click="moveSelectedApps"
              >
                移动所选
              </button>
            </template>
          </footer>
        </article>
      </section>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import HomeActivityPage from '@/components/home/HomeActivityPage.vue';
import HomeContextBar from '@/components/home/HomeContextBar.vue';
import { useHomeLayoutProjection, type HomeDisplayItem } from '@/components/home/useHomeLayoutProjection';
import { useHorizontalDragScroll } from '@/composables/useHorizontalDragScroll';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import {
  createHomeFolder,
  homeFolderToken,
  moveHomeAppsToFolder,
  moveHomeLayoutItem,
  putHomeAppInFolder,
  readHomeFolderToken,
  reorderHomeFolderApp,
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
const homeGroupTabsEl = ref<HTMLElement | null>(null);
const homeGroupScroll = useHorizontalDragScroll(homeGroupTabsEl);
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
  folderId: '',
  isDragging: false,
  longPressReady: false,
  pointerId: null as number | null,
  sourceIndex: -1,
  startX: 0,
  startY: 0,
  targetIndex: -1,
});
const suppressHomeClickUntil = ref(0);
const activeHomeGroupId = ref('');
const appSearch = ref('');
const folderCreateDialogRef = ref<HTMLElement | null>(null);
const folderCreateOpen = ref(false);
const folderCreateName = ref('');
const folderCreateAppIds = ref<string[]>([]);
const folderManagerQuery = ref('');
const folderNewGroupOpen = ref(false);
const folderTargetId = ref('');
let appDragLongPressTimer: ReturnType<typeof window.setTimeout> | null = null;
let folderDragLongPressTimer: ReturnType<typeof window.setTimeout> | null = null;
let folderHoverTimer: ReturnType<typeof window.setTimeout> | null = null;
let potentialFolderTargetToken = '';

const { dockItems, folderCreationApps, getFolderApps, homeLayout, phoneAppById } = useHomeLayoutProjection();
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
const filteredFolderManagerApps = computed(() => {
  const query = folderManagerQuery.value.trim().toLocaleLowerCase();
  return folderCreationApps.value.filter(app => !query || `${app.name} ${app.id}`.toLocaleLowerCase().includes(query));
});
const allVisibleManagerAppsSelected = computed(
  () =>
    Boolean(filteredFolderManagerApps.value.length) &&
    filteredFolderManagerApps.value.every(app => folderCreateAppIds.value.includes(app.id)),
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
      draggable: true,
      folderId: activeHomeGroup.value?.id ?? '',
      id: `group:${activeHomeGroup.value?.id ?? 'none'}`,
      title: '',
    },
  ].filter(section => section.apps.length);
});
const homeArchiveDomains = ref(getChatArchiveDomains(viewingScopeKey.value));
const homeArchiveDomainByApp = computed(() => new Map(homeArchiveDomains.value.map(domain => [domain.appId, domain])));

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
  appDrag.longPressReady = false;
  clearAppDragLongPressTimer();
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  if (event.pointerType === 'mouse') {
    appDrag.longPressReady = true;
    return;
  }
  appDragLongPressTimer = window.setTimeout(() => {
    if (appDrag.pointerId !== event.pointerId || appDrag.itemToken !== appId) return;
    appDrag.longPressReady = true;
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
  if (item.folder) activeHomeGroupId.value = item.folder.id;
  else if (item.app) openHomeApp(item.app.id);
}

function resetHomeInteractionState() {
  resetAppDrag();
  resetFolderDrag();
  suppressHomeClickUntil.value = 0;
}

function openFolderCreator() {
  manageActiveHomeGroup();
  folderNewGroupOpen.value = true;
}

function manageActiveHomeGroup() {
  folderTargetId.value = activeHomeGroup.value?.id ?? homeGroups.value[0]?.id ?? '';
  folderCreateOpen.value = true;
}

function closeFolderCreator() {
  folderCreateOpen.value = false;
  folderCreateName.value = '';
  folderCreateAppIds.value = [];
  folderManagerQuery.value = '';
  folderNewGroupOpen.value = false;
  folderTargetId.value = '';
}

function toggleFolderCreateApp(appId: string) {
  folderCreateAppIds.value = folderCreateAppIds.value.includes(appId)
    ? folderCreateAppIds.value.filter(id => id !== appId)
    : [...folderCreateAppIds.value, appId];
}

function toggleAllFolderManagerApps() {
  const visibleIds = filteredFolderManagerApps.value.map(app => app.id);
  if (allVisibleManagerAppsSelected.value) {
    folderCreateAppIds.value = folderCreateAppIds.value.filter(appId => !visibleIds.includes(appId));
    return;
  }
  folderCreateAppIds.value = [...new Set([...folderCreateAppIds.value, ...visibleIds])];
}

function getAppGroupName(appId: string) {
  return homeGroups.value.find(group => group.appIds.includes(appId))?.name ?? '未分组';
}

function moveSelectedApps() {
  if (!folderCreateAppIds.value.length || !folderTargetId.value) return;
  settingsStore.setHomeLayout(moveHomeAppsToFolder(homeLayout.value, folderCreateAppIds.value, folderTargetId.value));
  activeHomeGroupId.value = folderTargetId.value;
  folderCreateAppIds.value = [];
}

function createSelectedHomeFolder() {
  if (!folderCreateAppIds.value.length || !folderCreateName.value.trim()) return;
  const id = `home_folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  settingsStore.setHomeLayout(
    createHomeFolder(homeLayout.value, {
      appIds: folderCreateAppIds.value,
      id,
      name: folderCreateName.value,
    }),
  );
  activeHomeGroupId.value = id;
  folderTargetId.value = id;
  folderCreateAppIds.value = [];
  folderCreateName.value = '';
  folderNewGroupOpen.value = false;
}

function resetFolderDrag() {
  if (folderDragLongPressTimer) window.clearTimeout(folderDragLongPressTimer);
  folderDragLongPressTimer = null;
  folderDrag.appId = '';
  folderDrag.deltaX = 0;
  folderDrag.deltaY = 0;
  folderDrag.folderId = '';
  folderDrag.isDragging = false;
  folderDrag.longPressReady = false;
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

function onFolderAppPointerDown(event: PointerEvent, appId: string, index: number, folderId: string) {
  if (event.button !== 0 || !folderId) return;
  resetFolderDrag();
  folderDrag.appId = appId;
  folderDrag.folderId = folderId;
  folderDrag.pointerId = event.pointerId;
  folderDrag.sourceIndex = index;
  folderDrag.targetIndex = index;
  folderDrag.startX = event.clientX;
  folderDrag.startY = event.clientY;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  if (event.pointerType === 'mouse') {
    folderDrag.longPressReady = true;
    return;
  }
  folderDragLongPressTimer = window.setTimeout(() => {
    if (folderDrag.pointerId !== event.pointerId || folderDrag.appId !== appId) return;
    folderDrag.longPressReady = true;
    folderDragLongPressTimer = null;
  }, 320);
}

function onFolderAppPointerMove(event: PointerEvent) {
  if (folderDrag.pointerId !== event.pointerId || !folderDrag.appId) return;
  folderDrag.deltaX = event.clientX - folderDrag.startX;
  folderDrag.deltaY = event.clientY - folderDrag.startY;
  const distance = Math.hypot(folderDrag.deltaX, folderDrag.deltaY);
  if (!folderDrag.longPressReady) {
    if (distance > 8 && folderDragLongPressTimer) {
      window.clearTimeout(folderDragLongPressTimer);
      folderDragLongPressTimer = null;
    }
    return;
  }
  if (!folderDrag.isDragging && distance > 6) folderDrag.isDragging = true;
  if (!folderDrag.isDragging) return;
  event.preventDefault();
  const target = [...document.querySelectorAll<HTMLElement>('.pc-app-tile[data-folder-index]')]
    .filter(item => item.dataset.folderId === folderDrag.folderId)
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
  const folder = homeLayout.value.folders.find(item => item.id === folderDrag.folderId);
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
      closeFolderCreator();
      return;
    }
    activeHomeGroupId.value = homeGroups.value.some(group => group.id === route.homeSource?.folderId)
      ? route.homeSource?.folderId || ''
      : activeHomeGroupId.value || homeGroups.value[0]?.id || '';
    await nextTick();
    refreshHomeArchiveDomains();
  },
  { deep: true, immediate: true },
);
watch(isOpen, async nextIsOpen => {
  if (!nextIsOpen) {
    resetHomeInteractionState();
    closeFolderCreator();
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
  touch-action: auto;
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
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
  touch-action: pan-x;
  cursor: grab;
  -webkit-overflow-scrolling: touch;
}

.pc-home-group-tabs:active {
  cursor: grabbing;
}
.pc-home-group-tabs::-webkit-scrollbar {
  display: none;
}
.pc-home-group-tabs .pc-segment-btn {
  flex: 0 0 auto;
  white-space: nowrap;
}
.pc-home-group-bar > .pc-icon-btn {
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
.pc-app-tile.drop-target:not(.dragging) {
  opacity: 0.7;
  transform: scale(0.94);
}
.pc-home-group-manager-backdrop {
  --pc-modal-z: 30;
}
.pc-home-group-manager-dialog {
  width: min(100%, 430px);
  height: calc(100% - 8px);
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 8px;
  padding: 12px;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
  transform-origin: center;
}
.pc-home-group-manager-head {
  flex-wrap: nowrap;
}
.pc-home-group-manager-head > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.pc-home-group-manager-head small,
.pc-home-group-manager-row small {
  color: var(--pc-muted);
  font-size: 11px;
}
.pc-home-group-manager-head > div {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
}
.pc-home-group-manager-list {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  align-content: start;
}
.pc-home-group-manager-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  min-height: 58px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--pc-border);
  cursor: pointer;
}
.pc-home-group-manager-row > .pc-app-icon {
  width: 36px;
  height: 36px;
  margin: 0;
  font-size: 14px;
}
.pc-home-group-manager-row > span:last-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.pc-home-group-manager-row strong {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-home-group-manager-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  border-top: 1px solid var(--pc-border);
  padding-top: 8px;
}
.pc-home-folder-enter-active,
.pc-home-folder-leave-active {
  transition: opacity 0.18s ease;
}
.pc-home-folder-enter-active .pc-home-group-manager-dialog,
.pc-home-folder-leave-active .pc-home-group-manager-dialog {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.pc-home-folder-enter-from,
.pc-home-folder-leave-to {
  opacity: 0;
}
.pc-home-folder-enter-from .pc-home-group-manager-dialog,
.pc-home-folder-leave-to .pc-home-group-manager-dialog {
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
  .pc-home-group-manager-backdrop,
  .pc-home-group-manager-dialog,
  .pc-home-folder-enter-active,
  .pc-home-folder-leave-active,
  .pc-home-folder-enter-active .pc-home-group-manager-dialog,
  .pc-home-folder-leave-active .pc-home-group-manager-dialog {
    transition-duration: 0.01ms;
  }
}
</style>
