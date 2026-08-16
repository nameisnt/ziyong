import { usePhoneStore } from '@/store/phone';
import { useReaderStore } from '@/store/reader';
import { useSettingsStore } from '@/store/settings';

export const readerScenarioNames = [
  'reader-detail',
  'reader-reasoning',
  'reader-text-edit-modal',
  'reader-theme-appearance',
  'reader-footer-persistence',
  'reader-catalog',
] as const;

type ReaderScenarioContext = {
  openReaderCatalog: () => Promise<void>;
  openReaderTools: () => Promise<void>;
  resetPhoneToRoute: (appId: string, page: string, title: string, params?: Record<string, string>) => void;
  setReaderFixtureReasoning: (reasoning: string) => void;
  toggleReaderFooter: () => Promise<void>;
  waitForCondition: (condition: () => boolean, timeout?: number) => Promise<boolean>;
  waitForPaint: () => Promise<void>;
};

function selectReaderText() {
  const content = document.querySelector<HTMLElement>('.pc-reader-content');
  if (!content) throw new Error('Reader text edit content is missing');
  const body = content.querySelector<HTMLElement>('p, li, blockquote');
  if (!body) throw new Error('Reader text edit fixture did not render a body block');
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const value = node.textContent || '';
    const trimmed = value.trim();
    if (trimmed.length >= 4) {
      const start = value.indexOf(trimmed);
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + Math.min(4, trimmed.length));
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    node = walker.nextNode();
  }
  throw new Error('Reader text edit fixture did not render selectable text');
}

async function loadFirstReaderMessage() {
  const reader = useReaderStore();
  reader.resetAllCaches();
  const briefs = await reader.loadBriefs(true);
  const brief = briefs[0];
  const messages = brief ? await reader.loadChat(brief.fileName, true) : [];
  return messages[0];
}

export async function applyReaderVisualScenario(name: string, context: ReaderScenarioContext) {
  if (!readerScenarioNames.includes(name as (typeof readerScenarioNames)[number])) return false;

  if (name === 'reader-detail') {
    const settingsStore = useSettingsStore();
    settingsStore.settings.theme = 'dark';
    const message = await loadFirstReaderMessage();
    if (!message) throw new Error('Reader visual fixture did not create a message');
    context.resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
    const detailLoaded = await context.waitForCondition(() =>
      Boolean(document.querySelector('.pc-reader-tool-trigger')),
    );
    if (!detailLoaded) throw new Error('Reader tool trigger did not render');
    await context.openReaderTools();
    const trigger = document.querySelector<HTMLElement>('.pc-reader-tool-trigger');
    const menu = document.querySelector<HTMLElement>('.pc-reader-tool-menu');
    if (!trigger || !menu) throw new Error('Reader tool menu did not stay open');
    if (getComputedStyle(trigger).backgroundColor !== 'rgb(44, 44, 46)') {
      throw new Error('Reader tool trigger is not opaque in dark mode');
    }
    const menuStyle = getComputedStyle(menu);
    if (menuStyle.backgroundColor !== 'rgb(44, 44, 46)' || menuStyle.gridTemplateColumns.split(' ').length !== 2) {
      throw new Error('Reader tool menu is not an opaque two-column panel in dark mode');
    }
    const actionButtons = [...menu.querySelectorAll<HTMLButtonElement>(':scope > button')];
    if (
      !actionButtons.length ||
      actionButtons.some(button => {
        const label = button.textContent?.trim() || '';
        return label.length < 2 || label.length > 4;
      })
    ) {
      throw new Error('Reader tool actions must all expose a two-to-four-character label');
    }
  } else if (name === 'reader-reasoning') {
    context.setReaderFixtureReasoning('<thinking>先核对楼层事实，再整理正文。</thinking>');
    const message = await loadFirstReaderMessage();
    if (!message) throw new Error('Reader reasoning fixture did not create a message');
    if (!message.reasoning.includes('先核对楼层事实')) {
      throw new Error('Reader normalization did not retain fixture reasoning');
    }
    context.resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
    const disclosureLoaded = await context.waitForCondition(
      () => Boolean(document.querySelector('.pc-reasoning-disclosure > summary')),
      2_000,
    );
    if (!disclosureLoaded) throw new Error('Reader reasoning disclosure did not render');
    const disclosure = document.querySelector<HTMLDetailsElement>('.pc-reasoning-disclosure');
    const summary = disclosure?.querySelector<HTMLElement>('summary');
    if (!disclosure || !summary || disclosure.open) throw new Error('Reader reasoning must start collapsed');
    summary.click();
    await context.waitForPaint();
    if (!disclosure.open || !disclosure.textContent?.includes('先核对楼层事实')) {
      throw new Error('Reader reasoning did not expand with its saved content');
    }
    summary.click();
    await context.waitForPaint();
    if (disclosure.open) throw new Error('Reader reasoning did not collapse');
    summary.click();
    await context.waitForPaint();
  } else if (name === 'reader-text-edit-modal') {
    const message = await loadFirstReaderMessage();
    if (!message) throw new Error('Reader text edit fixture did not create a message');
    context.resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
    const contentLoaded = await context.waitForCondition(
      () => Boolean(document.querySelector('.pc-reader-content')),
      2_000,
    );
    if (!contentLoaded) throw new Error('Reader text edit content did not finish loading');
    selectReaderText();
    await context.openReaderTools();
    const editButton = [...document.querySelectorAll<HTMLButtonElement>('.pc-reader-tool-menu button')].find(button =>
      button.textContent?.includes('删除文字'),
    );
    if (!editButton || editButton.disabled) throw new Error('Reader text edit action is missing or read-only');
    editButton.click();
    const modalOpened = await context.waitForCondition(
      () => Boolean(document.querySelector('.pc-reader-edit-modal')),
      2_000,
    );
    if (!modalOpened) throw new Error('Reader text edit modal did not open from the selected fixture text');
    if (!document.querySelector<HTMLButtonElement>('.pc-reader-edit-head .pc-icon-btn[title="关闭"]')) {
      throw new Error('Reader text edit modal close action is missing');
    }
    await context.waitForPaint();
    const textarea = document.querySelector<HTMLTextAreaElement>('.pc-reader-edit-modal textarea');
    if (!textarea || document.activeElement !== textarea) {
      throw new Error('Reader single-occurrence edit did not preserve textarea focus');
    }
    if (textarea.selectionEnd - textarea.selectionStart !== 4) {
      throw new Error('Reader single-occurrence edit did not preserve the selected source range');
    }
  } else if (name === 'reader-theme-appearance') {
    const settingsStore = useSettingsStore();
    settingsStore.settings.reader.fontFamily = 'Courier New, monospace';
    settingsStore.settings.visualTheme.readerTextColor = '#7b3fe4';
    const message = await loadFirstReaderMessage();
    if (!message) throw new Error('Reader appearance fixture did not create a message');
    context.resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
    const contentLoaded = await context.waitForCondition(
      () => Boolean(document.querySelector('.pc-reader-content')),
      2_000,
    );
    if (!contentLoaded) throw new Error('Reader appearance content did not finish loading');
    const content = document.querySelector<HTMLElement>('.pc-reader-content');
    if (!content) throw new Error('Reader appearance content is missing');
    const appearance = getComputedStyle(content);
    if (!appearance.fontFamily.toLowerCase().includes('courier new')) {
      throw new Error('Reader font family did not reach the rendered content');
    }
    if (appearance.color !== 'rgb(123, 63, 228)') {
      throw new Error('Reader text color did not reach the rendered content');
    }
    const renderedText = content.querySelector<HTMLElement>('h1, h2, h3, p, li, blockquote');
    if (!renderedText || !getComputedStyle(renderedText).fontFamily.toLowerCase().includes('courier new')) {
      throw new Error('Reader font family did not reach nested rendered text');
    }
  } else if (name === 'reader-footer-persistence') {
    const phone = usePhoneStore();
    const message = await loadFirstReaderMessage();
    if (!message) throw new Error('Reader footer fixture did not create a message');
    context.resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
    const detailLoaded = await context.waitForCondition(
      () => Boolean(document.querySelector('.pc-reader-detail-shell')),
      2_000,
    );
    if (!detailLoaded) throw new Error('Reader footer fixture did not finish loading the detail shell');
    await context.toggleReaderFooter();
    const stackLength = phone.stack.length;
    const nextButton = document.querySelector<HTMLButtonElement>('.pc-detail-nav button:last-child:not(:disabled)');
    if (!nextButton) throw new Error('Reader next button is missing from the persistent footer');
    nextButton.click();
    await context.waitForPaint();
    if (!document.querySelector('.pc-reader-footer-popover')) {
      throw new Error('Reader footer disappeared after an adjacent navigation action');
    }
    if (phone.stack.length !== stackLength) {
      throw new Error('Reader adjacent navigation added an unnecessary history entry');
    }
    await context.toggleReaderFooter();
    if (document.querySelector('.pc-reader-footer-popover')) {
      throw new Error('Reader center tap did not hide the persistent footer');
    }
    await context.toggleReaderFooter();
  } else {
    const message = await loadFirstReaderMessage();
    if (!message) throw new Error('Reader visual fixture did not create a message');
    context.resetPhoneToRoute('reader', 'detail', message.title, { messageId: message.id });
    const detailLoaded = await context.waitForCondition(
      () => Boolean(document.querySelector('.pc-reader-detail-shell')),
      2_000,
    );
    if (!detailLoaded) throw new Error('Reader catalog fixture did not finish loading the detail shell');
    await context.openReaderCatalog();
  }

  return true;
}
