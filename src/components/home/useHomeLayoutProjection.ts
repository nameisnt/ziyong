import { normalizeHomeLayout, readHomeFolderToken } from '@/core/appLayout';
import { packHomeGridPages, type HomeGridPlacement } from '@/core/homeGridLayout';
import { getPhoneApps, type PhoneAppDefinition } from '@/data/apps';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';
import type { Ref } from 'vue';

export type HomeDisplayItem = {
  app: PhoneAppDefinition | null;
  folder: ReturnType<typeof normalizeHomeLayout>['folders'][number] | null;
  token: string;
};

export type HomeGridDisplayItem = HomeDisplayItem & HomeGridPlacement;

export function useHomeLayoutProjection(homePageIndex: Ref<number>, activeHomeFolderId: Ref<string>) {
  const settingsStore = useSettingsStore();
  const { settings } = storeToRefs(settingsStore);

  const homeLayout = computed(() => normalizeHomeLayout(settings.value.layout));
  const phoneAppById = computed(() => new Map(getPhoneApps().map(app => [app.id, app])));
  const gridItems = computed(
    () => homeLayout.value.appOrder.map(resolveHomeDisplayItem).filter(Boolean) as HomeDisplayItem[],
  );
  const dockItems = computed(
    () => homeLayout.value.dockOrder.map(resolveHomeDisplayItem).filter(Boolean) as HomeDisplayItem[],
  );
  const homePages = computed(() => {
    const itemByToken = new Map(gridItems.value.map(item => [item.token, item]));
    return packHomeGridPages(
      gridItems.value.map(item => ({ isFolder: Boolean(item.folder), token: item.token })),
      settings.value.interfaceSize.homeColumns,
      settings.value.interfaceSize.homeRows,
    ).map(page =>
      page.flatMap(placement => {
        const item = itemByToken.get(placement.token);
        return item ? [{ ...item, ...placement } satisfies HomeGridDisplayItem] : [];
      }),
    );
  });
  const currentHomePageItems = computed(
    () => homePages.value[homePageIndex.value - 1] ?? homePages.value[0] ?? [],
  );
  const currentPageStartIndex = computed(() =>
    homePages.value.slice(0, Math.max(0, homePageIndex.value - 1)).reduce((total, page) => total + page.length, 0),
  );
  const currentPageLastItemToken = computed(() => currentHomePageItems.value.at(-1)?.token || '');
  const activeHomeFolder = computed(
    () => homeLayout.value.folders.find(folder => folder.id === activeHomeFolderId.value) ?? null,
  );
  const activeHomeFolderApps = computed(() =>
    (activeHomeFolder.value?.appIds ?? []).flatMap(appId => {
      const app = phoneAppById.value.get(appId);
      return app ? [app] : [];
    }),
  );
  const folderCreationApps = computed(() =>
    homeLayout.value.appOrder.flatMap(token => {
      if (readHomeFolderToken(token)) return [];
      const app = phoneAppById.value.get(token);
      return app ? [app] : [];
    }),
  );

  function resolveHomeDisplayItem(token: string): HomeDisplayItem | null {
    const folderId = readHomeFolderToken(token);
    if (folderId) {
      const folder = homeLayout.value.folders.find(item => item.id === folderId);
      return folder ? { app: null, folder, token } : null;
    }
    const app = phoneAppById.value.get(token);
    return app ? { app, folder: null, token } : null;
  }

  function getFolderApps(item: HomeDisplayItem) {
    return (item.folder?.appIds ?? []).flatMap(appId => {
      const app = phoneAppById.value.get(appId);
      return app ? [app] : [];
    });
  }

  function getFolderShortcutApps(item: HomeDisplayItem) {
    return getFolderApps(item).slice(0, 3);
  }

  function getFolderRemainingApps(item: HomeDisplayItem) {
    return getFolderApps(item).slice(3, 7);
  }

  function clampHomePageIndex(pageIndex: number) {
    return Math.max(0, Math.min(pageIndex, homePages.value.length));
  }

  return {
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
  };
}
