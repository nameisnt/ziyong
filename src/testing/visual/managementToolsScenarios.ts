import { useSettingsStore } from '@/store/settings';

type ScriptTreeUpdater = (trees: ScriptTree[]) => ScriptTree[];

interface ManagementToolsVisualContext {
  resetPhoneToRoute: (appId: string, page: string, title: string) => void;
  waitForCondition: (condition: () => boolean, timeout?: number) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
}

const scriptTrees: Record<'character' | 'global' | 'preset', ScriptTree[]> = {
  global: [
    {
      button: { buttons: [], enabled: false },
      content: 'console.info("visual")',
      data: {},
      enabled: true,
      export_with: { button: true, data: true },
      id: 'visual-global-script',
      info: '',
      name: '全局资料同步脚本',
      type: 'script',
    },
  ],
  preset: [
    {
      color: '#287271',
      enabled: true,
      icon: 'fa-folder',
      id: 'visual-preset-folder',
      name: '当前预设的长名称脚本文件夹',
      scripts: [
        {
          button: { buttons: [], enabled: false },
          content: 'console.info("preset")',
          data: {},
          enabled: false,
          export_with: { button: true, data: true },
          id: 'visual-preset-script',
          info: '',
          name: '用于验证窄屏省略和批量选择的预设脚本',
          type: 'script',
        },
      ],
      type: 'folder',
    },
  ],
  character: [
    {
      button: { buttons: [], enabled: false },
      content: 'console.info("character")',
      data: {},
      enabled: true,
      export_with: { button: true, data: true },
      id: 'visual-character-script',
      info: '',
      name: '角色卡状态维护',
      type: 'script',
    },
  ],
};

let originalFetch: typeof fetch | null = null;

export function prepareManagementToolsVisualRuntime(appId: string) {
  if (appId === 'script-manager') {
    const runtime = globalThis as unknown as {
      getScriptTrees?: (options: { type: 'character' | 'global' | 'preset' }) => ScriptTree[];
      updateScriptTreesWith?: (
        updater: ScriptTreeUpdater,
        options: { type: 'character' | 'global' | 'preset' },
      ) => ScriptTree[];
    };
    runtime.getScriptTrees = options => scriptTrees[options.type];
    runtime.updateScriptTreesWith = (updater, options) => {
      scriptTrees[options.type] = updater(scriptTrees[options.type]);
      return scriptTrees[options.type];
    };
    return;
  }
  if (appId !== 'extension-transfer') return;
  originalFetch ??= globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    if (path === '/api/extensions/discover') {
      return new Response(
        JSON.stringify([
          { name: 'third-party/visual-helper', type: 'local' },
          { name: 'third-party/long-extension-name-for-mobile-layout', type: 'global' },
        ]),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      );
    }
    if (path === '/api/extensions/version') {
      const body = JSON.parse(String(init?.body || '{}')) as { extensionName?: string };
      return new Response(
        JSON.stringify({
          currentBranchName: body.extensionName?.includes('long') ? 'release-long-branch' : 'main',
          remoteUrl: `https://github.com/example/${body.extensionName || 'extension'}.git`,
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      );
    }
    if (path === '/api/extensions/install') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    return originalFetch!(input, init);
  };
}

export async function applyManagementToolsVisualScenario(name: string, context: ManagementToolsVisualContext) {
  if (name === 'script-manager' || name === 'script-manager-dark') {
    prepareManagementToolsVisualRuntime('script-manager');
    useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
    context.resetPhoneToRoute('script-manager', 'root', '助手脚本');
    await context.waitForPaint();
    if (name.endsWith('-dark')) {
      document.querySelector<HTMLButtonElement>('button[aria-label="批量管理"]')?.click();
      await context.waitForPaint();
      document.querySelector<HTMLInputElement>('.pc-script-row input[type="checkbox"]')?.click();
      await context.waitForPaint();
      const deleteButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-bulk-selection-actions button')].find(
        button => button.textContent?.includes('删除所选'),
      );
      deleteButton?.click();
      const confirmationOpened = await context.waitForCondition(() =>
        Boolean(document.querySelector('.pc-phone-notice-actions button[data-role="danger"]')),
      );
      if (!confirmationOpened) throw new Error('Assistant script batch deletion did not request confirmation');
      document.querySelector<HTMLButtonElement>('.pc-phone-notice-actions button[data-role="soft"]')?.click();
      await context.waitForPaint();
    }
    return true;
  }

  if (name === 'extension-transfer' || name === 'extension-transfer-import-dark') {
    prepareManagementToolsVisualRuntime('extension-transfer');
    useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
    context.resetPhoneToRoute('extension-transfer', 'root', '扩展迁移');
    await context.waitForPaint();
    await context.waitForCondition(() => document.querySelectorAll('.pc-extension-row').length === 2);
    if (name === 'extension-transfer-import-dark') {
      const importTab = [...document.querySelectorAll<HTMLButtonElement>('.pc-extension-tabs button')].find(button =>
        button.textContent?.includes('导入安装'),
      );
      importTab?.click();
      await context.waitForPaint();
      const fileInput = document.querySelector<HTMLInputElement>('.pc-extension-file-picker input[type="file"]');
      if (!fileInput) throw new Error('Extension transfer import input is missing');
      const file = new File(
        [
          JSON.stringify({
            extensions: [
              {
                branch: 'release-mobile-layout-check',
                name: 'mobile-layout-preview-extension-with-long-name',
                scope: 'global',
                url: 'https://github.com/example/mobile-layout-preview-extension-with-long-name.git',
              },
              { name: 'local-preview-extension', scope: 'local', url: 'https://github.com/example/local-preview.git' },
            ],
            schemaVersion: 1,
          }),
        ],
        'visual-extension-manifest.json',
        { type: 'application/json' },
      );
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      const imported = await context.waitForCondition(
        () => document.querySelectorAll('.pc-extension-import-row').length === 2,
      );
      if (!imported) throw new Error('Extension transfer did not render the imported preview rows');
      await context.waitForPaint();
      document.querySelector<HTMLButtonElement>('.pc-extension-transfer-app .pc-form-actions .pc-primary-btn')?.click();
      const confirmationOpened = await context.waitForCondition(() =>
        Boolean(document.querySelector('.pc-phone-notice-actions button[data-role="danger"]')),
      );
      if (!confirmationOpened) throw new Error('Extension transfer installation did not request confirmation');
      document.querySelector<HTMLButtonElement>('.pc-phone-notice-actions button[data-role="danger"]')?.click();
      const installed = await context.waitForCondition(
        () =>
          document.querySelectorAll('.pc-extension-import-row small').length > 0 &&
          document.body.textContent!.includes('安装成功'),
      );
      if (!installed) throw new Error('Extension transfer did not retain successful installation results');
      await context.waitForPaint();
    }
    return true;
  }
  return false;
}
