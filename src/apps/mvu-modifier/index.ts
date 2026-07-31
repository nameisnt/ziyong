import MvuModifierApp from './MvuModifierApp.vue';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  id: 'mvu-modifier',
  name: 'MVU 修改器',
  icon: 'fa-sliders',
  description: '查看与修改 MVU 变量',
  accent: '#00a896',
  defaultRoute: 'root',
  defaultOrder: 118,
  component: MvuModifierApp,
});
