import { normalizeHomeLayout, readHomeFolderToken } from '@/core/appLayout';
import { getPhoneApps, type PhoneAppDefinition } from '@/data/apps';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

export type HomeDisplayItem = {
  app: PhoneAppDefinition | null;
  folder: ReturnType<typeof normalizeHomeLayout>['folders'][number] | null;
  token: string;
};

export function useHomeLayoutProjection() {
  const settingsStore = useSettingsStore();
  const { settings } = storeToRefs(settingsStore);

  const homeLayout = computed(() => normalizeHomeLayout(settings.value.layout));
  const phoneAppById = computed(() => new Map(getPhoneApps().map(app => [app.id, app])));
  const dockItems = computed(
    () => homeLayout.value.dockOrder.map(resolveHomeDisplayItem).filter(Boolean) as HomeDisplayItem[],
  );
  const folderCreationApps = computed(() =>
    homeLayout.value.folders.flatMap(folder =>
      folder.appIds.flatMap(appId => {
        const app = phoneAppById.value.get(appId);
        return app ? [app] : [];
      }),
    ),
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

  return {
    dockItems,
    folderCreationApps,
    getFolderApps,
    homeLayout,
    phoneAppById,
  };
}
