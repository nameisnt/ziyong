import { definePhoneApp } from '@/core/appRegistry';
const FileRepositoryApp = defineAsyncComponent(() => import('./FileRepositoryApp.vue'));

export default definePhoneApp({
  id: 'file-repository',
  name: '插件文件仓库',
  icon: 'fa-box-archive',
  description: '自动文件快照、版本保护与恢复',
  accent: '#64748b',
  defaultRoute: 'root',
  defaultOrder: 118,
  component: FileRepositoryApp,
});
