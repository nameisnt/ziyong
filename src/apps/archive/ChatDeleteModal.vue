<template>
  <Teleport to="#tavern-phone-root .pc-phone-shell">
    <section class="pc-modal-backdrop" @click.self="close">
      <article
        ref="dialogRef"
        class="pc-section-card pc-modal-dialog pc-chat-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="删除聊天"
        tabindex="-1"
      >
        <header class="pc-section-head">
          <strong>删除聊天 · {{ owner.name }}</strong>
          <button class="pc-icon-btn" type="button" aria-label="关闭" title="关闭" :disabled="busy" @click="close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <p>删除 {{ chats.length }} 份酒馆聊天记录，不删除角色卡和酒馆原生备份。</p>
        <div class="pc-chat-delete-list">
          <p v-for="chat in chats" :key="chat.key">{{ chat.title }}{{ chat.isCurrent ? '（当前聊天）' : '' }}</p>
        </div>
        <label class="pc-setting-row"
          ><span>同时删除所选聊天的插件内容及聊天专属配置</span
          ><BulkSelectionCheckbox v-model="removeContent" label="同时删除插件内容" :disabled="busy || done"
        /></label>
        <label class="pc-setting-row"
          ><span>同时删除所选聊天的插件楼层备份</span
          ><BulkSelectionCheckbox v-model="removeBackup" label="同时删除楼层备份" :disabled="busy || done"
        /></label>
        <p v-if="busy" role="status">正在处理 {{ progress }} / {{ chats.length }}</p>
        <div v-if="done" class="pc-chat-delete-list" role="status">
          <p>已删除 {{ results.filter(item => item.deleted).length }} / {{ chats.length }} 份聊天</p>
          <p v-for="(item, index) in results" :key="index">
            {{ item.title }}：{{ item.deleted ? (item.error ? '聊天已删除；' : '已删除') : '未删除；' }}{{ item.error }}
          </p>
        </div>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="busy" @click="close">
            {{ done ? '关闭' : '取消' }}
          </button>
          <button
            v-if="!done"
            class="pc-primary-btn danger"
            type="button"
            :disabled="busy || !chats.length"
            @click="execute"
          >
            <i class="fa-solid fa-trash"></i>删除聊天
          </button>
        </div>
      </article>
    </section>
  </Teleport>
</template>
<script setup lang="ts">
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import { deleteArchivedChat, type DeleteChatResult } from './chatDeletion';
import type { ArchiveChatRow, ArchiveOwner } from './useChatArchiveCatalogSession';
import { areChatScopeKeysEquivalent, getCurrentChatScopeKey } from '@/store/chatScoped';
const props = defineProps<{ owner: ArchiveOwner; chats: ArchiveChatRow[] }>();
const emit = defineEmits<{ close: []; finished: [] }>();
const dialogRef = ref<HTMLElement | null>(null);
const removeContent = ref(false);
const removeBackup = ref(false);
const busy = ref(false);
const done = ref(false);
const progress = ref(0);
const results = ref<DeleteChatResult[]>([]);
function close() {
  if (!busy.value) emit('close');
}
usePhoneModalLifecycle({ dialogRef, isOpen: () => true, onClose: close });
async function execute() {
  if (busy.value || done.value) return;
  busy.value = true;
  const ordered = [...props.chats].sort(
    (a, b) =>
      Number(areChatScopeKeysEquivalent(a.scopeKey, getCurrentChatScopeKey())) -
      Number(areChatScopeKeysEquivalent(b.scopeKey, getCurrentChatScopeKey())),
  );
  try {
    for (const chat of ordered) {
      progress.value += 1;
      results.value.push(
        await deleteArchivedChat(props.owner, chat, { content: removeContent.value, backup: removeBackup.value }),
      );
    }
  } finally {
    busy.value = false;
    done.value = true;
    emit('finished');
  }
}
</script>
<style scoped>
.pc-chat-delete-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(480px, 100%);
  max-height: 90%;
  overflow: auto;
}
.pc-chat-delete-list {
  max-height: 180px;
  overflow-y: auto;
  overflow-wrap: anywhere;
  flex-shrink: 0;
}
</style>
