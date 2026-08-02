<template>
  <section class="pc-entry-library-app">
    <section v-if="route.page === 'root'" class="pc-entry-library-page">
      <header class="pc-entry-library-head">
        <div>
          <span class="pc-kicker">{{ t`独立提示词副本` }}</span>
          <h2>{{ t`条目库` }}</h2>
        </div>
        <div class="pc-entry-library-head-actions">
          <button class="pc-icon-btn" type="button" :title="t`导入导出`" @click="openTransfer">
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
          </button>
          <button class="pc-icon-btn" type="button" :title="t`查重`" @click="openDedupe">
            <i class="fa-solid fa-clone"></i>
          </button>
          <button class="pc-icon-btn" type="button" :title="t`分组绑定`" @click="openBindings">
            <i class="fa-solid fa-link"></i>
          </button>
          <button class="pc-primary-btn compact" type="button" @click="openCollect">
            <i class="fa-solid fa-plus"></i>
            <span>{{ t`收藏` }}</span>
          </button>
        </div>
      </header>

      <div class="pc-entry-library-create">
        <input
          v-model="newGroupName"
          class="pc-field"
          type="text"
          :placeholder="t`新分组名称`"
          @keyup.enter="createGroup"
        />
        <button class="pc-primary-btn" type="button" :disabled="!newGroupName.trim()" @click="createGroup">
          {{ t`新建` }}
        </button>
      </div>

      <label v-if="items.length" class="pc-entry-library-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="libraryQuery" class="pc-field" type="search" :placeholder="t`搜索收藏名称或内容`" />
      </label>

      <div v-if="visibleGroups.length" class="pc-entry-library-groups">
        <section v-for="group in visibleGroups" :key="group.id" class="pc-entry-library-group">
          <header class="pc-entry-library-group-head">
            <button class="pc-entry-library-group-toggle" type="button" @click="toggleGroupOpen(group.id)">
              <i class="fa-solid fa-chevron-right" :class="{ expanded: isGroupOpen(group.id) }"></i>
              <span>
                <strong>{{ group.name }}</strong>
                <small>{{ visibleGroupItems(group.id).length }} 条</small>
              </span>
            </button>
            <div class="pc-entry-library-group-actions">
              <label class="pc-toggle" :title="groupEnableState(group.id) === 'all' ? t`全部停用` : t`全部启用`">
                <input
                  type="checkbox"
                  :checked="groupEnableState(group.id) === 'all'"
                  :disabled="!library.getGroupItems(group.id).length"
                  :indeterminate="groupEnableState(group.id) === 'mixed'"
                  :aria-label="groupEnableState(group.id) === 'all' ? t`全部停用` : t`全部启用`"
                  @change="library.setGroupItemsEnabled(group.id, ($event.target as HTMLInputElement).checked)"
                />
                <span aria-hidden="true"></span>
              </label>
              <button class="pc-icon-btn danger" type="button" :title="t`删除分组`" @click="deleteGroup(group.id)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </header>

          <div
            v-if="isGroupOpen(group.id)"
            class="pc-entry-library-items"
            :class="{
              'drop-at-end': itemDrag.isDragging && itemDrag.groupId === group.id && !itemDrag.insertBeforeItemId,
            }"
          >
            <article
              v-for="item in visibleGroupItems(group.id)"
              :key="item.id"
              class="pc-section-card pc-entry-library-item"
              :class="{
                disabled: !item.enabled,
                dragging: itemDrag.isDragging && itemDrag.itemId === item.id,
                'drop-before': itemDrag.isDragging && itemDrag.insertBeforeItemId === item.id,
              }"
              :data-entry-group-id="group.id"
              :data-entry-item-id="item.id"
              @pointerdown="onItemPointerDown($event, item.id, group.id)"
              @pointermove="onItemPointerMove"
              @pointerup="onItemPointerUp"
              @pointercancel="onItemPointerCancel"
            >
              <button
                class="pc-icon-btn pc-entry-drag-handle"
                type="button"
                :disabled="Boolean(libraryQuery.trim())"
                :title="libraryQuery.trim() ? t`清除搜索后排序` : t`拖拽排序`"
                @click.prevent
              >
                <i class="fa-solid fa-grip-lines"></i>
              </button>
              <button class="pc-entry-library-item-main" type="button" @click="openEditor(item.id)">
                <strong>{{ item.title }}</strong>
              </button>
              <div class="pc-entry-library-item-actions">
                <label class="pc-toggle" :title="item.enabled ? t`停用条目` : t`启用条目`">
                  <input
                    type="checkbox"
                    :checked="item.enabled"
                    :aria-label="item.enabled ? t`停用条目` : t`启用条目`"
                    @change="library.updateItem(item.id, { enabled: ($event.target as HTMLInputElement).checked })"
                  />
                  <span aria-hidden="true"></span>
                </label>
                <button class="pc-icon-btn danger" type="button" :title="t`删除`" @click="deleteItem(item.id)">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </article>
            <EmptyState v-if="!visibleGroupItems(group.id).length" compact :title="t`这个分组没有匹配的条目`" />
          </div>
        </section>
      </div>
      <EmptyState v-else :title="libraryQuery.trim() ? t`没有找到匹配的收藏` : t`还没有收藏条目`">
        <p>{{ t`可以从预设或世界书中批量复制条目到独立收藏库。` }}</p>
      </EmptyState>
    </section>

    <section v-else-if="route.page === 'transfer'" class="pc-entry-library-page">
      <article class="pc-editor-card pc-entry-transfer-card">
        <div>
          <strong>{{ t`导出条目库` }}</strong>
          <small>{{ groups.length }} 个分组 · {{ items.length }} 条收藏 · {{ bindings.length }} 条绑定</small>
        </div>
        <button class="pc-primary-btn" type="button" @click="exportLibrary">
          <i class="fa-solid fa-download"></i>
          {{ t`导出 JSON` }}
        </button>
      </article>

      <article class="pc-editor-card pc-entry-transfer-card">
        <div>
          <strong>{{ t`导入条目库` }}</strong>
          <small>{{ t`合并会保留当前内容，覆盖会替换整个条目库。` }}</small>
        </div>
        <div class="pc-segment">
          <button
            :class="['pc-segment-btn', { active: importMode === 'merge' }]"
            type="button"
            @click="importMode = 'merge'"
          >
            {{ t`合并` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: importMode === 'replace' }]"
            type="button"
            @click="importMode = 'replace'"
          >
            {{ t`覆盖` }}
          </button>
        </div>
        <input ref="importFileField" class="pc-hidden-input" type="file" accept="application/json,.json" @change="importLibrary" />
        <button class="pc-soft-btn" type="button" @click="importFileField?.click()">
          <i class="fa-solid fa-upload"></i>
          {{ t`选择 JSON 文件` }}
        </button>
      </article>
    </section>

    <section v-else-if="route.page === 'collect'" class="pc-entry-library-page pc-entry-library-collect-page">
      <div class="pc-entry-library-collect-scroll">
        <div class="pc-segment">
          <button
            :class="['pc-segment-btn', { active: sourceType === 'preset' }]"
            type="button"
            @click="setSourceType('preset')"
          >
            {{ t`预设` }}
          </button>
          <button
            :class="['pc-segment-btn', { active: sourceType === 'worldbook' }]"
            type="button"
            @click="setSourceType('worldbook')"
          >
            {{ t`世界书` }}
          </button>
        </div>

        <label class="pc-field-group">
          <span>{{ sourceType === 'preset' ? t`选择预设` : t`选择世界书` }}</span>
          <select v-model="selectedSourceName" class="pc-select" @change="loadSourceEntries">
            <option value="">{{ t`请选择来源` }}</option>
            <option v-for="name in sourceNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>

        <label class="pc-field-group">
          <span>{{ t`收藏到分组` }}</span>
          <select v-model="collectGroupId" class="pc-select">
            <option value="">{{ t`请选择分组` }}</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>

        <label class="pc-entry-library-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="sourceQuery" class="pc-field" type="search" :placeholder="t`搜索条目名称或内容`" />
        </label>

        <div class="pc-entry-library-select-actions">
          <span>{{ t`已选` }} {{ visibleSelectedSourceCount }} / {{ filteredSourceEntries.length }}</span>
          <div>
            <button class="pc-soft-btn compact" type="button" @click="selectAllSources">{{ t`全选` }}</button>
            <button class="pc-soft-btn compact" type="button" @click="invertSourceSelection">{{ t`反选` }}</button>
            <button class="pc-soft-btn compact" type="button" @click="clearSourceSelection">{{ t`清空` }}</button>
          </div>
        </div>

        <div class="pc-entry-library-source-list">
          <label v-for="entry in filteredSourceEntries" :key="entry.key" class="pc-section-card pc-entry-source-row">
            <input
              type="checkbox"
              :checked="selectedSourceKeys.has(entry.key)"
              @change="toggleSourceEntry(entry.key)"
            />
            <span>
              <strong>{{ entry.title }}</strong>
              <small>{{ compactContent(entry.content) }}</small>
            </span>
          </label>
          <EmptyState v-if="!sourceLoading && !filteredSourceEntries.length" compact :title="t`没有可收藏的条目`" />
          <EmptyState v-else-if="sourceLoading" compact :title="t`正在读取条目`" />
        </div>
      </div>

      <footer class="pc-entry-library-collect-footer">
        <div>
          <strong>{{ selectedSourceKeys.size ? `${selectedSourceKeys.size} 条` : t`尚未选择` }}</strong>
          <small>{{ collectGroupName ? `收藏到「${collectGroupName}」` : t`请选择收藏分组` }}</small>
        </div>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="!collectGroupId || !selectedSourceKeys.size"
          @click="collectSelected"
        >
          <i class="fa-solid fa-bookmark"></i>
          {{ t`收藏所选` }}
        </button>
      </footer>
    </section>

    <section v-else-if="route.page === 'dedupe'" class="pc-entry-library-page">
      <article class="pc-section-card pc-entry-dedupe-summary">
        <strong>{{ t`80% 内容相似查重` }}</strong>
        <span>{{ duplicatePairs.length }} 组疑似重复</span>
      </article>
      <article v-for="pair in duplicatePairs" :key="pairKey(pair)" class="pc-section-card pc-entry-duplicate-pair">
        <header>
          <strong>{{ Math.round(pair.score * 100) }}%</strong>
          <button class="pc-icon-btn" type="button" :title="t`保留两条`" @click="dismissPair(pair)">
            <i class="fa-solid fa-check"></i>
          </button>
        </header>
        <div class="pc-entry-duplicate-columns">
          <section>
            <strong>{{ pair.left.title }}</strong>
            <p>{{ compactContent(pair.left.content, 180) }}</p>
            <button class="pc-soft-btn danger compact" type="button" @click="deleteDuplicate(pair.left.id)">
              {{ t`删除这条收藏` }}
            </button>
          </section>
          <section>
            <strong>{{ pair.right.title }}</strong>
            <p>{{ compactContent(pair.right.content, 180) }}</p>
            <button class="pc-soft-btn danger compact" type="button" @click="deleteDuplicate(pair.right.id)">
              {{ t`删除这条收藏` }}
            </button>
          </section>
        </div>
      </article>
      <EmptyState v-if="!duplicatePairs.length" :title="t`没有发现超过 80% 的重复内容`" />
    </section>

    <section v-else-if="route.page === 'bindings'" class="pc-entry-library-page">
      <article class="pc-editor-card pc-entry-binding-editor">
        <label class="pc-field-group">
          <span>{{ t`目标预设` }}</span>
          <select v-model="bindingPresetName" class="pc-select" @change="loadBindingPrompts">
            <option value="">{{ t`请选择预设` }}</option>
            <option v-for="name in presetNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <label class="pc-field-group">
          <span>{{ t`目标预设条目` }}</span>
          <select v-model="bindingPromptKey" class="pc-select" @change="loadBindingPromptContent">
            <option value="">{{ t`请选择条目` }}</option>
            <option v-for="prompt in bindingPrompts" :key="prompt.key" :value="prompt.key" :disabled="prompt.bound">
              {{ prompt.title }}
            </option>
          </select>
        </label>
        <label class="pc-field-group">
          <span>{{ t`收藏分组` }}</span>
          <select v-model="bindingGroupId" class="pc-select">
            <option value="">{{ t`请选择分组` }}</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>
        <label class="pc-field-group pc-entry-binding-template">
          <span>
            <span>{{ t`绑定内容` }}</span>
            <button class="pc-soft-btn compact" type="button" @click.prevent="insertBindingPlaceholder">
              {{ t`插入占位符` }}
            </button>
          </span>
          <textarea
            ref="bindingTemplateField"
            v-model="bindingContentTemplate"
            class="pc-area compact"
            rows="5"
            :placeholder="`<a>${ENTRY_LIBRARY_CONTENT_PLACEHOLDER}</a>`"
          ></textarea>
        </label>
        <div class="pc-form-actions">
          <button
            class="pc-primary-btn"
            type="button"
            :disabled="
              bindingSaving ||
              !bindingPresetName ||
              !bindingPromptKey ||
              !bindingGroupId ||
              !bindingContentTemplate.includes(ENTRY_LIBRARY_CONTENT_PLACEHOLDER)
            "
            @click="createBinding"
          >
            {{ bindingSaving ? t`同步中` : t`创建绑定` }}
          </button>
        </div>
      </article>

      <div class="pc-entry-binding-list">
        <article v-for="binding in bindings" :key="binding.id" class="pc-section-card pc-entry-binding-row">
          <div>
            <strong>{{ binding.targetPromptName }}</strong>
            <small> {{ binding.presetName }} · {{ library.getGroup(binding.groupId)?.name || t`分组已删除` }} </small>
            <small>{{ compactContent(binding.contentTemplate, 80) }}</small>
          </div>
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="syncingBindingIds.includes(binding.id)"
            :title="t`立即同步`"
            @click="syncBinding(binding.id)"
          >
            <i class="fa-solid fa-rotate"></i>
          </button>
          <button class="pc-icon-btn danger" type="button" :title="t`删除绑定`" @click="deleteBinding(binding.id)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </article>
        <EmptyState v-if="!bindings.length" compact :title="t`还没有分组绑定`" />
      </div>
    </section>

    <section v-else-if="route.page === 'edit' && editingItem" class="pc-entry-library-page">
      <article class="pc-editor-card pc-entry-item-editor">
        <label class="pc-field-group">
          <span>{{ t`名称` }}</span>
          <input v-model="editTitle" class="pc-field" type="text" />
        </label>
        <label class="pc-field-group">
          <span>{{ t`分组` }}</span>
          <select v-model="editGroupId" class="pc-select">
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>
        <label class="pc-field-group">
          <span>{{ t`顺序` }}</span>
          <input v-model.number="editOrder" class="pc-field" type="number" min="1" :max="editOrderMax" />
        </label>
        <label class="pc-field-group pc-entry-content-field">
          <span>{{ t`内容` }}</span>
          <textarea v-model="editContent" class="pc-area"></textarea>
        </label>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" @click="phone.goBack()">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="saveEditor">{{ t`保存` }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { isCollectablePresetPrompt } from './api';
import { ENTRY_LIBRARY_CONTENT_PLACEHOLDER, useEntryLibraryStore, type DuplicateEntryPair } from './store';
import { listTavernPresets, readTavernPreset, type TavernPresetPrompt } from '@/apps/preset-manager/api';
import { getWorldbookEntries } from '@/apps/worldbook-link/api';
import { usePhoneStore } from '@/store/phone';
import { getOptionalGlobalFunction } from '@/util/runtime';
import { storeToRefs } from 'pinia';

type SourceEntry = {
  content: string;
  key: string;
  role?: 'assistant' | 'system' | 'user';
  sourceEntryId: string;
  title: string;
};

type BindingPromptOption = {
  bound: boolean;
  content: string;
  id: string;
  key: string;
  source: 'prompts' | 'prompts_unused';
  title: string;
};

const phone = usePhoneStore();
const library = useEntryLibraryStore();
const { bindings, groups, items, syncingBindingIds } = storeToRefs(library);
const route = computed(() => phone.currentRoute);
const newGroupName = ref('');
const libraryQuery = ref('');
const openGroupIds = ref<string[]>([]);
const sourceType = ref<'preset' | 'worldbook'>('preset');
const sourceNames = ref<string[]>([]);
const selectedSourceName = ref('');
const sourceEntries = ref<SourceEntry[]>([]);
const sourceQuery = ref('');
const sourceLoading = ref(false);
const selectedSourceKeys = ref(new Set<string>());
const collectGroupId = ref('');
const dismissedPairKeys = ref<string[]>([]);
const presetNames = ref<string[]>([]);
const bindingPresetName = ref('');
const bindingPromptKey = ref('');
const bindingGroupId = ref('');
const bindingContentTemplate = ref('');
const bindingPrompts = ref<BindingPromptOption[]>([]);
const bindingSaving = ref(false);
const bindingTemplateField = ref<HTMLTextAreaElement | null>(null);
const editTitle = ref('');
const editContent = ref('');
const editGroupId = ref('');
const editOrder = ref(1);
const importMode = ref<'merge' | 'replace'>('merge');
const importFileField = ref<HTMLInputElement | null>(null);
const suppressItemOpenUntil = ref(0);
const itemDrag = reactive({
  groupId: '',
  insertBeforeItemId: '',
  isDragging: false,
  itemId: '',
  longPressReady: false,
  pointerId: -1,
  startX: 0,
  startY: 0,
});
let itemDragLongPressTimer: number | null = null;

const editingItem = computed(() => library.getItem(route.value.params?.itemId || ''));
const editOrderMax = computed(() => {
  const count = library.getGroupItems(editGroupId.value).length;
  const editingInTargetGroup = editingItem.value?.groupId === editGroupId.value;
  return Math.max(1, count + (editingInTargetGroup ? 0 : 1));
});
const visibleGroups = computed(() => {
  const keyword = libraryQuery.value.trim().toLocaleLowerCase();
  if (!keyword) return groups.value;
  return groups.value.filter(group => visibleGroupItems(group.id).length);
});
const filteredSourceEntries = computed(() => {
  const keyword = sourceQuery.value.trim().toLocaleLowerCase();
  if (!keyword) return sourceEntries.value;
  return sourceEntries.value.filter(entry => `${entry.title}\n${entry.content}`.toLocaleLowerCase().includes(keyword));
});
const visibleSelectedSourceCount = computed(
  () => filteredSourceEntries.value.filter(entry => selectedSourceKeys.value.has(entry.key)).length,
);
const collectGroupName = computed(() => library.getGroup(collectGroupId.value)?.name ?? '');
const duplicatePairs = computed(() =>
  library.findDuplicates(0.8).filter(pair => !dismissedPairKeys.value.includes(pairKey(pair))),
);

function compactContent(content: string, max = 96) {
  const compact = content.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function visibleGroupItems(groupId: string) {
  const keyword = libraryQuery.value.trim().toLocaleLowerCase();
  const groupItems = library.getGroupItems(groupId);
  if (!keyword) return groupItems;
  return groupItems.filter(item => `${item.title}\n${item.content}`.toLocaleLowerCase().includes(keyword));
}

function groupEnableState(groupId: string) {
  const groupItems = library.getGroupItems(groupId);
  if (!groupItems.length || groupItems.every(item => !item.enabled)) return 'none';
  if (groupItems.every(item => item.enabled)) return 'all';
  return 'mixed';
}

function isGroupOpen(groupId: string) {
  return openGroupIds.value.includes(groupId);
}

function toggleGroupOpen(groupId: string) {
  openGroupIds.value = isGroupOpen(groupId)
    ? openGroupIds.value.filter(id => id !== groupId)
    : [...openGroupIds.value, groupId];
}

function createGroup() {
  if (!newGroupName.value.trim()) return;
  const group = library.createGroup(newGroupName.value);
  newGroupName.value = '';
  openGroupIds.value = [...new Set([...openGroupIds.value, group.id])];
}

async function deleteGroup(groupId: string) {
  const group = library.getGroup(groupId);
  if (!group) return;
  const confirmed = await phone.confirmNotice(`删除分组“${group.name}”及其中所有收藏？相关预设绑定也会删除。`, {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除收藏分组',
  });
  if (confirmed) library.deleteGroup(groupId);
}

async function deleteItem(itemId: string) {
  const item = library.getItem(itemId);
  if (!item) return;
  const confirmed = await phone.confirmNotice(`删除收藏“${item.title}”？原始预设或世界书条目不会被删除。`, {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除收藏',
  });
  if (confirmed) library.deleteItem(itemId);
}

function openCollect() {
  phone.pushPage('collect', '收藏条目');
}

function openDedupe() {
  dismissedPairKeys.value = [];
  phone.pushPage('dedupe', '收藏查重');
}

function openBindings() {
  phone.pushPage('bindings', '分组绑定');
}

function openTransfer() {
  phone.pushPage('transfer', '导入导出');
}

function exportLibrary() {
  const payload = {
    data: library.exportBackup(),
    exportedAt: new Date().toISOString(),
    kind: 'tavern-phone-entry-library',
    version: 1,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `条目库-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function importLibrary(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as unknown;
    const record = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    const data = record?.kind === 'tavern-phone-entry-library' ? record.data : parsed;
    if (importMode.value === 'replace') {
      const confirmed = await phone.confirmNotice('覆盖导入会替换当前所有条目库分组、收藏和绑定，确定继续？', {
        confirmLabel: '覆盖导入',
        kind: 'warning',
        title: '覆盖条目库',
      });
      if (!confirmed) return;
      library.importBackup(data);
      toastr.success('已覆盖导入条目库');
    } else {
      const result = library.mergeBackup(data);
      const skipped = result.skippedBindings ? `，跳过 ${result.skippedBindings} 条重复绑定` : '';
      toastr.success(`已导入 ${result.groups} 个分组、${result.items} 条收藏、${result.bindings} 条绑定${skipped}`);
    }
    openGroupIds.value = groups.value[0] ? [groups.value[0].id] : [];
  } catch (error) {
    toastr.error(`导入失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

function openEditor(itemId: string) {
  if (Date.now() < suppressItemOpenUntil.value) return;
  phone.pushPage('edit', '编辑收藏', { itemId });
}

function clearItemDragLongPressTimer() {
  if (itemDragLongPressTimer === null) return;
  window.clearTimeout(itemDragLongPressTimer);
  itemDragLongPressTimer = null;
}

function resetItemDrag() {
  clearItemDragLongPressTimer();
  itemDrag.groupId = '';
  itemDrag.insertBeforeItemId = '';
  itemDrag.isDragging = false;
  itemDrag.itemId = '';
  itemDrag.longPressReady = false;
  itemDrag.pointerId = -1;
  itemDrag.startX = 0;
  itemDrag.startY = 0;
}

function onItemPointerDown(event: PointerEvent, itemId: string, groupId: string) {
  if (event.button !== 0 || libraryQuery.value.trim()) return;
  const target = event.target;
  if (target instanceof Element && target.closest('.pc-entry-library-item-actions')) return;
  resetItemDrag();
  itemDrag.groupId = groupId;
  itemDrag.itemId = itemId;
  itemDrag.pointerId = event.pointerId;
  itemDrag.startX = event.clientX;
  itemDrag.startY = event.clientY;
  itemDrag.longPressReady = target instanceof Element && Boolean(target.closest('.pc-entry-drag-handle'));
  if (!itemDrag.longPressReady) {
    itemDragLongPressTimer = window.setTimeout(() => {
      itemDrag.longPressReady = true;
      itemDragLongPressTimer = null;
    }, 320);
  }
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function updateItemDragInsertion(clientY: number) {
  const rows = Array.from(
    document.querySelectorAll<HTMLElement>(
      `.pc-entry-library-item[data-entry-group-id="${CSS.escape(itemDrag.groupId)}"]`,
    ),
  ).filter(row => row.dataset.entryItemId !== itemDrag.itemId);
  const beforeRow = rows.find(row => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  itemDrag.insertBeforeItemId = beforeRow?.dataset.entryItemId || '';
}

function autoScrollItemList(clientY: number) {
  const screen = document.querySelector<HTMLElement>('#tavern-phone-root .pc-screen');
  if (!screen) return;
  const rect = screen.getBoundingClientRect();
  const edge = 52;
  if (clientY < rect.top + edge) screen.scrollTop -= 14;
  else if (clientY > rect.bottom - edge) screen.scrollTop += 14;
}

function onItemPointerMove(event: PointerEvent) {
  if (event.pointerId !== itemDrag.pointerId || !itemDrag.itemId) return;
  const distance = Math.hypot(event.clientX - itemDrag.startX, event.clientY - itemDrag.startY);
  if (!itemDrag.longPressReady) {
    if (distance > 8) resetItemDrag();
    return;
  }
  if (!itemDrag.isDragging && distance > 4) {
    itemDrag.isDragging = true;
    suppressItemOpenUntil.value = Date.now() + 400;
  }
  if (!itemDrag.isDragging) return;
  event.preventDefault();
  autoScrollItemList(event.clientY);
  updateItemDragInsertion(event.clientY);
}

function commitItemDrag() {
  if (!itemDrag.isDragging || !itemDrag.itemId || !itemDrag.groupId) return;
  const nextIds = library
    .getGroupItems(itemDrag.groupId)
    .map(item => item.id)
    .filter(id => id !== itemDrag.itemId);
  const insertIndex = itemDrag.insertBeforeItemId
    ? Math.max(0, nextIds.indexOf(itemDrag.insertBeforeItemId))
    : nextIds.length;
  nextIds.splice(insertIndex, 0, itemDrag.itemId);
  library.reorderGroupItems(itemDrag.groupId, nextIds);
}

function onItemPointerUp(event: PointerEvent) {
  if (event.pointerId !== itemDrag.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  if (itemDrag.longPressReady || itemDrag.isDragging) {
    suppressItemOpenUntil.value = Date.now() + 300;
  }
  commitItemDrag();
  resetItemDrag();
}

function onItemPointerCancel(event: PointerEvent) {
  if (event.pointerId !== itemDrag.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  resetItemDrag();
}

function refreshSourceNames() {
  sourceNames.value =
    sourceType.value === 'preset'
      ? listTavernPresets()
      : (getOptionalGlobalFunction<() => string[]>('getWorldbookNames')?.() ?? [])
          .slice()
          .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function setSourceType(type: 'preset' | 'worldbook') {
  sourceType.value = type;
  selectedSourceName.value = '';
  sourceEntries.value = [];
  selectedSourceKeys.value = new Set();
  refreshSourceNames();
}

async function loadSourceEntries() {
  selectedSourceKeys.value = new Set();
  sourceEntries.value = [];
  if (!selectedSourceName.value) return;
  sourceLoading.value = true;
  try {
    if (sourceType.value === 'preset') {
      const preset = readTavernPreset(selectedSourceName.value);
      const entries: SourceEntry[] = [];
      const append = (source: 'prompts' | 'prompts_unused', prompt: TavernPresetPrompt, index: number) => {
        if (!isCollectablePresetPrompt(prompt) || !prompt.content?.trim()) return;
        entries.push({
          content: prompt.content,
          key: `${source}:${prompt.id}:${index}`,
          role: prompt.role,
          sourceEntryId: `${source}:${prompt.id}`,
          title: prompt.name || prompt.id,
        });
      };
      preset.prompts.forEach((prompt, index) => append('prompts', prompt, index));
      (preset.prompts_unused ?? []).forEach((prompt, index) => append('prompts_unused', prompt, index));
      sourceEntries.value = entries;
    } else {
      sourceEntries.value = (await getWorldbookEntries(selectedSourceName.value))
        .filter(entry => entry.content.trim())
        .map(entry => ({
          content: entry.content,
          key: String(entry.uid),
          sourceEntryId: String(entry.uid),
          title: entry.name || `条目 #${entry.uid}`,
        }));
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    sourceLoading.value = false;
  }
}

function toggleSourceEntry(key: string) {
  const next = new Set(selectedSourceKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selectedSourceKeys.value = next;
}

function selectAllSources() {
  const next = new Set(selectedSourceKeys.value);
  filteredSourceEntries.value.forEach(entry => next.add(entry.key));
  selectedSourceKeys.value = next;
}

function invertSourceSelection() {
  const next = new Set(selectedSourceKeys.value);
  filteredSourceEntries.value.forEach(entry => {
    if (next.has(entry.key)) next.delete(entry.key);
    else next.add(entry.key);
  });
  selectedSourceKeys.value = next;
}

function clearSourceSelection() {
  selectedSourceKeys.value = new Set();
}

async function collectSelected() {
  const selected = sourceEntries.value.filter(entry => selectedSourceKeys.value.has(entry.key));
  const collected = library.collectItems(
    collectGroupId.value,
    selected.map(entry => ({
      content: entry.content,
      sourceEntryId: entry.sourceEntryId,
      sourceName: selectedSourceName.value,
      sourceRole: entry.role,
      sourceType: sourceType.value,
      title: entry.title,
    })),
  );
  toastr.success(`已收藏 ${collected.length} 条`);
  selectedSourceKeys.value = new Set();
  await phone.goBack();
}

function pairKey(pair: DuplicateEntryPair) {
  return [pair.left.id, pair.right.id].sort().join(':');
}

function dismissPair(pair: DuplicateEntryPair) {
  dismissedPairKeys.value = [...dismissedPairKeys.value, pairKey(pair)];
}

function deleteDuplicate(itemId: string) {
  library.deleteItem(itemId);
}

function loadBindingPrompts() {
  bindingPromptKey.value = '';
  bindingContentTemplate.value = '';
  bindingPrompts.value = [];
  if (!bindingPresetName.value) return;
  try {
    const preset = readTavernPreset(bindingPresetName.value);
    const options: BindingPromptOption[] = [];
    const append = (source: 'prompts' | 'prompts_unused', prompt: TavernPresetPrompt, index: number) => {
      if (!isCollectablePresetPrompt(prompt)) return;
      const bound = bindings.value.some(
        binding =>
          binding.presetName === bindingPresetName.value &&
          binding.targetPromptSource === source &&
          binding.targetPromptId === prompt.id,
      );
      options.push({
        bound,
        content: prompt.content ?? '',
        id: prompt.id,
        key: `${source}:${index}`,
        source,
        title: `${source === 'prompts' ? '已使用' : '未使用'} · ${prompt.name || prompt.id}${bound ? ' · 已绑定' : ''}`,
      });
    };
    preset.prompts.forEach((prompt, index) => append('prompts', prompt, index));
    (preset.prompts_unused ?? []).forEach((prompt, index) => append('prompts_unused', prompt, index));
    bindingPrompts.value = options;
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

function loadBindingPromptContent() {
  const prompt = bindingPrompts.value.find(item => item.key === bindingPromptKey.value);
  bindingContentTemplate.value = prompt && !prompt.bound ? prompt.content : '';
}

async function insertBindingPlaceholder() {
  const field = bindingTemplateField.value;
  const cursor = field?.selectionEnd ?? bindingContentTemplate.value.length;
  bindingContentTemplate.value = `${bindingContentTemplate.value.slice(0, cursor)}${ENTRY_LIBRARY_CONTENT_PLACEHOLDER}${bindingContentTemplate.value.slice(cursor)}`;
  await nextTick();
  field?.focus();
  const caret = cursor + ENTRY_LIBRARY_CONTENT_PLACEHOLDER.length;
  field?.setSelectionRange(caret, caret);
}

async function createBinding() {
  const prompt = bindingPrompts.value.find(item => item.key === bindingPromptKey.value);
  if (!prompt) return;
  bindingSaving.value = true;
  try {
    await library.createBinding({
      groupId: bindingGroupId.value,
      presetName: bindingPresetName.value,
      targetPromptId: prompt.id,
      targetPromptName: prompt.title.replace(/^(已使用|未使用) · /, ''),
      targetPromptSource: prompt.source,
      contentTemplate: bindingContentTemplate.value,
    });
    toastr.success('已创建绑定并同步预设条目');
    loadBindingPrompts();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    bindingSaving.value = false;
  }
}

async function syncBinding(bindingId: string) {
  try {
    await library.syncBinding(bindingId);
    toastr.success('已同步收藏分组');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function deleteBinding(bindingId: string) {
  const confirmed = await phone.confirmNotice('删除这条分组绑定？预设条目会保留最后一次同步的内容。', {
    confirmLabel: '删除',
    kind: 'warning',
    title: '删除分组绑定',
  });
  if (confirmed) {
    library.deleteBinding(bindingId);
    loadBindingPrompts();
  }
}

function saveEditor() {
  if (!editingItem.value) return;
  library.updateItem(editingItem.value.id, {
    content: editContent.value,
    groupId: editGroupId.value,
    order: editOrder.value,
    title: editTitle.value,
  });
  toastr.success('已保存收藏条目');
  phone.goBack();
}

watch(
  editingItem,
  item => {
    editTitle.value = item?.title || '';
    editContent.value = item?.content || '';
    editGroupId.value = item?.groupId || '';
    editOrder.value = item?.order || 1;
  },
  { immediate: true },
);

watch(editGroupId, () => {
  editOrder.value = Math.max(1, Math.min(Math.round(editOrder.value || 1), editOrderMax.value));
});

onMounted(() => {
  refreshSourceNames();
  presetNames.value = listTavernPresets();
  if (!groups.value.length) {
    const group = library.createGroup('默认分组');
    openGroupIds.value = [group.id];
  } else {
    openGroupIds.value = [groups.value[0].id];
  }
  collectGroupId.value = groups.value[0]?.id || '';
  bindingGroupId.value = groups.value[0]?.id || '';
});

onBeforeUnmount(() => {
  clearItemDragLongPressTimer();
});
</script>

<style scoped>
.pc-entry-library-app,
.pc-entry-library-page {
  min-height: 100%;
}

.pc-entry-library-page,
.pc-entry-library-collect-scroll,
.pc-entry-library-groups,
.pc-entry-library-items,
.pc-entry-library-source-list,
.pc-entry-binding-list {
  display: grid;
  align-content: start;
  gap: 12px;
}

.pc-entry-library-app:has(.pc-entry-library-collect-page) {
  height: 100%;
  min-height: 0;
}

.pc-entry-library-collect-page {
  height: 100%;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  align-content: stretch;
  overflow: hidden;
}

.pc-entry-library-collect-scroll {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 2px 10px 0;
}

.pc-entry-library-collect-footer {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 0 max(2px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--pc-border);
  background: color-mix(in srgb, var(--pc-surface) 92%, transparent 8%);
  box-shadow: 0 -10px 18px color-mix(in srgb, var(--pc-text) 7%, transparent 93%);
}

.pc-entry-library-collect-footer > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.pc-entry-library-collect-footer strong,
.pc-entry-library-collect-footer small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-entry-library-collect-footer small {
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-entry-library-collect-footer .pc-primary-btn {
  min-width: 126px;
  margin: 0;
}

.pc-entry-library-head,
.pc-entry-library-head-actions,
.pc-entry-library-create,
.pc-entry-library-group-head,
.pc-entry-library-group-actions,
.pc-entry-library-item-actions,
.pc-entry-library-select-actions,
.pc-entry-binding-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-entry-library-head,
.pc-entry-library-group-head,
.pc-entry-library-select-actions {
  justify-content: space-between;
}

.pc-entry-library-head h2 {
  margin: 3px 0 0;
  font-size: 19px;
}

.pc-entry-transfer-card {
  display: grid;
  gap: 14px;
}

.pc-entry-transfer-card > div:first-child {
  display: grid;
  gap: 4px;
}

.pc-entry-transfer-card small {
  color: var(--pc-muted);
}

.pc-entry-library-create .pc-field {
  min-width: 0;
  flex: 1;
}

.pc-entry-library-search {
  position: relative;
  display: block;
}

.pc-entry-library-search > i {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 14px;
  color: var(--pc-muted);
  transform: translateY(-50%);
}

.pc-entry-library-search .pc-field {
  padding-left: 40px;
}

.pc-entry-library-group {
  display: grid;
  gap: 8px;
}

.pc-entry-library-group-head {
  min-width: 0;
}

.pc-entry-library-group-toggle {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-entry-library-group-toggle > i {
  color: var(--pc-muted);
  font-size: 11px;
  transition: transform 0.16s ease;
}

.pc-entry-library-group-toggle > i.expanded {
  transform: rotate(90deg);
}

.pc-entry-library-group-toggle > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.pc-entry-library-group-toggle small,
.pc-entry-library-item small,
.pc-entry-binding-row small {
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-entry-library-item {
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 58px;
  padding: 8px;
  touch-action: pan-y;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    opacity 0.16s ease,
    transform 0.16s ease;
}

.pc-entry-library-item.disabled {
  opacity: 0.62;
}

.pc-entry-library-item.dragging {
  z-index: 2;
  border-color: color-mix(in srgb, var(--pc-theme-accent) 52%, var(--pc-border) 48%);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--pc-text) 14%, transparent 86%);
  opacity: 0.72;
  transform: scale(0.985);
}

.pc-entry-library-item.drop-before::before,
.pc-entry-library-items.drop-at-end::after {
  position: absolute;
  right: 8px;
  left: 8px;
  height: 3px;
  border-radius: 999px;
  background: var(--pc-theme-accent);
  content: '';
}

.pc-entry-library-item.drop-before::before {
  top: -8px;
}

.pc-entry-library-items.drop-at-end {
  position: relative;
}

.pc-entry-library-items.drop-at-end::after {
  bottom: -7px;
}

.pc-entry-drag-handle {
  width: 32px;
  min-width: 32px;
  height: 32px;
  background: transparent;
  color: var(--pc-muted);
  cursor: grab;
}

.pc-entry-drag-handle:active {
  cursor: grabbing;
}

.pc-entry-library-item-main {
  display: block;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-entry-library-item-main strong {
  display: block;
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-entry-library-item-actions {
  margin-left: 0;
}

.pc-entry-library-item-actions .pc-toggle,
.pc-entry-library-group-actions .pc-toggle {
  --pc-toggle-width: 44px;
  --pc-toggle-height: 26px;
  --pc-toggle-thumb-size: 20px;
}

.pc-entry-library-select-actions {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-entry-library-select-actions > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.pc-entry-source-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}

.pc-entry-source-row > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-entry-source-row small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 11px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pc-entry-dedupe-summary {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.pc-entry-dedupe-summary span {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-entry-duplicate-pair {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.pc-entry-duplicate-pair > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pc-entry-duplicate-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pc-entry-duplicate-columns > section {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-entry-duplicate-columns p {
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--pc-muted);
  font-size: 11px;
}

.pc-entry-binding-editor,
.pc-entry-item-editor {
  display: grid;
  gap: 12px;
}

.pc-entry-binding-template > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-entry-binding-template .pc-area {
  min-height: 120px;
}

.pc-entry-binding-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  padding: 10px 12px;
}

.pc-entry-binding-row > div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.pc-entry-binding-row strong,
.pc-entry-binding-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-entry-content-field .pc-area {
  min-height: 300px;
}
</style>
