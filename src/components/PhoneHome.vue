<template>
  <section class="pc-home">
    <div class="pc-home-main">
      <section class="pc-home-context">
        <div class="pc-home-context-copy">
          <span>{{ isViewingCurrentChat ? t`酒馆当前聊天` : t`历史聊天只读` }}</span>
          <strong>{{ viewingScopeMeta.ownerName }} / {{ viewingScopeMeta.chatTitle }}</strong>
        </div>
        <div class="pc-home-context-actions">
          <button
            class="pc-home-context-btn"
            type="button"
            :disabled="isViewingCurrentChat"
            :title="isViewingCurrentChat ? t`当前已经是酒馆当前聊天` : t`跳转酒馆聊天`"
            @click.stop="jumpViewingChatToTavern"
          >
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
          <button
            class="pc-home-context-btn"
            type="button"
            :disabled="isViewingCurrentChat"
            :title="t`回到酒馆当前聊天`"
            @click.stop="phone.returnToCurrentScope()"
          >
            <i class="fa-solid fa-location-crosshairs"></i>
          </button>
          <button
            class="pc-home-context-btn"
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
            v-for="item in currentHomePageItems"
            :key="item.token"
            type="button"
            :class="[
              'pc-app-tile',
              {
                dragging: appDrag.itemToken === item.token && appDrag.isDragging,
                'folder-target': appDrag.folderTargetToken === item.token,
                'insert-before': insertBeforeItemToken === item.token,
                'insert-end': insertBeforeItemToken === '__end__' && currentPageLastItemToken === item.token,
              },
            ]"
            :data-home-token="item.token"
            :style="item.app ? getDisplayAppStyle(item.app) : getFolderStyle(item)"
            @click="openHomeItem(item)"
            @pointercancel="onAppPointerCancel"
            @pointerdown="onAppPointerDown($event, item.token)"
            @pointermove="onAppPointerMove"
            @pointerup="onAppPointerUp"
          >
            <span class="pc-app-icon">
              <i class="fa-solid" :class="item.app ? getDisplayAppIcon(item.app) : 'fa-folder'"></i>
              <span v-if="item.folder" class="pc-app-count-badge">{{ item.folder.appIds.length }}</span>
              <span v-else-if="item.app && getHomeAppCount(item.app)" class="pc-app-count-badge">
                {{ formatHomeAppCount(item.app) }}
              </span>
            </span>
            <strong :title="item.app?.name || item.folder?.name">{{ item.app?.name || item.folder?.name }}</strong>
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

    <nav ref="homeDockEl" class="pc-home-dock" aria-label="底部 Dock" data-home-zone="dock">
      <button
        v-for="item in dockItems"
        :key="item.token"
        :class="['pc-dock-tile', { dragging: appDrag.itemToken === item.token && appDrag.isDragging }]"
        type="button"
        :data-home-token="item.token"
        :style="item.app ? getDisplayAppStyle(item.app) : getFolderStyle(item)"
        @click="openHomeItem(item)"
        @pointercancel="onAppPointerCancel"
        @pointerdown="onAppPointerDown($event, item.token)"
        @pointermove="onAppPointerMove"
        @pointerup="onAppPointerUp"
      >
        <span class="pc-app-icon">
          <i class="fa-solid" :class="item.app ? getDisplayAppIcon(item.app) : 'fa-folder'"></i>
          <span v-if="item.folder" class="pc-app-count-badge">{{ item.folder.appIds.length }}</span>
        </span>
        <strong>{{ item.app?.name || item.folder?.name }}</strong>
      </button>
    </nav>

    <section v-if="activeHomeFolder" class="pc-modal-backdrop pc-home-folder-backdrop" @click.self="closeHomeFolder">
      <article
        ref="homeFolderDialogRef"
        class="pc-section-card pc-modal-dialog pc-home-folder-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="主界面文件夹"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <input
            :value="activeHomeFolder.name"
            class="pc-field pc-home-folder-name"
            maxlength="24"
            @change="renameActiveHomeFolder(($event.target as HTMLInputElement).value)"
          />
          <button class="pc-soft-btn compact" type="button" @click="dissolveActiveHomeFolder">解散</button>
        </header>
        <div class="pc-home-folder-grid">
          <article v-for="(app, index) in activeHomeFolderApps" :key="app.id" class="pc-home-folder-app">
            <button type="button" :style="getDisplayAppStyle(app)" @click="openFolderApp(app.id)">
              <span class="pc-app-icon"><i class="fa-solid" :class="getDisplayAppIcon(app)"></i></span>
              <strong>{{ app.name }}</strong>
            </button>
            <div class="pc-home-folder-controls">
              <button class="pc-icon-btn" type="button" title="前移" aria-label="前移" @click="moveFolderApp(index, -1)">
                ‹
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                title="移出到主界面"
                aria-label="移出到主界面"
                @click="removeFolderApp(app.id)"
              >
                ↗
              </button>
              <button class="pc-icon-btn" type="button" title="后移" aria-label="后移" @click="moveFolderApp(index, 1)">
                ›
              </button>
            </div>
          </article>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import GenerationTaskCenter from '@/components/GenerationTaskCenter.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import { getRegisteredPhoneBackupRehydrateHandlers } from '@/core/appRegistry';
import {
  homeFolderToken,
  moveHomeLayoutItem,
  normalizeHomeLayout,
  putHomeAppInFolder,
  readHomeFolderToken,
  removeHomeAppFromFolder,
} from '@/core/appLayout';
import { getPhoneApps, type PhoneAppDefinition } from '@/data/apps';
import { useBaguStore } from '@/store/bagu';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useReaderStore } from '@/store/reader';
import { useRecoveryStore } from '@/store/recovery';
import { useSettingsStore } from '@/store/settings';
import { useStatsStore } from '@/store/stats';
import { getChatArchiveDomains } from '@/util/chatArchive';
import { jumpToTavernChat } from '@/util/tavernNavigation';
import { storeToRefs } from 'pinia';

type AppStyle = Record<string, string>;

const { getDisplayAppIcon, getDisplayAppStyle } = defineProps<{
  getDisplayAppIcon: (app: PhoneAppDefinition) => string;
  getDisplayAppStyle: (app: PhoneAppDefinition) => AppStyle;
}>();

const bagu = useBaguStore();
const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const reader = useReaderStore();
const recovery = useRecoveryStore();
const settingsStore = useSettingsStore();
const stats = useStatsStore();
const { currentRoute, isOpen, isViewingCurrentChat, viewingScopeKey, viewingScopeMeta } = storeToRefs(phone);
const { settings } = storeToRefs(settingsStore);
const homeGridEl = ref<HTMLElement | null>(null);
const homeDockEl = ref<HTMLElement | null>(null);
const refreshingPhoneData = ref(false);
const appDrag = reactive({
  itemToken: '',
  destination: 'home' as 'dock' | 'home',
  folderTargetToken: '',
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
const activeHomeFolderId = ref('');
const homeFolderDialogRef = ref<HTMLElement | null>(null);
let dragPageTimer: ReturnType<typeof window.setTimeout> | null = null;
let appDragLongPressTimer: ReturnType<typeof window.setTimeout> | null = null;

type HomeDisplayItem = {
  app: PhoneAppDefinition | null;
  folder: ReturnType<typeof normalizeHomeLayout>['folders'][number] | null;
  token: string;
};

const homeLayout = computed(() => normalizeHomeLayout(settings.value.layout));
const phoneAppById = computed(() => new Map(getPhoneApps().map(app => [app.id, app])));
const gridItems = computed(() => homeLayout.value.appOrder.map(resolveHomeDisplayItem).filter(Boolean) as HomeDisplayItem[]);
const dockItems = computed(() => homeLayout.value.dockOrder.map(resolveHomeDisplayItem).filter(Boolean) as HomeDisplayItem[]);
const homePages = computed(() => {
  const pages: HomeDisplayItem[][] = [];
  for (let index = 0; index < gridItems.value.length; index += homePageSize.value) {
    pages.push(gridItems.value.slice(index, index + homePageSize.value));
  }
  return pages.length ? pages : [[]];
});
const currentHomePageItems = computed(() => homePages.value[homePageIndex.value] ?? homePages.value[0] ?? []);
const currentPageStartIndex = computed(() => homePageIndex.value * homePageSize.value);
const currentPageLastItemToken = computed(() => currentHomePageItems.value.at(-1)?.token || '');
const activeHomeFolder = computed(() => homeLayout.value.folders.find(folder => folder.id === activeHomeFolderId.value) ?? null);
const activeHomeFolderApps = computed(() =>
  (activeHomeFolder.value?.appIds ?? []).flatMap(appId => {
    const app = phoneAppById.value.get(appId);
    return app ? [app] : [];
  }),
);
const homeArchiveDomains = ref(getChatArchiveDomains(viewingScopeKey.value));
const homeArchiveDomainByApp = computed(() => new Map(homeArchiveDomains.value.map(domain => [domain.appId, domain])));
const insertBeforeItemToken = computed(() => {
  if (!appDrag.isDragging || !appDrag.itemToken || appDrag.destination === 'dock') return '';
  const order = homeLayout.value.appOrder.filter(id => id !== appDrag.itemToken);
  if (appDrag.insertIndex < 0) return '';
  const currentPageIds = currentHomePageItems.value.map(item => item.token).filter(id => id !== appDrag.itemToken);
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

usePhoneModalLifecycle({
  dialogRef: homeFolderDialogRef,
  isOpen: () => Boolean(activeHomeFolder.value),
  onClose: closeHomeFolder,
});

function resolveHomeDisplayItem(token: string): HomeDisplayItem | null {
  const folderId = readHomeFolderToken(token);
  if (folderId) {
    const folder = homeLayout.value.folders.find(item => item.id === folderId);
    return folder ? { app: null, folder, token } : null;
  }
  const app = phoneAppById.value.get(token);
  return app ? { app, folder: null, token } : null;
}

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
  appDrag.itemToken = '';
  appDrag.destination = 'home';
  appDrag.folderTargetToken = '';
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
  const tiles = Array.from(homeGridEl.value?.querySelectorAll<HTMLElement>('.pc-app-tile[data-home-token]') ?? []).filter(
    tile => tile.dataset.homeToken && tile.dataset.homeToken !== appDrag.itemToken,
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
  if (nextPage < 0 || nextPage >= homePages.value.length || dragPageTimer) return;
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
  if (clientX < rect.left + edgeSize) return scheduleDragPageSwitch(-1);
  if (clientX > rect.right - edgeSize) return scheduleDragPageSwitch(1);
  if (dragPageTimer) {
    window.clearTimeout(dragPageTimer);
    dragPageTimer = null;
  }
}

function onAppPointerDown(event: PointerEvent, appId: string) {
  if (event.button !== 0) return;
  appDrag.itemToken = appId;
  appDrag.destination = homeLayout.value.dockOrder.includes(appId) ? 'dock' : 'home';
  appDrag.pointerId = event.pointerId;
  appDrag.startX = event.clientX;
  appDrag.startY = event.clientY;
  appDrag.insertIndex = Math.max(0, getHomeOrder().indexOf(appId));
  appDrag.isDragging = false;
  appDrag.longPressReady = false;
  clearAppDragLongPressTimer();
  appDragLongPressTimer = window.setTimeout(() => {
    if (appDrag.pointerId !== event.pointerId || appDrag.itemToken !== appId) return;
    appDrag.longPressReady = true;
    appDragLongPressTimer = null;
  }, 360);
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
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
  const dockRect = homeDockEl.value?.getBoundingClientRect();
  const inDock = Boolean(
    dockRect &&
      event.clientX >= dockRect.left &&
      event.clientX <= dockRect.right &&
      event.clientY >= dockRect.top &&
      event.clientY <= dockRect.bottom,
  );
  appDrag.destination = inDock ? 'dock' : 'home';
  appDrag.folderTargetToken = '';
  if (!readHomeFolderToken(appDrag.itemToken)) {
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-home-token]');
    const targetToken = target?.dataset.homeToken || '';
    if (targetToken && targetToken !== appDrag.itemToken) {
      const rect = target.getBoundingClientRect();
      const centered =
        Math.abs(event.clientX - (rect.left + rect.width / 2)) < rect.width * 0.28 &&
        Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height * 0.28;
      if (centered) appDrag.folderTargetToken = targetToken;
    }
  }
  if (inDock && !appDrag.folderTargetToken) {
    const dockTiles = Array.from(homeDockEl.value?.querySelectorAll<HTMLElement>('[data-home-token]') ?? []).filter(
      tile => tile.dataset.homeToken !== appDrag.itemToken,
    );
    appDrag.insertIndex = dockTiles.findIndex(tile => event.clientX < tile.getBoundingClientRect().left + tile.offsetWidth / 2);
    if (appDrag.insertIndex < 0) appDrag.insertIndex = dockTiles.length;
    return;
  }
  updateDragPageSwitch(event.clientX);
  appDrag.insertIndex = resolveInsertIndex(event.clientX, event.clientY);
}

function commitAppDrag() {
  if (!appDrag.itemToken || !appDrag.isDragging) return;
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

function onHomeSwipePointerDown(event: PointerEvent) {
  if (event.button !== 0 || homePages.value.length <= 1) return;
  const target = event.target;
  if (target instanceof Element && target.closest('.pc-page-dots, .pc-home-context, .pc-generation-task-center, .pc-home-dock'))
    return;
  homeSwipe.pointerId = event.pointerId;
  homeSwipe.startX = event.clientX;
  homeSwipe.startY = event.clientY;
  homeSwipe.swiping = false;
  homeSwipe.tracking = true;
}

function onHomeSwipePointerMove(event: PointerEvent) {
  if (!homeSwipe.tracking || homeSwipe.pointerId !== event.pointerId) return;
  if (appDrag.longPressReady || appDrag.isDragging) return resetHomeSwipe();
  const deltaX = event.clientX - homeSwipe.startX;
  const deltaY = event.clientY - homeSwipe.startY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (!homeSwipe.swiping && absX > 12 && absX > absY * 1.25) {
    homeSwipe.swiping = true;
    clearAppDragLongPressTimer();
  }
  if (homeSwipe.swiping) event.preventDefault();
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
  if (homeSwipe.pointerId === event.pointerId) resetHomeSwipe();
}

function openHomeApp(appId: string) {
  if (Date.now() >= suppressHomeClickUntil.value) phone.openApp(appId);
}

function getFolderStyle(item: HomeDisplayItem) {
  const firstApp = item.folder?.appIds.map(appId => phoneAppById.value.get(appId)).find(Boolean);
  return firstApp ? getDisplayAppStyle(firstApp) : { '--app-accent': 'var(--pc-theme-accent)' };
}

function openHomeItem(item: HomeDisplayItem) {
  if (Date.now() < suppressHomeClickUntil.value) return;
  if (item.folder) activeHomeFolderId.value = item.folder.id;
  else if (item.app) openHomeApp(item.app.id);
}

function closeHomeFolder() {
  activeHomeFolderId.value = '';
}

function renameActiveHomeFolder(name: string) {
  const folder = activeHomeFolder.value;
  if (!folder) return;
  settingsStore.setHomeLayout({
    ...homeLayout.value,
    folders: homeLayout.value.folders.map(item =>
      item.id === folder.id ? { ...item, name: name.trim() || '文件夹' } : item,
    ),
  });
}

function openFolderApp(appId: string) {
  closeHomeFolder();
  openHomeApp(appId);
}

function moveFolderApp(index: number, offset: -1 | 1) {
  const folder = activeHomeFolder.value;
  if (!folder) return;
  const target = index + offset;
  if (target < 0 || target >= folder.appIds.length) return;
  const folders = homeLayout.value.folders.map(item => {
    if (item.id !== folder.id) return item;
    const appIds = [...item.appIds];
    const [appId] = appIds.splice(index, 1);
    if (appId) appIds.splice(target, 0, appId);
    return { ...item, appIds };
  });
  settingsStore.setHomeLayout({ ...homeLayout.value, folders });
}

function removeFolderApp(appId: string) {
  const folder = activeHomeFolder.value;
  if (!folder) return;
  settingsStore.setHomeLayout(
    removeHomeAppFromFolder(homeLayout.value, folder.id, appId, currentPageStartIndex.value + currentHomePageItems.value.length),
  );
  if (!settings.value.layout.folders.some(item => item.id === folder.id)) closeHomeFolder();
}

function dissolveActiveHomeFolder() {
  const folder = activeHomeFolder.value;
  if (!folder) return;
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
  closeHomeFolder();
}

async function jumpViewingChatToTavern() {
  if (isViewingCurrentChat.value) return;
  const target = phone.getTavernJumpTarget();
  if (!target) return toastr.warning('当前阅览没有对应的酒馆聊天');
  try {
    await jumpToTavernChat({ chatFile: target.chatId, characterId: target.characterId, ownerName: target.ownerName });
    phone.closePhone();
    window.setTimeout(() => void phone.syncCurrentTavernScope(true), 2400);
    toastr.success('正在跳转到酒馆聊天');
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '跳转酒馆聊天失败');
  }
}

async function refreshPhoneData() {
  if (refreshingPhoneData.value) return;
  if (generationTasks.hasRunningTasks) return phone.noticeWarning('生成任务运行中，请暂停或等待任务完成后再刷新');
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
    refreshHomeArchiveDomains();
    phone.noticeSuccess('插件数据已刷新');
  } catch (caughtError) {
    phone.noticeError(caughtError instanceof Error ? caughtError.message : '刷新插件数据失败');
  } finally {
    refreshingPhoneData.value = false;
  }
}

watch(
  () => homePages.value.length,
  pageCount => {
    homePageIndex.value = Math.min(homePageIndex.value, Math.max(0, pageCount - 1));
  },
);
watch(viewingScopeKey, refreshHomeArchiveDomains);
watch(
  () => currentRoute.value.appId,
  async appId => {
    if (appId !== 'home') return;
    await nextTick();
    refreshHomeArchiveDomains();
  },
);
watch(isOpen, async nextIsOpen => {
  if (!nextIsOpen) return;
  await nextTick();
  refreshHomeArchiveDomains();
});
</script>

<style scoped>
.pc-home { min-height: 100%; display: flex; flex-direction: column; gap: 12px; padding-bottom: 0; }
.pc-home-main { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.pc-home-context { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; padding: 12px 14px; border: 1px solid var(--pc-border); border-radius: var(--pc-card-radius); background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%); backdrop-filter: blur(12px); }
.pc-home-context-copy { min-width: 0; flex: 1 1 auto; }
.pc-home-context-copy span, .pc-home-context-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-home-context-copy span { color: var(--pc-muted); font-size: 12px; }
.pc-home-context-copy strong { margin-top: 3px; font-size: 14px; }
.pc-home-context-actions { display: flex; flex: 0 0 auto; gap: 8px; }
.pc-home-context-btn { width: 40px; height: 40px; border: 0; border-radius: var(--pc-control-radius); background: var(--pc-surface-strong); color: var(--pc-text); cursor: pointer; }
.pc-home-context-btn:disabled { cursor: default; opacity: 0.45; }
.pc-grid { display: grid; grid-template-columns: repeat(var(--pc-home-columns), minmax(0, 1fr)); gap: 10px; align-content: start; }
.pc-home-grid-wrap { flex: 1 1 auto; display: grid; grid-template-rows: minmax(0, 1fr) auto; min-height: 0; gap: 10px; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.pc-app-tile { min-height: 104px; border: 0; border-radius: var(--pc-card-radius); padding: 10px 8px; background: transparent; box-shadow: none; color: var(--pc-text); cursor: pointer; text-align: center; touch-action: none; transition: background 0.16s ease, opacity 0.16s ease, transform 0.16s ease; }
.pc-app-tile:hover { background: transparent; }
.pc-app-tile:active { transform: scale(0.98); }
.pc-app-tile strong { display: block; width: 100%; min-width: 0; overflow: hidden; font-size: 11px; font-style: normal; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.pc-app-icon { position: relative; width: 44px; height: 44px; border-radius: var(--pc-icon-radius); display: grid; place-items: center; margin: 0 auto 10px; background: var(--pc-app-icon-bg); color: var(--pc-accent); font-size: 17px; }
:global(.pc-phone-root[data-home-columns='5'] .pc-grid) { gap: 4px; }
:global(.pc-phone-root[data-home-columns='5'] .pc-app-tile) { padding-inline: 1px; }
:global(.pc-phone-root[data-home-columns='5'] .pc-app-tile strong) { font-size: 10px; }
:global(.pc-phone-root[data-home-columns='5'] .pc-app-count-badge) { top: -6px; right: -4px; }
.pc-app-count-badge { position: absolute; top: -7px; right: -10px; display: grid; min-width: 18px; height: 18px; place-items: center; border: 2px solid var(--pc-surface); border-radius: 999px; padding: 0 4px; background: var(--pc-danger); color: var(--pc-primary-text); font-size: 10px; font-weight: 800; line-height: 1; box-sizing: border-box; }
.pc-page-dots { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 20px; }
.pc-page-dot { width: 7px; height: 7px; border: 0; border-radius: 999px; padding: 0; background: color-mix(in srgb, var(--pc-muted) 42%, transparent 58%); cursor: pointer; }
.pc-page-dot.active { width: 18px; background: var(--pc-dock-active); }
.pc-home-dock { display: grid; grid-template-columns: repeat(var(--pc-dock-columns), minmax(0, 1fr)); gap: 8px; padding: 10px; border: 1px solid var(--pc-border); border-radius: calc(var(--pc-card-radius) + 4px); background: color-mix(in srgb, var(--pc-dock-bg) 82%, transparent 18%); backdrop-filter: blur(18px); }
.pc-dock-tile { min-width: 0; border: 0; border-radius: var(--pc-card-radius); background: transparent; color: var(--pc-text); cursor: pointer; padding: 4px 2px 3px; }
.pc-dock-tile .pc-app-icon { width: 38px; height: 38px; margin-bottom: 5px; border-radius: var(--pc-icon-radius); font-size: 15px; }
.pc-dock-tile strong { display: block; overflow: hidden; font-size: 11px; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; }
.pc-grid.sorting .pc-app-tile { cursor: grabbing; }
.pc-app-tile.dragging { opacity: 0.55; transform: scale(0.94); }
.pc-app-tile.folder-target { transform: scale(1.06); filter: brightness(1.08); }
.pc-home-folder-backdrop { --pc-modal-z: 30; backdrop-filter: blur(8px); }
.pc-home-folder-dialog { width: min(100%, 310px); max-height: 72%; overflow: auto; display: grid; gap: 14px; }
.pc-home-folder-name { min-width: 0; flex: 1; }
.pc-home-folder-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 8px; }
.pc-home-folder-app, .pc-home-folder-app > button { min-width: 0; }
.pc-home-folder-app > button { width: 100%; border: 0; background: transparent; color: var(--pc-text); display: grid; justify-items: center; gap: 6px; }
.pc-home-folder-app strong { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.pc-home-folder-controls { display: flex; justify-content: center; gap: 2px; margin-top: 4px; }
/* ui-reuse-allow: D-STRUCT-PHONE-001 preserves the existing compact three-button folder ordering rail. */
.pc-home-folder-controls .pc-icon-btn { width: 24px; height: 24px; font-size: 12px; }
.pc-app-tile.insert-before, .pc-app-tile.insert-end { position: relative; }
.pc-app-tile.insert-before::before, .pc-app-tile.insert-end::after { content: ''; position: absolute; top: 12px; bottom: 12px; width: 3px; border-radius: 999px; background: var(--pc-dock-active); box-shadow: 0 0 0 3px color-mix(in srgb, var(--pc-dock-active) 16%, transparent); }
.pc-app-tile.insert-before::before { left: -6px; }
.pc-app-tile.insert-end::after { right: -6px; }
</style>
