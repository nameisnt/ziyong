import { getRegisteredPhoneApp, getRegisteredPhoneApps } from '@/core/appRegistry';
import { MINI_GAME_APP_IDS } from '@/data/miniGameApps';
import type { HomeFolder, HomeScreenLayout } from '@/type/settings';

export const homeFolderToken = (folderId: string) => `folder:${folderId}`;

const DEFAULT_DOCK_APP_IDS = ['favorites', 'prompts', 'tutorial', 'settings'];
const DEFAULT_HOME_FOLDERS = [
  { id: 'home_default_creation', name: '创作', appIds: ['diary', 'extras', 'theater', 'forum', 'letters', 'card-writer', 'scene-planner'] },
  { id: 'home_default_organize', name: '整理', appIds: ['summary', 'storylines', 'bagu', 'content-converter'] },
  { id: 'home_default_archive', name: '阅读档案', appIds: ['reader', 'archive', 'recovery', 'digest', 'chat-insert', 'stats'] },
  { id: 'home_default_prompt', name: '设定提示', appIds: ['preset-manager', 'entry-library', 'worldbook-link', 'world-slots', 'mvu-modifier', 'regex-display', 'regex-wizard'] },
  { id: 'home_default_profiles', name: '资料关系', appIds: ['profiles', 'relationship', 'timekeeper'] },
  { id: 'home_default_tools', name: '工具', appIds: ['workbench', 'app-builder', 'theme', 'file-repository'] },
  { id: 'home_default_games', name: '小游戏', appIds: MINI_GAME_APP_IDS },
];

const LEGACY_GAMES_APP_ID = 'games';
const DEFAULT_GAMES_FOLDER_ID = 'home_default_games';

function createUniqueGamesFolderId(folders: HomeFolder[]) {
  const usedIds = new Set(folders.map(folder => folder.id));
  if (!usedIds.has(DEFAULT_GAMES_FOLDER_ID)) return DEFAULT_GAMES_FOLDER_ID;
  if (!usedIds.has('home_migrated_games')) return 'home_migrated_games';
  let suffix = 2;
  while (usedIds.has(`home_migrated_games_${suffix}`)) suffix += 1;
  return `home_migrated_games_${suffix}`;
}

function migrateLegacyGamesLayout(layout: HomeScreenLayout, knownIds: Set<string>): HomeScreenLayout {
  const availableGameIds = MINI_GAME_APP_IDS.filter(appId => knownIds.has(appId));
  if (!availableGameIds.length) return layout;
  const availableGameIdSet = new Set<string>(availableGameIds);

  const hasModernPlacement = [
    ...layout.appOrder,
    ...layout.dockOrder,
    ...layout.folders.flatMap(folder => folder.appIds),
  ].some(token => availableGameIdSet.has(token));
  if (hasModernPlacement) {
    return {
      ...layout,
      appOrder: layout.appOrder.filter(token => token !== LEGACY_GAMES_APP_ID),
      dockOrder: layout.dockOrder.filter(token => token !== LEGACY_GAMES_APP_ID),
      folders: layout.folders.map(folder => ({
        ...folder,
        appIds: folder.appIds.filter(appId => appId !== LEGACY_GAMES_APP_ID),
      })),
    };
  }

  const sourceFolders = layout.folders.map(folder => ({ ...folder, appIds: [...folder.appIds] }));
  const defaultFolder = sourceFolders.find(
    folder => folder.id === DEFAULT_GAMES_FOLDER_ID && folder.appIds.includes(LEGACY_GAMES_APP_ID),
  );
  if (defaultFolder) {
    defaultFolder.name = '小游戏';
    defaultFolder.appIds = defaultFolder.appIds.flatMap(appId =>
      appId === LEGACY_GAMES_APP_ID ? availableGameIds : [appId],
    );
    return {
      ...layout,
      appOrder: layout.appOrder.filter(token => token !== LEGACY_GAMES_APP_ID),
      dockOrder: layout.dockOrder.filter(token => token !== LEGACY_GAMES_APP_ID),
      folders: sourceFolders,
    };
  }

  const customFolder = sourceFolders.find(folder => folder.appIds.includes(LEGACY_GAMES_APP_ID));
  sourceFolders.forEach(folder => {
    folder.appIds = folder.appIds.filter(appId => appId !== LEGACY_GAMES_APP_ID);
  });
  const folderId = createUniqueGamesFolderId(sourceFolders);
  const folderToken = homeFolderToken(folderId);
  sourceFolders.push({ appIds: availableGameIds, iconAssetId: '', id: folderId, name: '小游戏' });

  const appOrder = layout.appOrder.filter(token => token !== LEGACY_GAMES_APP_ID && token !== folderToken);
  const dockOrder = layout.dockOrder.filter(token => token !== LEGACY_GAMES_APP_ID && token !== folderToken);
  const standaloneIndex = layout.appOrder.indexOf(LEGACY_GAMES_APP_ID);
  if (customFolder) {
    const sourceToken = homeFolderToken(customFolder.id);
    const sourceIndex = appOrder.indexOf(sourceToken);
    appOrder.splice(sourceIndex >= 0 ? sourceIndex + 1 : appOrder.length, 0, folderToken);
  } else if (standaloneIndex >= 0) {
    appOrder.splice(Math.min(standaloneIndex, appOrder.length), 0, folderToken);
  } else {
    appOrder.push(folderToken);
  }

  return { ...layout, appOrder, dockOrder, folders: sourceFolders };
}

export function readHomeFolderToken(token: string) {
  return token.startsWith('folder:') ? token.slice('folder:'.length) : '';
}

export function getPhoneApp(appId: string) {
  return getRegisteredPhoneApp(appId);
}

export function getPhoneAppDefinitions() {
  return getRegisteredPhoneApps();
}

export function buildDefaultHomeLayout(): HomeScreenLayout {
  const ordered = getRegisteredPhoneApps();
  const knownIds = new Set(ordered.map(app => app.id));
  const dockOrder = DEFAULT_DOCK_APP_IDS.filter(appId => knownIds.has(appId));
  const resolvedDockOrder = dockOrder.length ? dockOrder : ordered.filter(app => app.defaultDock).map(app => app.id);
  const folders = DEFAULT_HOME_FOLDERS.flatMap(folder => {
    const appIds = folder.appIds.filter(appId => knownIds.has(appId) && !resolvedDockOrder.includes(appId));
    return appIds.length ? [{ ...folder, appIds, iconAssetId: '' }] : [];
  });
  const folderAppIds = new Set(folders.flatMap(folder => folder.appIds));
  const remainingAppIds = ordered
    .map(app => app.id)
    .filter(appId => !resolvedDockOrder.includes(appId) && !folderAppIds.has(appId));
  return {
    appOrder: [...folders.map(folder => homeFolderToken(folder.id)), ...remainingAppIds],
    dockOrder: resolvedDockOrder,
    folders,
    version: 2,
  };
}

export function normalizeHomeLayout(layout: HomeScreenLayout): HomeScreenLayout {
  const registered = getRegisteredPhoneApps();
  const knownIds = new Set(registered.map(app => app.id));
  const sourceLayout = migrateLegacyGamesLayout(layout, knownIds);
  const legacy = sourceLayout.version < 2;
  const claimed = new Set<string>();
  const folders: HomeFolder[] = [];

  sourceLayout.folders.forEach((folder, index) => {
    const appIds = folder.appIds.filter(appId => knownIds.has(appId) && !claimed.has(appId));
    appIds.forEach(appId => claimed.add(appId));
    if (!appIds.length) return;
    folders.push({
      appIds,
      id: folder.id || `home_folder_${index + 1}`,
      iconAssetId: folder.iconAssetId || '',
      name: folder.name.trim() || '文件夹',
    });
  });

  const folderIds = new Set(folders.map(folder => folder.id));
  const normalizeTokens = (tokens: string[]) => {
    const seen = new Set<string>();
    return tokens.flatMap(token => {
      const normalizedFolderId = readHomeFolderToken(token);
      if (normalizedFolderId) {
        if (!folderIds.has(normalizedFolderId) || seen.has(token)) return [];
      } else if (!knownIds.has(token) || claimed.has(token) || seen.has(token)) {
        return [];
      }
      seen.add(token);
      return [token];
    });
  };

  const legacyDock = legacy ? registered.filter(app => app.defaultDock).map(app => app.id) : sourceLayout.dockOrder;
  const dockOrder = normalizeTokens(legacyDock);
  const dockSet = new Set(dockOrder);
  const appOrder = normalizeTokens(sourceLayout.appOrder).filter(token => !dockSet.has(token));
  registered.forEach(app => {
    if (!claimed.has(app.id) && !dockSet.has(app.id) && !appOrder.includes(app.id)) appOrder.push(app.id);
  });
  folders.forEach(folder => {
    const token = homeFolderToken(folder.id);
    if (!dockSet.has(token) && !appOrder.includes(token)) appOrder.push(token);
  });
  return { appOrder, dockOrder, folders, version: 2 };
}

export function migrateHomeLayoutDockCapacity(layout: HomeScreenLayout, dockCapacity = 4): HomeScreenLayout {
  const normalized = normalizeHomeLayout(layout);
  const capacity = Math.min(4, Math.max(3, Math.trunc(dockCapacity)));
  const dockOrder: string[] = [];
  const movedToDesktop: string[] = [];
  normalized.dockOrder.forEach(token => {
    if (readHomeFolderToken(token) || dockOrder.length >= capacity) movedToDesktop.push(token);
    else dockOrder.push(token);
  });
  return normalizeHomeLayout({
    ...normalized,
    appOrder: [...normalized.appOrder.filter(token => !movedToDesktop.includes(token)), ...movedToDesktop],
    dockOrder,
  });
}

export function moveHomeLayoutItem(
  layout: HomeScreenLayout,
  token: string,
  destination: 'dock' | 'home',
  index: number,
  dockCapacity: number,
) {
  const normalized = normalizeHomeLayout(layout);
  const sourceHomeIndex = normalized.appOrder.indexOf(token);
  const appOrder = normalized.appOrder.filter(item => item !== token);
  const dockOrder = normalized.dockOrder.filter(item => item !== token);
  const target = destination === 'dock' ? dockOrder : appOrder;
  target.splice(Math.max(0, Math.min(index, target.length)), 0, token);
  if (destination === 'dock' && dockOrder.length > dockCapacity) {
    const displaced = dockOrder.pop();
    if (displaced && displaced !== token) {
      const fallbackIndex = sourceHomeIndex < 0 ? appOrder.length : Math.min(sourceHomeIndex, appOrder.length);
      appOrder.splice(fallbackIndex, 0, displaced);
    }
  }
  return normalizeHomeLayout({ ...normalized, appOrder, dockOrder });
}

export function putHomeAppInFolder(layout: HomeScreenLayout, appId: string, targetToken: string) {
  const normalized = normalizeHomeLayout(layout);
  if (readHomeFolderToken(appId)) return normalized;
  const targetFolderId = readHomeFolderToken(targetToken);
  const appOrder = normalized.appOrder.filter(token => token !== appId && token !== targetToken);
  const dockOrder = normalized.dockOrder.filter(token => token !== appId && token !== targetToken);
  const folders = normalized.folders.map(folder => ({ ...folder, appIds: [...folder.appIds] }));
  let folderToken = targetToken;
  if (targetFolderId) {
    const folder = folders.find(item => item.id === targetFolderId);
    if (!folder || folder.appIds.includes(appId)) return normalized;
    folder.appIds.push(appId);
  } else {
    const id = `home_folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    folders.push({ appIds: [targetToken, appId], id, iconAssetId: '', name: '文件夹' });
    folderToken = homeFolderToken(id);
  }
  const targetWasDock = normalized.dockOrder.includes(targetToken);
  const targetIndex = targetWasDock
    ? normalized.dockOrder.indexOf(targetToken)
    : normalized.appOrder.indexOf(targetToken);
  (targetWasDock ? dockOrder : appOrder).splice(Math.max(0, targetIndex), 0, folderToken);
  return normalizeHomeLayout({ ...normalized, appOrder, dockOrder, folders });
}

export function createHomeFolder(
  layout: HomeScreenLayout,
  input: { appIds: string[]; id: string; name: string },
) {
  const normalized = normalizeHomeLayout(layout);
  const selectedIds = [...new Set(input.appIds)].filter(appId => normalized.appOrder.includes(appId));
  if (!selectedIds.length || !input.id.trim()) return normalized;
  const insertionIndex = Math.min(...selectedIds.map(appId => normalized.appOrder.indexOf(appId)));
  const appOrder = normalized.appOrder.filter(token => !selectedIds.includes(token));
  appOrder.splice(insertionIndex, 0, homeFolderToken(input.id));
  return normalizeHomeLayout({
    ...normalized,
    appOrder,
    folders: [
      ...normalized.folders,
      { appIds: selectedIds, iconAssetId: '', id: input.id, name: input.name.trim() || '文件夹' },
    ],
  });
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

export function removeHomeAppFromFolder(layout: HomeScreenLayout, folderId: string, appId: string, homeIndex: number) {
  const normalized = normalizeHomeLayout(layout);
  const folders = normalized.folders.map(folder =>
    folder.id === folderId ? { ...folder, appIds: folder.appIds.filter(id => id !== appId) } : folder,
  );
  const appOrder = [...normalized.appOrder];
  appOrder.splice(Math.max(0, Math.min(homeIndex, appOrder.length)), 0, appId);
  return normalizeHomeLayout({ ...normalized, appOrder, folders });
}
