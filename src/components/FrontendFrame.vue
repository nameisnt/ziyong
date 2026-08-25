<template>
  <div :class="['pc-frame-shell', { embedded }]">
    <template v-if="shouldRender">
      <iframe
        ref="iframeEl"
        :key="frameRevision"
        class="pc-frame"
        :sandbox="sandboxFlags"
        :srcdoc="documentHtml"
        :style="{ height: `${frameHeight}px` }"
        :title="title || '网页内容'"
        @load="handleLoad"
      ></iframe>

      <p v-if="heightLimited" class="pc-frame-height-note" role="status">
        网页高度异常，已停止自动扩张；其余内容可在网页内滚动查看。
      </p>
    </template>

    <div v-else class="pc-frame-status">
      <strong>{{ statusTitle }}</strong>
      <p>{{ statusCopy }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { buildFrontendDocument, getFrontendFrameSource } from '@/util/theaterFrontend';

const props = withDefaults(
  defineProps<{
    active?: boolean;
    content: string;
    embedded?: boolean;
    securityMode?: 'safe' | 'trusted';
    theme?: 'dark' | 'light';
    title?: string;
  }>(),
  {
    active: true,
    embedded: false,
    securityMode: 'trusted',
    theme: 'light',
    title: '',
  },
);

const emit = defineEmits<{
  navigateBlocked: [];
  readerTap: [];
}>();

const iframeEl = ref<HTMLIFrameElement | null>(null);
const frameHeight = ref(320);
const frameRevision = ref(0);
const blocked = ref(false);
const heightLimited = ref(false);
const loadCount = ref(0);
let feedbackStreak = 0;
let lastFeedbackDelta: number | null = null;
let lastFeedbackViewport = 0;
const channelId = `theater_frame_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const sandboxFlags = 'allow-scripts';

const documentHtml = computed(() =>
  buildFrontendDocument(props.content, {
    channelId,
    securityMode: props.securityMode,
    theme: props.theme,
    title: props.title,
  }),
);
const shouldRender = computed(() => props.active && !blocked.value);
const statusTitle = computed(() => (blocked.value ? '已阻止自导航' : '等待重新挂载'));
const statusCopy = computed(() =>
  blocked.value ? '检测到 iframe 尝试重新加载，已按安全策略卸载。' : '当前视图已隐藏，iframe 会在重新进入时恢复。',
);

watch(
  () => [props.active, props.content, props.securityMode, props.theme, props.title] as const,
  ([active], previousValue) => {
    const previousActive = previousValue?.[0];
    frameHeight.value = 320;
    resetHeightFeedback();

    if (!active) {
      loadCount.value = 0;
      return;
    }

    if (!previousActive || blocked.value) {
      blocked.value = false;
    }

    loadCount.value = 0;
    frameRevision.value += 1;
  },
  { immediate: true },
);

function clampHeight(height: number) {
  const maximum = props.embedded ? 24000 : 560;
  return Math.max(props.embedded ? 80 : 220, Math.min(maximum, Math.round(height)));
}

function resetHeightFeedback() {
  heightLimited.value = false;
  feedbackStreak = 0;
  lastFeedbackDelta = null;
  lastFeedbackViewport = 0;
}

function followsFrameViewport(height: number, viewportHeight: number) {
  if (Math.abs(viewportHeight - frameHeight.value) > 2 || height <= viewportHeight) {
    feedbackStreak = 0;
    lastFeedbackDelta = null;
    lastFeedbackViewport = viewportHeight;
    return false;
  }

  const delta = Math.round(height - viewportHeight);
  const repeatsSameDelta =
    lastFeedbackDelta !== null &&
    Math.abs(delta - lastFeedbackDelta) <= 2 &&
    viewportHeight > lastFeedbackViewport + 1;
  feedbackStreak = repeatsSameDelta ? feedbackStreak + 1 : 0;
  lastFeedbackDelta = delta;
  lastFeedbackViewport = viewportHeight;
  return feedbackStreak >= 1;
}

function handleLoad(event: Event) {
  if (event.target !== iframeEl.value) return;
  loadCount.value += 1;
  if (loadCount.value <= 1) return;
  blocked.value = true;
  emit('navigateBlocked');
}

function handleMessage(event: MessageEvent) {
  const iframeWindow = iframeEl.value?.contentWindow;
  if (!iframeWindow || event.source !== iframeWindow) return;

  const payload = event.data;
  if (!payload || typeof payload !== 'object') return;

  const source = (payload as { source?: unknown }).source;
  const nextChannelId = (payload as { channelId?: unknown }).channelId;
  const type = (payload as { type?: unknown }).type;
  const height = (payload as { height?: unknown }).height;
  const viewportHeight = (payload as { viewportHeight?: unknown }).viewportHeight;

  if (source !== getFrontendFrameSource() || nextChannelId !== channelId) return;
  if (type === 'reader-tap') {
    const clientY = (payload as { clientY?: unknown }).clientY;
    const frame = iframeEl.value;
    const readerShell = frame?.closest<HTMLElement>('.pc-reader-detail-shell');
    if (typeof clientY !== 'number' || !Number.isFinite(clientY) || !frame || !readerShell) return;
    const shellRect = readerShell.getBoundingClientRect();
    const viewportY = frame.getBoundingClientRect().top + clientY;
    const relativeY = shellRect.height > 0 ? (viewportY - shellRect.top) / shellRect.height : -1;
    if (relativeY < 0.2 || relativeY > 0.8) return;
    emit('readerTap');
    return;
  }
  if (type !== 'height') return;
  if (typeof height !== 'number' || !Number.isFinite(height)) return;

  const nextHeight = clampHeight(height);
  if (nextHeight === frameHeight.value) return;

  if (heightLimited.value) {
    if (nextHeight >= frameHeight.value) return;
    resetHeightFeedback();
  }

  if (
    typeof viewportHeight === 'number' &&
    Number.isFinite(viewportHeight) &&
    followsFrameViewport(height, viewportHeight)
  ) {
    heightLimited.value = true;
    return;
  }

  frameHeight.value = nextHeight;
}

onMounted(() => {
  window.addEventListener('message', handleMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage);
});
</script>

<style scoped>
.pc-frame-shell {
  margin-top: 16px;
  border: 1px solid var(--pc-border);
  border-radius: min(var(--pc-card-radius), 8px);
  overflow: hidden;
  background: var(--pc-surface-strong);
}

.pc-frame-shell.embedded {
  margin-top: 0;
}

.pc-frame {
  width: 100%;
  display: block;
  border: 0;
  background: transparent;
}

.pc-frame-height-note {
  margin: 0;
  padding: 7px 10px;
  border-top: 1px solid var(--pc-border);
  color: var(--pc-muted);
  font-size: 12px;
  line-height: 1.4;
}

.pc-frame-status {
  min-height: 220px;
  padding: 18px;
  color: var(--pc-muted);
}

.pc-frame-status strong {
  display: block;
  color: var(--pc-text);
  margin-bottom: 8px;
}

.pc-frame-status p {
  margin: 0;
}
</style>
