<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section">
      <div class="pc-row pc-row-top">
        <div>
          <strong>当前聊天数据</strong>
          <span class="pc-context-meta">{{ currentChatLabel }}</span>
        </div>
        <span class="pc-tag">{{ formatSize(approxBytes) }}</span>
      </div>
      <div class="pc-data-grid">
        <article v-for="domain in currentContentCards" :key="domain.id" class="pc-data-card">
          <span>{{ domain.label }}</span
          ><strong>{{ domain.current.items }}</strong>
        </article>
        <article v-if="!currentContentCards.length" class="pc-data-card">
          <span>创作内容</span><strong>0</strong>
        </article>
      </div>
      <div class="pc-action-grid">
        <button class="pc-icon-btn" type="button" title="导出全部数据" @click="downloadBackup">
          <i class="fa-solid fa-file-export"></i>
        </button>
        <button class="pc-icon-btn" type="button" title="导出当前聊天数据" @click="downloadCurrentBackup">
          <i class="fa-solid fa-file-arrow-up"></i>
        </button>
        <button class="pc-icon-btn" type="button" title="导入到当前聊天" @click="openBackupImport('scope')">
          <i class="fa-solid fa-file-import"></i>
        </button>
        <button class="pc-icon-btn" type="button" title="完整恢复全部数据" @click="openBackupImport('full')">
          <i class="fa-solid fa-rotate-left"></i>
        </button>
      </div>
      <input
        ref="backupInputEl"
        class="pc-hidden-input"
        type="file"
        accept="application/json,.json"
        @change="onBackupSelected"
      />
    </section>

    <section class="pc-page-section">
      <div class="pc-row pc-row-top">
        <div>
          <strong>壁纸</strong>
          <span class="pc-context-meta">{{ wallpaperSummary }}</span>
        </div>
        <button class="pc-icon-btn" type="button" title="关闭壁纸" @click="settingsStore.clearWallpaperSelection()">
          <i class="fa-solid fa-ban"></i>
        </button>
      </div>
      <div class="pc-asset-field">
        <select :value="wallpaperSelectionValue" class="pc-select" @change="onWallpaperSelect">
          <option value="none">默认渐变背景</option>
          <optgroup label="预设壁纸">
            <option v-for="preset in WALLPAPER_PRESETS" :key="preset.id" :value="`preset:${preset.id}`">
              {{ preset.name }}
            </option>
          </optgroup>
          <optgroup v-if="settings.wallpaper.customWallpapers.length" label="自定义壁纸">
            <option
              v-for="wallpaper in settings.wallpaper.customWallpapers"
              :key="wallpaper.id"
              :value="`custom:${wallpaper.id}`"
            >
              {{ wallpaper.name }}
            </option>
          </optgroup>
        </select>
        <div class="pc-asset-actions">
          <button class="pc-icon-btn" type="button" title="导入壁纸" @click="wallpaperInputEl?.click()">
            <i class="fa-solid fa-file-import"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="!selectedCustomWallpaper"
            title="导出壁纸"
            @click="exportSelectedWallpaper"
          >
            <i class="fa-solid fa-file-export"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="!selectedCustomWallpaper"
            title="编辑壁纸名字"
            @click="renameSelectedWallpaper"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :disabled="!selectedCustomWallpaper"
            title="删除壁纸"
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
        <select :value="fontAssetSelectionValue" class="pc-select" @change="onFontAssetSelect">
          <option value="">{{ settings.customFont.fonts.length ? '选择已导入字体' : '尚未导入字体' }}</option>
          <option v-for="font in settings.customFont.fonts" :key="font.id" :value="font.id">
            {{ font.name }}
          </option>
        </select>
        <div class="pc-asset-actions">
          <button class="pc-icon-btn" type="button" title="导入字体" @click="fontInputEl?.click()">
            <i class="fa-solid fa-file-import"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="!selectedCustomFont"
            title="导出字体"
            @click="exportSelectedFont"
          >
            <i class="fa-solid fa-file-export"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="!selectedCustomFont"
            title="编辑字体名字"
            @click="renameSelectedFont"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :disabled="!selectedCustomFont"
            title="删除字体"
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
import { WALLPAPER_PRESETS } from '@/data/wallpapers';
import {
  getRegisteredPhoneBackupDomains,
  getRegisteredPhoneBackupRehydrateHandlers,
  getRegisteredPhoneContentStats,
  type PhoneContentStatsContribution,
} from '@/core/appRegistry';
import { useBaguStore } from '@/store/bagu';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useFavoritesStore } from '@/store/favorites';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useReaderStore } from '@/store/reader';
import { useRecoveryStore } from '@/store/recovery';
import { useSettingsStore } from '@/store/settings';
import { parseChatScopeKey } from '@/util/chatArchive';
import {
  applyPhoneBackup,
  downloadCurrentChatPhoneBackup,
  downloadPhoneBackup,
  importPhoneBackupScopeToCurrentChat,
  listPhoneBackupScopeOptions,
  parsePhoneBackupFile,
  type PhoneBackupScopeOption,
} from '@/util/backup';
import { getOptionalGlobalValue } from '@/util/runtime';
import { storeToRefs } from 'pinia';

const bagu = useBaguStore();
const favorites = useFavoritesStore();
const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const reader = useReaderStore();
const recovery = useRecoveryStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const backupInputEl = ref<HTMLInputElement | null>(null);
const backupImportMode = ref<'full' | 'scope'>('scope');
const fontInputEl = ref<HTMLInputElement | null>(null);
const wallpaperInputEl = ref<HTMLInputElement | null>(null);
const currentScopeKey = computed(() => getCurrentChatScopeKey());
type CurrentContentCard = PhoneContentStatsContribution & {
  current: PhoneContentStatsContribution['current'];
  id: string;
  itemLabel: string;
  label: string;
};
const currentChatLabel = computed(() => {
  const scope = parseChatScopeKey(currentScopeKey.value);
  const owner =
    phone.viewingScopeKey === currentScopeKey.value
      ? phone.viewingScopeMeta.ownerName
      : formatScopeOwner(scope.ownerId);
  const chat = scope.chatId && scope.chatId !== '__no_chat__' ? scope.chatId : '未识别到聊天文件';
  return `酒馆当前：${owner} / ${chat}`;
});
const currentContentCards = computed<CurrentContentCard[]>(() =>
  getRegisteredPhoneContentStats(currentScopeKey.value)
    .map(contribution => ({
      ...contribution,
      current: contribution.current,
      id: contribution.domain.id,
      itemLabel: contribution.domain.itemLabel,
      label: contribution.domain.label,
    }))
    .filter(item => item.current.collections || item.current.items || item.current.chars),
);
const approxBytes = computed(
  () =>
    new Blob([
      JSON.stringify(
        Object.fromEntries(
          getRegisteredPhoneBackupDomains().map(domain => [domain.key, domain.exportData(currentScopeKey.value)]),
        ),
      ),
    ]).size,
);
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
const wallpaperSummary = computed(() =>
  settings.value.wallpaper.mode === 'custom'
    ? `自定义壁纸${selectedCustomWallpaper.value?.name.trim() ? ` · ${selectedCustomWallpaper.value.name}` : ''}`
    : settings.value.wallpaper.mode === 'preset'
      ? `预设壁纸 · ${WALLPAPER_PRESETS.find(item => item.id === settings.value.wallpaper.presetId)?.name || '未命名预设'}`
      : '当前使用默认渐变背景',
);

function formatSize(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}
function formatScopeOwner(ownerId: string) {
  if (!ownerId || ownerId === '__no_character__') return '未识别到角色卡';
  const index = Number(ownerId);
  const characters = getOptionalGlobalValue<unknown[]>('characters');
  const character = Number.isInteger(index) && Array.isArray(characters) ? characters[index] : null;
  const name = character && typeof character === 'object' ? (character as Record<string, unknown>).name : null;
  return typeof name === 'string' && name.trim() ? name.trim() : ownerId;
}
function onFontAssetSelect(event: Event) {
  settingsStore.selectCustomFontAsset((event.target as HTMLSelectElement).value);
}
async function onWallpaperSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
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
function downloadBackup() {
  downloadPhoneBackup();
  toastr.success('已开始导出全部备份');
}
function downloadCurrentBackup() {
  downloadCurrentChatPhoneBackup();
  toastr.success('已开始导出当前聊天备份');
}
function openBackupImport(mode: 'full' | 'scope') {
  backupImportMode.value = mode;
  backupInputEl.value?.click();
}
function rehydrateImportedData() {
  settingsStore.rehydrateFromSettings();
  prompts.rehydrateFromSettings();
  bagu.rehydrateFromSettings();
  recovery.rehydrateFromSettings();
  reader.rehydrateFromSettings();
  getRegisteredPhoneBackupRehydrateHandlers().forEach(handler => handler());
  favorites.clearSelection();
}
function formatBackupScopeOption(option: PhoneBackupScopeOption, index: number) {
  return `${index + 1}. ${option.label}｜${option.domainLabels.join('、') || '创作内容'}｜${option.items} 项`;
}
async function selectBackupScopeOption(options: PhoneBackupScopeOption[]) {
  const selected = await phone.promptNotice(
    ['选择要导入到当前聊天的备份来源，输入序号：', '', ...options.map(formatBackupScopeOption)].join('\n'),
    {
      confirmLabel: '选择',
      initialValue: options.length === 1 ? '1' : '',
      placeholder: '输入序号',
      title: '选择备份来源',
    },
  );
  if (selected === null) return null;
  return options[Number(selected.trim()) - 1] ?? null;
}
async function onBackupSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const backup = await parsePhoneBackupFile(file);
    if (generationTasks.hasRunningTasks) return void toastr.warning('请先暂停正在运行的生成任务，再恢复备份');
    if (backupImportMode.value === 'full') {
      if (
        !(await phone.confirmNotice('要完整恢复这份手机备份吗？这会覆盖当前手机插件中的设置和全部已保存数据。', {
          confirmLabel: '恢复',
          kind: 'warning',
        }))
      )
        return;
      await applyPhoneBackup(backup);
      rehydrateImportedData();
      toastr.success('已完整恢复手机备份');
      return;
    }
    const options = listPhoneBackupScopeOptions(backup);
    if (!options.length) return void toastr.warning('这份备份里没有可导入的聊天创作内容');
    const option = await selectBackupScopeOption(options);
    if (!option) return void toastr.warning('没有选择有效的备份来源');
    if (
      !(await phone.confirmNotice(
        `要把“${option.label}”导入到当前聊天吗？这只会覆盖当前聊天中对应 App 的内容，不会影响其他聊天。`,
        { confirmLabel: '导入', kind: 'warning' },
      ))
    )
      return;
    await importPhoneBackupScopeToCurrentChat(backup, option.scopeKey);
    rehydrateImportedData();
    toastr.success('已导入到当前聊天');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '导入备份失败');
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
.pc-context-meta {
  display: block;
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.45;
}
.pc-data-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.pc-data-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  padding: 10px;
  background: var(--pc-surface-strong);
}
.pc-data-card span {
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-data-card strong {
  font-size: 20px;
  line-height: 1;
}
.pc-action-grid {
  display: grid;
  grid-template-columns: repeat(4, 40px);
  justify-content: end;
  gap: 8px;
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
.pc-tag {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  font-size: 11px;
}
.pc-icon-btn.danger {
  color: var(--pc-danger);
}
@media (max-width: 420px) {
  .pc-data-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
