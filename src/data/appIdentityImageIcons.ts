import type { AppSvgPaper } from './appIdentitySvgIcons';

export type AppImagePaper = AppSvgPaper;

const imageModules = import.meta.glob('../assets/app-icons/**/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const appIdentityImageIcons: Record<string, Partial<Record<AppImagePaper, string>>> = {};

for (const [path, url] of Object.entries(imageModules)) {
  const match = path.match(
    /\/app-icons\/(a4|graphite|parchment|velvet|xuan|cypress|sky|ocean|cardstock)\/([^/]+)\.png$/u,
  );
  if (!match) continue;
  const [, paper, appId] = match as [string, AppImagePaper, string];
  (appIdentityImageIcons[appId] ??= {})[paper] = url;
}

export function getAppIdentityImageIcon(appId: string) {
  return appIdentityImageIcons[appId] ?? null;
}
