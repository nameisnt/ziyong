import { usePhoneStore } from '@/store/phone';
import { useSettingsStore } from '@/store/settings';
import { useNativePresetGroups } from '@/apps/preset-manager/nativeGroups';
import { readTavernPreset, type TavernPreset } from '@/apps/preset-manager/api';
import { setVisualPromptManager } from '@/testing/sillytavern-openai';
import { resetVisualPhoneRoute, waitForVisualCondition, waitForVisualPaint } from './context';

export async function applyNativePresetVisualScenario(name: string) {
  if (!name.startsWith('preset-native-groups')) return false;
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  };
  const phone = usePhoneStore();
  useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
  const runtime = globalThis as unknown as {
    createPreset: (name: string, preset: TavernPreset) => Promise<boolean>;
    TavernHelper: {
      loadPreset: (name: string) => boolean;
      updatePresetWith: (name: string, update: (preset: TavernPreset) => TavernPreset) => Promise<TavernPreset>;
    };
  };
  const presetName = '__pc_test__原生单选';
  const preset: TavernPreset = {
    extensions: {
      baibaiToolkit: {
        presetPromptGroups: {
          version: 2,
          groups: [{ id: 'view', name: '叙事视角', startPromptId: 'a', endPromptId: 'c', selectionMode: 'single' }],
        },
      },
    },
    prompts: ['第一人称', '第三人称', '旁观者视角', '正文规则'].map((title, index) => ({
      id: 'abcd'[index],
      name: title,
      content: `__pc_test__${title}`,
      role: 'system',
      enabled: index < 2 || index === 3,
    })),
  };
  await runtime.createPreset(presetName, preset);
  runtime.TavernHelper.loadPreset(presetName);
  await useNativePresetGroups().ensureReady();
  resetVisualPhoneRoute('preset-manager', 'detail', '预设条目', { presetName, presetSource: 'tavern' });
  assert(
    await waitForVisualCondition(() => Boolean(document.querySelector('.pc-preset-nodes'))),
    'Preset detail missing',
  );
  document.querySelector<HTMLElement>('.pc-action-menu > summary[aria-label="管理"]')?.click();
  const button = (label: string, root: ParentNode = document) =>
    [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === label);
  button('管理条目分组')?.click();
  assert(
    await waitForVisualCondition(() => Boolean(document.querySelector('.pc-native-grouping'))),
    'Native grouping control missing',
  );
  const toggle = () => document.querySelector<HTMLInputElement>('input[aria-label="应用到酒馆条目开关"]')!;
  assert(!toggle().checked, 'Native grouping must default off');
  toggle().click();
  assert(
    await waitForVisualCondition(() => Boolean(document.querySelector('.pc-native-conflicts'))),
    'Conflict choice missing',
  );
  assert(button('确认开启')?.disabled, 'Must explicitly choose retention');
  button('取消', document.querySelector('.pc-native-conflicts')!)!.click();
  await waitForVisualPaint();
  assert(!toggle().checked, 'Cancel enabled native grouping');
  toggle().click();
  assert(
    await waitForVisualCondition(() => Boolean(document.querySelector('.pc-native-conflicts'))),
    'Conflict retry missing',
  );
  [...document.querySelectorAll<HTMLInputElement>('.pc-native-conflicts input')]
    .find(input => input.value === 'b')!
    .click();
  await waitForVisualPaint();
  if (name.includes('-failure')) {
    const before = JSON.stringify(readTavernPreset(presetName));
    const originalUpdate = runtime.TavernHelper.updatePresetWith;
    let attempted = false;
    runtime.TavernHelper.updatePresetWith = async () => {
      attempted = true;
      throw new Error('__pc_test__保存失败，请重试');
    };
    try {
      button('确认开启')!.click();
      assert(
        await waitForVisualCondition(() => attempted && !toggle().disabled),
        'Failed save did not unlock controls',
      );
      assert(
        !toggle().checked && JSON.stringify(readTavernPreset(presetName)) === before,
        'Failed save changed the preset or reported enabled',
      );
      assert(document.querySelector('.pc-native-conflicts'), 'Failed save discarded retention choices');
    } finally {
      runtime.TavernHelper.updatePresetWith = originalUpdate;
    }
  }
  button('确认开启')!.click();
  assert(await waitForVisualCondition(() => toggle().checked && !toggle().disabled), 'Native flag not saved');
  assert(
    readTavernPreset('in_use')
      .prompts.filter(p => p.enabled)
      .map(p => p.id)
      .join() === 'b,d',
    'Live conflicts not resolved',
  );
  const savedSource = JSON.stringify(readTavernPreset(presetName));
  const host = document.createElement('section');
  const order = readTavernPreset('in_use').prompts.map(p => ({ identifier: p.id, enabled: p.enabled }));
  let renders = 0;
  let saves = 0;
  let finished = Promise.resolve();
  host.innerHTML = order
    .map(
      p =>
        `<div class="completion_prompt_manager_prompt" data-pm-identifier="${p.identifier}"><button class="prompt-manager-toggle-action" type="button">${p.identifier}</button></div>`,
    )
    .join('');
  document.body.append(host);
  setVisualPromptManager({
    activeCharacter: { id: 100000 },
    containerElement: host,
    configuration: { prefix: 'completion_' },
    get serviceSettings() {
      return readTavernPreset('in_use');
    },
    getPromptOrderForCharacter: () => order,
    tokenHandler: { getCounts: () => ({}) },
  });
  host.querySelectorAll('button').forEach(element =>
    element.addEventListener('click', event => {
      const id = (event.target as Element).closest<HTMLElement>('[data-pm-identifier]')!.dataset.pmIdentifier;
      const target = order.find(item => item.identifier === id)!;
      target.enabled = !target.enabled;
      renders += 1;
      saves += 1;
      finished = runtime.TavernHelper.updatePresetWith('in_use', live => {
        live.prompts.forEach(p => {
          p.enabled = order.find(item => item.identifier === p.id)!.enabled;
        });
        return live;
      }).then(() => {});
    }),
  );
  try {
    const click = async (id: string) => {
      host.querySelector<HTMLButtonElement>(`[data-pm-identifier="${id}"] button`)!.click();
      await finished;
    };
    await click('c');
    assert(
      order
        .filter(p => p.enabled)
        .map(p => p.identifier)
        .join() === 'c,d',
      'Native single selection failed',
    );
    await click('c');
    assert(
      order
        .filter(p => p.enabled)
        .map(p => p.identifier)
        .join() === 'd',
      'Native all-off failed',
    );
    await phone.closePhone({ skipConfirm: true });
    await click('a');
    assert(
      order
        .filter(p => p.enabled)
        .map(p => p.identifier)
        .join() === 'a,d',
      'Closed panel stopped native integration',
    );
    assert(saves === 3 && renders === 3, 'Duplicate native render or save');
    assert(JSON.stringify(readTavernPreset(presetName)) === savedSource, 'Native clicks wrote the source preset');
    phone.openPhone();
    phone.clearNotices();
    await waitForVisualPaint();
    toggle().click();
    assert(
      await waitForVisualCondition(() => !toggle().checked && !toggle().disabled),
      'Could not disable native integration',
    );
    await click('b');
    assert(
      order
        .filter(p => p.enabled)
        .map(p => p.identifier)
        .join() === 'a,b,d',
      'Opt-out still enforces single selection',
    );
    toggle().click();
    assert(
      await waitForVisualCondition(() => Boolean(document.querySelector('.pc-native-conflicts'))),
      'Live-only conflict was not detected',
    );
    if (!name.includes('-conflict')) {
      [...document.querySelectorAll<HTMLInputElement>('.pc-native-conflicts input')]
        .find(input => input.value === '')!
        .click();
      await waitForVisualPaint();
      button('确认开启')!.click();
      assert(await waitForVisualCondition(() => toggle().checked && !toggle().disabled), 'All-off retention failed');
    }
    phone.clearNotices();
    await waitForVisualPaint();
    return true;
  } finally {
    setVisualPromptManager(null);
    host.remove();
  }
}
