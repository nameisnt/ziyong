<template>
  <Teleport v-if="menuTargetReady" to="#pc_reader_wand_container">
    <div
      id="pc-menu-entry"
      class="pc-menu-entry"
      role="button"
      tabindex="0"
      @click="phone.openPhone()"
      @keydown.enter.prevent="phone.openPhone()"
      @keydown.space.prevent="phone.openPhone()"
    >
      <div class="fa-solid fa-mobile-screen-button extensionsMenuExtensionButton" aria-hidden="true"></div>
      <span>{{ t`打开功能性阅读器` }}</span>
    </div>
  </Teleport>

  <Teleport to="body">
    <PhoneOverlay />
  </Teleport>
  <Teleport to="body">
    <FloatingBall />
  </Teleport>
</template>

<script setup lang="ts">
import FloatingBall from '@/components/FloatingBall.vue';
import PhoneOverlay from '@/components/PhoneOverlay.vue';
import { useWorldSlotsStore } from '@/apps/world-slots/store';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { migratePhoneChatRename } from '@/util/chatScopeRename';
import { onTavernChatRename } from '@/util/tavernChatRenameObserver';
import { startChatFloorBackupService } from '@/util/chatFloorBackup';
import { ensureCurrentScopeRecovery } from '@/util/generationVisibility';
import { hasVisibilityTransactionRuntime, onTavernEvent } from '@/util/runtime';

const phone = usePhoneStore();
const worldSlots = useWorldSlotsStore();
const menuTargetReady = ref(false);
let stopChatChanged: { stop: () => void } | null = null;
let stopChatRenamed: { stop: () => void } | null = null;
let stopChatFloorBackup: { stop: () => void } | null = null;
let targetObserver: MutationObserver | null = null;
let menuTarget: HTMLElement | null = null;

async function tryRecoverCurrentScope() {
  if (!hasVisibilityTransactionRuntime()) return;
  const result = await ensureCurrentScopeRecovery(getCurrentChatScopeKey());
  if (result.status === 'restored') {
    toastr.success('已自动恢复上一轮生成留下的来源隐藏状态');
    return;
  }

  if (result.status === 'discarded') {
    toastr.info(result.message);
    return;
  }

  if (result.status === 'identity_mismatch' || result.status === 'scope_changed') {
    toastr.warning(result.message);
  }
}

function scheduleCurrentScopeRecovery() {
  void tryRecoverCurrentScope().catch(error => {
    console.error('[手机恢复] 自动恢复失败', error);
    toastr.error(`自动恢复失败：${error instanceof Error ? error.message : String(error)}`);
  });
}

function syncTeleportTargets() {
  if (menuTarget?.isConnected && menuTarget.closest('#extensionsMenu')) {
    menuTargetReady.value = true;
    return;
  }
  const menu = document.querySelector<HTMLElement>('#extensionsMenu');
  if (!menu) {
    menuTargetReady.value = false;
    return;
  }

  let target = document.querySelector<HTMLElement>('#pc_reader_wand_container');
  if (!target) {
    target = document.createElement('div');
    target.id = 'pc_reader_wand_container';
    target.className = 'extension_container';
    const dataBankContainer = menu.querySelector('#data_bank_wand_container');
    if (dataBankContainer) dataBankContainer.insertAdjacentElement('afterend', target);
    else menu.prepend(target);
  }
  menuTarget = target;
  menuTargetReady.value = true;
}

onMounted(() => {
  worldSlots.startAutoSync();
  stopChatFloorBackup = startChatFloorBackupService();
  syncTeleportTargets();
  targetObserver = new MutationObserver(syncTeleportTargets);
  targetObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
  scheduleCurrentScopeRecovery();

  stopChatChanged = onTavernEvent('CHAT_CHANGED', () => {
    scheduleCurrentScopeRecovery();
  });
  stopChatRenamed = onTavernChatRename(payload => {
    const result = migratePhoneChatRename(payload);
    if (!result.migrated) return;
    void phone.syncCurrentTavernScope(true, true);
  });
});

onUnmounted(() => {
  stopChatFloorBackup?.stop();
  stopChatFloorBackup = null;
  stopChatChanged?.stop();
  stopChatChanged = null;
  stopChatRenamed?.stop();
  stopChatRenamed = null;
  targetObserver?.disconnect();
  targetObserver = null;
  menuTarget?.remove();
  menuTarget = null;
});
</script>
