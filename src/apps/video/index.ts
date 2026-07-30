import VideoApp from './VideoApp.vue';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  id: 'video',
  name: '视频',
  icon: 'fa-video',
  description: '视频播放与管理',
  accent: '#7a5cff',
  defaultRoute: 'root',
  defaultOrder: 138,
  component: VideoApp,
});
