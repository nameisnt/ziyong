<template>
  <div class="pc-settings-panel-stack pc-data-management-page">
    <section class="pc-page-section">
      <div class="pc-section-head">
        <div>
          <strong>App 内容</strong>
          <span class="pc-context-meta">选择 App 后管理它的整体内容</span>
        </div>
      </div>
      <div v-if="transferApps.length" class="pc-transfer-app-field">
        <SearchableCombobox
          :model-value="selectedTransferAppId"
          input-label="选择 App"
          :options="transferAppOptions"
          placeholder="选择 App"
          @update:model-value="selectedTransferAppId = $event"
        />
        <button class="pc-soft-btn" type="button" :disabled="!selectedTransferApp" @click="contentTransferOpen = true">
          管理内容
        </button>
      </div>
      <EmptyState v-else icon="fa-solid fa-box-open" title="暂无可迁移的 App 内容" />
    </section>

    <section class="pc-page-section">
      <div class="pc-row pc-row-top">
        <div>
          <strong>备份与恢复</strong>
          <span class="pc-context-meta">{{ currentChatLabel }}</span>
        </div>
        <span class="pc-tag">{{ formatSize(approxBytes) }}</span>
      </div>
      <div class="pc-data-grid">
        <article v-for="domain in currentContentCards" :key="domain.id" class="pc-data-card">
          <span>{{ domain.label }}</span><strong>{{ domain.current.items }}</strong>
        </article>
        <article v-if="!currentContentCards.length" class="pc-data-card">
          <span>创作内容</span><strong>0</strong>
        </article>
      </div>
      <div class="pc-data-action-grid">
        <button class="pc-soft-btn" type="button" title="导出手机配置、内容与插件预设" @click="downloadBackup">
          导出全部
        </button>
        <button class="pc-soft-btn" type="button" title="导出当前聊天创作内容" @click="downloadCurrentBackup">
          导出当前
        </button>
        <button class="pc-soft-btn" type="button" title="导入到当前聊天" @click="openBackupImport('scope')">
          导入当前
        </button>
        <button class="pc-soft-btn" type="button" title="完整恢复全部数据" @click="openBackupImport('full')">
          完整恢复
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

    <ContentTransferOverlay
      v-if="selectedTransferApp"
      :app-name="selectedTransferApp.name"
      :domains="selectedTransferApp.domains"
      :open="contentTransferOpen"
      @close="contentTransferOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import ContentTransferOverlay from '@/components/ContentTransferOverlay.vue';
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import {
  getRegisteredPhoneApps,
  getRegisteredPhoneBackupDomains,
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
import { getPhoneBackupKind } from '@/type/backup';
import {
  applyPhoneBackup,
  downloadCurrentChatPhoneBackup,
  downloadPhoneBackup,
  importPhoneBackupScopeToCurrentChat,
  listPhoneBackupScopeOptions,
  parsePhoneBackupFile,
  planPhoneBackupScopeImport,
  planPhoneFullBackupImport,
  type PhoneBackupImportPlan,
  type PhoneBackupScopeOption,
} from '@/util/backup';
import { parseChatScopeKey } from '@/util/chatArchive';
import { getAppContentTransferDomains } from '@/util/contentTransfer';
import { getOptionalGlobalValue } from '@/util/runtime';

const bagu = useBaguStore();
const favorites = useFavoritesStore();
const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const reader = useReaderStore();
const recovery = useRecoveryStore();
const settingsStore = useSettingsStore();
const backupInputEl = ref<HTMLInputElement | null>(null);
const backupImportMode = ref<'full' | 'scope'>('scope');
const contentTransferOpen = ref(false);
const selectedTransferAppId = ref('');
const currentScopeKey = computed(() => getCurrentChatScopeKey());

type CurrentContentCard = PhoneContentStatsContribution & {
  current: PhoneContentStatsContribution['current'];
  id: string;
  itemLabel: string;
  label: string;
};

const transferApps = computed(() =>
  getRegisteredPhoneApps()
    .map(app => ({ domains: getAppContentTransferDomains(app.id), id: app.id, name: app.name }))
    .filter(app => app.domains.length > 0),
);
const transferAppOptions = computed(() => transferApps.value.map(app => ({ label: app.name, value: app.id })));
const selectedTransferApp = computed(
  () => transferApps.value.find(app => app.id === selectedTransferAppId.value) ?? transferApps.value[0] ?? null,
);
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

watch(
  transferApps,
  apps => {
    if (!apps.some(app => app.id === selectedTransferAppId.value)) selectedTransferAppId.value = apps[0]?.id ?? '';
  },
  { immediate: true },
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
async function downloadBackup() {
  try {
    await downloadPhoneBackup();
    toastr.success('已开始导出全部备份');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '完整备份导出失败');
  }
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
  favorites.clearSelection();
}
function formatBackupScopeOption(option: PhoneBackupScopeOption, index: number) {
  return `${index + 1}. ${option.label}｜${option.domainLabels.join('、') || '创作内容'}｜${option.items} 项`;
}
function formatBackupImportPlan(plan: PhoneBackupImportPlan) {
  const lines = [`将覆盖：${plan.domainsToReplace.join('、') || '手机基础设置'}`];
  if (plan.missingDomainLabels.length) lines.push(`备份缺少、将保留当前数据：${plan.missingDomainLabels.join('、')}`);
  if (plan.unknownDomainKeys.length) lines.push(`未识别、将跳过：${plan.unknownDomainKeys.join('、')}`);
  return lines.join('\n');
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
      const backupKind = getPhoneBackupKind(backup);
      if (backupKind === 'current-chat') throw new Error('这是一份当前聊天备份，只能使用“导入到当前聊天”');
      if (
        backupKind === 'legacy' &&
        !(await phone.confirmNotice(
          '这是一份旧版备份，文件未标注“完整”或“当前聊天”。请仅在确认它包含完整设置和所有数据时继续恢复。',
          { confirmLabel: '确认按完整备份恢复', kind: 'warning' },
        ))
      )
        return;
      if (
        !(await phone.confirmNotice(
          `要完整恢复这份手机备份吗？\n${formatBackupImportPlan(
            planPhoneFullBackupImport(backup, { allowLegacy: backupKind === 'legacy' }),
          )}`,
          { confirmLabel: '恢复', kind: 'warning' },
        ))
      )
        return;
      await applyPhoneBackup(backup, { allowLegacy: backupKind === 'legacy' });
      rehydrateImportedData();
      toastr.success('已完整恢复手机备份');
      return;
    }
    const options = listPhoneBackupScopeOptions(backup);
    if (!options.length) return void toastr.warning('这份备份里没有可导入的聊天创作内容');
    const option = await selectBackupScopeOption(options);
    if (!option) return void toastr.warning('没有选择有效的备份来源');
    const plan = planPhoneBackupScopeImport(backup, option.scopeKey);
    if (
      !(await phone.confirmNotice(
        `要把“${option.label}”导入到当前聊天吗？这只会覆盖当前聊天中对应 App 的内容，不会影响其他聊天。\n${formatBackupImportPlan(plan)}`,
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
.pc-data-management-page {
  display: grid;
  flex: 1 1 auto;
  min-height: 0;
  align-content: start;
  gap: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 8px;
  overscroll-behavior: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}
.pc-transfer-app-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
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
  margin-top: 4px;
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
.pc-data-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.pc-tag {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  background: color-mix(in srgb, var(--pc-theme-accent) 18%, var(--pc-surface-strong) 82%);
  font-size: 11px;
}
@media (max-width: 420px) {
  .pc-data-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
