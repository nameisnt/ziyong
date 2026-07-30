<template>
  <section class="pc-video-app">
    <section class="pc-video-page">
      <div class="pc-video-hero">
        <div>
          <span class="pc-kicker">{{ t`视频` }}</span>
          <h2>{{ videoEntries.length }} {{ t`个视频` }}</h2>
        </div>
        <button class="pc-primary-btn compact" type="button" @click="openEditor()">
          <i class="fa-solid fa-plus"></i>
          <span>{{ t`新增` }}</span>
        </button>
      </div>

      <template v-if="route.page === 'root'">
        <div v-if="videoEntries.length" class="pc-video-grid">
          <article v-for="entry in videoEntries" :key="entry.id" class="pc-video-card">
            <div class="pc-video-preview" role="button" tabindex="0" @click="openViewer(entry.id)" @keydown.enter.prevent="openViewer(entry.id)" @keydown.space.prevent="openViewer(entry.id)">
              <video :src="entry.url" preload="metadata"></video>
              <i class="fa-solid fa-play"></i>
            </div>
            <div>
              <strong>{{ entry.title }}</strong>
              <span>{{ entry.note || t`无备注` }}</span>
            </div>
          </article>
        </div>
        <EmptyState v-else :title="t`还没有视频`" />
      </template>

      <article v-else-if="route.page === 'viewer' && activeEntry" class="pc-video-viewer">
        <video :src="activeEntry.url" controls autoplay></video>
        <div class="pc-section-card pc-video-detail">
          <div class="pc-video-viewer-bar">
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`上一个`"
              :aria-label="t`上一个`"
              @click="showRelativeVideo(-1)"
            >
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div>
              <strong>{{ activeEntry.title }}</strong>
              <span>{{ activeIndex + 1 }} / {{ videoEntries.length }}</span>
            </div>
            <button
              class="pc-icon-btn"
              type="button"
              :title="t`下一个`"
              :aria-label="t`下一个`"
              @click="showRelativeVideo(1)"
            >
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
          <p v-if="activeEntry.note">{{ activeEntry.note }}</p>
          <div class="pc-form-actions pc-video-detail-actions">
            <button class="pc-soft-btn" type="button" @click="openEditor(activeEntry.id)">
              <i class="fa-solid fa-pen"></i>
              <span>{{ t`编辑` }}</span>
            </button>
            <button class="pc-soft-btn" type="button" @click="downloadEntry(activeEntry)">
              <i class="fa-solid fa-download"></i>
              <span>{{ t`下载` }}</span>
            </button>
            <button class="pc-soft-btn danger" type="button" @click="deleteEntry(activeEntry)">
              <i class="fa-solid fa-trash"></i>
              <span>{{ t`删除` }}</span>
            </button>
          </div>
        </div>
      </article>
      <EmptyState v-else-if="route.page === 'viewer'" :title="t`视频不存在`">
        <button class="pc-soft-btn compact" type="button" @click="phone.replacePage('root', '视频')">{{ t`返回视频` }}</button>
      </EmptyState>

      <article v-else-if="route.page === 'editor'" class="pc-editor-card">
        <span class="pc-kicker">{{ editingEntry ? t`编辑视频` : t`新增视频` }}</span>
        <h2>{{ editingEntry?.title || t`视频条目` }}</h2>
        <input v-model="draft.title" class="pc-field" type="text" :placeholder="t`标题`" />
        <input v-model="draft.url" class="pc-field" type="text" :placeholder="t`视频 URL 或上传后的 data 地址`" />
        <input class="pc-field" type="file" accept="video/*" @change="loadFile" />
        <textarea v-model="draft.note" class="pc-area compact" :placeholder="t`备注，可留空`"></textarea>
        <div class="pc-form-actions">
          <button v-if="editingEntry" class="pc-soft-btn danger" type="button" @click="deleteEntry(editingEntry)">{{ t`删除` }}</button>
          <button class="pc-soft-btn" type="button" @click="phone.replacePage('root', '视频')">{{ t`取消` }}</button>
          <button class="pc-primary-btn" type="button" @click="saveDraft">{{ t`保存` }}</button>
        </div>
      </article>
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
const draft = reactive({
  note: '',
  source: 'link' as MediaEntry['source'],
  title: '',
  url: '',
});

const videoEntries = computed(() => entries.value.filter(entry => entry.kind === 'video'));
const activeEntry = computed(() => route.value.params?.entryId ? media.getEntry(route.value.params.entryId) : null);
const editingEntry = computed(() => route.value.page === 'editor' ? activeEntry.value : null);
const activeIndex = computed(() => activeEntry.value ? videoEntries.value.findIndex(entry => entry.id === activeEntry.value?.id) : -1);

watch(
  () => [route.value.appId, route.value.page, route.value.params?.entryId] as const,
  ([appId, page]) => {
    if (appId !== 'video' || page !== 'editor') return;
    fillDraft(editingEntry.value);
  },
  { immediate: true },
);

function fillDraft(entry: MediaEntry | null) {
  draft.title = entry?.title || '';
  draft.url = entry?.url || '';
  draft.source = entry?.source || 'link';
  draft.note = entry?.note || '';
}

function openViewer(entryId: string) {
  phone.replacePage('viewer', '视频预览', { entryId });
}

function openEditor(entryId?: string) {
  phone.replacePage('editor', entryId ? '编辑视频' : '新增视频', entryId ? { entryId } : {});
}

function showRelativeVideo(offset: number) {
  if (!videoEntries.value.length) return;
  const currentIndex = activeIndex.value < 0 ? 0 : activeIndex.value;
  const nextIndex = (currentIndex + offset + videoEntries.value.length) % videoEntries.value.length;
  openViewer(videoEntries.value[nextIndex].id);
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
    toastr.warning('请先填写 URL 或上传视频');
    return;
  }
  const input = {
    kind: 'video' as const,
    note: draft.note,
    source: draft.source,
    title: draft.title || '未命名视频',
    url: draft.url,
  };
  const entry = editingEntry.value
    ? media.updateEntry(editingEntry.value.id, input)
    : media.createEntry(input);
  if (!entry) return;
  phone.replacePage('viewer', '视频预览', { entryId: entry.id });
  toastr.success('已保存视频');
}

function downloadEntry(entry: MediaEntry) {
  const link = document.createElement('a');
  link.href = entry.url;
  link.download = sanitizeFileName(entry.title || 'video');
  link.rel = 'noopener';
  link.click();
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'video';
}

async function deleteEntry(entry: MediaEntry) {
  const confirmed = await phone.confirmNotice(`要删除视频“${entry.title}”吗？`, {
    confirmLabel: '删除',
    kind: 'warning',
  });
  if (!confirmed) return;
  media.deleteEntry(entry.id);
  phone.replacePage('root', '视频');
  toastr.success('已删除视频');
}
</script>

<style scoped>
.pc-video-app,
.pc-video-page {
  min-height: 100%;
}

.pc-video-page {
  display: grid;
  align-content: start;
  gap: 14px;
}

.pc-video-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}

.pc-video-hero h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.pc-video-grid {
  display: grid;
  gap: 10px;
}

.pc-video-card {
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface);
}

.pc-video-preview {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  background: var(--pc-surface-strong);
  cursor: pointer;
}

.pc-video-preview video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.pc-video-preview i {
  position: absolute;
  inset: 50% auto auto 50%;
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pc-surface) 82%, transparent 18%);
  color: var(--pc-theme-accent);
  transform: translate(-50%, -50%);
}

.pc-video-card > div {
  display: grid;
  gap: 4px;
  padding: 10px;
}

.pc-video-card strong,
.pc-video-card span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-video-card span,
.pc-video-detail p {
  color: var(--pc-muted);
}

.pc-video-viewer {
  display: grid;
  gap: 12px;
}

.pc-video-viewer > video {
  display: block;
  width: 100%;
  max-height: 58vh;
  border-radius: var(--pc-card-radius);
  background: var(--pc-surface-strong);
}

.pc-video-detail p {
  margin: 12px 0 0;
  white-space: pre-wrap;
}

.pc-video-viewer-bar {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
}

.pc-video-viewer-bar > div {
  min-width: 0;
  text-align: center;
}

.pc-video-viewer-bar strong,
.pc-video-viewer-bar span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-video-viewer-bar span {
  margin-top: 3px;
  color: var(--pc-muted);
  font-size: 12px;
}

.pc-video-detail-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.pc-video-detail-actions > button {
  width: 100%;
  min-width: 0;
  padding-inline: 8px;
}

.pc-area.compact {
  min-height: 90px;
}
</style>
