<template>
  <div class="pc-source-fields">
    <div class="pc-number-field">
      <label class="pc-field-label">{{ labelText }}</label>
      <select :value="mode" class="pc-select" :disabled="disabled" @change="onModeChange">
        <option value="latest">{{ t`最新楼层` }}</option>
        <option value="fromStart">{{ t`从 0 到指定楼层` }}</option>
        <option value="all">{{ t`全部楼层` }}</option>
        <option value="single">{{ t`指定单层` }}</option>
        <option value="recent">{{ t`最近 N 楼` }}</option>
        <option value="range">{{ t`自定义范围` }}</option>
      </select>
    </div>

    <div v-if="mode === 'recent'" class="pc-number-field">
      <label class="pc-field-label">{{ t`最近 N 楼` }}</label>
      <input :value="recentCount" class="pc-field" type="number" min="1" max="200" :disabled="disabled" @input="onRecentCountInput" />
    </div>

    <div v-else-if="mode === 'fromStart'" class="pc-number-field">
      <label class="pc-field-label">{{ t`结束楼层` }}</label>
      <input :value="fromStartEnd" class="pc-field" type="number" min="0" :disabled="disabled" @input="onFromStartEndInput" />
    </div>

    <div v-else-if="mode === 'single'" class="pc-number-field">
      <label class="pc-field-label">{{ t`指定楼层` }}</label>
      <input :value="singleMessageId" class="pc-field" type="number" min="0" :disabled="disabled" @input="onSingleMessageIdInput" />
    </div>

    <div v-else-if="mode === 'range'" class="pc-number-field">
      <label class="pc-field-label">{{ t`自定义范围` }}</label>
      <textarea
        :value="rangeText"
        class="pc-area compact"
        :disabled="disabled"
        :placeholder="t`例如：12-20, 24, 30-32`"
        @input="onRangeTextInput"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
type SourceMode = 'latest' | 'fromStart' | 'all' | 'single' | 'recent' | 'range';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  fromStartEnd: number;
  label?: string;
  mode: SourceMode;
  rangeText: string;
  recentCount: number;
  singleMessageId: number;
}>(), {
  disabled: false,
  label: '',
});

const emit = defineEmits<{
  'update:fromStartEnd': [value: number];
  'update:mode': [value: SourceMode];
  'update:rangeText': [value: string];
  'update:recentCount': [value: number];
  'update:singleMessageId': [value: number];
}>();

const labelText = computed(() => props.label || '来源楼层模式');

function normalizeNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function onModeChange(event: Event) {
  emit('update:mode', (event.target as HTMLSelectElement).value as SourceMode);
}

function onRecentCountInput(event: Event) {
  emit('update:recentCount', normalizeNumber((event.target as HTMLInputElement).value, props.recentCount));
}

function onFromStartEndInput(event: Event) {
  emit('update:fromStartEnd', normalizeNumber((event.target as HTMLInputElement).value, props.fromStartEnd));
}

function onSingleMessageIdInput(event: Event) {
  emit('update:singleMessageId', normalizeNumber((event.target as HTMLInputElement).value, props.singleMessageId));
}

function onRangeTextInput(event: Event) {
  emit('update:rangeText', (event.target as HTMLTextAreaElement).value);
}
</script>

<style scoped>
.pc-source-fields {
  display: flex;
  flex-direction: column;
}

.pc-area.compact {
  min-height: 120px;
}

.pc-number-field + .pc-number-field {
  margin-top: 14px;
}
</style>
