import { useGenerationAliasesStore, generationAliasesField } from '@/store/generationAliases';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useSettingsStore } from '@/store/settings';
import { usePhoneStore } from '@/store/phone';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { waitForVisualCondition, waitForVisualPaint } from './context';

export async function applyTavernAliasVisualScenario(
  name: string,
  resetPhoneToRoute: (app: string, page: string, title: string, params?: Record<string, string>) => void,
) {
  if (!name.startsWith('settings-tavern-aliases')) return false;
  const runtime = globalThis as unknown as {
    SillyTavern: { getContext: () => Record<string, unknown> };
    getCurrentChatId: () => string;
  };
  const originalContext = runtime.SillyTavern.getContext;
  const originalChat = runtime.getCurrentChatId;
  const callbacks: Array<(env: { names: { char: string; user: string } }, raw: object) => void> = [];
  const power = { experimental_macro_engine: !name.endsWith('-unsupported') };
  runtime.SillyTavern.getContext = () => ({
    ...originalContext(),
    name1: 'Native User',
    name2: 'Native Char',
    powerUserSettings: power,
    macros: {
      envBuilder: { registerProvider: (fn: (typeof callbacks)[number]) => callbacks.push(fn) },
      registry: { registerMacro() {}, unregisterMacro() {} },
    },
  });
  const aliases = useGenerationAliasesStore();
  aliases.refreshTavernAliasSupport();
  const scopeA = getCurrentChatScopeKey();
  aliases.switchScope(scopeA);
  aliases.resetCurrentScope();
  aliases.charReplacement = '角色测试称呼';
  aliases.userReplacement = '用户测试称呼';
  useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
  resetPhoneToRoute('settings', 'root', '设置', { tab: 'generation' });
  await waitForVisualPaint();
  const toggle = document.querySelector<HTMLInputElement>('input[aria-label="应用于酒馆当前聊天"]')!;
  if (!toggle || toggle.checked) throw new Error('Tavern aliases must default off');
  if (name.endsWith('-unsupported')) {
    if (!toggle.disabled || !document.querySelector('.pc-settings-chat-aliases')?.textContent?.includes('新宏引擎'))
      throw new Error('Unsupported macro engine was not explained');
  } else {
    toggle.click();
    await waitForVisualPaint();
    if (!aliases.applyToTavern) throw new Error('Tavern alias toggle did not enable');
    const evaluate = () => {
      const env = { names: { char: 'Native Char', user: 'Native User' } };
      callbacks.forEach(fn => fn(env, {}));
      return env.names;
    };
    if (evaluate().char !== '角色测试称呼') throw new Error('Provider did not read active aliases');
    if (
      !(await waitForVisualCondition(
        () =>
          (extension_settings[generationAliasesField] as { scopes?: Record<string, { applyToTavern?: boolean }> })
            ?.scopes?.[scopeA]?.applyToTavern === true,
      ))
    )
      throw new Error('Tavern alias setting was not persisted');
    const snapshot = structuredClone(extension_settings[generationAliasesField]);
    aliases.applyToTavern = false;
    extension_settings[generationAliasesField] = snapshot;
    aliases.rehydrateFromSettings();
    if (!aliases.applyToTavern) throw new Error('Tavern alias setting did not rehydrate');
    runtime.getCurrentChatId = () => 'visual-alias-chat-b';
    if (evaluate().char !== 'Native Char') throw new Error('Previous chat aliases leaked before scope update');
    aliases.switchScope(getCurrentChatScopeKey());
    if (aliases.applyToTavern) throw new Error('New chat inherited enabled aliases');
    runtime.getCurrentChatId = originalChat;
    aliases.switchScope(scopeA);
    await waitForVisualPaint();
    if (!aliases.applyToTavern || !toggle.checked) throw new Error('Original chat aliases did not return');
    toggle.click();
    await waitForVisualPaint();
    if (evaluate().char !== 'Native Char') throw new Error('Disabling did not restore native macros');
    toggle.click();
    await waitForVisualPaint();
    if (callbacks.length !== 1) throw new Error('Repeated toggles registered duplicate providers');
    await checkNativePrefixLink();
  }
  document.querySelector('.pc-settings-chat-aliases')?.scrollIntoView({ block: 'center' });
  return true;
}

async function checkNativePrefixLink() {
  const phone = usePhoneStore();
  const settings = useSettingsStore();
  const runtime = globalThis as unknown as {
    updateScriptTreesWith?: (update: (trees: ScriptTree[]) => ScriptTree[]) => ScriptTree[];
    getCurrentChatId: () => string;
  };
  const originalUpdate = runtime.updateScriptTreesWith;
  const originalChat = runtime.getCurrentChatId;
  let fail = false;
  let trees = [
    {
      type: 'script',
      id: 'visual-compression',
      name: 'Visual compression',
      info: '',
      button: { enabled: false, buttons: [] },
      export_with: { data: true, button: true },
      enabled: true,
      content: "import 'https://example.test/压缩相邻消息/index.js'",
      data: { chat_history: { user_prefix: 'Original: ' } },
    },
  ] as ScriptTree[];
  runtime.updateScriptTreesWith = update => {
    if (fail) throw new Error('visual write failure');
    trees = update(JSON.parse(JSON.stringify(trees)) as ScriptTree[]);
    return trees;
  };
  const toggle = document.querySelector<HTMLInputElement>('input[aria-label="原生用户名宏联动（全局）"]')!;
  async function choose(accept: boolean) {
    const saved = Boolean(settings.settings.nativeUserPrefixLink);
    toggle.click();
    await waitForVisualPaint();
    if (!toggle.disabled || toggle.checked !== saved) throw new Error('Pending switch differs from saved state');
    const confirmation = phone.notices.find(notice => notice.actions?.some(action => action.id === 'confirm'));
    if (!confirmation) throw new Error('Missing real confirmation notice');
    const role = accept ? 'primary' : 'soft';
    const button = document.querySelector<HTMLButtonElement>(`.pc-phone-notice-action[data-role="${role}"]`);
    if (!button) throw new Error('Missing confirmation action');
    button.click();
    await waitForVisualPaint();
    if (toggle.disabled) throw new Error('Switch remained busy after confirmation');
  }
  async function checkReloadNotice() {
    const notice = phone.notices.find(item => item.message.includes('请手动刷新'));
    if (!notice) throw new Error('Missing reload notice');
    await new Promise(resolve => setTimeout(resolve, 3400));
    if (!phone.notices.some(item => item.id === notice.id)) throw new Error('Reload notice expired automatically');
    phone.dismissNotice(notice.id);
    await waitForVisualPaint();
  }
  try {
    if (!toggle || toggle.checked) throw new Error('Global link must default off');
    await choose(false);
    if (toggle.checked || settings.settings.nativeUserPrefixLink) throw new Error('Cancel changed the link');
    await choose(true);
    if (!toggle.checked || !settings.settings.nativeUserPrefixLink) throw new Error('Global link did not enable');
    await checkReloadNotice();
    runtime.getCurrentChatId = () => 'visual-native-link-b';
    useGenerationAliasesStore().switchScope(getCurrentChatScopeKey());
    await waitForVisualPaint();
    if (!toggle.checked) throw new Error('Global link changed with chat');
    await choose(false);
    if (!toggle.checked || !settings.settings.nativeUserPrefixLink) throw new Error('Cancel disabled the link');
    fail = true;
    await choose(true);
    if (!toggle.checked || !settings.settings.nativeUserPrefixLink) throw new Error('Failed disable changed the link');
    phone.notices.slice().forEach(notice => phone.dismissNotice(notice.id));
    fail = false;
    await choose(true);
    const script = trees[0] as Extract<ScriptTree, { type: 'script' }>;
    if (toggle.checked || script.data.chat_history.user_prefix !== 'Original: ')
      throw new Error('Disabling did not restore the original prefix');
    await checkReloadNotice();
    fail = true;
    await choose(true);
    if (
      toggle.checked ||
      settings.settings.nativeUserPrefixLink ||
      !phone.notices.some(notice => notice.message.includes('visual write failure'))
    )
      throw new Error('Write failure was not reported without changing the switch');
  } finally {
    runtime.updateScriptTreesWith = originalUpdate;
    runtime.getCurrentChatId = originalChat;
    useGenerationAliasesStore().switchScope(getCurrentChatScopeKey());
    phone.notices.slice().forEach(notice => phone.dismissNotice(notice.id));
  }
}
