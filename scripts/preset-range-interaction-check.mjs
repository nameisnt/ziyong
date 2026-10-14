/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({
  configFile: false,
  build: { outDir: 'tmp/ui-check/server' },
  preview: { host: '127.0.0.1', port: 0 },
});
const browser = await chromium.launch();
const out = 'tmp/ui-check/preset-range-interactions';
await mkdir(out, { recursive: true });
try {
  for (const width of [350, 390, 430]) {
    for (const theme of ['light', 'dark']) {
      const height = width === 350 ? 700 : width === 390 ? 844 : 900;
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/visual-harness.html?manual`);
      await page.waitForFunction(() => window.__phoneVisualTest__);
      await page.evaluate(
        async ({ width, height, theme }) => {
          await window.__phoneVisualTest__.applyScenario(
            `preset-prompt-range-groups${theme === 'dark' ? '-dark' : ''}`,
            { width, height },
          );
          const provides = document.querySelector('.pc-preset-page').__vueParentComponent.appContext.provides;
          const pinia = Reflect.ownKeys(provides)
            .map(key => provides[key])
            .find(value => value?._s);
          window.rangeTest = { pinia };
          const record = await pinia._s.get('pluginPresets').importPreset(
            {
              prompts: Array.from({ length: 148 }, (_, i) => ({
                id: `long-${i}`,
                name: `条目 ${i + 1}`,
                role: 'system',
                content: '内容',
                enabled: i % 2 === 0,
              })),
              extensions: {
                baibaiToolkit: {
                  presetPromptGroups: {
                    version: 2,
                    groups: Array.from({ length: 18 }, (_, i) => ({
                      id: `g${i}`,
                      name: `分组 ${i + 1}`,
                      startPromptId: '',
                      endPromptId: '',
                      enabled: true,
                      collapsed: true,
                      selectionMode: 'multiple',
                    })),
                  },
                },
              },
            },
            '__pc_test__148.json',
          );
          window.rangeTest.record = record;
          pinia._s
            .get('phone')
            .pushRoute('preset-manager', 'detail', '插件预设条目', { presetSource: 'plugin', presetId: record.id });
        },
        { width, height, theme },
      );
      await page.getByText('148 个条目', { exact: true }).waitFor();
      await page.locator('summary[aria-label="管理"]').click();
      await page.getByRole('button', { name: '管理条目分组', exact: true }).click();
      const lastGroup = page.locator('.pc-preset-managed-group-row').last();
      await lastGroup.getByRole('button', { name: '选择范围', exact: true }).scrollIntoViewIfNeeded();
      const scroll = await page.locator('.pc-preset-group-manager-body').evaluate(el => el.scrollTop);
      await lastGroup.getByRole('button', { name: '选择范围', exact: true }).click();
      const picker = page.locator('.pc-preset-range-picker');
      assert.equal(await picker.locator('.pc-preset-prompt-row').count(), 148);
      await picker.locator('[data-preset-prompt-id="long-140"] button').click();
      await picker.locator('[data-preset-prompt-id="long-143"] button').click();
      assert.equal(await picker.locator('.range-selected').count(), 4);
      await page.screenshot({ path: `${out}/${width}-${theme}.png` });
      await page.evaluate(() => {
        const store = window.rangeTest.pinia._s.get('pluginPresets');
        window.rangeTest.originalSave = store.updatePromptGroups;
        store.updatePromptGroups = async () => {
          await new Promise(resolve => setTimeout(resolve, 400));
          throw Error('测试保存失败');
        };
      });
      await picker.getByRole('button', { name: '确认范围', exact: true }).click();
      assert.equal(await picker.getByRole('button', { name: '取消', exact: true }).isDisabled(), true);
      await page.getByText('测试保存失败', { exact: true }).waitFor();
      assert.equal(await picker.locator('.range-selected').count(), 4);
      await page.evaluate(() => {
        const t = window.rangeTest;
        t.pinia._s.get('pluginPresets').updatePromptGroups = t.originalSave;
      });
      await picker.getByRole('button', { name: '确认范围', exact: true }).click();
      await picker.waitFor({ state: 'detached' });
      assert.ok(
        Math.abs((await page.locator('.pc-preset-group-manager-body').evaluate(el => el.scrollTop)) - scroll) < 3,
      );
      const saved = await page.evaluate(() => ({
        groups: window.rangeTest.record.raw.extensions.baibaiToolkit.presetPromptGroups.groups,
        switches: window.rangeTest.record.raw.prompts.map(x => x.enabled),
      }));
      assert.equal(saved.groups.at(-1).startPromptId, 'long-140');
      assert.equal(saved.groups.at(-1).endPromptId, 'long-143');
      assert.deepEqual(
        saved.switches,
        Array.from({ length: 148 }, (_, i) => i % 2 === 0),
      );
      await lastGroup.getByRole('button', { name: '清除范围', exact: true }).click();
      await page.waitForFunction(
        () =>
          window.rangeTest.record.raw.extensions.baibaiToolkit.presetPromptGroups.groups.at(-1).startPromptId === '',
      );
      console.log(
        `PASS ${width} ${theme}: 148 rows, disabled items, scrolling, busy, failed save/retry, restored modal position, clear range, switches unchanged`,
      );
      await page.close();
    }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
