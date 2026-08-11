import RecoveryApp from '@/apps/recovery/RecoveryApp.vue';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  accent: '#d97706',
  component: RecoveryApp,
  defaultOrder: 97,
  defaultRoute: 'root',
  description: '阅读聊天备份并原生导入为新聊天',
  icon: 'fa-clock-rotate-left',
  id: 'recovery',
  name: '恢复',
});
