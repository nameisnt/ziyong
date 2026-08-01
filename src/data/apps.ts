import { BUILTIN_PHONE_APP_MODULES } from '@/apps/builtin';
import { tutorialArticles, tutorialCategories } from '@/apps/tutorial/data';
import { assertTutorialRegistry } from '@/apps/tutorial/validation';
import { buildDefaultHomeLayout, getPhoneApp, getPhoneAppDefinitions, normalizeHomeLayout } from '@/core/appLayout';
import { registerPhoneApp, registerPhoneApps, type PhoneAppDefinition, type PhoneAppModule } from '@/core/appRegistry';

export type { PhoneAppDefinition, PhoneAppModule } from '@/core/appRegistry';

const autoAppModules = import.meta.glob<{ default: PhoneAppModule }>('../apps/*/index.ts', {
  eager: true,
});

let registered = false;

export function ensurePhoneAppsRegistered() {
  if (registered) return;
  registerPhoneApps(BUILTIN_PHONE_APP_MODULES);
  const builtinIds = new Set(BUILTIN_PHONE_APP_MODULES.map(module => module.id));
  Object.values(autoAppModules).forEach(module => {
    if (builtinIds.has(module.default.id)) return;
    registerPhoneApp(module.default);
  });
  assertTutorialRegistry(getPhoneAppDefinitions(), tutorialArticles, tutorialCategories);
  registered = true;
}

ensurePhoneAppsRegistered();

export const PHONE_APPS: PhoneAppDefinition[] = getPhoneAppDefinitions();
export { buildDefaultHomeLayout, getPhoneApp, normalizeHomeLayout };
