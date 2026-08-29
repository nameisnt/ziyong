import { definePhoneApp } from '@/core/appRegistry';
const TutorialApp = defineAsyncComponent(() => import('./TutorialApp.vue'));

export default definePhoneApp({
  id: 'tutorial',
  name: '教程',
  icon: 'fa-circle-question',
  description: '插件功能与使用说明',
  accent: '#f59e0b',
  defaultRoute: 'root',
  defaultDock: true,
  defaultOrder: 118,
  component: TutorialApp,
});
