/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentSource = await readFile(new URL('../../src/components/ActionMenu.vue', import.meta.url), 'utf8');
const harnessSource = await readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8');
const runnerSource = await readFile(new URL('../ui-visual-check.mjs', import.meta.url), 'utf8');

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function declarationsFor(body) {
  return Object.fromEntries(
    [...body.matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;{}]+)/g)].map(match => [match[1], match[2].trim()]),
  );
}

test('shared action menu closes through every navigation path and contains long options on narrow screens', () => {
  const failures = [];
  for (const evidence of [
    'function closeFromKeyboard(event: KeyboardEvent)',
    "event.key !== 'Escape'",
    'function closeFromPhoneBack(event: Event)',
    "window.addEventListener('phone-before-back', closeFromPhoneBack)",
    "window.removeEventListener('phone-before-back', closeFromPhoneBack)",
  ]) {
    if (!componentSource.includes(evidence)) failures.push(`ActionMenu lifecycle missing: ${evidence}`);
  }

  const panelRules = rulesFor(componentSource, '.pc-action-menu-panel');
  const panel = declarationsFor(panelRules.at(-1) ?? '');
  if (!panel['max-width']?.includes('220px')) failures.push('ActionMenu panel has no narrow-screen width cap');
  if (!panel['max-height']) failures.push('ActionMenu panel has no viewport height cap');
  if (panel['overflow-y'] !== 'auto') failures.push('ActionMenu panel cannot scroll when options exceed the height cap');

  const buttonRules = rulesFor(componentSource, '.pc-action-menu-panel :deep(button)');
  const button = declarationsFor(buttonRules.at(-1) ?? '');
  if (button['white-space'] !== 'normal') failures.push('ActionMenu option labels are not allowed to wrap');
  if (button['overflow-wrap'] !== 'anywhere') failures.push('ActionMenu option labels cannot break an overlong token');

  const actionMenuScenario = harnessSource.slice(
    harnessSource.indexOf("name === 'entry-library-action-menu'"),
    harnessSource.indexOf("name === 'entry-library-manual-create'"),
  );
  for (const evidence of [
    "querySelector<HTMLButtonElement>('summary')?.click()",
    '这是一个需要在三百五十像素手机菜单内完整换行显示的超长功能名称',
  ]) {
    if (!actionMenuScenario.includes(evidence)) failures.push(`real long-option fixture missing: ${evidence}`);
  }
  if (actionMenuScenario.includes("setAttribute('open'")) failures.push('ActionMenu visual fixture still bypasses summary');

  for (const evidence of [
    "scenario === 'entry-library-action-menu'",
    "page.keyboard.press('Escape')",
    "new Event('phone-before-back'",
    "page.mouse.click(2, 2)",
    'ActionMenu 执行可用动作后没有关闭',
  ]) {
    if (!runnerSource.includes(evidence)) failures.push(`ActionMenu interaction evidence missing: ${evidence}`);
  }

  assert.deepEqual(failures, []);
});
