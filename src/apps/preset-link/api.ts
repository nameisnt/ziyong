import { getOptionalGlobalFunction, getOptionalGlobalValue } from '@/util/runtime';

type ReloadFn = () => Promise<unknown> | unknown;

interface HiddenNoticeStyle {
  displayPriority: string;
  displayValue: string;
}

function isPresetRegexNotice(element: HTMLElement, presetName: string) {
  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return (
    text.includes('预设') &&
    text.includes('正则') &&
    (text.includes('重新加载聊天') || text.includes('正则生效')) &&
    (!presetName || text.includes(presetName))
  );
}

export function createPresetRegexNoticeGuard(presetName: string) {
  const existingNotices = new Set(document.querySelectorAll<HTMLElement>('.toast'));
  const hiddenNotices = new Map<HTMLElement, HiddenNoticeStyle>();

  function hideNotice(element: HTMLElement) {
    if (existingNotices.has(element) || hiddenNotices.has(element) || !isPresetRegexNotice(element, presetName)) return;
    hiddenNotices.set(element, {
      displayPriority: element.style.getPropertyPriority('display'),
      displayValue: element.style.getPropertyValue('display'),
    });
    element.style.setProperty('display', 'none', 'important');
  }

  function inspectNode(node: Node) {
    const element = node instanceof HTMLElement ? node : node.parentElement;
    if (!element) return;
    const closestToast = element.closest<HTMLElement>('.toast');
    if (closestToast) hideNotice(closestToast);
    element.querySelectorAll<HTMLElement>('.toast').forEach(hideNotice);
  }

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      inspectNode(record.target);
      record.addedNodes.forEach(inspectNode);
    });
  });
  observer.observe(document.body, { characterData: true, childList: true, subtree: true });

  return {
    dismiss() {
      hiddenNotices.forEach((_style, element) => element.remove());
      hiddenNotices.clear();
    },
    restore() {
      hiddenNotices.forEach((style, element) => {
        if (style.displayValue) {
          element.style.setProperty('display', style.displayValue, style.displayPriority);
        } else {
          element.style.removeProperty('display');
        }
      });
      hiddenNotices.clear();
    },
    stop() {
      observer.disconnect();
    },
  };
}

export function getEnabledPresetRegexCount(presetName: string) {
  const getRegexes = getOptionalGlobalFunction<
    (option: { name: string; type: 'preset' }) => Array<{ enabled?: boolean }>
  >('getTavernRegexes');
  if (getRegexes) {
    try {
      return getRegexes({ name: presetName, type: 'preset' }).filter(regex => regex.enabled !== false).length;
    } catch {
      // Fall back to the preset payload for older helper versions.
    }
  }

  const getPreset = getOptionalGlobalFunction<(name: string) => Record<string, unknown>>('getPreset');
  try {
    const preset = getPreset?.(presetName);
    const extensions =
      preset?.extensions && typeof preset.extensions === 'object'
        ? (preset.extensions as Record<string, unknown>)
        : {};
    const regexes = Array.isArray(extensions.regex_scripts) ? extensions.regex_scripts : [];
    return regexes.filter(regex => !regex || typeof regex !== 'object' || (regex as Record<string, unknown>).enabled !== false)
      .length;
  } catch {
    return 0;
  }
}

export async function reloadCurrentChatForPresetRegex() {
  const direct =
    getOptionalGlobalFunction<ReloadFn>('reloadCurrentChat') ?? getOptionalGlobalFunction<ReloadFn>('reloadChat');
  if (direct) {
    await direct();
    return;
  }

  const runtime = getOptionalGlobalValue<Record<string, unknown>>('SillyTavern');
  const context =
    typeof runtime?.getContext === 'function'
      ? ((runtime.getContext as () => Record<string, unknown>)() ?? runtime)
      : runtime;
  const contextual = context?.reloadCurrentChat ?? context?.reloadChat;
  if (typeof contextual === 'function') {
    await (contextual as ReloadFn).call(context);
    return;
  }

  throw new Error('当前酒馆环境没有开放重新加载聊天接口');
}
