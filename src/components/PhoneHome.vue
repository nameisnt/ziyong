<template>
  <section class="pc-home">
    <div class="pc-home-main">
      <HomeContextBar
        :is-organizing="isOrganizing"
        @open-folder-creator="openFolderCreator"
        @refreshed="refreshHomeArchiveDomains"
        @toggle-organizing="isOrganizing = !isOrganizing"
      />

      <section
        ref="homeGridEl"
        class="pc-home-grid-wrap"
        @click.capture="onHomeSwipeClickCapture"
        @pointercancel="onHomeSwipePointerCancel"
        @pointerdown="onHomeSwipePointerDown"
        @pointermove="onHomeSwipePointerMove"
        @pointerup="onHomeSwipePointerUp"
      >
        <HomeActivityPage :active="true" @open="openHomeActivityItem" />
        <section
          :class="['pc-grid', { sorting: appDrag.isDragging || isOrganizing }]"
          :style="{ '--pc-home-rows': settings.interfaceSize.homeRows }"
        >
          <template v-for="item in currentHomePageItems" :key="item.token">
            <article
              v-if="item.folder"
              :class="[
                'pc-app-tile pc-home-folder-tile',
                {
                  dragging: appDrag.itemToken === item.token && appDrag.isDragging,
                  'folder-target': appDrag.folderTargetToken === item.token,
                  'insert-before': insertBeforeItemToken === item.token,
                  'insert-end': insertBeforeItemToken === '__end__' && currentPageLastItemToken === item.token,
                },
              ]"
              :data-home-token="item.token"
              :style="[getFolderStyle(item), getHomeGridPlacementStyle(item), getHomeTileDragStyle(item)]"
              @click="openHomeFolderItem(item)"
              @pointercancel="onAppPointerCancel"
              @pointerdown="onAppPointerDown($event, item.token)"
              @pointermove="onAppPointerMove"
              @pointerup="onAppPointerUp"
            >
              <div class="pc-home-folder-preview">
                <button
                  v-for="app in getFolderShortcutApps(item)"
                  :key="app.id"
                  class="pc-home-folder-shortcut"
                  type="button"
                  :title="app.name"
                  :aria-label="`打开 ${app.name}`"
                  :style="getDisplayAppStyle(app)"
                  @click.stop="openFolderShortcut(app.id)"
                  @pointerdown="onFolderNestedPointerDown"
                >
                  <span class="pc-app-icon pc-app-icon-material">
                    <AppIcon :asset-path="getDisplayAppIconAssetPath(app)" :icon="getDisplayAppIcon(app)" />
                  </span>
                </button>
                <button
                  class="pc-home-folder-more"
                  type="button"
                  :title="`打开 ${item.folder.name}`"
                  :aria-label="`打开 ${item.folder.name}，共 ${item.folder.appIds.length} 个 App`"
                  @click.stop="openHomeFolderItem(item)"
                  @pointerdown="onFolderNestedPointerDown"
                >
                  <span v-if="getFolderRemainingApps(item).length" class="pc-home-folder-more-grid">
                    <span
                      v-for="app in getFolderRemainingApps(item)"
                      :key="app.id"
                      class="pc-home-folder-mini-icon pc-app-icon-material"
                      :style="getDisplayAppStyle(app)"
                    >
                      <AppIcon :asset-path="getDisplayAppIconAssetPath(app)" :icon="getDisplayAppIcon(app)" />
                    </span>
                  </span>
                  <i v-else class="fa-solid fa-folder-open"></i>
                  <small>{{ item.folder.appIds.length > 3 ? `+${item.folder.appIds.length - 3}` : '全部' }}</small>
                </button>
              </div>
              <button
                class="pc-home-folder-title"
                type="button"
                :title="`打开 ${item.folder.name}`"
                @click.stop="openHomeFolderItem(item)"
                @pointerdown="onFolderNestedPointerDown"
              >
                <span v-if="getFolderIconAssetPath(item)" class="pc-home-folder-title-icon">
                  <AppIcon :asset-path="getFolderIconAssetPath(item)" icon="fa-folder" />
                </span>
                <strong>{{ item.folder.name }}</strong>
                <span class="pc-app-count-badge">{{ item.folder.appIds.length }}</span>
              </button>
            </article>

            <button
              v-else-if="item.app"
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
              :style="[getDisplayAppStyle(item.app), getHomeGridPlacementStyle(item), getHomeTileDragStyle(item)]"
              @click="openHomeItem(item)"
              @pointercancel="onAppPointerCancel"
              @pointerdown="onAppPointerDown($event, item.token)"
              @pointermove="onAppPointerMove"
              @pointerup="onAppPointerUp"
            >
              <span class="pc-app-icon pc-app-icon-material">
                <AppIcon :asset-path="getDisplayAppIconAssetPath(item.app)" :icon="getDisplayAppIcon(item.app)" />
                <span v-if="getHomeAppCount(item.app)" class="pc-app-count-badge">
                  {{ formatHomeAppCount(item.app) }}
                </span>
              </span>
              <strong :title="item.app.name">{{ item.app.name }}</strong>
            </button>
          </template>
        </section>

        <div v-if="homePages.length > 1" class="pc-page-dots">
          <button
            v-for="(_, pageIndex) in homePages"
            :key="pageIndex"
            :class="['pc-page-dot', { active: pageIndex + 1 === homePageIndex }]"
            type="button"
            :title="`第 ${pageIndex + 1} 页`"
            @click="homePageIndex = pageIndex + 1"
            @pointerenter="switchDragPage(pageIndex + 1)"
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
          aria-label="主界面文件夹"
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
              class="pc-icon-btn danger"
              type="button"
              :disabled="folderDissolving"
              title="解散文件夹"
              aria-label="解散文件夹"
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
                v-if="isOrganizing"
                class="pc-icon-btn pc-home-folder-remove"
                type="button"
                title="移出到主界面"
                aria-label="移出到主界面"
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
          aria-label="新建文件夹"
          tabindex="-1"
          @submit.prevent="createSelectedHomeFolder"
        >
          <header class="pc-section-head"><strong>新建文件夹</strong></header>
          <label class="pc-field-group">
            <span class="pc-field-label">名称</span>
            <input v-model="folderCreateName" class="pc-field" maxlength="24" placeholder="文件夹名称" />
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
import HomeActivityPage from '@/components/home/HomeActivityPage.vue';
import HomeContextBar from '@/components/home/HomeContextBar.vue';
import {
  useHomeLayoutProjection,
  type HomeDisplayItem,
  type HomeGridDisplayItem,
} from '@/components/home/useHomeLayoutProjection';
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
import type { PhoneAppDefinition } from '@/data/apps';
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
const homeSwipe = reactive({
  pointerId: null as number | null,
  startX: 0,
  startY: 0,
  swiping: false,
  tracking: false,
});
const suppressHomeClickUntil = ref(0);
const homePageIndex = ref(1);
const isOrganizing = ref(false);
const activeHomeFolderId = ref('');
const homeFolderDialogRef = ref<HTMLElement | null>(null);
const folderCreateDialogRef = ref<HTMLElement | null>(null);
const folderCreateOpen = ref(false);
const folderCreateName = ref('');
const folderCreateAppIds = ref<string[]>([]);
const folderDissolving = ref(false);
let dragPageTimer: ReturnType<typeof window.setTimeout> | null = null;
let appDragLongPressTimer: ReturnType<typeof window.setTimeout> | null = null;
let folderHoverTimer: ReturnType<typeof window.setTimeout> | null = null;
let potentialFolderTargetToken = '';

const {
  activeHomeFolder,
  activeHomeFolderApps,
  clampHomePageIndex,
  currentHomePageItems,
  currentPageLastItemToken,
  currentPageStartIndex,
  dockItems,
  folderCreationApps,
  getFolderApps,
  getFolderRemainingApps,
  getFolderShortcutApps,
  homeLayout,
  homePages,
} = useHomeLayoutProjection(homePageIndex, activeHomeFolderId);
const homeArchiveDomains = ref(getChatArchiveDomains(viewingScopeKey.value));
const homeArchiveDomainByApp = computed(() => new Map(homeArchiveDomains.value.map(domain => [domain.appId, domain])));
const insertBeforeItemToken = computed(() => {
  if (!appDrag.isDragging || !appDrag.itemToken || appDrag.destination === 'dock') return '';
  const order = homeLayout.value.appOrder.filter(id => id !== appDrag.itemToken);
  if (appDrag.insertIndex < 0) return '';
  const currentPageIds = currentHomePageItems.value.map(item => item.token).filter(id => id !== appDrag.itemToken);
  const currentPageIndexes = currentPageIds.map(token => order.indexOf(token)).filter(index => index >= 0);
  const currentPageEnd = currentPageIndexes.length ? Math.max(...currentPageIndexes) + 1 : 0;
  if (currentPageIds.length && appDrag.insertIndex >= currentPageEnd) return '__end__';
  if (appDrag.insertIndex >= order.length) return '__end__';
  return order[appDrag.insertIndex] || '';
});

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
  if (dragPageTimer) {
    window.clearTimeout(dragPageTimer);
    dragPageTimer = null;
  }
}

function getHomeTileDragStyle(item: HomeDisplayItem): AppStyle {
  if (!appDrag.isDragging || appDrag.itemToken !== item.token) return {};
  return {
    '--pc-drag-x': `${appDrag.deltaX}px`,
    '--pc-drag-y': `${appDrag.deltaY}px`,
  };
}

function getHomeGridPlacementStyle(item: HomeGridDisplayItem): AppStyle {
  return {
    'grid-column': `${item.column} / span ${item.columnSpan}`,
    'grid-row': `${item.row} / span ${item.rowSpan}`,
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

function resetHomeSwipe() {
  homeSwipe.pointerId = null;
  homeSwipe.startX = 0;
  homeSwipe.startY = 0;
  homeSwipe.swiping = false;
  homeSwipe.tracking = false;
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
  const pageIndexes = currentHomePageItems.value.map(item => order.indexOf(item.token)).filter(index => index >= 0);
  return pageIndexes.length ? Math.max(...pageIndexes) + 1 : order.length;
}

function switchDragPage(pageIndex: number) {
  if (!appDrag.isDragging) return;
  goHomePage(pageIndex);
}

function scheduleDragPageSwitch(direction: -1 | 1) {
  const nextPage = homePageIndex.value + direction;
  if (nextPage < 1 || nextPage > homePages.value.length || dragPageTimer) return;
  dragPageTimer = window.setTimeout(() => {
    goHomePage(nextPage);
    const order = getHomeOrder().filter(token => token !== appDrag.itemToken);
    const pageIndexes = (homePages.value[nextPage - 1] ?? [])
      .map(item => order.indexOf(item.token))
      .filter(index => index >= 0);
    appDrag.insertIndex = pageIndexes.length
      ? direction > 0
        ? Math.min(...pageIndexes)
        : Math.max(...pageIndexes) + 1
      : order.length;
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
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-home-token]');
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
  updateDragPageSwitch(event.clientX);
  appDrag.insertIndex = resolveInsertIndex(event.clientX, event.clientY);
}

function commitAppDrag() {
  if (!appDrag.itemToken || !appDrag.isDragging) return;
  if (appDrag.destination === 'dock') {
    if (readHomeFolderToken(appDrag.itemToken)) {
      phone.noticeWarning('Dock 只能放置 App，文件夹请留在主界面');
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

function onHomeSwipePointerDown(event: PointerEvent) {
  if (event.button !== 0 || homePages.value.length < 1 || isOrganizing.value) return;
  const target = event.target;
  if (
    target instanceof Element &&
    target.closest(
      '.pc-page-dots, .pc-home-context, .pc-home-dock, .pc-task-list, input, textarea, select, [contenteditable="true"], .pc-native-select-anchor',
    )
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

function onHomeSwipeClickCapture(event: MouseEvent) {
  if (Date.now() >= suppressHomeClickUntil.value) return;
  event.preventDefault();
  event.stopPropagation();
}

function rememberHomeSource(folderId = '') {
  phone.recordHomeSource({ folderId: folderId || undefined, pageIndex: homePageIndex.value });
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

function onFolderNestedPointerDown(event: PointerEvent) {
  if (!isOrganizing.value) event.stopPropagation();
}

function openHomeFolderItem(item: HomeDisplayItem) {
  if (appDrag.isDragging || Date.now() < suppressHomeClickUntil.value) return;
  openHomeItem(item);
}

function openFolderShortcut(appId: string) {
  if (isOrganizing.value || appDrag.isDragging || Date.now() < suppressHomeClickUntil.value) return;
  openHomeApp(appId);
}

function openHomeItem(item: HomeDisplayItem) {
  if (Date.now() < suppressHomeClickUntil.value) return;
  if (item.folder) activeHomeFolderId.value = item.folder.id;
  else if (item.app) openHomeApp(item.app.id);
}

function resetHomeInteractionState() {
  resetAppDrag();
  resetFolderDrag();
  resetHomeSwipe();
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
      item.id === folder.id ? { ...item, name: name.trim() || '文件夹' } : item,
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
    removeHomeAppFromFolder(
      homeLayout.value,
      folder.id,
      appId,
      currentPageStartIndex.value + currentHomePageItems.value.length,
    ),
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
    phone.noticeError(caughtError instanceof Error ? caughtError.message : '解散文件夹失败');
  } finally {
    resetHomeInteractionState();
    activeHomeFolderId.value = '';
  }
}

watch(
  () => homePages.value.length,
  pageCount => {
    homePageIndex.value = Math.min(Math.max(1, homePageIndex.value), Math.max(1, pageCount));
  },
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
    homePageIndex.value = clampHomePageIndex(route.homeSource?.pageIndex ?? 1);
    await nextTick();
    activeHomeFolderId.value = homeLayout.value.folders.some(folder => folder.id === route.homeSource?.folderId)
      ? route.homeSource?.folderId || ''
      : '';
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
  gap: 12px;
  padding-bottom: 0;
}
.pc-home-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pc-grid {
  display: grid;
  grid-template-columns: repeat(var(--pc-home-columns), minmax(0, 1fr));
  grid-template-rows: repeat(var(--pc-home-rows), 88px);
  gap: 8px;
  align-content: start;
}
.pc-home-grid-wrap {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
  overflow-y: auto;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}
.pc-home-grid-wrap :deep(.pc-home-activity-page) {
  flex: 0 0 auto;
  max-height: 220px;
}
.pc-app-tile {
  min-width: 0;
  min-height: 0;
  height: 100%;
  border: 0;
  border-radius: var(--pc-card-radius);
  padding: 8px 6px;
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
.pc-home-folder-tile {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 2px;
  overflow: hidden;
  border: 1px solid var(--pc-border);
  padding: 7px;
  background: color-mix(in srgb, var(--pc-bg) 88%, var(--pc-surface-strong) 12%);
  box-shadow: none;
}
.pc-home-folder-preview {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1fr);
  gap: 4px;
}
.pc-home-folder-shortcut,
.pc-home-folder-more,
.pc-home-folder-title {
  min-width: 0;
  border: 0;
  color: var(--pc-text);
  cursor: pointer;
}
.pc-home-folder-shortcut {
  display: grid;
  place-items: center;
  border-radius: var(--pc-icon-radius);
  background: transparent;
}
.pc-home-folder-shortcut .pc-app-icon {
  width: 30px;
  height: 30px;
  margin: 0;
  font-size: 14px;
}
.pc-home-folder-shortcut:active,
.pc-home-folder-more:active {
  transform: scale(0.96);
}
.pc-home-folder-more {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
  border: 1px solid color-mix(in srgb, var(--pc-border) 82%, transparent 18%);
  border-radius: var(--pc-icon-radius);
  background: color-mix(in srgb, var(--pc-surface-strong) 76%, transparent 24%);
}
.pc-home-folder-more > i {
  color: var(--pc-accent);
  font-size: 18px;
}
.pc-home-folder-more small {
  color: var(--pc-muted);
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
}
.pc-home-folder-more-grid {
  width: 28px;
  height: 28px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
}
.pc-home-folder-mini-icon {
  min-width: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 5px;
  font-size: 7px;
}
.pc-home-folder-mini-icon :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pc-home-folder-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
  overflow: visible;
  padding: 0 2px;
  background: transparent;
}
.pc-home-folder-title strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 18px;
}
.pc-home-folder-title-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 5px;
  color: var(--pc-accent);
}
.pc-home-folder-title-icon :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pc-home-folder-title .pc-app-count-badge {
  top: -2px;
  right: 0;
}
:global(.pc-phone-root[data-home-columns='5'] .pc-grid) {
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
  padding: 8px 6px 6px;
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
.pc-grid.sorting .pc-app-tile {
  cursor: grabbing;
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
