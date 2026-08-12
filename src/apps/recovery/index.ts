import RecoveryApp from '@/apps/recovery/RecoveryApp.vue';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  accent: '#d97706',
  component: RecoveryApp,
  defaultOrder: 97,
  defaultRoute: 'root',
  description: '查看、导入、清理和查重删除酒馆聊天备份',
  icon: 'fa-box-archive',
  id: 'recovery',
  name: '酒馆备份管理',
});
