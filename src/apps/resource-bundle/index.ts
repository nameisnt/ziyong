import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  id: 'resource-bundle',
  name: '组合导出',
  icon: 'fa-file-zipper',
  description: '多选角色卡、聊天、预设、世界书和正则，统一打包或导入',
  accent: '#278879',
  defaultRoute: 'root',
  defaultOrder: 118,
  component: defineAsyncComponent(() => import('./ResourceBundleApp.vue')),
});
