import { ref } from 'vue';

const STORAGE_KEY = 'shellColor';
const PRESETS = [
  { color: '#0a0a0a', name: '黑色' },
  { color: '#f5f5f7', name: '白色' },
  { color: '#bcd5ec', name: '淡蓝' },
  { color: '#f4c8d4', name: '淡粉' },
];

export function useShellColor() {
  const current = ref('#0a0a0a');

  function getStyleTarget() {
    return document.getElementById('floating-phone-extension-root') || document.documentElement;
  }

  function apply(c) {
    getStyleTarget().style.setProperty('--shell-color', c);
    localStorage.setItem(STORAGE_KEY, c);
    current.value = c;
  }

  function restore() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) apply(s);
  }

  return { current, apply, restore, PRESETS };
}
