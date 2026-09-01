import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

export function useHorizontalDragScroll(target: Ref<HTMLElement | null>) {
  const canScrollBackward = ref(false);
  const canScrollForward = ref(false);
  let pointerId: number | null = null;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let updateFrame = 0;

  function updateScrollState() {
    const element = target.value;
    if (!element) {
      canScrollBackward.value = false;
      canScrollForward.value = false;
      return;
    }
    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    canScrollBackward.value = element.scrollLeft > 1;
    canScrollForward.value = element.scrollLeft < maxScrollLeft - 1;
  }

  function scheduleScrollStateUpdate() {
    cancelAnimationFrame(updateFrame);
    updateFrame = requestAnimationFrame(updateScrollState);
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !target.value) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = target.value.scrollLeft;
    dragged = false;
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId !== event.pointerId || !target.value) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 4 && !dragged) {
      dragged = true;
      target.value.setPointerCapture(event.pointerId);
    }
    if (dragged) {
      target.value.scrollLeft = startScrollLeft - delta;
      event.preventDefault();
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (pointerId !== event.pointerId || !target.value) return;
    if (target.value.hasPointerCapture(event.pointerId)) target.value.releasePointerCapture(event.pointerId);
    pointerId = null;
    window.setTimeout(() => {
      dragged = false;
    }, 0);
  }

  function onPointerCancel(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    dragged = false;
  }

  function onClickCapture(event: MouseEvent) {
    if (!dragged) return;
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  }

  function onWheel(event: WheelEvent) {
    if (!target.value || target.value.scrollWidth <= target.value.clientWidth) return;
    const horizontalGesture = Math.abs(event.deltaX) >= Math.abs(event.deltaY);
    const delta = horizontalGesture ? event.deltaX : event.deltaY;
    if (!delta) return;
    const previous = target.value.scrollLeft;
    target.value.scrollLeft += delta;
    if (target.value.scrollLeft !== previous) event.preventDefault();
  }

  function scrollByPage(direction: -1 | 1) {
    const element = target.value;
    if (!element) return;
    element.scrollBy({ behavior: 'smooth', left: direction * Math.max(120, element.clientWidth * 0.72) });
  }

  onMounted(() => {
    const element = target.value;
    if (!element) return;
    element.addEventListener('scroll', scheduleScrollStateUpdate, { passive: true });
    resizeObserver = new ResizeObserver(scheduleScrollStateUpdate);
    resizeObserver.observe(element);
    mutationObserver = new MutationObserver(scheduleScrollStateUpdate);
    mutationObserver.observe(element, { childList: true, subtree: true });
    scheduleScrollStateUpdate();
  });

  onBeforeUnmount(() => {
    target.value?.removeEventListener('scroll', scheduleScrollStateUpdate);
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    cancelAnimationFrame(updateFrame);
  });

  return {
    canScrollBackward,
    canScrollForward,
    onClickCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    scrollNext: () => scrollByPage(1),
    scrollPrevious: () => scrollByPage(-1),
    updateScrollState: scheduleScrollStateUpdate,
  };
}
