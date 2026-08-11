<template>
  <section class="pc-recovery-app">
    <section v-if="route.page === 'root'" class="pc-recovery-page">
      <div class="pc-compact-toolbar pc-recovery-toolbar">
        <input v-model="query" class="pc-field" type="search" placeholder="搜索角色或备份文件" />
        <button class="pc-icon-btn" type="button" :disabled="recovery.loading" title="刷新备份书架" @click="recovery.refresh">
          <i :class="['fa-solid fa-rotate', { spinning: recovery.loading }]"></i>
        </button>
      </div>
      <div class="pc-segment pc-recovery-sort" aria-label="备份排序">
        <button :class="['pc-segment-btn', { active: sortMode === 'recent' }]" type="button" @click="sortMode = 'recent'">最近备份</button>
        <button :class="['pc-segment-btn', { active: sortMode === 'character' }]" type="button" @click="sortMode = 'character'">角色名称</button>
      </div>

      <article v-if="recovery.error" class="pc-section-card pc-recovery-error">
        <strong>{{ recovery.status === 'unsupported' ? '版本不支持' : '读取失败' }}</strong>
        <p>{{ recovery.error }}</p>
      </article>
      <EmptyState v-if="!recovery.loading && !filteredGroups.length" :title="emptyTitle">
        <p v-if="recovery.status !== 'unsupported'">SillyTavern 生成聊天备份后会显示在这里。</p>
      </EmptyState>

      <div v-else class="pc-recovery-shelves">
        <article v-for="group in filteredGroups" :key="group.id" class="pc-section-card pc-recovery-shelf">
          <header class="pc-recovery-shelf-head">
            <span class="pc-recovery-avatar" aria-hidden="true">{{ groupInitial(group) }}</span>
            <span class="pc-recovery-shelf-copy">
              <strong>{{ group.label }}</strong>
              <small>{{ group.backups.length }} 份备份 · 最近 {{ formatDate(group.backups[0]?.lastMessageAt) }}</small>
              <small v-if="group.kind === 'conflict'">匹配到：{{ group.conflictCharacters.map(item => item.name).join('、') }}</small>
            </span>
          </header>
          <div class="pc-recovery-books">
            <button
              v-for="backup in group.backups"
              :key="backup.fileName"
              class="pc-recovery-book"
              type="button"
              :disabled="recovery.reading"
              @click="openBackup(backup)"
            >
              <span class="pc-recovery-book-icon"><i class="fa-solid fa-book"></i></span>
              <span class="pc-recovery-book-copy">
                <strong>{{ formatDate(backup.lastMessageAt) }}</strong>
                <small>{{ backup.fileName }}</small>
                <small>{{ backup.fileSize }} · {{ backup.chatItems }} 层</small>
                <span>{{ backup.lastMessage || '没有消息摘要' }}</span>
              </span>
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="route.page === 'reader' && loaded" class="pc-recovery-page pc-recovery-reader-page">
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
            <small>{{ loaded.summary.fileSize }} · {{ loaded.parsed.messages.length }} 层 · {{ formatDate(loaded.summary.lastMessageAt) }}</small>
            <small v-if="loaded.messageCountMismatch" class="pc-recovery-count-warning">{{ loaded.messageCountMismatch }}</small>
          </div>
        </template>
        <template #meta>
          <span class="pc-hidden-pill">{{ activeMessage.isUser ? '用户' : activeMessage.name }}</span>
          <span v-if="activeMessage.isHidden" class="pc-hidden-pill">隐藏</span>
        </template>
        <template #actions>
          <button class="pc-soft-btn" type="button" title="返回备份书架" @click="returnToShelf"><i class="fa-solid fa-arrow-left"></i></button>
          <button class="pc-primary-btn" type="button" title="导入此备份" @click="openImportConfirm"><i class="fa-solid fa-file-import"></i></button>
        </template>
        <template #overlays>
          <CatalogModal :active-id="activeMessage.id" :items="catalogItems" :open="catalogOpen" title="备份楼层" @close="catalogOpen = false" @select="selectCatalogMessage" />
        </template>
      </ReaderDetailShell>
      <EmptyState v-else title="这份备份只有 metadata，没有聊天楼层">
        <p>它不能作为正常恢复点导入，但可返回书架查看其他备份。</p>
        <button class="pc-soft-btn" type="button" @click="returnToShelf">返回书架</button>
      </EmptyState>
    </section>

    <section v-else-if="route.page === 'confirm' && loaded" class="pc-recovery-page">
      <article class="pc-section-card pc-recovery-confirm-card">
        <strong>确认原生导入</strong>
        <dl class="pc-recovery-details">
          <div><dt>来源</dt><dd>{{ loaded.summary.fileName }}</dd></div>
          <div><dt>备份</dt><dd>{{ loaded.parsed.messages.length }} 层 · {{ formatDate(loaded.summary.lastMessageAt) }}</dd></div>
          <div><dt>识别角色</dt><dd>{{ loaded.parsed.characterName || 'metadata 未记录' }}</dd></div>
        </dl>
        <label class="pc-field-group">
          <span class="pc-field-label">目标角色卡</span>
          <SearchableCombobox v-model="selectedTargetId" input-label="选择导入目标角色卡" :options="targetOptions" placeholder="必须选择角色卡" />
        </label>
        <p class="pc-recovery-safety-note"><i class="fa-solid fa-shield-halved"></i> 将作为一份新聊天导入，不覆盖当前聊天，不删除原备份，也不复制插件 scope 数据。</p>
        <p v-if="loaded.messageCountMismatch" class="pc-recovery-warning">{{ loaded.messageCountMismatch }}</p>
      </article>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" :disabled="recovery.importing" @click="phone.goBack()">返回阅读</button>
        <button class="pc-primary-btn" type="button" :disabled="!selectedTargetId || Boolean(loaded.messageCountMismatch) || recovery.importing" @click="confirmImport">
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
        <p v-if="!recovery.importResult.verified" class="pc-recovery-warning">聊天列表暂未确认到新文件，请勿重复导入；可返回书架刷新后检查。</p>
      </article>
      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="returnToShelf">返回书架</button>
        <button class="pc-primary-btn" type="button" :disabled="!recovery.importResult.verified" @click="openImportedChat">打开导入后的聊天</button>
      </div>
    </section>

    <EmptyState v-else title="恢复页面状态已失效">
      <button class="pc-soft-btn" type="button" @click="returnToShelf">返回备份书架</button>
    </EmptyState>
  </section>
</template>

<script setup lang="ts">
import CatalogModal from '@/components/CatalogModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import ReaderDetailShell from '@/components/ReaderDetailShell.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useChatRecoveryStore } from '@/apps/recovery/store';
import type { ChatBackupGroup, ChatBackupSummary } from '@/apps/recovery/model';
import { usePhoneStore } from '@/store/phone';
import { jumpToTavernChat } from '@/util/tavernNavigation';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const recovery = useChatRecoveryStore();
const { activeBackup: loaded } = storeToRefs(recovery);
const route = computed(() => phone.currentRoute);
const query = ref('');
const sortMode = ref<'character' | 'recent'>('recent');
const messageIndex = ref(0);
const catalogOpen = ref(false);
const selectedTargetId = ref('');
const localError = ref('');

const activeMessage = computed(() => loaded.value?.parsed.messages[messageIndex.value] ?? null);
const catalogItems = computed(() =>
  loaded.value?.parsed.messages.map(message => ({ id: message.id, meta: message.name, title: message.title })) ?? [],
);
const targetOptions = computed(() => recovery.characters.map(character => ({ label: character.name, value: String(character.id) })));
const filteredGroups = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase();
  const groups = recovery.groups
    .map(group => ({ ...group, backups: group.backups.filter(backup => !needle || `${group.label} ${backup.fileName} ${backup.lastMessage}`.toLocaleLowerCase().includes(needle)) }))
    .filter(group => group.backups.length);
  if (sortMode.value === 'character') return groups.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
  return groups.sort((a, b) => (b.backups[0]?.lastMessageAt ?? 0) - (a.backups[0]?.lastMessageAt ?? 0));
});
const emptyTitle = computed(() => recovery.status === 'unsupported' ? '当前版本不支持备份书架' : query.value.trim() ? '没有匹配的聊天备份' : '还没有聊天备份');

onMounted(() => {
  if (recovery.status === 'idle') void recovery.refresh();
});
onBeforeUnmount(recovery.releaseActiveBackup);
watch(
  () => route.value.page,
  page => {
    if (page === 'root') recovery.releaseActiveBackup();
    if (page === 'confirm' && !selectedTargetId.value) selectedTargetId.value = suggestedTargetId();
  },
  { immediate: true },
);

function formatDate(value?: number) {
  if (!value) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

function groupInitial(group: ChatBackupGroup) {
  return (group.character?.name || group.label).trim().slice(0, 1).toUpperCase() || '?';
}

async function openBackup(summary: ChatBackupSummary) {
  localError.value = '';
  try {
    await recovery.readBackup(summary);
    messageIndex.value = 0;
    phone.pushPage('reader', '阅读聊天备份', { fileName: summary.fileName });
  } catch (error) {
    localError.value = error instanceof Error ? error.message : '读取聊天备份失败';
    toastr.error(localError.value);
  }
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
  document.querySelector('.pc-recovery-reader-page .pc-reader-content')?.scrollTo({ behavior: 'smooth', top: edge === 'top' ? 0 : Number.MAX_SAFE_INTEGER });
}

function returnToShelf() {
  recovery.releaseActiveBackup();
  phone.replacePage('root', '聊天备份恢复');
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
    await jumpToTavernChat({ avatar: result.target.avatar, characterId: result.target.id, chatFile: result.fileName, ownerName: result.target.name });
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '无法打开导入后的聊天');
  }
}
</script>

<style scoped>
.pc-recovery-app,
.pc-recovery-page {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.pc-recovery-page {
  gap: 10px;
}

.pc-recovery-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}

.pc-recovery-sort {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pc-recovery-shelves,
.pc-recovery-books {
  display: grid;
  gap: 10px;
}

.pc-recovery-shelf {
  display: grid;
  gap: 10px;
}

.pc-recovery-shelf-head {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.pc-recovery-avatar,
.pc-recovery-book-icon {
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface) 84%);
  color: var(--pc-theme-accent);
}

.pc-recovery-avatar {
  width: 42px;
  height: 42px;
  font-weight: 800;
}

.pc-recovery-shelf-copy,
.pc-recovery-book-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.pc-recovery-shelf-copy small,
.pc-recovery-book-copy small,
.pc-recovery-result-card small {
  color: var(--pc-muted);
}

.pc-recovery-book {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-recovery-book-icon {
  width: 38px;
  height: 48px;
}

.pc-recovery-book-copy :is(strong, small, span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-recovery-book-copy span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-recovery-error,
.pc-recovery-confirm-card,
.pc-recovery-result-card {
  display: grid;
  gap: 10px;
}

.pc-recovery-error p,
.pc-recovery-result-card p,
.pc-recovery-safety-note {
  margin: 0;
}

.pc-recovery-readonly-banner {
  display: grid;
  gap: 2px;
  padding: 9px 10px;
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

.pc-recovery-details dt {
  color: var(--pc-muted);
}

.pc-recovery-details dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.pc-recovery-safety-note,
.pc-recovery-warning {
  padding: 10px;
  border-radius: min(var(--pc-control-radius), 8px);
  background: color-mix(in srgb, var(--pc-theme-accent) 10%, var(--pc-surface) 90%);
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-recovery-result-card {
  place-items: center;
  text-align: center;
}

.pc-recovery-result-card > i {
  color: var(--pc-theme-accent);
  font-size: 34px;
}

.pc-recovery-warning {
  color: var(--pc-danger);
}
</style>
