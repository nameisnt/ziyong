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
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const fontInputEl = ref<HTMLInputElement | null>(null);
const selectedCustomFont = computed(
  () => settings.value.customFont.fonts.find(item => item.id === settings.value.customFont.selectedFontId) ?? null,
);
const fontAssetSelectionValue = computed(() => selectedCustomFont.value?.id ?? '');
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
async function importFonts(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  const failed: string[] = [];
  for (const file of files) {
    try {
      await settingsStore.uploadCustomFont(file);
    } catch (error) {
      failed.push(`${file.name}：${error instanceof Error ? error.message : '导入失败'}`);
    }
  }
  if (files.length > failed.length) toastr.success(`已导入 ${files.length - failed.length} 个字体`);
  if (failed.length) toastr.warning(failed.join('；'));
}
function onFontSelected(event: Event) {
  return importFonts(event);
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
