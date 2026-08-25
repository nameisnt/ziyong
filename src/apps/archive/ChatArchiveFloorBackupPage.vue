<template>
  <section class="pc-archive-page pc-archive-floor-backup-page">
    <article class="pc-page-section pc-floor-backup-overview">
      <div class="pc-domain-head">
        <strong>{{ props.backup.owner.displayName }} / {{ props.backup.chat.title }}</strong>
        <span>{{ props.backup.messages.length }} 层</span>
      </div>
      <small
        >保存于 {{ props.formatBackupTime(props.backup.updatedAt) }}；导入文件只进入备份库，不会自动写入聊天。</small
      >
    </article>

    <div class="pc-floor-message-list">
      <article
        v-for="message in props.backup.messages"
        :key="`${message.messageId}-${message.role}`"
        class="pc-page-section pc-floor-message"
      >
        <header>
          <strong>第 {{ message.messageId }} 楼 · {{ message.role === 'user' ? '用户' : 'AI' }}</strong>
          <span v-if="message.isHidden">已隐藏</span>
        </header>
        <p>{{ message.message || '（空正文）' }}</p>
        <details v-if="getBackupReasoning(message)">
          <summary>查看思维链</summary>
          <pre>{{ getBackupReasoning(message) }}</pre>
        </details>
      </article>
    </div>

    <div class="pc-form-actions pc-floor-backup-footer">
      <button class="pc-soft-btn" type="button" @click="props.exportBackup">{{ t`导出备份` }}</button>
      <button
        class="pc-primary-btn"
        type="button"
        :disabled="!props.isCurrentChat || props.restoring"
        @click="props.restoreBackup"
      >
        {{ props.restoring ? t`插入中…` : t`插入空聊天` }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ChatFloorBackup, ChatFloorBackupMessage } from '@/util/chatFloorBackup';
import { extractMessageReasoning } from '@/util/messageReasoning';

const props = defineProps<{
  backup: ChatFloorBackup;
  exportBackup: () => void;
  formatBackupTime: (value: string) => string;
  isCurrentChat: boolean;
  restoreBackup: () => Promise<void>;
  restoring: boolean;
}>();

function getBackupReasoning(message: ChatFloorBackupMessage) {
  return extractMessageReasoning(message);
}
</script>

<style scoped>
.pc-archive-floor-backup-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 12px;
}

.pc-domain-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.pc-domain-head span,
.pc-floor-backup-overview > small,
.pc-floor-message header span {
  color: var(--pc-muted);
}

.pc-floor-message-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-floor-message {
  display: grid;
  gap: 8px;
}

.pc-floor-message header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.pc-floor-message p,
.pc-floor-message pre {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.pc-floor-message p {
  max-height: 14em;
  overflow: auto;
  line-height: 1.6;
}

.pc-floor-message details {
  color: var(--pc-muted);
}

.pc-floor-message pre {
  max-height: 12em;
  margin-top: 8px;
  overflow: auto;
  color: var(--pc-text);
  font: inherit;
}

.pc-floor-backup-footer {
  position: sticky;
  z-index: 2;
  bottom: 0;
  padding-block: 8px;
  background: var(--pc-surface);
}
</style>
