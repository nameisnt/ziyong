<template>
  <section class="pc-conversion-panel">
    <article class="pc-page-section pc-conversion-editor">
      <header class="pc-compact-toolbar pc-conversion-heading">
        <span>{{ sourceAppName }}</span>
        <strong>{{ `${sources.length} 条` }}</strong>
      </header>

      <div class="pc-conversion-source-list" aria-label="待转换内容">
        <div v-for="source in sources" :key="source.entryId" class="pc-conversion-source-row">
          <strong>{{ source.title || t`未命名内容` }}</strong>
          <small>{{ source.content.slice(0, 90) || t`暂无正文` }}</small>
        </div>
      </div>

      <template v-if="receiverOptions.length && !completed">
        <div class="pc-field-group">
          <label class="pc-field-label">{{ t`转换到` }}</label>
          <SearchableCombobox v-model="targetAppId" :options="receiverOptions" :placeholder="t`选择或搜索目标 App`" />
        </div>

        <div v-if="sources.length > 1 && availableBatchModes.length > 1" class="pc-field-group">
          <label class="pc-field-label">{{ t`保存方式` }}</label>
          <div class="pc-conversion-segments">
            <button
              v-if="availableBatchModes.includes('separate')"
              :class="['pc-segment-btn', { active: batchMode === 'separate' }]"
              type="button"
              @click="batchMode = 'separate'"
            >
              {{ t`每条分别转换` }}
            </button>
            <button
              v-if="availableBatchModes.includes('merge')"
              :class="['pc-segment-btn', { active: batchMode === 'merge' }]"
              type="button"
              @click="batchMode = 'merge'"
            >
              {{ t`合并为一条` }}
            </button>
          </div>
        </div>

        <div v-if="batchMode === 'merge' && sources.length > 1" class="pc-field-group">
          <label class="pc-field-label">{{ t`合并后的标题` }}</label>
          <input v-model="mergedTitle" class="pc-field" type="text" :placeholder="t`默认使用第一条标题`" />
        </div>

        <div v-for="field in receiverFields" :key="field.key" class="pc-field-group">
          <div class="pc-conversion-field-label">
            <label class="pc-field-label">{{ field.label }}</label>
            <small v-if="field.help">{{ field.help }}</small>
          </div>
          <SearchableCombobox
            v-if="field.kind === 'select'"
            :model-value="String(values[field.key] ?? '')"
            :input-label="field.label"
            :options="field.options || []"
            :placeholder="field.placeholder || `选择或搜索${field.label}`"
            @update:model-value="values[field.key] = $event"
          />
          <textarea
            v-else-if="field.kind === 'textarea'"
            :class="['pc-area', { invalid: invalidFieldKeys.has(field.key) }]"
            :placeholder="field.placeholder"
            :rows="field.rows || 4"
            :value="String(values[field.key] ?? '')"
            @input="values[field.key] = ($event.target as HTMLTextAreaElement).value"
          ></textarea>
          <input
            v-else-if="field.kind === 'number'"
            :class="['pc-field', { invalid: invalidFieldKeys.has(field.key) }]"
            type="number"
            :min="field.min"
            :step="field.step"
            :value="Number(values[field.key] ?? 0)"
            @input="values[field.key] = Number(($event.target as HTMLInputElement).value)"
          />
          <div v-else-if="field.kind === 'toggle'" class="pc-conversion-toggle-row">
            <span>{{ Boolean(values[field.key]) ? t`已启用` : t`已关闭` }}</span>
            <label class="pc-toggle" :title="field.label">
              <input
                type="checkbox"
                :checked="Boolean(values[field.key])"
                @change="values[field.key] = ($event.target as HTMLInputElement).checked"
              />
              <span></span>
            </label>
          </div>
          <input
            v-else
            :class="['pc-field', { invalid: invalidFieldKeys.has(field.key) }]"
            :placeholder="field.placeholder"
            type="text"
            :value="String(values[field.key] ?? '')"
            @input="values[field.key] = ($event.target as HTMLInputElement).value"
          />
        </div>

        <p v-if="activeRegistration?.receiver.scope === 'chat'" class="pc-conversion-scope-note">
          <i class="fa-solid fa-message"></i>
          <span>{{ t`内容会写入当前聊天` }}</span>
        </p>
      </template>

      <EmptyState v-else-if="!receiverOptions.length" :title="t`没有可用的转换目标`" />

      <article v-if="error" class="pc-status-card danger">
        <strong>{{ t`转换失败` }}</strong>
        <p>{{ error }}</p>
      </article>
      <article v-if="completed" class="pc-status-card success">
        <strong>{{ t`转换完成` }}</strong>
        <p>{{ completed.result.message }}</p>
      </article>

      <div class="pc-form-actions">
        <button class="pc-soft-btn" type="button" @click="emit('cancel')">
          {{ completed ? t`返回原 App` : t`取消` }}
        </button>
        <button v-if="completed?.result.openRoute" class="pc-primary-btn" type="button" @click="openConvertedContent">
          {{ t`打开目标 App` }}
        </button>
        <button
          v-else-if="!completed"
          class="pc-primary-btn"
          type="button"
          :disabled="busy || !activeRegistration"
          @click="convertContent"
        >
          <i class="fa-solid fa-arrow-right-arrow-left"></i>
          <span>{{ busy ? t`正在转换` : t`确认转换` }}</span>
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import {
  getRegisteredPhoneContentReceivers,
  type PhoneContentConversionBatchMode,
  type PhoneContentConversionResult,
  type PhoneContentConversionSource,
  type PhoneContentConversionValues,
} from '@/core/appRegistry';
import { usePhoneStore } from '@/store/phone';

const props = defineProps<{
  sourceAppId: string;
  sourceAppName: string;
  sources: PhoneContentConversionSource[];
}>();

const emit = defineEmits<{
  cancel: [];
  success: [
    payload: {
      batchMode: PhoneContentConversionBatchMode;
      result: PhoneContentConversionResult;
      sourceEntryIds: string[];
      targetAppId: string;
      targetAppName: string;
    },
  ];
}>();

const phone = usePhoneStore();
const targetAppId = ref('');
const batchMode = ref<PhoneContentConversionBatchMode>('separate');
const mergedTitle = ref('');
const values = reactive<PhoneContentConversionValues>({});
const invalidFieldKeys = ref(new Set<string>());
const busy = ref(false);
const error = ref('');
const completed = ref<null | {
  result: PhoneContentConversionResult;
  targetAppId: string;
  targetAppName: string;
}>(null);

const registrations = computed(() =>
  getRegisteredPhoneContentReceivers().filter(registration => registration.app.id !== props.sourceAppId),
);
const receiverOptions = computed(() =>
  registrations.value.map(registration => ({
    disabled: registration.receiver.scope === 'chat' && !phone.isViewingCurrentChat,
    group: registration.receiver.scope === 'chat' ? '当前聊天内容' : '全局内容',
    label: registration.app.name,
    value: registration.app.id,
  })),
);
const activeRegistration = computed(() =>
  registrations.value.find(registration => registration.app.id === targetAppId.value),
);
const availableBatchModes = computed(() => activeRegistration.value?.receiver.batchModes || ['separate']);
const effectiveSources = computed<PhoneContentConversionSource[]>(() => {
  if (batchMode.value !== 'merge' || props.sources.length <= 1) return props.sources;
  const first = props.sources[0]!;
  const floorEnds = props.sources
    .map(source => source.sourceFloorEnd)
    .filter((value): value is number => typeof value === 'number');
  return [
    {
      ...first,
      content: props.sources.map(source => source.content).join('\n\n'),
      displayMode: props.sources.every(source => source.displayMode === 'frontend') ? 'frontend' : 'markdown',
      entryId: props.sources.map(source => source.entryId).join(','),
      sourceFloorEnd: floorEnds.length ? Math.max(...floorEnds) : undefined,
      sourceLabel: `${props.sourceAppName} · 合并 ${props.sources.length} 条`,
      tags: [...new Set(props.sources.flatMap(source => source.tags))],
      title: mergedTitle.value.trim() || first.title || `${props.sources.length} 条合并内容`,
    },
  ];
});
const conversionContext = computed(() => ({
  batchMode: batchMode.value,
  sources: effectiveSources.value,
  values,
}));
const receiverFields = computed(() => activeRegistration.value?.receiver.fields(conversionContext.value) || []);

watch(
  [activeRegistration, () => props.sources],
  ([registration]) => {
    Object.keys(values).forEach(key => delete values[key]);
    invalidFieldKeys.value = new Set();
    completed.value = null;
    error.value = '';
    if (!registration) return;
    Object.assign(values, registration.receiver.createDraft(props.sources));
    const modes = registration.receiver.batchModes || ['separate'];
    if (!modes.includes(batchMode.value)) batchMode.value = modes[0] || 'separate';
  },
  { immediate: true },
);

watch(
  receiverOptions,
  options => {
    if (options.some(option => option.value === targetAppId.value && !option.disabled)) return;
    targetAppId.value = options.find(option => !option.disabled)?.value || '';
  },
  { immediate: true },
);

function validateFields() {
  const invalid = new Set<string>();
  receiverFields.value.forEach(field => {
    if (!field.required) return;
    const value = values[field.key];
    if (value === undefined || value === null || String(value).trim() === '') invalid.add(field.key);
  });
  invalidFieldKeys.value = invalid;
  return invalid.size === 0;
}

async function convertContent() {
  const registration = activeRegistration.value;
  if (!registration || busy.value || !validateFields()) {
    if (invalidFieldKeys.value.size) toastr.warning('请填写必填项');
    return;
  }
  if (registration.receiver.scope === 'chat' && !phone.isViewingCurrentChat) {
    toastr.warning('历史聊天不能写入当前聊天内容');
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    const result = await registration.receiver.receive(conversionContext.value);
    completed.value = {
      result,
      targetAppId: registration.app.id,
      targetAppName: registration.app.name,
    };
    emit('success', {
      batchMode: batchMode.value,
      result,
      sourceEntryIds: props.sources.map(source => source.entryId),
      targetAppId: registration.app.id,
      targetAppName: registration.app.name,
    });
    toastr.success(result.message);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '转换失败';
  } finally {
    busy.value = false;
  }
}

function openConvertedContent() {
  const state = completed.value;
  const route = state?.result.openRoute;
  if (!state || !route) return;
  phone.pushRoute(state.targetAppId, route.page, route.title, route.params);
}
</script>

<style scoped>
.pc-conversion-panel,
.pc-conversion-editor {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.pc-conversion-heading,
.pc-conversion-field-label,
.pc-conversion-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pc-conversion-heading > strong {
  color: var(--pc-muted);
  white-space: nowrap;
}

.pc-conversion-source-list {
  display: grid;
  max-height: 164px;
  gap: 8px;
  overflow-y: auto;
}

.pc-conversion-source-row {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  padding: 9px 2px;
  border-bottom: 1px solid var(--pc-border);
}

.pc-conversion-source-row strong,
.pc-conversion-source-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-conversion-source-row small,
.pc-conversion-field-label small,
.pc-conversion-scope-note {
  color: var(--pc-muted);
}

.pc-conversion-segments {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pc-conversion-field-label {
  align-items: flex-end;
}

.pc-conversion-field-label small {
  text-align: right;
}

.pc-conversion-toggle-row {
  min-height: 38px;
}

.pc-conversion-scope-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
}

.invalid {
  border-color: var(--pc-danger);
}
</style>
