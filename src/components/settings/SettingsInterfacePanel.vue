<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section pc-settings-section">
      <div class="pc-row pc-row-top">
        <strong>界面尺寸</strong>
        <div class="pc-settings-actions">
          <button class="pc-soft-btn compact" type="button" title="适配当前窗口" @click="fitViewport">适配窗口</button
          ><button
            class="pc-soft-btn compact"
            type="button"
            title="恢复默认界面尺寸"
            @click="settingsStore.resetInterfaceSize()"
          >
            恢复默认
          </button>
        </div>
      </div>
      <div v-for="control in sizeControls" :key="control.id" class="pc-control-row">
        <div>
          <strong>{{ control.label }}</strong>
          <p>{{ control.value }}{{ control.suffix }}</p>
        </div>
        <div class="pc-range-with-number">
          <input
            :value="control.value"
            type="range"
            :min="control.min"
            :max="control.max"
            :step="control.step"
            @input="updateSize(control.id, numberValue($event))"
          /><input
            :value="control.value"
            class="pc-number-input"
            type="number"
            :min="control.min"
            :max="control.max"
            :step="control.step"
            @change="updateSize(control.id, numberValue($event))"
          />
        </div>
      </div>
      <div class="pc-layout-summary">
        <strong>主界面布局</strong><span>{{ `每页 ${homePageCapacity} 个 App` }}</span>
      </div>
      <div class="pc-inline-control-grid">
        <label v-for="control in layoutControls" :key="control.id" class="pc-inline-control"
          ><span>{{ control.label }}</span
          ><input
            :value="control.value"
            class="pc-field pc-number-control"
            type="number"
            :min="control.min"
            max="5"
            step="1"
            @change="updateLayout(control.id, numberValue($event))"
        /></label>
      </div>
      <button class="pc-soft-btn" type="button" @click="settingsStore.resetPhoneWindowPosition()">
        <i class="fa-solid fa-location-crosshairs"></i><span>重置手机位置</span>
      </button>
    </section>

    <section class="pc-page-section pc-settings-section">
      <div class="pc-row pc-row-top">
        <strong>悬浮球<InfoHint text="关闭手机后显示在页面右下角，可拖拽打开。" /></strong>
        <label class="pc-toggle"><input v-model="settings.floatBallEnabled" type="checkbox" /><span></span></label>
      </div>
      <div class="pc-control-row">
        <div>
          <strong>尺寸</strong>
          <p>{{ settings.floatBallSize }}px</p>
        </div>
        <input v-model="settings.floatBallSize" type="range" min="28" max="80" step="1" />
      </div>
      <div class="pc-control-row">
        <div>
          <strong>颜色</strong>
          <p>{{ settings.floatBallColor }}</p>
        </div>
        <input v-model="settings.floatBallColor" type="color" />
      </div>
      <button class="pc-soft-btn" type="button" @click="settingsStore.resetFloatBallPosition()">
        <i class="fa-solid fa-location-crosshairs"></i><span>重置悬浮球位置</span>
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
const homePageCapacity = computed(
  () => settings.value.interfaceSize.homeColumns * settings.value.interfaceSize.homeRows,
);
const sizeControls = computed(() => [
  {
    id: 'width' as const,
    label: '手机宽度',
    max: 720,
    min: 320,
    step: 10,
    suffix: 'px',
    value: settings.value.interfaceSize.phoneWidth,
  },
  {
    id: 'height' as const,
    label: '手机高度',
    max: 980,
    min: 560,
    step: 10,
    suffix: 'px',
    value: settings.value.interfaceSize.phoneHeight,
  },
  {
    id: 'reader' as const,
    label: '阅读器比例',
    max: 120,
    min: 80,
    step: 5,
    suffix: '%',
    value: settings.value.interfaceSize.readerScale,
  },
]);
const layoutControls = computed(() => [
  { id: 'columns' as const, label: '列', min: 3, value: settings.value.interfaceSize.homeColumns },
  { id: 'rows' as const, label: '行', min: 2, value: settings.value.interfaceSize.homeRows },
  { id: 'dock' as const, label: 'Dock', min: 3, value: settings.value.interfaceSize.dockColumns },
]);

function numberValue(event: Event) {
  return Number((event.target as HTMLInputElement).value);
}
function checkedValue(event: Event) {
  return (event.target as HTMLInputElement).checked;
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
function updateLayout(id: 'columns' | 'dock' | 'rows', value: number) {
  if (id === 'columns') settingsStore.setHomeColumns(value);
  else if (id === 'rows') settingsStore.setHomeRows(value);
  else settingsStore.setDockColumns(value);
}
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
  gap: 0;
}
.pc-row,
.pc-control-row,
.pc-inline-grid,
.pc-settings-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pc-row-top,
.pc-control-row {
  justify-content: space-between;
}
.pc-row > div,
.pc-control-row > div:first-child {
  min-width: 0;
}
.pc-control-row p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}
.pc-reader-setting-row {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pc-control-row input[type='range'] {
  min-width: 120px;
  flex: 1;
}
.pc-range-with-number {
  display: grid;
  min-width: min(220px, 58%);
  grid-template-columns: minmax(90px, 1fr) 72px;
  align-items: center;
  gap: 8px;
}
.pc-range-with-number input[type='range'] {
  min-width: 0;
}
.pc-number-input {
  width: 72px;
  min-width: 0;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  padding: 8px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
}
.pc-layout-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--pc-border);
  padding-top: 12px;
}
.pc-layout-summary span {
  color: var(--pc-muted);
  font-size: 12px;
  text-align: right;
}
.pc-reader-setting-row .pc-segment {
  flex: 0 1 230px;
  min-width: 0;
}
.pc-reader-setting-row .pc-segment-btn {
  flex: 1;
}
.pc-control-row input[type='color'] {
  width: 52px;
  height: 36px;
  border: 0;
  padding: 0;
  background: transparent;
}
@media (max-width: 420px) {
  .pc-range-with-number {
    min-width: 55%;
  }
}
</style>
