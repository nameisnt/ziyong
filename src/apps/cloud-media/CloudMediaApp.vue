<template>
  <section class="pc-cloud-media-app">
    <template v-if="route.page === 'root'">
      <header class="pc-compact-toolbar pc-directory-toolbar pc-cloud-media-head">
        <span class="pc-directory-count">{{ settings.profiles.length }} {{ t`个服务配置` }}</span>
        <div class="pc-cloud-head-actions">
          <button
            class="pc-icon-btn primary"
            type="button"
            :disabled="!activeProfile"
            :title="t`AI 生成媒体提示词`"
            @click="openAiGenerate"
          >
            <i class="fa-solid fa-wand-magic-sparkles"></i>
          </button>
          <button class="pc-icon-btn" type="button" :title="t`配置服务`" @click="openSettings">
            <i class="fa-solid fa-gear"></i>
          </button>
        </div>
      </header>

      <EmptyState v-if="!phone.isViewingCurrentChat" :title="t`历史聊天不能生成媒体`">
        <p>{{ t`请先返回酒馆当前聊天，再使用云端生成。` }}</p>
      </EmptyState>

      <EmptyState v-else-if="!activeProfile" :title="t`还没有云媒体配置`">
        <p>{{ t`先添加 fal.ai、MiniMax 或 NovelAI 配置。` }}</p>
        <button class="pc-primary-btn" type="button" @click="openSettings">{{ t`添加配置` }}</button>
      </EmptyState>

      <template v-else>
        <article class="pc-page-section pc-cloud-profile-card">
          <label class="pc-field-group">
            <span>{{ t`生成配置` }}</span>
            <select v-model="settings.activeProfileId" class="pc-field pc-select" :disabled="generating">
              <option v-for="profile in settings.profiles" :key="profile.id" :value="profile.id">
                {{ profile.name }}
              </option>
            </select>
          </label>
          <div class="pc-cloud-profile-meta">
            <strong>{{ providerLabel(activeProfile.provider) }}</strong>
            <span>{{ kindLabel(activeProfile.kind) }} · {{ activeProfile.model || t`未填写模型` }}</span>
          </div>
        </article>

        <details class="pc-page-section pc-cloud-manual">
          <summary>{{ t`直接输入提示词（备用）` }}</summary>
          <div class="pc-cloud-manual-fields">
            <label class="pc-field-group">
              <span>{{ t`标题` }}</span>
              <input v-model="draft.title" class="pc-field" type="text" :placeholder="t`留空则自动命名`" />
            </label>
            <label class="pc-field-group">
              <span>{{ activeProfile.kind === 'audio' ? t`音乐描述` : t`生成提示词` }}</span>
              <textarea v-model="draft.prompt" class="pc-area" rows="7" :placeholder="promptPlaceholder"></textarea>
            </label>
            <label v-if="activeProfile.kind === 'image'" class="pc-field-group">
              <span>{{ t`负面提示词` }}</span>
              <textarea
                v-model="draft.negativePrompt"
                class="pc-area compact"
                rows="3"
                :placeholder="t`不希望出现在画面中的内容`"
              ></textarea>
            </label>
            <template v-if="activeProfile.provider === 'minimax' && activeProfile.kind === 'audio'">
              <div class="pc-cloud-toggle-row">
                <div>
                  <strong>{{ t`纯音乐` }}</strong>
                  <small>{{ t`关闭后可填写歌词` }}</small>
                </div>
                <label class="pc-toggle">
                  <input v-model="activeProfile.instrumental" type="checkbox" />
                  <span></span>
                </label>
              </div>
              <label v-if="!activeProfile.instrumental" class="pc-field-group">
                <span>{{ t`歌词` }}</span>
                <textarea
                  v-model="draft.lyrics"
                  class="pc-area compact"
                  rows="6"
                  :placeholder="t`可留空让 MiniMax 自动生成歌词`"
                ></textarea>
              </label>
            </template>

            <div v-if="statusText || errorMessage" class="pc-cloud-status" :class="{ error: errorMessage }">
              <i :class="errorMessage ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-spinner fa-spin'"></i>
              <span>{{ errorMessage || statusText }}</span>
            </div>

            <div class="pc-form-actions">
              <button v-if="generating" class="pc-soft-btn danger" type="button" @click="stopGeneration">
                <i class="fa-solid fa-stop"></i>
                <span>{{ t`停止` }}</span>
              </button>
              <button
                class="pc-primary-btn"
                type="button"
                :disabled="generating || !draft.prompt.trim()"
                @click="runGeneration"
              >
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>{{ generating ? t`生成中` : t`生成并保存` }}</span>
              </button>
            </div>
          </div>
        </details>

        <article v-if="latestOutput" class="pc-section-card pc-cloud-output">
          <div class="pc-section-head">
            <strong>{{ t`本次结果` }}</strong>
            <span>{{ kindLabel(latestOutput.kind) }}</span>
          </div>
          <img v-if="latestOutput.kind === 'image'" :src="latestOutput.url" :alt="latestOutput.title" />
          <audio v-else-if="latestOutput.kind === 'audio'" :src="latestOutput.url" controls></audio>
          <video v-else :src="latestOutput.url" controls playsinline></video>
          <p>{{ latestOutput.title }}</p>
        </article>

        <FailedDraftList
          :drafts="cloudFailedDrafts"
          :get-context="failedDraftSourceLabel"
          :get-title="failedDraftTitle"
          @open="openFailedDraft"
          @remove="removeFailedDraft"
        />

        <PreviewDraftNotice
          :draft="cloudPreviewDraft"
          @discard="discardCloudPreviewDraft"
          @open="openCloudPreviewDraft"
        />
      </template>
    </template>

    <article v-else-if="route.page === 'generate' && activeProfile" class="pc-cloud-generate-form">
      <GenerationPanel
        :capture="captureCloudPrompt"
        :capture-reset-key="cloudPromptPreview"
        :error="generationState.error"
        :from-start-end="generationDraft.fromStartEnd"
        :range-text="generationDraft.rangeText"
        :raw-output="generationState.rawOutput"
        :recent-count="generationDraft.recentCount"
        :references="selectedReferences"
        :running="generationState.running"
        :single-message-id="generationDraft.singleMessageId"
        :source-mode="generationSettings.generation.sourceMode"
        :user-requirement="generationDraft.userRequirement"
        generate-label="生成媒体提示词"
        requirement-label="画面、音乐或视频要求"
        requirement-placeholder="例如：把最新剧情生成一张夜雨街头的电影感画面，重点表现两人的距离感。"
        @cancel="phone.goBack()"
        @generate="runAiGeneration"
        @stop="stopGeneration"
        @update:from-start-end="generationDraft.fromStartEnd = $event"
        @update:range-text="generationDraft.rangeText = $event"
        @update:recent-count="generationDraft.recentCount = $event"
        @update:references="selectedReferences = $event"
        @update:single-message-id="generationDraft.singleMessageId = $event"
        @update:source-mode="generationSettings.generation.sourceMode = $event"
        @update:user-requirement="generationDraft.userRequirement = $event"
      >
        <template #before-fields>
          <label class="pc-field-group">
            <span>{{ t`云媒体配置` }}</span>
            <select v-model="settings.activeProfileId" class="pc-field pc-select" :disabled="generationState.running">
              <option v-for="profile in settings.profiles" :key="profile.id" :value="profile.id">
                {{ profile.name }} · {{ kindLabel(profile.kind) }}
              </option>
            </select>
          </label>
        </template>
      </GenerationPanel>
    </article>

    <article v-else-if="route.page === 'preview' && generationState.preview" class="pc-generation-preview-card">
      <GenerationPreviewPanel
        :content="previewContent"
        :raw="generationState.preview.raw"
        raw-editable
        :reparse-handler="reparsePreviewRaw"
        :scan-enabled="false"
        :short-content-guard="false"
        :source-label="generationState.preview.source.label"
        :text-provider-summary="textProviderSummary"
        :title="generationState.preview.title"
        :warnings="generationState.preview.warnings"
        content-label="媒体提示词"
        :editable="false"
        :save-disabled="generating"
        :save-label="generating ? '生成中' : '调用 API 生成并保存'"
        @back="returnToAiGenerate"
        @reparse="reparsePreviewRaw"
        @save="saveAiPreview"
        @update:raw="generationState.preview.raw = $event"
      >
        <template #content>
          <section class="pc-cloud-preview-fields">
            <label class="pc-field-group">
              <span>{{ t`标题` }}</span>
              <input v-model="generationState.preview.title" class="pc-field" type="text" />
            </label>
            <label class="pc-field-group">
              <span>{{ t`生成提示词` }}</span>
              <textarea v-model="generationState.preview.prompt" class="pc-area" rows="8"></textarea>
            </label>
            <label v-if="generationState.preview.kind === 'image'" class="pc-field-group">
              <span>{{ t`负面提示词` }}</span>
              <textarea v-model="generationState.preview.negativePrompt" class="pc-area compact" rows="4"></textarea>
            </label>
            <label
              v-if="generationState.preview.kind === 'audio' && !generationState.preview.instrumental"
              class="pc-field-group"
            >
              <span>{{ t`歌词` }}</span>
              <textarea v-model="generationState.preview.lyrics" class="pc-area compact" rows="8"></textarea>
            </label>
            <label class="pc-field-group">
              <span>{{ t`生成说明` }}</span>
              <textarea v-model="generationState.preview.note" class="pc-area compact" rows="3"></textarea>
            </label>
            <div v-if="statusText" class="pc-cloud-status">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>{{ statusText }}</span>
            </div>
          </section>
        </template>
      </GenerationPreviewPanel>
    </article>

    <article v-else-if="route.page === 'failed-draft' && activeFailedDraft" class="pc-repair-card">
      <div v-if="activeFailedDraft.warnings.length" class="pc-status-card warning">
        <strong>{{ t`上次解析提示` }}</strong>
        <p>{{ activeFailedDraft.warnings.join('；') }}</p>
      </div>
      <RawOutputEditor
        v-model="failedDraftRawOutput"
        :placeholder="t`在这里修正云媒体提示词 XML。`"
        @reparse="reparseFailedDraft"
      />
      <div class="pc-form-actions">
        <button class="pc-soft-btn danger" type="button" @click="removeFailedDraft(activeFailedDraft.id)">
          {{ t`删除草稿` }}
        </button>
        <button class="pc-primary-btn" type="button" @click="reparseFailedDraft">{{ t`重新解析` }}</button>
      </div>
    </article>

    <template v-else-if="route.page === 'settings'">
      <header class="pc-compact-toolbar pc-directory-toolbar pc-cloud-media-head">
        <span class="pc-directory-count">{{ settings.profiles.length }} {{ t`个配置` }}</span>
        <button class="pc-icon-btn" type="button" :title="t`新增配置`" @click="addProfile">
          <i class="fa-solid fa-plus"></i>
        </button>
      </header>

      <div class="pc-cloud-profile-picker">
        <select v-model="settings.activeProfileId" class="pc-field pc-select">
          <option v-for="profile in settings.profiles" :key="profile.id" :value="profile.id">
            {{ profile.name }}
          </option>
        </select>
        <button
          class="pc-icon-btn danger"
          type="button"
          :disabled="settings.profiles.length <= 1"
          :title="t`删除配置`"
          @click="deleteActiveProfile"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>

      <article v-if="activeProfile" class="pc-cloud-settings-card">
        <label class="pc-field-group">
          <span>{{ t`配置名称` }}</span>
          <input v-model="activeProfile.name" class="pc-field" type="text" />
        </label>
        <div class="pc-grid two">
          <label class="pc-field-group">
            <span>{{ t`服务商` }}</span>
            <select
              :value="activeProfile.provider"
              class="pc-field pc-select"
              @change="changeProvider(($event.target as HTMLSelectElement).value)"
            >
              <option value="fal">fal.ai</option>
              <option value="minimax">MiniMax</option>
              <option value="novelai">NovelAI</option>
            </select>
          </label>
          <label class="pc-field-group">
            <span>{{ t`媒体类型` }}</span>
            <select
              :value="activeProfile.kind"
              class="pc-field pc-select"
              :disabled="activeProfile.provider === 'novelai'"
              @change="changeKind(($event.target as HTMLSelectElement).value)"
            >
              <option value="image">{{ t`图片` }}</option>
              <option value="audio">{{ t`音频` }}</option>
              <option value="video">{{ t`视频` }}</option>
            </select>
          </label>
        </div>
        <label class="pc-field-group">
          <span>{{ activeProfile.provider === 'novelai' ? t`NovelAI Token` : t`API Key` }}</span>
          <div class="pc-cloud-secret">
            <input
              v-model="activeProfile.apiKey"
              class="pc-field"
              :type="showApiKey ? 'text' : 'password'"
              autocomplete="off"
              :placeholder="t`不会导出到备份`"
            />
            <button
              class="pc-icon-btn"
              type="button"
              :title="showApiKey ? t`隐藏密钥` : t`显示密钥`"
              @click="showApiKey = !showApiKey"
            >
              <i :class="showApiKey ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
            </button>
          </div>
        </label>
        <label class="pc-field-group">
          <span>{{ t`接口地址` }}</span>
          <input v-model="activeProfile.baseUrl" class="pc-field" type="url" />
        </label>
        <label class="pc-field-group">
          <span>{{ activeProfile.provider === 'fal' ? t`模型端点` : t`模型` }}</span>
          <input
            v-model="activeProfile.model"
            class="pc-field"
            type="text"
            :list="activeProfile.provider === 'novelai' ? 'pc-novelai-models' : undefined"
            :placeholder="modelPlaceholder"
          />
          <datalist id="pc-novelai-models">
            <option value="nai-diffusion-4-5-full"></option>
            <option value="nai-diffusion-4-5-curated"></option>
            <option value="nai-diffusion-4-full"></option>
            <option value="nai-diffusion-4-curated-preview"></option>
            <option value="nai-diffusion-3"></option>
            <option value="nai-diffusion-furry-3"></option>
          </datalist>
        </label>

        <template v-if="activeProfile.kind === 'image'">
          <div v-if="activeProfile.provider === 'minimax'" class="pc-grid two">
            <label class="pc-field-group">
              <span>{{ t`画面比例` }}</span>
              <select v-model="activeProfile.aspectRatio" class="pc-field pc-select">
                <option v-for="ratio in imageRatios" :key="ratio" :value="ratio">{{ ratio }}</option>
              </select>
            </label>
          </div>
          <div v-else class="pc-grid two">
            <label class="pc-field-group">
              <span>{{ t`宽度` }}</span>
              <input
                v-model.number="activeProfile.width"
                class="pc-field"
                type="number"
                min="64"
                max="4096"
                step="64"
              />
            </label>
            <label class="pc-field-group">
              <span>{{ t`高度` }}</span>
              <input
                v-model.number="activeProfile.height"
                class="pc-field"
                type="number"
                min="64"
                max="4096"
                step="64"
              />
            </label>
          </div>
        </template>

        <div v-if="activeProfile.provider === 'novelai'" class="pc-grid two">
          <label class="pc-field-group">
            <span>{{ t`步数` }}</span>
            <input v-model.number="activeProfile.steps" class="pc-field" type="number" min="1" max="100" />
          </label>
          <label class="pc-field-group">
            <span>{{ t`提示词引导` }}</span>
            <input v-model.number="activeProfile.guidance" class="pc-field" type="number" min="0" max="30" step="0.1" />
          </label>
          <label class="pc-field-group pc-cloud-wide-field">
            <span>{{ t`采样器` }}</span>
            <input v-model="activeProfile.sampler" class="pc-field" type="text" />
          </label>
        </div>

        <div v-if="activeProfile.kind === 'video'" class="pc-grid two">
          <label class="pc-field-group">
            <span>{{ t`时长（秒）` }}</span>
            <input v-model.number="activeProfile.duration" class="pc-field" type="number" min="1" max="30" />
          </label>
          <label v-if="activeProfile.provider === 'minimax'" class="pc-field-group">
            <span>{{ t`清晰度` }}</span>
            <select v-model="activeProfile.resolution" class="pc-field pc-select">
              <option value="768P">768P</option>
              <option value="1080P">1080P</option>
            </select>
          </label>
        </div>

        <details v-if="activeProfile.provider === 'fal'" class="pc-section-card pc-cloud-advanced">
          <summary>{{ t`高级请求 JSON` }}</summary>
          <p>{{ t`这里的字段会覆盖默认提示词、尺寸或时长参数。` }}</p>
          <textarea v-model="activeProfile.requestJson" class="pc-area compact" rows="8" spellcheck="false"></textarea>
        </details>

        <div class="pc-cloud-config-note">
          <i class="fa-solid fa-circle-info"></i>
          <span>{{ providerNote }}</span>
        </div>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import FailedDraftList from '@/components/FailedDraftList.vue';
import GenerationPanel from '@/components/GenerationPanel.vue';
import GenerationPreviewPanel from '@/components/GenerationPreviewPanel.vue';
import PreviewDraftNotice from '@/components/PreviewDraftNotice.vue';
import RawOutputEditor from '@/components/RawOutputEditor.vue';
import { useMediaStore, type MediaEntry, type MediaKind } from '@/apps/media/store';
import { getRegisteredPhoneGenerationAdapter } from '@/core/appRegistry';
import { buildGenerationPreview, captureGenerationPrompt, generateContent } from '@/core/generationService';
import { usePhoneStore } from '@/store/phone';
import { usePromptStore } from '@/store/prompts';
import { useSettingsStore } from '@/store/settings';
import type { FailedGenerationDraft } from '@/type/generation';
import { usePreviewDraftPersistence } from '@/util/previewDrafts';
import type { GenerationReferenceItem } from '@/util/references';
import { formatGenerationReferences } from '@/util/references';
import { useInvalidRouteFallback } from '@/util/routeFallback';
import { stopGenerationByIdSafe } from '@/util/runtime';
import { formatTextProviderSummary } from '@/util/textProvider';
import { parseCloudMediaPromptXmlResult, type CloudMediaPromptResult } from './generation';
import { generateCloudMedia } from './providers';
import { CloudMediaProviderSchema, useCloudMediaStore, type CloudMediaProfile, type CloudMediaProvider } from './store';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const cloudMedia = useCloudMediaStore();
const media = useMediaStore();
const prompts = usePromptStore();
const settingsStore = useSettingsStore();
const adapter = getRegisteredPhoneGenerationAdapter('cloud-media', 'generate-prompt');
const { activeProfile, settings } = storeToRefs(cloudMedia);
const { failedDrafts } = storeToRefs(media);
const { settings: generationSettings } = storeToRefs(settingsStore);
const route = computed(() => phone.currentRoute);
const imageRatios = ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16'];
const showApiKey = ref(false);
const generating = ref(false);
const statusText = ref('');
const errorMessage = ref('');
const latestOutput = ref<MediaEntry | null>(null);
const controller = shallowRef<AbortController | null>(null);
const selectedReferences = ref<GenerationReferenceItem[]>([]);
const failedDraftRawOutput = ref('');
const draft = reactive({
  lyrics: '',
  negativePrompt: '',
  prompt: '',
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
  preview: null as null | {
    draftId: null | string;
    instrumental: boolean;
    kind: MediaKind;
    lyrics: string;
    negativePrompt: string;
    note: string;
    profileId: string;
    prompt: string;
    raw: string;
    source: { label: string };
    title: string;
    warnings: string[];
  },
  rawOutput: '',
  running: false,
});
type CloudMediaPreview = NonNullable<typeof generationState.preview>;

const {
  clearPreviewDraft: clearCloudPreviewDraft,
  discardPreviewDraft: discardCloudPreviewDraft,
  draft: cloudPreviewDraft,
  openPreviewDraft: openCloudPreviewDraft,
  persistPreviewDraft: persistCloudPreviewDraft,
} = usePreviewDraftPersistence<CloudMediaPreview>({
  appId: 'cloud-media',
  consumeFailedDraft: draftId => media.deleteFailedDraft(draftId),
  getPreview: () => generationState.preview,
  page: 'preview',
  route,
  setPreview: preview => {
    generationState.preview = preview;
  },
  title: '云媒体预览',
});

const promptPlaceholder = computed(() => {
  if (activeProfile.value?.kind === 'audio') return '例如：温柔的钢琴与弦乐，缓慢、克制、电影配乐感';
  if (activeProfile.value?.kind === 'video') return '描述主体、动作、镜头运动、光线和场景';
  return '描述主体、构图、画面风格、光线和细节';
});

const modelPlaceholder = computed(() => {
  const profile = activeProfile.value;
  if (!profile) return '';
  if (profile.provider === 'fal') return '例如 fal-ai/flux/schnell';
  if (profile.kind === 'audio') return '例如 music-2.6';
  if (profile.kind === 'video') return '例如 MiniMax-Hailuo-2.3';
  return profile.provider === 'novelai' ? 'nai-diffusion-4-5-full' : 'image-01';
});

const providerNote = computed(() => {
  const profile = activeProfile.value;
  if (!profile) return '';
  if (profile.provider === 'novelai') return 'NovelAI 目前只生成图片；Token 不会写入导出的手机备份。';
  if (profile.provider === 'minimax') return 'MiniMax 可生成图片、音乐和视频；视频任务会自动等待完成。';
  return 'fal.ai 使用模型端点提交队列；不同模型需要的额外参数可在高级 JSON 中填写。';
});
const formattedReferences = computed(() => formatGenerationReferences(selectedReferences.value));
const cloudFailedDrafts = computed(() => failedDrafts.value.filter(item => item.appId === 'cloud-media'));
const activeFailedDraft = computed(() => {
  const draftId = route.value.params?.draftId;
  if (!draftId) return null;
  const failedDraft = media.getFailedDraft(draftId);
  return failedDraft?.appId === 'cloud-media' ? failedDraft : null;
});
const textProviderSummary = computed(() =>
  generationSettings.value.textProvider.mode === 'external'
    ? formatTextProviderSummary(generationSettings.value.textProvider)
    : `酒馆当前 API · ${generationSettings.value.generation.tavernPresetName.trim() || '跟随当前预设'}`,
);
const previewContent = computed(() => {
  const preview = generationState.preview;
  if (!preview) return '';
  return [
    `标题：${preview.title}`,
    `提示词：\n${preview.prompt}`,
    preview.negativePrompt ? `负面提示词：\n${preview.negativePrompt}` : '',
    preview.lyrics ? `歌词：\n${preview.lyrics}` : '',
    preview.note ? `说明：\n${preview.note}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
});
const cloudPromptPreview = computed(() => {
  try {
    return buildGenerationPreview(adapter, buildGenerationConfig(), getGenerationOptions()).text;
  } catch (error) {
    return error instanceof Error ? error.message : '无法生成提示词预览';
  }
});

watch(
  () => [route.value.appId, route.value.page, route.value.params?.draftId] as const,
  ([appId, page]) => {
    if (appId !== 'cloud-media' || page !== 'failed-draft') return;
    failedDraftRawOutput.value = activeFailedDraft.value?.rawOutput || '';
  },
  { immediate: true },
);

useInvalidRouteFallback({
  source: () => ({
    appId: route.value.appId,
    hasFailedDraft: Boolean(activeFailedDraft.value),
    hasPreview: Boolean(generationState.preview),
    page: route.value.page,
  }),
  isInvalid: current =>
    current.appId === 'cloud-media' &&
    ((current.page === 'preview' && !current.hasPreview) ||
      (current.page === 'failed-draft' && !current.hasFailedDraft)),
  fallback: () => {
    if (route.value.appId === 'cloud-media') phone.replacePage('root', '云媒体');
  },
});

function providerLabel(provider: CloudMediaProvider) {
  return provider === 'fal' ? 'fal.ai' : provider === 'minimax' ? 'MiniMax' : 'NovelAI';
}

function kindLabel(kind: MediaKind) {
  return kind === 'image' ? '图片' : kind === 'audio' ? '音乐' : '视频';
}

function openSettings() {
  phone.pushPage('settings', '云媒体配置');
}

function openAiGenerate() {
  if (!activeProfile.value) {
    openSettings();
    return;
  }
  generationState.error = '';
  generationState.preview = null;
  generationState.rawOutput = '';
  phone.pushPage('generate', 'AI 云媒体');
}

function buildGenerationConfig() {
  const profile = activeProfile.value;
  if (!profile) throw new Error('请先选择云媒体配置');
  return {
    appPrompt: prompts.appPrompts['cloud-media'],
    instrumental: profile.instrumental,
    kind: profile.kind,
    model: profile.model,
    outputFormat: prompts.resolveOutputFormat('cloud-media.generate'),
    profileId: profile.id,
    profileName: profile.name,
    providerName: providerLabel(profile.provider),
    userRequirement: generationDraft.userRequirement,
  };
}

function getGenerationOptions() {
  return {
    generationDefaults: {
      resultMode: generationSettings.value.generation.resultMode,
      stream: generationSettings.value.generation.stream,
      tavernPresetName: generationSettings.value.generation.tavernPresetName,
    },
    references: formattedReferences.value,
    source: {
      fromStartEnd: generationDraft.fromStartEnd,
      mode: generationSettings.value.generation.sourceMode,
      rangeText: generationDraft.rangeText,
      recentCount: generationDraft.recentCount,
      singleMessageId: generationDraft.singleMessageId,
    },
    textProvider: generationSettings.value.textProvider,
  };
}

function captureCloudPrompt() {
  return captureGenerationPrompt(adapter, buildGenerationConfig(), getGenerationOptions());
}

function addProfile() {
  cloudMedia.addProfile('fal');
  showApiKey.value = false;
}

function deleteActiveProfile() {
  const profile = activeProfile.value;
  if (!profile || settings.value.profiles.length <= 1) return;
  if (!window.confirm(`删除配置“${profile.name}”？`)) return;
  cloudMedia.deleteProfile(profile.id);
  showApiKey.value = false;
}

function changeProvider(value: string) {
  const profile = activeProfile.value;
  const parsed = CloudMediaProviderSchema.safeParse(value);
  if (!profile || !parsed.success) return;
  cloudMedia.setProvider(profile.id, parsed.data);
  showApiKey.value = false;
}

function defaultModel(provider: CloudMediaProvider, kind: MediaKind) {
  if (provider === 'novelai') return 'nai-diffusion-4-5-full';
  if (provider === 'minimax') {
    if (kind === 'audio') return 'music-2.6';
    if (kind === 'video') return 'MiniMax-Hailuo-2.3';
    return 'image-01';
  }
  return kind === 'image' ? 'fal-ai/flux/schnell' : '';
}

function changeKind(value: string) {
  const profile = activeProfile.value;
  if (!profile || profile.provider === 'novelai' || !['image', 'audio', 'video'].includes(value)) return;
  const kind = value as MediaKind;
  const knownDefaults = ['fal-ai/flux/schnell', 'image-01', 'music-2.6', 'MiniMax-Hailuo-2.3'];
  const shouldReplaceModel = !profile.model.trim() || knownDefaults.includes(profile.model);
  profile.kind = kind;
  if (shouldReplaceModel) profile.model = defaultModel(profile.provider, kind);
}

function validateProfile(profile: CloudMediaProfile) {
  if (!profile.apiKey.trim()) {
    throw new Error(`请先在配置页填写 ${profile.provider === 'novelai' ? 'NovelAI Token' : 'API Key'}`);
  }
  if (!profile.baseUrl.trim()) throw new Error('请先填写接口地址');
  if (!profile.model.trim()) throw new Error(profile.provider === 'fal' ? '请先填写模型端点' : '请先填写模型');
}

function createPreview(
  result: CloudMediaPromptResult,
  input: {
    draftId?: null | string;
    instrumental: boolean;
    kind: MediaKind;
    profileId: string;
    raw: string;
    sourceLabel: string;
    warnings: string[];
  },
) {
  generationState.preview = {
    draftId: input.draftId ?? null,
    instrumental: input.instrumental,
    kind: input.kind,
    lyrics: result.lyrics,
    negativePrompt: result.negativePrompt,
    note: result.note,
    profileId: input.profileId,
    prompt: result.prompt,
    raw: input.raw,
    source: { label: input.sourceLabel },
    title: result.title,
    warnings: input.warnings,
  };
}

async function runAiGeneration() {
  const profile = activeProfile.value;
  if (!profile) return;
  try {
    validateProfile(profile);
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : String(error);
    return;
  }
  generationState.error = '';
  clearCloudPreviewDraft();
  generationState.rawOutput = '';
  generationState.preview = null;
  try {
    const result = await generateContent(adapter, buildGenerationConfig(), {
      ...getGenerationOptions(),
      createFailedDraft: input => media.createFailedDraft(input),
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
      generationState.error = result.warnings.join('；') || '模型没有返回可解析的云媒体 XML';
      toastr.warning('XML 解析失败，已保存失败草稿');
      void phone.presentGeneratedPage('cloud-media', 'failed-draft', '解析失败草稿', {
        draftId: result.draft.id,
      });
      return;
    }
    if (result.status === 'saved') {
      latestOutput.value = result.saved.entries[0] ?? null;
      toastr.success(`已生成并保存 ${result.saved.entries.length} 个媒体`);
      void phone.presentGeneratedPage('cloud-media', 'root', '云媒体');
      return;
    }

    createPreview(result.data, {
      instrumental: profile.instrumental,
      kind: profile.kind,
      profileId: profile.id,
      raw: result.rawOutput,
      sourceLabel: result.source.label,
      warnings: result.warnings,
    });
    persistCloudPreviewDraft();
    void phone.presentGeneratedPage('cloud-media', 'preview', '云媒体预览');
  } catch (error) {
    generationState.error = error instanceof Error ? error.message : '生成云媒体提示词失败';
  }
}

function reparsePreviewRaw() {
  const preview = generationState.preview;
  if (!preview) return false;
  const parsed = parseCloudMediaPromptXmlResult(preview.raw.trim());
  if (!parsed.ok) {
    preview.warnings = parsed.warnings;
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return false;
  }
  preview.lyrics = parsed.data.lyrics;
  preview.negativePrompt = parsed.data.negativePrompt;
  preview.note = parsed.data.note;
  preview.prompt = parsed.data.prompt;
  preview.title = parsed.data.title;
  preview.raw = parsed.raw;
  preview.warnings = parsed.warnings;
  toastr.success('已按原始输出重新解析');
  return true;
}

function returnToAiGenerate() {
  if (generationState.preview?.draftId) {
    phone.replacePage('failed-draft', '解析失败草稿', { draftId: generationState.preview.draftId });
    return;
  }
  phone.replacePage('generate', 'AI 云媒体');
}

async function saveAiPreview() {
  const preview = generationState.preview;
  if (!preview || generating.value) return;
  const profile = settings.value.profiles.find(item => item.id === preview.profileId);
  if (!profile) {
    toastr.error('生成配置已不存在，请返回后重新选择');
    return;
  }
  errorMessage.value = '';
  statusText.value = '';
  generating.value = true;
  controller.value = new AbortController();
  try {
    const outputs = await generateCloudMedia(
      klona(profile),
      {
        lyrics: preview.lyrics,
        negativePrompt: preview.negativePrompt,
        note: preview.note,
        prompt: preview.prompt,
        title: preview.title,
      },
      message => {
        statusText.value = message;
      },
      controller.value.signal,
    );
    const entries = outputs.map(output =>
      media.createEntry({
        kind: output.kind,
        note: output.note,
        source: 'api',
        title: output.title,
        url: output.url,
      }),
    );
    latestOutput.value = entries[0] ?? null;
    if (preview.draftId) media.deleteFailedDraft(preview.draftId);
    clearCloudPreviewDraft();
    generationState.preview = null;
    statusText.value = '';
    phone.replacePage('root', '云媒体');
    toastr.success(`已保存 ${entries.length} 个输出，可到相册/音乐/视频查看`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      toastr.info('已停止生成');
    } else {
      toastr.error(error instanceof Error ? error.message : '云媒体生成失败');
    }
  } finally {
    generating.value = false;
    controller.value = null;
  }
}

function openFailedDraft(draftId: string) {
  const failedDraft = media.getFailedDraft(draftId);
  if (!failedDraft || failedDraft.appId !== 'cloud-media') return;
  phone.pushPage('failed-draft', '解析失败草稿', { draftId });
}

function failedDraftTitle() {
  return '未解析云媒体提示词';
}

function failedDraftSourceLabel(failedDraft: FailedGenerationDraft) {
  return failedDraft.source.label;
}

async function removeFailedDraft(draftId: string) {
  const shouldDelete = await phone.confirmNotice('要删除这条解析失败草稿吗？原始输出也会一并移除。', {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!shouldDelete) return;
  media.deleteFailedDraft(draftId);
  failedDraftRawOutput.value = '';
  if (route.value.page === 'failed-draft') phone.replacePage('root', '云媒体');
  toastr.success('已删除失败草稿');
}

function reparseFailedDraft() {
  const failedDraft = activeFailedDraft.value;
  if (!failedDraft) return;
  const rawOutput = failedDraftRawOutput.value.trim();
  if (!rawOutput) {
    toastr.warning('先补一点可解析的 XML 内容');
    return;
  }
  const parsed = parseCloudMediaPromptXmlResult(rawOutput);
  if (!parsed.ok) {
    media.updateFailedDraft(failedDraft.id, { rawOutput, warnings: parsed.warnings });
    toastr.warning(parsed.warnings.join('；') || '还是没能解析成功');
    return;
  }
  media.updateFailedDraft(failedDraft.id, { rawOutput: parsed.raw, warnings: parsed.warnings });
  const context = failedDraft.context;
  const kind = ['audio', 'image', 'video'].includes(String(context.kind)) ? (context.kind as MediaKind) : 'image';
  createPreview(parsed.data, {
    draftId: failedDraft.id,
    instrumental: context.instrumental !== false,
    kind,
    profileId: typeof context.profileId === 'string' ? context.profileId : '',
    raw: parsed.raw,
    sourceLabel: failedDraft.source.label,
    warnings: parsed.warnings,
  });
  persistCloudPreviewDraft();
  phone.replacePage('preview', '云媒体预览');
}

async function runGeneration() {
  const profile = activeProfile.value;
  if (!profile || generating.value) return;
  errorMessage.value = '';
  statusText.value = '';
  latestOutput.value = null;
  try {
    validateProfile(profile);
    controller.value = new AbortController();
    generating.value = true;
    const outputs = await generateCloudMedia(
      klona(profile),
      {
        lyrics: draft.lyrics,
        negativePrompt: draft.negativePrompt,
        note: '',
        prompt: draft.prompt,
        title: draft.title,
      },
      message => {
        statusText.value = message;
      },
      controller.value.signal,
    );
    outputs.forEach(output => {
      latestOutput.value = media.createEntry({
        kind: output.kind,
        note: output.note,
        source: 'api',
        title: output.title,
        url: output.url,
      });
    });
    statusText.value = '';
    toastr.success(`已保存 ${outputs.length} 个${outputs.length > 1 ? '媒体文件' : kindLabel(outputs[0].kind)}`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      statusText.value = '';
      toastr.info('已停止生成');
    } else {
      errorMessage.value = error instanceof Error ? error.message : String(error);
      toastr.error(errorMessage.value);
    }
  } finally {
    generating.value = false;
    controller.value = null;
  }
}

function stopGeneration() {
  if (generationState.running && generationState.generationId) {
    stopGenerationByIdSafe(generationState.generationId);
  }
  controller.value?.abort();
}

watch(
  () => activeProfile.value?.id,
  () => {
    errorMessage.value = '';
    statusText.value = '';
  },
);

onBeforeUnmount(stopGeneration);
</script>

<style scoped>
.pc-cloud-media-app {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 14px;
}

.pc-cloud-media-head,
.pc-cloud-head-actions,
.pc-cloud-profile-picker,
.pc-cloud-profile-meta,
.pc-cloud-toggle-row,
.pc-cloud-secret,
.pc-cloud-status,
.pc-cloud-config-note {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pc-cloud-media-head,
.pc-cloud-profile-meta,
.pc-cloud-toggle-row {
  justify-content: space-between;
}

.pc-cloud-head-actions {
  flex: 0 0 auto;
}

.pc-cloud-profile-card,
.pc-cloud-settings-card,
.pc-cloud-preview-fields,
.pc-cloud-generate-form {
  display: grid;
  gap: 12px;
}

.pc-cloud-profile-meta {
  min-width: 0;
  padding-top: 2px;
}

.pc-cloud-profile-meta span {
  min-width: 0;
  overflow: hidden;
  color: var(--pc-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-cloud-profile-picker > .pc-select,
.pc-cloud-secret > .pc-field {
  min-width: 0;
  flex: 1 1 auto;
}

.pc-cloud-toggle-row {
  min-height: 44px;
}

.pc-cloud-toggle-row small {
  display: block;
  margin-top: 3px;
  color: var(--pc-muted);
}

.pc-cloud-status,
.pc-cloud-config-note {
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--pc-theme-accent) 28%, var(--pc-border) 72%);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pc-theme-accent) 8%, var(--pc-surface) 92%);
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.55;
}

.pc-cloud-status.error {
  border-color: color-mix(in srgb, var(--pc-danger) 38%, var(--pc-border) 62%);
  background: color-mix(in srgb, var(--pc-danger) 8%, var(--pc-surface) 92%);
  color: var(--pc-danger);
}

.pc-cloud-advanced summary {
  cursor: pointer;
  color: var(--pc-text);
  font-weight: 800;
}

.pc-cloud-manual > summary {
  cursor: pointer;
  color: var(--pc-text);
  font-weight: 800;
}

.pc-cloud-manual-fields {
  display: grid;
  gap: 12px;
  padding-top: 4px;
}

.pc-cloud-advanced p {
  margin: 0;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-cloud-wide-field {
  grid-column: 1 / -1;
}

.pc-cloud-output img,
.pc-cloud-output video {
  display: block;
  width: 100%;
  max-height: 360px;
  border-radius: 6px;
  background: var(--pc-surface-strong);
  object-fit: contain;
}

.pc-cloud-output audio {
  width: 100%;
}

.pc-cloud-output p {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--pc-muted);
  font-size: 13px;
}

@media (max-width: 380px) {
  .pc-cloud-settings-card .pc-grid.two {
    grid-template-columns: 1fr;
  }

  .pc-cloud-wide-field {
    grid-column: auto;
  }
}
</style>
