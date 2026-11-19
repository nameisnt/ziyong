<template>
  <EmptyState v-if="!rows.length && !loading" compact :title="emptyTitle" />
  <div v-else-if="loading && !rows.length" :class="['pc-directory-list pc-chat-list', { scrollable }]" aria-hidden="true">
    <div v-for="index in 5" :key="index" class="pc-skeleton-row lines-only">
      <span class="pc-skeleton-lines">
        <span class="pc-skeleton-block pc-skeleton-line"></span>
        <span class="pc-skeleton-block pc-skeleton-line short"></span>
      </span>
    </div>
  </div>
  <div v-else :class="['pc-directory-list pc-chat-list', { scrollable }]">
    <div
      v-for="chat in displayedRows"
      :key="chat.key"
      class="pc-list-row pc-chat-row"
      @click.self="
        selection
          ? chat.exists &&
            selectableIds.includes(chat.key) &&
            $emit('toggle', chat.key, !selectedIds.includes(chat.key))
          : $emit('select', chat)
      "
    >
      <BulkSelectionCheckbox
        v-if="selection"
        :model-value="selectedIds.includes(chat.key)"
        :disabled="!chat.exists || !selectableIds.includes(chat.key)"
        :label="`选择聊天 ${chat.title}`"
        @update:model-value="$emit('toggle', chat.key, $event)"
      />
      <button
        class="pc-chat-main"
        type="button"
        @click="
          selection
            ? chat.exists &&
              selectableIds.includes(chat.key) &&
              $emit('toggle', chat.key, !selectedIds.includes(chat.key))
            : $emit('select', chat)
        "
      >
        <strong>{{ chat.title }}</strong>
        <small>
          {{ !chat.exists && !chat.isCurrent ? '聊天已不存在 · ' : '' }}{{ chat.isUsed ? '有手机内容' : '无手机内容'
          }}{{ chat.floorBackup ? ` · 已备份 ${chat.floorBackup.messageCount} 层` : ''
          }}{{ chat.isCurrent ? ' · 当前聊天' : '' }}
        </small>
      </button>
      <span v-if="chat.isUsed" class="pc-count-pill">{{ chat.contentCount }}</span>
    </div>
    <button v-if="hiddenChatCount" class="pc-soft-btn pc-load-more" type="button" @click="loadMoreChats">
      加载更多聊天（{{ hiddenChatCount }}）
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import type { ArchiveChatRow } from '@/apps/archive/useChatArchiveCatalogSession';

const CHAT_PAGE_SIZE = 50;
const props = withDefaults(
  defineProps<{
    emptyTitle?: string;
    loading?: boolean;
    rows: ArchiveChatRow[];
    scrollable?: boolean;
    selection?: boolean;
    selectedIds?: string[];
    selectableIds?: string[];
  }>(),
  {
    emptyTitle: '暂无聊天',
    loading: false,
    scrollable: false,
    selection: false,
    selectedIds: () => [],
    selectableIds: () => [],
  },
);

const renderLimit = ref(CHAT_PAGE_SIZE);
const displayedRows = computed(() => props.rows.slice(0, renderLimit.value));
const hiddenChatCount = computed(() => Math.max(0, props.rows.length - displayedRows.value.length));
watch(
  () => props.rows,
  () => {
    renderLimit.value = CHAT_PAGE_SIZE;
  },
);
function loadMoreChats() {
  renderLimit.value += CHAT_PAGE_SIZE;
}

defineEmits<{
  select: [chat: ArchiveChatRow];
  toggle: [id: string, selected: boolean];
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
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
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
