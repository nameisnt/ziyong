import { definePhoneApp } from '@/core/appRegistry';
import StatusDisplayApp from './StatusDisplayApp.vue';

export default definePhoneApp({
  id: 'status-display',
  name: '状态栏',
  icon: 'fa-gauge-high',
  description: '显示当前聊天绑定的状态栏网页',
  accent: '#168a72',
  defaultRoute: 'root',
  defaultOrder: 117,
  component: StatusDisplayApp,
});
