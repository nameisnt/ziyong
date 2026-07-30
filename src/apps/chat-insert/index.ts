import ChatInsertApp from './ChatInsertApp.vue';
import { chatInsertField, useChatInsertStore } from './store';
import { definePhoneApp } from '@/core/appRegistry';
import { extension_settings } from '@sillytavern/scripts/extensions';

export default definePhoneApp({
  id: 'chat-insert',
  name: '楼层插入',
  icon: 'fa-file-circle-plus',
  description: '引用内容写入聊天',
  accent: '#00a896',
  defaultRoute: 'root',
  defaultOrder: 140,
  backupDomains: [{
    key: 'chat-insert',
    exportData: () => _.get(extension_settings, chatInsertField, {}),
    importData: data => {
      _.set(extension_settings, chatInsertField, data);
    },
    rehydrateFromSettings: () => useChatInsertStore().rehydrateFromSettings(),
  }],
  component: ChatInsertApp,
});
