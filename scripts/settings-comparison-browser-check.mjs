/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const server = await createServer({
  configFile: false,
  root,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { host: '127.0.0.1', port: 0 },
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route(`http://127.0.0.1:${address.port}/`, route =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Isolated settings comparison test</title>',
    }),
  );
  await page.goto(`http://127.0.0.1:${address.port}/`);
  const result = await page.evaluate(async () => {
    // Browser URL served by the isolated Vite server, not a Node module path.
    // eslint-disable-next-line import-x/no-unresolved
    const { createSettingsComparisonClient } = await import('/src/apps/recovery/settingsComparisonClient.ts');
    const client = createSettingsComparisonClient();
    const bytes = new TextEncoder().encode(
      JSON.stringify({ payload: 'x'.repeat(84 * 1024 * 1024), theme: 'dark' }),
    ).buffer;
    let ticks = 0;
    let longestGap = 0;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      longestGap = Math.max(longestGap, now - last);
      last = now;
      ticks += 1;
    }, 10);
    const started = performance.now();
    try {
      for (let i = 0; i < 3; i += 1)
        await client.add(bytes.slice(0), { name: `synthetic-${i}`, date: i + 1, size: bytes.byteLength });
      const groups = await client.finish(100);
      const elapsed = performance.now() - started;
      const controller = new AbortController();
      const cancelled = createSettingsComparisonClient(controller.signal);
      let cancellation;
      try {
        const pending = cancelled.add(bytes.slice(0), { name: 'cancel', date: 4, size: bytes.byteLength });
        controller.abort();
        await pending;
      } catch (error) {
        cancellation = error.name;
      } finally {
        cancelled.dispose();
      }
      return { bytes: bytes.byteLength, files: 3, elapsed, ticks, longestGap, cancellation, groups };
    } finally {
      clearInterval(timer);
      client.dispose();
    }
  });
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].keeper.summary.name, 'synthetic-2');
  assert.equal(result.groups[0].duplicates.length, 2);
  assert.equal(result.cancellation, 'AbortError');
  assert.ok(result.ticks > 0, 'Main thread must continue processing events');
  assert.ok(JSON.stringify(result.groups).length < 2000, 'UI must receive only compact metadata');
  await mkdir(resolve(root, 'tmp/settings-similarity'), { recursive: true });
  await writeFile(resolve(root, 'tmp/settings-similarity/worker-browser.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
