<template>
  <section class="pc-settings-app">
    <SettingsDataManagementPage v-if="currentRoute.page === 'data'" />
    <template v-else>
      <nav class="pc-settings-tabs" aria-label="设置分类">
        <button
          v-for="tab in settingsTabs"
          :key="tab.id"
          :class="['pc-segment-btn', { active: activeSettingsTab === tab.id }]"
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
import SettingsAdvancedPanel from './settings/SettingsAdvancedPanel.vue';
import SettingsConnectionPanel from './settings/SettingsConnectionPanel.vue';
import SettingsDataManagementPage from './settings/SettingsDataManagementPage.vue';
import SettingsGeneralPanel from './settings/SettingsGeneralPanel.vue';
import SettingsInterfacePanel from './settings/SettingsInterfacePanel.vue';
import SettingsReaderPanel from './settings/SettingsReaderPanel.vue';
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
  gap: 8px;
  overflow: hidden;
}
.pc-settings-tabs {
  z-index: 2;
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 3px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  padding: 5px;
  background: color-mix(in srgb, var(--pc-surface) 88%, transparent);
  backdrop-filter: blur(10px);
}
.pc-settings-tabs .pc-segment-btn {
  min-width: 0;
  min-inline-size: 0;
  gap: 3px;
  white-space: nowrap;
}
.pc-settings-tabs .pc-segment-btn span {
  white-space: nowrap;
}
@media (max-width: 380px) {
  .pc-settings-tabs .pc-segment-btn {
    gap: 2px;
  }
}
.pc-settings-panels {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 8px;
  overscroll-behavior: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}
</style>
