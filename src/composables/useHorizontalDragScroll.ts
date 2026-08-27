import type { Ref } from 'vue';

export function useHorizontalDragScroll(target: Ref<HTMLElement | null>) {
  let pointerId: number | null = null;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !target.value) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = target.value.scrollLeft;
    dragged = false;
    target.value.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId !== event.pointerId || !target.value) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 4) dragged = true;
    if (dragged) target.value.scrollLeft = startScrollLeft - delta;
  }

  function onPointerUp(event: PointerEvent) {
    if (pointerId !== event.pointerId || !target.value) return;
    target.value.releasePointerCapture(event.pointerId);
    pointerId = null;
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
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    target.value.scrollLeft += delta;
    event.preventDefault();
  }

  return { onClickCapture, onPointerCancel, onPointerDown, onPointerMove, onPointerUp, onWheel };
}
