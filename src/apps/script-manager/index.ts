import { definePhoneApp } from '@/core/appRegistry';
const ScriptManagerApp = defineAsyncComponent(() => import('./ScriptManagerApp.vue'));

export default definePhoneApp({
  id: 'script-manager',
  name: '助手脚本',
  icon: 'fa-code',
  description: '查看、导出和批量删除酒馆助手脚本',
  accent: '#287271',
  defaultRoute: 'root',
  defaultOrder: 116,
  component: ScriptManagerApp,
});
