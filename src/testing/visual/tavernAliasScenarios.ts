import { useGenerationAliasesStore, generationAliasesField } from '@/store/generationAliases';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { useSettingsStore } from '@/store/settings';
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
    macros: { envBuilder: { registerProvider: (fn: (typeof callbacks)[number]) => callbacks.push(fn) } },
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
  }
  document.querySelector('.pc-settings-chat-aliases')?.scrollIntoView({ block: 'center' });
  return true;
}
