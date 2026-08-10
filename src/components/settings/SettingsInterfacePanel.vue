<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-settings-card">
      <div class="pc-row pc-row-top">
        <div>
          <strong>阅读器</strong>
          <p>影响日记、番外、总结、书信、论坛、小剧场和阅读聊天的详情正文。</p>
        </div>
        <button class="pc-soft-btn compact" type="button" @click="settingsStore.resetReaderAppearance()">
          <i class="fa-solid fa-rotate-left"></i><span>默认</span>
        </button>
      </div>
      <div class="pc-select-field">
        <label class="pc-field-label">使用字体</label
        ><select :value="readerFontSelectionValue" class="pc-select" @change="onReaderFontSelect">
          <option value="">跟随手机字体</option>
          <option v-for="option in builtinFontOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
          <optgroup v-if="settings.customFont.fonts.length" label="自定义字体">
            <option v-for="font in settings.customFont.fonts" :key="font.id" :value="`custom:${font.id}`">
              {{ font.name }}
            </option>
          </optgroup>
        </select>
      </div>
      <div class="pc-control-row">
        <div>
          <strong>字号</strong>
          <p>{{ settings.reader.fontSize }}px</p>
        </div>
        <input
          :value="settings.reader.fontSize"
          type="range"
          min="14"
          max="24"
          step="1"
          @input="settingsStore.setReaderFontSize(numberValue($event))"
        />
      </div>
      <div class="pc-control-row">
        <div>
          <strong>行高</strong>
          <p>{{ settings.reader.lineHeight.toFixed(1) }}</p>
        </div>
        <input
          :value="settings.reader.lineHeight"
          type="range"
          min="1.4"
          max="2.2"
          step="0.1"
          @input="settingsStore.setReaderLineHeight(numberValue($event))"
        />
      </div>
      <label class="pc-toggle-row"
        ><span><strong>首行缩进</strong></span
        ><input
          :checked="settings.reader.firstLineIndent"
          type="checkbox"
          @change="settingsStore.setReaderFirstLineIndent(checkedValue($event))"
      /></label>
      <label class="pc-toggle-row"
        ><span><strong>每行空行</strong></span
        ><input
          :checked="settings.reader.blankLineBetweenLines"
          type="checkbox"
          @change="settingsStore.setReaderBlankLineBetweenLines(checkedValue($event))"
      /></label>
      <div class="pc-reader-version-position">
        <span class="pc-field-label">版本切换位置</span>
        <div class="pc-segment" role="group" aria-label="版本切换位置">
          <button
            :class="['pc-segment-btn', { active: settings.reader.versionNavigatorPosition === 'before' }]"
            type="button"
            @click="settingsStore.setReaderVersionNavigatorPosition('before')"
          >
            正文上方</button
          ><button
            :class="['pc-segment-btn', { active: settings.reader.versionNavigatorPosition === 'after' }]"
            type="button"
            @click="settingsStore.setReaderVersionNavigatorPosition('after')"
          >
            正文下方
          </button>
        </div>
      </div>
    </section>

    <section class="pc-settings-card">
      <div class="pc-row pc-row-top">
        <div>
          <strong>界面尺寸</strong>
          <p>调整手机窗口固定宽高，阅读器比例会影响详情正文宽度。</p>
        </div>
        <div class="pc-settings-actions">
          <button class="pc-soft-btn compact" type="button" @click="fitViewport">
            <i class="fa-solid fa-expand"></i><span>适配</span></button
          ><button class="pc-soft-btn compact" type="button" @click="settingsStore.resetInterfaceSize()">
            <i class="fa-solid fa-rotate-left"></i><span>默认</span>
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
        <strong>主界面布局</strong
        ><span
          >{{ settings.interfaceSize.homeColumns }} 列 × {{ settings.interfaceSize.homeRows }} 行，每页
          {{ homePageCapacity }} 个 App</span
        >
      </div>
      <div class="pc-inline-grid three-cols">
        <label v-for="control in layoutControls" :key="control.id" class="pc-select-field"
          ><span class="pc-field-label">{{ control.label }}</span
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

    <section class="pc-settings-card">
      <div class="pc-row pc-row-top">
        <div>
          <strong>悬浮球</strong>
          <p>关闭手机后显示在页面右下角，可拖拽打开。</p>
        </div>
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
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const builtinFontOptions = [
  { label: '思源黑体 / Noto Sans SC', value: 'Noto Sans SC, Microsoft YaHei, sans-serif' },
  { label: '宋体阅读', value: 'SimSun, Songti SC, serif' },
  { label: '楷体阅读', value: 'KaiTi, STKaiti, serif' },
  { label: '等宽字体', value: 'SFMono-Regular, Consolas, Liberation Mono, monospace' },
];
const readerFontSelectionValue = computed(() => {
  const custom = settings.value.customFont.fonts.find(
    item => settings.value.reader.fontFamily === settingsStore.getCustomFontFamily(item.id),
  );
  return custom ? `custom:${custom.id}` : settings.value.reader.fontFamily;
});
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
  { id: 'columns' as const, label: '主界面列数', min: 3, value: settings.value.interfaceSize.homeColumns },
  { id: 'rows' as const, label: '主界面行数', min: 2, value: settings.value.interfaceSize.homeRows },
  { id: 'dock' as const, label: 'Dock 列数', min: 3, value: settings.value.interfaceSize.dockColumns },
]);

function numberValue(event: Event) {
  return Number((event.target as HTMLInputElement).value);
}
function checkedValue(event: Event) {
  return (event.target as HTMLInputElement).checked;
}
function onReaderFontSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  settingsStore.setReaderFontFamily(
    value.startsWith('custom:') ? settingsStore.getCustomFontFamily(value.slice(7)) : value,
  );
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
  gap: 14px;
}
.pc-settings-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  padding: 16px;
  background: color-mix(in srgb, var(--pc-surface) 82%, transparent 18%);
}
.pc-row,
.pc-control-row,
.pc-toggle-row,
.pc-inline-grid,
.pc-settings-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pc-row-top,
.pc-control-row,
.pc-toggle-row {
  justify-content: space-between;
}
.pc-row > div,
.pc-control-row > div:first-child {
  min-width: 0;
}
.pc-row p,
.pc-control-row p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}
.pc-toggle-row {
  min-height: 40px;
}
.pc-toggle-row input {
  width: 20px;
  height: 20px;
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
.pc-inline-grid {
  display: grid;
}
.pc-inline-grid.three-cols {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.pc-select-field {
  display: grid;
  gap: 7px;
}
.pc-reader-version-position {
  display: grid;
  gap: 8px;
}
.pc-reader-version-position .pc-segment {
  width: 100%;
}
.pc-reader-version-position .pc-segment-btn {
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
  .pc-inline-grid.three-cols {
    grid-template-columns: 1fr;
  }
  .pc-range-with-number {
    min-width: 55%;
  }
}
</style>
