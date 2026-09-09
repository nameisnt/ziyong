import { usePresetLinkStore } from '@/apps/preset-link/store';
import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import type { TavernPreset } from '@/apps/preset-manager/api';

type Context = {
  resetPhoneToRoute: (appId: string, page: string, title: string) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

export async function applyPresetBindingVisualScenario(name: string, context: Context) {
  if (!name.startsWith('preset-binding-switches')) return false;
  const { resetPhoneToRoute, waitForCondition, waitForPaint } = context;
  const runtime = globalThis as unknown as {
    createPreset: (name: string, preset: TavernPreset) => Promise<boolean>;
    TavernHelper: { loadPreset: (name: string) => boolean; getPreset: (name: string) => TavernPreset };
  };
  const presetName = '独立开关测试';
  const fixture: TavernPreset = {
    extensions: {
      baibaiToolkit: {
        presetPromptGroups: {
          version: 2,
          groups: [
            {
              id: 'perspective',
              name: '叙事视角',
              startPromptId: 'first',
              endPromptId: 'third',
              enabled: true,
              collapsed: false,
              selectionMode: 'single',
            },
          ],
        },
      },
    },
    prompts: [
      { id: 'first', name: '第一人称', enabled: true, role: 'system' },
      { id: 'third', name: '第三人称', enabled: false, role: 'system' },
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `rule-${i}`,
        name: `正文规则 ${i + 1}：较长的条目名称用于检查换行`,
        enabled: true,
        role: 'system' as const,
      })),
    ],
  };
  await runtime.createPreset(presetName, fixture);
  await runtime.createPreset('未加载的测试预设', fixture);
  runtime.TavernHelper.loadPreset(presetName);
  const original = JSON.stringify(runtime.TavernHelper.getPreset(presetName));
  const links = usePresetLinkStore();
  links.settings.bindings = {};
  delete links.settings.activePromptOverride;
  useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
  resetPhoneToRoute('preset-link', 'root', '预设绑定');
  if (!(await waitForCondition(() => Boolean(document.querySelector('.pc-binding-switches')))))
    throw new Error('Binding switch editor missing');
  let details = document.querySelector<HTMLElement>('.pc-binding-switches')!;
  const button = (label: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('.pc-preset-link-app button')].find(
      b => b.textContent?.trim() === label,
    );
  const input = (label: string) => details.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  if (!input('绑定条目开关').checked || !input('第一人称').checked)
    throw new Error('New bindings must display source switches by default');
  const search = input('搜索条目或分组');
  const setSearch = async (value: string) => {
    search.value = value;
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
  };
  details.querySelector<HTMLButtonElement>('.pc-binding-group-head')!.click();
  await waitForPaint();
  if (input('第一人称')) throw new Error('Group did not collapse');
  await setSearch('第三人称');
  if (input('第一人称') || !input('第三人称')) throw new Error('Search did not reveal matching collapsed entry');
  details.querySelector<HTMLButtonElement>('.pc-binding-group-head')!.click();
  await waitForPaint();
  if (search.value || input('第三人称')) throw new Error('Search-expanded group did not collapse');
  await setSearch('第三人称');
  await waitForPaint();
  const third = details.querySelector<HTMLInputElement>('input[aria-label="第三人称"]')!;
  third.click();
  await setSearch('');
  details.querySelector<HTMLButtonElement>('.pc-binding-group-head')!.click();
  await waitForPaint();
  if (details.querySelector<HTMLInputElement>('input[aria-label="第一人称"]')!.checked || !third.checked)
    throw new Error('Single-select switches did not update');
  if (!document.querySelector('.pc-preset-link-status')?.textContent?.includes('未保存'))
    throw new Error('Missing unsaved indicator');
  document.querySelector<HTMLButtonElement>('button[aria-label="刷新预设列表"]')!.click();
  await waitForPaint();
  if (!input('第三人称').checked) throw new Error('Refreshing presets discarded draft');
  button('保存绑定')!.click();
  await waitForPaint();
  if (links.getBinding(usePhoneStore().viewingScopeKey)?.promptStates?.third !== true)
    throw new Error('Binding switch save failed');
  if (Object.keys(links.getBinding(usePhoneStore().viewingScopeKey)?.promptStates || {}).length !== 10)
    throw new Error('Search discarded hidden entries');
  button('立即应用')!.click();
  if (!(await waitForCondition(() => runtime.TavernHelper.getPreset('in_use').prompts[1]?.enabled === true)))
    throw new Error('Live preset switches not applied');
  if (JSON.stringify(runtime.TavernHelper.getPreset(presetName)) !== original) throw new Error('Source preset changed');
  await waitForPaint();
  details.querySelector<HTMLInputElement>('input[aria-label="第一人称"]')!.click();
  await waitForPaint();
  button('立即应用')!.click();
  if (!(await waitForCondition(() => runtime.TavernHelper.getPreset('in_use').prompts[0]?.enabled === true)))
    throw new Error('Unsaved switches did not apply');
  await waitForPaint();
  if (
    !details.querySelector<HTMLInputElement>('input[aria-label="第一人称"]')!.checked ||
    links.getBinding(usePhoneStore().viewingScopeKey)?.promptStates?.third !== true
  )
    throw new Error('Temporary apply overwrote editor or saved binding');
  await usePhoneStore().syncCurrentTavernScope(true, true);
  if (!runtime.TavernHelper.getPreset('in_use').prompts[0]?.enabled)
    throw new Error('Same-chat synchronization reset temporary switches');
  details.querySelector<HTMLInputElement>('input[aria-label="绑定条目开关"]')!.click();
  await waitForPaint();
  if (!input('第一人称').disabled || !details.querySelector('.pc-binding-switch-list'))
    throw new Error('Disabled binding must retain read-only list');
  button('更新绑定')!.click();
  await waitForPaint();
  button('立即应用')!.click();
  if (
    !(await waitForCondition(
      () =>
        runtime.TavernHelper.getPreset('in_use').prompts[0]?.enabled === true &&
        !runtime.TavernHelper.getPreset('in_use').prompts[1]?.enabled,
    ))
  )
    throw new Error('Disabling binding did not restore original switches');
  await waitForPaint();
  const phone = usePhoneStore();
  await phone.goHome();
  await phone.openApp('preset-link');
  await waitForPaint();
  details = document.querySelector<HTMLElement>('.pc-binding-switches')!;
  if (!(await waitForCondition(() => !input('绑定条目开关').disabled)))
    throw new Error('Binding editor remained busy after returning');
  if (input('绑定条目开关').checked) throw new Error('Legacy binding unexpectedly enabled switches');
  input('绑定条目开关').click();
  await waitForPaint();
  if (!input('绑定条目开关').checked) throw new Error('Enabling legacy binding failed');
  details.querySelector<HTMLElement>('summary[aria-label="条目开关操作"]')!.click();
  button('读取酒馆当前开关')!.click();
  await waitForPaint();
  const list = details.querySelector<HTMLElement>('.pc-binding-switch-list')!;
  list.scrollTop = 100;
  if (list.scrollTop === 0) throw new Error('Switch list cannot scroll');
  list.scrollTop = 0;
  phone.clearNotices();
  const leaving = phone.goHome();
  if (!(await waitForCondition(() => phone.notices.some(n => n.title === '未保存的绑定'))))
    throw new Error(
      `Missing dirty navigation confirmation: ${phone.currentRoute.appId}; ${details.isConnected}; ${document.querySelector('.pc-preset-link-status')?.textContent}`,
    );
  phone.dismissNotice(phone.notices.find(n => n.title === '未保存的绑定')!.id, false);
  await leaving;
  if (phone.currentRoute.appId !== 'preset-link') throw new Error('Cancel discarded editor');

  const selectOther = async () => {
    const combo = document.querySelector<HTMLInputElement>('.pc-preset-link-app input[role="combobox"]')!;
    combo.click();
    combo.value = '未加载的测试预设';
    combo.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForPaint();
    document.querySelector<HTMLButtonElement>('.pc-preset-link-app [role="option"]')!.click();
    await waitForPaint();
  };
  await selectOther();
  phone.dismissNotice(phone.notices.find(n => n.title === '未保存的绑定')!.id, false);
  await waitForPaint();
  if (document.querySelector<HTMLInputElement>('.pc-preset-link-app input[role="combobox"]')!.value !== presetName)
    throw new Error('Cancelled preset selection left incorrect label');
  await selectOther();
  phone.dismissNotice(phone.notices.find(n => n.title === '未保存的绑定')!.id, true);
  await waitForPaint();
  if (!input('第一人称').checked || !input('绑定条目开关').checked || !button('读取酒馆当前开关')!.disabled)
    throw new Error('Unloaded preset did not use independent source defaults');
  button('更新绑定')!.click();
  await waitForPaint();
  if (links.getBinding(phone.viewingScopeKey)?.presetName !== '未加载的测试预设')
    throw new Error('Unloaded preset binding failed');
  const liveBeforeNavigation = JSON.stringify(runtime.TavernHelper.getPreset('in_use'));
  await phone.goHome();
  phone.openApp('preset-link');
  await waitForPaint();
  await links.switchScope(phone.viewingScopeKey);
  if (JSON.stringify(runtime.TavernHelper.getPreset('in_use')) !== liveBeforeNavigation)
    throw new Error('Opening binding settings applied a saved preset without explicit Apply');
  if (JSON.stringify(runtime.TavernHelper.getPreset(presetName)) !== original) throw new Error('Source preset changed');
  phone.clearNotices();
  document.querySelector<HTMLElement>('.pc-phone-body')?.scrollTo(0, 0);
  return true;
}
