<template>
  <section class="pc-settings-app">
    <SettingsDataManagementPage v-if="currentRoute.page === 'data'" />
    <SettingsExternalApiPage v-else-if="currentRoute.page === 'external-api'" />
    <template v-else>
      <label class="pc-settings-category">
        <i :class="activeTab.icon" aria-hidden="true"></i>
        <select v-model="activeSettingsTab" class="pc-select" aria-label="设置分类">
          <option v-for="tab in settingsTabs" :key="tab.id" :value="tab.id">{{ tab.label }}</option>
        </select>
      </label>
      <div class="pc-settings-panels">
        <SettingsInterfacePanel v-if="activeSettingsTab === 'interface'" />
        <SettingsReaderPanel v-else-if="activeSettingsTab === 'reader'" />
        <SettingsGenerationPanel v-else-if="activeSettingsTab === 'generation'" />
        <SettingsConnectionPanel v-else-if="activeSettingsTab === 'connection'" />
        <SettingsDataManagementPage v-else-if="activeSettingsTab === 'data'" />
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
import { usePhoneStore } from '@/store/phone';
import { storeToRefs } from 'pinia';

type SettingsTabId = 'advanced' | 'connection' | 'data' | 'generation' | 'interface' | 'reader';
const phone = usePhoneStore();
const { currentRoute } = storeToRefs(phone);
const activeSettingsTab = ref<SettingsTabId>('interface');
const settingsTabs = [
  { icon: 'fa-solid fa-mobile-screen', id: 'interface', label: '界面' },
  { icon: 'fa-solid fa-book-open', id: 'reader', label: '阅读' },
  { icon: 'fa-solid fa-wand-magic-sparkles', id: 'generation', label: '生成' },
  { icon: 'fa-solid fa-plug', id: 'connection', label: 'API 设置' },
  { icon: 'fa-solid fa-database', id: 'data', label: '数据' },
  { icon: 'fa-solid fa-sliders', id: 'advanced', label: '高级' },
] as const;
const settingsTabIds = settingsTabs.map(tab => tab.id);
const activeTab = computed(() => settingsTabs.find(tab => tab.id === activeSettingsTab.value) ?? settingsTabs[0]);

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
.pc-settings-category {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--pc-border);
}
.pc-settings-category > i {
  width: 20px;
  color: var(--pc-muted);
  text-align: center;
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
