const PHONE_ROOT_SELECTOR = '#phone-creative-root';
const CHAT_ACTION_HINTS = ['send', 'mes', 'message', 'chat', 'continue', 'regenerate', 'retry', 'textarea', 'input'];

type SendGuardHandle = {
  release: () => void;
};

type GuardState = {
  activeCount: number;
  clickListener: ((event: MouseEvent) => void) | null;
  keydownListener: ((event: KeyboardEvent) => void) | null;
  lastToastAt: number;
  message: string;
};

const guardState: GuardState = {
  activeCount: 0,
  clickListener: null,
  keydownListener: null,
  lastToastAt: 0,
  message: '生成进行中，请稍等片刻',
};

function isInsidePhoneRoot(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(PHONE_ROOT_SELECTOR));
}

function collectElementHints(element: Element | null) {
  if (!element) return '';

  const attributes = [
    element.id,
    element.getAttribute('name'),
    element.getAttribute('title'),
    element.getAttribute('aria-label'),
    element.getAttribute('placeholder'),
    element.className,
    element.textContent,
  ];

  return attributes
    .filter(value => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();
}

function isLikelyChatInput(element: Element | null) {
  if (!element) return false;
  const field = element.closest('textarea, input, [contenteditable="true"]');
  if (!field) return false;
  const hints = collectElementHints(field) || collectElementHints(field.parentElement);
  return CHAT_ACTION_HINTS.some(token => hints.includes(token));
}

function isLikelySendAction(element: Element | null) {
  if (!element) return false;
  const action = element.closest('button, a, [role="button"]');
  if (!action) return false;
  const hints = `${collectElementHints(action)} ${collectElementHints(action.parentElement)}`;
  return CHAT_ACTION_HINTS.some(token => hints.includes(token));
}

function showBlockedToast() {
  const now = Date.now();
  if (now - guardState.lastToastAt < 1200) return;
  guardState.lastToastAt = now;
  toastr.warning(guardState.message);
}

function installListeners() {
  if (guardState.clickListener || guardState.keydownListener) return;

  guardState.clickListener = event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || isInsidePhoneRoot(target)) return;
    if (!isLikelySendAction(target)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    showBlockedToast();
  };

  guardState.keydownListener = event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || isInsidePhoneRoot(target)) return;
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
    if (!isLikelyChatInput(target)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    showBlockedToast();
  };

  document.addEventListener('click', guardState.clickListener, true);
  document.addEventListener('keydown', guardState.keydownListener, true);
}

function uninstallListeners() {
  if (guardState.clickListener) {
    document.removeEventListener('click', guardState.clickListener, true);
    guardState.clickListener = null;
  }
  if (guardState.keydownListener) {
    document.removeEventListener('keydown', guardState.keydownListener, true);
    guardState.keydownListener = null;
  }
}

export function acquireSendGuard(message = '生成进行中，请稍等片刻'): SendGuardHandle {
  guardState.activeCount += 1;
  guardState.message = message;
  installListeners();

  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      guardState.activeCount = Math.max(0, guardState.activeCount - 1);
      if (!guardState.activeCount) {
        uninstallListeners();
      }
    },
  };
}
