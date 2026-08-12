import RegexWizardApp from './RegexWizardApp.vue';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  id: 'regex-wizard',
  name: '正则向导',
  icon: 'fa-wand-magic-sparkles',
  description: '用标签和固定字段生成、测试并保存正则',
  accent: '#8b5cf6',
  defaultRoute: 'root',
  defaultOrder: 115,
  component: RegexWizardApp,
});
