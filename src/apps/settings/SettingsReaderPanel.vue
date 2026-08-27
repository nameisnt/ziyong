<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section">
      <div class="pc-section-head">
        <strong>正文阅读</strong>
        <button class="pc-soft-btn compact" type="button" @click="resetReaderSettings">恢复本页默认</button>
      </div>
      <div class="pc-settings-list">
        <div class="pc-setting-row">
          <strong>阅读比例</strong>
          <div class="pc-range-number">
            <input
              :value="settings.interfaceSize.readerScale"
              aria-label="阅读比例"
              type="range"
              min="80"
              max="120"
              step="5"
              @input="settingsStore.setReaderScale(numberValue($event))"
            />
            <input
              :value="settings.interfaceSize.readerScale"
              class="pc-field"
              aria-label="阅读比例百分比"
              type="number"
              min="80"
              max="120"
              step="5"
              @change="settingsStore.setReaderScale(numberValue($event))"
            />
          </div>
        </div>
        <div class="pc-setting-row">
          <strong>字号</strong>
          <div class="pc-setting-control pc-reader-range">
            <input
              :value="settings.reader.fontSize"
              aria-label="正文字号"
              type="range"
              min="14"
              max="24"
              step="1"
              @input="settingsStore.setReaderFontSize(numberValue($event))"
            />
            <span class="pc-setting-value">{{ settings.reader.fontSize }}px</span>
          </div>
        </div>
        <div class="pc-setting-row">
          <strong>行高</strong>
          <div class="pc-setting-control pc-reader-range">
            <input
              :value="settings.reader.lineHeight"
              aria-label="正文行高"
              type="range"
              min="1.4"
              max="2.2"
              step="0.1"
              @input="settingsStore.setReaderLineHeight(numberValue($event))"
            />
            <span class="pc-setting-value">{{ settings.reader.lineHeight.toFixed(1) }}</span>
          </div>
        </div>
        <div class="pc-setting-row pc-reader-font-row">
          <strong>阅读字体</strong>
          <SearchableCombobox
            v-model="readerFontSelectionValue"
            :empty-label="t`没有匹配的字体`"
            input-label="选择阅读字体"
            :options="readerFontSelectionOptions"
            placeholder="选择阅读字体"
            :toggle-title="t`展开阅读器字体`"
          />
        </div>
        <label class="pc-setting-row">
          <strong>首行缩进</strong>
          <span class="pc-toggle">
            <input
              :checked="settings.reader.firstLineIndent"
              type="checkbox"
              @change="settingsStore.setReaderFirstLineIndent(checkedValue($event))"
            /><span></span>
          </span>
        </label>
        <label class="pc-setting-row">
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

    <section class="pc-page-section">
      <div class="pc-section-head"><strong>颜色与背景</strong></div>
      <div class="pc-settings-list">
        <label class="pc-setting-row">
          <strong>正文颜色</strong>
          <input v-model="settings.visualTheme.readerTextColor" class="pc-color-input" type="color" />
        </label>
        <label class="pc-setting-row">
          <strong>背景颜色</strong>
          <input
            class="pc-color-input"
            type="color"
            :value="settings.reader.backgroundColor || fallbackBackground"
            @input="settingsStore.setReaderBackgroundColor(inputValue($event))"
          />
        </label>
      </div>
    </section>

    <section class="pc-page-section">
      <div class="pc-section-head"><strong>字体资源</strong></div>
      <div class="pc-font-assets">
        <SearchableCombobox
          :model-value="fontAssetSelectionValue"
          input-label="选择已导入字体"
          :options="fontAssetSelectionOptions"
          :placeholder="settings.customFont.fonts.length ? '选择已导入字体' : '尚未导入字体'"
          @update:model-value="settingsStore.selectCustomFontAsset"
        />
        <div class="pc-font-actions">
          <button
            class="pc-icon-btn"
            type="button"
            title="导入字体"
            aria-label="导入字体"
            @click="fontInputEl?.click()"
          >
            <i class="fa-solid fa-file-import"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="!selectedCustomFont"
            title="导出字体"
            aria-label="导出字体"
            @click="exportSelectedFont"
          >
            <i class="fa-solid fa-file-export"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="!selectedCustomFont"
            title="重命名字体"
            aria-label="重命名字体"
            @click="renameSelectedFont"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :disabled="!selectedCustomFont"
            title="删除字体"
            aria-label="删除字体"
            @click="deleteSelectedFont"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <input
        ref="fontInputEl"
        class="pc-hidden-input"
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        multiple
        @change="importFonts"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const fontInputEl = ref<HTMLInputElement | null>(null);
const fallbackBackground = computed(() => (settings.value.theme === 'dark' ? '#1c1c1e' : '#ffffff'));
const selectedCustomFont = computed(
  () => settings.value.customFont.fonts.find(item => item.id === settings.value.customFont.selectedFontId) ?? null,
);
const selectedReaderCustomFont = computed(
  () =>
    settings.value.customFont.fonts.find(
      font => settings.value.reader.fontFamily === settingsStore.getCustomFontFamily(font.id),
    ) ?? null,
);
const readerFontSelectionValue = computed({
  get: () =>
    selectedReaderCustomFont.value ? `custom:${selectedReaderCustomFont.value.id}` : settings.value.reader.fontFamily,
  set: (value: string) =>
    settingsStore.setReaderFontFamily(
      value.startsWith('custom:') ? settingsStore.getCustomFontFamily(value.slice('custom:'.length)) : value,
    ),
});
const readerFontSelectionOptions = computed(() => {
  const selected = readerFontSelectionValue.value;
  const options = [
    { label: '跟随手机字体', value: '' },
    { group: '系统字体', label: '系统无衬线', value: 'system-ui, sans-serif' },
    { group: '系统字体', label: '系统衬线', value: 'serif' },
    { group: '系统字体', label: '等宽字体', value: 'ui-monospace, monospace' },
    { group: '系统字体', label: '思源宋体', value: "'Noto Serif SC', serif" },
    ...settings.value.customFont.fonts.map(font => ({
      group: '自定义字体',
      label: font.name,
      value: `custom:${font.id}`,
    })),
  ];
  if (selected && !options.some(option => option.value === selected)) {
    options.unshift({ label: '当前字体资源已失效', value: selected });
  }
  return options;
});
const fontAssetSelectionValue = computed(() => selectedCustomFont.value?.id ?? '');
const fontAssetSelectionOptions = computed(() => [
  { label: settings.value.customFont.fonts.length ? '选择已导入字体' : '尚未导入字体', value: '' },
  ...settings.value.customFont.fonts.map(font => ({ label: font.name, value: font.id })),
]);

function numberValue(event: Event) {
  return Number((event.target as HTMLInputElement).value);
}
function inputValue(event: Event) {
  return (event.target as HTMLInputElement).value;
}
function checkedValue(event: Event) {
  return (event.target as HTMLInputElement).checked;
}
function resetReaderSettings() {
  settingsStore.resetReaderAppearance();
  settingsStore.setReaderScale(100);
}
async function importFonts(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  for (const file of files) await settingsStore.uploadCustomFont(file);
  if (files.length) toastr.success(`已导入 ${files.length} 个字体`);
}
function exportStoredFile(path: string, name: string) {
  const normalized = path.replace(/^\/+/, '');
  const anchor = document.createElement('a');
  anchor.href = `/${encodeURI(normalized)}`;
  anchor.download = name || normalized.split('/').pop() || 'font';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
function exportSelectedFont() {
  const font = selectedCustomFont.value;
  if (!font) return;
  exportStoredFile(font.path, font.name);
}
async function renameSelectedFont() {
  const font = selectedCustomFont.value;
  if (!font) return;
  const name = await phone.promptNotice('输入新的字体名称', {
    confirmLabel: '保存',
    initialValue: font.name,
    title: '重命名字体',
  });
  if (name !== null) settingsStore.renameCustomFont(font.id, name);
}
async function deleteSelectedFont() {
  const font = selectedCustomFont.value;
  if (!font || !(await phone.confirmNotice(`要删除字体“${font.name}”吗？`, { confirmLabel: '删除', kind: 'warning' })))
    return;
  await settingsStore.deleteCustomFont(font.id);
}
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
}
.pc-reader-range input[type='range'] {
  width: min(180px, 38vw);
}
.pc-reader-font-row > :last-child {
  width: min(230px, 50vw);
}
.pc-color-input {
  width: 48px;
  height: 34px;
  padding: 0;
  border: 0;
  background: transparent;
}
.pc-font-assets {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.pc-font-actions {
  display: grid;
  grid-template-columns: repeat(4, 40px);
  gap: 4px;
}
.pc-icon-btn.danger {
  color: var(--pc-danger);
}
@media (max-width: 420px) {
  .pc-font-assets {
    grid-template-columns: minmax(0, 1fr);
  }
  .pc-font-actions {
    justify-content: end;
  }
}
</style>
