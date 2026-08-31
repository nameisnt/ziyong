<template>
  <div v-if="activeExternalProfile" class="pc-settings-panel-stack pc-external-api-page">
    <section class="pc-page-section">
      <label class="pc-field-group">
        <span class="pc-field-label">配置名称</span>
        <input
          :value="activeExternalProfile.name"
          class="pc-field"
          type="text"
          placeholder="例如 DeepSeek 写作"
          @change="onNameChange"
        />
      </label>
      <label class="pc-field-group">
        <span class="pc-field-label">服务类型</span>
        <select class="pc-select" :value="activeExternalProfile.presetId" @change="onPresetChange">
          <option v-for="preset in EXTERNAL_API_PRESETS" :key="preset.id" :value="preset.id">{{ preset.label }}</option>
        </select>
      </label>
      <label class="pc-field-group">
        <span class="pc-field-label">接口地址</span>
        <input
          :value="resolvedExternalApiUrl"
          class="pc-field"
          type="text"
          :disabled="activeExternalProfile.presetId !== 'custom'"
          placeholder="例如 https://api.example.com/v1"
          @change="onApiUrlChange"
        />
        <span v-if="externalUrlStatus" class="pc-field-note">{{ externalUrlStatus }}</span>
      </label>
      <label class="pc-field-group">
        <span class="pc-field-label">API Key</span>
        <div class="pc-secret-field">
          <input
            v-model="activeExternalProfile.apiKey"
            class="pc-field"
            :type="apiKeyVisible ? 'text' : 'password'"
            placeholder="仅保存在本机，备份不包含 Key"
          />
          <button
            class="pc-icon-btn"
            type="button"
            :title="apiKeyVisible ? '隐藏 API Key' : '显示 API Key'"
            :aria-label="apiKeyVisible ? '隐藏 API Key' : '显示 API Key'"
            @click="apiKeyVisible = !apiKeyVisible"
          >
            <i class="fa-solid" :class="apiKeyVisible ? 'fa-eye-slash' : 'fa-eye'"></i>
          </button>
        </div>
      </label>
      <label class="pc-field-group">
        <span class="pc-field-label">模型</span>
        <div class="pc-model-field">
          <SearchableCombobox
            v-model="activeExternalProfile.model"
            allow-custom
            input-label="选择或填写模型"
            :options="externalModelSelectOptions"
            placeholder="获取模型或直接填写模型名"
          />
          <button
            class="pc-icon-btn"
            type="button"
            :disabled="externalModelLoading"
            title="获取模型列表"
            aria-label="获取模型列表"
            @click="refreshExternalModels"
          >
            <i class="fa-solid" :class="externalModelLoading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'"></i>
          </button>
        </div>
      </label>
    </section>
    <section class="pc-page-section">
      <button class="pc-soft-btn danger" type="button" @click="deleteProfile">
        <i class="fa-solid fa-trash"></i><span>删除当前配置</span>
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import type { ExternalApiPresetId } from '@/type/settings';
import { EXTERNAL_API_PRESETS, getActiveExternalApiProfile, resolveExternalApiProfileUrl } from '@/util/textProvider';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const apiKeyVisible = ref(false);
const externalModelLoading = ref(false);
const externalModelOptions = ref<string[]>([]);
const editingProfileId = computed(() => phone.currentRoute.params?.profileId || '');
const activeExternalProfile = computed(
  () =>
    settings.value.textProvider.externalProfiles.find(profile => profile.id === editingProfileId.value) ??
    getActiveExternalApiProfile(settings.value.textProvider),
);
const resolvedExternalApiUrl = computed(() =>
  activeExternalProfile.value ? resolveExternalApiProfileUrl(activeExternalProfile.value) : '',
);
const externalModelSelectOptions = computed(() => {
  const selected = activeExternalProfile.value?.model.trim() ?? '';
  const models =
    selected && !externalModelOptions.value.includes(selected)
      ? [selected, ...externalModelOptions.value]
      : externalModelOptions.value;
  return models.map(model => ({ label: model, value: model }));
});
const externalUrlStatus = computed(() => {
  const url = resolvedExternalApiUrl.value;
  if (!url) return '请填写外部 API 地址';
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol) ? '' : '仅支持 http / https 地址';
  } catch {
    return '地址格式无效';
  }
});

function onNameChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const profile = activeExternalProfile.value!;
  try {
    settingsStore.renameExternalApiProfile(profile.id, input.value);
  } catch (error) {
    input.value = profile.name;
    toastr.warning(error instanceof Error ? error.message : '配置名称无效');
  }
}
function onPresetChange(event: Event) {
  const profile = activeExternalProfile.value!;
  settingsStore.setExternalApiProfilePreset(
    profile.id,
    (event.target as HTMLSelectElement).value as ExternalApiPresetId,
  );
  externalModelOptions.value = [];
}
function onApiUrlChange(event: Event) {
  settingsStore.setTextProviderApiUrl((event.target as HTMLInputElement).value, activeExternalProfile.value!.id);
  externalModelOptions.value = activeExternalProfile.value!.model.trim()
    ? [activeExternalProfile.value!.model.trim()]
    : [];
}
async function deleteProfile() {
  const profile = activeExternalProfile.value!;
  const confirmed = await phone.confirmNotice(
    `删除外部 API 配置“${profile.name}”吗？API Key 和模型设置也会一并删除。`,
    { confirmLabel: '删除', kind: 'warning', title: '删除外部 API 配置？' },
  );
  if (!confirmed) return;
  settingsStore.deleteExternalApiProfile(profile.id);
  await phone.goBack();
}
async function refreshExternalModels() {
  const profile = activeExternalProfile.value!;
  const apiUrl = resolvedExternalApiUrl.value;
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
    externalModelOptions.value = [...new Set<string>(models.map((model: string) => model.trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
    if (!externalModelOptions.value.length) throw new Error('没有读取到模型');
    if (!profile.model.trim()) profile.model = externalModelOptions.value[0];
    toastr.success(`已获取 ${externalModelOptions.value.length} 个模型`);
  } catch (error) {
    toastr.error(`获取模型失败：${error instanceof Error ? error.message : '获取模型失败'}`);
  } finally {
    externalModelLoading.value = false;
  }
}
</script>

<style scoped>
.pc-settings-panel-stack {
  display: grid;
  height: 100%;
  align-content: start;
  overflow-y: auto;
}
.pc-external-api-page {
  padding-top: 10px;
}
.pc-secret-field,
.pc-model-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
}
</style>
