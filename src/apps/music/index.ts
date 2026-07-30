import MusicApp from './MusicApp.vue';
import { definePhoneApp } from '@/core/appRegistry';

export default definePhoneApp({
  id: 'music',
  name: '音乐',
  icon: 'fa-music',
  description: '播放列表与歌词',
  accent: '#06c167',
  defaultRoute: 'root',
  defaultOrder: 137,
  component: MusicApp,
});
