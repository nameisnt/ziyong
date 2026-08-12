import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';

export async function waitForVisualPaint() {
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export function configureVisualPhoneSize(width = 360, height = 700) {
  const settings = useSettingsStore().settings;
  settings.interfaceSize.phoneWidth = width;
  settings.interfaceSize.phoneHeight = height;
  settings.floatBallEnabled = false;
  settings.phoneWindowX = Math.max(8, Math.round((window.innerWidth - width) / 2));
  settings.phoneWindowY = Math.max(8, Math.round((window.innerHeight - height) / 2));
}

export function resetVisualPhoneRoute(appId: string, page: string, title: string, params?: Record<string, string>) {
  const phone = usePhoneStore();
  phone.isOpen = true;
  phone.stack = [
    { appId: 'home', page: 'home', title: '功能性阅读器' },
    { appId, page, params, title },
  ];
}
