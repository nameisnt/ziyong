export const NATIVE_LAUNCHER_ID = 'phone-creative-native-launcher';

const LAUNCHER_SIZE = 48;
const LAUNCHER_EDGE_GAP = 18;
const LAUNCHER_BOTTOM_GAP = 86;

let openHandler: ((event?: Event) => void) | null = null;

function getVisualViewportBounds() {
  const viewport = window.visualViewport;
  return {
    height: viewport?.height ?? window.innerHeight,
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
  };
}

function getDefaultLauncherPosition() {
  const viewport = getVisualViewportBounds();
  return {
    left: viewport.left + viewport.width - LAUNCHER_SIZE - LAUNCHER_EDGE_GAP,
    top: viewport.top + viewport.height - LAUNCHER_SIZE - LAUNCHER_BOTTOM_GAP,
  };
}

function clampLauncherPosition(left: number, top: number) {
  const viewport = getVisualViewportBounds();
  const minLeft = viewport.left + 8;
  const minTop = viewport.top + 8;
  return {
    left: Math.min(Math.max(minLeft, left), Math.max(minLeft, viewport.left + viewport.width - LAUNCHER_SIZE - 8)),
    top: Math.min(Math.max(minTop, top), Math.max(minTop, viewport.top + viewport.height - LAUNCHER_SIZE - 8)),
  };
}

function placeLauncher(launcher: HTMLButtonElement, position: { left: number; top: number }) {
  launcher.style.left = `${Math.round(position.left)}px`;
  launcher.style.top = `${Math.round(position.top)}px`;
}

export function syncNativeLauncherVisibility() {
  const launcher = document.getElementById(NATIVE_LAUNCHER_ID) as HTMLButtonElement | null;
  const phoneRoot = document.querySelector<HTMLElement>('.pc-phone-root');
  const floatBall = document.querySelector<HTMLElement>('.pc-float-ball');
  const menuEntry = document.getElementById('pc-menu-entry');
  const phoneVisible = Boolean(phoneRoot && phoneRoot.offsetParent !== null);
  const floatBallVisible = Boolean(floatBall && floatBall.offsetParent !== null);
  if (launcher) launcher.style.display = phoneVisible || floatBallVisible || menuEntry ? 'none' : 'grid';
}

export function ensureNativeLauncher(onOpen?: (event?: Event) => void, buildMarker?: string) {
  if (onOpen) openHandler = onOpen;

  let launcher = document.getElementById(NATIVE_LAUNCHER_ID) as HTMLButtonElement | null;
  if (launcher) {
    if (buildMarker) launcher.dataset.phoneBuild = buildMarker;
    return launcher;
  }

  launcher = document.createElement('button');
  launcher.id = NATIVE_LAUNCHER_ID;
  launcher.type = 'button';
  launcher.title = '打开功能性阅读器';
  launcher.setAttribute('aria-label', '打开功能性阅读器');
  if (buildMarker) launcher.dataset.phoneBuild = buildMarker;
  launcher.innerHTML = '<i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>';
  launcher.style.cssText = [
    'position:fixed',
    'z-index:2147483600',
    `width:${LAUNCHER_SIZE}px`,
    `height:${LAUNCHER_SIZE}px`,
    'display:grid',
    'place-items:center',
    'border:0',
    'border-radius:999px',
    'background:#007aff',
    'color:#fff',
    'box-shadow:0 14px 30px rgba(0,0,0,.26)',
    'cursor:pointer',
    'font-size:18px',
    'line-height:1',
    'touch-action:none',
    'pointer-events:auto',
  ].join(';');
  placeLauncher(launcher, getDefaultLauncherPosition());

  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let moved = false;
  let manuallyPositioned = false;
  let suppressClickUntil = 0;

  const syncPosition = () => {
    const current = manuallyPositioned
      ? {
          left: Number.parseFloat(launcher.style.left),
          top: Number.parseFloat(launcher.style.top),
        }
      : getDefaultLauncherPosition();
    placeLauncher(launcher, clampLauncherPosition(current.left, current.top));
  };

  const openPhone = (event?: Event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (Date.now() < suppressClickUntil || moved) return;
    openHandler?.(event);
    window.setTimeout(syncNativeLauncherVisibility, 0);
  };

  launcher.addEventListener('click', openPhone);
  launcher.addEventListener('pointerdown', event => {
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = Number.parseFloat(launcher.style.left);
    startTop = Number.parseFloat(launcher.style.top);
    moved = false;
    launcher.setPointerCapture?.(event.pointerId);
  });
  launcher.addEventListener('pointermove', event => {
    if (pointerId !== event.pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (!moved && Math.hypot(deltaX, deltaY) > 8) moved = true;
    if (!moved) return;
    manuallyPositioned = true;
    placeLauncher(launcher, clampLauncherPosition(startLeft + deltaX, startTop + deltaY));
  });
  launcher.addEventListener('pointerup', event => {
    if (pointerId !== event.pointerId) return;
    launcher.releasePointerCapture?.(event.pointerId);
    pointerId = null;
    if (moved) {
      suppressClickUntil = Date.now() + 300;
      window.setTimeout(() => {
        moved = false;
      }, 300);
    }
  });
  launcher.addEventListener('pointercancel', () => {
    pointerId = null;
    moved = false;
  });
  window.addEventListener('resize', syncPosition);
  window.addEventListener('orientationchange', syncPosition);
  window.visualViewport?.addEventListener('resize', syncPosition);
  window.visualViewport?.addEventListener('scroll', syncPosition);

  document.body.appendChild(launcher);
  syncPosition();
  syncNativeLauncherVisibility();
  return launcher;
}
