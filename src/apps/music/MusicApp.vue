<template>
  <section class="pc-music-app">
    <section class="pc-music-page">
      <div class="pc-music-hero">
        <div>
          <span class="pc-kicker">{{ t`音乐` }}</span>
          <h2>{{ audioEntries.length }} {{ t`首音频` }}</h2>
        </div>
        <button class="pc-primary-btn compact" type="button" @click="openEditor()">
          <i class="fa-solid fa-plus"></i>
          <span>{{ t`新增` }}</span>
        </button>
      </div>

      <template v-if="route.page === 'root'">
        <article v-if="activeEntry" class="pc-section-card pc-now-playing">
          <div class="pc-section-head">
            <strong>{{ activeEntry.title }}</strong>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`下载`"
              :aria-label="t`下载`"
              @click="downloadEntry(activeEntry)"
            >
              <i class="fa-solid fa-download"></i>
            </button>
          </div>
          <div class="pc-music-player">
            <button
              class="pc-icon-btn"
              type="button"
              :title="audioPlaying ? t`暂停` : t`播放`"
              :aria-label="audioPlaying ? t`暂停` : t`播放`"
              @click="toggleAudio(activeEntry)"
            >
              <i :class="audioPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
            </button>
            <div class="pc-music-progress">
              <input
                class="pc-music-range"
                type="range"
                min="0"
                :max="audioDuration || 1"
                step="0.1"
                :value="audioCurrentTime"
                @input="seekAudio(($event.target as HTMLInputElement).value)"
              />
              <div class="pc-music-time">
                <span>{{ formatAudioTime(audioCurrentTime) }}</span>
                <span>{{ formatAudioTime(audioDuration) }}</span>
              </div>
            </div>
          </div>
          <div class="pc-lyrics">
            <strong>{{ t`歌词` }}</strong>
            <p v-if="activeLyrics">{{ activeLyrics }}</p>
            <p v-else>{{ t`暂无歌词` }}</p>
          </div>
        </article>

        <div v-if="audioEntries.length" class="pc-playlist">
          <article
            v-for="entry in audioEntries"
            :key="entry.id"
            :class="['pc-track-row', { active: activeAudioId === entry.id }]"
          >
            <button
              class="pc-icon-btn"
              type="button"
              :title="activeAudioId === entry.id && audioPlaying ? t`暂停` : t`播放`"
              :aria-label="activeAudioId === entry.id && audioPlaying ? t`暂停` : t`播放`"
              @click="toggleAudio(entry)"
            >
              <i :class="activeAudioId === entry.id && audioPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
            </button>
            <button class="pc-track-main" type="button" @click="selectAudio(entry)">
              <strong>{{ entry.title }}</strong>
              <span>{{ entry.note ? t`有歌词` : t`暂无歌词` }}</span>
            </button>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`编辑`"
              :aria-label="t`编辑`"
              @click="openEditor(entry.id)"
            >
              <i class="fa-solid fa-pen"></i>
            </button>
          </article>
        </div>
        <EmptyState v-else :title="t`还没有音乐`" />
      </template>

      <article v-else-if="route.page === 'editor'" class="pc-editor-card">
        <span class="pc-kicker">{{ editingEntry ? t`编辑音乐` : t`新增音乐` }}</span>
        <h2>{{ editingEntry?.title || t`音乐条目` }}</h2>
        <input v-model="draft.title" class="pc-field" type="text" :placeholder="t`标题`" />
        <input v-model="draft.url" class="pc-field" type="text" :placeholder="t`音频 URL 或上传后的 data 地址`" />
        <input class="pc-field" type="file" accept="audio/*" @change="loadFile" />
        <textarea v-model="draft.note" class="pc-area pc-lyrics-area" :placeholder="t`歌词，可留空`"></textarea>
        <div class="pc-form-actions">
          <button v-if="editingEntry" class="pc-soft-btn danger" type="button" @click="deleteEntry(editingEntry)">
            {{ t`删除` }}
          </button>
          <button class="pc-soft-btn" type="button" @click="phone.replacePage('root', '音乐')">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="saveDraft">{{ t`保存` }}</button>
        </div>
      </article>

      <audio
        ref="audioEl"
        class="pc-hidden-input"
        :src="activeEntry?.url || ''"
        @ended="handleAudioEnded"
        @loadedmetadata="syncAudioMetadata"
        @pause="audioPlaying = false"
        @play="audioPlaying = true"
        @timeupdate="syncAudioTime"
      ></audio>
    </section>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import { usePhoneStore } from '@/store/phone';
import { type MediaEntry, useMediaStore } from '@/apps/media/store';
import { storeToRefs } from 'pinia';

const phone = usePhoneStore();
const media = useMediaStore();
const { entries } = storeToRefs(media);
const route = computed(() => phone.currentRoute);
const audioEl = ref<HTMLAudioElement | null>(null);
const activeAudioId = ref('');
const audioCurrentTime = ref(0);
const audioDuration = ref(0);
const audioPlaying = ref(false);
const draft = reactive({
  note: '',
  source: 'link' as MediaEntry['source'],
  title: '',
  url: '',
});

const audioEntries = computed(() => entries.value.filter(entry => entry.kind === 'audio'));
const activeEntry = computed(() =>
  activeAudioId.value ? media.getEntry(activeAudioId.value) : (audioEntries.value[0] ?? null),
);
const editingEntry = computed(() => (route.value.params?.entryId ? media.getEntry(route.value.params.entryId) : null));
const activeLyrics = computed(() => activeEntry.value?.note.trim() || '');

watch(
  () => [route.value.appId, route.value.page, route.value.params?.entryId] as const,
  ([appId, page]) => {
    if (appId !== 'music' || page !== 'editor') return;
    fillDraft(editingEntry.value);
  },
  { immediate: true },
);

watch(activeAudioId, () => {
  audioCurrentTime.value = 0;
  audioDuration.value = 0;
  audioPlaying.value = false;
});

watch(audioEntries, list => {
  if (activeAudioId.value && !list.some(entry => entry.id === activeAudioId.value)) {
    activeAudioId.value = '';
  }
});

function fillDraft(entry: MediaEntry | null) {
  draft.title = entry?.title || '';
  draft.url = entry?.url || '';
  draft.source = entry?.source || 'link';
  draft.note = entry?.note || '';
}

function openEditor(entryId?: string) {
  phone.replacePage('editor', entryId ? '编辑音乐' : '新增音乐', entryId ? { entryId } : {});
}

async function selectAudio(entry: MediaEntry) {
  if (activeAudioId.value !== entry.id) {
    activeAudioId.value = entry.id;
    await nextTick();
  }
}

async function toggleAudio(entry: MediaEntry) {
  if (activeAudioId.value === entry.id && audioPlaying.value) {
    audioEl.value?.pause();
    return;
  }
  await selectAudio(entry);
  try {
    await audioEl.value?.play();
  } catch {
    toastr.error('音频播放失败');
  }
}

async function seekAudio(rawValue: string) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return;
  const audio = audioEl.value;
  if (!audio) return;
  const maxTime = Number.isFinite(audio.duration) ? audio.duration : value;
  audio.currentTime = Math.min(Math.max(value, 0), maxTime);
  audioCurrentTime.value = audio.currentTime;
}

function syncAudioMetadata() {
  const duration = audioEl.value?.duration ?? 0;
  audioDuration.value = Number.isFinite(duration) ? duration : 0;
}

function syncAudioTime() {
  audioCurrentTime.value = audioEl.value?.currentTime ?? 0;
  syncAudioMetadata();
}

function handleAudioEnded() {
  audioPlaying.value = false;
  audioCurrentTime.value = 0;
}

function formatAudioTime(value: number) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    draft.url = String(reader.result || '');
    draft.title = draft.title || file.name;
    draft.source = 'upload';
  };
  reader.readAsDataURL(file);
}

function saveDraft() {
  if (!draft.url.trim()) {
    toastr.warning('请先填写 URL 或上传音频');
    return;
  }
  const input = {
    kind: 'audio' as const,
    note: draft.note,
    source: draft.source,
    title: draft.title || '未命名音乐',
    url: draft.url,
  };
  const entry = editingEntry.value ? media.updateEntry(editingEntry.value.id, input) : media.createEntry(input);
  if (!entry) return;
  activeAudioId.value = entry.id;
  phone.replacePage('root', '音乐');
  toastr.success('已保存音乐');
}

function downloadEntry(entry: MediaEntry) {
  const link = document.createElement('a');
  link.href = entry.url;
  link.download = sanitizeFileName(entry.title || 'audio');
  link.rel = 'noopener';
  link.click();
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'audio';
}

async function deleteEntry(entry: MediaEntry) {
  const confirmed = await phone.confirmNotice(`要删除音乐“${entry.title}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  media.deleteEntry(entry.id);
  phone.replacePage('root', '音乐');
  toastr.success('已删除音乐');
}
</script>

<style scoped>
.pc-music-app,
.pc-music-page {
  min-height: 100%;
}

.pc-music-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-music-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}

.pc-music-hero h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.pc-now-playing {
  gap: 14px;
}

.pc-music-player {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.pc-music-progress {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.pc-music-range {
  width: 100%;
  accent-color: var(--pc-theme-accent);
}

.pc-music-time {
  display: flex;
  justify-content: space-between;
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-lyrics {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: var(--pc-control-radius);
  background: var(--pc-surface-strong);
}

.pc-lyrics p {
  max-height: 220px;
  margin: 0;
  overflow: auto;
  color: var(--pc-muted);
  white-space: pre-wrap;
}

.pc-playlist {
  display: grid;
  gap: 8px;
}

.pc-track-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}

.pc-track-row.active {
  border-color: color-mix(in srgb, var(--pc-theme-accent) 46%, var(--pc-border) 54%);
}

.pc-track-main {
  display: grid;
  min-width: 0;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--pc-text);
  cursor: pointer;
  text-align: left;
}

.pc-track-main strong,
.pc-track-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-track-main span {
  color: var(--pc-muted);
  font-size: 12px;
  font-weight: 800;
}

.pc-lyrics-area {
  min-height: 180px;
}
</style>
