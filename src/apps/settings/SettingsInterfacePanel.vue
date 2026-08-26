<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section pc-settings-section">
      <div class="pc-section-head">
        <strong>界面尺寸</strong>
        <div class="pc-settings-actions">
          <button class="pc-soft-btn compact" type="button" title="适配当前窗口" @click="fitViewport">
            <i class="fa-solid fa-expand"></i><span>适配</span>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            title="恢复默认界面尺寸"
            aria-label="恢复默认界面尺寸"
            @click="settingsStore.resetInterfaceSize()"
          >
            <i class="fa-solid fa-arrow-rotate-left"></i>
          </button>
        </div>
      </div>
      <div v-for="control in sizeControls" :key="control.id" class="pc-list-row pc-settings-control-row">
        <span class="pc-list-row-copy">
          <strong>{{ control.label }}</strong>
          <small>{{ `${control.value}${control.unit}` }}</small>
        </span>
        <div class="pc-range-with-number">
          <input
            :value="control.value"
            type="range"
            :aria-label="control.label"
            :min="control.min"
            :max="control.max"
            :step="control.step"
            @input="updateSize(control.id, numberValue($event))"
          /><input
            :value="control.value"
            class="pc-field pc-number-input"
            type="number"
            :aria-label="`${control.label}数值`"
            :min="control.min"
            :max="control.max"
            :step="control.step"
            @change="updateSize(control.id, numberValue($event))"
          />
        </div>
      </div>
    </section>

    <section class="pc-page-section pc-settings-section">
      <div class="pc-section-head"><strong>主界面密度</strong></div>
      <label class="pc-list-row pc-settings-choice-row">
        <span class="pc-list-row-copy"><strong>图标列数</strong><small>控制分组内每行显示数量</small></span>
        <select
          class="pc-select pc-settings-select"
          :value="settings.interfaceSize.homeColumns"
          aria-label="主界面图标列数"
          @change="settingsStore.setHomeColumns(numberValue($event))"
        >
          <option v-for="count in [3, 4, 5]" :key="count" :value="count">{{ `${count} 列` }}</option>
        </select>
      </label>
      <label class="pc-list-row pc-settings-choice-row">
        <span class="pc-list-row-copy"><strong>Dock 数量</strong><small>底部固定 App 的最大数量</small></span>
        <select
          class="pc-select pc-settings-select"
          :value="settings.interfaceSize.dockColumns"
          aria-label="Dock App 数量"
          @change="settingsStore.setDockColumns(numberValue($event))"
        >
          <option v-for="count in [3, 4, 5]" :key="count" :value="count">{{ `${count} 个` }}</option>
        </select>
      </label>
      <button class="pc-list-row pc-settings-action-row" type="button" @click="settingsStore.resetPhoneWindowPosition()">
        <span class="pc-list-row-copy"><strong>重置手机位置</strong><small>将浮动窗口恢复到默认位置</small></span>
        <i class="fa-solid fa-location-crosshairs"></i>
      </button>
    </section>

    <section class="pc-page-section pc-settings-section">
      <div class="pc-section-head"><strong>悬浮球</strong><InfoHint text="关闭手机后显示在页面右下角，可拖拽打开。" /></div>
      <label class="pc-list-row pc-settings-choice-row">
        <span class="pc-list-row-copy"><strong>显示悬浮球</strong><small>关闭手机后保留快速入口</small></span>
        <span class="pc-toggle"><input v-model="settings.floatBallEnabled" type="checkbox" /><span></span></span>
      </label>
      <div class="pc-list-row pc-settings-control-row">
        <span class="pc-list-row-copy">
          <strong>尺寸</strong>
          <small>{{ `${settings.floatBallSize}px` }}</small>
        </span>
        <input v-model="settings.floatBallSize" aria-label="悬浮球尺寸" type="range" min="28" max="80" step="1" />
      </div>
      <label class="pc-list-row pc-settings-choice-row">
        <span class="pc-list-row-copy">
          <strong>颜色</strong>
          <small>{{ settings.floatBallColor }}</small>
        </span>
        <input v-model="settings.floatBallColor" aria-label="悬浮球颜色" type="color" />
      </label>
      <button class="pc-list-row pc-settings-action-row" type="button" @click="settingsStore.resetFloatBallPosition()">
        <span class="pc-list-row-copy"><strong>重置悬浮球位置</strong><small>恢复到页面右下角</small></span>
        <i class="fa-solid fa-location-crosshairs"></i>
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const sizeControls = computed(() => [
  {
    id: 'width' as const,
    label: '手机宽度',
    max: 720,
    min: 320,
    step: 10,
    unit: 'px',
    value: settings.value.interfaceSize.phoneWidth,
  },
  {
    id: 'height' as const,
    label: '手机高度',
    max: 980,
    min: 560,
    step: 10,
    unit: 'px',
    value: settings.value.interfaceSize.phoneHeight,
  },
  {
    id: 'reader' as const,
    label: '阅读器比例',
    max: 120,
    min: 80,
    step: 5,
    unit: '%',
    value: settings.value.interfaceSize.readerScale,
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
function updateSize(id: 'height' | 'reader' | 'width', value: number) {
  if (id === 'width') settingsStore.setPhoneWindowWidth(value);
  else if (id === 'height') settingsStore.setPhoneWindowHeight(value);
  else settingsStore.setReaderScale(value);
}
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
  gap: 0;
}
.pc-settings-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pc-settings-section > .pc-list-row {
  margin-top: -1px;
}
.pc-range-with-number {
  display: grid;
  width: min(230px, 62%);
  grid-template-columns: minmax(80px, 1fr) 68px;
  align-items: center;
  gap: 8px;
}
.pc-range-with-number input[type='range'] {
  min-width: 0;
}
.pc-number-input {
  width: 68px;
}
.pc-settings-select {
  width: 92px;
}
.pc-settings-choice-row input[type='color'] {
  width: 52px;
  height: 36px;
  border: 0;
  padding: 0;
  background: transparent;
}
.pc-settings-action-row > i {
  color: var(--pc-muted);
}
@media (max-width: 420px) {
  .pc-range-with-number {
    width: min(200px, 60%);
    grid-template-columns: minmax(64px, 1fr) 62px;
  }
  .pc-number-input {
    width: 62px;
  }
}
</style>
