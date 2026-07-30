export const NATIVE_LAUNCHER_ID = 'phone-creative-native-launcher';

let openHandler: ((event?: Event) => void) | null = null;

export function syncNativeLauncherVisibility() {
  const launcher = document.getElementById(NATIVE_LAUNCHER_ID) as HTMLButtonElement | null;
  const phoneRoot = document.querySelector<HTMLElement>('.pc-phone-root');
  const floatBall = document.querySelector<HTMLElement>('.pc-float-ball');
  const phoneVisible = Boolean(phoneRoot && phoneRoot.offsetParent !== null);
  const floatBallReady = Boolean(floatBall);
  if (launcher) launcher.style.display = phoneVisible || floatBallReady ? 'none' : 'grid';
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
  launcher.title = '打开酒馆手机';
  launcher.setAttribute('aria-label', '打开酒馆手机');
  if (buildMarker) launcher.dataset.phoneBuild = buildMarker;
  launcher.innerHTML = '<i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>';
  launcher.style.cssText = [
    'position:fixed',
    'right:18px',
    'bottom:86px',
    'z-index:2147483600',
    'width:48px',
    'height:48px',
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

  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startRight = 18;
  let startBottom = 86;
  let moved = false;
  let suppressClickUntil = 0;

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
    startRight = Number.parseInt(launcher.style.right, 10) || 18;
    startBottom = Number.parseInt(launcher.style.bottom, 10) || 86;
    moved = false;
    launcher.setPointerCapture?.(event.pointerId);
  });
  launcher.addEventListener('pointermove', event => {
    if (pointerId !== event.pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (!moved && Math.hypot(deltaX, deltaY) > 8) moved = true;
    if (!moved) return;
    const size = 48;
    const nextRight = Math.min(Math.max(8, startRight - deltaX), Math.max(8, window.innerWidth - size - 8));
    const nextBottom = Math.min(Math.max(8, startBottom - deltaY), Math.max(8, window.innerHeight - size - 8));
    launcher.style.right = `${Math.round(nextRight)}px`;
    launcher.style.bottom = `${Math.round(nextBottom)}px`;
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

  document.body.appendChild(launcher);
  syncNativeLauncherVisibility();
  return launcher;
}
