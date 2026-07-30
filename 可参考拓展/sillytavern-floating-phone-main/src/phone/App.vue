<template>
  <PhoneFrame>
    <StatusBar :time="time" :theme="statusTheme" />
    <DynamicIsland />
    <LockClock v-if="!activeApp" :time="time" :date="dateStr" />
    <HomePager v-if="!activeApp" :apps="homeApps" @app-click="handleAppClick" />
    <Dock v-if="!activeApp" :apps="dockApps" @app-click="handleAppClick" />
    <Transition name="app-open" mode="out-in">
      <RoleApp v-if="activeApp === 'role'" key="role" @close="activeApp = null" />
      <MessageApp v-else-if="activeApp === 'message'" key="message" @close="activeApp = null" />
      <MusicApp v-else-if="activeApp === 'music'" key="music" @close="closeMusicApp" />
      <ShoppingApp v-else-if="activeApp === 'shopping'" key="shopping" @close="activeApp = null" @detail-state="shoppingDetailOpen = $event" />
      <BrowserApp v-else-if="activeApp === 'browser'" key="browser" @close="closeBrowserApp" />
      <TheaterApp v-else-if="activeApp === 'Theater'" key="Theater" @close="activeApp = null" />
      <CompanyApp v-else-if="activeApp === 'company'" key="company" @close="closeLightApp('company')" />
      <MemoryApp v-else-if="activeApp === 'memory'" key="memory" @close="activeApp = null" />
      <LandlordApp v-else-if="activeApp === 'landlord'" key="landlord" @close="closeDarkApp('landlord')" />
      <DiaryApp v-else-if="activeApp === 'diary'" key="diary" @close="closeDarkApp('diary')" />
      <PetApp v-else-if="activeApp === 'pet'" key="pet" @close="closeLightApp('pet')" />
      <PeekApp v-else-if="activeApp === 'peek'" key="peek" @close="closeLightApp('peek')" />
      <ScheduleApp v-else-if="activeApp === 'schedule'" key="schedule" @close="closeLightApp('schedule')" />
      <InspectApp v-else-if="activeApp === 'inspect'" key="inspect" @close="closeLightApp('inspect')" />
    </Transition>
    <SettingsPanel v-model:show="showSettings" />
    <div class="home-indicator"></div>
  </PhoneFrame>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import BrowserApp from './components/BrowserApp.vue';
import CompanyApp from './components/CompanyApp.vue';
import DiaryApp from './components/DiaryApp.vue';
import Dock from './components/Dock.vue';
import DynamicIsland from './components/DynamicIsland.vue';
import HomePager from './components/HomePager.vue';
import InspectApp from './components/InspectApp.vue';
import LandlordApp from './components/LandlordApp.vue';
import LockClock from './components/LockClock.vue';
import MemoryApp from './components/MemoryApp.vue';
import MessageApp from './components/MessageApp.vue';
import MusicApp from './components/MusicApp.vue';
import PeekApp from './components/PeekApp.vue';
import PetApp from './components/PetApp.vue';
import PhoneFrame from './components/PhoneFrame.vue';
import RoleApp from './components/RoleApp.vue';
import ScheduleApp from './components/ScheduleApp.vue';
import ShoppingApp from './components/ShoppingApp.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import StatusBar from './components/StatusBar.vue';
import TheaterApp from './components/TheaterApp.vue';
import { useApiSettings } from './composables/useApiSettings.js';
import { useAppIcons } from './composables/useAppIcons.js';
import { useShellColor } from './composables/useShellColor.js';
import { useTime } from './composables/useTime.js';
import { useWallpaper } from './composables/useWallpaper.js';

const { time, dateStr } = useTime();
const { restore: restoreWall } = useWallpaper();
const { restore: restoreShell } = useShellColor();
const { restore: restoreApi } = useApiSettings();
const appIcons = useAppIcons();

const showSettings = ref(false);
const activeApp = ref(null);
const closingMusic = ref(false);
const closingBrowser = ref(false);
const closingLightApp = ref(false);
const closingDarkApp = ref(false);
const shoppingDetailOpen = ref(false);
const statusTheme = computed(() => (['message', 'music', 'browser', 'company', 'peek', 'schedule', 'inspect', 'landlord', 'diary', 'pet'].includes(activeApp.value) || (activeApp.value === 'shopping' && shoppingDetailOpen.value) || closingMusic.value || closingBrowser.value || closingLightApp.value || closingDarkApp.value) ? 'dark' : 'light');

const homeApps = computed(() => [
  appWithIcon('settings'),
  appWithIcon('role'),
  appWithIcon('peek'),
  appWithIcon('music'),
  appWithIcon('message'),
  appWithIcon('shopping'),
  appWithIcon('schedule'),
  appWithIcon('inspect'),
]);

const dockApps = computed(() => [
  appWithIcon('browser'),
  appWithIcon('Theater'),
  appWithIcon('company'),
  appWithIcon('memory'),
]);

function appWithIcon(id) {
  return appIcons.apps.value.find(app => app.id === id) || { id, name: id, url: '' };
}

function handleAppClick(app) {
  if (app.id === 'settings') {
    showSettings.value = true;
    return;
  }

  if (app.id === 'role') activeApp.value = 'role';
  if (app.id === 'schedule') activeApp.value = 'schedule';
  if (app.id === 'inspect') activeApp.value = 'inspect';
  if (app.id === 'message') activeApp.value = 'message';
  if (app.id === 'peek') activeApp.value = 'peek';
  if (app.id === 'music') activeApp.value = 'music';
  if (app.id === 'shopping') activeApp.value = 'shopping';
  if (app.id === 'browser') activeApp.value = 'browser';
  if (app.id === 'Theater') activeApp.value = 'Theater';
  if (app.id === 'company') activeApp.value = 'company';
  if (app.id === 'memory') activeApp.value = 'memory';
  if (app.id === 'landlord') activeApp.value = 'landlord';
  if (app.id === 'diary') activeApp.value = 'diary';
  if (app.id === 'pet') activeApp.value = 'pet';
}

function closeMusicApp() {
  closingMusic.value = true;
  activeApp.value = null;
  setTimeout(() => { closingMusic.value = false; }, 360);
}

function closeBrowserApp() {
  closingBrowser.value = true;
  activeApp.value = null;
  setTimeout(() => { closingBrowser.value = false; }, 360);
}

function closeLightApp(appId) {
  if (activeApp.value !== appId) return;
  closingLightApp.value = true;
  activeApp.value = null;
  setTimeout(() => { closingLightApp.value = false; }, 360);
}

function closeDarkApp(appId) {
  if (activeApp.value !== appId) return;
  closingDarkApp.value = true;
  activeApp.value = null;
  setTimeout(() => { closingDarkApp.value = false; }, 360);
}

onMounted(async () => {
  restoreWall();
  restoreShell();
  restoreApi();
});
</script>

<style scoped>
.home-indicator {
  position:absolute; bottom:8px; left:50%; transform:translateX(-50%);
  width:130px; height:5px; background:#fff; border-radius:3px;
  z-index:30; opacity:.85;
}
.app-open-enter-active,
.app-open-leave-active {
  transition:opacity .28s ease, transform .34s cubic-bezier(.2,.9,.2,1);
}
.app-open-enter-from {
  opacity:0;
  transform:translateY(28px) scale(.96);
}
.app-open-leave-to {
  opacity:0;
  transform:translateY(18px) scale(.985);
}
</style>
