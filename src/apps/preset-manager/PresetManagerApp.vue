<template>
  <section class="pc-preset-manager">
    <PresetCatalogPage
      v-if="route.page === 'root'"
      v-model:query="presetQuery"
      :error-message="errorMessage"
      :loaded-preset-name="loadedPresetName"
      :loading="loading"
      :preset-names="presetNames"
      :switching-preset="switchingPreset"
      :visible-preset-names="visiblePresetNames"
      @open="openPreset"
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
      :preset="activePreset"
      :preset-name="detailPresetName"
      :prompt-drag="promptDrag"
      :switching-preset="switchingPreset"
      @copy-prompt="openPromptCopy"
      @drag-cancel="cancelPromptDrag"
      @drag-end="finishPromptDrag"
      @drag-move="movePromptDrag"
      @drag-start="startPromptDrag"
      @delete-preset="removePreset"
      @open-prompt="openPromptEditor"
      @rename-preset="renamePreset"
      @switch-preset="switchPreset"
      @toggle-group="toggleGroup"
      @toggle-prompt="togglePrompt"
    />

    <PresetPromptEditorPage
      v-else-if="route.page === 'edit' && activePrompt"
      v-model:draft="editorDraft"
      :dirty="editorDirty"
      :preset-name="detailPresetName"
      :prompt="activePrompt"
      :role-label="promptRoleLabel(activePrompt.role)"
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
import { usePresetLinkStore } from '@/apps/preset-link/store';
import { usePhoneStore } from '@/store/phone';
import {
  buildPresetDisplayNodes,
  deleteTavernPreset,
  deleteTavernPresetPrompt,
  duplicateTavernPresetPrompt,
  getCurrentTavernPresetName,
  listTavernPresets,
  loadTavernPreset,
  readTavernPreset,
  renameTavernPreset,
  reorderTavernPresetPrompts,
  updateTavernPresetPrompt,
  type TavernPreset,
  type TavernPresetPrompt,
} from './api';
import PresetCatalogPage from './pages/PresetCatalogPage.vue';
import PresetDetailPage from './pages/PresetDetailPage.vue';
import PresetPromptCopyPage from './pages/PresetPromptCopyPage.vue';
import PresetPromptEditorPage from './pages/PresetPromptEditorPage.vue';

const phone = usePhoneStore();
const entryLibrary = useEntryLibraryStore();
const presetLinks = usePresetLinkStore();
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

const detailPresetName = computed(() => route.value.params?.presetName || '');
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
const mutationBusy = computed(() => saving.value || busyPromptIds.value.size > 0 || promptDrag.isDragging);

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
  phone.pushRoute('preset-manager', 'detail', '预设条目', { presetName });
}

function openPromptEditor(prompt: TavernPresetPrompt) {
  phone.pushRoute('preset-manager', 'edit', '编辑预设条目', {
    presetName: detailPresetName.value,
    promptId: prompt.id,
  });
}

function openPromptCopy(prompt: TavernPresetPrompt) {
  if (typeof prompt.content !== 'string' || mutationBusy.value) return;
  phone.pushRoute('preset-manager', 'copy', '复制预设条目', {
    presetName: detailPresetName.value,
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
  const requested = await phone.promptNotice(
    '输入新的预设名称。改名后，聊天预设绑定、阅读规则绑定和收藏条目绑定会一起迁移。',
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
    const result = await renameTavernPreset(oldName, newName);
    const migrated =
      presetLinks.migratePresetReferences(oldName, newName) + entryLibrary.migratePresetReferences(oldName, newName);
    if (result.current) loadedPresetName.value = newName;
    await refreshRoot();
    phone.replaceRoute('preset-manager', 'detail', '预设条目', { presetName: newName });
    toastr.success(`预设已改名，并迁移 ${migrated} 处手机引用`);
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
    `确认删除预设“${presetName}”吗？相关聊天绑定、阅读规则绑定和收藏条目绑定也会移除。当前正在使用的预设不能删除。`,
    { confirmLabel: '删除', kind: 'warning' },
  );
  if (!confirmed) return;
  saving.value = true;
  try {
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

async function savePromptCopy() {
  const source = copySourcePrompt.value;
  if (!source || typeof source.content !== 'string' || saving.value || !copyDraft.name.trim()) return;
  saving.value = true;
  try {
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

watch(
  () => [
    route.value.appId,
    route.value.page,
    route.value.params?.presetName,
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
