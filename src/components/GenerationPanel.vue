<template>
  <div class="pc-generation-panel">
    <slot name="before-fields"></slot>

    <slot name="before-requirement" :disabled="controlsDisabled"></slot>

    <slot v-if="showRequirementField" name="requirement" :disabled="controlsDisabled">
      <div class="pc-number-field pc-requirement-field">
      <div class="pc-field-head">
        <label class="pc-field-label">{{ requirementLabel }}</label>
        <button
          class="pc-icon-btn"
          type="button"
          :disabled="controlsDisabled || !quickPhraseGroups.length"
          :title="quickPhraseGroups.length ? t`添加快速短语` : t`还没有快速短语`"
          @click="toggleQuickPhrasePanel"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
      <div v-if="quickPhraseOpen" class="pc-quick-phrase-panel">
        <article v-for="group in quickPhraseGroups" :key="group.id" class="pc-quick-phrase-group">
          <button
            class="pc-quick-phrase-group-toggle"
            type="button"
            :aria-expanded="openQuickPhraseGroupId === group.id"
            @click="toggleQuickPhraseGroup(group.id)"
          >
            <strong>{{ group.name }}</strong>
            <i :class="openQuickPhraseGroupId === group.id ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </button>
          <div v-if="openQuickPhraseGroupId === group.id" class="pc-quick-phrase-list">
            <button
              v-for="phrase in group.phrases"
              :key="phrase.id"
              class="pc-soft-btn compact pc-quick-phrase-chip"
              type="button"
              :aria-label="phrase.text"
              :title="phrase.text"
              @click="appendQuickPhrase(phrase.text)"
            >
              {{ quickPhraseLabel(phrase.text) }}
            </button>
          </div>
        </article>
      </div>
      <textarea
        :value="userRequirement"
        class="pc-area compact"
        :disabled="controlsDisabled"
        :placeholder="requirementPlaceholder"
        @input="emit('update:userRequirement', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      </div>
    </slot>

    <details class="pc-generation-advanced">
      <summary>
        <span class="pc-generation-advanced-title">
          <i class="fa-solid fa-sliders"></i>
          {{ t`来源与预设` }}
        </span>
        <small>{{ advancedSummary }}</small>
        <i class="fa-solid fa-chevron-down pc-generation-advanced-chevron"></i>
      </summary>
      <div class="pc-generation-advanced-body">
        <div class="pc-select-field">
          <label class="pc-field-label">{{ t`本次连接` }}</label>
          <SearchableCombobox
            :disabled="controlsDisabled"
            :empty-label="t`没有可用的连接配置`"
            :input-label="t`选择本次连接`"
            :model-value="generationOverride.connectionSelection"
            :options="connectionOptions"
            :placeholder="t`选择本次连接`"
            :toggle-title="t`展开连接配置`"
            @update:model-value="setConnectionSelection"
          />
        </div>

        <div v-if="showPresetSelector" class="pc-select-field pc-preset-field">
          <label class="pc-field-label">{{ t`本次预设` }}</label>
          <div class="pc-preset-select-row">
            <select
              class="pc-select"
              :disabled="controlsDisabled"
              :value="generationOverride.tavernPresetName"
              @change="setTavernPresetName(($event.target as HTMLSelectElement).value)"
            >
              <option value="">{{ t`跟随酒馆当前预设` }}</option>
              <option v-for="presetName in tavernPresetNames" :key="presetName" :value="presetName">
                {{ presetName }}
              </option>
            </select>
            <button
              class="pc-icon-btn"
              type="button"
              :disabled="controlsDisabled"
              :title="t`刷新预设列表`"
              @click="refreshTavernPresetNames"
            >
              <i class="fa-solid fa-rotate"></i>
            </button>
          </div>
        </div>

        <GenerationSourceFields
          :disabled="controlsDisabled"
          :from-start-end="fromStartEnd"
          :mode="sourceMode"
          :range-text="rangeText"
          :recent-count="recentCount"
          :single-message-id="singleMessageId"
          @update:from-start-end="emit('update:fromStartEnd', $event)"
          @update:mode="emit('update:sourceMode', $event)"
          @update:range-text="emit('update:rangeText', $event)"
          @update:recent-count="emit('update:recentCount', $event)"
          @update:single-message-id="emit('update:singleMessageId', $event)"
        />

        <ReferencePicker
          :model-value="references"
          :disabled="controlsDisabled"
          @update:model-value="emit('update:references', $event)"
        />

        <slot name="after-references"></slot>
      </div>
    </details>

    <slot name="after-requirement"></slot>

    <TavernPromptCapture v-if="showPromptCapture && capture" :capture="capture" :reset-key="captureResetKey" />

    <div v-if="error" class="pc-status-card danger">
      <strong>{{ errorTitle }}</strong>
      <p>{{ error }}</p>
    </div>

    <div v-if="generationBlocked" class="pc-status-card warning">
      <strong>{{ t`历史聊天只读` }}</strong>
      <p>{{ t`当前查看的不是酒馆当前聊天，已禁用 AI 生成。` }}</p>
    </div>

    <slot name="actions">
      <div class="pc-form-actions pc-generation-actions">
        <button class="pc-soft-btn" type="button" :disabled="running" @click="emit('cancel')">{{ cancelLabel }}</button>
        <button v-if="running" class="pc-soft-btn danger" type="button" @click="emit('stop')">{{ stopLabel }}</button>
        <button
          class="pc-primary-btn"
          type="button"
          :disabled="controlsDisabled || generateDisabled"
          @click="emit('generate')"
        >
          <i :class="generateIcon"></i>
          <span>{{ running ? runningLabel : generateLabel }}</span>
        </button>
      </div>
    </slot>

    <div v-if="running || rawOutput" class="pc-raw-output">
      <div class="pc-raw-head">
        <strong>{{ running ? liveOutputLabel : rawOutputLabel }}</strong>
      </div>
      <textarea :value="rawOutput" class="pc-area pc-raw-area" readonly></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import GenerationSourceFields from '@/components/GenerationSourceFields.vue';
import ReferencePicker from '@/components/ReferencePicker.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import TavernPromptCapture from '@/components/TavernPromptCapture.vue';
import { useGenerationOverrideStore } from '@/store/generationOverrides';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { SummaryGenerationSourceMode } from '@/util/generationSource';
import type { GenerationReferenceItem } from '@/util/references';
import { getPresetNamesSafe, type CapturedTavernPromptPreview } from '@/util/runtime';
import {
  formatTextProviderSelection,
  formatTextProviderSummary,
  type TextProviderSelection,
} from '@/util/textProvider';
import { storeToRefs } from 'pinia';

const props = withDefaults(
  defineProps<{
    cancelLabel?: string;
    capture?: () => Promise<CapturedTavernPromptPreview>;
    captureResetKey?: unknown;
    error?: string;
    errorTitle?: string;
    fromStartEnd: number;
    generateIcon?: string;
    generateDisabled?: boolean;
    generateLabel?: string;
    liveOutputLabel?: string;
    rangeText: string;
    rawOutput?: string;
    rawOutputLabel?: string;
    recentCount: number;
    references: GenerationReferenceItem[];
    requirementLabel?: string;
    requirementPlaceholder?: string;
    running: boolean;
    runningLabel?: string;
    showPresetSelector?: boolean;
    showPromptCapture?: boolean;
    showRequirementField?: boolean;
    singleMessageId: number;
    sourceMode: SummaryGenerationSourceMode;
    stopLabel?: string;
    userRequirement: string;
  }>(),
  {
    cancelLabel: '取消',
    capture: undefined,
    captureResetKey: undefined,
    error: '',
    errorTitle: '生成失败',
    generateIcon: 'fa-solid fa-sparkles',
    generateDisabled: false,
    generateLabel: '开始生成',
    liveOutputLabel: '实时输出',
    rawOutput: '',
    rawOutputLabel: '原始输出',
    requirementLabel: '追加要求',
    requirementPlaceholder: '例如：重点概括角色关系变化，并保留后续悬念。',
    runningLabel: '生成中',
    showPresetSelector: true,
    showPromptCapture: true,
    showRequirementField: true,
    stopLabel: '停止',
  },
);

const phone = usePhoneStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const generationOverrides = useGenerationOverrideStore();
const { quickPhraseGroups } = storeToRefs(prompts);
const { settings } = storeToRefs(settingsStore);
const quickPhraseOpen = ref(false);
const openQuickPhraseGroupId = ref('');
const tavernPresetNames = ref<string[]>([]);
const overrideRoute = computed(() => ({ appId: phone.currentRoute.appId, page: phone.currentRoute.page }));
const generationOverride = computed(() =>
  generationOverrides.ensureOverride(
    overrideRoute.value.appId,
    overrideRoute.value.page,
    settings.value.generation.tavernPresetName,
  ),
);
const connectionOptions = computed(() => [
  {
    label: `跟随连接设置（${formatTextProviderSummary(settings.value.textProvider)}）`,
    value: 'inherit',
  },
  { label: '酒馆当前 API', value: 'tavern' },
  ...settings.value.textProvider.externalProfiles.map(profile => ({
    label: profile.name,
    value: `external:${profile.id}`,
  })),
  ...(generationOverride.value.connectionSelection.startsWith('external:') &&
  !settings.value.textProvider.externalProfiles.some(
    profile => `external:${profile.id}` === generationOverride.value.connectionSelection,
  )
    ? [{ label: '连接配置已失效', value: generationOverride.value.connectionSelection }]
    : []),
]);
const generationBlocked = computed(() => !phone.isViewingCurrentChat);
const controlsDisabled = computed(() => props.running || generationBlocked.value);
const sourceModeLabel = computed(() => {
  if (props.sourceMode === 'none') return '不使用聊天楼层';
  if (props.sourceMode === 'recent') return `最近 ${props.recentCount} 楼`;
  if (props.sourceMode === 'fromStart') return `0-${props.fromStartEnd} 楼`;
  if (props.sourceMode === 'single') return `第 ${props.singleMessageId} 楼`;
  if (props.sourceMode === 'range') return props.rangeText.trim() || '自定义范围';
  if (props.sourceMode === 'all') return '全部楼层';
  return '最新楼层';
});
const advancedSummary = computed(() => {
  const connection = formatTextProviderSelection(
    settings.value.textProvider,
    generationOverride.value.connectionSelection,
  );
  const presetName = generationOverride.value.tavernPresetName.trim() || '当前预设';
  return [
    connection,
    ...(props.showPresetSelector ? [presetName] : []),
    sourceModeLabel.value,
    `${props.references.length} 项引用`,
  ].join(' · ');
});

const emit = defineEmits<{
  cancel: [];
  generate: [];
  stop: [];
  'update:fromStartEnd': [value: number];
  'update:rangeText': [value: string];
  'update:recentCount': [value: number];
  'update:references': [value: GenerationReferenceItem[]];
  'update:singleMessageId': [value: number];
  'update:sourceMode': [value: SummaryGenerationSourceMode];
  'update:userRequirement': [value: string];
}>();

watch(controlsDisabled, disabled => {
  if (disabled) quickPhraseOpen.value = false;
});

watch(quickPhraseGroups, groups => {
  if (!groups.length) {
    openQuickPhraseGroupId.value = '';
    return;
  }
  if (!groups.some(group => group.id === openQuickPhraseGroupId.value)) {
    openQuickPhraseGroupId.value = groups[0].id;
  }
});

onMounted(() => {
  refreshTavernPresetNames();
});

function refreshTavernPresetNames() {
  tavernPresetNames.value = getPresetNamesSafe();
  const selectedPresetName = generationOverride.value.tavernPresetName.trim();
  if (selectedPresetName && !tavernPresetNames.value.includes(selectedPresetName)) {
    tavernPresetNames.value = [selectedPresetName, ...tavernPresetNames.value];
  }
}

function setConnectionSelection(selection: string) {
  generationOverrides.setConnectionSelection(
    overrideRoute.value.appId,
    overrideRoute.value.page,
    selection as TextProviderSelection,
  );
}

function setTavernPresetName(tavernPresetName: string) {
  generationOverrides.setTavernPresetName(overrideRoute.value.appId, overrideRoute.value.page, tavernPresetName);
}

function toggleQuickPhrasePanel() {
  quickPhraseOpen.value = !quickPhraseOpen.value;
  if (!quickPhraseOpen.value) return;
  if (!quickPhraseGroups.value.some(group => group.id === openQuickPhraseGroupId.value)) {
    openQuickPhraseGroupId.value = quickPhraseGroups.value[0]?.id || '';
  }
}

function toggleQuickPhraseGroup(groupId: string) {
  openQuickPhraseGroupId.value = openQuickPhraseGroupId.value === groupId ? '' : groupId;
}

function appendQuickPhrase(text: string) {
  const phrase = text.trim();
  if (!phrase) return;
  const current = props.userRequirement.trimEnd();
  const separator = current ? '\n' : '';
  emit('update:userRequirement', `${current}${separator}${phrase}`);
}

function quickPhraseLabel(text: string) {
  const characters = Array.from(text.trim());
  return characters.slice(0, 10).join('');
}
</script>

<style scoped>
.pc-generation-panel,
.pc-raw-output {
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
  margin-top: 14px;
}

.pc-status-card {
  border: 1px solid var(--pc-border);
  border-radius: 18px;
  background: var(--pc-surface-strong);
  padding: 14px;
}

.pc-status-card.danger {
  border-color: color-mix(in srgb, var(--pc-danger) 42%, var(--pc-border) 58%);
}

.pc-status-card.warning {
  border-color: color-mix(in srgb, #f5a623 42%, var(--pc-border) 58%);
}

.pc-status-card p {
  color: var(--pc-muted);
}

.pc-select-field {
  margin-top: 14px;
}

.pc-generation-advanced-body > .pc-select-field:first-child {
  margin-top: 0;
}

.pc-preset-select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
}

.pc-field-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-quick-phrase-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding: 12px;
  border: 1px solid var(--pc-border);
  border-radius: 16px;
  background: var(--pc-surface-strong);
}

.pc-quick-phrase-group-toggle {
  /* ui-reuse-allow: collapsible group heading uses a full-width hierarchy control. */
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 36px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.pc-quick-phrase-group-toggle strong {
  font-size: 13px;
}

.pc-quick-phrase-group-toggle i {
  flex: 0 0 auto;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-quick-phrase-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
  padding-top: 8px;
}

.pc-quick-phrase-chip {
  width: 100%;
  max-width: 100%;
  background: color-mix(in srgb, var(--pc-theme-accent) 12%, var(--pc-surface) 88%);
  justify-content: flex-start;
  min-inline-size: 0;
  padding: 7px 8px;
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pc-generation-advanced {
  margin-top: 14px;
  border-top: 1px solid var(--pc-border);
  border-bottom: 1px solid var(--pc-border);
}

.pc-generation-advanced summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 8px 2px;
  color: var(--pc-text);
  cursor: pointer;
  list-style: none;
}

.pc-generation-advanced summary::-webkit-details-marker {
  display: none;
}

.pc-generation-advanced-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 800;
  white-space: nowrap;
}

.pc-generation-advanced summary small {
  min-width: 0;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-generation-advanced-chevron {
  color: var(--pc-muted);
  transition: transform 0.18s ease;
}

.pc-generation-advanced[open] .pc-generation-advanced-chevron {
  transform: rotate(180deg);
}

.pc-generation-advanced-body {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 4px 0 14px;
}

.pc-number-field + .pc-number-field {
  margin-top: 14px;
}

.pc-generation-panel > .pc-area {
  margin-top: 14px;
}

.pc-area.compact {
  min-height: 120px;
}

.pc-raw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-generation-actions {
  display: flex;
  flex-wrap: nowrap;
  margin-top: 16px;
  justify-content: flex-end;
}

.pc-generation-actions > button {
  flex: 1 1 0;
  min-width: 0;
  white-space: nowrap;
}

.pc-raw-head {
  align-items: baseline;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
