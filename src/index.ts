import '@/global.css';
<<<<<<< HEAD
import { ensureNativeLauncher } from '@/core/nativeLauncher';
import { scheduleIdleTask } from '@/util/idleTask';

const BUILD_MARKER = '2026-09-01-mobile-startup-fix';

declare global {
  interface Window {
    __sillytavernPhoneBuild__?: string;
    __sillytavernPhoneOpen__?: () => void;
    __sillytavernPhoneSyncNativeLauncher__?: () => void;
  }
}

let panelLoaded = false;
let panelLoadPromise: Promise<void> | null = null;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function loadPanel() {
  if (panelLoaded) return Promise.resolve();
  if (panelLoadPromise) return panelLoadPromise;

  panelLoadPromise = import('@/panel')
    .then(({ initPanel }) => {
      if (panelLoaded) return;
      initPanel();
      panelLoaded = true;
    })
    .catch(error => {
      panelLoadPromise = null;
      console.error('[功能性阅读器] 入口加载失败', error);
      toastr?.error?.(`功能性阅读器入口加载失败：${getErrorMessage(error)}`);
      throw error;
    });
  return panelLoadPromise;
}

async function openFromEmergencyLauncher(event?: Event) {
  event?.preventDefault();
  event?.stopPropagation();

  try {
    await loadPanel();
    window.__sillytavernPhoneOpen__?.();
    window.setTimeout(() => window.__sillytavernPhoneSyncNativeLauncher__?.(), 0);
  } catch {
    // loadPanel already reports the concrete error through console/toastr.
  }
}

function boot() {
  window.__sillytavernPhoneBuild__ = BUILD_MARKER;
  ensureNativeLauncher(openFromEmergencyLauncher, BUILD_MARKER);
  scheduleIdleTask(() => void loadPanel().catch(() => undefined), 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
=======
import { initPanel } from '@/panel';

$(() => {
  initPanel();
});
>>>>>>> a0f2d7e74fb108e07d4995dcd3d34e41d8e77f41
