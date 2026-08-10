<template>
<<<<<<< HEAD
  <div class="pc-settings-panel">
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>{{ t`酒馆手机` }}</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <div class="pc-actions">
          <button class="menu_button" type="button" @click="phone.openPhone()">
            {{ t`打开酒馆手机` }}
          </button>
          <button class="menu_button menu_button_secondary" type="button" @click="settingsStore.resetHomeLayout()">
            {{ t`重置布局` }}
          </button>
        </div>

        <section class="pc-section">
          <div class="pc-section-head">
            <strong>{{ t`主题` }}</strong>
            <span>{{ settings.theme === 'light' ? t`亮色` : t`暗色` }}</span>
          </div>
          <div class="pc-segment">
            <button
              :class="['pc-segment-btn', { active: settings.theme === 'light' }]"
              type="button"
              @click="settingsStore.setTheme('light')"
            >
              {{ t`亮色` }}
            </button>
            <button
              :class="['pc-segment-btn', { active: settings.theme === 'dark' }]"
              type="button"
              @click="settingsStore.setTheme('dark')"
            >
              {{ t`暗色` }}
            </button>
          </div>
        </section>

        <section class="pc-section">
          <div class="pc-switch-row">
            <div>
              <strong>{{ t`悬浮球` }}</strong>
              <p>{{ t`手机关闭时显示，支持拖拽打开。` }}</p>
            </div>
            <label class="pc-toggle">
              <input v-model="settings.floatBallEnabled" type="checkbox" />
              <span></span>
            </label>
          </div>
        </section>

        <section class="pc-section">
          <div class="pc-range-row">
            <div>
              <strong>{{ t`悬浮球尺寸` }}</strong>
              <p>{{ settings.floatBallSize }}px</p>
            </div>
            <input v-model="settings.floatBallSize" type="range" min="28" max="80" step="1" />
          </div>

          <div class="pc-color-row">
            <div>
              <strong>{{ t`悬浮球颜色` }}</strong>
              <p>{{ settings.floatBallColor }}</p>
            </div>
            <input v-model="settings.floatBallColor" type="color" />
          </div>

          <button
            class="menu_button menu_button_secondary"
            type="button"
            @click="settingsStore.resetFloatBallPosition()"
          >
            {{ t`重置悬浮球位置` }}
          </button>
        </section>

        <section class="pc-section">
          <div class="pc-section-head">
            <strong>{{ t`基础版状态` }}</strong>
            <span>{{ phone.isOpen ? t`手机已打开` : t`手机待机中` }}</span>
          </div>
          <p class="pc-copy">
            {{
              t`当前已接入手机壳、主屏、导航、悬浮球，以及总结、日记、番外、收藏、提示词、统计、阅读聊天、八股规则和设置。`
            }}
          </p>
        </section>
=======
  <div class="example-extension-settings">
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>{{ t`插件示例` }}</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <div class="example-extension_block flex-container">
          <input class="menu_button" type="submit" :value="t`示例按钮`" @click="handle_button_click" />
        </div>

        <div class="example-extension_block flex-container">
          <input v-model="settings.button_selected" type="checkbox" />
          <label for="example_setting">{{ t`示例开关` }}</label>
        </div>
>>>>>>> 03c14be1e7fc8ca933f4b0367a4fb2ef5b73de52

        <hr class="sysHR" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
<<<<<<< HEAD
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const settingsStore = useSettingsStore();
const phone = usePhoneStore();
const { settings } = storeToRefs(settingsStore);
</script>

<style scoped>
.pc-settings-panel {
  margin-block: 12px;
}

.pc-actions,
.pc-segment,
.pc-range-row,
.pc-color-row,
.pc-switch-row,
.pc-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-actions {
  margin-bottom: 14px;
}

.pc-section {
  padding: 14px 0;
  border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}

.pc-section:first-of-type {
  border-top: 0;
}

.pc-section strong {
  display: block;
  margin-bottom: 2px;
}

.pc-section p,
.pc-section span {
  color: var(--SmartThemeBodyColor);
  opacity: 0.78;
  font-size: 12px;
  line-height: 1.45;
}

.pc-copy {
  margin: 8px 0 0;
}

/* ui-reuse-allow: this setup panel renders outside .pc-phone-root and cannot inherit phone segment styles. */
.pc-segment {
  margin-top: 10px;
  padding: 4px;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border-radius: 999px;
}

/* ui-reuse-allow: this setup panel renders outside .pc-phone-root and cannot inherit phone segment styles. */
.pc-segment-btn {
  border: 0;
  border-radius: 999px;
  padding: 8px 14px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pc-segment-btn.active {
  background: color-mix(in srgb, var(--SmartThemeQuoteColor, #4a90e2) 24%, white 76%);
  color: #111;
}

.pc-range-row,
.pc-color-row {
  margin-bottom: 12px;
}

.pc-range-row input[type='range'] {
  width: 160px;
}

.pc-color-row input[type='color'] {
  width: 42px;
  height: 32px;
  border: 0;
  padding: 0;
  background: transparent;
}

/* ui-reuse-allow: Panel 位于手机根节点外，需要独立适配酒馆原生主题。 */
.pc-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.pc-toggle input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.pc-toggle span {
  width: 46px;
  height: 28px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 16%, transparent);
  position: relative;
  transition: background 160ms ease;
}

.pc-toggle span::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 160ms ease;
}

.pc-toggle input:checked + span {
  background: var(--SmartThemeQuoteColor, #4a90e2);
}

.pc-toggle input:checked + span::after {
  transform: translateX(18px);
}
</style>
=======
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const { settings } = storeToRefs(useSettingsStore());

const handle_button_click = () => {
  toastr.success('你好呀!');
};
</script>

<style scoped></style>
>>>>>>> 03c14be1e7fc8ca933f4b0367a4fb2ef5b73de52
