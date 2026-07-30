import '@/global.css';
import { ensureNativeLauncher } from '@/core/nativeLauncher';
import { initPanel } from '@/panel';

const BUILD_MARKER = '2026-07-27-audit-fixes';

declare global {
  interface Window {
    __sillytavernPhoneBuild__?: string;
    __sillytavernPhoneOpen__?: () => void;
    __sillytavernPhoneSyncNativeLauncher__?: () => void;
  }
}

let panelLoaded = false;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function loadPanel() {
  try {
    if (!panelLoaded) {
      initPanel();
      panelLoaded = true;
    }
    return Promise.resolve();
  } catch (error) {
    console.error('[酒馆手机] 入口加载失败', error);
    toastr?.error?.(`酒馆手机入口加载失败：${getErrorMessage(error)}`);
    return Promise.reject(error);
  }
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
  void loadPanel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
