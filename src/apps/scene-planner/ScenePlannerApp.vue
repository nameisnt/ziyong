<template>
  <section class="pc-scene-planner-app">
    <section v-if="route.page === 'root'" class="pc-scene-planner-page">
      <PreviewDraftNotice
        :draft="scenePreviewDraft"
        @discard="discardScenePreviewDraft"
        @open="openScenePreviewDraft"
      />
      <article class="pc-editor-card">
        <div class="pc-section-head">
          <strong>{{ activePlan ? '继续编排' : '说出下一章剧情' }}</strong>
          <button class="pc-icon-btn" type="button" title="新方案" @click="newPlan">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <input v-model="draft.title" class="pc-field" type="text" placeholder="下一章标题或场景名，可留空" />
        <textarea
          v-model="draft.brief"
          class="pc-area compact pc-scene-brief"
          placeholder="说出前情、人物状态、冲突、地点、想要的情绪，以及下一章需要推进什么。"
        ></textarea>
        <textarea v-model="draft.styleNote" class="pc-area compact" placeholder="文风与节奏要求，可留空"></textarea>
        <textarea
          v-model="draft.avoidNote"
          class="pc-area compact"
          placeholder="需要避免的写法，例如不要和好太快、不要提前揭露秘密"
        ></textarea>

        <div v-if="activePlan?.turns.length" class="pc-scene-turns">
          <article v-for="turn in activePlan.turns" :key="turn.id" class="pc-scene-turn">
            <span>{{ turn.role === 'user' ? '用户' : '编排器' }}</span>
            <p>{{ turn.content }}</p>
          </article>
        </div>

        <GenerationPanel
          :capture="capturePrompt"
          :error="generationState.error"
          :from-start-end="generationDraft.fromStartEnd"
          generate-label="生成提示词"
          :range-text="generationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          requirement-label="继续补充"
          requirement-placeholder="例如：让第三人中途出现，但主角不要立刻解释；结尾停在误会加深的位置。"
          :running="generationState.running"
          :single-message-id="generationDraft.singleMessageId"
          :source-mode="settings.generation.sourceMode"
          :user-requirement="generationDraft.userRequirement"
          @cancel="newPlan"
          @generate="runGeneration"
          @stop="stopGeneration"
          @update:from-start-end="generationDraft.fromStartEnd = $event"
          @update:range-text="generationDraft.rangeText = $event"
          @update:recent-count="generationDraft.recentCount = $event"
          @update:references="selectedReferences = $event"
          @update:single-message-id="generationDraft.singleMessageId = $event"
          @update:source-mode="settings.generation.sourceMode = $event"
          @update:user-requirement="generationDraft.userRequirement = $event"
        />
      </article>

      <article class="pc-section-card pc-scene-history">
        <div class="pc-section-head">
          <strong>历史方案</strong>
          <span>{{ planner.plans.length }}</span>
        </div>
        <EmptyState v-if="!planner.plans.length" compact title="还没有场景方案" />
        <div v-else class="pc-scene-history-list">
          <article
            v-for="plan in planner.plans"
            :key="plan.id"
            :class="['pc-scene-history-item', { active: activePlanId === plan.id }]"
          >
            <button class="pc-scene-history-main" type="button" @click="openPlan(plan.id)">
              <strong>{{ plan.title }}</strong>
              <span>{{ getScenePlanStatusLabel(plan.status) }} · {{ plan.updatedAt.slice(0, 10) }}</span>
            </button>
            <button class="pc-detail-mini-btn" type="button" title="删除" @click="removePlan(plan.id)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </article>
        </div>
      </article>
    </section>

    <section
      v-else-if="route.page === 'preview' && generationState.preview"
      class="pc-scene-planner-page pc-generation-preview-page"
    >
      <article class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="generationState.preview.content"
          :editable="false"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
          :scan-enabled="false"
          :save-label="generationState.preview.savedPlanId ? '完成' : '保存方案'"
          :source-label="generationState.preview.source.label"
          :text-provider-summary="textProviderSummary"
          :title="generationState.preview.data.title"
          :warnings="generationState.preview.warnings"
          @reparse="reparsePreviewRaw"
          @save="savePreview"
          @update:raw="updatePreviewRaw"
        >
          <template #content>
            <article class="pc-scene-result">
              <section>
                <div class="pc-section-head">
                  <strong>编排分析</strong>
                  <span>供你确认方向</span>
                </div>
                <p>{{ generationState.preview.data.analysis }}</p>
              </section>
              <section>
                <div class="pc-section-head">
                  <strong>下一章提示词</strong>
                  <button class="pc-soft-btn compact" type="button" @click="copyPrompt">
                    <i class="fa-solid fa-copy"></i>
                    <span>复制</span>
                  </button>
                </div>
                <pre>{{ generationState.preview.data.prompt }}</pre>
              </section>
            </article>
          </template>
        </GenerationPreviewPanel>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import { useSummaryStore } from '@/store/summary';
import type { GenerationReferenceItem } from '@/util/references';
import { formatGenerationReferences } from '@/util/references';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { formatTextProviderSummary } from '@/util/textProvider';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import {
  createScenePlannerGenerationAdapter,
  formatScenePlannerResult,
  type ScenePlannerGeneratedResult,
} from './generation';
import { getScenePlanStatusLabel, useScenePlannerStore } from './store';
import type { SourceSelection } from '@/type/generation';
import { storeToRefs } from 'pinia';

type ScenePreview = {
  content: string;
  data: ScenePlannerGeneratedResult;
  raw: string;
  savedPlanId: string;
  source: SourceSelection;
  warnings: string[];
};

const phone = usePhoneStore();
const planner = useScenePlannerStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const summary = useSummaryStore();
const adapter = getRegisteredPhoneGenerationAdapter<ReturnType<typeof createScenePlannerGenerationAdapter>>(
  'scene-planner',
  'generate',
);
const { settings } = storeToRefs(settingsStore);
const route = computed(() => phone.currentRoute);
const activePlanId = ref('');
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const draft = reactive({
  avoidNote: '',
  brief: '',
  styleNote: '',
  title: '',
});
const generationDraft = reactive({
  fromStartEnd: 20,
  rangeText: '',
  recentCount: 20,
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as ScenePreview | null,
  rawOutput: '',
  running: false,
});
const {
  clearPreviewDraft: clearScenePreviewDraft,
  discardPreviewDraft: discardScenePreviewDraft,
  draft: scenePreviewDraft,
  openPreviewDraft: openScenePreviewDraft,
  persistPreviewDraft: persistScenePreviewDraft,
} = usePreviewDraftPersistence<ScenePreview>({
  appId: 'scene-planner',
  getPreview: () => generationState.preview,
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '下一章提示词',
});

const stopSavedPreviewCheck = phone.registerSavedPreviewCheck(
  () =>
    route.value.appId === 'scene-planner' &&
    route.value.page === 'preview' &&
    Boolean(generationState.preview?.savedPlanId),
);
onScopeDispose(stopSavedPreviewCheck);
onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

const activePlan = computed(() => (activePlanId.value ? planner.getPlan(activePlanId.value) : null));
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const textProviderSummary = computed(() => formatTextProviderSummary(settings.value.textProvider));

onMounted(() => {
  selectRecentSummaries();
});

function selectRecentSummaries() {
  if (selectedReferences.value.length) return;
  const book = summary.books.find(item => item.entries.length);
  if (!book) return;
  selectedReferences.value = [...book.entries]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-20)
    .map(entry => ({
      content: entry.content,
      id: `summary:${book.id}:entry:${entry.id}`,
      sourcePath: ['总结', book.title],
      timeLabel: entry.rangeLabel,
      title: entry.title,
      updatedAt: entry.updatedAt,
    }));
}

function newPlan() {
  activePlanId.value = '';
  draft.title = '';
  draft.brief = '';
  draft.styleNote = '';
  draft.avoidNote = '';
  generationDraft.userRequirement = '';
  generationState.error = '';
  selectRecentSummaries();
}

function openPlan(planId: string) {
  const plan = planner.getPlan(planId);
  if (!plan) return;
  activePlanId.value = plan.id;
  draft.title = plan.title;
  draft.brief = plan.brief;
  draft.styleNote = plan.styleNote;
  draft.avoidNote = plan.avoidNote;
  generationDraft.userRequirement = '';
  generationState.error = '';
}

function buildGenerationConfig() {
  return {
    appPrompt: prompts.appPrompts.scenePlanner || '',
    avoidNote: draft.avoidNote,
    brief: draft.brief,
    outputFormat: prompts.resolveOutputFormat('scene-planner.generate'),
    planId: activePlanId.value,
    styleNote: draft.styleNote,
    userRequirement: generationDraft.userRequirement,
  };
}

function getGenerationOptions() {
  return {
    generationDefaults: {
      resultMode: settings.value.generation.resultMode,
      stream: settings.value.generation.stream,
      tavernPresetName: settings.value.generation.tavernPresetName,
    },
    references: formattedReferences.value,
    source: {
      fromStartEnd: generationDraft.fromStartEnd,
      mode: settings.value.generation.sourceMode,
      rangeText: generationDraft.rangeText,
      recentCount: generationDraft.recentCount,
      singleMessageId: generationDraft.singleMessageId,
    },
    textProvider: settings.value.textProvider,
  };
}

function capturePrompt() {
  return captureGenerationPrompt(adapter, buildGenerationConfig(), getGenerationOptions());
}

async function runGeneration() {
  if (!draft.brief.trim()) {
    toastr.warning('请先说出下一章剧情');
    return;
  }
  generationState.error = '';
  clearScenePreviewDraft();
  generationState.preview = null;
  generationState.rawOutput = '';
  try {
    const result = await generateContent(adapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => planner.createFailedDraft(input),
      lifecycle: {
        onFinish() {
          generationState.running = false;
          generationState.generationId = '';
        },
        onRawOutput(rawOutput) {
          generationState.rawOutput = rawOutput;
        },
        onStart(generationId) {
          generationState.running = true;
          generationState.generationId = generationId;
        },
      },
    });
    if (result.status === 'failed') {
      generationState.error = result.warnings.join('；') || '没有返回可解析的场景提示词';
      toastr.warning('解析失败，原始输出已保留');
      return;
    }
    generationState.preview = {
      content: formatScenePlannerResult(result.data),
      data: result.data,
      raw: result.rawOutput,
      savedPlanId: result.status === 'saved' ? result.saved.id : '',
      source: result.source,
      warnings: result.warnings,
    };
    if (result.status === 'saved') activePlanId.value = result.saved.id;
    persistScenePreviewDraft();
    void phone.presentGeneratedPage('scene-planner', 'preview', '下一章提示词');
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '场景编排失败';
  }
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const parsed = adapter.parse(preview.raw, buildGenerationConfig());
  if (!parsed.ok) {
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '仍然无法解析');
    return false;
  }
  preview.data = parsed.data;
  preview.content = formatScenePlannerResult(parsed.data);
  preview.savedPlanId = '';
  preview.warnings = parsed.warnings;
  toastr.success('已重新解析');
  return true;
}

function updatePreviewRaw(raw: string) {
  const preview = generationState.preview;
  if (!preview) return;
  preview.raw = raw;
  preview.savedPlanId = '';
}

async function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;
  if (!preview.savedPlanId) {
    const saved = await adapter.save(preview.data, {
      config: buildGenerationConfig(),
      rawOutput: preview.raw,
      scopeId: preview.source.scopeId,
      source: preview.source,
      warnings: preview.warnings,
    });
    activePlanId.value = saved.id;
  }
  generationState.preview = null;
  clearScenePreviewDraft();
  generationDraft.userRequirement = '';
  toastr.success('场景方案已保存');
  phone.replacePage('root', '场景编排');
  const saved = planner.getPlan(activePlanId.value);
  if (saved) openPlan(saved.id);
}

async function copyPrompt() {
  const prompt = generationState.preview?.data.prompt.trim();
  if (!prompt) return;
  try {
    await navigator.clipboard.writeText(prompt);
    toastr.success('已复制下一章提示词');
  } catch {
    toastr.warning('复制失败，请手动选择提示词');
  }
}

function stopGeneration() {
  if (!generationState.generationId) return;
  stopGenerationByIdSafe(generationState.generationId);
  generationState.running = false;
  generationState.error = '生成已停止';
}

async function removePlan(planId: string) {
  const plan = planner.getPlan(planId);
  if (!plan) return;
  const confirmed = await phone.confirmNotice(`要删除场景方案“${plan.title}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  planner.deletePlan(planId);
  if (activePlanId.value === planId) newPlan();
  toastr.success('已删除场景方案');
}
</script>

<style scoped>
.pc-scene-planner-app,
.pc-scene-planner-page {
  min-height: 100%;
}

.pc-scene-planner-page,
.pc-scene-history-list,
.pc-scene-turns {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pc-scene-history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-scene-brief {
  min-height: 180px;
}

.pc-scene-history-item.active {
  background: color-mix(in srgb, var(--pc-theme-accent) 16%, var(--pc-surface-strong) 84%);
}

.pc-scene-history-main {
  /* ui-reuse-allow: full-row history selector has App-specific two-line layout. */
  appearance: none;
  display: grid;
  min-width: 0;
  gap: 4px;
  border: 0;
  padding: 4px;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-scene-history-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-scene-history-main span,
.pc-scene-turn span {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-scene-turn {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-scene-turn p {
  margin: 0;
  color: var(--pc-text);
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.pc-scene-result {
  display: grid;
  gap: 16px;
  min-height: 100%;
  padding: 14px;
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface-strong);
}

.pc-scene-result section {
  display: grid;
  align-content: start;
  gap: 10px;
}

.pc-scene-result p,
.pc-scene-result pre {
  margin: 0;
  color: var(--pc-text);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
