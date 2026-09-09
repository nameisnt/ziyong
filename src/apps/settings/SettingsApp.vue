<template>
  <section class="pc-settings-app">
    <SettingsDataManagementPage v-if="currentRoute.page === 'data'" />
    <SettingsExternalApiPage v-else-if="currentRoute.page === 'external-api'" />
    <template v-else>
      <nav class="pc-settings-tabs" role="tablist" aria-label="设置分类">
        <button
          v-for="tab in settingsTabs"
          :id="`pc-settings-tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          :class="['pc-segment-btn', { active: activeSettingsTab === tab.id }]"
          :aria-selected="activeSettingsTab === tab.id"
          aria-controls="pc-settings-panel"
          :tabindex="activeSettingsTab === tab.id ? 0 : -1"
          @click="selectTab(tab.id)"
          @keydown="onTabKey($event, tab.id)"
        >
          {{ tab.label }}
        </button>
      </nav>
      <div
        id="pc-settings-panel"
        class="pc-settings-panels"
        role="tabpanel"
        :aria-labelledby="`pc-settings-tab-${activeSettingsTab}`"
      >
        <SettingsInterfacePanel v-if="activeSettingsTab === 'interface'" />
        <SettingsReaderPanel v-else-if="activeSettingsTab === 'reader'" />
        <SettingsGenerationPanel v-else-if="activeSettingsTab === 'generation'" />
        <SettingsConnectionPanel v-else-if="activeSettingsTab === 'connection'" />
        <SettingsDataManagementPage v-else-if="activeSettingsTab === 'data'" />
        <SettingsReleasePanel v-else-if="activeSettingsTab === 'release'" />
        <SettingsAdvancedPanel v-else />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import SettingsAdvancedPanel from './SettingsAdvancedPanel.vue';
import SettingsConnectionPanel from './SettingsConnectionPanel.vue';
import SettingsDataManagementPage from './SettingsDataManagementPage.vue';
import SettingsExternalApiPage from './SettingsExternalApiPage.vue';
import SettingsGenerationPanel from './SettingsGenerationPanel.vue';
import SettingsInterfacePanel from './SettingsInterfacePanel.vue';
import SettingsReaderPanel from './SettingsReaderPanel.vue';
import SettingsReleasePanel from './SettingsReleasePanel.vue';
import { usePhoneStore } from '@/store/phone';
import { storeToRefs } from 'pinia';

type SettingsTabId = 'advanced' | 'connection' | 'data' | 'generation' | 'interface' | 'reader' | 'release';
const phone = usePhoneStore();
const { currentRoute } = storeToRefs(phone);
const settingsTabs = [
  { id: 'release', label: '更新' },
  { id: 'interface', label: '界面' },
  { id: 'reader', label: '阅读' },
  { id: 'generation', label: '生成' },
  { id: 'connection', label: 'API 设置' },
  { id: 'data', label: '数据' },
  { id: 'advanced', label: '高级' },
] as const;
const settingsTabIds = settingsTabs.map(tab => tab.id);
const activeSettingsTab = computed<SettingsTabId>(() => {
  const tab = currentRoute.value.params?.tab as SettingsTabId | undefined;
  return tab && settingsTabIds.includes(tab) ? tab : 'release';
});
function selectTab(tab: SettingsTabId) {
  phone.replaceRoute('settings', currentRoute.value.page, currentRoute.value.title, {
    ...currentRoute.value.params,
    tab,
  });
}

function onTabKey(event: KeyboardEvent, tab: SettingsTabId) {
  const index = settingsTabIds.indexOf(tab);
  let next: number;
  if (event.key === 'ArrowRight') next = (index + 1) % settingsTabs.length;
  else if (event.key === 'ArrowLeft') next = (index + settingsTabs.length - 1) % settingsTabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = settingsTabs.length - 1;
  else return;
  event.preventDefault();
  selectTab(settingsTabs[next].id);
  document.getElementById(`pc-settings-tab-${settingsTabs[next].id}`)?.focus();
}
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
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: center;
  gap: 6px;
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--pc-border);
}
.pc-settings-panels {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 10px 0 8px;
  overscroll-behavior: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}
</style>
