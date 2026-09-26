import { zipSync } from 'fflate';
import { encodeJson, type BundleManifest } from '@/resource-bundle/model';
import { readBundle } from '@/resource-bundle/zip';
import { usePluginPresetStore } from '@/store/pluginPresets';
import { useSettingsStore } from '@/store/settings';
import { usePhoneStore } from '@/store/phone';
import { characters } from '@/testing/sillytavern-script';
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
async function confirm() {
  await expect(
    () => Boolean(document.querySelector('.pc-phone-notice-action[data-role="danger"]')),
    'Missing confirmation',
  );
  document.querySelector<HTMLButtonElement>('.pc-phone-notice-action[data-role="danger"]')!.click();
}
function preset() {
  return {
    prompts: [{ identifier: 'one', name: '条目', role: 'system', content: 'test' }],
    prompt_order: [{ character_id: 100001, order: [{ identifier: 'one', enabled: true }] }],
    extensions: {
      regex_scripts: [{ id: 'r', scriptName: '共享正则', findRegex: 'x', replaceString: 'y' }],
      tavern_helper: {
        scripts: [{ id: 's', type: 'script', name: '附带脚本', content: 'console.log(1)', enabled: true }],
      },
    },
  };
}
export async function applyResourceBundleScenario(name: string) {
  if (!name.startsWith('resource-bundle-')) return false;
  useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
  installMemoryFileService();
  const store = usePluginPresetStore();
  await store.whenReady();
  const raw = preset();
  await store.importPreset(raw, '插件预设组合测试.json');
  (extension_settings as Record<string, unknown>).regex = raw.extensions.regex_scripts;
  characters.splice(0, characters.length, { avatar: 'one.png', name: '角色一' }, { avatar: 'two.png', name: '角色二' });
  const runtime = globalThis as unknown as Record<string, unknown>;
  const books = Array.from({ length: 12 }, (_, i) => `世界书-${i}-长名称换行与内部滚动测试`);
  runtime.getPresetManager = () => ({
    getPresetList: () => ({ presets: [raw], preset_names: { 酒馆预设: 0 } }),
    getCompletionPresetByName: () => raw,
  });
  runtime.getWorldbookNames = () => books;
  runtime.loadWorldInfo = async () => ({ entries: {} });
  runtime.updateWorldInfoList = async () => {};
  const originalFetch = globalThis.fetch;
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const chatTargets: string[] = [];
  const themes: Record<string, unknown>[] = [{ name: '纸页 UI 主题', custom_css: 'body { color: #345; }' }];
  let cardImports = 0,
    worldAttempts = 0;
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    if (path === '/api/settings/get') return Response.json({ themes });
    if (path === '/api/themes/save') {
      themes.push(JSON.parse(String(init!.body)));
      return Response.json({ ok: true });
    }
    if (path === '/api/characters/export') return new Response(png);
    if (path === '/api/chats/export')
      return Response.json({ result: '{"user_name":"u","chat_metadata":{}}\n{"mes":"test"}' });
    if (path === '/api/characters/import') {
      const file_name = `bundle-import-${++cardImports}`;
      characters.push({ avatar: `${file_name}.png`, name: `Imported ${cardImports}` });
      return Response.json({ file_name });
    }
    if (path === '/api/chats/get') return Response.json({});
    if (path === '/api/chats/import') {
      chatTargets.push(String((init!.body as FormData).get('avatar_url')));
      return Response.json({ fileNames: ['imported.jsonl'] });
    }
    if (path === '/api/chats/rename') return Response.json({ ok: true });
    if (path === '/api/worldinfo/import') {
      if (++worldAttempts === 1) return new Response('测试失败：可重试', { status: 500 });
      books.push('导入世界书');
      return Response.json({ name: '导入世界书' });
    }
    return originalFetch(input, init);
  };
  resetVisualPhoneRoute('resource-bundle', 'root', '组合导出');
  await expect(() => document.querySelectorAll('.pc-bundle-entry').length >= 17, 'Standalone catalog missing');
  if (!button('导出所选').disabled) throw new Error('Empty selection can be exported');
  const search = document.querySelector<HTMLInputElement>('.pc-bundle-app > .pc-search-field input')!;
  search.value = 'no-matches-unique';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  await expect(() => !document.querySelector('.pc-bundle-entry'), 'Search did not filter');
  search.value = '';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  await expect(() => document.querySelectorAll('.pc-bundle-entry').length >= 17, 'Search reset failed');
  document.querySelector<HTMLButtonElement>('.pc-bundle-app button[aria-label="刷新目录"]')!.click();
  await waitForVisualPaint();
  await expect(
    () => !document.querySelector<HTMLButtonElement>('.pc-bundle-app button[aria-label="刷新目录"]')!.disabled,
    'Refresh stuck',
  );
  try {
    if (name.includes('-import')) {
      button('导入组合包').click();
      await expect(
        () => Boolean(document.querySelector('.pc-bundle-dialog input[type=file]')),
        'Import dialog missing',
      );
      const manifest: BundleManifest = {
        format: 'phone-resource-bundle',
        version: 1,
        pluginVersion: 'test',
        kind: 'mixed',
        name: '混合测试',
        items: [
          { id: '0', kind: 'character', name: '导入角色一', path: 'resources/0.png' },
          { id: '1', kind: 'character', name: '导入角色二', path: 'resources/1.png' },
          { id: '2', kind: 'preset', name: '导入预设', path: 'resources/2.json', presetSource: 'plugin' },
          { id: '3', kind: 'regex', name: '随预设正则', path: 'resources/3.json', parentId: '2' },
          { id: '4', kind: 'script', name: '随预设脚本', path: 'resources/4.json', parentId: '2' },
          { id: '5', kind: 'worldbook', name: '导入世界书', path: 'resources/5.json' },
          { id: '18', kind: 'theme', name: '导入 UI 主题', path: 'resources/18.json' },
        ],
      };
      const files: Record<string, Uint8Array> = {
        'resources/0.png': png,
        'resources/1.png': png,
        'resources/2.json': encodeJson({ ...raw, extensions: {} }),
        'resources/3.json': encodeJson(raw.extensions.regex_scripts[0]),
        'resources/4.json': encodeJson(raw.extensions.tavern_helper.scripts[0]),
        'resources/5.json': encodeJson({ entries: {} }),
        'resources/18.json': encodeJson({
          name: '导入 UI 主题',
          custom_css: '@import url("https://example.com/theme.css");',
        }),
      };
      for (let i = 6; i < 18; i++) {
        const path = `resources/${i}.jsonl`;
        manifest.items.push({
          id: String(i),
          kind: 'chat',
          name: `记录-${i}-长名称滚动测试`,
          path,
          parentId: i % 2 ? '1' : '0',
        });
        files[path] = new TextEncoder().encode('{"user_name":"u","chat_metadata":{}}\n{"mes":"test"}');
      }
      files['manifest.json'] = encodeJson(manifest);
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(zipSync(files))], 'bundle.zip'));
      const input = document.querySelector<HTMLInputElement>('.pc-bundle-dialog input[type=file]')!;
      const invalid = new DataTransfer();
      invalid.items.add(new File(['invalid zip'], 'broken.zip'));
      input.files = invalid.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await expect(() => Boolean(document.querySelector('.pc-bundle-error')), 'Malformed ZIP error missing');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await expect(() => document.querySelectorAll('.pc-bundle-row').length === 17, 'Mixed import preview incomplete');
      const cardRows = [...document.querySelectorAll('.pc-bundle-row')].filter(row =>
        row.querySelector('.pc-field-group'),
      );
      const target = cardRows[0]!.querySelector<HTMLSelectElement>('select')!;
      target.value = 'one.png';
      target.dispatchEvent(new Event('change', { bubbles: true }));
      await waitForVisualPaint();
      await expect(() => !button('导入所选').disabled, 'Existing target selection stuck');
      if (cardRows[0]!.querySelector<HTMLInputElement>('input')!.checked)
        throw new Error('Existing target imports duplicate card');
      if (cardRows[1]!.querySelector<HTMLSelectElement>('select')!.value) throw new Error('Other card target changed');
      target.value = '';
      target.dispatchEvent(new Event('change', { bubbles: true }));
      await waitForVisualPaint();
      await expect(() => !button('导入所选').disabled, 'New-card target reset stuck');
      button('导入所选').click();
      await expect(
        () => Boolean(document.querySelector('.pc-phone-notice')?.textContent?.includes('@import')),
        'External theme warning missing',
      );
      await confirm();
      await expect(
        () => Boolean(document.querySelector('.pc-bundle-dialog')?.textContent?.includes('失败 1')),
        'Failed import not reported',
      );
      if (
        cardImports !== 2 ||
        chatTargets.filter(v => v === 'bundle-import-1.png').length !== 6 ||
        chatTargets.filter(v => v === 'bundle-import-2.png').length !== 6
      )
        throw new Error('Chat ownership crossed');
      button('重试失败项').click();
      await expect(
        () => Boolean(document.querySelector('.pc-bundle-dialog')?.textContent?.includes('成功 19')),
        'Retry failed',
      );
      if (cardImports !== 2 || chatTargets.length !== 12) throw new Error('Retry duplicated successful resources');
      if (themes.length !== 2 || !document.querySelector('.pc-bundle-dialog')?.textContent?.includes('请刷新酒馆'))
        throw new Error('Theme import or refresh feedback missing');
      const imported = store.items.find(item => item.name === '导入预设');
      if (!imported) throw new Error('Preset not imported');
      const data = store.exportPreset(imported.id) as ReturnType<typeof preset>;
      if (data.extensions.tavern_helper.scripts[0]!.enabled !== false) throw new Error('Script enabled unexpectedly');
      button('关闭', document.querySelector('.pc-bundle-dialog')!).click();
      await expect(() => !document.querySelector('.pc-bundle-dialog'), 'Import dialog did not close');
      button('导入组合包').click();
      await expect(() => Boolean(document.querySelector('.pc-bundle-dialog input[type=file]')), 'Reopen failed');
      const native = new DataTransfer();
      native.items.add(
        new File([JSON.stringify({ name: '原生主题', custom_css: 'body { color: #123; }' })], 'native.json'),
      );
      const nativeInput = document.querySelector<HTMLInputElement>('.pc-bundle-dialog input[type=file]')!;
      nativeInput.files = native.files;
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
      await expect(() => document.querySelectorAll('.pc-bundle-row').length === 1, 'Native JSON preview missing');
      button('导入所选').click();
      await confirm();
      await expect(
        () => Boolean(document.querySelector('.pc-bundle-dialog')?.textContent?.includes('成功 1')),
        'Native JSON import failed',
      );
      if (themes.length !== 3) throw new Error('Native theme was not saved exactly once');
    } else {
      const footer = document.querySelector('.pc-bundle-app > footer')!;
      const characterGroup = document.querySelector('.pc-bundle-group')!;
      const missingCharacter = characters.pop()!;
      button('全选', characterGroup).click();
      await expect(
        () => Boolean(document.querySelector('.pc-bundle-error')?.textContent?.includes('角色卡不存在')),
        'Missing character directory failure was not reported',
      );
      await expect(() => !button('全选', characterGroup).disabled, 'Failed selection remained busy');
      characters.push(missingCharacter);
      button('全选', characterGroup).click();
      await waitForVisualPaint();
      await expect(() => !button('全选', characterGroup).disabled, 'Collapsed character selection stuck');
      if (document.querySelector('.pc-bundle-error')) throw new Error('Retry did not clear selection error');
      if (document.querySelector('.pc-bundle-chat')) throw new Error('Select-all unexpectedly expanded chats');
      const expand = document.querySelector<HTMLButtonElement>('.pc-bundle-entry button[aria-expanded]')!;
      expand.click();
      await expect(() => document.querySelectorAll('.pc-bundle-chat').length === 3, 'Chat expansion failed');
      if (document.querySelectorAll('.pc-bundle-chat input:checked').length !== 3)
        throw new Error('Character select-all omitted unloaded chats');
      button('取消全选', characterGroup).click();
      await waitForVisualPaint();
      if ([...document.querySelectorAll<HTMLInputElement>('.pc-bundle-chat input')].some(input => input.checked))
        throw new Error('Character deselection retained chats');
      button('全选聊天').click();
      await waitForVisualPaint();
      button('取消聊天').click();
      await waitForVisualPaint();
      const groups = [...document.querySelectorAll('.pc-bundle-group')];
      for (const group of groups) {
        button('全选', group).click();
        await waitForVisualPaint();
        await expect(() => !button('全选', group).disabled, 'Group selection remained busy');
      }
      let download: Blob | null = null;
      let nativeDownload: Blob | null = null;
      const originalUrl = URL.createObjectURL;
      URL.createObjectURL = value => {
        if (value instanceof Blob && value.type === 'application/zip') download = value;
        if (value instanceof Blob && value.type === 'application/json') nativeDownload = value;
        return originalUrl(value);
      };
      try {
        document.querySelector<HTMLButtonElement>('.pc-bundle-app button[title="导出原生主题 JSON"]')!.click();
        await expect(() => Boolean(nativeDownload), 'Native theme export button failed');
        const native = JSON.parse(await nativeDownload!.text());
        if (native.name !== themes[0]!.name || native.custom_css !== themes[0]!.custom_css)
          throw new Error('Native theme export changed saved settings');
        button('导出所选', footer).click();
        await expect(() => Boolean(download), 'Character select-all download missing');
        const bulk = await readBundle(new File([download!], 'bulk.zip'));
        if (bulk.manifest.items.filter(item => item.kind === 'theme').length !== 1)
          throw new Error('UI theme missing from export');
        if (bulk.manifest.items.filter(item => item.kind === 'chat').length !== 6)
          throw new Error('Character select-all omitted collapsed chats from export');
        await expect(() => !button('导出所选', footer).disabled, 'Bulk export remained busy');
        button('取消全选', characterGroup).click();
        await waitForVisualPaint();
        document.querySelector<HTMLInputElement>('.pc-bundle-chat input')!.click();
        await waitForVisualPaint();
        download = null;
        button('导出所选', footer).click();
        await expect(() => Boolean(download), 'Selected download missing');
        const selected = await readBundle(new File([download!], 'selected.zip'));
        if (
          selected.manifest.kind !== 'mixed' ||
          selected.manifest.items.filter(item => item.kind === 'chat').length !== 1
        )
          throw new Error('Selected chat filtering failed');
        if (selected.manifest.items.filter(item => item.kind === 'script').length !== 2)
          throw new Error('Preset attachments missing');
        const regexPaths = selected.manifest.items.filter(item => item.kind === 'regex').map(item => item.path);
        if (regexPaths.length !== 3 || new Set(regexPaths).size !== 1)
          throw new Error('Shared regex payload not deduplicated');
        await expect(() => !button('导出全部', footer).disabled, 'Export remained busy');
        download = null;
        button('导出全部', footer).click();
        await expect(
          () => Boolean(document.querySelector('.pc-phone-notice-action[data-role="danger"]')),
          'Export-all confirmation missing',
        );
        button(
          '取消',
          document.querySelector('.pc-phone-notice-action[data-role="danger"]')!.closest('.pc-phone-notice')!,
        ).click();
        await expect(() => !button('导出全部', footer).disabled, 'Cancelled export remains busy');
        if (download) throw new Error('Cancelled export still downloaded');
        if (document.querySelectorAll('.pc-bundle-chat input:checked').length !== 1)
          throw new Error('Export-all overwrote manual selection');
        button('导出全部', footer).click();
        await confirm();
        await expect(() => Boolean(download), 'Export all download missing');
        const all = await readBundle(new File([download!], 'all.zip'));
        if (all.manifest.items.filter(item => item.kind === 'chat').length !== 6)
          throw new Error('Export all omitted chats');
      } finally {
        URL.createObjectURL = originalUrl;
      }
    }
    const phone = usePhoneStore();
    phone.notices.forEach(notice => phone.dismissNotice(notice.id));
    const scroll = document.querySelector<HTMLElement>(
      name.includes('-import') ? '.pc-bundle-scroll' : '.pc-bundle-catalog',
    )!;
    scroll.scrollTop = scroll.scrollHeight;
    await waitForVisualPaint();
    if (scroll.scrollHeight > scroll.clientHeight && !scroll.scrollTop) throw new Error('Internal scrolling failed');
    scroll.scrollTop = 0;
    await waitForVisualPaint();
  } finally {
    globalThis.fetch = originalFetch;
  }
  return true;
}
