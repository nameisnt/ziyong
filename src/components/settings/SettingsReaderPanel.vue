<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section pc-settings-section">
      <div class="pc-row pc-row-top">
        <div>
          <strong>阅读器设置</strong>
          <p>只影响正文阅读页面，不改变手机主界面。</p>
        </div>
        <button class="pc-soft-btn" type="button" @click="settingsStore.resetReaderAppearance()">恢复默认</button>
      </div>

      <div class="pc-reader-control">
        <label class="pc-field-label" for="pc-reader-font-size">字号 {{ settings.reader.fontSize }}px</label>
        <input
          id="pc-reader-font-size"
          :value="settings.reader.fontSize"
          type="range"
          min="14"
          max="24"
          step="1"
          @input="settingsStore.setReaderFontSize(numberValue($event))"
        />
      </div>
      <div class="pc-reader-control">
        <label class="pc-field-label" for="pc-reader-line-height"
          >行高 {{ settings.reader.lineHeight.toFixed(1) }}</label
        >
        <input
          id="pc-reader-line-height"
          :value="settings.reader.lineHeight"
          type="range"
          min="1.4"
          max="2.2"
          step="0.1"
          @input="settingsStore.setReaderLineHeight(numberValue($event))"
        />
      </div>
      <label class="pc-field-group">
        <span class="pc-field-label">阅读器字体</span>
        <select class="pc-select" :value="settings.reader.fontFamily" @change="setFontFamily">
          <option value="">跟随手机字体</option>
          <option value="system-ui, sans-serif">系统无衬线</option>
          <option value="serif">系统衬线</option>
          <option value="ui-monospace, monospace">等宽字体</option>
          <option value="'Noto Serif SC', serif">思源宋体</option>
        </select>
      </label>
      <div class="pc-reader-toggle-grid">
        <label class="pc-reader-setting-row">
          <strong>首行缩进</strong>
          <span class="pc-toggle">
            <input
              :checked="settings.reader.firstLineIndent"
              type="checkbox"
              @change="settingsStore.setReaderFirstLineIndent(checkedValue($event))"
            /><span></span>
          </span>
        </label>
        <label class="pc-reader-setting-row">
          <strong>每行空行</strong>
          <span class="pc-toggle">
            <input
              :checked="settings.reader.blankLineBetweenLines"
              type="checkbox"
              @change="settingsStore.setReaderBlankLineBetweenLines(checkedValue($event))"
            /><span></span>
          </span>
        </label>
      </div>
    </section>

    <section class="pc-page-section pc-settings-section">
      <div class="pc-section-head"><strong>正文颜色与背景</strong></div>
      <div class="pc-reader-color-grid">
        <label class="pc-field-group">
          <span class="pc-field-label">正文颜色</span>
          <input v-model="settings.visualTheme.readerTextColor" type="color" />
        </label>
        <label class="pc-field-group">
          <span class="pc-field-label">背景颜色</span>
          <input
            type="color"
            :value="settings.reader.backgroundColor || fallbackBackground"
            @input="settingsStore.setReaderBackgroundColor(inputValue($event))"
          />
        </label>
      </div>
      <label class="pc-field-group">
        <span class="pc-field-label">背景图片地址</span>
        <input
          class="pc-field"
          :value="settings.reader.backgroundImage"
          placeholder="https://…、data:image/… 或站内 / 路径"
          @change="settingsStore.setReaderBackgroundImage(inputValue($event))"
        />
      </label>
      <button class="pc-soft-btn" type="button" @click="clearBackground">清除阅读器背景</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const fallbackBackground = computed(() => (settings.value.theme === 'dark' ? '#1c1c1e' : '#ffffff'));

function numberValue(event: Event) {
  return Number((event.target as HTMLInputElement).value);
}

function inputValue(event: Event) {
  return (event.target as HTMLInputElement).value;
}

function checkedValue(event: Event) {
  return (event.target as HTMLInputElement).checked;
}

function setFontFamily(event: Event) {
  settingsStore.setReaderFontFamily((event.target as HTMLSelectElement).value);
}

function clearBackground() {
  settingsStore.setReaderBackgroundColor('');
  settingsStore.setReaderBackgroundImage('');
}
</script>

<style scoped>
.pc-reader-control,
.pc-reader-toggle-grid,
.pc-reader-color-grid {
  display: grid;
  gap: 10px;
}

.pc-reader-control input[type='range'] {
  width: 100%;
  accent-color: var(--pc-theme-accent);
}

.pc-reader-toggle-grid,
.pc-reader-color-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pc-reader-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-reader-color-grid input[type='color'] {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}
</style>
