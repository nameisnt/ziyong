import { zipSync } from 'fflate';
import { encodeJson, type BundleManifest } from '@/resource-bundle/model';
import { readBundle } from '@/resource-bundle/zip';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { useSettingsStore } from '@/store/settings';
import { usePhoneStore } from '@/store/phone';
import { extension_settings } from '@/testing/sillytavern-extensions';
import { resetVisualPhoneRoute, waitForVisualCondition, waitForVisualPaint } from './context';
import { installMemoryFileService } from './memoryFileService';

function button(text: string, root: ParentNode = document) {
  const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent?.trim() === text);
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}
async function expect(fn: () => boolean, message: string) {
  if (!(await waitForVisualCondition(fn, 5000))) throw new Error(message);
}
function preset() {
  return {
    prompts: [{ identifier: 'one', name: '条目', role: 'system', content: 'test' }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'one', enabled: true }] }],
    extensions: {
      regex_scripts: Array.from({ length: 12 }, (_, i) => ({
        id: String(i),
        scriptName: `长名称正则-${i}-用于测试窄屏换行和内部滚动`,
        findRegex: 'x',
        replaceString: 'y',
      })),
      tavern_helper: {
        scripts: [{ id: 's', type: 'script', name: '附带脚本', content: 'console.log(1)', enabled: true }],
      },
    },
  };
}
export async function applyResourceBundleScenario(name: string) {
  if (!name.startsWith('resource-bundle-')) return false;
  const kind = name.includes('worldbook') ? 'worldbook' : name.includes('character') ? 'character' : 'preset';
  const importing = name.includes('-import');
  useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
  installMemoryFileService();
  const store = usePluginPresetStore();
  await store.whenReady();
  const runtime = globalThis as unknown as Record<string, unknown>;
  const raw = preset();
  (extension_settings as Record<string, unknown>).regex = raw.extensions.regex_scripts;
  if (importing) {
    resetVisualPhoneRoute(
      kind === 'preset' ? 'preset-manager' : kind === 'worldbook' ? 'worldbook-link' : 'archive',
      'root',
      '组合包测试',
    );
    await expect(
      () => [...document.querySelectorAll('button')].some(el => el.textContent?.trim() === '组合导入' && !el.disabled),
      'Import entrance missing',
    );
    button('组合导入').click();
    await expect(() => Boolean(document.querySelector('.pc-bundle-dialog input[type=file]')), 'Import dialog missing');
    const manifest: BundleManifest = {
      format: 'phone-resource-bundle',
      version: 1,
      pluginVersion: '1',
      kind,
      name: '组合测试',
      items: [
        {
          id: '0',
          kind,
          name: '组合测试',
          path: `resources/0.${kind === 'character' ? 'png' : 'json'}`,
          ...(kind === 'preset' ? { presetSource: 'plugin' as const } : {}),
        },
      ],
    };
    const files: Record<string, Uint8Array> = {
      [manifest.items[0]!.path]:
        kind === 'character'
          ? new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
          : encodeJson(kind === 'preset' ? { ...raw, extensions: {} } : { entries: {} }),
    };
    for (let i = 1; i <= 12; i++) {
      const chat = kind === 'character';
      const path = `resources/${i}.${chat ? 'jsonl' : 'json'}`;
      manifest.items.push({
        id: String(i),
        parentId: '0',
        kind: chat ? 'chat' : 'regex',
        name: `附件-${i}-长名称滚动测试`,
        path,
      });
      files[path] = chat
        ? new TextEncoder().encode('{"user_name":"u","chat_metadata":{}}\n{"mes":"test"}')
        : encodeJson(raw.extensions.regex_scripts[i - 1]);
    }
    files['manifest.json'] = encodeJson(manifest);
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(zipSync(files))], 'bundle.zip', { type: 'application/zip' }));
    const input = document.querySelector<HTMLInputElement>('.pc-bundle-dialog input[type=file]')!;
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await expect(() => document.querySelectorAll('.pc-bundle-row').length === 13, 'Import preview incomplete');
    if (kind === 'preset') {
      await expect(() => !button('导入所选').disabled, 'Import button remains disabled');
      button('导入所选').click();
      await expect(
        () => Boolean(document.querySelector('.pc-phone-notice-action[data-role="danger"]')),
        'Import confirmation missing',
      );
      document.querySelector<HTMLButtonElement>('.pc-phone-notice-action[data-role="danger"]')!.click();
      await expect(
        () => Boolean(document.querySelector('.pc-bundle-dialog')?.textContent?.includes('成功 13')),
        'Import did not complete',
      );
      if (store.items.filter(item => item.name === '组合测试').length !== 1)
        throw new Error('Preset not imported once');
    }
  } else if (kind === 'preset') {
    const item = await store.importPreset(raw, '组合导出测试.json');
    resetVisualPhoneRoute('preset-manager', 'detail', '预设条目', { presetSource: 'plugin', presetId: item.id });
  } else if (kind === 'worldbook') {
    runtime.loadWorldInfo = async () => ({ entries: {} });
    resetVisualPhoneRoute('worldbook-link', 'detail', '世界书', { bookName: '视觉世界书' });
  } else {
    resetVisualPhoneRoute('archive', 'root', '聊天档案');
  }
  if (!importing) {
    await expect(
      () =>
        [...document.querySelectorAll('button')].some(
          el => el.textContent?.trim() === '组合导出' && !(el as HTMLButtonElement).disabled,
        ),
      'Export entrance missing',
    );
    button('组合导出').click();
    await expect(() => document.querySelectorAll('.pc-bundle-row').length > 1, 'Export selection missing');
    const checkboxes = [...document.querySelectorAll<HTMLInputElement>('.pc-bundle-scroll input[type=checkbox]')];
    if (checkboxes.slice(1).some(el => el.checked !== (kind === 'preset')))
      throw new Error('Attachment defaults incorrect');
    button('全选', document.querySelector('.pc-bundle-dialog')!).click();
    await waitForVisualPaint();
    if (
      [...document.querySelectorAll<HTMLInputElement>('.pc-bundle-scroll input[type=checkbox]')].some(el => !el.checked)
    )
      throw new Error('Select all did not work');
    button('取消全选', document.querySelector('.pc-bundle-dialog')!).click();
    await waitForVisualPaint();
    if (!document.querySelector<HTMLInputElement>('.pc-bundle-scroll input[type=checkbox]')!.checked)
      throw new Error('Main resource unselected');
    if (kind === 'preset' || kind === 'worldbook') {
      let download: Blob | null = null;
      const createUrl = URL.createObjectURL;
      URL.createObjectURL = value => {
        if (value instanceof Blob && value.type === 'application/zip') download = value;
        return createUrl(value);
      };
      try {
        button('导出组合包').click();
        await expect(() => Boolean(download), 'ZIP download was not created');
        const exported = await readBundle(new File([download!], 'export.zip'));
        if (exported.manifest.items.some(item => item.kind === 'regex'))
          throw new Error('Unselected regex leaked into export');
        if (exported.manifest.kind !== kind) throw new Error('Wrong export kind');
      } finally {
        URL.createObjectURL = createUrl;
      }
    }
  }
  const scroll = document.querySelector<HTMLElement>('.pc-bundle-scroll')!;
  const phone = usePhoneStore();
  phone.notices.forEach(notice => phone.dismissNotice(notice.id));
  scroll.scrollTop = scroll.scrollHeight;
  await waitForVisualPaint();
  if (scroll.scrollHeight > scroll.clientHeight && !scroll.scrollTop) throw new Error('Internal scrolling failed');
  scroll.scrollTop = 0;
  await waitForVisualPaint();
  return true;
}
