<template>
  <EmptyState v-if="!rows.length && !loading" compact :title="emptyTitle" />
  <div v-else :class="['pc-directory-list pc-chat-list', { scrollable }]">
    <button
      v-for="chat in rows"
      :key="chat.key"
      class="pc-list-row pc-chat-row"
      type="button"
      @click="$emit('select', chat)"
    >
      <span class="pc-chat-main">
        <strong>{{ chat.title }}</strong>
        <small>
          {{ chat.isUsed ? '有手机内容' : '无手机内容'
          }}{{ chat.floorBackup ? ` · 已备份 ${chat.floorBackup.messages.length} 层` : ''
          }}{{ chat.isCurrent ? ' · 当前聊天' : '' }}
        </small>
      </span>
      <span v-if="chat.isUsed" class="pc-count-pill">{{ chat.contentCount }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import type { ArchiveChatRow } from '@/apps/archive/useChatArchiveCatalogSession';

withDefaults(
  defineProps<{
    emptyTitle?: string;
    loading?: boolean;
    rows: ArchiveChatRow[];
    scrollable?: boolean;
  }>(),
  {
    emptyTitle: '暂无聊天',
    loading: false,
    scrollable: false,
  },
);

defineEmits<{
  select: [chat: ArchiveChatRow];
}>();
</script>

<style scoped>
.pc-chat-list.scrollable {
  max-height: 224px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.pc-chat-row {
  min-height: 56px;
}

.pc-chat-main {
  min-width: 0;
  flex: 1 1 auto;
}

.pc-chat-main strong,
.pc-chat-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-chat-main small {
  color: var(--pc-muted);
}

.pc-count-pill {
  min-width: 32px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
}
</style>
