<template>
  <section class="pc-preset-link-app">
    <article class="pc-section-card pc-preset-link-status">
      <div class="pc-preset-link-status-head">
        <div class="pc-preset-link-scope">
          <span class="pc-kicker">{{ phone.isViewingCurrentChat ? t`当前聊天` : t`历史聊天` }}</span>
          <strong>{{ phone.viewingScopeMeta.chatTitle }}</strong>
          <small>{{ phone.viewingScopeMeta.ownerName }}</small>
        </div>
        <button class="pc-icon-btn" type="button" :disabled="busy" :title="t`刷新预设状态`" @click="refresh">
          <i class="fa-solid fa-rotate"></i>
        </button>
      </div>

      <div class="pc-preset-link-state-list">
        <div class="pc-preset-link-state">
          <span>{{ t`绑定预设` }}</span>
          <strong>{{ binding?.presetName || t`未绑定` }}</strong>
          <small v-if="binding">
            {{ binding.reloadRegex ? t`切换聊天时应用并重新加载正则` : t`切换聊天时自动应用` }}
          </small>
          <small v-else>{{ t`这个聊天尚未保存预设绑定` }}</small>
        </div>
        <div class="pc-preset-link-state">
          <span>{{ t`酒馆当前预设` }}</span>
          <strong>{{ currentPresetName || t`未读取到当前预设` }}</strong>
          <small v-if="phone.isViewingCurrentChat && binding">
            {{ currentMatchesBinding ? t`当前状态与绑定一致` : t`当前状态与绑定不同` }}
          </small>
          <small v-else-if="phone.isViewingCurrentChat">{{ t`当前聊天没有绑定预设` }}</small>
          <small v-else>{{ t`这是酒馆当前打开聊天的实时状态` }}</small>
        </div>
      </div>
    </article>

    <article class="pc-editor-card pc-preset-link-editor">
      <label class="pc-field-group">
        <span>{{ t`选择预设` }}</span>
        <select v-model="draftPresetName" class="pc-select">
          <option value="">{{ t`请选择预设` }}</option>
          <option v-for="presetName in presetNames" :key="presetName" :value="presetName">{{ presetName }}</option>
        </select>
      </label>

      <div class="pc-preset-link-option">
        <div>
          <strong>{{ t`重新加载聊天应用正则` }}</strong>
          <small>{{ enabledRegexCount ? `${enabledRegexCount} 条启用正则` : t`当前选择没有启用正则` }}</small>
        </div>
        <label class="pc-toggle" :title="t`切换预设后重新加载一次聊天`">
          <input v-model="draftReloadRegex" type="checkbox" :aria-label="t`重新加载聊天应用正则`" />
          <span aria-hidden="true"></span>
        </label>
      </div>

      <p v-if="!phone.isViewingCurrentChat" class="pc-preset-link-history-note">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <span>{{ t`绑定会在以后打开这个聊天时自动应用；当前不能直接应用到历史聊天。` }}</span>
      </p>

      <div class="pc-form-actions pc-preset-link-actions">
        <button v-if="binding" class="pc-soft-btn" type="button" :disabled="busy" @click="removeBinding">
          {{ busyAction === 'remove' ? t`解除中` : t`解除绑定` }}
        </button>
        <button class="pc-soft-btn" type="button" :disabled="busy || !draftPresetName" @click="saveBinding">
          {{ busyAction === 'save' ? t`保存中` : t`保存绑定` }}
        </button>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="busy || !draftPresetName || !phone.isViewingCurrentChat"
          @click="applySelection"
        >
          {{ busyAction === 'apply' ? t`应用中` : t`应用当前选择` }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { getCurrentTavernPresetName, listTavernPresets } from '@/apps/preset-manager/api';
import { usePhoneStore } from '@/store/phone';
import { getEnabledPresetRegexCount } from './api';
import { usePresetLinkStore } from './store';

const phone = usePhoneStore();
const presetLinks = usePresetLinkStore();
const presetNames = ref<string[]>([]);
const currentPresetName = ref('');
const draftPresetName = ref('');
const draftReloadRegex = ref(false);
const busyAction = ref<'apply' | 'remove' | 'save' | ''>('');
const busy = computed(() => Boolean(busyAction.value) || presetLinks.applying);
const scopeKey = computed(() => phone.viewingScopeKey);
const binding = computed(() => presetLinks.getBinding(scopeKey.value));
const currentMatchesBinding = computed(
  () => Boolean(binding.value?.presetName && binding.value.presetName === currentPresetName.value),
);
const enabledRegexCount = computed(() =>
  draftPresetName.value ? getEnabledPresetRegexCount(draftPresetName.value) : 0,
);

function refresh() {
  presetNames.value = listTavernPresets();
  currentPresetName.value = getCurrentTavernPresetName();
  const stored = presetLinks.getBinding(scopeKey.value);
  draftPresetName.value = stored?.presetName || currentPresetName.value || presetNames.value[0] || '';
  draftReloadRegex.value = stored?.reloadRegex ?? false;
}

function saveBinding() {
  busyAction.value = 'save';
  try {
    presetLinks.saveBinding(scopeKey.value, {
      presetName: draftPresetName.value,
      reloadRegex: draftReloadRegex.value,
    });
    toastr.success(phone.isViewingCurrentChat ? '已保存当前聊天的预设绑定' : '已保存历史聊天的预设绑定');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    busyAction.value = '';
  }
}

async function applySelection() {
  if (!phone.isViewingCurrentChat) return;
  busyAction.value = 'apply';
  try {
    const result = await presetLinks.applySelection(
      scopeKey.value,
      {
        presetName: draftPresetName.value,
        reloadRegex: draftReloadRegex.value,
      },
      true,
    );
    currentPresetName.value = getCurrentTavernPresetName();
    if (result.reloaded) {
      toastr.success('已应用预设并重新加载聊天');
    } else if (result.changed) {
      toastr.success('已应用预设');
    } else {
      toastr.info('当前已经是所选预设');
    }
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : String(error));
  } finally {
    busyAction.value = '';
  }
}

async function removeBinding() {
  const target = phone.isViewingCurrentChat ? '当前聊天' : `历史聊天“${phone.viewingScopeMeta.chatTitle}”`;
  const confirmed = await phone.confirmNotice(`解除${target}的预设绑定？当前已经加载的预设不会自动切回。`, {
    confirmLabel: '解除',
    kind: 'warning',
    title: '解除预设绑定',
  });
  if (!confirmed) return;

  busyAction.value = 'remove';
  try {
    presetLinks.removeBinding(scopeKey.value);
    draftPresetName.value = currentPresetName.value || presetNames.value[0] || '';
    draftReloadRegex.value = false;
    toastr.success(`已解除${target}的预设绑定`);
  } finally {
    busyAction.value = '';
  }
}

watch(
  [() => phone.viewingScopeKey, () => presetLinks.revision],
  () => refresh(),
  { immediate: true },
);
onActivated(refresh);
</script>

<style scoped>
.pc-preset-link-app {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-preset-link-status-head,
.pc-preset-link-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-preset-link-scope,
.pc-preset-link-option > div,
.pc-preset-link-state {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.pc-preset-link-scope strong,
.pc-preset-link-scope small,
.pc-preset-link-option small,
.pc-preset-link-state strong,
.pc-preset-link-state small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-preset-link-scope small,
.pc-preset-link-option small,
.pc-preset-link-state small {
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-preset-link-state-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--pc-border);
}

.pc-preset-link-state {
  padding-top: 12px;
}

.pc-preset-link-state + .pc-preset-link-state {
  padding-left: 12px;
  border-left: 1px solid var(--pc-border);
}

.pc-preset-link-state > span {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-preset-link-editor {
  display: grid;
  gap: 14px;
}

.pc-preset-link-option {
  min-height: 46px;
}

.pc-preset-link-history-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.6;
}

.pc-preset-link-history-note i {
  margin-top: 3px;
}

.pc-preset-link-actions > button {
  flex: 1 1 118px;
}

@media (max-width: 390px) {
  .pc-preset-link-state-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .pc-preset-link-state + .pc-preset-link-state {
    padding-left: 0;
    border-left: 0;
  }
}
</style>
