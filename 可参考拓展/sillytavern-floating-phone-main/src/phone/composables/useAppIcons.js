import { computed, ref } from 'vue';
import { getJson, setJson } from './usePersistentStorage.js';

const ICON_KEY = 'phone_app_icon_overrides_v2';
const LEGACY_ICON_KEY = 'phone_app_icon_overrides_v1';

export const CUSTOMIZABLE_APPS = [
  { id: 'settings', name: '设置', url: 'https://meee.com.tw/yETlp4B.png' },
  { id: 'role', name: '角色', url: 'https://meee.com.tw/QybmoKd.png' },
  { id: 'peek', name: '偷窥', url: 'https://meee.com.tw/CoExkR4.png' },
  { id: 'music', name: '网抑云', url: 'https://meee.com.tw/AeyYrzI.png' },
  { id: 'message', name: '信息', url: 'https://meee.com.tw/R8BxwrH.png' },
  { id: 'shopping', name: '拼夕夕', url: 'https://meee.com.tw/bstH55n.png' },
  { id: 'schedule', name: '日程', url: 'https://meee.com.tw/J5Fk5db.png' },
  { id: 'inspect', name: '查岗', url: 'https://meee.com.tw/aQmIPrK.png' },
  { id: 'browser', name: '浏览器', url: 'https://meee.com.tw/87ZhNKs.png' },
  { id: 'Theater', name: '小剧场', url: 'https://meee.com.tw/ALqWBF4.png' },
  { id: 'company', name: '陪伴', url: 'https://meee.com.tw/obGL2de.png' },
  { id: 'memory', name: '记忆', url: 'https://meee.com.tw/7PfPO6E.png' },
  { id: 'landlord', name: '斗地主', url: 'https://meee.com.tw/QRZD6Ax.png' },
  { id: 'diary', name: '日记', url: 'https://meee.com.tw/lTULO4b.png' },
  { id: 'pet', name: '桌宠', url: 'https://meee.com.tw/BoXCjaX.png' },
];

const overrides = ref({});
const ready = ref(false);
const restorePromise = restore();

function loadLegacy() {
  try {
    const saved = JSON.parse(localStorage.getItem(ICON_KEY) || localStorage.getItem(LEGACY_ICON_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

async function restore() {
  ready.value = false;
  try {
    const saved = await getJson(ICON_KEY, loadLegacy());
    overrides.value = saved && typeof saved === 'object' ? saved : {};
    persist().catch(error => console.warn('[AppIcons] migration persist failed:', error));
  } catch (error) {
    console.warn('[AppIcons] restore failed:', error);
    overrides.value = loadLegacy();
  } finally {
    ready.value = true;
  }
}

async function persist() {
  await setJson(ICON_KEY, overrides.value, { mirrorLocal: true });
}

async function ensureReady() {
  await restorePromise;
}

export function useAppIcons() {
  const apps = computed(() => CUSTOMIZABLE_APPS.map(app => ({ ...app, url: overrides.value[app.id] || app.url, defaultUrl: app.url })));

  function iconFor(id, fallback = '') {
    return overrides.value[id] || fallback;
  }

  async function setIcon(id, dataUrl) {
    await ensureReady();
    if (!CUSTOMIZABLE_APPS.some(app => app.id === id) || !dataUrl) return;
    const previous = overrides.value;
    overrides.value = { ...overrides.value, [id]: dataUrl };
    try { await persist(); }
    catch (error) {
      overrides.value = previous;
      throw error;
    }
  }

  async function resetIcon(id) {
    await ensureReady();
    const next = { ...overrides.value };
    delete next[id];
    const previous = overrides.value;
    overrides.value = next;
    try { await persist(); }
    catch (error) {
      overrides.value = previous;
      throw error;
    }
  }

  async function resetAllIcons() {
    await ensureReady();
    overrides.value = {};
    await persist();
  }

  return { apps, overrides, ready, restore: ensureReady, iconFor, setIcon, resetIcon, resetAllIcons };
}
