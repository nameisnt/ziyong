<template>
  <section class="pc-diary-batch-page">
    <article class="pc-page-section">
      <input
        v-if="showBookFields"
        v-model="perspectiveName"
        class="pc-field"
        type="text"
        :disabled="inputsLocked"
        placeholder="视角角色名"
      />
      <input
        v-if="showBookFields"
        v-model="bookTitle"
        class="pc-field"
        type="text"
        :disabled="inputsLocked"
        placeholder="书架名称（可留空）"
      />

      <div class="pc-field-group">
        <label class="pc-field-label">批量楼层</label>
        <div class="pc-segment pc-diary-batch-segment">
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

      <div class="pc-diary-batch-label">
        <span class="pc-field-label">生成方式</span>
        <InfoHint :text="modeHint" />
      </div>
      <div class="pc-segment pc-diary-batch-segment">
        <button
          :class="['pc-segment-btn', { active: !groupMode }]"
          type="button"
          :disabled="inputsLocked"
          @click="groupMode = false"
        >
          逐楼生成
        </button>
        <button
          :class="['pc-segment-btn', { active: groupMode }]"
          type="button"
          :disabled="inputsLocked"
          @click="groupMode = true"
        >
          按组生成
        </button>
      </div>

      <div class="pc-field-group">
        <label class="pc-field-label">{{ groupMode ? '每组楼数' : '每批目标楼层数' }}</label>
        <input v-model.number="groupSize" class="pc-field" type="number" min="1" max="50" :disabled="inputsLocked" />
      </div>
      <div class="pc-field-group">
        <label class="pc-field-label">RPM 请求限制</label>
        <input v-model.number="rpmLimit" class="pc-field" type="number" min="0" max="120" :disabled="state.running" />
      </div>

      <div class="pc-diary-batch-roles">
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
        class="pc-area pc-diary-batch-requirement"
        :disabled="inputsLocked"
        placeholder="例如：每篇都更私密，按对应楼层情绪独立成篇。"
      ></textarea>

      <div v-if="state.running || state.total" class="pc-status-card">
        <strong>{{ state.running ? '批量生成中' : state.resumeAvailable ? '批量已暂停' : '批量生成完成' }}</strong>
        <p>{{ progressLabel }}</p>
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

      <div v-if="state.rawOutput" class="pc-diary-batch-output">
        <strong>最近一次输出</strong>
        <textarea :value="state.rawOutput" class="pc-area pc-diary-batch-raw" readonly></textarea>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import InfoHint from '@/components/InfoHint.vue';
import ReferencePicker from '@/components/ReferencePicker.vue';
import type { GenerationReferenceItem } from '@/util/references';

interface DiaryBatchState {
  currentLabel: string;
  done: number;
  error: string;
  failed: number;
  rawOutput: string;
  resumeAvailable: boolean;
  running: boolean;
  stopRequested: boolean;
  total: number;
}

const props = defineProps<{
  inputsLocked: boolean;
  showBookFields: boolean;
  state: DiaryBatchState;
}>();

defineEmits<{ cancel: []; generate: []; reset: []; stop: [] }>();

const bookTitle = defineModel<string>('bookTitle', { required: true });
const floorMode = defineModel<'all' | 'custom'>('floorMode', { required: true });
const floorText = defineModel<string>('floorText', { required: true });
const groupMode = defineModel<boolean>('groupMode', { required: true });
const groupSize = defineModel<number>('groupSize', { required: true });
const includeAi = defineModel<boolean>('includeAi', { required: true });
const includeUser = defineModel<boolean>('includeUser', { required: true });
const perspectiveName = defineModel<string>('perspectiveName', { required: true });
const references = defineModel<GenerationReferenceItem[]>('references', { required: true });
const rpmLimit = defineModel<number>('rpmLimit', { required: true });
const userRequirement = defineModel<string>('userRequirement', { required: true });

const modeHint =
  '逐楼：按“每批目标楼层数”合并符合条件的截止楼层，并累积读取第 0 楼到该批最后一层。例如目标楼层为 1、3、5，每批 3 层时只生成一次并读取 0-5 楼；范围内保留完整可见对话。\n\n按组：只按设定数量合并符合条件的目标楼层。例如目标楼层为 1、3、5，每组 2 层，将使用 1、3 楼生成一篇，再使用第 5 楼生成一篇。';
const progressLabel = computed(
  () =>
    `${props.state.done + props.state.failed}/${props.state.total} · 成功 ${props.state.done}${props.state.failed ? ` · 草稿 ${props.state.failed}` : ''}${props.state.currentLabel ? ` · ${props.state.currentLabel}` : ''}`,
);
</script>

<style scoped>
.pc-diary-batch-page {
  min-height: 100%;
}

.pc-diary-batch-segment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pc-diary-batch-label {
  display: flex;
  align-items: center;
  margin-top: 14px;
}

.pc-diary-batch-roles {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.pc-diary-batch-roles > div {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-diary-batch-roles > div > span {
  color: var(--pc-text);
  font-size: 13px;
  font-weight: 800;
}

.pc-diary-batch-requirement {
  min-height: 120px;
  text-align: left;
}

.pc-status-card,
.pc-diary-batch-output {
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

.pc-diary-batch-output {
  display: grid;
  gap: 8px;
}

.pc-diary-batch-raw {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
