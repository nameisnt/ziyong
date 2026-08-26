<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section">
      <div class="pc-section-head">
        <strong>文本通道</strong>
        <button
          class="pc-icon-btn"
          type="button"
          title="恢复文本通道默认值"
          aria-label="恢复文本通道默认值"
          @click="settingsStore.resetTextProvider()"
        >
          <i class="fa-solid fa-rotate-left"></i>
        </button>
      </div>
      <div class="pc-segment">
        <button
          :class="['pc-segment-btn', { active: settings.textProvider.mode === 'tavern' }]"
          type="button"
          @click="settings.textProvider.mode = 'tavern'"
        >
          酒馆当前 API
        </button>
        <button
          :class="['pc-segment-btn', { active: settings.textProvider.mode === 'external' }]"
          type="button"
          @click="enableExternalMode"
        >
          外部兼容 API
        </button>
      </div>
    </section>

    <section v-if="settings.textProvider.mode === 'external'" class="pc-page-section">
      <div class="pc-section-head">
        <strong>外部 API 配置</strong>
        <button
          class="pc-icon-btn"
          type="button"
          title="新建外部 API 配置"
          aria-label="新建外部 API 配置"
          @click="createExternalProfile"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
      <div class="pc-settings-list">
        <button
          v-for="profile in settings.textProvider.externalProfiles"
          :key="profile.id"
          class="pc-setting-row"
          type="button"
          @click="openProfile(profile.id)"
        >
          <strong>{{ profile.name }}</strong>
          <span class="pc-setting-control">
            <i
              v-if="profile.id === settings.textProvider.activeExternalProfileId"
              class="fa-solid fa-check pc-active-mark"
              title="正在使用"
              aria-label="正在使用"
            ></i>
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

function enableExternalMode() {
  if (!settings.value.textProvider.externalProfiles.length) createExternalProfile();
  else settings.value.textProvider.mode = 'external';
}
function createExternalProfile() {
  settingsStore.createExternalApiProfile('custom');
  phone.pushPage('external-api', '外部 API 配置');
}
function openProfile(profileId: string) {
  settingsStore.setActiveExternalApiProfile(profileId);
  phone.pushPage('external-api', '外部 API 配置');
}
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
}
.pc-setting-control > i {
  color: var(--pc-muted);
}
.pc-setting-control .pc-active-mark {
  color: var(--pc-theme-accent);
}
</style>
