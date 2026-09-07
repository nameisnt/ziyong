import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue';

type PhoneModalLifecycleOptions = {
  dialogRef: Ref<HTMLElement | null>;
  initialFocus?: () => HTMLElement | null;
  isOpen: () => boolean;
  onClose: () => void;
};

type ModalEntry = { id: symbol; dialog: Ref<HTMLElement | null> };
const modalStack: ModalEntry[] = [];
const screenLocks = new WeakMap<HTMLElement, { count: number; overflow: string }>();

function removeModal(modalId: symbol) {
  const index = modalStack.findIndex(modal => modal.id === modalId);
  if (index >= 0) modalStack.splice(index, 1);
}

function canFocus(element: HTMLElement | null): element is HTMLElement {
  return Boolean(
    element?.isConnected &&
    !element.matches(':disabled') &&
    !element.closest('[inert], [hidden]') &&
    element.getClientRects().length &&
    getComputedStyle(element).visibility !== 'hidden',
  );
}

function focusableElements(root: HTMLElement) {
  return [
    ...root.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex], summary'),
  ].filter(element => element.tabIndex >= 0 && canFocus(element));
}

export function usePhoneModalLifecycle(options: PhoneModalLifecycleOptions) {
  const modalId = Symbol('phone-modal');
  let lockedScreen: HTMLElement | null = null;
  let returnFocus: HTMLElement | null = null;
  let capturedFocus = false;
  let shell: HTMLElement | null = null;

  const isTopModal = () => modalStack.at(-1)?.id === modalId;

  function unlockBackground() {
    if (!lockedScreen) return;
    const lock = screenLocks.get(lockedScreen);
    if (lock && lock.count > 1) {
      lock.count -= 1;
    } else if (lock) {
      lockedScreen.style.overflow = lock.overflow;
      screenLocks.delete(lockedScreen);
    }
    lockedScreen = null;
  }

  function lockBackground() {
    if (lockedScreen) return;
    const shell = options.dialogRef.value?.closest<HTMLElement>('.pc-phone-shell');
    const screen = shell?.querySelector<HTMLElement>('.pc-screen') ?? null;
    if (!screen) return;
    const lock = screenLocks.get(screen);
    if (lock) {
      lock.count += 1;
    } else {
      screenLocks.set(screen, { count: 1, overflow: screen.style.overflow });
      screen.style.overflow = 'hidden';
    }
    lockedScreen = screen;
  }

  async function activate() {
    if (modalStack.some(modal => modal.id === modalId)) return;
    modalStack.push({ id: modalId, dialog: options.dialogRef });
    await nextTick();
    if (!options.isOpen() || !isTopModal()) return;
    lockBackground();
    shell = options.dialogRef.value?.closest<HTMLElement>('.pc-phone-shell') ?? null;
    (options.initialFocus?.() || options.dialogRef.value)?.focus({ preventScroll: true });
  }

  function deactivate() {
    const wasTop = isTopModal();
    removeModal(modalId);
    unlockBackground();
    const trigger = returnFocus;
    returnFocus = null;
    capturedFocus = false;
    if (!wasTop) return;
    const nextModal = modalStack.at(-1);
    // Notice actions can disable their trigger in a following Vue flush.
    requestAnimationFrame(() => {
      // A newly opened modal owns focus; closing its predecessor must not steal it.
      if (modalStack.at(-1) !== nextModal) return;
      const parent = nextModal?.dialog.value;
      if (trigger !== document.body && canFocus(trigger) && (!parent || parent.contains(trigger))) {
        trigger.focus({ preventScroll: true });
      } else {
        const target = parent || (shell && focusableElements(shell)[0]);
        target?.focus({ preventScroll: true });
      }
    });
  }

  function requestClose(event: Event) {
    if (event.defaultPrevented || !options.isOpen() || !isTopModal()) return;
    event.preventDefault();
    options.onClose();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || !options.isOpen() || !isTopModal()) return;
    if (event.key === 'Escape') {
      requestClose(event);
      return;
    }
    const dialog = options.dialogRef.value;
    if (event.key !== 'Tab' || !dialog) return;
    const elements = focusableElements(dialog);
    const first = elements[0];
    const last = elements.at(-1);
    const active = document.activeElement;
    if (
      !first ||
      !dialog.contains(active) ||
      active === dialog ||
      (event.shiftKey ? active === first : active === last)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus({ preventScroll: true });
      if (!first) dialog.focus({ preventScroll: true });
    }
  }

  function onPhoneBack(event: Event) {
    requestClose(event);
  }

  watch(
    () => [options.isOpen(), options.dialogRef.value] as const,
    ([open, dialog]) => {
      if (!open) {
        deactivate();
        return;
      }
      if (!capturedFocus) {
        returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        capturedFocus = true;
      }
      if (dialog) void activate();
    },
    { flush: 'post', immediate: true },
  );

  onMounted(() => {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('phone-before-back', onPhoneBack);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('phone-before-back', onPhoneBack);
    deactivate();
  });
}
