/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import autoImport from 'unplugin-auto-import/vite';

const root = process.cwd();
const out = path.join(root, 'tmp/frontend-background');
await mkdir(out, { recursive: true });
const server = await createServer({
  configFile: false,
  root,
  plugins: [vue(), autoImport({ imports: ['vue'], dts: false })],
  resolve: { alias: { '@': path.join(root, 'src') } },
  optimizeDeps: { noDiscovery: true, include: ['vue'] },
  server: { host: '127.0.0.1', port: 0 },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const accordionHeightFailures = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(error.message);
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/scripts/fixtures/frontend-background.html`);
  await page.waitForSelector('iframe');
  for (const [width, height] of [
    [350, 700],
    [390, 844],
    [430, 900],
    [1280, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => {
        document.body.className = theme;
        Object.assign(window.state, {
          theme,
          transparentBackground: true,
          active: true,
          content:
            '<p>Transparent page</p><button onclick="document.querySelector(\'dialog\').showModal()">Open</button><dialog><button onclick="this.parentElement.close()">Close</button><div style="height:100px;overflow:auto"><p style="height:500px">Scrollable content</p></div></dialog>',
        });
      }, theme);
      const frame = page.frameLocator('iframe');
      await frame.getByText('Transparent page', { exact: true }).waitFor();
      assert.equal(
        await page.locator('.pc-frame-shell').evaluate(el => getComputedStyle(el).backgroundColor),
        'rgba(0, 0, 0, 0)',
      );
      for (const selector of ['html', 'body', '#pc-frame-content']) {
        assert.equal(
          await frame.locator(selector).evaluate(el => getComputedStyle(el).backgroundColor),
          'rgba(0, 0, 0, 0)',
        );
      }
      await frame.getByRole('button', { name: 'Open', exact: true }).click();
      assert.equal(await frame.locator('dialog').evaluate(el => el.open), true);
      assert.notEqual(
        await frame.locator('dialog').evaluate(el => getComputedStyle(el).backgroundColor),
        'rgba(0, 0, 0, 0)',
      );
      assert.ok(
        (await frame.locator('dialog div').evaluate(el => {
          el.scrollTop = 80;
          return el.scrollTop;
        })) > 0,
      );
      await frame.getByRole('button', { name: 'Close', exact: true }).click();
      await page.screenshot({ path: path.join(out, `${width}-${theme}.png`) });
      await page.evaluate(() => {
        window.state.content =
          '<style>body{background:rgb(38,72,96)} .card{background:rgb(255,240,200)}</style><div class="card">Own background</div>';
      });
      await frame.getByText('Own background', { exact: true }).waitFor();
      assert.equal(await frame.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(38, 72, 96)');
      assert.equal(
        await frame.locator('.card').evaluate(el => getComputedStyle(el).backgroundColor),
        'rgb(255, 240, 200)',
      );
      await page.evaluate(() => {
        window.state.content = '<p>Default mode</p>';
        window.state.transparentBackground = false;
      });
      await frame.getByText('Default mode', { exact: true }).waitFor();
      assert.equal(
        await frame.locator('body').evaluate(el => getComputedStyle(el).backgroundColor),
        theme === 'dark' ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)',
      );
      await page.evaluate(() => {
        window.state.active = false;
      });
      await page.waitForSelector('iframe', { state: 'detached' });
      await page.evaluate(() => {
        window.state.active = true;
      });
      await frame.getByText('Default mode', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      console.log(
        `PASS ${width}x${height} ${theme}: transparency, authored backgrounds, dialog, scrolling, remount, unchanged default`,
      );
      for (const securityMode of ['trusted', 'status', 'safe']) {
        const background = theme === 'dark' ? '#182522' : '#f4f8f6';
        await page.evaluate(
          ({ theme, background, securityMode }) => {
            window.state.securityMode = securityMode;
            window.state.statusContext = securityMode === 'status' ? { scopeKey: 'fixture', messageId: 4 } : undefined;
            window.state.transparentBackground = true;
            window.state.content = `<!doctype html>
<html lang="en" dir="ltr" class="authored" data-theme="${theme}" style="--accent:#278776">
<head><title>Original title</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body { color:${theme === 'dark' ? '#e6f3ee' : '#172d25'};font:15px/1.6 system-ui;box-sizing:border-box }
body > header { padding:12px;border-bottom:2px solid var(--accent) }
body > main { min-height:0;overflow:auto;padding:12px }
body > footer { display:flex;gap:8px;padding:12px;border-top:1px solid #829b91 }
h1 { font-size:20px;margin:0 } p { margin:0 0 12px }
button,select,input { font:inherit;min-height:36px;max-width:100%;box-sizing:border-box }
button { background:var(--accent);color:white;border:0;padding:6px 12px;border-radius:6px }
button:disabled { opacity:.4 } label { display:block;margin-bottom:12px }
input { width:100% } dialog { width:75%;max-height:250px;box-sizing:border-box }
.dialog-scroll { height:100px;overflow:auto } .dialog-scroll p { height:400px }
html.authored body.reader > header h1 { color:var(--accent) }
</style></head>
<body id="reader" class="reader" data-owner="original" style="background:${background};height:440px;display:grid;grid-template-rows:auto 1fr auto;overflow:hidden;padding:8px;margin:4px"
onload="document.body.dataset.loaded='yes'">
<header><h1>Reading journal</h1><span id="count">0</span></header>
<main id="feed"><label>Note<input aria-label="Note" placeholder="Write a note"></label>
<label>View<select aria-label="View"><option>All</option><option>Saved</option></select></label>
${Array.from({ length: 12 }, (_, i) => `<p>Entry ${i + 1}: original layout and scrolling remain intact.</p>`).join('')}</main>
<footer><button id="add" onclick="document.querySelector('#count').textContent=Number(document.querySelector('#count').textContent)+1">Add</button>
<button id="open" onclick="document.querySelector('dialog').showModal()">Open</button><button disabled>Disabled</button></footer>
<dialog><button onclick="this.parentElement.close()">Close</button><div class="dialog-scroll"><p>Dialog scroll content</p></div></dialog>
<script>document.body.dataset.script='ran';document.getElementById('reader').dataset.found='yes';<\/script>
</body></html>`;
          },
          { theme, background, securityMode },
        );
        await frame.locator('#reader').waitFor();
        const structure = await frame.locator('body').evaluate(el => ({
          id: el.id,
          class: el.className,
          owner: el.dataset.owner,
          loaded: el.dataset.loaded,
          script: el.dataset.script,
          found: el.dataset.found,
          padding: getComputedStyle(el).padding,
          margin: getComputedStyle(el).margin,
          height: getComputedStyle(el).height,
          overflow: getComputedStyle(el).overflow,
          background: getComputedStyle(el).backgroundColor,
          parent: document.querySelector('#feed').parentElement.tagName,
          wrapper: !!document.getElementById('pc-frame-content'),
          lang: document.documentElement.lang,
          dir: document.documentElement.dir,
          rootClass: document.documentElement.className,
          theme: document.documentElement.dataset.theme,
          title: document.title,
        }));
        assert.equal(structure.id, 'reader');
        assert.equal(structure.class, 'reader');
        assert.equal(structure.owner, 'original');
        assert.equal(structure.parent, 'BODY');
        assert.equal(structure.wrapper, false);
        assert.equal(structure.lang, 'en');
        assert.equal(structure.dir, 'ltr');
        assert.equal(structure.rootClass, 'authored');
        assert.equal(structure.theme, theme);
        assert.equal(structure.title, 'Original title');
        assert.equal(structure.padding, '8px');
        assert.equal(structure.margin, '4px');
        assert.equal(structure.height, '440px');
        assert.equal(structure.overflow, 'hidden');
        assert.equal(structure.background, theme === 'dark' ? 'rgb(24, 37, 34)' : 'rgb(244, 248, 246)');
        assert.equal(await frame.locator('h1').evaluate(el => getComputedStyle(el).color), 'rgb(39, 135, 118)');
        await frame.getByRole('textbox', { name: 'Note' }).fill('Clicked and typed');
        await frame.getByRole('combobox', { name: 'View' }).selectOption('Saved');
        assert.equal(await frame.getByRole('button', { name: 'Disabled', exact: true }).isDisabled(), true);
        await frame.getByRole('button', { name: 'Add', exact: true }).click();
        if (securityMode === 'safe') {
          assert.equal(structure.script, undefined);
          assert.equal(structure.loaded, undefined);
          assert.equal(await frame.locator('#count').textContent(), '0');
        } else {
          assert.equal(structure.script, 'ran');
          assert.equal(structure.found, 'yes');
          await frame.locator('body[data-loaded="yes"]').waitFor();
          assert.equal(await frame.locator('#count').textContent(), '1');
          await frame.getByRole('button', { name: 'Open', exact: true }).click();
          assert.equal(await frame.locator('dialog').evaluate(el => el.open), true);
          await frame.locator('.dialog-scroll').hover();
          await page.mouse.wheel(0, 120);
          await page.waitForTimeout(150);
          assert.ok(await frame.locator('.dialog-scroll').evaluate(el => el.scrollTop > 0));
          await page.screenshot({ path: path.join(out, `document-${width}-${theme}-${securityMode}-dialog.png`) });
          await frame.getByRole('button', { name: 'Close', exact: true }).click();
        }
        await frame.locator('#feed').hover();
        await page.mouse.wheel(0, 180);
        await page.waitForTimeout(200);
        assert.ok(await frame.locator('#feed').evaluate(el => el.scrollTop > 0));
        assert.equal(await frame.locator('html').evaluate(el => el.scrollWidth <= innerWidth), true);
        assert.equal(await page.locator('.pc-frame-height-note').count(), 0);
        const frameHeight = await page.locator('iframe').evaluate(el => el.getBoundingClientRect().height);
        assert.ok(frameHeight >= 448 && frameHeight <= 450, `unexpected frame height ${frameHeight}`);
        await page.screenshot({ path: path.join(out, `document-${width}-${theme}-${securityMode}.png`) });
        console.log(
          `PASS full document ${width} ${theme} ${securityMode}: root attributes, direct children, styles, inputs, clicks, scrolling, stable height`,
        );
      }
      await page.evaluate(() => {
        window.state.securityMode = 'trusted';
      });
      for (const fullDocument of [false, true]) {
        for (const limited of [false, true]) {
          await page.evaluate(({ fullDocument, limited }) => {
            const markup = `<style>
              .accordion{overflow:hidden;border:1px solid #71877b;border-radius:6px}
              .accordion summary{padding:12px;cursor:pointer}
              .accordion-content{${limited ? 'height:180px;overflow-y:auto;' : ''}}
              .accordion-row{height:48px;box-sizing:border-box;padding:10px;border-bottom:1px solid #71877b}
            </style><details class="accordion"><summary>Accordion</summary><div class="accordion-content">${Array.from({length:20},(_,i)=>`<div class="accordion-row">Row ${i+1}</div>`).join('')}<button id="last-action" onclick="this.textContent='Done'">Last action</button></div></details>`;
            window.state.content = fullDocument ? `<!doctype html><html><body style="margin:0;overflow:hidden">${markup}</body></html>` : markup;
          }, { fullDocument, limited });
          const accordion = frame.locator('details');
          await accordion.waitFor();
          await page.waitForTimeout(350);
          const collapsed = await page.locator('iframe').evaluate(el => el.clientHeight);
          for (let cycle = 0; cycle < 2; cycle++) {
            await frame.locator('summary').click();
            await page.waitForTimeout(500);
            assert.equal(await accordion.evaluate(el => el.open), true);
            const geometry = await accordion.evaluate(el => ({
              bottom: el.getBoundingClientRect().bottom,
              viewport: innerHeight,
              panel: el.querySelector('.accordion-content').clientHeight,
            }));
            assert.ok(geometry.bottom <= geometry.viewport + 2, JSON.stringify(geometry));
            assert.ok(geometry.panel >= (limited ? 180 : 960));
            if (limited) {
              await frame.locator('.accordion-content').evaluate(el => { el.scrollTop = 0; });
              await frame.locator('.accordion-content').hover();
              await page.mouse.wheel(0, 220);
              await page.waitForTimeout(200);
              assert.ok(await frame.locator('.accordion-content').evaluate(el => el.scrollTop > 0));
            }
            await frame.locator('#last-action').click();
            assert.equal(await frame.locator('#last-action').textContent(), 'Done');
            await page.screenshot({ path: path.join(out, `accordion-${width}-${theme}-${fullDocument ? 'document' : 'fragment'}-${limited ? 'scroll' : 'natural'}-${cycle}.png`) });
            await frame.locator('summary').click();
            await page.waitForTimeout(500);
            assert.equal(await accordion.evaluate(el => el.open), false);
            const closedHeight = await page.locator('iframe').evaluate(el => el.clientHeight);
            if (Math.abs(closedHeight - collapsed) > 2) {
              const failure = `${width} ${theme} full=${fullDocument} limited=${limited} cycle=${cycle}: initial=${collapsed} closed=${closedHeight}`;
              accordionHeightFailures.push(failure);
              console.log(`HEIGHT MISMATCH ${failure}`);
            }
          }
          assert.equal(await page.locator('.pc-frame-height-note').count(), 0);
          console.log(`PASS accordion ${width} ${theme} full=${fullDocument} limited=${limited}: expand, last button, collapse, reopen${limited ? ', wheel scroll' : ''}`);
        }
      }
      await page.evaluate(() => {
        window.state.content =
          '<!doctype html><html style="color:rgb(210,220,230);background:rgb(20,30,40)"><body style="display:flex;flex-direction:column"><button onclick="this.nextElementSibling.style.height=\'500px\'">Expand</button><section style="height:100px">Inherited root color</section></body></html>';
      });
      await frame.getByText('Inherited root color').waitFor();
      assert.equal(await frame.locator('section').evaluate(el => getComputedStyle(el).color), 'rgb(210, 220, 230)');
      assert.equal(
        await frame.locator('body').evaluate(el => getComputedStyle(el).backgroundColor),
        'rgba(0, 0, 0, 0)',
      );
      assert.equal(await frame.locator('section').evaluate(el => el.parentElement.tagName), 'BODY');
      await frame.getByRole('button', { name: 'Expand' }).click();
      await page.waitForFunction(() => document.querySelector('iframe').getBoundingClientRect().height >= 500);
      assert.equal(await page.locator('.pc-frame-height-note').count(), 0);
      await page.evaluate(() => {
        window.state.content =
          '<html><body style="height:100vh;overflow:hidden;margin:0"><button>Viewport page</button></body></html>';
      });
      await frame.getByRole('button', { name: 'Viewport page' }).waitFor();
      const before = await page.locator('iframe').evaluate(el => el.getBoundingClientRect().height);
      await page.waitForTimeout(600);
      assert.equal(await page.locator('iframe').evaluate(el => el.getBoundingClientRect().height), before);
      assert.equal(await page.locator('.pc-frame-height-note').count(), 0);
      console.log(
        `PASS ${width} ${theme}: inherited root color, flex direct children, dynamic height, viewport height stability`,
      );
    }
  }
  await page.evaluate(() => {
    window.state.content =
      '<html><body><p>Keep source content</p><button onclick="throw new Error(\'fixture-click-error\')">Fail action</button></body></html>';
  });
  await page.frameLocator('iframe').getByRole('button', { name: 'Fail action' }).click();
  await page.getByRole('alert').filter({ hasText: 'fixture-click-error' }).waitFor();
  assert.equal(await page.frameLocator('iframe').getByText('Keep source content').count(), 1);
  await page.evaluate(() => {
    window.state.content = '<html><body>Recovered document</body></html>';
  });
  await page.frameLocator('iframe').getByText('Recovered document').waitFor();
  assert.equal(await page.locator('.pc-frame-height-note').count(), 0);
  assert.deepEqual(errors, ['fixture-click-error']);
  console.log('PASS script error feedback, retained content and successful remount recovery');
  assert.deepEqual(accordionHeightFailures, [], 'Accordion collapsed height must be stable across toggles');
} finally {
  await browser?.close();
  await server.close();
}
