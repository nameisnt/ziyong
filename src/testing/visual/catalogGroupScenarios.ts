import { useSettingsStore } from '@/store/settings';
import { usePhoneStore } from '@/store/phone';
import { usePresetCatalogGroupStore } from '@/store/presetCatalogGroups';
import { useWorldbookCatalogGroupStore } from '@/store/worldbookCatalogGroups';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { installMemoryFileService } from './memoryFileService';
import { resetVisualPhoneRoute, waitForVisualCondition, waitForVisualPaint } from './context';

function button(label: string, root: ParentNode = document) {
  const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent?.trim() === label);
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}
function input(selector: string, value: string) {
  const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!el) throw new Error(`Missing input: ${selector}`);
  el.value = value;
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}
async function expect(condition: () => boolean, message: string) {
  if (!(await waitForVisualCondition(condition, 2500))) throw new Error(message);
}

export async function applyCatalogGroupScenario(name: string) {
  if (!name.startsWith('catalog-groups-')) return false;
  const preset = !name.includes('worldbook');
  const plugin = name.includes('plugin');
  const phone = usePhoneStore();
  useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
  const rootSelector = preset ? '.pc-preset-page' : '.pc-worldbook-catalog-page';
  const runtime = globalThis as unknown as Record<string, unknown>;
  const originalChar = runtime.getCharWorldbookNames;
  const originalChat = runtime.getChatWorldbookName;
  if (!preset) {
    runtime.getCharWorldbookNames = () => ({ primary: '', additional: [] });
    runtime.getChatWorldbookName = () => null;
  }
  try {
    if (plugin) {
      installMemoryFileService();
      const store = usePluginPresetStore();
      await store.whenReady();
      for (const suffix of ['A', 'B'])
        await store.importPreset(
          { prompts: [{ id: 'test', name: 'Test', role: 'system', content: 'Test', enabled: true }] },
          `分组测试 ${suffix}.json`,
        );
    }
    resetVisualPhoneRoute(preset ? 'preset-manager' : 'worldbook-link', 'root', preset ? '预设管理' : '世界书联动');
    await expect(() => Boolean(document.querySelector(rootSelector)), 'Catalog not loaded');
    if (preset) button(plugin ? '插件预设' : '酒馆预设').click();
    await expect(() => document.querySelectorAll(`${rootSelector} .pc-list-row`).length > 0, 'Catalog has no fixtures');
    const catalog = () => document.querySelector(rootSelector)!;
    const groupName = `目录空组-${name}`;
    const newName = `批量目标-${name}`;
    const presetStore = usePresetCatalogGroupStore();
    const worldStore = useWorldbookCatalogGroupStore();
    const groupOf = (id: string) =>
      preset ? presetStore.groupOf(plugin ? 'plugin' : 'tavern', id) : worldStore.bookGroupOf(id);
    document.querySelector<HTMLButtonElement>(`[aria-label="${preset ? '新建预设分组' : '新建世界书分组'}"]`)!.click();
    await expect(() => Boolean(document.querySelector('.pc-phone-notice-input')), 'Create prompt missing');
    input('.pc-phone-notice-input', groupName);
    document.querySelector<HTMLButtonElement>('.pc-phone-notice-action[data-role="primary"]')!.click();
    await expect(
      () => Boolean(catalog().querySelector(`[data-catalog-group="${groupName}"]`)),
      'Empty created group is hidden',
    );
    const start = async () => {
      if (preset) {
        catalog().querySelector<HTMLElement>('summary[aria-label="管理预设"]')!.click();
        button('批量分组', catalog()).click();
      } else catalog().querySelector<HTMLButtonElement>('[aria-label="批量分组"]')!.click();
      await expect(() => Boolean(catalog().querySelector('.pc-bulk-selection-bar')), 'Bulk bar missing');
      button('全选', catalog().querySelector('.pc-bulk-selection-bar')!).click();
      await waitForVisualPaint();
      if (preset && !plugin && !catalog().querySelector<HTMLInputElement>('.current input[type="checkbox"]')?.checked)
        throw new Error('Current preset cannot be grouped');
      button('移入分组', catalog().querySelector('.pc-bulk-selection-bar')!).click();
      await expect(() => Boolean(document.querySelector('.pc-catalog-group-dialog')), 'Group picker missing');
    };
    await start();
    button('取消', document.querySelector('.pc-catalog-group-dialog')!).click();
    await waitForVisualPaint();
    if (!catalog().querySelector('.pc-bulk-selection-bar')) throw new Error('Cancel lost bulk selection');
    button('移入分组', catalog().querySelector('.pc-bulk-selection-bar')!).click();
    await waitForVisualPaint();
    document.querySelector<HTMLButtonElement>('.pc-catalog-group-dialog [aria-label="新建分组"]')!.click();
    await waitForVisualPaint();
    if (!document.querySelector<HTMLButtonElement>('.pc-catalog-group-dialog .pc-primary-btn')!.disabled)
      throw new Error('Blank group accepted');
    input('.pc-catalog-group-dialog input', groupName);
    await waitForVisualPaint();
    if (!document.querySelector<HTMLButtonElement>('.pc-catalog-group-dialog .pc-primary-btn')!.disabled)
      throw new Error('Duplicate group accepted');
    input('.pc-catalog-group-dialog input', newName);
    await waitForVisualPaint();
    const names = [...catalog().querySelectorAll('.pc-list-row strong')].map(el => {
      const label = el.textContent!.trim();
      return plugin ? usePluginPresetStore().items.find(item => item.name === label)!.id : label;
    });
    const beforeEnabled = (runtime.getGlobalWorldbookNames as () => string[])?.();
    button('移入分组', document.querySelector('.pc-catalog-group-dialog')!).click();
    await expect(() => !document.querySelector('.pc-catalog-group-dialog'), 'Picker did not close');
    if (!names.every(id => groupOf(id) === newName)) throw new Error('Bulk assignment did not persist');
    if (JSON.stringify(beforeEnabled) !== JSON.stringify((runtime.getGlobalWorldbookNames as () => string[])?.()))
      throw new Error('Grouping changed enabled books');
    input(`${rootSelector} input[type="search"]`, newName);
    await waitForVisualPaint();
    if (catalog().querySelectorAll('.pc-list-row').length !== names.length)
      throw new Error('Group-name search omitted members');
    await start();
    input('.pc-catalog-group-dialog select', '');
    button('移入分组', document.querySelector('.pc-catalog-group-dialog')!).click();
    await expect(() => names.every(id => groupOf(id) === ''), 'Move to ungrouped failed');
    await waitForVisualPaint();
    if (!catalog().querySelector(`[data-catalog-group="${newName}"]`))
      throw new Error('Empty group disappeared after moving out');
    await start();
    if (preset) button(plugin ? '酒馆预设' : '插件预设').click();
    else document.querySelector<HTMLButtonElement>('.pc-worldbook-tabs button:not(.active)')!.click();
    await waitForVisualPaint();
    if (document.querySelector('.pc-catalog-group-dialog') || catalog().querySelector('.pc-bulk-selection-bar'))
      throw new Error('Source/category switch retained group request');
    if (preset) button(plugin ? '插件预设' : '酒馆预设').click();
    else document.querySelector<HTMLButtonElement>('.pc-worldbook-tabs button')!.click();
    await waitForVisualPaint();
    // Leave the real picker visible for narrow-screen and theme screenshots.
    await start();
    phone.notices.slice().forEach(notice => phone.dismissNotice(notice.id));
  } finally {
    runtime.getCharWorldbookNames = originalChar;
    runtime.getChatWorldbookName = originalChat;
  }
  return true;
}
