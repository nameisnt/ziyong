<template>
  <section class="pc-relationship-app">
    <section v-if="route.page === 'root'" class="pc-relationship-page">
      <div class="pc-relationship-hero">
        <div>
          <span class="pc-kicker">{{ t`关系网` }}</span>
          <h2>{{ characters.length }} {{ t`人物` }} · {{ links.length }} {{ t`关系` }}</h2>
        </div>
        <button class="pc-primary-btn" type="button" @click="openGenerate">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>{{ t`AI` }}</span>
        </button>
      </div>

      <article class="pc-graph-card">
        <EmptyState v-if="!characters.length" :title="t`还没有人物`" />
        <template v-else>
          <div class="pc-relationship-viewbar">
            <select v-model="perspectiveCharacterId" class="pc-field">
              <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }}</option>
            </select>
            <div class="pc-view-segment">
              <button :class="['pc-view-btn', { active: relationViewMode === 'all' }]" type="button" @click="relationViewMode = 'all'">all</button>
              <button :class="['pc-view-btn', { active: relationViewMode === 'from' }]" type="button" @click="relationViewMode = 'from'">{{ t`他是` }}</button>
              <button :class="['pc-view-btn', { active: relationViewMode === 'to' }]" type="button" @click="relationViewMode = 'to'">{{ t`是他` }}</button>
            </div>
          </div>
          <svg
            ref="graphSvg"
            class="pc-relationship-graph"
            :viewBox="graphViewBox"
            @pointermove="onGraphPointerMove"
            @pointerup="onGraphPointerUp"
            @pointercancel="onGraphPointerUp"
          >
            <defs>
              <marker id="pc-relationship-arrow" markerHeight="5" markerWidth="6" orient="auto" refX="5.6" refY="2.5">
                <path d="M0,0 L6,2.5 L0,5 Z"></path>
              </marker>
            </defs>

            <g v-for="view in relationViews" :key="view.id" class="pc-relation-line">
              <line :x1="view.x1" :x2="view.x2" :y1="view.y1" :y2="view.y2"></line>
              <rect class="pc-relation-label-bg" :height="20" :rx="8" :width="view.labelWidth" :x="view.labelX - view.labelWidth / 2" :y="view.labelY - 15"></rect>
              <text :x="view.labelX" :y="view.labelY">{{ view.label }}</text>
            </g>

            <g
              v-for="character in characters"
              :key="character.id"
              class="pc-character-node"
              :class="{ dragging: drag.characterId === character.id }"
              :transform="`translate(${character.x} ${character.y})`"
              @pointerdown.stop="onNodePointerDown($event, character.id)"
            >
              <circle r="24"></circle>
              <text y="5">{{ character.name }}</text>
            </g>
          </svg>
          <div class="pc-graph-zoom-row">
            <span>{{ t`视图比例` }}</span>
            <input v-model.number="graphZoom" type="range" min="50" max="100" step="5" />
            <input v-model.number="graphZoom" class="pc-zoom-number" type="number" min="50" max="100" step="5" />
          </div>
        </template>
      </article>

      <article class="pc-editor-card">
        <button class="pc-section-toggle" type="button" @click="charactersExpanded = !charactersExpanded">
          <strong>{{ t`人物` }}</strong>
          <span class="pc-section-meta">
            <span>{{ characters.length }} {{ t`个` }}</span>
            <i :class="['fa-solid', charactersExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </span>
        </button>
        <div v-if="charactersExpanded">
          <div class="pc-profile-add-row">
            <ProfileEntryPicker
              v-model="profileCharacterDraft"
              :disabled-ids="linkedCharacterProfileIds()"
              :empty-label="t`从资料表选择人物`"
              :kinds="['character']"
              :placeholder="t`从资料表选择人物`"
              :show-open-button="false"
            />
            <button class="pc-icon-btn" type="button" :disabled="!profileCharacterDraft" :title="t`添加关联人物`" @click="addProfileCharacter">
              <i class="fa-solid fa-link"></i>
            </button>
          </div>
          <div class="pc-inline-form">
            <input v-model="characterDraft" class="pc-field" type="text" :placeholder="t`人物名字`" @keydown.enter.prevent="addCharacter" />
            <button class="pc-icon-btn" type="button" :title="t`新增人物`" @click="addCharacter">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div v-if="characters.length" class="pc-compact-list">
            <article v-for="character in characters" :key="character.id" class="pc-character-editor-row">
              <div class="pc-compact-row">
                <input
                  class="pc-field"
                  type="text"
                  :disabled="isCharacterProfileLinked(character.profileEntryId)"
                  :value="character.name"
                  @change="renameCharacter(character.id, $event)"
                />
                <button class="pc-icon-btn danger" type="button" :title="t`删除`" @click="removeCharacter(character.id)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
              <ProfileEntryPicker
                :disabled-ids="linkedCharacterProfileIds(character.id)"
                :kinds="['character']"
                :model-value="character.profileEntryId"
                :placeholder="t`关联人物资料`"
                @update:model-value="onCharacterProfileChange(character.id, $event)"
              />
            </article>
          </div>
        </div>
      </article>

      <article class="pc-editor-card">
        <button class="pc-section-toggle" type="button" @click="linksExpanded = !linksExpanded">
          <strong>{{ t`单向关系` }}</strong>
          <span class="pc-section-meta">
            <span>{{ links.length }} {{ t`条` }}</span>
            <i :class="['fa-solid', linksExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </span>
        </button>
        <div v-if="linksExpanded">
          <div class="pc-relation-form">
            <select v-model="linkDraft.fromId" class="pc-field">
              <option value="">{{ t`谁` }}</option>
              <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }}</option>
            </select>
            <span class="pc-relation-word">{{ t`是` }}</span>
            <select v-model="linkDraft.toId" class="pc-field">
              <option value="">{{ t`谁的` }}</option>
              <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }}</option>
            </select>
            <input v-model="linkDraft.label" class="pc-field" type="text" :placeholder="t`关系，例如 父亲`" @keydown.enter.prevent="addLink" />
            <button class="pc-icon-btn" type="button" :title="t`新增关系`" @click="addLink">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>

          <div v-if="links.length" class="pc-list-filter">
            <select v-model="linkFilterCharacterId" class="pc-field">
              <option value="">{{ t`全部人物` }}</option>
              <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }}</option>
            </select>
            <div class="pc-view-segment compact">
              <button :class="['pc-view-btn', { active: linkFilterMode === 'all' }]" type="button" @click="linkFilterMode = 'all'">all</button>
              <button :class="['pc-view-btn', { active: linkFilterMode === 'from' }]" type="button" @click="linkFilterMode = 'from'">{{ t`他是` }}</button>
              <button :class="['pc-view-btn', { active: linkFilterMode === 'to' }]" type="button" @click="linkFilterMode = 'to'">{{ t`是他` }}</button>
            </div>
          </div>

          <div v-if="filteredLinks.length" class="pc-compact-list">
            <article v-for="link in filteredLinks" :key="link.id" class="pc-relation-row">
              <select class="pc-field" :value="link.fromId" @change="relationship.updateLink(link.id, { fromId: ($event.target as HTMLSelectElement).value })">
                <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }}</option>
              </select>
              <span class="pc-relation-word">{{ t`是` }}</span>
              <select class="pc-field" :value="link.toId" @change="relationship.updateLink(link.id, { toId: ($event.target as HTMLSelectElement).value })">
                <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }}</option>
              </select>
              <input class="pc-field" type="text" :value="link.label" @change="relationship.updateLink(link.id, { label: ($event.target as HTMLInputElement).value })" />
              <button class="pc-icon-btn danger" type="button" :title="t`删除`" @click="relationship.deleteLink(link.id)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </article>
          </div>
          <EmptyState v-else-if="links.length" compact :title="t`没有匹配的关系`" />
        </div>
      </article>

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
      />
    </section>

    <section v-else-if="route.page === 'generate'" class="pc-relationship-page">
      <article class="pc-editor-card">
        <span class="pc-kicker">{{ t`AI 关系识别` }}</span>
        <h2>{{ t`读取上下文生成当前关系` }}</h2>
        <input v-model="generationDraft.characterNames" class="pc-field" type="text" :placeholder="t`角色名，用逗号分隔，例如 沐辞, 谢无咎`" />
        <GenerationPanel
          :capture="captureRelationshipPrompt"
          :capture-reset-key="relationshipPromptPreview"
          :error="generationState.error"
          :from-start-end="generationDraft.fromStartEnd"
          :range-text="generationDraft.rangeText"
          :raw-output="generationState.rawOutput"
          :recent-count="generationDraft.recentCount"
          :references="selectedReferences"
          :running="generationState.running"
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
      </article>
    </section>

    <section v-else-if="route.page === 'preview' && generationState.preview" class="pc-relationship-page pc-generation-preview-page">
      <article class="pc-detail-card pc-generation-preview-card">
        <GenerationPreviewPanel
          :content="relationshipPreviewText"
          :raw="generationState.preview.raw"
          raw-editable
          :reparse-handler="reparsePreviewRaw"
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
        >
          <template #content>
            <section class="pc-preview-box">
              <strong>{{ t`人物` }}</strong>
              <p>{{ generationState.preview.data.characters.join('、') || t`无新增人物` }}</p>
              <strong>{{ t`关系` }}</strong>
              <p v-for="(relation, index) in generationState.preview.data.relations" :key="index">
                {{ relation.from }} 是 {{ relation.to }} 的 {{ relation.label }}
              </p>
            </section>
          </template>
        </GenerationPreviewPanel>
      </article>
    </section>

    <section v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-relationship-page pc-repair-page">
      <article class="pc-editor-card pc-repair-card">
        <span class="pc-kicker">{{ activeFailedDraft.source.label }}</span>
        <h2>{{ t`修复解析失败草稿` }}</h2>
        <div v-if="activeFailedDraft.warnings.length" class="pc-status-card warning">
          <strong>{{ t`上次解析提示` }}</strong>
          <p>{{ activeFailedDraft.warnings.join('；') }}</p>
        </div>
        <label class="pc-number-field pc-repair-raw-field">
          <span class="pc-field-label">{{ t`原始输出` }}</span>
          <RawOutputEditor
            v-model="failedDraftRawOutput"
            :placeholder="t`在这里修 XML 结构或补 characters / relations。`"
            @reparse="reparseFailedDraft"
          />
        </label>
        <div class="pc-form-actions pc-relationship-actions">
          <button class="pc-soft-btn danger" type="button" @click="removeFailedDraft(activeFailedDraft.id)">{{ t`删除草稿` }}</button>
          <button class="pc-soft-btn" type="button" @click="reparseFailedDraft">{{ t`重新解析` }}</button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import ProfileEntryPicker from '@/components/ProfileEntryPicker.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { useProfilesStore } from '@/apps/profiles/store';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { FailedGenerationDraft } from '@/type/generation';
import type { GenerationReferenceItem } from '@/util/references';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import { formatGenerationReferences } from '@/util/references';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { formatTextProviderSummary } from '@/util/textProvider';
import { useRelationshipStore, type RelationshipGeneratedResult } from './store';
import { parseRelationshipXmlResult } from './generation';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const profiles = useProfilesStore();
const relationship = useRelationshipStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const adapter = getRegisteredPhoneGenerationAdapter('relationship', 'generate');
const { currentRoute: route } = storeToRefs(phone);
const { characters, failedDrafts, links } = storeToRefs(relationship);
const { settings } = storeToRefs(settingsStore);
const graphSvg = ref<SVGSVGElement | null>(null);
const characterDraft = ref('');
const profileCharacterDraft = ref('');
const failedDraftRawOutput = ref('');
const charactersExpanded = ref(true);
const linksExpanded = ref(true);
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const perspectiveCharacterId = ref('');
const relationViewMode = ref<'all' | 'from' | 'to'>('all');
const graphZoom = ref(100);
const linkFilterCharacterId = ref('');
const linkFilterMode = ref<'all' | 'from' | 'to'>('all');
const linkDraft = reactive({
  fromId: '',
  toId: '',
  label: '',
});
const drag = reactive({
  characterId: '',
  pointerId: null as number | null,
});
const generationDraft = reactive({
  characterNames: '',
  fromStartEnd: 20,
  recentCount: 20,
  rangeText: '',
  singleMessageId: 0,
  userRequirement: '',
});
const generationState = reactive({
  error: '',
  generationId: '',
  preview: null as null | {
    data: RelationshipGeneratedResult;
    draftId: null | string;
    raw: string;
    source: { label: string };
    warnings: string[];
  },
  rawOutput: '',
  running: false,
});
type RelationshipPreview = NonNullable<typeof generationState.preview>;

const {
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
const activeFailedDraft = computed(() => route.value.params?.draftId ? relationship.getFailedDraft(route.value.params.draftId) : null);
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const textProviderSummary = computed(() => settings.value.textProvider.mode === 'external'
  ? formatTextProviderSummary(settings.value.textProvider)
  : '跟随酒馆当前模型');
const normalizedGraphZoom = computed(() => Math.min(100, Math.max(50, Number(graphZoom.value) || 100)));
const graphViewBox = computed(() => {
  const scale = 100 / normalizedGraphZoom.value;
  const width = 320 * scale;
  const height = 260 * scale;
  return `${(320 - width) / 2} ${(260 - height) / 2} ${width} ${height}`;
});
const visibleLinks = computed(() => {
  if (!perspectiveCharacterId.value || relationViewMode.value === 'all') return links.value;
  if (relationViewMode.value === 'from') {
    return links.value.filter(link => link.fromId === perspectiveCharacterId.value);
  }
  return links.value.filter(link => link.toId === perspectiveCharacterId.value);
});
const filteredLinks = computed(() => {
  if (!linkFilterCharacterId.value || linkFilterMode.value === 'all') return links.value;
  if (linkFilterMode.value === 'from') {
    return links.value.filter(link => link.fromId === linkFilterCharacterId.value);
  }
  return links.value.filter(link => link.toId === linkFilterCharacterId.value);
});
const relationViews = computed(() => visibleLinks.value.map(link => {
  const from = characterById.value.get(link.fromId);
  const to = characterById.value.get(link.toId);
  if (!from || !to) return null;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const reverse = visibleLinks.value.some(item => item.fromId === link.toId && item.toId === link.fromId);
  const first = from.x < to.x || (from.x === to.x && from.y <= to.y) ? from : to;
  const second = first.id === from.id ? to : from;
  const pairDx = second.x - first.x;
  const pairDy = second.y - first.y;
  const pairLength = Math.max(1, Math.hypot(pairDx, pairDy));
  const pairNormalX = -(pairDy / pairLength);
  const pairNormalY = pairDx / pairLength;
  const side = reverse ? (link.fromId === first.id ? -1 : 1) : 0;
  const labelSide = reverse ? side : -1;
  const lineOffset = reverse ? side * 14 : 0;
  const labelOffset = labelSide * 34;
  const labelWidth = Math.min(104, Math.max(34, link.label.length * 13 + 18));
  return {
    id: link.id,
    label: link.label,
    labelWidth,
    labelX: (from.x + to.x) / 2 + pairNormalX * labelOffset,
    labelY: (from.y + to.y) / 2 + pairNormalY * labelOffset + 4,
    x1: from.x + unitX * 28 + pairNormalX * lineOffset,
    x2: to.x - unitX * 32 + pairNormalX * lineOffset,
    y1: from.y + unitY * 28 + pairNormalY * lineOffset,
    y2: to.y - unitY * 32 + pairNormalY * lineOffset,
  };
}).filter((view): view is NonNullable<typeof view> => Boolean(view)));
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
  characters,
  nextCharacters => {
    if (nextCharacters.some(character => character.id === perspectiveCharacterId.value)) return;
    perspectiveCharacterId.value = nextCharacters[0]?.id || '';
  },
  { immediate: true },
);

watch(graphZoom, nextZoom => {
  const clamped = Math.min(100, Math.max(50, Number(nextZoom) || 100));
  if (clamped !== nextZoom) graphZoom.value = clamped;
});

watch(
  () => route.value,
  current => {
    if (current.appId !== 'relationship') return;
    if (current.page === 'generate') {
      selectedReferences.value = [];
      generationDraft.characterNames = characters.value.map(character => character.name).join(', ');
      generationDraft.userRequirement = '';
      generationState.error = '';
      generationState.preview = null;
      generationState.rawOutput = '';
    }
    if (current.page === 'failed-draft') {
      failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
    }
  },
);

useInvalidRouteFallback({
  source: () => ({
    appId: route.value.appId,
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    page: route.value.page,
  }),
  isInvalid: current => current.appId === 'relationship' && (
    current.page === 'preview' && !current.hasPreview
    || current.page === 'failed-draft' && !current.hasFailedDraft
  ),
  fallback: () => {
    if (route.value.appId !== 'relationship') return;
    phone.replacePage('root', '关系网');
  },
});

onScopeDispose(() => {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
});

function addCharacter() {
  const character = relationship.createCharacter(characterDraft.value);
  if (!character) {
    toastr.warning('请先填写人物名字');
    return;
  }
  characterDraft.value = '';
}

function addProfileCharacter() {
  if (!profileCharacterDraft.value) return;
  const existing = characters.value.find(character => character.profileEntryId === profileCharacterDraft.value);
  const character = relationship.createCharacterFromProfile(profileCharacterDraft.value);
  if (!character) {
    toastr.warning('已有同名人物关联了其他资料');
    return;
  }
  profileCharacterDraft.value = '';
  toastr.success(existing ? '该人物已经在关系网中' : '已从资料表添加人物');
}

function isCharacterProfileLinked(profileEntryId: string) {
  return Boolean(profileEntryId && profiles.getEntry(profileEntryId));
}

function linkedCharacterProfileIds(exceptCharacterId = '') {
  return characters.value
    .filter(character => character.id !== exceptCharacterId && character.profileEntryId)
    .map(character => character.profileEntryId);
}

function onCharacterProfileChange(characterId: string, profileEntryId: string) {
  if (relationship.linkCharacterProfile(characterId, profileEntryId)) return;
  toastr.warning('这份人物资料已经关联到其他人物');
}

function renameCharacter(characterId: string, event: Event) {
  const target = event.target as HTMLInputElement | null;
  const character = relationship.getCharacter(characterId);
  if (!target || !character) return;

  const name = target.value.trim();
  if (!name) {
    toastr.warning('人物名字不能为空，请修改后再保存');
    target.value = character.name;
    return;
  }

  const duplicate = relationship.findDuplicateCharacterName(name, characterId);
  if (duplicate) {
    toastr.warning(`已经有名为“${duplicate.name}”的人物，请换一个名字`);
    target.value = character.name;
    return;
  }

  relationship.updateCharacter(characterId, { name });
}

async function removeCharacter(characterId: string) {
  const character = relationship.getCharacter(characterId);
  if (!character) return;
  const shouldDelete = await phone.confirmNotice(`要删除人物“${character.name}”和相关关系吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  relationship.deleteCharacter(characterId);
}

function addLink() {
  const link = relationship.upsertLink(linkDraft.fromId, linkDraft.toId, linkDraft.label);
  if (!link) {
    toastr.warning('请选择两个人物，并填写关系');
    return;
  }
  linkDraft.label = '';
}

function openGenerate() {
  phone.pushPage('generate', 'AI 关系识别');
}

function openFailedDraft(draftId: string) {
  if (!relationship.getFailedDraft(draftId)) return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function failedDraftTitle() {
  return '未解析关系';
}

function failedDraftSourceLabel(draft: FailedGenerationDraft) {
  return draft.source.label;
}

function getSvgPoint(event: PointerEvent) {
  const svg = graphSvg.value;
  const matrix = svg?.getScreenCTM()?.inverse();
  if (!svg || !matrix) return null;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(matrix);
}

function onNodePointerDown(event: PointerEvent, characterId: string) {
  drag.characterId = characterId;
  drag.pointerId = event.pointerId;
  (event.currentTarget as SVGElement).setPointerCapture?.(event.pointerId);
}

function onGraphPointerMove(event: PointerEvent) {
  if (drag.pointerId !== event.pointerId || !drag.characterId) return;
  const point = getSvgPoint(event);
  if (!point) return;
  relationship.updateCharacter(drag.characterId, { x: point.x, y: point.y });
}

function onGraphPointerUp(event: PointerEvent) {
  if (drag.pointerId !== event.pointerId) return;
  drag.characterId = '';
  drag.pointerId = null;
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
  generationState.error = '';
  clearRelationshipPreviewDraft();
  generationState.rawOutput = '';
  generationState.preview = null;
  try {
    const result = await generateContent(adapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => relationship.createFailedDraft(input),
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
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的关系 XML';
      toastr.warning('XML 解析失败，已保存失败草稿');
      phone.replacePage('failed-draft', '解析失败草稿', { draftId: result.draft.id });
      return;
    }

    if (result.status === 'saved') {
      toastr.success('已合并关系网');
      phone.replacePage('root', '关系网');
      return;
    }

    generationState.preview = {
      data: result.data,
      draftId: null,
      raw: result.rawOutput,
      source: { label: result.source.label },
      warnings: result.warnings,
    };
    persistRelationshipPreviewDraft();
    phone.replacePage('preview', '关系预览');
  } catch (caughtError) {
    generationState.error = caughtError instanceof Error ? caughtError.message : '生成关系失败';
  }
}

function returnToGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  phone.replacePage('generate', 'AI 关系识别');
}

function savePreview() {
  const preview = generationState.preview;
  if (!preview) return;
  relationship.mergeGenerated(preview.data);
  if (preview.draftId) relationship.deleteFailedDraft(preview.draftId);
  clearRelationshipPreviewDraft();
  generationState.preview = null;
  toastr.success('已合并关系网');
  phone.replacePage('root', '关系网');
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const rawOutput = preview.raw.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return false;
  }

  const parsed = parseRelationshipXmlResult(rawOutput);
  if (!parsed.ok) {
    preview.raw = rawOutput;
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }

  preview.data = parsed.data;
  preview.raw = parsed.raw;
  preview.warnings = parsed.warnings;
  toastr.success('已按原始输出重新解析');
  return true;
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  relationship.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') phone.replacePage('root', '关系网');
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const draft = activeFailedDraft.value;
  if (!draft) return;
  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return;
  }

  const parsed = parseRelationshipXmlResult(rawOutput);
  if (!parsed.ok) {
    relationship.updateFailedDraft(draft.id, {
      rawOutput,
      warnings: parsed.warnings,
    });
    failedDraftRawOutput.value = rawOutput;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }

  relationship.updateFailedDraft(draft.id, {
    rawOutput: parsed.raw,
    warnings: parsed.warnings,
  });
  generationState.preview = {
    data: parsed.data,
    draftId: null,
    raw: parsed.raw,
    source: { label: draft.source.label },
    warnings: parsed.warnings,
  };
  persistRelationshipPreviewDraft();
  relationship.deleteFailedDraft(draft.id);
  failedDraftRawOutput.value = '';
  phone.replacePage('preview', '关系预览');
}

function stopGeneration() {
  if (!generationState.generationId) return;
  stopGenerationByIdSafe(generationState.generationId);
  generationState.running = false;
  generationState.error = '生成已停止';
}
</script>

<style scoped>
.pc-relationship-app,
.pc-relationship-page {
  min-height: 100%;
}

.pc-relationship-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pc-relationship-hero,
.pc-graph-card,
.pc-detail-card {
  border: 1px solid var(--pc-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--pc-surface) 72%, transparent 28%);
  backdrop-filter: blur(12px);
  padding: 14px;
}

.pc-relationship-hero,
.pc-form-actions,
.pc-inline-form,
.pc-compact-row,
.pc-relation-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pc-relationship-hero h2,
.pc-detail-card h2,
.pc-editor-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
}

.pc-relationship-viewbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin-bottom: 10px;
}

.pc-relationship-viewbar:has(.pc-view-segment) {
  align-items: center;
}

.pc-relationship-viewbar .pc-field {
  min-width: 0;
}

.pc-view-segment {
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(0, auto));
  gap: 4px;
  height: 40px;
  padding: 4px;
  border-radius: 999px;
  background: var(--pc-surface-strong);
}

.pc-view-segment.compact {
  width: 100%;
}

.pc-view-btn {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  padding: 0 10px;
  white-space: nowrap;
}

.pc-view-btn.active {
  background: color-mix(in srgb, #3d8bfd 22%, var(--pc-surface) 78%);
  color: var(--pc-text);
}

@media (max-width: 640px) {
  .pc-relationship-viewbar,
  .pc-list-filter {
    grid-template-columns: 1fr;
  }

  .pc-view-segment {
    width: 100%;
  }
}

.pc-graph-zoom-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 62px;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 700;
}

.pc-graph-zoom-row input[type='range'] {
  width: 100%;
}

.pc-zoom-number {
  width: 62px;
  border: 1px solid var(--pc-border);
  border-radius: 12px;
  background: var(--pc-surface-strong);
  color: var(--pc-text);
  padding: 8px 6px;
  text-align: center;
}

.pc-section-toggle {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0;
  text-align: left;
}

.pc-section-toggle > strong {
  min-width: 0;
  font-size: 18px;
  line-height: 1.2;
}

.pc-section-meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--pc-muted);
  font-size: 13px;
  font-weight: 700;
}

.pc-section-meta i {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  background: var(--pc-surface-strong);
}

.pc-relationship-graph {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 13;
  border-radius: 16px;
  background: color-mix(in srgb, var(--pc-surface-strong) 72%, transparent 28%);
  touch-action: none;
}

.pc-relationship-graph marker path {
  fill: color-mix(in srgb, #3d8bfd 78%, var(--pc-text) 22%);
}

.pc-relation-line line {
  stroke: color-mix(in srgb, #3d8bfd 70%, var(--pc-text) 30%);
  stroke-linecap: round;
  stroke-width: 1.8;
  marker-end: url(#pc-relationship-arrow);
}

.pc-relation-line text {
  fill: var(--pc-text);
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
  text-anchor: middle;
}

.pc-relation-label-bg {
  fill: color-mix(in srgb, var(--pc-surface-strong) 92%, white 8%);
  opacity: 0.78;
  pointer-events: none;
  stroke: color-mix(in srgb, var(--pc-border) 70%, transparent 30%);
  stroke-width: 1;
}

.pc-character-node {
  cursor: grab;
}

.pc-character-node.dragging {
  cursor: grabbing;
}

.pc-character-node circle {
  fill: color-mix(in srgb, #34c759 16%, var(--pc-surface-strong) 84%);
  stroke: color-mix(in srgb, #34c759 72%, var(--pc-border) 28%);
  stroke-width: 2;
}

.pc-character-node text {
  fill: var(--pc-text);
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
  text-anchor: middle;
}

.pc-editor-card > .pc-field {
  margin-top: 12px;
}

.pc-raw-output .pc-area {
  margin-top: 12px;
}

.pc-inline-form,
.pc-profile-add-row,
.pc-relation-form,
.pc-list-filter,
.pc-compact-list,
.pc-preview-box,
.pc-raw-output {
  margin-top: 12px;
}

.pc-profile-add-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  gap: 8px;
  align-items: center;
}

.pc-character-editor-row {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-relation-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.pc-relation-form input {
  grid-column: 1 / 3;
}

.pc-list-filter {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.pc-compact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pc-relation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) minmax(0, 1fr) auto;
}

.pc-relation-word,
.pc-detail-meta,
.pc-preview-box p,
.pc-status-card p {
  color: var(--pc-muted);
}

.pc-relation-word {
  white-space: nowrap;
  font-weight: 700;
}

.pc-preview-box,
.pc-status-card {
  border: 1px solid var(--pc-border);
  border-radius: 18px;
  background: var(--pc-surface-strong);
  padding: 14px;
}

.pc-preview-box strong {
  display: block;
  margin-top: 10px;
}

.pc-preview-box strong:first-child {
  margin-top: 0;
}

.pc-preview-box p {
  margin: 7px 0 0;
  white-space: pre-wrap;
}

.pc-status-card.warning {
  border-color: color-mix(in srgb, #f5a623 42%, var(--pc-border) 58%);
}

.pc-detail-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.pc-relationship-actions {
  margin-top: 16px;
  justify-content: flex-end;
}

.pc-raw-area {
  min-height: 180px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
