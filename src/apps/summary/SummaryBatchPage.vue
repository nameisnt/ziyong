<template>
  <section class="pc-summary-batch-page">
    <article class="pc-page-section">
      <div class="pc-field-group">
        <label class="pc-field-label">保存到总结集</label>
        <SearchableCombobox
          :disabled="inputsLocked"
          input-label="搜索总结集"
          :model-value="bookId"
          :options="bookOptions"
          placeholder="选择总结集"
          toggle-title="展开总结集"
          @update:model-value="bookId = $event"
        />
      </div>

      <div class="pc-field-group">
        <label class="pc-field-label">批量楼层</label>
        <div class="pc-segment pc-summary-batch-mode">
          <button
            :class="['pc-segment-btn', { active: floorMode === 'all' }]"
            type="button"
            :disabled="inputsLocked"
            @click="floorMode = 'all'"
          >
            全部楼层
          </button>
          <button
            :class="['pc-segment-btn', { active: floorMode === 'custom' }]"
            type="button"
            :disabled="inputsLocked"
            @click="floorMode = 'custom'"
          >
            自定义楼层
          </button>
        </div>
      </div>

      <input
        v-if="floorMode === 'custom'"
        v-model="floorText"
        class="pc-field"
        type="text"
        :disabled="inputsLocked"
        placeholder="楼层范围，例如 1-30,35,40-45"
      />

      <div class="pc-summary-batch-generation-label">
        <span class="pc-field-label">生成方式</span>
        <InfoHint
          text="逐楼：每次只读取当前选中的单个楼层，不会带入之前楼层的正文。按组：只合并选中的目标楼层，不会自动包含中间楼层。"
        />
      </div>
      <div class="pc-segment pc-summary-batch-mode">
        <button
          :class="['pc-segment-btn', { active: !groupMode }]"
          type="button"
          :disabled="inputsLocked"
          @click="groupMode = false"
        >
          逐楼
        </button>
        <button
          :class="['pc-segment-btn', { active: groupMode }]"
          type="button"
          :disabled="inputsLocked"
          @click="groupMode = true"
        >
          按组
        </button>
      </div>

      <div v-if="groupMode" class="pc-field-group">
        <label class="pc-field-label">每组楼数</label>
        <input v-model.number="groupSize" class="pc-field" type="number" min="1" max="50" :disabled="inputsLocked" />
      </div>

      <div class="pc-field-group">
        <label class="pc-field-label">RPM 请求限制</label>
        <input v-model.number="rpmLimit" class="pc-field" type="number" min="0" max="120" :disabled="state.running" />
      </div>

      <GenerationProviderFields
        v-model:connection-selection="connectionSelection"
        v-model:tavern-preset-name="tavernPresetName"
        :disabled="inputsLocked"
      />

      <div class="pc-summary-batch-roles">
        <div>
          <span>AI 楼层</span>
          <label class="pc-toggle">
            <input v-model="includeAi" type="checkbox" :disabled="inputsLocked" />
            <span></span>
          </label>
        </div>
        <div>
          <span>用户楼层</span>
          <label class="pc-toggle">
            <input v-model="includeUser" type="checkbox" :disabled="inputsLocked" />
            <span></span>
          </label>
        </div>
      </div>

      <ReferencePicker v-model="references" :disabled="inputsLocked" />

      <textarea
        v-model="userRequirement"
        class="pc-area pc-summary-batch-requirement"
        :disabled="inputsLocked"
        placeholder="例如：每条总结保留关键事件、人物状态变化和未解决问题。"
      ></textarea>

      <div v-if="state.running || state.total" class="pc-status-card">
        <strong>{{ state.running ? '批量生成中' : state.resumeAvailable ? '批量已暂停' : '批量生成完成' }}</strong>
        <div class="pc-compact-toolbar">
          <p>{{ progressLabel }}</p>
          <button v-if="state.previewCount" class="pc-soft-btn" type="button" @click="$emit('preview')">
            <i class="fa-solid fa-eye"></i>
            <span>查看预览（{{ state.previewCount }}）</span>
          </button>
        </div>
      </div>

      <div v-if="state.error" class="pc-status-card danger">
        <strong>{{ state.stopRequested ? '批量已停止' : '生成失败' }}</strong>
        <p>{{ state.error }}</p>
      </div>

      <div :class="['pc-form-actions', { 'pc-batch-actions-three': state.running || state.resumeAvailable }]">
        <button class="pc-soft-btn" type="button" :disabled="state.running" @click="$emit('cancel')">取消</button>
        <button v-if="state.running" class="pc-soft-btn danger" type="button" @click="$emit('stop')">停止</button>
        <button v-else-if="state.resumeAvailable" class="pc-soft-btn" type="button" @click="$emit('reset')">
          <i class="fa-solid fa-rotate-left"></i>
          <span>重新设置</span>
        </button>
        <button class="pc-primary-btn" type="button" :disabled="state.running" @click="$emit('generate')">
          <i class="fa-solid fa-layer-group"></i>
          <span>{{ state.running ? '生成中' : state.resumeAvailable ? '继续批量' : '开始批量' }}</span>
        </button>
      </div>

      <div v-if="state.rawOutput" class="pc-raw-output">
        <strong>最近一次输出</strong>
        <textarea :value="state.rawOutput" class="pc-area pc-raw-area" readonly></textarea>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import GenerationProviderFields from '@/components/GenerationProviderFields.vue';
import ReferencePicker from '@/components/ReferencePicker.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import type { SummaryBook } from '@/type/summary';
import type { GenerationReferenceItem } from '@/util/references';
import type { TextProviderSelection } from '@/util/textProvider';

interface SummaryBatchState {
  currentLabel: string;
  done: number;
  error: string;
  failed: number;
  previewCount: number;
  rawOutput: string;
  resumeAvailable: boolean;
  running: boolean;
  stopRequested: boolean;
  total: number;
}

const props = defineProps<{
  books: SummaryBook[];
  inputsLocked: boolean;
  state: SummaryBatchState;
}>();

defineEmits<{
  cancel: [];
  generate: [];
  preview: [];
  reset: [];
  stop: [];
}>();

const bookId = defineModel<string>('bookId', { required: true });
const connectionSelection = defineModel<TextProviderSelection>('connectionSelection', { required: true });
const floorMode = defineModel<'all' | 'custom'>('floorMode', { required: true });
const floorText = defineModel<string>('floorText', { required: true });
const groupMode = defineModel<boolean>('groupMode', { required: true });
const groupSize = defineModel<number>('groupSize', { required: true });
const includeAi = defineModel<boolean>('includeAi', { required: true });
const includeUser = defineModel<boolean>('includeUser', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const rpmLimit = defineModel<number>('rpmLimit', { required: true });
const tavernPresetName = defineModel<string>('tavernPresetName', { required: true });
const userRequirement = defineModel<string>('userRequirement', { required: true });

const bookOptions = computed(() => props.books.map(book => ({ label: book.title, value: book.id })));
const progressLabel = computed(
  () =>
    `${props.state.done + props.state.failed}/${props.state.total} · 成功 ${props.state.done}${props.state.failed ? ` · 草稿 ${props.state.failed}` : ''}${props.state.currentLabel ? ` · ${props.state.currentLabel}` : ''}`,
);
</script>

<style scoped>
.pc-summary-batch-page {
  min-height: 100%;
}

.pc-summary-batch-mode {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
}

.pc-summary-batch-generation-label {
  display: flex;
  align-items: center;
  margin-top: 14px;
}

.pc-summary-batch-roles {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.pc-summary-batch-roles > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-summary-batch-roles > div > span {
  color: var(--pc-text);
  font-size: 13px;
  font-weight: 800;
}

.pc-summary-batch-requirement {
  min-height: 120px;
  text-align: left;
}

.pc-status-card,
.pc-raw-output {
  margin-top: 14px;
}

.pc-status-card {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
  padding: 14px;
}

.pc-status-card.danger {
  border-color: color-mix(in srgb, var(--pc-danger) 42%, var(--pc-border) 58%);
}

.pc-status-card p {
  margin-bottom: 0;
  color: var(--pc-muted);
}

.pc-batch-actions-three {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pc-batch-actions-three > button {
  width: 100%;
  min-width: 0;
  gap: 5px;
  padding-inline: 6px;
  font-size: 13px;
  white-space: nowrap;
}

.pc-raw-output {
  display: grid;
  gap: 8px;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
