import GalleryApp from './GalleryApp.vue';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  id: 'gallery',
  name: '相册',
  icon: 'fa-images',
  description: '图片画廊与预览',
  accent: '#ff8f3d',
  defaultRoute: 'root',
  defaultOrder: 136,
  component: GalleryApp,
});
