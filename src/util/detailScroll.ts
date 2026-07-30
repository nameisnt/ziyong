import type { Ref } from 'vue';

type ScrollPosition = 'top' | 'bottom';

function getDetailScrollTargets(targetRef: Ref<HTMLElement | null>, fallbackSelector: string) {
  const targets: HTMLElement[] = [];
  const inner = targetRef.value ?? document.querySelector(fallbackSelector);
  if (inner instanceof HTMLElement) targets.push(inner);
  const screen = document.querySelector('.pc-screen');
  if (screen instanceof HTMLElement && !targets.includes(screen)) targets.push(screen);
  return targets;
}

export function useDetailScroll(targetRef: Ref<HTMLElement | null>, fallbackSelector: string) {
  function scrollContainer(position: ScrollPosition, behavior: ScrollBehavior = 'smooth') {
    const targets = getDetailScrollTargets(targetRef, fallbackSelector);
    const scrollTargets = position === 'top' ? targets : targets.slice(0, 1);
    scrollTargets.forEach(container => {
      const top = position === 'top' ? 0 : container.scrollHeight;
      container.scrollTo({
        behavior,
        top,
      });
      if (position === 'top') {
        container.scrollTop = 0;
      }
    });
  }

  function scrollToTop(behavior: ScrollBehavior = 'smooth') {
    scrollContainer('top', behavior);
  }

  function scrollToBottom() {
    scrollContainer('bottom');
  }

  return {
    scrollToBottom,
    scrollToTop,
  };
}
