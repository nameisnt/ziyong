import { ref } from 'vue';

const DEFAULT_WALL = 'https://meee.com.tw/tH4EF2M.jpg';
const STORAGE_KEY = 'wallpaper';
const HISTORY_KEY = 'wallHistory';

export function useWallpaper() {
  const history = ref(loadHistory());

  function getStyleTarget() {
    return document.getElementById('floating-phone-extension-root') || document.documentElement;
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }

  function setWallpaper(url, persist = true) {
    getStyleTarget().style.setProperty('--wallpaper', `url("${url}")`);
    if (persist) localStorage.setItem(STORAGE_KEY, url);
  }

  function resetWallpaper() {
    setWallpaper(DEFAULT_WALL, false);
    localStorage.removeItem(STORAGE_KEY);
  }

  function addHistory(url) {
    let h = loadHistory().filter(x => x !== url);
    h.unshift(url);
    if (h.length > 5) h = h.slice(0, 5);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    history.value = h;
  }

  function removeHistory(i) {
    const arr = loadHistory();
    arr.splice(i, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    history.value = arr;
  }

  function restore() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setWallpaper(saved, false);
  }

  return { history, setWallpaper, resetWallpaper, addHistory, removeHistory, restore, DEFAULT_WALL };
}
