import AppRoot from '@/App.vue';
import { installWorkbenchAutoRunner, uninstallWorkbenchAutoRunner } from '@/apps/workbench/runner';
import { ensureNativeLauncher, syncNativeLauncherVisibility } from '@/core/nativeLauncher';
import { purgeRetiredMediaExtensionData } from '@/core/retiredMedia';
import { ensurePhoneAppsRegistered } from '@/data/apps';
import { usePhoneStore } from '@/store/phone';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { App } from 'vue';

const ROOT_ID = 'phone-creative-root';

type PhonePluginState = {
  app: App<Element> | null;
  root: HTMLDivElement | null;
  initialized: boolean;
};

declare global {
  interface Window {
    __sillytavernPhonePluginState__?: PhonePluginState;
    __sillytavernPhoneOpen__?: () => void;
    __sillytavernPhoneSyncNativeLauncher__?: () => void;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    t: typeof t;
  }
}

const i18n = {
  install: (app: App) => {
    app.config.globalProperties.t = t;
  },
};

function getPluginState(): PhonePluginState {
  if (!window.__sillytavernPhonePluginState__) {
    window.__sillytavernPhonePluginState__ = {
      app: null,
      root: null,
      initialized: false,
    };
  }
  return window.__sillytavernPhonePluginState__;
}

function ensureRoot() {
  let root = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

export function initPhoneLifecycle() {
  if (purgeRetiredMediaExtensionData(extension_settings as Record<string, unknown>)) {
    void saveSettingsDebounced();
  }
  ensurePhoneAppsRegistered();
  const state = getPluginState();
  ensureNativeLauncher(() => window.__sillytavernPhoneOpen__?.());
  window.__sillytavernPhoneSyncNativeLauncher__ = syncNativeLauncherVisibility;
  if (state.initialized && state.root?.isConnected) {
    installWorkbenchAutoRunner();
    syncNativeLauncherVisibility();
    return state;
  }

  try {
    const root = ensureRoot();
    const pinia = createPinia();
    const app = createApp(AppRoot);
    app.use(pinia);
    app.use(i18n);
    app.mount(root);
    const phone = usePhoneStore(pinia);
    window.__sillytavernPhoneOpen__ = () => {
      phone.openPhone();
      window.setTimeout(syncNativeLauncherVisibility, 0);
    };

    state.app = app;
    state.root = root;
    state.initialized = true;
    installWorkbenchAutoRunner();
    window.setTimeout(syncNativeLauncherVisibility, 0);
  } catch (error) {
    console.error('[功能性阅读器] 初始化失败', error);
    const message = error instanceof Error ? error.message : String(error);
    toastr?.error?.(`功能性阅读器初始化失败：${message}`);
  }
  return state;
}

export function destroyPhoneLifecycle() {
  const state = getPluginState();
  uninstallWorkbenchAutoRunner();
  state.app?.unmount();
  eventClearAll();
  state.root?.remove();
  state.app = null;
  state.root = null;
  state.initialized = false;
}
