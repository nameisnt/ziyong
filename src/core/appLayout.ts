import { getRegisteredPhoneApp, getRegisteredPhoneApps } from '@/core/appRegistry';
import type { HomeScreenLayout } from '@/type/settings';

export function getPhoneApp(appId: string) {
  return getRegisteredPhoneApp(appId);
}

export function getPhoneAppDefinitions() {
  return getRegisteredPhoneApps();
}

export function buildDefaultHomeLayout(): HomeScreenLayout {
  const ordered = getRegisteredPhoneApps();
  return {
    appOrder: ordered.map(app => app.id),
  };
}

export function normalizeHomeLayout(layout: HomeScreenLayout): HomeScreenLayout {
  const defaults = buildDefaultHomeLayout();
  const knownIds = new Set(getRegisteredPhoneApps().map(app => app.id));
  const appOrder = [...layout.appOrder.filter(id => knownIds.has(id))];

  defaults.appOrder.forEach(id => {
    if (!appOrder.includes(id)) appOrder.push(id);
  });

  return { appOrder };
}
