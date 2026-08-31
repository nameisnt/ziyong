<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section">
      <div class="pc-section-head">
        <strong>选择默认 API</strong>
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
        <button class="pc-setting-row" type="button" @click="settingsStore.resetTextProvider()">
          <span class="pc-list-row-copy">
            <strong>酒馆当前 API</strong>
            <small>跟随酒馆当前 API / 模型</small>
          </span>
          <span class="pc-setting-control">
            <i
              v-if="settings.textProvider.mode === 'tavern'"
              class="fa-solid fa-check pc-active-mark"
              title="正在使用"
              aria-label="正在使用"
            ></i>
          </span>
        </button>

        <div
          v-for="profile in settings.textProvider.externalProfiles"
          :key="profile.id"
          class="pc-setting-row pc-api-profile-row"
        >
          <button class="pc-api-profile-select" type="button" @click="selectProfile(profile.id)">
            <span class="pc-list-row-copy">
              <strong>{{ profile.name }}</strong>
              <small>{{ profileSummary(profile) }}</small>
            </span>
            <i
              v-if="isSelectedProfile(profile.id)"
              class="fa-solid fa-check pc-active-mark"
              title="正在使用"
              aria-label="正在使用"
            ></i>
          </button>
          <button
            class="pc-icon-btn pc-api-profile-edit"
            type="button"
            :title="`编辑 ${profile.name}`"
            :aria-label="`编辑 ${profile.name}`"
            @click="openProfile(profile.id)"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import type { ExternalApiProfile } from '@/type/settings';
import { getExternalApiPreset } from '@/util/textProvider';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

function createExternalProfile() {
  const profile = settingsStore.createExternalApiProfile('custom', false);
  phone.pushPage('external-api', '外部 API 配置', { profileId: profile.id });
}
function openProfile(profileId: string) {
  phone.pushPage('external-api', '外部 API 配置', { profileId });
}
function selectProfile(profileId: string) {
  settingsStore.setActiveExternalApiProfile(profileId);
}
function isSelectedProfile(profileId: string) {
  return (
    settings.value.textProvider.mode === 'external' && settings.value.textProvider.activeExternalProfileId === profileId
  );
}
function profileSummary(profile: ExternalApiProfile) {
  return `${getExternalApiPreset(profile.presetId)?.label || '外部 API'} · ${profile.model.trim() || '未选择模型'}`;
}
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
}

.pc-api-profile-row {
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-api-profile-select {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-api-profile-edit,
.pc-active-mark {
  color: var(--pc-theme-accent);
}
</style>
