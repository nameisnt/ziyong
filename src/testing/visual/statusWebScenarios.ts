import { createStatusDisplayScheme, useStatusDisplayStore } from '@/apps/status-display/store';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { buildFrontendDocument } from '@/util/theaterFrontend';
import { resetVisualPhoneRoute, waitForVisualCondition, waitForVisualPaint } from './context';

export async function applyStatusWebVisualScenario(name: string) {
  if (!name.startsWith('status-web')) return false;
  const runtime = globalThis as unknown as Record<string, any>;
  const originals = Object.fromEntries(
    ['Mvu', 'eventOn', 'getChatMessages', 'getLastMessageId', 'getCurrentChatId'].map(key => [key, runtime[key]]),
  );
  const helper = runtime.TavernHelper;
  const originalGetVariables = helper.getVariables;
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const assert = (value: unknown, message: string) => {
    if (!value) throw new Error(message);
  };
  const phone = usePhoneStore();
  const status = useStatusDisplayStore();
  let chat = 'A';
  const read = (options: { message_id?: number | string }) => ({
    stat_data: { test: `${chat}:${options.message_id === 'latest' ? 2 : options.message_id}` },
  });
  runtime.getChatMessages = () =>
    [0, 2].map(message_id => ({ message_id, role: 'assistant', message: 'test status', is_hidden: false }));
  runtime.getLastMessageId = () => 2;
  runtime.Mvu = {
    getMvuData: read,
    replaceMvuData: async () => {
      throw new Error('Unexpected data write');
    },
    events: { VARIABLE_UPDATE_ENDED: '__pc_test_status_event' },
  };
  helper.getVariables = function (options: { message_id?: number | string }) {
    assert(this === helper, 'Lost helper receiver');
    return read(options);
  };
  runtime.eventOn = (event: string, callback: (...args: unknown[]) => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(callback);
    return { stop: () => listeners.get(event)!.delete(callback) };
  };
  const count = () => listeners.get('__pc_test_status_event')?.size || 0;
  const frame = () =>
    document.querySelector<HTMLIFrameElement>('.pc-status-display-app iframe, .pc-status-editor-preview iframe');
  const ready = async (expected: string) => {
    assert(
      await waitForVisualCondition(
        () => frame()?.contentDocument?.getElementById('result')?.textContent === expected,
        2500,
      ),
      `Status module did not render ${expected}: ${document.querySelector('.pc-frame-height-note.warning')?.textContent}`,
    );
    assert(!frame()!.hasAttribute('sandbox'), 'Saved status is still sandboxed');
    assert(
      !frame()!.contentDocument!.querySelector('meta[http-equiv="Content-Security-Policy"]'),
      'Saved status still has injected CSP',
    );
    assert(count() === 1, 'Missing or duplicated frame event subscription');
  };
  const moduleCode = `
    if (!window.ST || typeof getCurrentMessageId !== 'function') throw new Error('Missing status bridge');
    await waitGlobalInitialized('Mvu');
    const current = getCurrentMessageId();
    const variables = getVariables({type:'message',message_id:current});
    if (Mvu.getMvuData({type:'message',message_id:current}).stat_data.test !== variables.stat_data.test) throw new Error('MVU mismatch');
    document.getElementById('result').textContent = variables.stat_data.test;
    document.getElementById('latest').textContent = String(getLastMessageId());
    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => { document.getElementById('events').textContent = 'received'; });
    document.getElementById('action').onclick = () => { document.getElementById('action').textContent = '已响应'; };
  `;
  const encoded = btoa(Array.from(new TextEncoder().encode(moduleCode), byte => String.fromCharCode(byte)).join(''));
  const template =
    '```html\n<!doctype html><html><head><meta charset="utf-8"><script type="module">await import("data:text/javascript;base64,' +
    encoded +
    '");</script></head><body><section style="padding:16px"><h2>状态栏网页测试</h2><p>当前楼层 <strong id="result"></strong></p><p>最新楼层 <span id="latest"></span></p><p id="events">等待事件</p><button id="action">测试交互</button><div style="height:110px;overflow:auto" id="scroll">' +
    Array.from({ length: 12 }, (_, i) => `<p>状态记录 ${i + 1}</p>`).join('') +
    '</div></section></body></html>\n```';
  try {
    const raw = '<iframe src="about:blank"></iframe><script>window.__pc_test = true</script>';
    for (const securityMode of ['safe', 'trusted', 'status'] as const) {
      const doc = new DOMParser().parseFromString(
        buildFrontendDocument(raw, { channelId: 'test', theme: 'light', securityMode }),
        'text/html',
      );
      assert(
        Boolean(doc.querySelector('iframe')) === (securityMode === 'status'),
        'Changed generated iframe stripping',
      );
      assert(
        Boolean(doc.querySelector('meta[http-equiv="Content-Security-Policy"]')) === (securityMode !== 'status'),
        'Changed generated CSP',
      );
      assert(
        doc.body.innerHTML.includes('window.__pc_test') === (securityMode !== 'safe'),
        'Changed safe script removal',
      );
    }
    phone.clearNotices();
    useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
    status.settings.schemes = [];
    const scheme = createStatusDisplayScheme('mvu');
    scheme.name = '__pc_test_status_web';
    scheme.shared = true;
    scheme.template = template;
    status.upsertScheme(scheme);
    status.setActiveScheme(phone.currentTavernScopeKey, scheme.id);
    resetVisualPhoneRoute('status-display', 'root', '状态栏');
    await ready('A:2');
    frame()!.contentDocument!.getElementById('action')!.click();
    assert(frame()!.contentDocument!.getElementById('action')!.textContent === '已响应', 'Inner button failed');
    const scroll = frame()!.contentDocument!.getElementById('scroll')!;
    scroll.scrollTop = 100;
    assert(scroll.scrollTop > 0, 'Inner scroll is blocked');
    const oldFrame = frame();
    const floor = document.querySelector<HTMLSelectElement>('.pc-status-floor-picker select')!;
    floor.value = '0';
    floor.dispatchEvent(new Event('change', { bubbles: true }));
    await ready('A:0');
    assert(frame() !== oldFrame, 'History did not remount frame');
    assert(frame()!.contentDocument!.getElementById('latest')!.textContent === '2', 'Latest was silently redirected');
    listeners.get('__pc_test_status_event')!.forEach(callback => callback());
    assert(frame()!.contentDocument!.getElementById('events')!.textContent === 'received', 'Event did not reach frame');
    chat = 'B';
    runtime.getCurrentChatId = () => '__pc_test_status_web_b';
    const scopeB = getCurrentChatScopeKey();
    status.setActiveScheme(scopeB, scheme.id);
    phone.currentTavernScopeKey = scopeB;
    phone.viewingScopeKey = scopeB;
    await ready('B:2');
    await phone.closePhone();
    await waitForVisualPaint();
    assert(count() === 0, 'Closing left a host listener');
    phone.openPhone();
    resetVisualPhoneRoute('status-display', 'root', '状态栏');
    await ready('B:2');
    if (name.includes('-editor')) {
      resetVisualPhoneRoute('status-display-settings', 'root', '状态栏设置');
      await waitForVisualPaint();
      assert(count() === 0, 'Leaving viewer retained listener');
      const row = [
        ...document.querySelectorAll<HTMLElement>('.pc-status-settings-app button, .pc-status-scheme-row button'),
      ].find(el => el.textContent?.includes(scheme.name));
      assert(row, 'Scheme edit button missing');
      row!.click();
      await ready('B:2');
      document.querySelector<HTMLButtonElement>('.pc-status-editor-page .pc-form-actions button')?.click();
      await waitForVisualPaint();
      assert(count() === 0, 'Editor cancellation retained listener');
      document.querySelector<HTMLElement>('.pc-status-scheme-main')!.click();
      await ready('B:2');
      frame()!.scrollIntoView({ block: 'center' });
      await waitForVisualPaint();
    }
    return true;
  } finally {
    helper.getVariables = originalGetVariables;
    Object.assign(runtime, originals);
  }
}
