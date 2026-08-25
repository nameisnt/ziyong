import { definePhoneApp } from '@/core/appRegistry';
import MacroBuilderApp from './MacroBuilderApp.vue';

export default definePhoneApp({
  id: 'macro-builder',
  name: '宏生成器',
  icon: 'fa-dice',
  description: '生成插件提示词使用的随机宏',
  accent: '#a65d32',
  defaultRoute: 'root',
  defaultOrder: 113,
  component: MacroBuilderApp,
});
