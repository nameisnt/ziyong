/* eslint-disable import-x/no-nodejs-modules */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const output = fileURLToPath(new URL('../src/assets/resource-bundle-icons/', import.meta.url));
await mkdir(output, { recursive: true });
const shapes = {
  primary: 'M3 11h18v10H3z M3 11l3-3h12l3 3 M8 15h8v3H8z',
  secondary: 'M5 11V3h7v8 M14 11V2h5v9 M15.5 5h2 M15.5 7.5h2',
  accent: 'M7.5 6a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M6.5 10c0-2 4-2 4 0',
};
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 192, height: 192 }, deviceScaleFactor: 1 });
  for (const [name, colors] of Object.entries({
    modern: ['#17324d', '#2f80ed', '#ef5b5b', '#dceeff'],
    'modern-dark': ['#42464c', '#929aa5', '#e5e9ef', '#d8dde5'],
  })) {
    await page.setContent(`<style>html,body{margin:0;width:192px;height:192px;background:transparent}svg{width:192px;height:192px}path{fill:none;stroke-linecap:round;stroke-linejoin:round}</style>
      <svg viewBox="-1 -1 26 26" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 11h18v10H3z" style="fill:${colors[3]}"/>
      <g stroke="white" stroke-width="3">${Object.values(shapes)
        .map(d => `<path d="${d}"/>`)
        .join('')}</g>
      ${Object.values(shapes)
        .map((d, i) => `<path d="${d}" stroke="${colors[i]}" stroke-width="${i === 1 ? 1.38 : 1.72}"/>`)
        .join('')}
      </svg>`);
    await page.locator('svg').screenshot({ path: `${output}${name}.png`, omitBackground: true });
  }
} finally {
  await browser.close();
}
