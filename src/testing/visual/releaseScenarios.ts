import { RUNNING_VERSION, RELEASE_SEEN_FIELD } from '@/core/releaseInfo';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { resetVisualPhoneRoute, waitForVisualCondition, waitForVisualPaint } from './context';

export async function applyReleaseVisualScenario(name: string) {
  if (!name.startsWith('settings-release')) return false;
  const phone = usePhoneStore();
  const originalFetch = globalThis.fetch;
  const OriginalURL = globalThis.URL;
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  };
  let requests = 0;
  let result: 'current' | 'available' | 'unknown' | 'error' = 'current';
  let releaseRequest: (() => void) | undefined;
  // The visual dev module has no installed extension directory; simulate its host URL only.
  globalThis.URL = class extends OriginalURL {
    constructor(url: string | URL, base?: string | URL) {
      super(
        String(url) === import.meta.url || String(url).includes('/src/apps/settings/SettingsReleasePanel.vue')
          ? 'https://fixture/scripts/extensions/third-party/__pc_test_reader/dist/settings.chunk.js'
          : url,
        base,
      );
    }
  };
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    if (path === '/api/extensions/discover') {
      requests += 1;
      return Response.json([{ name: 'third-party/__pc_test_reader', type: 'local' }]);
    }
    if (path === '/api/extensions/version') {
      requests += 1;
      if (phone.currentRoute.appId === 'extension-transfer')
        return Response.json({ currentCommitHash: 'abc', isUpToDate: true });
      assert(JSON.parse(String(init?.body)).extensionName === '__pc_test_reader', 'Checked an unrelated extension');
      await new Promise<void>(resolve => {
        releaseRequest = resolve;
      });
      if (result === 'error') return new Response(`__pc_test_error_${'long_error_'.repeat(20)}`, { status: 503 });
      return Response.json(result === 'unknown' ? {} : { currentCommitHash: 'abc', isUpToDate: result === 'current' });
    }
    return originalFetch(input, init);
  };
  try {
    delete extension_settings[RELEASE_SEEN_FIELD];
    phone.clearNotices();
    phone.openPhone();
    assert(phone.notices.length === 1 && phone.notices[0].title.includes(RUNNING_VERSION), 'Missing first-open notice');
    phone.clearNotices();
    phone.openPhone();
    assert(phone.notices.length === 0, 'Repeated release notice');
    assert(requests === 0, 'Opening phone made update requests');
    useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
    resetVisualPhoneRoute('settings', 'root', '设置', { tab: 'release' });
    await waitForVisualPaint();
    const panel = () => document.querySelector<HTMLElement>('.pc-release-panel')!;
    const check = () => panel().querySelector<HTMLButtonElement>('button')!;
    assert(panel().textContent?.includes(RUNNING_VERSION), 'Missing runtime version');
    assert(requests === 0, 'Settings made an automatic update request');
    for (const state of ['current', 'unknown', 'error', 'available'] as const) {
      result = state;
      releaseRequest = undefined;
      check().click();
      assert(await waitForVisualCondition(() => Boolean(releaseRequest)), 'Check request not started');
      assert(check().disabled, 'Repeated checks are not disabled');
      releaseRequest!();
      assert(await waitForVisualCondition(() => !check().disabled), 'Check did not finish');
      const expected = {
        current: '已是最新',
        unknown: '无法检查',
        error: '__pc_test_error_',
        available: '发现仓库更新',
      }[state];
      assert(panel().textContent?.includes(expected), `Missing status: ${state}`);
      if (state === 'error' && name.includes('-error')) return true;
    }
    assert(requests === 8, 'Unexpected requests or polling');
    if (name.includes('-notice')) {
      delete extension_settings[RELEASE_SEEN_FIELD];
      phone.openPhone();
      await waitForVisualPaint();
      return true;
    }
    panel().querySelector<HTMLButtonElement>('.pc-primary-btn')!.click();
    assert(
      await waitForVisualCondition(() => phone.currentRoute.appId === 'extension-transfer'),
      'Update entry did not navigate',
    );
    await phone.goBack();
    await waitForVisualPaint();
    assert(phone.currentRoute.appId === 'settings', 'Return to settings failed');
    assert(panel(), 'Version settings not restored');
    return true;
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.URL = OriginalURL;
  }
}
