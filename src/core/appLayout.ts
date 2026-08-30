import { getRegisteredPhoneApp, getRegisteredPhoneApps } from '@/core/appRegistry';
import { MINI_GAME_APP_IDS } from '@/data/miniGameApps';
import type { HomeFolder, HomeScreenLayout } from '@/type/settings';

export const homeFolderToken = (folderId: string) => `folder:${folderId}`;

const HOME_LAYOUT_VERSION = 4;
const DEFAULT_DOCK_APP_IDS = ['archive', 'favorites', 'prompts', 'tutorial', 'settings'];
const FALLBACK_FOLDER_ID = 'home_default_tools';
const DEFAULT_HOME_FOLDERS = [
  {
    id: 'home_default_creation',
    name: '阅读与记录',
    appIds: ['reader', 'diary', 'extras', 'theater', 'forum', 'letters'],
  },
  { id: 'home_default_generation', name: '生成', appIds: ['card-writer', 'summary'] },
  { id: 'home_default_organize', name: '内容整理', appIds: ['bagu', 'content-converter', 'digest', 'stats'] },
  {
    id: 'home_default_prompt',
    name: '预设与世界书',
    appIds: ['preset-manager', 'preset-link', 'worldbook-link', 'world-slots'],
  },
  {
    id: 'home_default_tavern',
    name: '酒馆工具',
    appIds: [
      'status-display',
      'status-display-settings',
      'mvu-modifier',
      'extension-transfer',
      'script-manager',
      'chat-insert',
      'recovery',
    ],
  },
  { id: 'home_default_profiles', name: '资料关系', appIds: ['profiles', 'relationship', 'timekeeper'] },
  {
    id: FALLBACK_FOLDER_ID,
    name: '插件工具',
    appIds: [
      'workbench',
      'app-builder',
      'theme',
      'file-repository',
      'entry-library',
      'regex-display',
      'regex-wizard',
      'macro-builder',
    ],
  },
  { id: 'home_default_games', name: '小游戏', appIds: MINI_GAME_APP_IDS },
];

export function readHomeFolderToken(token: string) {
  return token.startsWith('folder:') ? token.slice('folder:'.length) : '';
}

export function getPhoneApp(appId: string) {
  return getRegisteredPhoneApp(appId);
}

export function getPhoneAppDefinitions() {
  return getRegisteredPhoneApps();
}

function getDefaultDockOrder() {
  const registered = getRegisteredPhoneApps();
  const knownIds = new Set(registered.map(app => app.id));
  const fixedDock = DEFAULT_DOCK_APP_IDS.filter(appId => knownIds.has(appId));
  return fixedDock.length ? fixedDock : registered.filter(app => app.defaultDock).map(app => app.id);
}

function addAppsToFallbackFolder(folders: HomeFolder[], appIds: string[]) {
  if (!appIds.length) return;
  let fallback = folders.find(folder => folder.id === FALLBACK_FOLDER_ID);
  if (!fallback) {
    fallback = { appIds: [], iconAssetId: '', id: FALLBACK_FOLDER_ID, name: '插件工具' };
    folders.push(fallback);
  }
  appIds.forEach(appId => {
    if (!fallback.appIds.includes(appId)) fallback.appIds.push(appId);
  });
}

export function buildDefaultHomeLayout(): HomeScreenLayout {
  const registered = getRegisteredPhoneApps();
  const knownIds = new Set(registered.map(app => app.id));
  const dockOrder = getDefaultDockOrder();
  const dockIds = new Set(dockOrder);
  const folders: HomeFolder[] = DEFAULT_HOME_FOLDERS.flatMap(folder => {
    const appIds = folder.appIds.filter(appId => knownIds.has(appId) && !dockIds.has(appId));
    return appIds.length ? [{ ...folder, appIds, iconAssetId: '' }] : [];
  });
  const groupedIds = new Set(folders.flatMap(folder => folder.appIds));
  addAppsToFallbackFolder(
    folders,
    registered.map(app => app.id).filter(appId => !dockIds.has(appId) && !groupedIds.has(appId)),
  );
  return {
    appOrder: folders.map(folder => homeFolderToken(folder.id)),
    dockOrder,
    folders,
    version: HOME_LAYOUT_VERSION,
  };
}

export function normalizeHomeLayout(layout: HomeScreenLayout): HomeScreenLayout {
  if (layout.version < HOME_LAYOUT_VERSION) return buildDefaultHomeLayout();

  const registered = getRegisteredPhoneApps();
  const knownIds = new Set(registered.map(app => app.id));
  const requiredDockIds = getDefaultDockOrder();
  const requiredDockSet = new Set(requiredDockIds);
  const dockOrder = [
    ...layout.dockOrder.filter(
      (appId, index) => requiredDockSet.has(appId) && layout.dockOrder.indexOf(appId) === index,
    ),
    ...requiredDockIds.filter(appId => !layout.dockOrder.includes(appId)),
  ];
  const claimed = new Set(dockOrder);
  const folders: HomeFolder[] = [];

  layout.folders.forEach((folder, index) => {
    const appIds = folder.appIds.filter(appId => knownIds.has(appId) && !claimed.has(appId));
    appIds.forEach(appId => claimed.add(appId));
    if (!appIds.length) return;
    folders.push({
      appIds,
      iconAssetId: folder.iconAssetId || '',
      id: folder.id || `home_folder_${index + 1}`,
      name: folder.name.trim() || '分组',
    });
  });

  addAppsToFallbackFolder(
    folders,
    registered.map(app => app.id).filter(appId => !claimed.has(appId) && !requiredDockSet.has(appId)),
  );
  const folderIds = new Set(folders.map(folder => folder.id));
  const appOrder = layout.appOrder.flatMap(token => {
    const folderId = readHomeFolderToken(token);
    return folderId && folderIds.has(folderId) ? [homeFolderToken(folderId)] : [];
  });
  folders.forEach(folder => {
    const token = homeFolderToken(folder.id);
    if (!appOrder.includes(token)) appOrder.push(token);
  });
  return { appOrder, dockOrder, folders, version: HOME_LAYOUT_VERSION };
}

export function migrateHomeLayoutDockCapacity(layout: HomeScreenLayout, _dockCapacity = 5): HomeScreenLayout {
  return normalizeHomeLayout(layout);
}

export function moveHomeLayoutItem(
  layout: HomeScreenLayout,
  token: string,
  destination: 'dock' | 'home',
  index: number,
  _dockCapacity: number,
) {
  const normalized = normalizeHomeLayout(layout);
  if (destination !== 'dock' || !normalized.dockOrder.includes(token)) return normalized;
  const dockOrder = normalized.dockOrder.filter(item => item !== token);
  dockOrder.splice(Math.max(0, Math.min(index, dockOrder.length)), 0, token);
  return normalizeHomeLayout({ ...normalized, dockOrder });
}

export function putHomeAppInFolder(layout: HomeScreenLayout, appId: string, targetToken: string) {
  const normalized = normalizeHomeLayout(layout);
  const targetFolderId = readHomeFolderToken(targetToken);
  const sourceFolder = normalized.folders.find(folder => folder.appIds.includes(appId));
  const targetFolder = normalized.folders.find(folder => folder.id === targetFolderId);
  if (!sourceFolder || !targetFolder || sourceFolder.id === targetFolder.id) return normalized;
  return normalizeHomeLayout({
    ...normalized,
    folders: normalized.folders.map(folder => {
      if (folder.id === sourceFolder.id) return { ...folder, appIds: folder.appIds.filter(id => id !== appId) };
      if (folder.id === targetFolder.id) return { ...folder, appIds: [...folder.appIds, appId] };
      return folder;
    }),
  });
}

export function createHomeFolder(layout: HomeScreenLayout, input: { appIds: string[]; id: string; name: string }) {
  const normalized = normalizeHomeLayout(layout);
  const groupedIds = new Set(normalized.folders.flatMap(folder => folder.appIds));
  const selectedIds = [...new Set(input.appIds)].filter(appId => groupedIds.has(appId));
  if (!selectedIds.length || !input.id.trim()) return normalized;
  const sourceFolderIndexes = selectedIds.flatMap(appId => {
    const folderId = normalized.folders.find(folder => folder.appIds.includes(appId))?.id;
    const index = normalized.appOrder.indexOf(homeFolderToken(folderId || ''));
    return index >= 0 ? [index] : [];
  });
  const insertionIndex = sourceFolderIndexes.length ? Math.min(...sourceFolderIndexes) : normalized.appOrder.length;
  const folders = normalized.folders
    .map(folder => ({ ...folder, appIds: folder.appIds.filter(appId => !selectedIds.includes(appId)) }))
    .filter(folder => folder.appIds.length);
  folders.push({ appIds: selectedIds, iconAssetId: '', id: input.id, name: input.name.trim() || '分组' });
  const survivingFolderIds = new Set(folders.map(folder => folder.id));
  const appOrder = normalized.appOrder.filter(token => survivingFolderIds.has(readHomeFolderToken(token)));
  appOrder.splice(Math.max(0, Math.min(insertionIndex, appOrder.length)), 0, homeFolderToken(input.id));
  return normalizeHomeLayout({ ...normalized, appOrder, folders });
}

export function renameHomeFolder(layout: HomeScreenLayout, folderId: string, name: string) {
  const normalized = normalizeHomeLayout(layout);
  const nextName = name.trim();
  if (
    !nextName ||
    normalized.folders.some(
      folder => folder.id !== folderId && folder.name.toLocaleLowerCase() === nextName.toLocaleLowerCase(),
    )
  ) {
    return normalized;
  }
  return normalizeHomeLayout({
    ...normalized,
    folders: normalized.folders.map(folder => (folder.id === folderId ? { ...folder, name: nextName } : folder)),
  });
}

export function moveHomeAppsToFolder(layout: HomeScreenLayout, appIds: string[], targetFolderId: string) {
  const normalized = normalizeHomeLayout(layout);
  const targetFolder = normalized.folders.find(folder => folder.id === targetFolderId);
  if (!targetFolder) return normalized;
  const groupedIds = new Set(normalized.folders.flatMap(folder => folder.appIds));
  const selectedIds = [...new Set(appIds)].filter(appId => groupedIds.has(appId));
  if (!selectedIds.length) return normalized;
  const selectedSet = new Set(selectedIds);
  const folders = normalized.folders
    .map(folder => ({
      ...folder,
      appIds: [
        ...folder.appIds.filter(appId => !selectedSet.has(appId)),
        ...(folder.id === targetFolderId ? selectedIds : []),
      ],
    }))
    .filter(folder => folder.appIds.length);
  return normalizeHomeLayout({ ...normalized, folders });
}

export function reorderHomeFolderApp(layout: HomeScreenLayout, folderId: string, appId: string, targetIndex: number) {
  const normalized = normalizeHomeLayout(layout);
  return normalizeHomeLayout({
    ...normalized,
    folders: normalized.folders.map(folder => {
      if (folder.id !== folderId || !folder.appIds.includes(appId)) return folder;
      const appIds = folder.appIds.filter(id => id !== appId);
      appIds.splice(Math.max(0, Math.min(targetIndex, appIds.length)), 0, appId);
      return { ...folder, appIds };
    }),
  });
}
