import { resolveMvuRuntime } from '@/apps/mvu-modifier/api';
import {
  getLastMessageIdSafe,
  getOptionalGlobalFunction,
  getOptionalGlobalValue,
  getSillyTavernContext,
  onRuntimeEvent,
} from '@/util/runtime';

export interface StatusFrameContext {
  scopeKey: string;
  messageId: number | 'latest';
}

export function createStatusFrameHost(messageId: number | 'latest') {
  let disposed = false;
  const subscriptions = new Set<{ stop: () => void }>();
  const assertActive = () => {
    if (disposed) throw new Error('状态栏网页已关闭');
  };
  return {
    getCurrentMessageId: () => (messageId === 'latest' ? getLastMessageIdSafe() : messageId),
    getLastMessageId: getLastMessageIdSafe,
    get mvu() {
      return getOptionalGlobalValue('Mvu');
    },
    tavern_events: getOptionalGlobalValue('tavern_events') ?? getSillyTavernContext()?.eventTypes,
    // The helper's stream event is iframe-only; use its published event name outside helper frames.
    iframe_events: getOptionalGlobalValue('iframe_events') ?? {
      STREAM_TOKEN_RECEIVED_FULLY: 'js_stream_token_received_fully',
    },
    async waitGlobalInitialized(name: string) {
      assertActive();
      if (name === 'Mvu') {
        const mvu = await resolveMvuRuntime();
        assertActive();
        return mvu;
      }
      const wait = getOptionalGlobalFunction<(name: string) => Promise<unknown>>('waitGlobalInitialized');
      if (!wait) throw new Error('酒馆助手未提供 waitGlobalInitialized');
      await wait(name);
      assertActive();
      return getOptionalGlobalValue(name);
    },
    eventOn(event: string, listener: (...args: unknown[]) => void) {
      assertActive();
      const subscription = onRuntimeEvent(event, (...args) => {
        if (!disposed) listener(...args);
      });
      subscriptions.add(subscription);
      return {
        stop() {
          if (subscriptions.delete(subscription)) subscription.stop();
        },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      subscriptions.forEach(subscription => subscription.stop());
      subscriptions.clear();
    },
  };
}

export type StatusFrameElement = HTMLIFrameElement & {
  __pcStatusHost?: ReturnType<typeof createStatusFrameHost>;
};

export function createStatusBridgeScript() {
  return [
    '(() => {',
    '  const host = window.frameElement.__pcStatusHost;',
    '  if (!host) throw new Error("状态栏运行上下文尚未就绪");',
    '  const parentWin = window.parent;',
    '  window.ST = {',
    '    win: parentWin, doc: parentWin.document, $: parentWin.$, _: parentWin._, toastr: parentWin.toastr,',
    '    qs: (selector, root) => (root || parentWin.document).querySelector(selector),',
    '    qsa: (selector, root) => Array.from((root || parentWin.document).querySelectorAll(selector)),',
    '    create: tag => parentWin.document.createElement(tag),',
    '  };',
    '  window.getCurrentMessageId = host.getCurrentMessageId;',
    '  window.getLastMessageId = host.getLastMessageId;',
    '  window.eventOn = host.eventOn;',
    '  window.tavern_events = host.tavern_events;',
    '  window.iframe_events = host.iframe_events;',
    '  if (host.mvu) window.Mvu = host.mvu;',
    '  window.waitGlobalInitialized = async name => {',
    '    const value = await host.waitGlobalInitialized(name);',
    '    if (value != null) window[name] = value;',
    '  };',
    '  window.addEventListener("pagehide", () => host.dispose(), { once: true });',
    '})();',
  ].join('\n');
}
