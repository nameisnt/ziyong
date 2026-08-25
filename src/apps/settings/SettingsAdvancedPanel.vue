<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-settings-card">
      <div class="pc-row pc-row-top">
        <strong
          >数据恢复
          <InfoHint
            :text="
              recoveryEntries.length
                ? `当前有 ${recoveryEntries.length} 条待处理恢复日志`
                : '当前没有待处理的来源隐藏恢复日志。统一生成底座接入后，这里会显示需要人工处理的恢复事务。'
            "
        /></strong>
        <button
          class="pc-soft-btn compact"
          type="button"
          :disabled="!recoveryEntries.length"
          title="导出日志"
          @click="exportRecoveries"
        >
          导出日志
        </button>
      </div>
      <div v-if="recoveryEntries.length" class="pc-recovery-list">
        <article v-for="entry in recoveryEntries" :key="entry.scopeId" class="pc-recovery-card">
          <div>
            <strong>{{ entry.scopeId }}</strong>
            <p>{{ `${entry.messages.length} 条楼层快照 · ${entry.generationId}` }}</p>
          </div>
          <button
            class="pc-soft-btn danger compact"
            type="button"
            title="删除恢复日志"
            @click="deleteRecovery(entry.scopeId)"
          >
            删除
          </button>
        </article>
      </div>
      <button class="pc-soft-btn danger" type="button" :disabled="!recoveryEntries.length" @click="clearAllRecoveries">
        <i class="fa-solid fa-trash-can"></i><span>清空全部恢复日志</span>
      </button>
    </section>
    <section class="pc-settings-card pc-danger-card">
      <div class="pc-row pc-row-top">
        <strong>危险操作 <InfoHint text="这些操作会清空已生成内容，执行前会再次确认。" /></strong>
      </div>
      <div class="pc-action-grid">
        <button class="pc-soft-btn danger compact" type="button" @click="clearCurrentChatData">
          <i class="fa-solid fa-trash"></i><span>清空当前</span></button
        ><button class="pc-soft-btn danger compact" type="button" @click="clearAllGeneratedContent">
          <i class="fa-solid fa-trash-can"></i><span>清空全部</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import {
  getRegisteredPhoneAppResetHandlers,
  getRegisteredPhoneBackupDomains,
  getRegisteredPhoneBackupRehydrateHandlers,
} from '@/core/appRegistry';
import { useFavoritesStore } from '@/store/favorites';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePreviewDraftStore } from '@/store/previewDrafts';
import { useRecoveryStore } from '@/store/recovery';
import { clearAllPhoneGeneratedContent } from '@/util/backup';
import { executePhoneAppResetTransaction } from '@/util/settingsResetTransaction';
// eslint-disable-next-line import-x/no-nodejs-modules
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { klona } from 'klona';
import { storeToRefs } from 'pinia';

const favorites = useFavoritesStore();
const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const previewDrafts = usePreviewDraftStore();
const recovery = useRecoveryStore();
const { entries: recoveryEntries } = storeToRefs(recovery);

function exportRecoveries() {
  const blob = new Blob([JSON.stringify(recovery.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sillytavern-phone-recoveries-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function deleteRecovery(scopeId: string) {
  if (
    !(await phone.confirmNotice('要删除这条恢复日志吗？删除后将无法再从手机内恢复这次事务记录。', {
      confirmLabel: '删除',
      kind: 'warning',
    }))
  )
    return;
  recovery.deleteRecovery(scopeId);
  toastr.success('已删除恢复日志');
}
async function clearAllRecoveries() {
  if (!(await phone.confirmNotice('要清空全部恢复日志吗？此操作不可撤销。', { confirmLabel: '清空', kind: 'warning' })))
    return;
  recovery.clearAllRecoveries();
  toastr.success('已清空全部恢复日志');
}
async function clearCurrentChatData() {
  if (generationTasks.hasRunningTasks) return void toastr.warning('请先暂停正在运行的生成任务，再清空聊天数据');
  const handlers = getRegisteredPhoneAppResetHandlers();
  const names = handlers.map(item => item.app.name).join('、') || '创作';
  if (
    !(await phone.confirmNotice(`要清空当前聊天中的${names}数据吗？此操作不会影响其他聊天。`, {
      confirmLabel: '清空',
      kind: 'warning',
    }))
  )
    return;
  try {
    await executePhoneAppResetTransaction({
      captureSnapshot: () => klona(extension_settings),
      handlers: handlers.map(item => item.resetCurrentScope),
      persist: () => saveSettingsDebounced(),
      rehydrate: () => getRegisteredPhoneBackupRehydrateHandlers().forEach(handler => handler()),
      restoreSnapshot: snapshot => {
        Object.keys(extension_settings).forEach(key => delete extension_settings[key]);
        Object.assign(extension_settings, snapshot);
      },
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '清空当前聊天失败，原数据已恢复');
    return;
  }
  generationTasks.clearScopeTasks();
  previewDrafts.resetCurrentScope();
  favorites.clearSelection();
  toastr.success('已清空当前聊天的手机创作数据');
}
async function clearAllGeneratedContent() {
  if (generationTasks.hasRunningTasks) return void toastr.warning('请先暂停正在运行的生成任务，再清空全部数据');
  const domains = getRegisteredPhoneBackupDomains()
    .filter(domain => domain.scope === 'chat' && (domain.category === 'content' || domain.category === 'draft'))
    .map(domain => domain.key)
    .join('、');
  if (
    !(await phone.confirmNotice(
      `要清空插件内全部生成内容吗？这会删除所有聊天中的总结、日记、番外、论坛、小剧场和书信数据。不会删除设置、提示词和八股规则。\n\n涉及数据域：${domains}`,
      { confirmLabel: '继续', kind: 'warning' },
    ))
  )
    return;
  if (
    !(await phone.confirmNotice('再次确认：此操作不限当前聊天，会清空所有聊天的生成内容，且无法撤销。确定继续吗？', {
      confirmLabel: '清空全部',
      kind: 'warning',
    }))
  )
    return;
  await clearAllPhoneGeneratedContent();
  getRegisteredPhoneBackupRehydrateHandlers().forEach(handler => handler());
  favorites.clearSelection();
  await phone.returnToCurrentScope();
  toastr.success('已清空全部生成内容');
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
.pc-recovery-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pc-row-top {
  align-items: flex-start;
}
.pc-recovery-list {
  display: grid;
  gap: 8px;
}
.pc-recovery-card {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  padding: 10px;
  background: var(--pc-surface-strong);
}
.pc-recovery-card > div {
  min-width: 0;
}
.pc-recovery-card strong {
  overflow-wrap: anywhere;
}
.pc-recovery-card p {
  margin: 4px 0 0;
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.pc-danger-card {
  border-color: color-mix(in srgb, var(--pc-danger) 32%, var(--pc-border));
}
.pc-soft-btn.danger,
.pc-icon-btn.danger {
  color: var(--pc-danger);
}
</style>
