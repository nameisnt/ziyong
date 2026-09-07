import { useRegexDisplayStore } from '@/apps/regex-display/store';
import { useSettingsStore } from '@/store/settings';
import { useTheaterStore } from '@/store/theater';
import { contentRegexUsageKey } from '@/util/regexDisplay';

type Context = {
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  waitForCondition: (condition: () => boolean) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

export async function applyContentRegexScenario(name: string, context: Context) {
  if (!name.startsWith('content-regex-')) return false;
  const { resetPhoneToRoute, waitForCondition, waitForPaint } = context;
  useSettingsStore().setTheme(name.endsWith('-dark') ? 'dark' : 'light');
  const store = useRegexDisplayStore();
  store.importBackup({ rules: [], usages: {} });
  async function wait(condition: () => boolean, message: string) {
    if (!(await waitForCondition(condition))) throw new Error(message);
  }
  async function click(label: string, root: ParentNode = document) {
    const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.getAttribute('aria-label') === label || button.textContent?.trim() === label,
    );
    if (!button || button.disabled) throw new Error(`Missing or disabled action: ${label}`);
    button.click();
    await waitForPaint();
  }
  async function checkScroll(selector: string) {
    const list = document.querySelector<HTMLElement>(selector);
    if (!list || list.scrollHeight <= list.clientHeight) throw new Error('Long regex list is not constrained');
    list.scrollTop = list.scrollHeight;
    await waitForPaint();
    if (!list.scrollTop) throw new Error('Regex list cannot scroll');
    list.scrollTop = 0;
  }
  if (name.includes('import')) {
    resetPhoneToRoute('regex-display', 'root', '正则替换');
    await waitForPaint();
    await click('导入酒馆正则');
    const input = document.querySelector<HTMLInputElement>('.pc-regex-import-dialog input[type=file]');
    if (!input) throw new Error('Regex file input missing');
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(
        [
          JSON.stringify([
            { scriptName: '雨夜替换', findRegex: '/雨夜/g', replaceString: '晴天', minDepth: 10 },
            { scriptName: '第二条替换', findRegex: '/晴天/g', replaceString: '清晨' },
          ]),
        ],
        'regex.json',
        { type: 'application/json' },
      ),
    );
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(
      () => document.querySelectorAll('.pc-regex-import-list input[type=checkbox]').length === 2,
      'File import candidates missing',
    );
    await click('选择可见');
    await click('导入所选 2');
    const imported = store.rules.filter(rule => rule.operation === 'replace');
    if (imported.length !== 2 || imported[0].flags !== 'g')
      throw new Error('File import did not create expression copies');
    const group = store.addGroup('测试目标分组');
    await waitForPaint();
    await click('批量移动规则');
    for (const rule of imported)
      document
        .querySelector<HTMLInputElement>(`[data-regex-rule-id="${rule.id}"] .pc-bulk-selection-checkbox input`)
        ?.click();
    await waitForPaint();
    document.querySelector<HTMLInputElement>('input[aria-label="移动到分组"]')?.click();
    await waitForPaint();
    await click('测试目标分组');
    await click('移动所选');
    if (
      store.rules
        .filter(rule => rule.groupId === group.id)
        .map(rule => rule.id)
        .join() !== imported.map(rule => rule.id).join()
    )
      throw new Error('Bulk move lost order or destination');
    await click('导入酒馆正则');
    const runtime = window as unknown as Record<string, unknown>;
    const previous = runtime.getTavernRegexes;
    try {
      runtime.getTavernRegexes = () => {
        throw new Error('测试读取失败');
      };
      await click('读取酒馆');
      await wait(
        () =>
          Boolean(document.querySelector('.pc-regex-import-dialog .warning')?.textContent?.includes('测试读取失败')),
        'Live read error not displayed',
      );
      runtime.getTavernRegexes = () =>
        Array.from({ length: 24 }, (_, index) => ({
          script_name: `酒馆规则 ${index + 1}`,
          find_regex: '/雨/g',
          replace_string: '晴',
          min_depth: 8,
        }));
      await click('读取酒馆');
      await wait(
        () => document.querySelectorAll('.pc-regex-import-list input[type=checkbox]').length === 24,
        'Live read retry failed',
      );
      await click('选择可见');
      await checkScroll('.pc-regex-import-list');
      // Leave the long list open for scroll and layout inspection.
    } finally {
      if (previous === undefined) delete runtime.getTavernRegexes;
      else runtime.getTavernRegexes = previous;
    }
    return true;
  }

  const rule = store.addRule({ name: '雨夜替换', pattern: '雨夜', replacement: '晴天' });
  store.setDisplayRuleEnabled('theater', rule.id, true);
  const theater = useTheaterStore();
  theater.resetCurrentScope();
  const first = theater.createEntry({
    title: '正则隔离一',
    content: '雨夜里的一封信',
    renderMode: 'markdown',
    typeName: '测试',
  });
  const second = theater.createEntry({
    title: '正则隔离二',
    content: '雨夜里的另一封信',
    renderMode: 'markdown',
    typeName: '测试',
  });
  async function open(entryId: string, versionId = '') {
    resetPhoneToRoute('theater', 'entry', '小剧场', { entryId, versionId });
    await waitForPaint();
    await wait(() => Boolean(document.querySelector('.pc-reader-detail-shell')), 'Reader shell missing');
  }
  const text = () => document.querySelector('.pc-reader-custom-content')?.textContent || '';
  await open(first.id);
  if (!text().includes('雨夜')) throw new Error('App-wide rule still applies without content selection');
  await click('阅读工具');
  await click('正则替换');
  document.querySelector<HTMLInputElement>('.pc-content-regex-list input[type=checkbox]')?.click();
  await click('完成');
  await wait(() => text().includes('晴天'), 'Selected rule did not transform display');
  theater.appendEntryVersion(first.id, { title: first.title, content: '雨夜里的新版本', renderMode: 'markdown' });
  const entry = theater.getEntry(first.id)!;
  const [original, next] = entry.versions;
  await open(first.id, original.id);
  if (!text().includes('晴天')) throw new Error('First version creation lost original selection');
  if (original.content !== '雨夜里的一封信') throw new Error('Display rule modified raw content');
  await open(first.id, next.id);
  if (!text().includes('雨夜')) throw new Error('Rule leaked to another version');
  await open(second.id);
  if (!text().includes('雨夜')) throw new Error('Rule leaked to another entry');
  await open(first.id, original.id);
  if (!text().includes('晴天')) throw new Error('Selection lost on return');
  // Simulate the orphan key produced before the first-version fix.
  store.deleteUsage(contentRegexUsageKey('theater', [first.id, original.id]));
  store.setDisplayRuleEnabled(contentRegexUsageKey('theater', [first.id, '']), rule.id, true);
  await open(second.id);
  await open(first.id, original.id);
  if (!text().includes('晴天')) throw new Error('Unambiguous orphan selection was not repaired');
  const backup = JSON.parse(JSON.stringify(store.settings));
  store.importBackup(backup);
  if (
    !store.settings.usages[contentRegexUsageKey('theater', [first.id, original.id])]?.displayRuleIds.includes(rule.id)
  )
    throw new Error('Selection did not survive backup');
  await click('阅读工具');
  await click('正则替换');
  await click('清除选择');
  await click('完成');
  if (!text().includes('雨夜')) throw new Error('Clearing selection did not restore display');
  if (name.includes('errors')) {
    const key = contentRegexUsageKey('theater', [first.id, original.id]);
    store.setDisplayRuleEnabled(key, rule.id, true);
    for (let index = 0; index < 15; index++) {
      const invalid = store.addRule({ name: `无效规则 ${index + 1}`, pattern: '[' + 'x'.repeat(400), replacement: '' });
      store.setDisplayRuleEnabled(key, invalid.id, true);
    }
    await waitForPaint();
    const disclosure = document.querySelector<HTMLDetailsElement>('.pc-reader-detail-shell > .pc-regex-errors');
    if (!disclosure || disclosure.open || !text().includes('晴天'))
      throw new Error('Error summary or valid rule missing');
    disclosure.querySelector('summary')?.click();
    await waitForPaint();
    await checkScroll('.pc-reader-detail-shell > .pc-regex-errors ul');
    const reader = document.querySelector<HTMLElement>('.pc-reader-detail-card');
    const shell = document.querySelector<HTMLElement>('.pc-reader-detail-shell');
    if (!reader || !shell || reader.getBoundingClientRect().top >= shell.getBoundingClientRect().bottom - 100)
      throw new Error('Errors displaced reading area');
    if (disclosure.scrollWidth > disclosure.clientWidth + 1) throw new Error('Long regex error overflows');
    if (original.content !== '雨夜里的一封信') throw new Error('Failed rule changed source');
    return true;
  }
  for (let index = 0; index < 20; index++)
    store.addRule({ name: `替换规则 ${index}`, pattern: '示例', replacement: '' });
  await click('阅读工具');
  await click('正则替换');
  await checkScroll('.pc-content-regex-list');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(() => !document.querySelector('.pc-content-regex-dialog'), 'Escape did not close regex selection');
  await click('阅读工具');
  await click('正则替换');
  return true;
}
