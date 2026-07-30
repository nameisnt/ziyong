import { definePhoneApp } from '@/core/appRegistry';
import TutorialApp from './TutorialApp.vue';

export default definePhoneApp({
  id: 'tutorial',
  name: '教程',
  icon: 'fa-circle-question',
  description: '宏、依赖与使用说明',
  accent: '#f59e0b',
  defaultRoute: 'root',
  defaultOrder: 118,
  component: TutorialApp,
});
