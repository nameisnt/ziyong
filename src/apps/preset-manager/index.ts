import { definePhoneApp } from '@/core/appRegistry';
import PresetManagerApp from './PresetManagerApp.vue';

export default definePhoneApp({
  id: 'preset-manager',
  name: '预设管理',
  icon: 'fa-list-check',
  description: '管理酒馆预设与插件私有预设',
  accent: '#5b7cfa',
  defaultRoute: 'root',
  defaultOrder: 114,
  component: PresetManagerApp,
});
