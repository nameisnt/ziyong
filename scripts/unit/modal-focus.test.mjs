/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';

const source = await readFile(new URL('../../src/composables/usePhoneModalLifecycle.ts', import.meta.url), 'utf8');
const code = transpileModule(source, {
  compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
}).outputText;

function fixture() {
  const doc = { activeElement: null, body: null };
  class Element {
    children = [];
    isConnected = true;
    disabled = false;
    hidden = false;
    tabIndex = 0;
    style = { overflow: '' };
    constructor(parent = null) {
      this.parent = parent;
      parent?.children.push(this);
    }
    focus() {
      doc.activeElement = this;
    }
    matches() {
      return this.disabled;
    }
    closest(selector) {
      return selector === '.pc-phone-shell' ? shell : this.hidden ? this : null;
    }
    querySelector() {
      return screen;
    }
    querySelectorAll() {
      return this.children.flatMap(child => [child, ...child.querySelectorAll()]);
    }
    getClientRects() {
      return this.hidden ? [] : [{}];
    }
    contains(element) {
      return element === this || this.children.some(child => child.contains(element));
    }
  }
  const shell = new Element();
  const screen = new Element(shell);
  screen.tabIndex = -1;
  doc.body = new Element();
  doc.activeElement = doc.body;
  const window = new EventTarget();
  const watchers = [];
  const vue = {
    nextTick: callback => Promise.resolve().then(callback),
    onMounted: callback => callback(),
    onBeforeUnmount: () => {},
    watch: (getter, callback) => {
      watchers.push(() => callback(getter()));
      callback(getter());
    },
  };
  const exports = {};
  runInNewContext(code, {
    exports,
    require: () => vue,
    document: doc,
    window,
    HTMLElement: Element,
    getComputedStyle: () => ({ visibility: 'visible' }),
    requestAnimationFrame: callback => Promise.resolve().then(callback),
  });
  async function settle() {
    await Promise.resolve();
    await Promise.resolve();
  }
  function press(key, shiftKey = false) {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { key, shiftKey });
    window.dispatchEvent(event);
    return event;
  }
  async function open(withInput = false) {
    const dialog = new Element(shell);
    dialog.tabIndex = -1;
    const input = withInput ? new Element(dialog) : null;
    let isOpen = true;
    exports.usePhoneModalLifecycle({
      dialogRef: { value: dialog },
      initialFocus: () => input,
      isOpen: () => isOpen,
      onClose: () => {
        isOpen = false;
        dialog.isConnected = false;
        shell.children = shell.children.filter(child => child !== dialog);
        watchers.forEach(callback => callback());
      },
    });
    await settle();
    return dialog;
  }
  return { doc, Element, shell, screen, open, press, settle };
}

test('modal wraps keyboard focus, skips disabled/hidden controls and handles empty dialogs', async () => {
  const f = fixture();
  const trigger = new f.Element(f.shell);
  trigger.focus();
  const dialog = await f.open();
  assert.equal(f.doc.activeElement, dialog);
  assert.equal(f.press('Tab').defaultPrevented, true);
  assert.equal(f.doc.activeElement, dialog);
  const first = new f.Element(dialog);
  const disabled = new f.Element(dialog);
  disabled.disabled = true;
  const hidden = new f.Element(dialog);
  hidden.hidden = true;
  const last = new f.Element(dialog);
  last.focus();
  f.press('Tab');
  assert.equal(f.doc.activeElement, first);
  f.press('Tab', true);
  assert.equal(f.doc.activeElement, last);
  f.press('Escape');
  await f.settle();
  assert.equal(f.doc.activeElement, trigger);
  assert.equal(f.screen.style.overflow, '');
});

test('nested modals close only the top layer and retain parent scroll lock and focus', async () => {
  const f = fixture();
  const trigger = new f.Element(f.shell);
  trigger.focus();
  const parent = await f.open();
  const nestedTrigger = new f.Element(parent);
  nestedTrigger.focus();
  const child = await f.open();
  assert.equal(f.doc.activeElement, child);
  f.press('Escape');
  await f.settle();
  assert.equal(child.isConnected, false);
  assert.equal(parent.isConnected, true);
  assert.equal(f.doc.activeElement, nestedTrigger);
  assert.equal(f.screen.style.overflow, 'hidden');
  f.press('Escape');
  await f.settle();
  assert.equal(f.doc.activeElement, trigger);
  assert.equal(f.screen.style.overflow, '');
});

test('removed triggers restore a remaining page control', async () => {
  const f = fixture();
  const back = new f.Element(f.shell);
  const trigger = new f.Element(f.shell);
  trigger.focus();
  await f.open();
  trigger.isConnected = false;
  f.press('Escape');
  await f.settle();
  assert.equal(f.doc.activeElement, back);
});

test('an input notice owns focus above a modal and Escape restores its trigger', async () => {
  const f = fixture();
  const parent = await f.open();
  const trigger = new f.Element(parent);
  trigger.focus();
  const notice = await f.open(true);
  const input = notice.children[0];
  const cancel = new f.Element(notice);
  const confirm = new f.Element(notice);
  assert.equal(f.doc.activeElement, input);
  assert.equal(f.press('Tab').defaultPrevented, false);
  input.focus();
  f.press('Tab', true);
  assert.equal(f.doc.activeElement, confirm);
  f.press('Tab');
  assert.equal(f.doc.activeElement, input);
  cancel.focus();
  f.press('Escape');
  await f.settle();
  assert.equal(f.doc.activeElement, trigger);
  assert.equal(parent.isConnected, true);
});

test('interactive notices reuse modal lifecycle while plain notices do not become dialogs', async () => {
  const notice = await readFile(new URL('../../src/components/PhoneNoticeItem.vue', import.meta.url), 'utf8');
  assert.match(notice, /isOpen: \(\) => phone.isOpen && interactive.value/u);
  assert.match(notice, /Boolean\(props.notice.input \|\| props.notice.actions\?\.length\)/u);
  assert.match(notice, /initialFocus: \(\) => inputRef.value/u);
  assert.match(notice, /@keydown.enter.stop.prevent="phone.chooseNoticeAction/u);
});

test('closing a notice restores the parent when its trigger is disabled by the action', async () => {
  const f = fixture();
  const parent = await f.open();
  const trigger = new f.Element(parent);
  trigger.focus();
  await f.open(true);
  f.press('Escape');
  trigger.disabled = true;
  await f.settle();
  assert.equal(f.doc.activeElement, parent);
});
