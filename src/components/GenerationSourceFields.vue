<template>
  <div class="pc-source-fields">
    <div class="pc-number-field">
      <label class="pc-field-label">{{ labelText }}</label>
      <SearchableCombobox
        :disabled="disabled"
        :model-value="mode"
        :options="modeOptions"
        :searchable="false"
        empty-label="没有可用的楼层模式"
        input-label="选择来源楼层模式"
        placeholder="选择来源楼层模式"
        toggle-title="展开来源楼层模式列表"
        @update:model-value="onModeChange"
      />
    </div>

    <div v-if="mode === 'recent'" class="pc-number-field">
      <label class="pc-field-label">{{ t`最近 N 楼` }}</label>
      <input
        :value="recentCount"
        class="pc-field"
        type="number"
        min="1"
        max="200"
        :disabled="disabled"
        @input="onRecentCountInput"
      />
    </div>

    <div v-else-if="mode === 'fromStart'" class="pc-number-field">
      <label class="pc-field-label">{{ t`结束楼层` }}</label>
      <input
        :value="fromStartEnd"
        class="pc-field"
        type="number"
        min="0"
        :disabled="disabled"
        @input="onFromStartEndInput"
      />
    </div>

    <div v-else-if="mode === 'single'" class="pc-number-field">
      <label class="pc-field-label">{{ t`指定楼层` }}</label>
      <input
        :value="singleMessageId"
        class="pc-field"
        type="number"
        min="0"
        :disabled="disabled"
        @input="onSingleMessageIdInput"
      />
    </div>

    <div v-else-if="mode === 'range'" class="pc-number-field">
      <label class="pc-field-label">{{ t`自定义范围` }}</label>
      <textarea
        :value="rangeText"
        class="pc-area pc-area-multiline"
        :disabled="disabled"
        :placeholder="t`例如：12-20, 24, 30-32`"
        @input="onRangeTextInput"
      ></textarea>
    </div>
    <small v-if="mvuSourceLabel" class="pc-field-label" role="status">{{ mvuSourceLabel }}</small>
  </div>
</template>

<script setup lang="ts">
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { describeGenerationMvu, findGenerationMvuSnapshot, type MvuMessage } from '@/util/generationMvu';
import { buildSourceSelection } from '@/util/generationSource';
import { getChatMessagesSafe, getSillyTavernContext, onTavernEvent } from '@/util/runtime';
type SourceMode = 'none' | 'latest' | 'fromStart' | 'all' | 'single' | 'recent' | 'range';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    fromStartEnd: number;
    label?: string;
    mode: SourceMode;
    rangeText: string;
    recentCount: number;
    singleMessageId: number;
  }>(),
  {
    disabled: false,
    label: '',
  },
);

const emit = defineEmits<{
  'update:fromStartEnd': [value: number];
  'update:mode': [value: SourceMode];
  'update:rangeText': [value: string];
  'update:recentCount': [value: number];
  'update:singleMessageId': [value: number];
}>();

const labelText = computed(() => props.label || '来源楼层模式');
const modeOptions = [
  { label: '不使用聊天楼层', value: 'none' },
  { label: '最新楼层', value: 'latest' },
  { label: '从 0 到指定楼层', value: 'fromStart' },
  { label: '全部楼层', value: 'all' },
  { label: '指定单层', value: 'single' },
  { label: '最近 N 楼', value: 'recent' },
  { label: '自定义范围', value: 'range' },
];
const chatRevision = ref(0);
const mvuSourceLabel = computed(() => {
  void chatRevision.value;
  if (props.mode === 'none') return '';
  const chat = getSillyTavernContext()?.chat;
  if (!Array.isArray(chat) || !chat.some(message => message.variables)) return '';
  try {
    const source = buildSourceSelection({
      ...props,
      scopeId: '',
      chatIdAtGeneration: '',
      visibleMessages: getChatMessagesSafe('0-{{lastMessageId}}').filter(message => !message.is_hidden),
    });
    return describeGenerationMvu(findGenerationMvuSnapshot(chat as MvuMessage[], source.selection.messageIds));
  } catch {
    // Incomplete range input is validated by the generation action.
    return '';
  }
});
const chatListeners = [
  'CHAT_CHANGED',
  'MESSAGE_SENT',
  'MESSAGE_RECEIVED',
  'MESSAGE_UPDATED',
  'MESSAGE_DELETED',
  'MESSAGE_SWIPED',
].map(name =>
  onTavernEvent(name, () => {
    chatRevision.value++;
  }),
);
onBeforeUnmount(() => chatListeners.forEach(listener => listener.stop()));

function normalizeNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function onModeChange(value: string) {
  emit('update:mode', value as SourceMode);
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

.pc-number-field + .pc-number-field {
  margin-top: 14px;
}
</style>
