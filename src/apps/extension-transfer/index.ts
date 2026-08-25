import { definePhoneApp } from '@/core/appRegistry';
import ExtensionTransferApp from './ExtensionTransferApp.vue';

export default definePhoneApp({
  id: 'extension-transfer',
  name: '扩展迁移',
  icon: 'fa-plug-circle-plus',
  description: '导出第三方扩展清单并预览批量安装',
  accent: '#7a5cbd',
  defaultRoute: 'root',
  defaultOrder: 117,
  component: ExtensionTransferApp,
});
