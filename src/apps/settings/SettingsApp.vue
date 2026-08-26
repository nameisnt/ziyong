<template>
  <section class="pc-settings-app">
    <SettingsDataManagementPage v-if="currentRoute.page === 'data'" />
    <template v-else>
      <nav class="pc-settings-tabs" aria-label="设置分类">
        <button
          v-for="tab in settingsTabs"
          :key="tab.id"
          :class="['pc-segment-btn', 'compact', { active: activeSettingsTab === tab.id }]"
          type="button"
          @click="activeSettingsTab = tab.id"
        >
          <i :class="tab.icon"></i><span>{{ tab.label }}</span>
        </button>
      </nav>
      <div class="pc-settings-panels">
        <SettingsGeneralPanel v-if="activeSettingsTab === 'general'" />
        <SettingsInterfacePanel v-else-if="activeSettingsTab === 'interface'" />
        <SettingsReaderPanel v-else-if="activeSettingsTab === 'reader'" />
        <SettingsConnectionPanel v-else-if="activeSettingsTab === 'connection'" />
        <SettingsAdvancedPanel v-else />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import SettingsAdvancedPanel from './SettingsAdvancedPanel.vue';
import SettingsConnectionPanel from './SettingsConnectionPanel.vue';
import SettingsDataManagementPage from './SettingsDataManagementPage.vue';
import SettingsGeneralPanel from './SettingsGeneralPanel.vue';
import SettingsInterfacePanel from './SettingsInterfacePanel.vue';
import SettingsReaderPanel from './SettingsReaderPanel.vue';
import { usePhoneStore } from '@/store/phone';
import { storeToRefs } from 'pinia';

type SettingsTabId = 'advanced' | 'connection' | 'general' | 'interface' | 'reader';
const phone = usePhoneStore();
const { currentRoute } = storeToRefs(phone);
const activeSettingsTab = ref<SettingsTabId>('general');
const settingsTabs = [
  { icon: 'fa-solid fa-database', id: 'general', label: '常规' },
  { icon: 'fa-solid fa-mobile-screen', id: 'interface', label: '界面' },
  { icon: 'fa-solid fa-book-open', id: 'reader', label: '阅读' },
  { icon: 'fa-solid fa-plug', id: 'connection', label: '连接' },
  { icon: 'fa-solid fa-sliders', id: 'advanced', label: '高级' },
] as const;
const settingsTabIds = settingsTabs.map(tab => tab.id);

watch(
  () => phone.currentRoute.params?.tab,
  tab => {
    if (typeof tab === 'string' && settingsTabIds.includes(tab as SettingsTabId))
      activeSettingsTab.value = tab as SettingsTabId;
  },
  { immediate: true },
);
</script>

<style scoped>
.pc-settings-app {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}
.pc-settings-tabs {
  z-index: 2;
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--pc-border);
  scrollbar-width: none;
}
.pc-settings-tabs .pc-segment-btn {
  flex: 0 0 auto;
  gap: 5px;
  white-space: nowrap;
}
.pc-settings-tabs::-webkit-scrollbar {
  display: none;
}
.pc-settings-tabs .pc-segment-btn span {
  white-space: nowrap;
}
.pc-settings-panels {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 14px 0 8px;
  overscroll-behavior: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}
</style>
