<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section">
      <button class="pc-list-row pc-settings-entry" type="button" @click="phone.pushPage('data', '数据管理')">
        <span class="pc-list-row-copy">
          <strong>数据管理</strong>
          <small>App 内容、当前聊天与完整备份</small>
        </span>
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </section>

    <section class="pc-page-section">
      <div class="pc-row pc-row-top">
        <strong>壁纸</strong>
        <button
          class="pc-icon-btn"
          type="button"
          title="关闭壁纸"
          aria-label="关闭壁纸"
          @click="settingsStore.clearWallpaperSelection()"
        >
          <i class="fa-solid fa-eye-slash"></i>
        </button>
      </div>
      <div class="pc-asset-field">
        <SearchableCombobox
          :model-value="wallpaperSelectionValue"
          input-label="选择壁纸"
          :options="wallpaperSelectionOptions"
          placeholder="默认渐变背景"
          @update:model-value="onWallpaperSelect"
        />
        <div class="pc-asset-actions">
          <button
            class="pc-icon-btn"
            type="button"
            title="导入壁纸"
            aria-label="导入壁纸"
            @click="wallpaperInputEl?.click()"
          >
            <i class="fa-solid fa-file-import"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="!selectedCustomWallpaper"
            title="导出壁纸"
            aria-label="导出壁纸"
            @click="exportSelectedWallpaper"
          >
            <i class="fa-solid fa-file-export"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="!selectedCustomWallpaper"
            title="编辑壁纸名字"
            aria-label="编辑壁纸名字"
            @click="renameSelectedWallpaper"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :disabled="!selectedCustomWallpaper"
            title="删除壁纸"
            aria-label="删除壁纸"
            @click="deleteSelectedWallpaper"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <input
        ref="wallpaperInputEl"
        class="pc-hidden-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        @change="onWallpaperSelected"
      />
    </section>

    <section class="pc-page-section">
      <div class="pc-row pc-row-top">
        <strong>字体资源</strong>
      </div>
      <div class="pc-asset-field">
        <SearchableCombobox
          :model-value="fontAssetSelectionValue"
          input-label="选择已导入字体"
          :options="fontAssetSelectionOptions"
          :placeholder="settings.customFont.fonts.length ? '选择已导入字体' : '尚未导入字体'"
          @update:model-value="onFontAssetSelect"
        />
        <div class="pc-asset-actions">
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
            title="编辑字体名字"
            aria-label="编辑字体名字"
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
        @change="onFontSelected"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { WALLPAPER_PRESETS } from '@/data/wallpapers';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const fontInputEl = ref<HTMLInputElement | null>(null);
const wallpaperInputEl = ref<HTMLInputElement | null>(null);
const selectedCustomWallpaper = computed(() =>
  settings.value.wallpaper.mode === 'custom'
    ? (settings.value.wallpaper.customWallpapers.find(item => item.id === settings.value.wallpaper.selectedCustomId) ??
      settings.value.wallpaper.customWallpapers.find(item => item.path === settings.value.wallpaper.customPath) ??
      null)
    : null,
);
const wallpaperSelectionValue = computed(() =>
  settings.value.wallpaper.mode === 'preset'
    ? `preset:${settings.value.wallpaper.presetId}`
    : settings.value.wallpaper.mode === 'custom' &&
        (selectedCustomWallpaper.value?.id || settings.value.wallpaper.selectedCustomId)
      ? `custom:${selectedCustomWallpaper.value?.id || settings.value.wallpaper.selectedCustomId}`
      : 'none',
);
const selectedCustomFont = computed(
  () => settings.value.customFont.fonts.find(item => item.id === settings.value.customFont.selectedFontId) ?? null,
);
const fontAssetSelectionValue = computed(() => selectedCustomFont.value?.id ?? '');
const wallpaperSelectionOptions = computed(() => {
  const selected = wallpaperSelectionValue.value;
  const options = [
    { label: '默认渐变背景', value: 'none' },
    ...WALLPAPER_PRESETS.map(preset => ({ group: '预设壁纸', label: preset.name, value: `preset:${preset.id}` })),
    ...settings.value.wallpaper.customWallpapers.map(wallpaper => ({
      group: '自定义壁纸',
      label: wallpaper.name,
      value: `custom:${wallpaper.id}`,
    })),
  ];
  if (!options.some(option => option.value === selected)) {
    options.unshift({ label: '当前壁纸资源已失效', value: selected });
  }
  return options;
});
const fontAssetSelectionOptions = computed(() => {
  const selected = fontAssetSelectionValue.value;
  const options = settings.value.customFont.fonts.map(font => ({ label: font.name, value: font.id }));
  if (selected && !options.some(option => option.value === selected)) {
    options.unshift({ label: '当前字体资源已失效', value: selected });
  }
  return [{ label: settings.value.customFont.fonts.length ? '选择已导入字体' : '尚未导入字体', value: '' }, ...options];
});

function onFontAssetSelect(fontId: string) {
  settingsStore.selectCustomFontAsset(fontId);
}
async function onWallpaperSelect(value: string) {
  try {
    if (value === 'none') await settingsStore.clearWallpaperSelection();
    else if (value.startsWith('preset:')) await settingsStore.selectWallpaperPreset(value.slice(7));
    else if (value.startsWith('custom:')) settingsStore.selectCustomWallpaper(value.slice(7));
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '切换壁纸失败');
  }
}
async function importFiles(event: Event, kind: 'font' | 'wallpaper') {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  const failed: string[] = [];
  for (const file of files) {
    try {
      if (kind === 'font') await settingsStore.uploadCustomFont(file);
      else await settingsStore.uploadCustomWallpaper(file);
    } catch (error) {
      failed.push(`${file.name}：${error instanceof Error ? error.message : '导入失败'}`);
    }
  }
  if (files.length > failed.length)
    toastr.success(`已导入 ${files.length - failed.length} ${kind === 'font' ? '个字体' : '张壁纸'}`);
  if (failed.length) toastr.warning(failed.join('；'));
}
function onFontSelected(event: Event) {
  return importFiles(event, 'font');
}
function onWallpaperSelected(event: Event) {
  return importFiles(event, 'wallpaper');
}
function exportStoredFile(path: string, name: string) {
  const normalized = path.replace(/^\/+/, '');
  const anchor = document.createElement('a');
  anchor.href = `/${encodeURI(normalized)}`;
  anchor.download = name || normalized.split('/').pop() || 'sillytavern-phone-asset';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
function exportSelectedFont() {
  const font = selectedCustomFont.value;
  if (!font) return;
  exportStoredFile(font.path, font.name);
  toastr.success('已开始导出字体');
}
function exportSelectedWallpaper() {
  const wallpaper = selectedCustomWallpaper.value;
  if (!wallpaper) return;
  exportStoredFile(wallpaper.path, wallpaper.name);
  toastr.success('已开始导出壁纸');
}
async function renameSelectedFont() {
  const font = selectedCustomFont.value;
  if (!font) return;
  const name = await phone.promptNotice('输入新的字体名称', {
    confirmLabel: '保存',
    initialValue: font.name,
    title: '重命名字体',
  });
  if (name !== null) {
    settingsStore.renameCustomFont(font.id, name);
    toastr.success('已更新字体名称');
  }
}
async function renameSelectedWallpaper() {
  const wallpaper = selectedCustomWallpaper.value;
  if (!wallpaper) return;
  const name = await phone.promptNotice('输入新的壁纸名称', {
    confirmLabel: '保存',
    initialValue: wallpaper.name,
    title: '重命名壁纸',
  });
  if (name !== null) {
    settingsStore.renameCustomWallpaper(wallpaper.id, name);
    toastr.success('已更新壁纸名称');
  }
}
async function deleteSelectedFont() {
  const font = selectedCustomFont.value;
  if (
    !font ||
    !(await phone.confirmNotice(`要删除字体“${font.name || '未命名字体'}”吗？`, {
      confirmLabel: '删除',
      kind: 'warning',
    }))
  )
    return;
  try {
    await settingsStore.deleteCustomFont(font.id);
    toastr.success('已删除字体');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '字体删除失败');
  }
}
async function deleteSelectedWallpaper() {
  const wallpaper = selectedCustomWallpaper.value;
  if (
    !wallpaper ||
    !(await phone.confirmNotice(`要删除壁纸“${wallpaper.name || '未命名壁纸'}”吗？`, {
      confirmLabel: '删除',
      kind: 'warning',
    }))
  )
    return;
  try {
    await settingsStore.deleteCustomWallpaper(wallpaper.id);
    toastr.success('已删除壁纸');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '壁纸删除失败');
  }
}
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
  gap: 0;
}
.pc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pc-row-top {
  align-items: flex-start;
}
.pc-row > div {
  min-width: 0;
}
.pc-asset-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.pc-asset-actions {
  display: grid;
  grid-template-columns: repeat(4, 40px);
  gap: 6px;
}
.pc-icon-btn.danger {
  color: var(--pc-danger);
}
</style>
