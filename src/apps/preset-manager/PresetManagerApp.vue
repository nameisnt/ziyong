<template>
  <section class="pc-preset-manager">
    <section v-if="route.page === 'root'" class="pc-preset-page">
      <header class="pc-preset-current">
        <div>
          <span class="pc-kicker">当前酒馆预设</span>
          <strong :title="loadedPresetName">{{ loadedPresetName || '未读取到当前预设' }}</strong>
        </div>
        <button class="pc-icon-btn" type="button" :disabled="loading" title="刷新预设" @click="refreshRoot">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': loading }"></i>
        </button>
      </header>

      <div v-if="errorMessage" class="pc-section-card pc-preset-error">
        <strong>无法读取预设</strong>
        <span>{{ errorMessage }}</span>
      </div>

      <label v-else-if="presetNames.length" class="pc-preset-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="presetQuery" class="pc-field" type="search" placeholder="搜索预设名称" />
      </label>

      <div v-if="!errorMessage && visiblePresetNames.length" class="pc-preset-list">
        <article
          v-for="presetName in visiblePresetNames"
          :key="presetName"
          class="pc-section-card pc-preset-row"
          :class="{ current: presetName === loadedPresetName }"
        >
          <button class="pc-preset-open" type="button" @click="openPreset(presetName)">
            <span class="pc-preset-icon"><i class="fa-solid fa-file-lines"></i></span>
            <span class="pc-preset-copy">
              <strong :title="presetName">{{ presetName }}</strong>
              <small>{{ presetName === loadedPresetName ? '当前使用' : '点击管理条目' }}</small>
            </span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button
            class="pc-soft-btn compact"
            type="button"
            :class="{ active: presetName === loadedPresetName }"
            :disabled="switchingPreset === presetName || presetName === loadedPresetName"
            @click="switchPreset(presetName)"
          >
            {{ presetName === loadedPresetName ? '当前' : '使用' }}
          </button>
        </article>
      </div>
      <EmptyState
        v-else-if="!loading && !errorMessage"
        :title="presetNames.length && presetQuery.trim() ? '没有找到匹配的预设' : '没有可用的酒馆预设'"
      />
    </section>

    <section v-else-if="route.page === 'detail'" class="pc-preset-page">
      <article class="pc-section-card pc-preset-detail-head">
        <div>
          <span class="pc-kicker">{{ detailPresetName === loadedPresetName ? '当前酒馆预设' : '预设条目' }}</span>
          <h2 :title="detailPresetName">{{ detailPresetName }}</h2>
          <small v-if="activePreset">{{ activePreset.prompts.length }} 个条目</small>
        </div>
        <button
          v-if="detailPresetName !== loadedPresetName"
          class="pc-soft-btn compact"
          type="button"
          :disabled="mutationBusy || switchingPreset === detailPresetName"
          @click="switchPreset(detailPresetName)"
        >
          使用
        </button>
      </article>

      <div v-if="errorMessage" class="pc-section-card pc-preset-error">
        <strong>无法读取预设</strong>
        <span>{{ errorMessage }}</span>
      </div>

      <div v-else-if="activePreset" class="pc-preset-filter-row">
        <span>只看当前已启用条目</span>
        <label class="pc-toggle" title="只显示当前实际启用的预设条目">
          <input v-model="enabledOnly" type="checkbox" aria-label="只看当前已启用条目" />
          <span aria-hidden="true"></span>
        </label>
      </div>

      <div v-if="!errorMessage && activePreset" class="pc-preset-nodes">
        <template
          v-for="node in displayNodes"
          :key="node.type === 'group' ? `group:${node.group.id}` : `prompt:${node.prompt.id}`"
        >
          <PresetPromptRow
            v-if="node.type === 'prompt'"
            :busy="busyPromptIds.has(node.prompt.id)"
            :prompt="node.prompt"
            @open="openPromptEditor"
            @toggle="togglePrompt"
          />

          <section v-else class="pc-preset-group">
            <button class="pc-preset-group-head" type="button" @click="toggleGroup(node.group.id)">
              <i class="fa-solid fa-chevron-right" :class="{ expanded: !collapsedGroupIds.has(node.group.id) }"></i>
              <span>
                <strong>{{ node.group.name }}</strong>
                <small>
                  {{ node.prompts.filter(prompt => prompt.enabled).length }}/{{ node.prompts.length }} 启用
                  <template v-if="!node.group.enabled"> · 组已停用</template>
                </small>
              </span>
            </button>
            <div v-if="!collapsedGroupIds.has(node.group.id)" class="pc-preset-group-body">
              <PresetPromptRow
                v-for="prompt in node.prompts"
                :key="prompt.id"
                :busy="busyPromptIds.has(prompt.id)"
                :group-disabled="!node.group.enabled"
                :prompt="prompt"
                @open="openPromptEditor"
                @toggle="togglePrompt"
              />
            </div>
          </section>
        </template>
        <EmptyState
          v-if="!displayNodes.length"
          :title="enabledOnly ? '这个预设没有当前已启用的条目' : '这个预设没有条目'"
        />
      </div>
      <EmptyState v-else-if="loading" title="正在读取预设" />
    </section>

    <section v-else-if="route.page === 'edit' && activePrompt" class="pc-preset-page pc-preset-editor-page">
      <article class="pc-editor-card pc-preset-editor">
        <div class="pc-preset-editor-head">
          <span class="pc-kicker">{{ detailPresetName }}</span>
          <h2 :title="activePrompt.name || activePrompt.id">{{ activePrompt.name || activePrompt.id }}</h2>
          <small>{{ promptRoleLabel(activePrompt.role) }}</small>
        </div>
        <textarea v-model="editorDraft" class="pc-area" placeholder="预设条目内容"></textarea>
        <div class="pc-form-actions">
          <button class="pc-soft-btn" type="button" :disabled="saving" @click="phone.goBack()">取消</button>
          <button class="pc-primary-btn" type="button" :disabled="saving || !editorDirty" @click="savePromptContent">
            {{ saving ? '保存中' : '保存' }}
          </button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneStore } from '@/store/phone';
import {
  buildPresetDisplayNodes,
  getCurrentTavernPresetName,
  listTavernPresets,
  loadTavernPreset,
  readTavernPreset,
  updateTavernPresetPrompt,
  type TavernPreset,
  type TavernPresetPrompt,
} from './api';
import PresetPromptRow from './PresetPromptRow.vue';

const phone = usePhoneStore();
const route = computed(() => phone.currentRoute);
const presetNames = ref<string[]>([]);
const presetQuery = ref('');
const loadedPresetName = ref('');
const activePreset = ref<TavernPreset | null>(null);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const switchingPreset = ref('');
const busyPromptIds = ref(new Set<string>());
const collapsedGroupIds = ref(new Set<string>());
const editorDraft = ref('');
const enabledOnly = ref(false);

const detailPresetName = computed(() => route.value.params?.presetName || '');
const activePromptId = computed(() => route.value.params?.promptId || '');
const activePrompt = computed(
  () => activePreset.value?.prompts.find(prompt => prompt.id === activePromptId.value) ?? null,
);
const displayNodes = computed(() => {
  if (!activePreset.value) return [];
  const nodes = buildPresetDisplayNodes(activePreset.value);
  if (!enabledOnly.value) return nodes;
  return nodes.flatMap(node => {
    if (node.type === 'prompt') return node.prompt.enabled ? [node] : [];
    if (!node.group.enabled) return [];
    const prompts = node.prompts.filter(prompt => prompt.enabled);
    return prompts.length ? [{ ...node, prompts }] : [];
  });
});
const visiblePresetNames = computed(() => {
  const keyword = presetQuery.value.trim().toLocaleLowerCase();
  if (!keyword) return presetNames.value;
  return presetNames.value.filter(name => name.toLocaleLowerCase().includes(keyword));
});
const editorDirty = computed(() =>
  activePrompt.value ? editorDraft.value !== (activePrompt.value.content || '') : false,
);
const mutationBusy = computed(() => saving.value || busyPromptIds.value.size > 0);

function setBusyPrompt(promptId: string, busy: boolean) {
  const next = new Set(busyPromptIds.value);
  if (busy) next.add(promptId);
  else next.delete(promptId);
  busyPromptIds.value = next;
}

function syncCollapsedGroups() {
  const collapsed = new Set<string>();
  for (const node of displayNodes.value) {
    if (node.type === 'group' && node.group.collapsed) {
      collapsed.add(node.group.id);
    }
  }
  collapsedGroupIds.value = collapsed;
}

async function refreshRoot() {
  loading.value = true;
  errorMessage.value = '';
  try {
    presetNames.value = listTavernPresets();
    loadedPresetName.value = getCurrentTavernPresetName();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}

async function loadDetail() {
  if (!detailPresetName.value) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    loadedPresetName.value = getCurrentTavernPresetName();
    activePreset.value = readTavernPreset(detailPresetName.value);
    syncCollapsedGroups();
    if (route.value.page === 'edit') {
      editorDraft.value = activePrompt.value?.content || '';
    }
  } catch (error) {
    activePreset.value = null;
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}

function openPreset(presetName: string) {
  phone.pushRoute('preset-manager', 'detail', '预设条目', { presetName });
}

function openPromptEditor(prompt: TavernPresetPrompt) {
  if (typeof prompt.content !== 'string') return;
  phone.pushRoute('preset-manager', 'edit', '编辑预设条目', {
    presetName: detailPresetName.value,
    promptId: prompt.id,
  });
}

async function switchPreset(presetName: string) {
  if (!presetName || switchingPreset.value) return;
  switchingPreset.value = presetName;
  try {
    await loadTavernPreset(presetName);
    loadedPresetName.value = presetName;
    toastr.success(`已切换到“${presetName}”`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    switchingPreset.value = '';
  }
}

async function togglePrompt(prompt: TavernPresetPrompt, enabled: boolean) {
  if (!activePreset.value || busyPromptIds.value.has(prompt.id)) return;
  setBusyPrompt(prompt.id, true);
  try {
    const result = await updateTavernPresetPrompt(detailPresetName.value, prompt.id, { enabled });
    activePreset.value = result.preset;
    if (!result.liveSynced) {
      toastr.warning('条目已经保存，但当前生效副本刷新失败；重新切换预设后会生效');
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    setBusyPrompt(prompt.id, false);
  }
}

function toggleGroup(groupId: string) {
  const next = new Set(collapsedGroupIds.value);
  if (next.has(groupId)) next.delete(groupId);
  else next.add(groupId);
  collapsedGroupIds.value = next;
}

function promptRoleLabel(role: TavernPresetPrompt['role']) {
  return (
    {
      assistant: 'AI 消息',
      system: '系统消息',
      user: '用户消息',
    }[role] || role
  );
}

async function savePromptContent() {
  if (!activePrompt.value || !editorDirty.value || saving.value) return;
  saving.value = true;
  try {
    const result = await updateTavernPresetPrompt(detailPresetName.value, activePrompt.value.id, {
      content: editorDraft.value,
    });
    activePreset.value = result.preset;
    if (result.liveSynced) {
      toastr.success('预设条目已保存');
    } else {
      toastr.warning('内容已经保存，但当前生效副本刷新失败；重新切换预设后会生效');
    }
    await phone.goBack();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}

watch(
  () => [route.value.appId, route.value.page, route.value.params?.presetName, route.value.params?.promptId],
  () => {
    if (route.value.appId !== 'preset-manager') return;
    if (route.value.page === 'root') {
      void refreshRoot();
      return;
    }
    void loadDetail();
  },
  { immediate: true },
);
</script>

<style scoped>
.pc-preset-manager,
.pc-preset-page {
  min-height: 0;
}

.pc-preset-manager {
  height: 100%;
}

.pc-preset-page {
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 14px;
}

.pc-preset-current,
.pc-preset-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-preset-current > div,
.pc-preset-detail-head > div,
.pc-preset-editor-head {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.pc-preset-current strong,
.pc-preset-detail-head h2,
.pc-preset-editor-head h2 {
  overflow: hidden;
  margin: 0;
  color: var(--pc-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-preset-current strong {
  font-size: 17px;
}

.pc-preset-detail-head h2,
.pc-preset-editor-head h2 {
  font-size: 19px;
}

.pc-preset-detail-head small,
.pc-preset-editor-head small {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}

.pc-preset-list,
.pc-preset-nodes,
.pc-preset-group-body {
  display: grid;
  gap: 10px;
}

.pc-preset-filter-row {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--pc-text);
  font-size: 13px;
  font-weight: 700;
}

.pc-preset-search {
  position: relative;
  display: block;
}

.pc-preset-search > i {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 14px;
  color: var(--pc-muted);
  transform: translateY(-50%);
}

.pc-preset-search .pc-field {
  padding-left: 40px;
}

.pc-preset-row {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  padding: 10px;
}

.pc-preset-row.current {
  border-color: color-mix(in srgb, var(--pc-theme-accent) 42%, var(--pc-border) 58%);
}

.pc-preset-open {
  display: grid;
  min-width: 0;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-preset-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--pc-control-radius);
  background: color-mix(in srgb, var(--pc-theme-accent) 14%, var(--pc-surface-strong) 86%);
  color: var(--pc-theme-accent);
}

.pc-preset-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-preset-copy strong,
.pc-preset-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-preset-copy small,
.pc-preset-open > i {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-preset-error {
  color: var(--pc-danger);
}

.pc-preset-error span {
  color: var(--pc-muted);
  font-size: 13px;
}

.pc-preset-group {
  display: grid;
  gap: 8px;
}

.pc-preset-group-head {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border: 0;
  padding: 9px 4px;
  background: transparent;
  color: var(--pc-text);
  text-align: left;
  cursor: pointer;
}

.pc-preset-group-head > i {
  color: var(--pc-muted);
  font-size: 12px;
  transition: transform 0.16s ease;
}

.pc-preset-group-head > i.expanded {
  transform: rotate(90deg);
}

.pc-preset-group-head > span {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.pc-preset-group-head strong,
.pc-preset-group-head small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-preset-group-head small {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}

.pc-preset-group-body {
  padding-left: 12px;
  border-left: 2px solid color-mix(in srgb, var(--pc-theme-accent) 24%, var(--pc-border) 76%);
}

.pc-preset-editor-page {
  overflow: hidden;
}

.pc-preset-editor {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.pc-preset-editor .pc-area {
  min-height: 0;
  flex: 1;
  resize: none;
}

.pc-preset-editor .pc-form-actions {
  flex-wrap: nowrap;
}

.pc-preset-editor .pc-form-actions > button {
  min-width: 0;
  flex: 1;
}
</style>
