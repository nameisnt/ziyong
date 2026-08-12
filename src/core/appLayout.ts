import { getRegisteredPhoneApp, getRegisteredPhoneApps } from '@/core/appRegistry';
import type { HomeFolder, HomeScreenLayout } from '@/type/settings';

export const homeFolderToken = (folderId: string) => `folder:${folderId}`;

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
  const dockOrder = ordered.filter(app => app.defaultDock).map(app => app.id);
  return {
    appOrder: ordered.map(app => app.id).filter(id => !dockOrder.includes(id)),
    dockOrder,
    folders: [],
    version: 2,
  };
}

export function normalizeHomeLayout(layout: HomeScreenLayout): HomeScreenLayout {
  const registered = getRegisteredPhoneApps();
  const knownIds = new Set(registered.map(app => app.id));
  const legacy = layout.version < 2;
  const claimed = new Set<string>();
  const folders: HomeFolder[] = [];
  const dissolved = new Map<string, string>();

  layout.folders.forEach((folder, index) => {
    const appIds = folder.appIds.filter(appId => knownIds.has(appId) && !claimed.has(appId));
    appIds.forEach(appId => claimed.add(appId));
    if (!appIds.length) return;
    if (appIds.length === 1) {
      dissolved.set(folder.id, appIds[0]!);
      claimed.delete(appIds[0]!);
      return;
    }
    folders.push({ appIds, id: folder.id || `home_folder_${index + 1}`, name: folder.name.trim() || '文件夹' });
  });

  const folderIds = new Set(folders.map(folder => folder.id));
  const normalizeTokens = (tokens: string[]) => {
    const seen = new Set<string>();
    return tokens.flatMap(token => {
      const folderId = readHomeFolderToken(token);
      const normalized = folderId && dissolved.has(folderId) ? dissolved.get(folderId)! : token;
      const normalizedFolderId = readHomeFolderToken(normalized);
      if (normalizedFolderId) {
        if (!folderIds.has(normalizedFolderId) || seen.has(normalized)) return [];
      } else if (!knownIds.has(normalized) || claimed.has(normalized) || seen.has(normalized)) {
        return [];
      }
      seen.add(normalized);
      return [normalized];
    });
  };

  const legacyDock = legacy ? registered.filter(app => app.defaultDock).map(app => app.id) : layout.dockOrder;
  const dockOrder = normalizeTokens(legacyDock);
  const dockSet = new Set(dockOrder);
  const appOrder = normalizeTokens(layout.appOrder).filter(token => !dockSet.has(token));
  registered.forEach(app => {
    if (!claimed.has(app.id) && !dockSet.has(app.id) && !appOrder.includes(app.id)) appOrder.push(app.id);
  });
  folders.forEach(folder => {
    const token = homeFolderToken(folder.id);
    if (!dockSet.has(token) && !appOrder.includes(token)) appOrder.push(token);
  });
  return { appOrder, dockOrder, folders, version: 2 };
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
    folders.push({ appIds: [targetToken, appId], id, name: '文件夹' });
    folderToken = homeFolderToken(id);
  }
  const targetWasDock = normalized.dockOrder.includes(targetToken);
  const targetIndex = targetWasDock
    ? normalized.dockOrder.indexOf(targetToken)
    : normalized.appOrder.indexOf(targetToken);
  (targetWasDock ? dockOrder : appOrder).splice(Math.max(0, targetIndex), 0, folderToken);
  return normalizeHomeLayout({ ...normalized, appOrder, dockOrder, folders });
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
