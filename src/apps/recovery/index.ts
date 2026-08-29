const RecoveryApp = defineAsyncComponent(() => import('@/apps/recovery/RecoveryApp.vue'));
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  accent: '#d97706',
  component: RecoveryApp,
  defaultOrder: 97,
  defaultRoute: 'root',
  description: '管理酒馆聊天备份与设置快照',
  icon: 'fa-box-archive',
  id: 'recovery',
  name: '酒馆备份管理',
});
