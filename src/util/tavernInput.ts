type TavernInputElement = HTMLInputElement | HTMLTextAreaElement;

export interface AppendToTavernInputOptions {
  focus?: boolean;
  separator?: 'auto' | 'newline' | 'space' | string;
}

export interface AppendToTavernInputResult {
  element: TavernInputElement | null;
  ok: boolean;
  value: string;
}

const tavernInputSelectors = ['#send_textarea', 'textarea.st-input', 'textarea[name="send_textarea"]', 'textarea'];

function getReachableDocuments() {
  const documents: Document[] = [];
  const pushDocument = (nextDocument: Document | null | undefined) => {
    if (nextDocument && !documents.includes(nextDocument)) documents.push(nextDocument);
  };

  if (typeof document !== 'undefined') pushDocument(document);
  if (typeof window !== 'undefined') {
    try {
      pushDocument(window.parent?.document);
    } catch {
      // Cross-origin frames are ignored.
    }
    try {
      pushDocument(window.top?.document);
    } catch {
      // Cross-origin frames are ignored.
    }
  }

  return documents;
}

export function findTavernInputElement(): TavernInputElement | null {
  for (const nextDocument of getReachableDocuments()) {
    for (const selector of tavernInputSelectors) {
      const element = nextDocument.querySelector(selector);
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        return element;
      }
    }
  }
  return null;
}

export function getTavernInputValue() {
  return findTavernInputElement()?.value ?? '';
}

export function sendTavernInput(text: string) {
  const input = findTavernInputElement();
  const value = text.trim();
  if (!input || !value) return false;

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  for (const nextDocument of getReachableDocuments()) {
    const sendButton = nextDocument.querySelector<HTMLElement>('#send_but');
    if (!sendButton) continue;
    sendButton.click();
    return true;
  }
  return false;
}

function resolveSeparator(currentValue: string, nextText: string, separator: AppendToTavernInputOptions['separator']) {
  if (!currentValue || currentValue.endsWith(' ') || currentValue.endsWith('\n') || !nextText) return '';
  if (separator === 'newline') return '\n';
  if (separator === 'space' || separator === 'auto' || !separator) return ' ';
  return separator;
}

export function appendToTavernInput(text: string, options: AppendToTavernInputOptions = {}): AppendToTavernInputResult {
  const element = findTavernInputElement();
  const nextText = text.trim();
  if (!element || !nextText) {
    return {
      element,
      ok: false,
      value: element?.value ?? '',
    };
  }

  const separator = resolveSeparator(element.value, nextText, options.separator ?? 'auto');
  element.value = `${element.value}${separator}${nextText}`;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  if (options.focus ?? true) {
    element.focus();
  }

  return {
    element,
    ok: true,
    value: element.value,
  };
}
