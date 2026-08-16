import { usePhoneStore } from '@/store/phone';

type ToastrKind = 'error' | 'info' | 'success' | 'warning';
type ToastrMethod = (message?: unknown, title?: unknown, options?: unknown) => unknown;

export function usePhoneToastrBridge() {
  const phone = usePhoneStore();
  const toastrOriginals = new Map<ToastrKind, ToastrMethod>();
  let toastrBridgeInstalled = false;

  function formatToastrMessage(message: unknown) {
    if (message instanceof Error) return message.message;
    if (typeof message === 'string') return message;
    if (message === null || message === undefined) return '';
    return String(message);
  }

  function formatToastrTitle(title: unknown, kind: ToastrKind) {
    if (typeof title === 'string' && title.trim()) return title.trim();
    if (kind === 'success') return '完成';
    if (kind === 'error') return '出错';
    return '提示';
  }

  function showPhoneToastr(kind: ToastrKind, message: unknown, title: unknown) {
    const text = formatToastrMessage(message);
    if (!text.trim()) return;
    const options = {
      title: formatToastrTitle(title, kind),
    };
    if (kind === 'success') {
      phone.noticeSuccess(text, options);
      return;
    }
    if (kind === 'error') {
      phone.noticeError(text, options);
      return;
    }
    if (kind === 'warning') {
      phone.noticeWarning(text, options);
      return;
    }
    phone.noticeInfo(text, options);
  }

  function installToastrBridge() {
    if (toastrBridgeInstalled || typeof toastr === 'undefined') return;
    (['success', 'info', 'warning', 'error'] as ToastrKind[]).forEach(kind => {
      const original = toastr[kind] as ToastrMethod | undefined;
      if (typeof original !== 'function') return;
      toastrOriginals.set(kind, original.bind(toastr));
      toastr[kind] = ((message?: unknown, title?: unknown, options?: unknown) => {
        if (phone.isOpen) {
          showPhoneToastr(kind, message, title);
          return undefined;
        }
        return toastrOriginals.get(kind)?.(message, title, options);
      }) as (typeof toastr)[typeof kind];
    });
    toastrBridgeInstalled = true;
  }

  function restoreToastrBridge() {
    if (!toastrBridgeInstalled || typeof toastr === 'undefined') return;
    toastrOriginals.forEach((original, kind) => {
      toastr[kind] = original as (typeof toastr)[typeof kind];
    });
    toastrOriginals.clear();
    toastrBridgeInstalled = false;
  }

  onMounted(installToastrBridge);
  onBeforeUnmount(restoreToastrBridge);
}
