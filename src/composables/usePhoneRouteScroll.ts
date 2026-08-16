import type { PhoneRoute } from '@/store/phone';
import type { Ref } from 'vue';

type RouteScrollSnapshot = {
  regions: number[];
  screenTop: number;
};

export function usePhoneRouteScroll(options: {
  currentRoute: Ref<PhoneRoute>;
  mountedAppId: Ref<string>;
  screenEl: Ref<HTMLElement | null>;
}) {
  const { currentRoute, mountedAppId, screenEl } = options;
  const routeScrollSnapshots = new WeakMap<PhoneRoute, RouteScrollSnapshot>();
  let routeScrollRestoreSequence = 0;

  function getRouteScrollRegions(screen: HTMLElement) {
    return [...screen.querySelectorAll<HTMLElement>('*')].filter(element => {
      if (element === screen || element.clientHeight <= 0 || element.scrollHeight <= element.clientHeight + 1)
        return false;
      const overflowY = getComputedStyle(element).overflowY;
      return overflowY === 'auto' || overflowY === 'scroll';
    });
  }

  function captureRouteScroll(screen: HTMLElement): RouteScrollSnapshot {
    return {
      regions: getRouteScrollRegions(screen).map(element => element.scrollTop),
      screenTop: screen.scrollTop,
    };
  }

  function restoreRouteScroll(screen: HTMLElement, snapshot?: RouteScrollSnapshot) {
    screen.scrollTop = snapshot?.screenTop ?? 0;
    if (!snapshot) return;
    getRouteScrollRegions(screen).forEach((element, index) => {
      element.scrollTop = snapshot.regions[index] ?? 0;
    });
  }

  watch([currentRoute, mountedAppId], async ([nextRoute, readyAppId], [previousRoute]) => {
    const sequence = ++routeScrollRestoreSequence;
    const screen = screenEl.value;
    if (screen && previousRoute && previousRoute !== nextRoute) {
      routeScrollSnapshots.set(previousRoute, captureRouteScroll(screen));
    }
    if (nextRoute.appId !== 'home' && readyAppId !== nextRoute.appId) return;
    await nextTick();
    if (sequence !== routeScrollRestoreSequence || !screenEl.value) return;
    const snapshot = routeScrollSnapshots.get(nextRoute);
    restoreRouteScroll(screenEl.value, snapshot);
    window.setTimeout(() => {
      if (sequence !== routeScrollRestoreSequence || !screenEl.value) return;
      restoreRouteScroll(screenEl.value, snapshot);
    }, 80);
    window.setTimeout(() => {
      if (sequence !== routeScrollRestoreSequence || !screenEl.value) return;
      restoreRouteScroll(screenEl.value, snapshot);
    }, 240);
  });
}
