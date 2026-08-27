<template>
  <section class="pc-relationship-app">
    <section v-if="route.page === 'root'" class="pc-relationship-page">
      <div class="pc-compact-toolbar pc-directory-toolbar">
        <span class="pc-directory-count">{{ characters.length }} 人物 · {{ links.length }} 关系</span>
        <button
          class="pc-icon-btn primary"
          type="button"
          title="AI 识别关系"
          aria-label="AI 识别关系"
          @click="openGenerate"
        >
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </button>
      </div>

      <section class="pc-section-card pc-relationship-graph-card">
        <MermaidRelationshipGraph :characters="characters" :links="links" />
      </section>

      <section class="pc-page-section">
        <button class="pc-section-toggle" type="button" @click="charactersExpanded = !charactersExpanded">
          <strong>人物</strong>
          <span class="pc-section-meta">
            <span>{{ characters.length }} 个</span>
            <i :class="['fa-solid', charactersExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </span>
        </button>
        <div v-if="charactersExpanded" class="pc-relationship-section-body">
          <div class="pc-inline-form">
            <input
              v-model="characterDraft"
              class="pc-field"
              type="text"
              placeholder="人物名字"
              @keydown.enter.prevent="addCharacter"
            />
            <button class="pc-icon-btn" type="button" title="新增人物" aria-label="新增人物" @click="addCharacter">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div v-if="characters.length" class="pc-compact-list">
            <article v-for="character in characters" :key="character.id" class="pc-compact-row">
              <input
                class="pc-field"
                type="text"
                :value="character.name"
                @change="renameCharacter(character.id, $event)"
              />
              <button
                class="pc-icon-btn danger"
                type="button"
                title="删除"
                aria-label="删除"
                @click="removeCharacter(character.id)"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </article>
          </div>
        </div>
      </section>

      <section class="pc-page-section">
        <button class="pc-section-toggle" type="button" @click="linksExpanded = !linksExpanded">
          <strong>单向关系</strong>
          <span class="pc-section-meta">
            <span>{{ links.length }} 条</span>
            <i :class="['fa-solid', linksExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </span>
        </button>
        <div v-if="linksExpanded" class="pc-relationship-section-body">
          <div class="pc-relation-form">
            <SearchableCombobox
              v-model="linkDraft.fromId"
              :options="characterOptions"
              input-label="选择关系起点人物"
              placeholder="谁"
            />
            <span>是</span>
            <SearchableCombobox
              v-model="linkDraft.toId"
              :options="characterOptions"
              input-label="选择关系目标人物"
              placeholder="谁的"
            />
            <input
              v-model="linkDraft.label"
              class="pc-field"
              type="text"
              placeholder="关系，例如 父亲"
              @keydown.enter.prevent="addLink"
            />
            <button class="pc-icon-btn" type="button" title="新增关系" aria-label="新增关系" @click="addLink">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div v-if="links.length" class="pc-compact-list">
            <article v-for="link in links" :key="link.id" class="pc-relation-row">
              <SearchableCombobox
                :model-value="link.fromId"
                :options="characterOptions"
                input-label="修改关系起点人物"
                @update:model-value="relationship.updateLink(link.id, { fromId: $event })"
              />
              <span>是</span>
              <SearchableCombobox
                :model-value="link.toId"
                :options="characterOptions"
                input-label="修改关系目标人物"
                @update:model-value="relationship.updateLink(link.id, { toId: $event })"
              />
              <input class="pc-field" type="text" :value="link.label" @change="updateLinkLabel(link.id, $event)" />
              <button
                class="pc-icon-btn danger"
                type="button"
                title="删除"
                aria-label="删除"
                @click="removeLink(link.id)"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </article>
          </div>
        </div>
      </section>

      <FailedDraftList
        :drafts="failedDrafts"
        :get-context="failedDraftSourceLabel"
        :get-title="failedDraftTitle"
        @open="openFailedDraft"
        @remove="removeFailedDraft"
      />
      <PreviewDraftNotice
        :draft="relationshipPreviewDraft"
        @discard="discardRelationshipPreviewDraft"
        @open="openRelationshipPreviewDraft"
        @open-id="openRelationshipPreviewDraft"
      />
    </section>

    <section v-else-if="route.page === 'generate'" class="pc-relationship-page">
      <input v-model="generationDraft.characterNames" class="pc-field" type="text" placeholder="角色名，用逗号分隔" />
      <GenerationPanel
        :capture="captureRelationshipPrompt"
        :capture-reset-key="relationshipPromptPreview"
        :error="generationError"
        :from-start-end="generationDraft.fromStartEnd"
        :range-text="generationDraft.rangeText"
        :raw-output="generationRawOutput"
        :recent-count="generationDraft.recentCount"
        :references="selectedReferences"
        :running="generationRunning"
        :single-message-id="generationDraft.singleMessageId"
        :source-mode="settings.generation.sourceMode"
        :user-requirement="generationDraft.userRequirement"
        requirement-placeholder="例如：只判断当前明确关系；不确定的关系不要写。"
        @cancel="phone.goBack()"
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
    </section>

    <section v-else-if="route.page === 'preview' && generationState.preview" class="pc-relationship-page">
      <GenerationPreviewPanel
        :content="relationshipPreviewText"
        :raw="generationState.preview.raw"
        raw-editable
        :reparse-handler="reparsePreviewRaw"
        :reasoning="generationState.preview.generationRecord?.reasoning || ''"
        reasoning-editable
        :scan-enabled="false"
        :source-label="generationState.preview.source.label"
        :text-provider-summary="textProviderSummary"
        title="关系预览"
        :warnings="generationState.preview.warnings"
        content-label="关系结果"
        :editable="false"
        save-label="合并到关系网"
        @back="returnToGenerate"
        @reparse="reparsePreviewRaw"
        @save="savePreview"
        @update:raw="generationState.preview.raw = $event"
        @update:reasoning="updateGenerationRecordReasoning(generationState.preview, $event)"
      />
    </section>

    <FailedDraftRepairPage
      v-else-if="route.page === 'failed-draft' && activeFailedDraft"
      v-model:raw-output="failedDraftRawOutput"
      :regenerate-handler="regenerateFailedDraft"
      :raw-output-semantics="activeFailedDraft.rawOutputSemantics"
      :reasoning="activeFailedDraft.generationRecord?.reasoning || ''"
      :source-label="activeFailedDraft.source.label"
      title="修复关系草稿"
      :warnings="activeFailedDraft.warnings"
      @delete="removeFailedDraft(activeFailedDraft.id)"
      @reparse="reparseFailedDraft"
      @update:reasoning="updateGenerationRecordReasoning(activeFailedDraft, $event)"
    />
  </section>
</template>

<script setup lang="ts">
import MermaidRelationshipGraph from '@/apps/relationship/MermaidRelationshipGraph.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import FailedDraftRepairPage from '@/components/FailedDraftRepairPage.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import SearchableCombobox from '@/components/SearchableCombobox.vue';
import { useFailedDraftRegeneration } from '@/composables/useFailedDraftRegeneration';
import { useSingleGenerationTaskSession } from '@/composables/useSingleGenerationTaskSession';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { FailedGenerationDraft } from '@/type/generation';
import type { GenerationTask } from '@/type/generationTask';
import { updateGenerationRecordReasoning } from '@/util/generationReasoning';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { formatGenerationReferences, type GenerationReferenceItem } from '@/util/references';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { formatTextProviderSummary } from '@/util/textProvider';
import { storeToRefs } from 'pinia';
import { parseRelationshipXmlResult } from './generation';
import { useRelationshipStore, type RelationshipGeneratedResult } from './store';

const phone = usePhoneStore();
const relationship = useRelationshipStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const adapter = getRegisteredPhoneGenerationAdapter('relationship', 'generate');
const { currentRoute: route } = storeToRefs(phone);
const { characters, failedDrafts, links } = storeToRefs(relationship);
const { settings } = storeToRefs(settingsStore);
const characterDraft = ref('');
const failedDraftRawOutput = ref('');
const charactersExpanded = ref(true);
const linksExpanded = ref(true);
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const linkDraft = reactive({ fromId: '', label: '', toId: '' });
const generationDraft = reactive({
  characterNames: '',
  fromStartEnd: 20,
  recentCount: 20,
  rangeText: '',
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  preview: null as null | {
    data: RelationshipGeneratedResult;
    draftId: null | string;
    generationRecord?: FailedGenerationDraft['generationRecord'];
    raw: string;
    source: { label: string };
    warnings: string[];
  },
});
const generationSession = useSingleGenerationTaskSession({
  actionId: 'generate',
  appId: 'relationship',
  sourcePage: 'generate',
  title: 'AI 关系识别 · 单次生成',
});
const { error: generationError, rawOutput: generationRawOutput, running: generationRunning } = generationSession;
type RelationshipPreview = NonNullable<typeof generationState.preview>;

const {
  beginPreviewDraft: beginRelationshipPreviewDraft,
  clearPreviewDraft: clearRelationshipPreviewDraft,
  discardPreviewDraft: discardRelationshipPreviewDraft,
  draft: relationshipPreviewDraft,
  openPreviewDraft: openRelationshipPreviewDraft,
  persistPreviewDraft: persistRelationshipPreviewDraft,
} = usePreviewDraftPersistence<RelationshipPreview>({
  appId: 'relationship',
  consumeFailedDraft: draftId => relationship.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '关系预览',
});

const characterById = computed(() => new Map(characters.value.map(character => [character.id, character])));
const characterOptions = computed(() =>
  characters.value.map(character => ({ label: character.name, value: character.id })),
);
const activeFailedDraft = computed(() =>
  route.value.params?.draftId ? relationship.getFailedDraft(route.value.params.draftId) : null,
);
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const textProviderSummary = computed(() =>
  settings.value.textProvider.mode === 'external'
    ? formatTextProviderSummary(settings.value.textProvider)
    : '跟随酒馆当前模型',
);
const relationshipPromptPreview = computed(() => {
  try {
    return buildGenerationPreview(adapter, buildGenerationConfig(), getGenerationOptions()).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});
const relationshipPreviewText = computed(() => {
  const preview = generationState.preview;
  if (!preview) return '';
  const relations = preview.data.relations.map(relation => `${relation.from} 是 ${relation.to} 的 ${relation.label}`);
  return [
    preview.data.characters.length ? `人物：${preview.data.characters.join('、')}` : '人物：无新增人物',
    relations.length ? `关系：\n${relations.join('\n')}` : '关系：无',
  ].join('\n\n');
});

watch(
  () => route.value,
  current => {
    if (current.appId !== 'relationship') return;
    if (current.page === 'generate') {
      selectedReferences.value = [];
      generationDraft.characterNames = characters.value.map(character => character.name).join(', ');
      generationDraft.userRequirement = '';
      generationState.preview = null;
    }
    if (current.page === 'failed-draft') failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
  },
);

useInvalidRouteFallback({
  source: () => ({
    appId: route.value.appId,
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'relationship' &&
    ((current.page === 'preview' && !current.hasPreview) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => phone.replacePage('root', '关系网'),
});

function addCharacter() {
  const character = relationship.createCharacter(characterDraft.value);
  if (!character) {
    toastr.warning('请先填写人物名字');
    return;
  }
  characterDraft.value = '';
}

function renameCharacter(characterId: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const character = relationship.getCharacter(characterId);
  const name = target.value.trim();
  const duplicate = relationship.findDuplicateCharacterName(name, characterId);
  if (!character || !name || duplicate) {
    target.value = character?.name || '';
    toastr.warning(duplicate ? `已经有名为“${duplicate.name}”的人物` : '人物名字不能为空');
    return;
  }
  relationship.updateCharacter(characterId, { name });
}

async function removeCharacter(characterId: string) {
  const character = relationship.getCharacter(characterId);
  if (
    !character ||
    !(await phone.confirmNotice(`要删除人物“${character.name}”和相关关系吗？`, {
      confirmLabel: '删除',
      kind: 'warning',
    }))
  )
    return;
  relationship.deleteCharacter(characterId);
}

function addLink() {
  if (!relationship.upsertLink(linkDraft.fromId, linkDraft.toId, linkDraft.label)) {
    toastr.warning('请选择两个人物，并填写关系');
    return;
  }
  linkDraft.label = '';
}

function updateLinkLabel(linkId: string, event: Event) {
  relationship.updateLink(linkId, { label: (event.target as HTMLInputElement).value });
}

async function removeLink(linkId: string) {
  const link = relationship.getLink(linkId);
  if (!link) return;
  const from = characterById.value.get(link.fromId)?.name || '未知人物';
  const to = characterById.value.get(link.toId)?.name || '未知人物';
  if (!(await phone.confirmNotice(`要删除“${from} → ${to}”的关系吗？`, { confirmLabel: '删除', kind: 'warning' })))
    return;
  relationship.deleteLink(linkId);
}

function openGenerate() {
  phone.pushPage('generate', 'AI 关系识别');
}
function openFailedDraft(draftId: string) {
  if (relationship.getFailedDraft(draftId)) phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}
function failedDraftTitle() {
  return '未解析关系';
}
function failedDraftSourceLabel(draft: FailedGenerationDraft) {
  return draft.source.label;
}
function buildRelationshipOutputFormat() {
  return prompts.resolveOutputFormat('relationship.generate');
}
function buildGenerationConfig() {
  return {
    appPrompt: prompts.appPrompts.relationship,
    characterNames: generationDraft.characterNames,
    outputFormat: buildRelationshipOutputFormat(),
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
function captureRelationshipPrompt() {
  return captureGenerationPrompt(adapter, buildGenerationConfig(), getGenerationOptions());
}

async function runGeneration() {
  beginRelationshipPreviewDraft();
  generationState.preview = null;
  let task: GenerationTask | null = null;
  try {
    task = generationSession.create({
      sourceParams: generationDraft.characterNames ? { characters: generationDraft.characterNames } : {},
      title: 'AI 关系识别 · 单次生成',
    });
    const result = await generateContent(adapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => relationship.createFailedDraft(input),
      lifecycle: generationSession.lifecycle(task.id),
    });
    if (result.status === 'failed') {
      generationSession.complete(task.id, {
        currentLabel: '解析失败草稿已保留',
        resultPage: 'failed-draft',
        resultParams: { draftId: result.draft.id },
        resultState: 'failed-draft',
        resultTitle: '解析失败草稿',
      });
      void phone.presentGeneratedPage('relationship', 'failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }
    if (result.status === 'saved') {
      generationSession.complete(task.id, {
        currentLabel: '关系网已合并',
        resultPage: 'root',
        resultState: 'saved',
        resultTitle: '关系网',
      });
      void phone.presentGeneratedPage('relationship', 'root', '关系网');
      return;
    }
    generationState.preview = {
      data: result.data,
      draftId: null,
      generationRecord: result.generationRecord,
      raw: result.rawOutput,
      source: { label: result.source.label },
      warnings: result.warnings,
    };
    persistRelationshipPreviewDraft();
    generationSession.complete(task.id, {
      currentLabel: '关系已生成，等待确认',
      resultPage: 'preview',
      resultState: 'preview',
      resultTitle: '关系预览',
    });
    void phone.presentGeneratedPage('relationship', 'preview', '关系预览');
  } catch (error) {
    if (task) generationSession.fail(task.id, error);
    else toastr.error(error instanceof Error ? error.message : '生成关系失败');
  }
}

function returnToGenerate() {
  if (generationState.preview?.draftId)
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
  else phone.replacePage('generate', 'AI 关系识别');
}
function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;
  relationship.mergeGenerated(preview.data);
  if (preview.draftId) relationship.deleteFailedDraft(preview.draftId);
  clearRelationshipPreviewDraft();
  generationState.preview = null;
  phone.replacePage('root', '关系网');
}
function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview?.raw.trim()) return false;
  const parsed = parseRelationshipXmlResult(preview.raw);
  preview.warnings = parsed.warnings;
  if (!parsed.ok) return false;
  preview.data = parsed.data;
  return true;
}
async function removeFailedDraft(draftId: string) {
  if (!(await phone.confirmNotice('要删除这条解析失败草稿吗？', { confirmLabel: '删除', kind: 'warning' }))) return;
  relationship.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') phone.replacePage('root', '关系网');
}
function reparseFailedDraft() {
  const draft = activeFailedDraft.value;
  if (!draft || !failedDraftRawOutput.value.trim()) return;
  const parsed = parseRelationshipXmlResult(failedDraftRawOutput.value);
  relationship.updateFailedDraft(draft.id, { rawOutput: failedDraftRawOutput.value, warnings: parsed.warnings });
  if (!parsed.ok) return;
  generationState.preview = {
    data: parsed.data,
    draftId: null,
    generationRecord: draft.generationRecord,
    raw: failedDraftRawOutput.value,
    source: { label: draft.source.label },
    warnings: parsed.warnings,
  };
  persistRelationshipPreviewDraft();
  relationship.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '关系预览');
}
function stopGeneration() {
  generationSession.stop();
}
const regenerateFailedDraft = useFailedDraftRegeneration({
  draft: () => activeFailedDraft.value,
  rawOutput: failedDraftRawOutput,
  reparse: reparseFailedDraft,
});
</script>

<style scoped>
.pc-relationship-app,
.pc-relationship-page {
  min-height: 100%;
}
.pc-relationship-page,
.pc-relationship-section-body {
  display: grid;
  gap: 8px;
}
.pc-relationship-graph-card {
  padding: 4px;
}
.pc-inline-form,
.pc-compact-row,
.pc-relation-row,
.pc-relation-form {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pc-inline-form .pc-field,
.pc-compact-row .pc-field {
  min-width: 0;
  flex: 1;
}
.pc-relation-form,
.pc-relation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) minmax(90px, 1fr) auto;
}
@media (max-width: 390px) {
  .pc-relation-form,
  .pc-relation-row {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  }
  .pc-relation-form > .pc-field,
  .pc-relation-row > .pc-field {
    grid-column: 1 / 4;
  }
}
</style>
