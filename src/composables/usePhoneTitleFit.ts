import type { Ref } from 'vue';

export function usePhoneTitleFit(options: {
  currentTitle: Ref<string>;
  fontFamily: Ref<string>;
  isOpen: Ref<boolean>;
  topbarEl: Ref<HTMLElement | null>;
}) {
  const { currentTitle, fontFamily, isOpen, topbarEl } = options;
  const topTitleEl = ref<HTMLElement | null>(null);
  let titleFitFrame = 0;
  let titleResizeObserver: ResizeObserver | null = null;

  function fitTopTitle() {
    titleFitFrame = 0;
    const title = topTitleEl.value;
    if (!title || !isOpen.value) return;

    const maximumSize = 14;
    const minimumSize = 11;
    title.style.fontSize = `${maximumSize}px`;
    const availableWidth = title.clientWidth;
    const requiredWidth = title.scrollWidth;
    if (!availableWidth || requiredWidth <= availableWidth) return;

    const fittedSize = Math.max(minimumSize, Math.floor((maximumSize * availableWidth * 10) / requiredWidth) / 10);
    title.style.fontSize = `${fittedSize}px`;
  }

  function scheduleTopTitleFit() {
    if (!isOpen.value) return;
    void nextTick(() => {
      if (titleFitFrame) cancelAnimationFrame(titleFitFrame);
      titleFitFrame = requestAnimationFrame(fitTopTitle);
    });
  }

  onMounted(() => {
    titleResizeObserver = new ResizeObserver(scheduleTopTitleFit);
    if (topbarEl.value) titleResizeObserver.observe(topbarEl.value);
    document.fonts?.addEventListener?.('loadingdone', scheduleTopTitleFit);
    scheduleTopTitleFit();
  });

  onBeforeUnmount(() => {
    titleResizeObserver?.disconnect();
    document.fonts?.removeEventListener?.('loadingdone', scheduleTopTitleFit);
    if (titleFitFrame) cancelAnimationFrame(titleFitFrame);
  });

  watch([currentTitle, fontFamily], scheduleTopTitleFit);

  return {
    scheduleTopTitleFit,
    topTitleEl,
  };
}
