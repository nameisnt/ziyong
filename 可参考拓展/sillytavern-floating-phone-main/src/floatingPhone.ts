import FloatingPhone from '@/FloatingPhone.vue';
import { createApp } from 'vue';

const ROOT_ID = 'floating-phone-extension-root';

export function initFloatingPhone() {
  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.style.setProperty('--wallpaper', 'url("https://meee.com.tw/tH4EF2M.jpg")');
  root.style.setProperty('--shell-color', '#0a0a0a');
  document.body.appendChild(root);

  createApp(FloatingPhone).mount(root);
}
