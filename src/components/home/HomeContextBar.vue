<template>
  <section class="pc-home-context">
    <div class="pc-home-context-actions">
      <ActionMenu align="start" icon-only label="操作" icon="fa-solid fa-bars">
        <button type="button" @click="emit('toggle-organizing')">
          <i class="fa-solid fa-arrows-up-down-left-right"></i
          ><span>{{ isOrganizing ? '完成整理' : '整理桌面' }}</span>
        </button>
        <button type="button" @click="emit('open-folder-creator')">
          <i class="fa-solid fa-folder-plus"></i><span>新建文件夹</span>
        </button>
        <button type="button" :disabled="isViewingCurrentChat" @click="phone.returnToCurrentScope()">
          <i class="fa-solid fa-location-crosshairs"></i><span>回到当前聊天</span>
        </button>
        <button
          type="button"
          :disabled="refreshingPhoneData || generationTasks.hasRunningTasks"
          @click="refreshPhoneData"
        >
          <i :class="['fa-solid fa-rotate-right', { 'fa-spin': refreshingPhoneData }]"></i><span>刷新插件数据</span>
        </button>
      </ActionMenu>
    </div>
    <div class="pc-home-context-copy">
      <span>{{ isViewingCurrentChat ? t`酒馆当前聊天` : t`历史聊天只读` }}</span>
      <strong>{{ viewingScopeMeta.ownerName }} / {{ viewingScopeMeta.chatTitle }}</strong>
    </div>
    <div v-if="!isViewingCurrentChat" class="pc-home-context-quick-actions">
      <button class="pc-soft-btn compact" type="button" @click.stop="jumpViewingChatToTavern">打开聊天</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import ActionMenu from '@/components/ActionMenu.vue';
import { getRegisteredPhoneBackupRehydrateHandlers } from '@/core/appRegistry';
import { useBaguStore } from '@/store/bagu';
import { useGenerationTaskStore } from '@/store/generationTasks';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useReaderStore } from '@/store/reader';
import { useRecoveryStore } from '@/store/recovery';
import { useSettingsStore } from '@/store/settings';
import { useStatsStore } from '@/store/stats';
import { jumpToTavernChat } from '@/util/tavernNavigation';
import { storeToRefs } from 'pinia';

defineProps<{
  isOrganizing: boolean;
}>();

const emit = defineEmits<{
  'open-folder-creator': [];
  refreshed: [];
  'toggle-organizing': [];
}>();

const bagu = useBaguStore();
const generationTasks = useGenerationTaskStore();
const phone = usePhoneStore();
const prompts = usePromptStore();
const reader = useReaderStore();
const recovery = useRecoveryStore();
const settingsStore = useSettingsStore();
const stats = useStatsStore();
const { isViewingCurrentChat, viewingScopeMeta } = storeToRefs(phone);
const refreshingPhoneData = ref(false);

async function jumpViewingChatToTavern() {
  if (isViewingCurrentChat.value) return;
  const target = phone.getTavernJumpTarget();
  if (!target) return toastr.warning('当前阅览没有对应的酒馆聊天');
  try {
    await jumpToTavernChat({ chatFile: target.chatId, characterId: target.characterId, ownerName: target.ownerName });
    phone.closePhone();
    window.setTimeout(() => void phone.syncCurrentTavernScope(true), 2400);
    toastr.success('正在跳转到酒馆聊天');
  } catch (caughtError) {
    toastr.error(caughtError instanceof Error ? caughtError.message : '跳转酒馆聊天失败');
  }
}

async function refreshPhoneData() {
  if (refreshingPhoneData.value) return;
  if (generationTasks.hasRunningTasks) return phone.noticeWarning('生成任务运行中，请暂停或等待任务完成后再刷新');
  refreshingPhoneData.value = true;
  await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
  try {
    settingsStore.rehydrateFromSettings();
    prompts.rehydrateFromSettings();
    bagu.rehydrateFromSettings();
    recovery.rehydrateFromSettings();
    reader.rehydrateFromSettings();
    generationTasks.rehydrateFromSettings();
    getRegisteredPhoneBackupRehydrateHandlers().forEach(handler => handler());
    stats.refresh();
    await nextTick();
    emit('refreshed');
    phone.noticeSuccess('插件数据已刷新');
  } catch (caughtError) {
    phone.noticeError(caughtError instanceof Error ? caughtError.message : '刷新插件数据失败');
  } finally {
    refreshingPhoneData.value = false;
  }
}
</script>

<style scoped>
.pc-home-context {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding: 7px 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
}
.pc-home-context-copy {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.pc-home-context-copy span,
.pc-home-context-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-home-context-copy span {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-home-context-copy strong {
  min-width: 0;
  flex: 1 1 auto;
  font-size: 13px;
}
.pc-home-context-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}
.pc-home-context-quick-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}
</style>
