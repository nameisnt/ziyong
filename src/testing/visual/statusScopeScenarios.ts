import {
  createStatusDisplayScheme,
  statusDisplayField,
  useStatusDisplayStore,
  statusDisplayRegexTargetId,
} from '@/apps/status-display/store';
import { regexDisplayField, useRegexDisplayStore } from '@/apps/regex-display/store';
import { getCurrentChatScopeKey } from '@/store/chatScoped';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { waitForVisualCondition, waitForVisualPaint } from './context';

export async function applyStatusScopeVisualScenario(
  name: string,
  resetRoute: (app: string, page: string, title: string) => void,
) {
  if (!name.startsWith('status-scope')) return false;
  const phone = usePhoneStore();
  const status = useStatusDisplayStore();
  const regex = useRegexDisplayStore();
  const runtime = globalThis as unknown as { getCurrentChatId: () => string };
  const originalChat = runtime.getCurrentChatId;
  const scopeA = getCurrentChatScopeKey();
  runtime.getCurrentChatId = () => '__pc_test_status_b';
  const scopeB = getCurrentChatScopeKey();
  runtime.getCurrentChatId = originalChat;
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  };
  const click = async (selector: string, text?: string) => {
    const button = [...document.querySelectorAll<HTMLElement>(selector)].find(
      el => !text || el.textContent?.trim() === text,
    );
    assert(button, `Missing control: ${selector} ${text || ''}`);
    button!.click();
    await waitForVisualPaint();
  };
  const root = async () => {
    resetRoute('status-display-settings', 'root', '状态栏设置');
    await waitForVisualPaint();
  };
  const switchChat = async (b: boolean) => {
    runtime.getCurrentChatId = b ? () => '__pc_test_status_b' : originalChat;
    phone.currentTavernScopeKey = b ? scopeB : scopeA;
    phone.viewingScopeKey = phone.currentTavernScopeKey;
    await root();
  };
  const legacy = {
    ...createStatusDisplayScheme(),
    id: '__pc_test_legacy_status',
    ownerScopeKey: '',
    name: '旧状态方案',
  };
  regex.settings.usages[statusDisplayRegexTargetId(legacy.id)] = {
    contentRuleId: 'test-extract',
    titleRuleId: '',
    displayRuleIds: ['test-replace'],
  };
  extension_settings[regexDisplayField] = JSON.parse(JSON.stringify(regex.settings));
  extension_settings[statusDisplayField] = {
    version: 1,
    schemes: [legacy],
    activeSchemeByScope: { [scopeA]: legacy.id, [scopeB]: legacy.id },
    enabledSchemeIdsByScope: {},
  };
  runtime.getCurrentChatId = () => '';
  status.rehydrateFromSettings();
  assert(status.schemes.length === 1 && !status.schemes[0].ownerScopeKey, 'Migration ran without a chat');
  runtime.getCurrentChatId = originalChat;
  status.rehydrateFromSettings();
  regex.rehydrateFromSettings();
  const copyB = status.getVisibleSchemes(scopeB)[0];
  assert(copyB && copyB.id !== legacy.id && !copyB.shared, 'Legacy B was not made private');
  assert(
    regex.getUsage(statusDisplayRegexTargetId(copyB.id)).contentRuleId === 'test-extract',
    'Migration lost regex selections',
  );
  regex.getUsage(statusDisplayRegexTargetId(copyB.id)).displayRuleIds.push('private-only');
  assert(
    !regex.getUsage(statusDisplayRegexTargetId(legacy.id)).displayRuleIds.includes('private-only'),
    'Private regex selections share an array',
  );
  await waitForVisualPaint();
  status.rehydrateFromSettings();
  assert(status.schemes.length === 2, 'Rehydrate repeated migration');

  useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
  await root();
  await click('button[aria-label="新增方案"]');
  const toggle = () => document.querySelector<HTMLInputElement>('input[aria-label="跨聊天共用"]')!;
  assert(!toggle().checked, 'New scheme does not default private');
  const input = document.querySelector<HTMLInputElement>('.pc-status-editor-page input[type="text"]')!;
  input.value = '当前聊天专属状态';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await click('.pc-form-actions button', '保存');
  const created = status.schemes.find(s => s.name === input.value)!;
  assert(created && created.ownerScopeKey === scopeA && !created.shared, 'UI did not save a private scheme');
  assert(status.getEnabledSchemeIds(scopeA).includes(created.id), 'Saved scheme not enabled for owner');
  await switchChat(true);
  assert(
    !document.querySelector('.pc-status-scheme-list')?.textContent?.includes(created.name),
    'Private scheme leaked to B',
  );
  status.setActiveScheme(scopeB, created.id);
  assert(!status.getEnabledSchemeIds(scopeB).includes(created.id), 'Store activated unavailable scheme');
  await switchChat(false);
  await click('.pc-status-scheme-main', created.name + '固定文字正则');
  toggle().click();
  await click('.pc-form-actions button', '保存');
  assert(status.schemes.find(s => s.id === created.id)?.shared, 'Share toggle was not persisted');
  await switchChat(true);
  const row = [...document.querySelectorAll<HTMLElement>('.pc-status-enable-row')].find(el =>
    el.textContent?.includes(created.name),
  )!;
  assert(row && !row.querySelector<HTMLInputElement>('input')!.checked, 'Shared scheme auto-enabled in B');
  row.querySelector<HTMLInputElement>('input')!.click();
  await waitForVisualPaint();
  assert(status.getEnabledSchemeIds(scopeB).includes(created.id), 'B enable checkbox failed');
  await switchChat(false);
  await click('.pc-status-scheme-main', created.name + '固定文字正则');
  toggle().click();
  await click('.pc-form-actions button', '保存');
  assert(
    phone.notices.some(n => n.message.includes('其他 1 个聊天')),
    'Private conversion has no impact confirmation',
  );
  assert(
    document.querySelector<HTMLButtonElement>('.pc-form-actions .pc-primary-btn')!.disabled,
    'Pending confirmation allows duplicate save',
  );
  await click('.pc-phone-notice-actions button', '取消');
  assert(
    status.schemes.find(s => s.id === created.id)?.shared && status.getEnabledSchemeIds(scopeB).includes(created.id),
    'Cancelled conversion changed bindings',
  );
  await click('.pc-form-actions button', '保存');
  await click('.pc-phone-notice-actions button', '改为私有');
  assert(
    !status.getVisibleSchemes(scopeB).some(s => s.id === created.id),
    'Confirmed private scheme still visible in B',
  );
  assert(!status.getEnabledSchemeIds(scopeB).includes(created.id), 'Confirmed conversion retained B binding');

  const ownRow = [...document.querySelectorAll<HTMLElement>('.pc-status-scheme-row')].find(el =>
    el.textContent?.includes(created.name),
  )!;
  ownRow.querySelector<HTMLButtonElement>('button[aria-label="复制方案"]')!.click();
  await waitForVisualPaint();
  const duplicate = status.schemes.find(s => s.name === `${created.name} 副本`)!;
  assert(duplicate?.ownerScopeKey === scopeA && !duplicate.shared, 'Copy should be current-chat private');
  const duplicateRow = [...document.querySelectorAll<HTMLElement>('.pc-status-scheme-row')].find(el =>
    el.textContent?.includes(duplicate.name),
  )!;
  duplicateRow.querySelector<HTMLButtonElement>('button[aria-label="删除方案"]')!.click();
  await waitForVisualPaint();
  await click('.pc-phone-notice-actions button', '删除');
  assert(!status.schemes.some(s => s.id === duplicate.id), 'Delete did not remove private copy');

  await click('.pc-status-scheme-main', created.name + '固定文字正则');
  const rule = regex.addRule({ name: '测试替换', pattern: 'x', replacement: 'y' });
  await waitForVisualPaint();
  const ruleLabel = [...document.querySelectorAll<HTMLElement>('.pc-status-display-rules label')].find(
    el => el.textContent?.trim() === rule.name,
  )!;
  ruleLabel.querySelector<HTMLInputElement>('input')!.click();
  await waitForVisualPaint();
  await click('.pc-form-actions button', '取消');
  assert(
    !regex.getUsage(statusDisplayRegexTargetId(created.id)).displayRuleIds.includes(rule.id),
    'Cancel saved regex edits',
  );
  await click('.pc-status-scheme-main', created.name + '固定文字正则');
  runtime.getCurrentChatId = () => '';
  await click('.pc-form-actions button', '保存');
  assert(phone.currentRoute.page === 'editor', 'Failed save discarded editor');
  runtime.getCurrentChatId = originalChat;
  await switchChat(true);
  await switchChat(false);
  phone.clearNotices();
  assert(
    await waitForVisualCondition(() => {
      const saved = extension_settings[statusDisplayField] as { schemes?: typeof status.schemes };
      return Boolean(saved?.schemes?.some(s => s.id === created.id && s.ownerScopeKey === scopeA && !s.shared));
    }),
    'Private ownership was not persisted',
  );
  if (name.includes('-editor') || name.includes('-confirm')) {
    await click('.pc-status-scheme-main', created.name + '固定文字正则');
    if (name.includes('-confirm')) {
      toggle().click();
      await click('.pc-form-actions button', '保存');
      status.setActiveScheme(scopeB, created.id);
      await click('.pc-status-scheme-main', created.name + '固定文字正则');
      toggle().click();
      await click('.pc-form-actions button', '保存');
    }
  }
  return true;
}
