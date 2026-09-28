import type { AppSvgPaper } from './appIdentitySvgIcons';
import bundleInk from '@/assets/resource-bundle-icons/ink.png';
import bundleCrayon from '@/assets/resource-bundle-icons/crayon.png';
import bundleParchment from '@/assets/resource-bundle-icons/parchment.png';
import bundleModern from '@/assets/resource-bundle-icons/modern.png';
import bundleModernDark from '@/assets/resource-bundle-icons/modern-dark.png';

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

// Modern paper uses the existing line-art style; illustrated papers share their matching artwork.
appIdentityImageIcons['resource-bundle'] = {
  a4: bundleModern,
  graphite: bundleModernDark,
  parchment: bundleParchment,
  velvet: bundleParchment,
  xuan: bundleInk,
  cypress: bundleInk,
  sky: bundleCrayon,
  ocean: bundleCrayon,
  cardstock: bundleCrayon,
};

export function getAppIdentityImageIcon(appId: string) {
  return appIdentityImageIcons[appId] ?? null;
}
