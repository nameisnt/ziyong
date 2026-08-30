<template>
  <section class="pc-recovery-flow">
    <section v-if="route.page === 'reader' && loaded" class="pc-recovery-page pc-recovery-reader-page">
      <ReaderDetailShell
        v-if="activeMessage"
        :bagu-enabled="false"
        :content="activeMessage.content"
        content-formatted
        :edit-enabled="false"
        :favorite-enabled="false"
        footer-always-visible
        :next-disabled="messageIndex >= loaded.parsed.messages.length - 1"
        next-label="下一层"
        :previous-disabled="messageIndex <= 0"
        previous-label="上一层"
        :title="activeMessage.title"
        @bottom="scrollReader('bottom')"
        @catalog="catalogOpen = true"
        @next="openMessage(messageIndex + 1)"
        @previous="openMessage(messageIndex - 1)"
        @top="scrollReader('top')"
      >
        <template #kicker>
          <div class="pc-recovery-readonly-banner">
            <strong><i class="fa-solid fa-lock"></i> 备份只读视图</strong>
            <small>{{ loaded.summary.fileName }}</small>
            <small>
              {{ loaded.summary.fileSize }} · {{ loaded.parsed.messages.length }} 层 ·
              {{ props.formatDate(loaded.summary.lastMessageAt) }}
            </small>
            <small v-if="loaded.messageCountMismatch" class="pc-recovery-count-warning">
              {{ loaded.messageCountMismatch }}
            </small>
          </div>
        </template>
        <template #meta>
          <span class="pc-hidden-pill">{{ activeMessage.isUser ? '用户' : activeMessage.name }}</span>
          <span v-if="activeMessage.isHidden" class="pc-hidden-pill">隐藏</span>
        </template>
        <template #actions>
          <button
            class="pc-soft-btn danger"
            type="button"
            :disabled="recovery.managementBusy"
            title="永久删除此备份"
            @click="deleteLoadedBackup"
          >
            <i class="fa-solid fa-trash-can"></i>
            <span>删除备份</span>
          </button>
          <button class="pc-primary-btn" type="button" title="导入此备份" @click="openImportConfirm">
            <i class="fa-solid fa-file-import"></i>
            <span>导入备份</span>
          </button>
        </template>
        <template #overlays>
          <CatalogModal
            :active-id="activeMessage.id"
            :items="catalogItems"
            :open="catalogOpen"
            title="备份楼层"
            @close="catalogOpen = false"
            @select="selectCatalogMessage"
          />
        </template>
      </ReaderDetailShell>
      <EmptyState v-else title="这份备份只有 metadata，没有聊天楼层">
        <p>它不能作为正常恢复点导入，可使用顶栏返回后删除或查看其他备份。</p>
      </EmptyState>
    </section>

    <section v-else-if="route.page === 'confirm' && loaded" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-confirm-card">
        <strong>确认原生导入</strong>
        <dl class="pc-recovery-details">
          <div>
            <dt>来源</dt>
            <dd>{{ loaded.summary.fileName }}</dd>
          </div>
          <div>
            <dt>备份</dt>
            <dd>{{ loaded.parsed.messages.length }} 层 · {{ props.formatDate(loaded.summary.lastMessageAt) }}</dd>
          </div>
          <div>
            <dt>识别角色</dt>
            <dd>{{ loaded.parsed.characterName || 'metadata 未记录' }}</dd>
          </div>
        </dl>
        <label class="pc-field-group">
          <span class="pc-field-label">目标角色卡</span>
          <SearchableCombobox
            v-model="selectedTargetId"
            input-label="选择导入目标角色卡"
            :options="targetOptions"
            placeholder="必须选择角色卡"
          />
        </label>
        <p class="pc-recovery-safety-note">
          <i class="fa-solid fa-shield-halved"></i> 将作为一份新聊天导入，不覆盖当前聊天，不删除原备份，也不复制插件
          scope 数据。
        </p>
        <p v-if="loaded.messageCountMismatch" class="pc-recovery-warning">{{ loaded.messageCountMismatch }}</p>
      </article>
      <div class="pc-form-actions pc-recovery-single-action">
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="!selectedTargetId || Boolean(loaded.messageCountMismatch) || recovery.importing"
          @click="confirmImport"
        >
          {{ recovery.importing ? '正在导入…' : '确认导入为新聊天' }}
        </button>
      </div>
    </section>

    <section v-else-if="route.page === 'result' && recovery.importResult" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-result-card">
        <i class="fa-solid fa-circle-check"></i>
        <strong>酒馆已创建新的导入聊天</strong>
        <p>{{ recovery.importResult.fileName }}</p>
        <small>目标角色：{{ recovery.importResult.target.name }}</small>
        <p v-if="!recovery.importResult.verified" class="pc-recovery-warning">
          聊天列表暂未确认到新文件，请勿重复导入；可返回书架刷新后检查。
        </p>
      </article>
      <div class="pc-form-actions pc-recovery-single-action">
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="!recovery.importResult.verified"
          @click="openImportedChat"
        >
          打开导入后的聊天
        </button>
      </div>
    </section>

    <EmptyState v-else title="备份管理页面状态已失效" />
  </section>
</template>

<script setup lang="ts">
import CatalogModal from '@/components/CatalogModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { ChatBackupSummary } from '@/apps/recovery/model';
import { useChatRecoveryStore } from '@/apps/recovery/store';
import { usePhoneStore } from '@/store/phone';
import { jumpToTavernChat } from '@/util/tavernNavigation';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  confirmDeleteBackup: (summary: ChatBackupSummary, navigateWhenGroupEmpty?: boolean) => Promise<boolean>;
  formatDate: (value?: number) => string;
}>();

const phone = usePhoneStore();
const recovery = useChatRecoveryStore();
const { activeBackup: loaded } = storeToRefs(recovery);
const route = computed(() => phone.currentRoute);
const messageIndex = ref(0);
const catalogOpen = ref(false);
const selectedTargetId = ref('');
const activeMessage = computed(() => loaded.value?.parsed.messages[messageIndex.value] ?? null);
const catalogItems = computed(
  () =>
    loaded.value?.parsed.messages.map(message => ({ id: message.id, meta: message.name, title: message.title })) ?? [],
);
const targetOptions = computed(() =>
  recovery.characters.map(character => ({ label: character.name, value: String(character.id) })),
);

watch(
  () => route.value.page,
  page => {
    if (page === 'confirm' && !selectedTargetId.value) selectedTargetId.value = suggestedTargetId();
  },
  { immediate: true },
);

async function deleteLoadedBackup() {
  const summary = loaded.value?.summary;
  if (!summary) return;
  const groupId = route.value.params?.groupId ?? '';
  if (!(await props.confirmDeleteBackup(summary, false))) return;
  if (route.value.params?.from === 'cleanup' || route.value.params?.from === 'duplicates') {
    await phone.goBack({ skipConfirm: true });
    return;
  }
  if (groupId && recovery.groups.some(group => group.id === groupId)) phone.goBack({ skipConfirm: true });
  else phone.replacePage('chats', '聊天备份');
}

function openMessage(index: number) {
  if (!loaded.value) return;
  messageIndex.value = Math.max(0, Math.min(index, loaded.value.parsed.messages.length - 1));
}

function selectCatalogMessage(messageId: string) {
  const index = loaded.value?.parsed.messages.findIndex(message => message.id === messageId) ?? -1;
  if (index >= 0) openMessage(index);
  catalogOpen.value = false;
}

function scrollReader(edge: 'bottom' | 'top') {
  document
    .querySelector('.pc-recovery-reader-page .pc-reader-content')
    ?.scrollTo({ behavior: 'smooth', top: edge === 'top' ? 0 : Number.MAX_SAFE_INTEGER });
}

function openImportConfirm() {
  if (!loaded.value?.parsed.messages.length || loaded.value.messageCountMismatch) return;
  selectedTargetId.value = suggestedTargetId();
  phone.pushPage('confirm', '确认导入备份');
}

function suggestedTargetId() {
  const fileName = loaded.value?.summary.fileName;
  const group = recovery.groups.find(item => item.backups.some(backup => backup.fileName === fileName));
  return group?.kind === 'character' && group.character ? String(group.character.id) : '';
}

async function confirmImport() {
  if (!selectedTargetId.value) return;
  const targetId = Number(selectedTargetId.value);
  if (!Number.isInteger(targetId) || targetId < 0) return;
  try {
    await recovery.importActiveBackup(targetId);
    phone.replacePage('result', '导入完成');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '聊天备份导入失败');
  }
}

async function openImportedChat() {
  const result = recovery.importResult;
  if (!result?.verified) return;
  try {
    await jumpToTavernChat({
      avatar: result.target.avatar,
      characterId: result.target.id,
      chatFile: result.fileName,
      ownerName: result.target.name,
    });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '无法打开导入后的聊天');
  }
}
</script>

<style scoped>
.pc-recovery-flow,
.pc-recovery-page {
  display: flex;
  min-height: 0;
  flex-direction: column;
  flex: 1 1 auto;
}

.pc-recovery-page {
  gap: 10px;
}

.pc-recovery-reader-page {
  height: 100%;
}

.pc-recovery-reader-page :deep(.pc-detail-content.pc-reader-content) {
  height: auto;
  min-height: 0;
  flex: 1 1 0;
}

.pc-recovery-readonly-banner {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface);
}

.pc-recovery-readonly-banner small {
  overflow: hidden;
  color: var(--pc-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-recovery-readonly-banner .pc-recovery-count-warning {
  color: var(--pc-danger);
  white-space: normal;
}

.pc-recovery-confirm-card,
.pc-recovery-result-card {
  display: grid;
  gap: 10px;
}

.pc-recovery-details {
  display: grid;
  gap: 8px;
  margin: 0;
}

.pc-recovery-details div {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 8px;
}

.pc-recovery-details dt,
.pc-recovery-result-card small {
  color: var(--pc-muted);
}

.pc-recovery-details dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

/* S03A: these Recovery-specific notices moved outside the parent's scoped-style boundary. */
.pc-recovery-safety-note,
.pc-recovery-warning {
  padding: 10px;
  border-radius: min(var(--pc-control-radius), 8px);
  background: color-mix(in srgb, var(--pc-theme-accent) 10%, var(--pc-surface) 90%);
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-recovery-safety-note,
.pc-recovery-result-card p {
  margin: 0;
}

.pc-recovery-warning {
  color: var(--pc-danger);
}

.pc-recovery-result-card {
  place-items: center;
  text-align: center;
}

.pc-recovery-result-card > i {
  color: var(--pc-theme-accent);
  font-size: 34px;
}

.pc-recovery-single-action {
  grid-template-columns: minmax(0, 1fr);
}
</style>
