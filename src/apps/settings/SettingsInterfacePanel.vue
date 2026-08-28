<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section">
      <div class="pc-section-head">
        <strong>窗口尺寸</strong>
        <div class="pc-settings-actions">
          <button class="pc-soft-btn compact" type="button" title="适配当前窗口" @click="fitViewport">
            <i class="fa-solid fa-expand"></i><span>适配窗口</span>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            title="恢复默认窗口尺寸"
            aria-label="恢复默认窗口尺寸"
            @click="resetWindowSize"
          >
            <i class="fa-solid fa-arrow-rotate-left"></i>
          </button>
        </div>
      </div>
      <div class="pc-settings-list">
        <div v-for="control in sizeControls" :key="control.id" class="pc-setting-row">
          <strong>{{ control.label }}</strong>
          <div class="pc-range-number">
            <input
              :value="control.value"
              type="range"
              :aria-label="control.label"
              :min="control.min"
              :max="control.max"
              :step="control.step"
              @input="updateSize(control.id, numberValue($event))"
            />
            <input
              :value="control.value"
              class="pc-field"
              type="number"
              :aria-label="`${control.label}，单位像素`"
              :min="control.min"
              :max="control.max"
              :step="control.step"
              @change="updateSize(control.id, numberValue($event))"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="pc-page-section">
      <div class="pc-section-head"><strong>主界面</strong></div>
      <div class="pc-settings-list">
        <div class="pc-setting-row">
          <strong>图标列数</strong>
          <StepperControl
            :value="settings.interfaceSize.homeColumns"
            :min="3"
            :max="5"
            label="图标列数"
            @update:value="settingsStore.setHomeColumns"
          />
        </div>
        <button class="pc-setting-row" type="button" @click="restoreHomeLayout">
          <strong>重置主页布局</strong>
          <i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
        </button>
        <button class="pc-setting-row" type="button" @click="settingsStore.resetPhoneWindowPosition()">
          <strong>重置手机位置</strong>
          <i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
        </button>
      </div>
    </section>

    <section class="pc-page-section">
      <div class="pc-section-head">
        <strong>
          悬浮球
          <InfoHint text="关闭手机后显示在页面右下角，可拖拽打开。" />
        </strong>
      </div>
      <div class="pc-settings-list">
        <label class="pc-setting-row">
          <strong>显示悬浮球</strong>
          <span class="pc-toggle"><input v-model="settings.floatBallEnabled" type="checkbox" /><span></span></span>
        </label>
        <template v-if="settings.floatBallEnabled">
          <div class="pc-setting-row">
            <strong>尺寸</strong>
            <div class="pc-setting-control pc-float-size-control">
              <input v-model="settings.floatBallSize" aria-label="悬浮球尺寸" type="range" min="28" max="80" step="1" />
              <span class="pc-setting-value">{{ settings.floatBallSize }}px</span>
            </div>
          </div>
          <label class="pc-setting-row">
            <strong>颜色</strong>
            <input v-model="settings.floatBallColor" class="pc-color-input" aria-label="悬浮球颜色" type="color" />
          </label>
          <button class="pc-setting-row" type="button" @click="settingsStore.resetFloatBallPosition()">
            <strong>重置悬浮球位置</strong>
            <i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
          </button>
        </template>
      </div>
    </section>

    <section class="pc-page-section">
      <button class="pc-setting-row" type="button" @click="phone.openApp('theme')">
        <strong>主题与图标</strong>
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import StepperControl from '@/components/StepperControl.vue';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const sizeControls = computed(() => [
  {
    id: 'width' as const,
    label: '设备宽度',
    max: 720,
    min: 320,
    step: 10,
    value: settings.value.interfaceSize.phoneWidth,
  },
  {
    id: 'height' as const,
    label: '设备高度',
    max: 980,
    min: 560,
    step: 10,
    value: settings.value.interfaceSize.phoneHeight,
  },
]);

function numberValue(event: Event) {
  return Number((event.target as HTMLInputElement).value);
}
function fitViewport() {
  settingsStore.setPhoneWindowWidth(window.innerWidth);
  settingsStore.setPhoneWindowHeight(window.innerHeight);
  settingsStore.setPhoneWindowPosition(0, 0);
  toastr.success('已按当前窗口调整手机宽高');
}
function resetWindowSize() {
  settingsStore.setPhoneWindowWidth(360);
  settingsStore.setPhoneWindowHeight(700);
}
function restoreHomeLayout() {
  settingsStore.resetHomeLayout();
  toastr.success('主页布局已恢复默认');
}
function updateSize(id: 'height' | 'width', value: number) {
  if (id === 'width') settingsStore.setPhoneWindowWidth(value);
  else settingsStore.setPhoneWindowHeight(value);
}
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
}
.pc-settings-actions,
.pc-float-size-control {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pc-float-size-control input[type='range'] {
  width: min(180px, 40vw);
}
.pc-color-input {
  width: 48px;
  height: 34px;
  padding: 0;
  border: 0;
  background: transparent;
}
.pc-setting-row > i {
  color: var(--pc-muted);
}
</style>
