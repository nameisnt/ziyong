<template>
  <Teleport v-if="settingsTargetReady" to="#extensions_settings2">
    <Panel />
  </Teleport>

  <Teleport v-if="menuTargetReady" to="#extensionsMenu">
    <button
      id="pc-menu-entry"
      class="list-group-item flex-container flexGap5 pc-menu-entry"
      type="button"
      @click="phone.openPhone()"
    >
      <span class="extensionsMenuExtensionButton">
        <i class="fa-solid fa-mobile-screen-button"></i>
      </span>
      <span>{{ t`打开酒馆手机` }}</span>
    </button>
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
import Panel from '@/Panel.vue';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { ensureCurrentScopeRecovery } from '@/util/generationVisibility';
import { hasVisibilityTransactionRuntime, onTavernEvent } from '@/util/runtime';

const phone = usePhoneStore();
const settingsTargetReady = ref(false);
const menuTargetReady = ref(false);
let stopChatChanged: { stop: () => void } | null = null;
let targetObserver: MutationObserver | null = null;

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

function syncTeleportTargets() {
  settingsTargetReady.value = Boolean(document.querySelector('#extensions_settings2'));
  menuTargetReady.value = Boolean(document.querySelector('#extensionsMenu'));
}

onMounted(() => {
  syncTeleportTargets();
  targetObserver = new MutationObserver(syncTeleportTargets);
  targetObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
  void tryRecoverCurrentScope();

  stopChatChanged = onTavernEvent('CHAT_CHANGED', () => {
    void tryRecoverCurrentScope();
  });
});

onUnmounted(() => {
  stopChatChanged?.stop();
  stopChatChanged = null;
  targetObserver?.disconnect();
  targetObserver = null;
});
</script>

<style scoped>
.pc-menu-entry {
  border: 0;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.pc-menu-entry .extensionsMenuExtensionButton {
  width: 28px;
  display: inline-grid;
  place-items: center;
}
</style>
