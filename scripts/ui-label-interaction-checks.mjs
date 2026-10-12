/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';

export async function checkLabelInteractions(page, scenario) {
  if (scenario.startsWith('entry-library-bindings')) {
    const editor = page.locator('.pc-entry-binding-template');
    const field = editor.getByRole('textbox', { name: '绑定内容' });
    const original = await field.inputValue();
    await editor.locator('label').click();
    assert.equal(await field.inputValue(), original, 'Title click must not insert content');
    assert.equal(await field.evaluate(el => document.activeElement === el), true);
    await field.fill('before-after');
    await field.evaluate(el => el.setSelectionRange(7, 7));
    await editor.getByRole('button', { name: '插入占位符' }).click();
    const inserted = await field.inputValue();
    assert.ok(inserted.startsWith('before-') && inserted.endsWith('after'));
    assert.ok(inserted.length > 'before-after'.length, 'Button must still insert the placeholder');
  }
  if (scenario.startsWith('card-writer-labels')) {
    const notices = page.locator('.pc-phone-notice');
    for (const title of ['本次任务', '写入世界书（可选）']) {
      const caption = page.locator('.pc-card-writer-app .pc-field-label').filter({ hasText: title });
      await caption.click({ position: { x: 8, y: 8 } });
      assert.equal(await notices.count(), 0, 'Caption click must not open help');
      await caption.getByRole('button', { name: '说明', exact: true }).click();
      await notices.waitFor({ state: 'visible' });
      await notices.click();
      await notices.waitFor({ state: 'detached' });
    }
  }
  if (scenario.startsWith('timekeeper-labels')) {
    const row = page.locator('.pc-timekeeper-app .pc-check-row').first();
    const check = row.getByRole('checkbox');
    const name = row.getByRole('textbox', { name: '人物名称' });
    assert.equal(await check.isChecked(), false);
    await name.fill('已修改人物');
    assert.equal(await check.isChecked(), false, 'Editing a name must not select a person');
    await check.check();
    await name.click();
    assert.equal(await check.isChecked(), true);
    await check.focus();
    await page.keyboard.press('Space');
    assert.equal(await check.isChecked(), false, 'Keyboard must toggle exactly once');
    assert.equal(await name.inputValue(), '已修改人物');
  }
  assert.equal(await page.locator('label label').count(), 0, 'Rendered labels must not nest');
}
