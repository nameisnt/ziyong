import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue';

type PhoneModalLifecycleOptions = {
  dialogRef: Ref<HTMLElement | null>;
  isOpen: () => boolean;
  onClose: () => void;
};

const modalStack: symbol[] = [];
const screenLocks = new WeakMap<HTMLElement, { count: number; overflow: string }>();

function removeModal(modalId: symbol) {
  const index = modalStack.lastIndexOf(modalId);
  if (index >= 0) modalStack.splice(index, 1);
}

export function usePhoneModalLifecycle(options: PhoneModalLifecycleOptions) {
  const modalId = Symbol('phone-modal');
  let lockedScreen: HTMLElement | null = null;

  const isTopModal = () => modalStack.at(-1) === modalId;

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
    removeModal(modalId);
    modalStack.push(modalId);
    await nextTick();
    if (!options.isOpen() || !isTopModal()) return;
    lockBackground();
    options.dialogRef.value?.focus({ preventScroll: true });
  }

  function deactivate() {
    removeModal(modalId);
    unlockBackground();
  }

  function requestClose(event: Event) {
    if (!options.isOpen() || !isTopModal()) return;
    event.preventDefault();
    options.onClose();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    requestClose(event);
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
