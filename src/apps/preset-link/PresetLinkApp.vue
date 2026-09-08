<template>
  <section class="pc-preset-link-app">
    <div class="pc-compact-toolbar pc-preset-link-head">
      <div class="pc-list-row-copy">
        <strong>{{ phone.viewingScopeMeta.chatTitle || '当前聊天' }}</strong>
        <small>{{ phone.isViewingCurrentChat ? '当前聊天' : '历史聊天' }}</small>
      </div>
      <button
        class="pc-icon-btn"
        type="button"
        :disabled="loading || locked"
        title="刷新预设列表"
        aria-label="刷新预设列表"
        @click="refreshPresets"
      >
        <i :class="['fa-solid fa-rotate-right', { spinning: loading }]"></i>
      </button>
    </div>

    <section class="pc-page-section pc-preset-link-panel">
      <div class="pc-preset-link-status">
        <span>已绑定预设</span>
        <strong>{{ binding?.presetName || '未绑定' }}</strong>
        <small v-if="dirty" role="status">未保存</small>
        <small v-if="phone.isViewingCurrentChat">酒馆当前使用：{{ loadedPresetName || '未知' }}</small>
      </div>

      <label class="pc-field-group">
        <span class="pc-field-label">酒馆预设</span>
        <SearchableCombobox
          :key="selectorRevision"
          :model-value="draftPresetName"
          :options="presetOptions"
          :disabled="locked"
          placeholder="选择或搜索预设"
          @update:model-value="selectPreset"
        />
      </label>

      <div class="pc-preset-link-option">
        <div>
          <strong>重新加载聊天应用正则</strong>
          <small>切换预设时重新载入当前聊天</small>
        </div>
        <label class="pc-toggle" title="重新加载聊天应用正则">
          <input v-model="draftReloadRegex" type="checkbox" :disabled="locked" aria-label="重新加载聊天应用正则" />
          <span aria-hidden="true"></span>
        </label>
      </div>

      <PresetBindingSwitches
        v-model="draftPromptStates"
        :preset-name="draftPresetName"
        :loaded-preset-name="loadedPresetName"
        :current-chat="phone.isViewingCurrentChat"
        :disabled="locked"
      />

      <div class="pc-form-actions pc-preset-link-actions">
        <button v-if="binding" class="pc-soft-btn danger" type="button" :disabled="locked" @click="removeBinding">
          解除绑定
        </button>
        <button class="pc-soft-btn" type="button" :disabled="locked || !draftPresetName" @click="saveBinding">
          {{ binding ? '更新绑定' : '保存绑定' }}
        </button>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="locked || !phone.isViewingCurrentChat || !draftPresetName"
          @click="applyPreset"
        >
          立即应用
        </button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { getCurrentTavernPresetName, listTavernPresets, readTavernPreset } from '@/apps/preset-manager/api';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import { usePresetLinkStore } from './store';
import PresetBindingSwitches from './PresetBindingSwitches.vue';
import { snapshotPromptStates, type PresetPromptStates } from './promptSwitches';

const phone = usePhoneStore();
const presetLinks = usePresetLinkStore();
const loading = ref(false);
const busy = ref(false);
const confirming = ref(false);
const selectorRevision = ref(0);
const locked = computed(() => busy.value || presetLinks.applying || confirming.value);
const presetNames = ref<string[]>([]);
const loadedPresetName = ref('');
const draftPresetName = ref('');
const draftReloadRegex = ref(false);
const draftPromptStates = ref<PresetPromptStates>();
const scopeKey = computed(() => phone.viewingScopeKey);
const binding = computed(() => presetLinks.getBinding(scopeKey.value));
const presetOptions = computed(() => presetNames.value.map(name => ({ label: name, value: name })));
const draft = computed(() => ({
  presetName: draftPresetName.value,
  reloadRegex: draftReloadRegex.value,
  promptStates: draftPromptStates.value,
}));
const baseline = ref(klona(draft.value));
const dirty = computed(() => !_.isEqual(draft.value, baseline.value));

function initialStates(name: string) {
  const stored = binding.value;
  if (stored?.presetName === name) return stored.promptStates ? { ...stored.promptStates } : undefined;
  return name ? snapshotPromptStates(readTavernPreset(name)) : undefined;
}

function refreshDraft() {
  loadedPresetName.value = getCurrentTavernPresetName();
  const stored = binding.value;
  draftPresetName.value = stored?.presetName || (phone.isViewingCurrentChat ? loadedPresetName.value : '');
  draftReloadRegex.value = stored?.reloadRegex ?? false;
  try {
    draftPromptStates.value = initialStates(draftPresetName.value);
  } catch (error) {
    draftPromptStates.value = undefined;
    toastr.error(error instanceof Error ? error.message : String(error));
  }
  baseline.value = klona(draft.value);
}

async function confirmDiscard() {
  if (!dirty.value) return true;
  if (confirming.value) return false;
  confirming.value = true;
  try {
    return await phone.confirmNotice('预设绑定有未保存的修改，确定放弃吗？', {
      title: '未保存的绑定',
      confirmLabel: '放弃修改',
      cancelLabel: '继续编辑',
      kind: 'warning',
    });
  } finally {
    confirming.value = false;
  }
}

async function selectPreset(name: string) {
  if (name === draftPresetName.value || locked.value) return;
  const targetScope = scopeKey.value;
  if (!(await confirmDiscard()) || targetScope !== scopeKey.value) {
    // The combobox keeps its chosen label until its model changes; discard keeps the old model.
    selectorRevision.value += 1;
    return;
  }
  try {
    const states = initialStates(name);
    draftPresetName.value = name;
    draftReloadRegex.value = binding.value?.reloadRegex ?? false;
    draftPromptStates.value = states;
  } catch (error) {
    selectorRevision.value += 1;
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

function refreshPresets() {
  loading.value = true;
  try {
    presetNames.value = listTavernPresets();
    loadedPresetName.value = getCurrentTavernPresetName();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
  }
}

function saveBinding() {
  try {
    presetLinks.saveBinding(scopeKey.value, {
      presetName: draftPresetName.value,
      reloadRegex: draftReloadRegex.value,
      promptStates: draftPromptStates.value,
    });
    baseline.value = klona(draft.value);
    toastr.success(phone.isViewingCurrentChat ? '已保存当前聊天绑定' : '已保存历史聊天绑定');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  }
}

async function applyPreset() {
  busy.value = true;
  try {
    const result = await presetLinks.applySelection(
      scopeKey.value,
      { presetName: draftPresetName.value, reloadRegex: draftReloadRegex.value, promptStates: draftPromptStates.value },
      true,
    );
    if (!result.applied) return;
    loadedPresetName.value = getCurrentTavernPresetName();
    toastr.success(result.reloaded ? '已应用预设并重新加载聊天' : '已应用预设绑定设置');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    busy.value = false;
  }
}

async function removeBinding() {
  const targetScope = scopeKey.value;
  const confirmed = await phone.confirmNotice(`解除当前聊天与预设“${binding.value?.presetName}”的绑定？`, {
    confirmLabel: '解除',
    kind: 'warning',
    title: '解除预设绑定',
  });
  if (!confirmed || targetScope !== scopeKey.value) return;
  busy.value = true;
  try {
    await presetLinks.removeBinding(targetScope);
    refreshDraft();
    toastr.success('已解除预设绑定');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    busy.value = false;
  }
}

watch([scopeKey, binding, () => binding.value?.presetName], refreshDraft);
const stopNavigationGuard = phone.registerNavigationGuard(async () => {
  if (phone.currentRoute.appId !== 'preset-link') return true;
  if (locked.value) return false;
  const allowed = await confirmDiscard();
  if (allowed) refreshDraft();
  return allowed;
});
onBeforeUnmount(stopNavigationGuard);
onActivated(() => {
  refreshPresets();
  refreshDraft();
});
onMounted(() => {
  refreshPresets();
  refreshDraft();
});
</script>

<style scoped>
.pc-preset-link-app,
.pc-preset-link-panel,
.pc-preset-link-status {
  display: grid;
  gap: 12px;
}
.pc-preset-link-head,
.pc-preset-link-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pc-preset-link-status {
  gap: 3px;
}
.pc-preset-link-status span,
.pc-preset-link-status small,
.pc-preset-link-option small {
  color: var(--pc-muted);
  font-size: 12px;
}
.pc-preset-link-option > div {
  display: grid;
  gap: 3px;
}
.pc-preset-link-actions > button {
  min-width: 0;
  flex: 1;
}
@media (max-width: 370px) {
  .pc-preset-link-actions {
    flex-wrap: wrap;
  }
}
</style>
