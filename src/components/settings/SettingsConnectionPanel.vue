<template>
  <div class="pc-settings-panel-stack">
    <section class="pc-page-section pc-settings-card">
      <div class="pc-row pc-row-top">
        <strong>生成默认值</strong>
        <button
          class="pc-icon-btn"
          type="button"
          title="恢复生成默认值"
          aria-label="恢复生成默认值"
          @click="settingsStore.resetGenerationDefaults()"
        >
          <i class="fa-solid fa-rotate-left"></i>
        </button>
      </div>
      <label class="pc-field-group"
        ><span class="pc-field-label">来源楼层模式</span
        ><select v-model="settings.generation.sourceMode" class="pc-select">
          <option value="none">不使用聊天楼层</option>
          <option value="latest">最新楼层</option>
          <option value="fromStart">从 0 到指定楼层</option>
          <option value="all">全部楼层</option>
          <option value="single">指定单层</option>
          <option value="recent">最近 N 楼</option>
          <option value="range">自定义范围</option>
        </select></label
      >
      <label v-if="settings.generation.sourceMode === 'fromStart'" class="pc-field-group">
        <span class="pc-field-label">默认结束楼层</span>
        <input v-model.number="settings.generation.fromStartEnd" class="pc-field" type="number" min="0" />
      </label>
      <label class="pc-field-group"
        ><span class="pc-field-label">生成预设</span>
        <div class="pc-preset-select-row">
          <SearchableCombobox
            v-model="settings.generation.tavernPresetName"
            input-label="选择生成预设"
            :options="tavernPresetOptions"
            placeholder="跟随酒馆当前预设"
          />
          <button
            class="pc-icon-btn"
            type="button"
            title="刷新酒馆预设列表"
            aria-label="刷新酒馆预设列表"
            @click="refreshTavernPresetNames"
          >
            <i class="fa-solid fa-rotate"></i>
          </button>
        </div>
      </label>
      <label class="pc-field-group"
        ><span class="pc-field-label"
          >RPM 请求限制
          <InfoHint text="限制任意连续 60 秒内的生成请求数，0 表示不限制。重试和批量任务共享计数。" /></span
        ><input v-model.number="settings.generation.rpmLimit" class="pc-field" type="number" min="0" max="120"
      /></label>
      <div class="pc-connection-setting-row">
        <strong>结果去向</strong>
        <div class="pc-segment">
          <button
            :class="['pc-segment-btn', { active: settings.generation.resultMode === 'preview' }]"
            type="button"
            @click="settings.generation.resultMode = 'preview'"
          >
            预览</button
          ><button
            :class="['pc-segment-btn', { active: settings.generation.resultMode === 'save' }]"
            type="button"
            @click="settings.generation.resultMode = 'save'"
          >
            直接保存
          </button>
        </div>
      </div>
      <label class="pc-connection-setting-row">
        <strong>默认开启流式</strong>
        <span class="pc-toggle"><input v-model="settings.generation.stream" type="checkbox" /><span></span></span>
      </label>
      <div class="pc-settings-subsection">
        <div class="pc-connection-setting-row">
          <strong class="pc-setting-title-with-hint"
            ><span>解析前清理思维链</span>
            <InfoHint
              text="找到配置的 XML 结束标签后，从正文中移除该标签及其之前的内容，再交给 App 解析；被移除的原文会随生成记录独立保存，可在阅读详情或写卡预览中查看。找不到标签时不会修改输出。"
          /></strong>
          <label class="pc-toggle" title="启用或关闭解析前思维链清理">
            <input v-model="settings.generation.outputCleaningEnabled" type="checkbox" /><span></span>
          </label>
        </div>
        <label v-if="settings.generation.outputCleaningEnabled" class="pc-field-group">
          <span class="pc-field-label">思维链结束标签（每行一个）</span>
          <textarea
            v-model="settings.generation.outputCleaningEndTags"
            class="pc-area compact"
            placeholder="</think>"
          ></textarea>
        </label>
      </div>
      <div class="pc-settings-subsection">
        <div class="pc-row pc-row-top">
          <strong
            >当前聊天称呼替换
            <InfoHint
              text="仅保存于当前聊天，生成时将 {{char}} 和 {{user}} 替换为指定称呼；不会修改聊天原文或引用内容。" /></strong
          ><button
            class="pc-icon-btn"
            type="button"
            title="互换角色与用户称呼"
            aria-label="互换角色与用户称呼"
            @click="swapGenerationAliases"
          >
            <i class="fa-solid fa-right-left"></i>
          </button>
        </div>
        <div class="pc-settings-alias-grid">
          <label class="pc-field-group"
            ><span class="pc-field-label"><code v-text="'{{char}}'"></code> 替换</span
            ><input v-model="charReplacement" class="pc-field" type="text" placeholder="角色称呼" /></label
          ><label class="pc-field-group"
            ><span class="pc-field-label"><code v-text="'{{user}}'"></code> 替换</span
            ><input v-model="userReplacement" class="pc-field" type="text" placeholder="用户称呼"
          /></label>
        </div>
      </div>
    </section>

    <section class="pc-page-section pc-settings-card">
      <div class="pc-row pc-row-top">
        <strong>文本通道</strong>
        <button
          class="pc-icon-btn"
          type="button"
          title="恢复文本通道默认值"
          aria-label="恢复文本通道默认值"
          @click="settingsStore.resetTextProvider()"
        >
          <i class="fa-solid fa-rotate-left"></i>
        </button>
      </div>
      <div class="pc-segment">
        <button
          :class="['pc-segment-btn', { active: settings.textProvider.mode === 'tavern' }]"
          type="button"
          @click="settings.textProvider.mode = 'tavern'"
        >
          酒馆当前 API</button
        ><button
          :class="['pc-segment-btn', { active: settings.textProvider.mode === 'external' }]"
          type="button"
          @click="enableExternalMode"
        >
          外部兼容 API
        </button>
      </div>
      <template v-if="settings.textProvider.mode === 'external'">
        <label class="pc-field-group"
          ><span class="pc-field-label">外部 API 配置</span>
          <div class="pc-asset-field">
            <SearchableCombobox
              :model-value="settings.textProvider.activeExternalProfileId"
              input-label="选择外部 API 配置"
              :options="externalProfileOptions"
              placeholder="请选择配置"
              @update:model-value="settingsStore.setActiveExternalApiProfile"
            />
            <button
              class="pc-icon-btn"
              type="button"
              title="新建外部 API 配置"
              aria-label="新建外部 API 配置"
              @click="createExternalProfile"
            >
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </label>
        <EmptyState v-if="!activeExternalProfile" compact title="还没有外部 API 配置，请先新建" />
        <template v-else>
          <label class="pc-field-group"
            ><span class="pc-field-label">配置名称</span
            ><input
              :value="activeExternalProfile.name"
              class="pc-field"
              type="text"
              placeholder="例如 DeepSeek 写作"
              @change="onExternalProfileNameChange"
          /></label>
          <label class="pc-field-group"
            ><span class="pc-field-label">服务类型</span
            ><select class="pc-select" :value="activeExternalProfile.presetId" @change="onExternalProfilePresetChange">
              <option v-for="preset in EXTERNAL_API_PRESETS" :key="preset.id" :value="preset.id">
                {{ preset.label }}
              </option>
            </select></label
          >
          <label class="pc-field-group"
            ><span class="pc-field-label">接口地址</span
            ><input
              :value="resolvedExternalApiUrl"
              class="pc-field"
              type="text"
              :disabled="activeExternalProfile.presetId !== 'custom'"
              placeholder="例如 https://api.example.com/v1"
              @change="onExternalApiUrlChange"
            /><span v-if="externalUrlStatus" class="pc-field-note">{{ externalUrlStatus }}</span></label
          >
          <label class="pc-field-group"
            ><span class="pc-field-label">API Key</span>
            <div class="pc-secret-field">
              <input
                v-model="activeExternalProfile.apiKey"
                class="pc-field"
                :type="apiKeyVisible ? 'text' : 'password'"
                placeholder="仅保存在本机设置，备份不会包含 Key。"
              /><button
                class="pc-icon-btn"
                type="button"
                :title="apiKeyVisible ? '隐藏 API Key' : '显示 API Key'"
                :aria-label="apiKeyVisible ? '隐藏 API Key' : '显示 API Key'"
                @click="apiKeyVisible = !apiKeyVisible"
              >
                <i class="fa-solid" :class="apiKeyVisible ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button></div
          ></label>
          <label class="pc-field-group"
            ><span class="pc-field-label">模型</span>
            <div class="pc-asset-field">
              <SearchableCombobox
                v-model="activeExternalProfile.model"
                allow-custom
                input-label="选择或填写模型"
                :options="externalModelSelectOptions"
                placeholder="获取模型或直接填写模型名"
              /><button
                class="pc-icon-btn"
                type="button"
                :disabled="externalModelLoading"
                title="获取模型列表"
                aria-label="获取模型列表"
                @click="refreshExternalModels"
              >
                <i class="fa-solid" :class="externalModelLoading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'"></i>
              </button></div
          ></label>
          <button class="pc-soft-btn danger" type="button" @click="deleteActiveExternalProfile">
            <i class="fa-solid fa-trash"></i><span>删除当前配置</span>
          </button>
        </template>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import InfoHint from '@/components/InfoHint.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useGenerationAliasesStore } from '@/store/generationAliases';
import { usePhoneStore } from '@/store/phone';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { useSettingsStore } from '@/store/settings';
import type { ExternalApiPresetId } from '@/type/settings';
import { getPresetNamesSafe } from '@/util/runtime';
import { EXTERNAL_API_PRESETS, getActiveExternalApiProfile, resolveExternalApiProfileUrl } from '@/util/textProvider';
import { storeToRefs } from 'pinia';
import { pluginPresetIdFromSelection, pluginPresetSelection } from '@/apps/preset-manager/pluginPreset';

const aliases = useGenerationAliasesStore();
const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const pluginPresets = usePluginPresetStore();
const { settings } = storeToRefs(settingsStore);
const { charReplacement, userReplacement } = storeToRefs(aliases);
const { items: pluginPresetItems } = storeToRefs(pluginPresets);
const tavernPresetNames = ref<string[]>([]);
const apiKeyVisible = ref(false);
const externalModelLoading = ref(false);
const externalModelOptions = ref<Record<string, string[]>>({});
const activeExternalProfile = computed(() => getActiveExternalApiProfile(settings.value.textProvider));
const externalProfileOptions = computed(() => [
  { label: '请选择配置', value: '' },
  ...settings.value.textProvider.externalProfiles.map(profile => ({ label: profile.name, value: profile.id })),
]);
const resolvedExternalApiUrl = computed(() =>
  activeExternalProfile.value ? resolveExternalApiProfileUrl(activeExternalProfile.value) : '',
);
const tavernPresetOptions = computed(() => {
  const selected = settings.value.generation.tavernPresetName.trim();
  const names = new Set(tavernPresetNames.value);
  if (selected && !pluginPresetIdFromSelection(selected)) names.add(selected);
  return [
    { label: '跟随酒馆当前预设', value: '' },
    ...pluginPresetItems.value.map(preset => ({
      group: '插件预设',
      label: preset.name,
      value: pluginPresetSelection(preset.id),
    })),
    ...[...names].filter(Boolean).map(name => ({ group: '酒馆预设', label: name, value: name })),
  ];
});
const externalModelSelectOptions = computed(() => {
  const profile = activeExternalProfile.value;
  if (!profile) return [];
  const options = externalModelOptions.value[profile.id] ?? [];
  const selected = profile.model.trim();
  return (selected && !options.includes(selected) ? [selected, ...options] : options).map(model => ({
    label: model,
    value: model,
  }));
});
const externalUrlStatus = computed(() => {
  if (settings.value.textProvider.mode !== 'external') return '';
  const url = resolvedExternalApiUrl.value;
  if (!url) return '请填写外部 API 地址';
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol) ? '' : '仅支持 http / https 地址';
  } catch {
    return '地址格式无效';
  }
});

function swapGenerationAliases() {
  const value = charReplacement.value;
  charReplacement.value = userReplacement.value;
  userReplacement.value = value;
}
function refreshTavernPresetNames() {
  tavernPresetNames.value = getPresetNamesSafe();
  const selected = settings.value.generation.tavernPresetName.trim();
  if (selected && !pluginPresetIdFromSelection(selected) && !tavernPresetNames.value.includes(selected)) {
    tavernPresetNames.value.unshift(selected);
  }
}
function enableExternalMode() {
  if (!settings.value.textProvider.externalProfiles.length) settingsStore.createExternalApiProfile('custom');
  else settings.value.textProvider.mode = 'external';
}
function createExternalProfile() {
  settingsStore.createExternalApiProfile('custom');
}
function onExternalProfileNameChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const profile = activeExternalProfile.value;
  if (!profile) return;
  try {
    settingsStore.renameExternalApiProfile(profile.id, input.value);
  } catch (error) {
    input.value = profile.name;
    toastr.warning(error instanceof Error ? error.message : '配置名称无效');
  }
}
function onExternalProfilePresetChange(event: Event) {
  const profile = activeExternalProfile.value;
  if (!profile) return;
  settingsStore.setExternalApiProfilePreset(
    profile.id,
    (event.target as HTMLSelectElement).value as ExternalApiPresetId,
  );
  externalModelOptions.value = { ...externalModelOptions.value, [profile.id]: [] };
}
function onExternalApiUrlChange(event: Event) {
  settingsStore.setTextProviderApiUrl((event.target as HTMLInputElement).value);
  const profile = activeExternalProfile.value;
  if (profile)
    externalModelOptions.value = {
      ...externalModelOptions.value,
      [profile.id]: profile.model.trim() ? [profile.model.trim()] : [],
    };
}
async function deleteActiveExternalProfile() {
  const profile = activeExternalProfile.value;
  if (
    !profile ||
    !(await phone.confirmNotice(`删除外部 API 配置“${profile.name}”吗？API Key 和模型设置也会一并删除。`, {
      confirmLabel: '删除',
      kind: 'warning',
      title: '删除外部 API 配置？',
    }))
  )
    return;
  settingsStore.deleteExternalApiProfile(profile.id);
  const next = { ...externalModelOptions.value };
  delete next[profile.id];
  externalModelOptions.value = next;
}
async function refreshExternalModels() {
  const profile = activeExternalProfile.value;
  const apiUrl = resolvedExternalApiUrl.value;
  if (!profile) return void toastr.warning('请先新建外部 API 配置');
  if (!apiUrl) return void toastr.warning('请先填写接口地址');
  externalModelLoading.value = true;
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (profile.apiKey.trim()) headers.Authorization = `Bearer ${profile.apiKey.trim()}`;
    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/models`, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const models = Array.isArray(payload?.data)
      ? payload.data.map((item: unknown) =>
          typeof item === 'string'
            ? item
            : item && typeof item === 'object' && 'id' in item
              ? String((item as { id?: unknown }).id || '')
              : '',
        )
      : [];
    const options = [...new Set<string>(models.map((model: string) => model.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
    externalModelOptions.value = { ...externalModelOptions.value, [profile.id]: options };
    if (!options.length) throw new Error('没有读取到模型');
    if (!profile.model.trim()) profile.model = options[0];
    toastr.success(`已获取 ${options.length} 个模型`);
  } catch (error) {
    toastr.error(`获取模型失败：${error instanceof Error ? error.message : '获取模型失败'}`);
  } finally {
    externalModelLoading.value = false;
  }
}
onMounted(refreshTavernPresetNames);
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
  gap: 0;
}
.pc-settings-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pc-row-top {
  align-items: flex-start;
}
.pc-row > div {
  min-width: 0;
}
.pc-connection-setting-row {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pc-connection-setting-row .pc-segment {
  flex: 0 1 230px;
  min-width: 0;
}
.pc-connection-setting-row .pc-segment-btn {
  flex: 1;
}
.pc-setting-title-with-hint {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}
.pc-preset-select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
.pc-settings-subsection {
  display: grid;
  gap: 12px;
  border-top: 1px solid var(--pc-border);
  padding-top: 14px;
}
.pc-settings-alias-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.pc-asset-field,
.pc-secret-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px;
  align-items: center;
  gap: 8px;
}
.pc-field-note {
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.4;
}
.pc-soft-btn.danger,
.pc-icon-btn.danger {
  color: var(--pc-danger);
}
@media (max-width: 420px) {
  .pc-settings-alias-grid {
    grid-template-columns: 1fr;
  }
}
</style>
