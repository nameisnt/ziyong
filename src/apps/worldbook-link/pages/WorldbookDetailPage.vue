<template>
  <section class="pc-worldbook-detail-page">
    <header class="pc-compact-toolbar pc-directory-toolbar pc-worldbook-detail-head">
      <div v-if="status" class="pc-worldbook-metrics">
        <span class="category">{{ categoryLabel }}</span>
        <span>{{ status.currentEntries.length }} {{ t`个条目` }}</span>
        <span>{{ status.enabledCount }} {{ t`个启用` }}</span>
        <span>{{
          status.profile ? `${status.profile.entries.filter(entry => entry.enabled).length} 个关联` : t`未关联`
        }}</span>
      </div>
      <ActionMenu icon-only :label="t`管理`" icon="fa-solid fa-bars">
        <button type="button" :disabled="busy" @click="entryGroupManagerOpen = true">
          <i class="fa-solid fa-folder-tree"></i><span>{{ t`管理条目分组` }}</span>
        </button>
        <button type="button" :disabled="busy" @click="$emit('create-entry-group')">
          <i class="fa-solid fa-folder-plus"></i><span>{{ t`新建条目分组` }}</span>
        </button>
        <button type="button" :disabled="busy" @click="$emit('rename-book')">
          <i class="fa-solid fa-pen"></i><span>{{ t`修改书名` }}</span>
        </button>
        <button type="button" :disabled="busy || !visibleEntryCount" @click="$emit('start-bulk')">
          <i class="fa-solid fa-masks-theater"></i><span>{{ t`批量转为小剧场类型` }}</span>
        </button>
      </ActionMenu>
    </header>

    <BulkSelectionBar
      v-if="bulkActive"
      action-icon="fa-solid fa-masks-theater"
      :action-label="t`转为小剧场`"
      :all-selected="bulkAllSelected"
      :empty-label="t`请选择要转换的条目`"
      :selected-count="bulkSelectedCount"
      :total-count="visibleEntryCount"
      @apply="$emit('convert-selected')"
      @cancel="$emit('cancel-bulk')"
      @toggle-all="$emit('toggle-all')"
    />

    <label class="pc-search-field pc-worldbook-search">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input v-model="query" type="search" :placeholder="t`搜索条目名称`" />
    </label>

    <article v-if="status" class="pc-page-section pc-worldbook-link-bar">
      <div class="pc-worldbook-link-main">
        <strong>{{ t`聊天联动` }}</strong>
        <span :class="{ linked: status.profile }">{{ linkStateLabel }}</span>
      </div>
      <div class="pc-worldbook-link-actions">
        <template v-if="status.profile">
          <button
            class="pc-icon-btn"
            type="button"
            :aria-label="t`应用聊天配置`"
            :disabled="busy"
            :title="t`应用聊天配置`"
            @click="$emit('apply-profile')"
          >
            <i class="fa-solid fa-play"></i>
          </button>
          <button
            class="pc-icon-btn"
            type="button"
            :aria-label="t`以当前状态更新配置`"
            :disabled="busy"
            :title="t`以当前状态更新配置`"
            @click="$emit('capture-profile')"
          >
            <i class="fa-solid fa-floppy-disk"></i>
          </button>
          <button
            class="pc-icon-btn danger"
            type="button"
            :aria-label="t`停止联动`"
            :disabled="busy"
            :title="t`停止联动`"
            @click="$emit('unlink')"
          >
            <i class="fa-solid fa-link-slash"></i>
          </button>
        </template>
        <button
          v-else
          class="pc-soft-btn pc-worldbook-link-create"
          type="button"
          :disabled="busy"
          @click="$emit('capture-profile')"
        >
          <i class="fa-solid fa-link"></i><span>{{ t`关联` }}</span>
        </button>
      </div>
      <small v-if="status.profile && !status.matchesCurrent">{{ t`当前状态与配置不同` }}</small>
      <small v-if="status.missingCount">{{ status.missingCount }} {{ t`个配置条目已不存在` }}</small>
    </article>

    <template v-if="status">
      <section v-for="section in sections" :key="section.id" class="pc-worldbook-group">
        <header class="pc-worldbook-group-head">
          <strong>{{ section.label }}</strong
          ><span>{{ section.entries.length }}</span>
        </header>
        <div v-if="section.entries.length" class="pc-directory-list pc-worldbook-entry-list">
          <article
            v-for="entry in section.entries"
            :key="entry.uid"
            class="pc-list-row pc-worldbook-entry"
            :class="{ disabled: !entry.enabled, selecting: bulkActive }"
          >
            <BulkSelectionCheckbox
              v-if="bulkActive"
              :label="`选择${entry.name || `条目 #${entry.uid}`}`"
              :model-value="bulkSelectedUids.has(entry.uid)"
              @update:model-value="$emit('set-selected', entry.uid, $event)"
            />
            <button
              class="pc-worldbook-entry-open"
              type="button"
              @click="bulkActive ? $emit('toggle-selected', entry.uid) : $emit('open-entry', entry)"
            >
              <span
                :class="['pc-worldbook-entry-lamp', entry.strategy.type === 'selective' ? 'green' : 'blue']"
                aria-hidden="true"
              ></span>
              <span class="pc-worldbook-entry-copy">
                <strong :title="entry.name || `条目 #${entry.uid}`">{{ entry.name || `条目 #${entry.uid}` }}</strong>
                <small>{{ entryPositionSummary(entry) }}</small>
              </span>
              <i v-if="!bulkActive" class="fa-solid fa-chevron-right pc-worldbook-chevron"></i>
            </button>
            <button
              v-if="!bulkActive"
              class="pc-icon-btn pc-worldbook-entry-group-btn"
              type="button"
              :aria-label="t`设置条目分组`"
              :disabled="entryBusyUids.has(entry.uid)"
              :title="t`设置条目分组`"
              @click="$emit('assign-entry-group', entry)"
            >
              <i class="fa-solid fa-folder"></i>
            </button>
            <button
              v-if="!bulkActive"
              class="pc-icon-btn pc-worldbook-entry-copy-btn"
              type="button"
              :aria-label="t`复制条目`"
              :disabled="entryBusyUids.has(entry.uid)"
              :title="t`复制条目`"
              @click="$emit('copy-entry', entry)"
            >
              <i class="fa-solid fa-copy"></i>
            </button>
            <label
              v-if="!bulkActive"
              class="pc-toggle pc-worldbook-toggle"
              :title="entry.enabled ? t`停用条目` : t`启用条目`"
              @click.stop
            >
              <input
                type="checkbox"
                :aria-label="entry.enabled ? t`停用条目` : t`启用条目`"
                :checked="entry.enabled"
                :disabled="entryBusyUids.has(entry.uid)"
                @change="$emit('toggle-entry', entry, $event)"
              />
              <span aria-hidden="true"></span>
            </label>
          </article>
        </div>
      </section>
      <EmptyState v-if="!visibleEntryCount" :title="query.trim() ? t`没有找到匹配的条目` : t`这本世界书没有条目`" />
    </template>
    <EmptyState v-else :title="t`正在读取世界书条目`" />

    <Teleport to="#tavern-phone-root .pc-phone-shell">
      <section
        v-if="entryGroupManagerOpen"
        class="pc-modal-backdrop pc-worldbook-group-manager-backdrop"
        role="presentation"
        @click.self="entryGroupManagerOpen = false"
      >
        <article
          ref="entryGroupManagerDialogRef"
          class="pc-section-card pc-modal-dialog pc-worldbook-group-manager-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="管理世界书条目分组"
          tabindex="-1"
        >
          <header class="pc-compact-toolbar pc-worldbook-group-manager-head">
            <strong>条目分组</strong>
            <div>
              <button
                class="pc-icon-btn primary"
                type="button"
                :disabled="busy"
                title="新建条目分组"
                aria-label="新建条目分组"
                @click="$emit('create-entry-group')"
              >
                <i class="fa-solid fa-folder-plus"></i>
              </button>
              <button
                class="pc-icon-btn"
                type="button"
                title="关闭"
                aria-label="关闭"
                @click="entryGroupManagerOpen = false"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </header>
          <div class="pc-worldbook-group-manager-body">
            <section v-for="group in entryGroups" :key="group.name" class="pc-worldbook-managed-group">
              <header>
                <strong>{{ group.name }}</strong>
                <small>{{ group.entries.length }} 个条目</small>
              </header>
              <div class="pc-worldbook-group-mode-row">
                <span class="pc-field-label">选择方式</span>
                <div class="pc-segment" aria-label="条目分组选择方式">
                  <button
                    :class="['pc-segment-btn', 'compact', { active: group.selectionMode === 'single' }]"
                    type="button"
                    :disabled="busy"
                    @click="requestGroupMode(group, 'single')"
                  >
                    单选
                  </button>
                  <button
                    :class="['pc-segment-btn', 'compact', { active: group.selectionMode === 'multiple' }]"
                    type="button"
                    :disabled="busy"
                    @click="requestGroupMode(group, 'multiple')"
                  >
                    复选
                  </button>
                </div>
              </div>
              <section v-if="singleSelectionGroupName === group.name" class="pc-worldbook-single-selection">
                <strong>保留一个已启用条目</strong>
                <label>
                  <input v-model="retainedEntryUid" type="radio" :value="null" />
                  <span>全部关闭</span>
                </label>
                <label v-for="entry in enabledGroupEntries(group)" :key="entry.uid">
                  <input v-model="retainedEntryUid" type="radio" :value="entry.uid" />
                  <span>{{ entry.name || `条目 #${entry.uid}` }}</span>
                </label>
                <div class="pc-form-actions">
                  <button class="pc-soft-btn" type="button" @click="cancelSingleSelection">取消</button>
                  <button class="pc-primary-btn" type="button" @click="confirmSingleSelection(group)">确定</button>
                </div>
              </section>
            </section>
            <EmptyState v-if="!entryGroups.length" title="还没有条目分组" />
          </div>
        </article>
      </section>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import ActionMenu from '@/components/ActionMenu.vue';
import BulkSelectionBar from '@/components/BulkSelectionBar.vue';
import BulkSelectionCheckbox from '@/components/BulkSelectionCheckbox.vue';
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneModalLifecycle } from '@/composables/usePhoneModalLifecycle';
import type { WorldbookEntryGroupSelectionMode } from '@/store/worldbookCatalogGroups';
import type { WorldbookLinkStatus } from '../store';

interface EntrySection {
  entries: WorldbookEntry[];
  id: string;
  label: string;
}

interface ManagedEntryGroup {
  entries: WorldbookEntry[];
  name: string;
  selectionMode: WorldbookEntryGroupSelectionMode;
}

defineProps<{
  bookName: string;
  bulkActive: boolean;
  bulkAllSelected: boolean;
  bulkSelectedCount: number;
  bulkSelectedUids: Set<number>;
  busy: boolean;
  categoryLabel: string;
  entryBusyUids: Set<number>;
  entryGroups: ManagedEntryGroup[];
  entryPositionSummary: (entry: WorldbookEntry) => string;
  linkStateLabel: string;
  sections: EntrySection[];
  status: WorldbookLinkStatus | null;
  visibleEntryCount: number;
}>();

const query = defineModel<string>('query', { required: true });

const emit = defineEmits<{
  'apply-profile': [];
  'assign-entry-group': [entry: WorldbookEntry];
  'cancel-bulk': [];
  'capture-profile': [];
  'convert-selected': [];
  'copy-entry': [entry: WorldbookEntry];
  'create-entry-group': [];
  'open-entry': [entry: WorldbookEntry];
  'rename-book': [];
  'set-selected': [uid: number, selected: boolean];
  'start-bulk': [];
  'toggle-all': [];
  'toggle-selected': [uid: number];
  'toggle-entry': [entry: WorldbookEntry, event: Event];
  'update-entry-group-mode': [groupName: string, mode: WorldbookEntryGroupSelectionMode, retainedUid?: number | null];
  unlink: [];
}>();

const entryGroupManagerOpen = ref(false);
const entryGroupManagerDialogRef = ref<HTMLElement | null>(null);
const retainedEntryUid = ref<number | null>(null);
const singleSelectionGroupName = ref('');

usePhoneModalLifecycle({
  dialogRef: entryGroupManagerDialogRef,
  isOpen: () => entryGroupManagerOpen.value,
  onClose: () => {
    entryGroupManagerOpen.value = false;
  },
});

function enabledGroupEntries(group: ManagedEntryGroup) {
  return group.entries.filter(entry => entry.enabled);
}

function requestGroupMode(group: ManagedEntryGroup, mode: WorldbookEntryGroupSelectionMode) {
  if (group.selectionMode === mode) return;
  const enabledEntries = enabledGroupEntries(group);
  if (mode === 'single' && enabledEntries.length > 1) {
    singleSelectionGroupName.value = group.name;
    retainedEntryUid.value = enabledEntries[0]?.uid ?? null;
    return;
  }
  emit('update-entry-group-mode', group.name, mode);
}

function cancelSingleSelection() {
  singleSelectionGroupName.value = '';
  retainedEntryUid.value = null;
}

function confirmSingleSelection(group: ManagedEntryGroup) {
  emit('update-entry-group-mode', group.name, 'single', retainedEntryUid.value);
  cancelSingleSelection();
}
</script>

<style scoped>
.pc-worldbook-detail-page,
.pc-worldbook-group {
  display: grid;
  min-height: 0;
  align-content: start;
  gap: 10px;
}

.pc-worldbook-detail-page {
  min-height: 100%;
  gap: 12px;
}

.pc-worldbook-entry-lamp {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 16%, transparent);
}

/* 业务状态色：酒馆无主关键词/常驻条目为蓝灯，有主关键词的触发条目为绿灯。 */
.pc-worldbook-entry-lamp.green {
  color: #27ae60;
  background: #27ae60;
}

.pc-worldbook-entry-lamp.blue {
  color: #2d9cdb;
  background: #2d9cdb;
}
.pc-worldbook-detail-head {
  min-width: 0;
  padding-bottom: 10px;
}
.pc-worldbook-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}
.pc-worldbook-metrics span {
  color: var(--pc-muted);
  font-size: 13px;
  white-space: nowrap;
}
.pc-worldbook-metrics span + span::before {
  margin: 0 7px;
  color: var(--pc-muted);
  content: '·';
}
.pc-worldbook-metrics .category {
  color: var(--pc-theme-accent);
  font-weight: 700;
}
.pc-worldbook-link-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px 10px;
  padding: 10px 0;
}
.pc-worldbook-link-main,
.pc-worldbook-link-actions,
.pc-worldbook-group-head {
  display: flex;
  align-items: center;
}
.pc-worldbook-link-main {
  min-width: 0;
  gap: 9px;
}
.pc-worldbook-link-main > span {
  color: var(--pc-muted);
  font-size: 13px;
}
.pc-worldbook-link-main > span.linked {
  color: var(--pc-theme-accent);
}
.pc-worldbook-link-actions {
  justify-content: flex-end;
  gap: 6px;
}
/* ui-reuse-allow: UI-WORLDBOOK-TOOLBAR-001 toolbar actions share its compact 32px row. */
.pc-worldbook-link-actions .pc-icon-btn {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
}
.pc-worldbook-link-create {
  min-height: 32px;
  padding: 6px 10px;
  font-size: 12px;
}
.pc-worldbook-link-bar > small {
  grid-column: 1 / -1;
  color: var(--pc-danger);
  font-size: 12px;
}
.pc-worldbook-group {
  gap: 8px;
}
.pc-worldbook-group + .pc-worldbook-group {
  margin-top: 4px;
}
.pc-worldbook-group-head {
  min-height: 28px;
  justify-content: space-between;
  padding: 0 4px;
}
.pc-worldbook-group-head strong {
  font-size: 15px;
}
.pc-worldbook-group-head span {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-worldbook-entry {
  grid-template-columns: minmax(0, 1fr) auto auto auto;
}
.pc-worldbook-entry.selecting {
  grid-template-columns: auto minmax(0, 1fr);
}
.pc-worldbook-entry-copy-btn,
.pc-worldbook-entry-group-btn {
  width: 34px;
  min-width: 34px;
  height: 34px;
  min-height: 34px;
}
.pc-worldbook-entry-open {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
  gap: 9px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}
.pc-worldbook-entry-open > i {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 11px;
}
.pc-worldbook-entry-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.pc-worldbook-entry-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-worldbook-entry-copy small,
.pc-worldbook-chevron {
  color: var(--pc-muted);
  font-size: 11px;
}
.pc-worldbook-entry.disabled .pc-worldbook-entry-copy strong {
  color: var(--pc-muted);
}
.pc-worldbook-group-manager-backdrop {
  --pc-modal-z: 72;
}
.pc-worldbook-group-manager-dialog {
  display: grid;
  width: min(100%, 390px);
  max-height: min(78%, 680px);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  overflow: hidden;
}
.pc-worldbook-group-manager-head,
.pc-worldbook-group-manager-head > div,
.pc-worldbook-managed-group > header,
.pc-worldbook-group-mode-row {
  display: flex;
  align-items: center;
}
.pc-worldbook-group-manager-head,
.pc-worldbook-managed-group > header,
.pc-worldbook-group-mode-row {
  justify-content: space-between;
}
.pc-worldbook-group-manager-head > div {
  gap: 6px;
}
.pc-worldbook-group-manager-body {
  min-height: 0;
  overflow-y: auto;
}
.pc-worldbook-managed-group {
  display: grid;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--pc-border);
}
.pc-worldbook-managed-group small {
  color: var(--pc-muted);
  font-size: 11px;
}
.pc-worldbook-group-mode-row {
  gap: 8px;
}
.pc-worldbook-group-mode-row .pc-segment {
  width: min(210px, 70%);
}
.pc-worldbook-single-selection {
  display: grid;
  gap: 7px;
  padding: 9px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-control-radius), 8px);
  background: var(--pc-surface);
}
.pc-worldbook-single-selection > label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.pc-worldbook-single-selection input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--pc-theme-accent);
}
.pc-worldbook-single-selection label span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
