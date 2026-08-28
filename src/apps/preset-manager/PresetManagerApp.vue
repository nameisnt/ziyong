<template>
  <section class="pc-preset-manager">
    <PresetCatalogPage
      v-if="route.page === 'root'"
      v-model:query="presetQuery"
      v-model:show-hidden="showHiddenPluginPresets"
      v-model:source="presetSource"
      :error-message="errorMessage"
      :loaded-preset-name="loadedPresetName"
      :loading="loading || (presetSource === 'plugin' && pluginPresetsLoading)"
      :plugin-error-message="pluginPresetLoadError"
      :plugin-presets="pluginPresetItems"
      :preset-names="presetNames"
      :switching-preset="switchingPreset"
      :visible-preset-names="visiblePresetNames"
      @import="importPluginPreset"
      @open="openPreset"
      @open-plugin="openPluginPreset"
      @refresh="refreshRoot"
      @switch-preset="switchPreset"
    />

    <PresetDetailPage
      v-else-if="route.page === 'detail'"
      v-model:enabled-only="enabledOnly"
      :busy-prompt-ids="busyPromptIds"
      :collapsed-group-ids="collapsedGroupIds"
      :display-nodes="displayNodes"
      :error-message="errorMessage"
      :loaded-preset-name="loadedPresetName"
      :loading="loading"
      :mutation-busy="mutationBusy"
      :move-preset-label="isPluginDetail ? '移到酒馆预设' : '移到插件预设'"
      :plugin-preset="isPluginDetail"
      :plugin-preset-built-in="detailPluginPreset?.builtIn === true"
      :plugin-preset-hidden="detailPluginPreset?.hidden === true"
      :default-app-ids="detailDefaultAppIds"
      :default-app-options="defaultAppOptions"
      :preset-deletable="detailPluginPresetId !== BUILTIN_DIARY_PRESET_ID"
      :preset-movable="detailPresetMovable"
      :preset="activePreset"
      :preset-name="detailPresetName"
      :prompt-group-ids="promptGroupIds"
      :prompt-groups="promptGroups"
      :prompt-drag="promptDrag"
      :switching-preset="switchingPreset"
      @copy-prompt="openPromptCopy"
      @assign-prompt-group="assignPromptToGroup"
      @create-prompt-group="createPromptGroup"
      @delete-prompt-group="deletePromptGroup"
      @drag-cancel="cancelPromptDrag"
      @drag-end="finishPromptDrag"
      @drag-move="movePromptDrag"
      @drag-start="startPromptDrag"
      @delete-preset="removePreset"
      @export-preset="exportActivePreset"
      @move-preset="movePreset"
      @open-prompt="openPromptEditor"
      @rename-preset="renamePreset"
      @rename-prompt-group="renamePromptGroup"
      @switch-preset="switchPreset"
      @toggle-group="toggleGroup"
      @toggle-preset-visibility="togglePresetVisibility"
      @toggle-prompt="togglePrompt"
      @toggle-default-app="toggleDefaultApp"
    />

    <PresetPromptEditorPage
      v-else-if="route.page === 'edit' && activePrompt"
      v-model:draft="editorDraft"
      v-model:name-draft="editorNameDraft"
      v-model:role-draft="editorRoleDraft"
      :dirty="editorDirty"
      :preset-name="detailPresetName"
      :prompt="activePrompt"
      :saving="saving"
      @back="phone.goBack()"
      @remove="removePrompt"
      @save="savePromptContent"
    />

    <PresetPromptCopyPage
      v-else-if="route.page === 'copy' && copySourcePrompt"
      v-model:content="copyDraft.content"
      v-model:enabled="copyDraft.enabled"
      v-model:name="copyDraft.name"
      v-model:role="copyDraft.role"
      :saving="saving"
      :source-prompt="copySourcePrompt"
      @back="phone.goBack()"
      @save="savePromptCopy"
    />
  </section>
</template>

<script setup lang="ts">
import { useEntryLibraryStore } from '@/apps/entry-library/store';
import { BUILTIN_DIARY_PRESET_ID } from '@/apps/preset-manager/builtinDiaryPreset';
import { usePresetLinkStore } from '@/apps/preset-link/store';
import { getRegisteredPhoneGenerationActions } from '@/core/appRegistry';
import { useGenerationOverrideStore } from '@/store/generationOverrides';
import { usePhoneStore } from '@/store/phone';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { storeToRefs } from 'pinia';
import {
  assignPresetPromptGroup,
  buildPresetDisplayNodes,
  createPresetPromptGroup,
  createPresetPromptGroupId,
  createTavernPreset,
  deletePresetPromptGroup,
  deleteTavernPreset,
  deleteTavernPresetPrompt,
  duplicateTavernPresetPrompt,
  getCurrentTavernPresetName,
  listTavernPresets,
  listPresetPromptGroups,
  loadTavernPreset,
  readTavernPreset,
  reorderTavernPresetPrompts,
  renamePresetPromptGroup,
  updateTavernPresetPromptGroups,
  updateTavernPresetPrompt,
  type BaibaiPresetGroup,
  type TavernPreset,
  type TavernPresetPrompt,
} from './api';
import { movePresetTransactional, PresetMigrationError } from './presetMigration';
import PresetCatalogPage from './pages/PresetCatalogPage.vue';
import PresetDetailPage from './pages/PresetDetailPage.vue';
import PresetPromptCopyPage from './pages/PresetPromptCopyPage.vue';
import PresetPromptEditorPage from './pages/PresetPromptEditorPage.vue';

const phone = usePhoneStore();
const entryLibrary = useEntryLibraryStore();
const presetLinks = usePresetLinkStore();
const pluginPresets = usePluginPresetStore();
const generationOverrides = useGenerationOverrideStore();
const {
  items: pluginPresetItems,
  loadError: pluginPresetLoadError,
  loading: pluginPresetsLoading,
} = storeToRefs(pluginPresets);
const route = computed(() => phone.currentRoute);
const presetNames = ref<string[]>([]);
const presetQuery = ref('');
const presetSource = ref<'plugin' | 'tavern'>('plugin');
const showHiddenPluginPresets = ref(false);
const loadedPresetName = ref('');
const activePreset = ref<TavernPreset | null>(null);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const switchingPreset = ref('');
const busyPromptIds = ref(new Set<string>());
const collapsedGroupIds = ref(new Set<string>());
const collapsedGroupsByPreset = new Map<string, Map<string, boolean>>();
const editorDraft = ref('');
const editorNameDraft = ref('');
const editorRoleDraft = ref<TavernPresetPrompt['role']>('system');
const enabledOnly = ref(false);
const copyDraft = reactive({
  content: '',
  enabled: false,
  name: '',
  role: 'system' as TavernPresetPrompt['role'],
});
const promptDrag = reactive({
  groupId: '',
  insertBeforeId: '',
  isDragging: false,
  pointerId: -1,
  promptId: '',
  startY: 0,
});
let promptDragRoot: HTMLElement | null = null;

const detailPluginPresetId = computed(() => route.value.params?.presetId || '');
const isPluginDetail = computed(() => route.value.params?.presetSource === 'plugin');
const detailPresetName = computed(() =>
  isPluginDetail.value
    ? pluginPresets.getById(detailPluginPresetId.value)?.name || ''
    : route.value.params?.presetName || '',
);
const detailPluginPreset = computed(() =>
  isPluginDetail.value ? pluginPresets.getById(detailPluginPresetId.value) : null,
);
const defaultAppOptions = computed(() => {
  const apps = new Map<string, { icon: string; id: string; name: string }>();
  getRegisteredPhoneGenerationActions().forEach(action => {
    if (!apps.has(action.appId)) {
      apps.set(action.appId, { icon: action.app.icon, id: action.appId, name: action.app.name });
    }
  });
  return [...apps.values()];
});
const detailDefaultAppIds = computed(() =>
  isPluginDetail.value ? pluginPresets.getDefaultAppIds(detailPluginPresetId.value) : [],
);
const detailPresetMovable = computed(() =>
  isPluginDetail.value
    ? detailPluginPresetId.value !== BUILTIN_DIARY_PRESET_ID
    : getCurrentTavernPresetName() !== detailPresetName.value,
);
const activePromptId = computed(() => route.value.params?.promptId || '');
const copySourcePromptId = computed(() => route.value.params?.sourcePromptId || '');
const activePrompt = computed(
  () => activePreset.value?.prompts.find(prompt => prompt.id === activePromptId.value) ?? null,
);
const copySourcePrompt = computed(
  () => activePreset.value?.prompts.find(prompt => prompt.id === copySourcePromptId.value) ?? null,
);
const promptGroupIds = computed(() => {
  const result = new Map<string, string>();
  if (!activePreset.value) return result;
  for (const node of buildPresetDisplayNodes(activePreset.value)) {
    if (node.type !== 'group') continue;
    node.prompts.forEach(prompt => result.set(prompt.id, node.group.id));
  }
  return result;
});
const promptGroups = computed(() => (activePreset.value ? listPresetPromptGroups(activePreset.value) : []));
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
  const names = keyword
    ? presetNames.value.filter(name => name.toLocaleLowerCase().includes(keyword))
    : [...presetNames.value];
  const currentIndex = names.indexOf(loadedPresetName.value);
  if (currentIndex <= 0) return names;
  const currentName = names[currentIndex]!;
  return [currentName, ...names.slice(0, currentIndex), ...names.slice(currentIndex + 1)];
});
const editorDirty = computed(() =>
  activePrompt.value
    ? editorDraft.value !== (activePrompt.value.content || '') ||
      editorNameDraft.value !== activePrompt.value.name ||
      editorRoleDraft.value !== activePrompt.value.role
    : false,
);
const mutationBusy = computed(() => saving.value || busyPromptIds.value.size > 0 || promptDrag.isDragging);

function setBusyPrompt(promptId: string, busy: boolean) {
  const next = new Set(busyPromptIds.value);
  if (busy) next.add(promptId);
  else next.delete(promptId);
  busyPromptIds.value = next;
}

function syncCollapsedGroups() {
  const stateKey = isPluginDetail.value ? `plugin:${detailPluginPresetId.value}` : `tavern:${detailPresetName.value}`;
  const saved = collapsedGroupsByPreset.get(stateKey);
  const collapsed = new Set<string>();
  const nextState = new Map<string, boolean>();
  for (const node of activePreset.value ? buildPresetDisplayNodes(activePreset.value) : []) {
    if (node.type !== 'group') continue;
    const isCollapsed = saved?.get(node.group.id) ?? node.group.collapsed;
    nextState.set(node.group.id, isCollapsed);
    if (isCollapsed) collapsed.add(node.group.id);
  }
  collapsedGroupsByPreset.set(stateKey, nextState);
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
  if ((!isPluginDetail.value && !detailPresetName.value) || (isPluginDetail.value && !detailPluginPresetId.value))
    return;
  loading.value = true;
  errorMessage.value = '';
  try {
    loadedPresetName.value = getCurrentTavernPresetName();
    activePreset.value = isPluginDetail.value
      ? pluginPresets.readPreset(detailPluginPresetId.value)
      : readTavernPreset(detailPresetName.value);
    syncCollapsedGroups();
    if (route.value.page === 'edit') {
      editorDraft.value = activePrompt.value?.content || '';
      editorNameDraft.value = activePrompt.value?.name || '';
      editorRoleDraft.value = activePrompt.value?.role || 'system';
    }
    if (route.value.page === 'copy' && copySourcePrompt.value) {
      copyDraft.content = copySourcePrompt.value.content || '';
      copyDraft.enabled = false;
      copyDraft.name = createCopyName(copySourcePrompt.value);
      copyDraft.role = copySourcePrompt.value.role;
    }
  } catch (error) {
    activePreset.value = null;
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}

function openPreset(presetName: string) {
  phone.pushRoute('preset-manager', 'detail', '预设条目', {
    presetId: '',
    presetName,
    presetSource: 'tavern',
  });
}

function openPluginPreset(presetId: string) {
  phone.pushRoute('preset-manager', 'detail', '插件预设条目', { presetId, presetSource: 'plugin' });
}

function toggleDefaultApp(appId: string, enabled: boolean) {
  if (!isPluginDetail.value || mutationBusy.value) return;
  const next = new Set(detailDefaultAppIds.value);
  if (enabled) next.add(appId);
  else next.delete(appId);
  const affectedAppIds = pluginPresets.setDefaultApps(detailPluginPresetId.value, [...next]);
  affectedAppIds.forEach(id => generationOverrides.resetApp(id));
}

async function togglePresetVisibility() {
  const record = detailPluginPreset.value;
  if (!record?.builtIn || mutationBusy.value) return;
  saving.value = true;
  try {
    await pluginPresets.setHidden(record.id, !record.hidden);
    toastr.success(record.hidden ? '内置预设已隐藏' : '内置预设已取消隐藏');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}

async function importPluginPreset(file: File) {
  loading.value = true;
  try {
    const parsed = JSON.parse((await file.text()).replace(/^\uFEFF/u, '')) as unknown;
    const imported = await pluginPresets.importPreset(parsed, file.name);
    presetSource.value = 'plugin';
    toastr.success(`已导入插件预设“${imported.name}”`);
    openPluginPreset(imported.id);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
  }
}

function openPromptEditor(prompt: TavernPresetPrompt) {
  phone.pushRoute('preset-manager', 'edit', '编辑预设条目', {
    ...(isPluginDetail.value
      ? { presetId: detailPluginPresetId.value, presetSource: 'plugin' }
      : { presetName: detailPresetName.value }),
    promptId: prompt.id,
  });
}

function openPromptCopy(prompt: TavernPresetPrompt) {
  if (typeof prompt.content !== 'string' || mutationBusy.value) return;
  phone.pushRoute('preset-manager', 'copy', '复制预设条目', {
    ...(isPluginDetail.value
      ? { presetId: detailPluginPresetId.value, presetSource: 'plugin' }
      : { presetName: detailPresetName.value }),
    sourcePromptId: prompt.id,
  });
}

function createCopyName(source: TavernPresetPrompt) {
  const names = new Set(activePreset.value?.prompts.map(prompt => prompt.name.trim()) ?? []);
  const base = `${source.name.trim() || source.id} - 副本`;
  if (!names.has(base)) return base;
  let index = 2;
  while (names.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
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

async function renamePreset() {
  const oldName = detailPresetName.value;
  if (!oldName || mutationBusy.value) return;
  if (!isPluginDetail.value) {
    toastr.error('当前酒馆没有不切换预设、不导入正则的安全改名接口；插件已阻止本次操作');
    return;
  }
  const requested = await phone.promptNotice(
    '输入新的插件预设名称。它只影响插件内显示和选择，不会出现在酒馆预设菜单。',
    {
      confirmLabel: '继续',
      initialValue: oldName,
      title: '预设改名',
    },
  );
  const newName = requested?.trim() || '';
  if (!newName || newName === oldName) return;
  if (!(await phone.confirmNotice(`确认把预设“${oldName}”改名为“${newName}”吗？`, { confirmLabel: '改名' }))) return;
  saving.value = true;
  try {
    const savedName = await pluginPresets.renamePreset(detailPluginPresetId.value, newName);
    phone.replaceRoute('preset-manager', 'detail', '插件预设条目', {
      presetId: detailPluginPresetId.value,
      presetSource: 'plugin',
    });
    toastr.success(`插件预设已改名为“${savedName}”`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}

async function removePreset() {
  const presetName = detailPresetName.value;
  if (!presetName || mutationBusy.value) return;
  const confirmed = await phone.confirmNotice(
    isPluginDetail.value
      ? `确认删除插件预设“${presetName}”吗？这不会删除或切换任何酒馆预设。`
      : `确认删除预设“${presetName}”吗？相关聊天绑定、阅读规则绑定和收藏条目绑定也会移除。当前正在使用的预设不能删除。`,
    { confirmLabel: '删除', kind: 'warning' },
  );
  if (!confirmed) return;
  saving.value = true;
  try {
    if (isPluginDetail.value) {
      await pluginPresets.deletePreset(detailPluginPresetId.value);
      activePreset.value = null;
      presetSource.value = 'plugin';
      phone.replaceRoute('preset-manager', 'root', '预设管理');
      toastr.success('插件预设已删除');
      return;
    }
    await deleteTavernPreset(presetName);
    const removed = presetLinks.removePresetReferences(presetName) + entryLibrary.removePresetReferences(presetName);
    activePreset.value = null;
    await refreshRoot();
    phone.replaceRoute('preset-manager', 'root', '预设管理');
    toastr.success(`预设已删除，并清理 ${removed} 处手机引用`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}

const TAVERN_ZERO_NORMALIZED_SETTING_KEYS = [
  'frequency_penalty',
  'max_completion_tokens',
  'max_context',
  'min_p',
  'presence_penalty',
  'repetition_penalty',
  'reply_count',
  'seed',
  'temperature',
  'top_a',
  'top_k',
  'top_p',
] as const;

function normalizePresetTransferPayload(value: unknown, sourceLabel: string): TavernPreset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${sourceLabel}预设的原始内容无效`);
  }
  const cloned = JSON.parse(JSON.stringify(value)) as unknown;
  if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) {
    throw new Error(`${sourceLabel}预设的原始内容无法序列化`);
  }
  const preset = cloned as TavernPreset;
  if (!Array.isArray(preset.prompts)) {
    throw new Error(`${sourceLabel}预设中没有可迁移的条目列表`);
  }
  if (!preset.extensions || typeof preset.extensions !== 'object' || Array.isArray(preset.extensions)) {
    preset.extensions = {};
  }
  if (preset.settings && typeof preset.settings === 'object' && !Array.isArray(preset.settings)) {
    TAVERN_ZERO_NORMALIZED_SETTING_KEYS.forEach(key => {
      if (preset.settings?.[key] === null) preset.settings[key] = 0;
    });
  }
  return preset;
}

function readPluginPresetTransferPayload(presetId: string): TavernPreset {
  const raw = pluginPresets.getById(presetId)?.raw;
  if (!raw) throw new Error('所选插件预设尚未载入或已经不存在');
  return normalizePresetTransferPayload(raw, '插件');
}

function readTavernPresetTransferPayload(presetName: string): TavernPreset {
  return normalizePresetTransferPayload(readTavernPreset(presetName), '酒馆');
}

async function movePreset() {
  const sourceName = detailPresetName.value.trim();
  if (!sourceName || mutationBusy.value || !detailPresetMovable.value) return;
  const targetOwner = isPluginDetail.value ? '酒馆预设' : '插件预设';
  const requested = await phone.promptNotice(`输入移动到${targetOwner}后使用的名称。`, {
    confirmLabel: '继续',
    initialValue: sourceName,
    title: `移到${targetOwner}`,
  });
  const targetName = requested?.trim() || '';
  if (!targetName) return;
  const confirmed = await phone.confirmNotice(
    `确认把“${sourceName}”移到${targetOwner}吗？目标创建并校验成功后，才会删除来源。`,
    { confirmLabel: '移动', kind: 'warning' },
  );
  if (!confirmed || mutationBusy.value) return;

  saving.value = true;
  try {
    if (isPluginDetail.value) {
      const sourceId = detailPluginPresetId.value;
      const affectedAppIds = pluginPresets.getDefaultAppIds(sourceId);
      await movePresetTransactional({
        createTarget: preset => createTavernPreset(targetName, preset),
        deleteSource: () => pluginPresets.deletePreset(sourceId),
        deleteTarget: () => deleteTavernPreset(targetName),
        readSource: () => readPluginPresetTransferPayload(sourceId),
        readTarget: () => readTavernPresetTransferPayload(targetName),
        sourceDeletable: sourceId !== BUILTIN_DIARY_PRESET_ID,
        sourceName,
        targetExists: name => listTavernPresets().includes(name),
        targetName,
      });
      affectedAppIds.forEach(appId => generationOverrides.resetApp(appId));
      activePreset.value = null;
      await refreshRoot();
      phone.replaceRoute('preset-manager', 'detail', '预设条目', {
        presetId: '',
        presetName: targetName,
        presetSource: 'tavern',
      });
      toastr.success(`已移到酒馆预设“${targetName}”`);
      return;
    }

    let targetId = '';
    await movePresetTransactional({
      createTarget: async preset => {
        const imported = await pluginPresets.importPreset(preset, `${targetName}.json`);
        targetId = imported.id;
        if (imported.name !== targetName) {
          await pluginPresets.deletePreset(imported.id);
          targetId = '';
          throw new Error(`插件预设名称“${targetName}”在创建时发生冲突`);
        }
      },
      deleteSource: () => deleteTavernPreset(sourceName),
      deleteTarget: async () => {
        if (targetId) await pluginPresets.deletePreset(targetId);
      },
      readSource: () => readTavernPresetTransferPayload(sourceName),
      readTarget: () => readPluginPresetTransferPayload(targetId),
      sourceDeletable: getCurrentTavernPresetName() !== detailPresetName.value,
      sourceName,
      targetExists: name => pluginPresetItems.value.some(item => item.name === name),
      targetName,
    });
    const removed = presetLinks.removePresetReferences(sourceName) + entryLibrary.removePresetReferences(sourceName);
    activePreset.value = null;
    presetSource.value = 'plugin';
    phone.replaceRoute('preset-manager', 'detail', '插件预设条目', {
      presetId: targetId,
      presetSource: 'plugin',
    });
    toastr.success(`已移到插件预设“${targetName}”，并清理 ${removed} 处酒馆预设引用`);
  } catch (error) {
    if (error instanceof PresetMigrationError && error.stage === 'source-delete') {
      toastr.error('目标预设已创建并校验，但来源删除失败；两边都还在');
    } else {
      toastr.error(error instanceof Error ? error.message : String(error));
    }
  } finally {
    saving.value = false;
  }
}

async function togglePrompt(prompt: TavernPresetPrompt, enabled: boolean) {
  if (!activePreset.value || busyPromptIds.value.has(prompt.id)) return;
  setBusyPrompt(prompt.id, true);
  try {
    if (isPluginDetail.value) {
      activePreset.value = await pluginPresets.updatePrompt(detailPluginPresetId.value, prompt.id, { enabled });
      return;
    }
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

async function savePromptGroupMutation(update: (preset: TavernPreset) => void, successMessage: string) {
  if (!activePreset.value || mutationBusy.value) return;
  saving.value = true;
  try {
    if (isPluginDetail.value) {
      activePreset.value = await pluginPresets.updatePromptGroups(detailPluginPresetId.value, update);
      syncCollapsedGroups();
      toastr.success(successMessage);
      return;
    }
    const result = await updateTavernPresetPromptGroups(detailPresetName.value, update);
    activePreset.value = result.preset;
    syncCollapsedGroups();
    if (result.liveSynced) toastr.success(successMessage);
    else toastr.warning(`${successMessage}，但当前生效副本刷新失败；重新切换预设后会生效`);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}

async function createPromptGroup() {
  const name = await phone.promptNotice('输入新的条目分组名称。', {
    confirmLabel: '创建',
    title: '新建条目分组',
  });
  if (!name?.trim()) return;
  const groupId = createPresetPromptGroupId();
  await savePromptGroupMutation(
    preset => createPresetPromptGroup(preset, name, groupId),
    `已创建条目分组“${name.trim()}”`,
  );
}

async function renamePromptGroup(group: BaibaiPresetGroup) {
  const name = await phone.promptNotice('输入新的条目分组名称。', {
    confirmLabel: '改名',
    initialValue: group.name,
    title: '条目分组改名',
  });
  if (!name?.trim() || name.trim() === group.name) return;
  await savePromptGroupMutation(
    preset => renamePresetPromptGroup(preset, group.id, name),
    `条目分组已改名为“${name.trim()}”`,
  );
}

async function deletePromptGroup(group: BaibaiPresetGroup) {
  const promptCount = [...promptGroupIds.value.values()].filter(groupId => groupId === group.id).length;
  const confirmed = await phone.confirmNotice(
    `删除条目分组“${group.name}”吗？其中 ${promptCount} 个条目会移到未分组。`,
    { confirmLabel: '删除', kind: 'warning', title: '删除条目分组' },
  );
  if (!confirmed) return;
  await savePromptGroupMutation(preset => deletePresetPromptGroup(preset, group.id), '条目分组已删除');
}

async function assignPromptToGroup(prompt: TavernPresetPrompt, groupId: string) {
  await savePromptGroupMutation(
    preset => assignPresetPromptGroup(preset, prompt.id, groupId),
    groupId ? '条目分组已更新' : '条目已移到未分组',
  );
}

function toggleGroup(groupId: string) {
  const next = new Set(collapsedGroupIds.value);
  if (next.has(groupId)) next.delete(groupId);
  else next.add(groupId);
  collapsedGroupIds.value = next;
  const stateKey = isPluginDetail.value ? `plugin:${detailPluginPresetId.value}` : `tavern:${detailPresetName.value}`;
  const saved = collapsedGroupsByPreset.get(stateKey) ?? new Map<string, boolean>();
  saved.set(groupId, next.has(groupId));
  collapsedGroupsByPreset.set(stateKey, saved);
}

function resetPromptDrag() {
  promptDrag.groupId = '';
  promptDrag.insertBeforeId = '';
  promptDrag.isDragging = false;
  promptDrag.pointerId = -1;
  promptDrag.promptId = '';
  promptDrag.startY = 0;
  promptDragRoot = null;
}

function startPromptDrag(event: PointerEvent, prompt: TavernPresetPrompt, groupId: string) {
  if (enabledOnly.value || mutationBusy.value || event.button !== 0) return;
  resetPromptDrag();
  promptDrag.groupId = groupId;
  promptDrag.pointerId = event.pointerId;
  promptDrag.promptId = prompt.id;
  promptDrag.startY = event.clientY;
  promptDragRoot = (event.currentTarget as HTMLElement).closest<HTMLElement>('.pc-preset-page');
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function updatePromptDragInsertion(clientY: number) {
  const rows = [...(promptDragRoot?.querySelectorAll<HTMLElement>('.pc-preset-prompt-row') ?? [])].filter(
    row => row.dataset.presetGroupId === promptDrag.groupId && row.dataset.presetPromptId !== promptDrag.promptId,
  );
  const beforeRow = rows.find(row => {
    const rect = row.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  promptDrag.insertBeforeId = beforeRow?.dataset.presetPromptId || '';
}

function autoScrollPromptList(clientY: number) {
  const scrollTarget = promptDragRoot;
  if (!scrollTarget) return;
  const rect = scrollTarget.getBoundingClientRect();
  const edge = 52;
  if (clientY < rect.top + edge) scrollTarget.scrollTop -= 14;
  else if (clientY > rect.bottom - edge) scrollTarget.scrollTop += 14;
}

function movePromptDrag(event: PointerEvent) {
  if (event.pointerId !== promptDrag.pointerId || !promptDrag.promptId) return;
  if (!promptDrag.isDragging && Math.abs(event.clientY - promptDrag.startY) > 4) {
    promptDrag.isDragging = true;
  }
  if (!promptDrag.isDragging) return;
  event.preventDefault();
  autoScrollPromptList(event.clientY);
  updatePromptDragInsertion(event.clientY);
}

async function commitPromptDrag() {
  if (!activePreset.value || !promptDrag.isDragging || !promptDrag.promptId) return;
  const groupId = promptDrag.groupId;
  const isInGroup = (promptId: string) => (promptGroupIds.value.get(promptId) || '__ungrouped__') === groupId;
  const subsetIds = activePreset.value.prompts.map(prompt => prompt.id).filter(isInGroup);
  const draggedIndex = subsetIds.indexOf(promptDrag.promptId);
  if (draggedIndex < 0) return;
  subsetIds.splice(draggedIndex, 1);
  const insertIndex = promptDrag.insertBeforeId
    ? Math.max(0, subsetIds.indexOf(promptDrag.insertBeforeId))
    : subsetIds.length;
  subsetIds.splice(insertIndex, 0, promptDrag.promptId);

  let subsetIndex = 0;
  const orderedIds = activePreset.value.prompts.map(prompt =>
    isInGroup(prompt.id) ? (subsetIds[subsetIndex++] as string) : prompt.id,
  );
  if (orderedIds.every((promptId, index) => promptId === activePreset.value?.prompts[index]?.id)) return;

  saving.value = true;
  try {
    if (isPluginDetail.value) {
      activePreset.value = await pluginPresets.reorderPrompts(detailPluginPresetId.value, orderedIds);
      toastr.success('插件预设顺序已保存');
      return;
    }
    const result = await reorderTavernPresetPrompts(detailPresetName.value, orderedIds);
    activePreset.value = result.preset;
    if (!result.liveSynced) {
      toastr.warning('顺序已经保存，但当前生效副本刷新失败；重新切换预设后会生效');
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}

function finishPromptDrag(event: PointerEvent) {
  if (event.pointerId !== promptDrag.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  const task = commitPromptDrag();
  resetPromptDrag();
  void task;
}

function cancelPromptDrag(event: PointerEvent) {
  if (event.pointerId !== promptDrag.pointerId) return;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  resetPromptDrag();
}

async function savePromptContent() {
  if (!activePrompt.value || !editorDirty.value || saving.value || !editorNameDraft.value.trim()) return;
  saving.value = true;
  try {
    const patch: Partial<Pick<TavernPresetPrompt, 'content' | 'name' | 'role'>> = {
      name: editorNameDraft.value.trim(),
      role: editorRoleDraft.value,
    };
    if (typeof activePrompt.value.content === 'string') patch.content = editorDraft.value;
    if (isPluginDetail.value) {
      activePreset.value = await pluginPresets.updatePrompt(detailPluginPresetId.value, activePrompt.value.id, patch);
      toastr.success('插件预设条目已保存');
      await phone.goBack();
      return;
    }
    const result = await updateTavernPresetPrompt(detailPresetName.value, activePrompt.value.id, {
      ...patch,
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

async function savePromptCopy() {
  const source = copySourcePrompt.value;
  if (!source || typeof source.content !== 'string' || saving.value || !copyDraft.name.trim()) return;
  saving.value = true;
  try {
    if (isPluginDetail.value) {
      const result = await pluginPresets.duplicatePrompt(detailPluginPresetId.value, source.id, {
        content: copyDraft.content,
        enabled: copyDraft.enabled,
        name: copyDraft.name,
        role: copyDraft.role,
      });
      activePreset.value = result.preset;
      toastr.success('副本已插入原条目下方');
      await phone.goBack();
      return;
    }
    const result = await duplicateTavernPresetPrompt(detailPresetName.value, source.id, {
      content: copyDraft.content,
      enabled: copyDraft.enabled,
      name: copyDraft.name,
      role: copyDraft.role,
    });
    activePreset.value = result.preset;
    if (result.liveSynced) {
      toastr.success('副本已插入原条目下方');
    } else {
      toastr.warning('副本已经保存，但当前生效副本刷新失败；重新切换预设后会生效');
    }
    await phone.goBack();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}

async function removePrompt() {
  const prompt = activePrompt.value;
  if (!prompt || saving.value) return;
  const placeholderWarning = typeof prompt.content !== 'string' ? '这是酒馆占位条目，删除后会改变提示词结构。' : '';
  const matchingBindings = entryLibrary.bindings.filter(
    binding =>
      !isPluginDetail.value &&
      binding.presetName === detailPresetName.value &&
      binding.targetPromptSource === 'prompts' &&
      binding.targetPromptId === prompt.id,
  );
  const bindingWarning = matchingBindings.length ? `关联的 ${matchingBindings.length} 条条目库绑定也会删除。` : '';
  const shouldDelete = await phone.confirmNotice(
    [`要删除预设条目“${prompt.name || prompt.id}”吗？`, placeholderWarning, bindingWarning].filter(Boolean).join('\n'),
    { confirmLabel: '删除', kind: 'warning' },
  );
  if (!shouldDelete || saving.value) return;

  saving.value = true;
  try {
    if (isPluginDetail.value) {
      activePreset.value = await pluginPresets.removePrompt(detailPluginPresetId.value, prompt.id);
      toastr.success('插件预设条目已删除');
      await phone.goBack();
      return;
    }
    const result = await deleteTavernPresetPrompt(detailPresetName.value, prompt.id);
    matchingBindings.forEach(binding => entryLibrary.deleteBinding(binding.id));
    activePreset.value = result.preset;
    if (result.liveSynced) {
      toastr.success('预设条目已删除');
    } else {
      toastr.warning('条目已经删除，但当前生效副本刷新失败；重新切换预设后会生效');
    }
    await phone.goBack();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}

function exportActivePreset() {
  if (!isPluginDetail.value || !detailPluginPresetId.value) return;
  try {
    const payload = pluginPresets.exportPreset(detailPluginPresetId.value);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${detailPresetName.value.replace(/[\\/:*?"<>|]/gu, '_') || '插件预设'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toastr.success('插件预设已导出');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

watch(
  () => [
    route.value.appId,
    route.value.page,
    route.value.params?.presetName,
    route.value.params?.presetId,
    route.value.params?.presetSource,
    route.value.params?.promptId,
    route.value.params?.sourcePromptId,
  ],
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
.pc-preset-manager {
  height: 100%;
  min-height: 0;
}
</style>
