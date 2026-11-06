/* eslint-disable import-x/no-nodejs-modules */
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = await readFile(resolve(root, 'src/data/appIdentitySvgIcons.ts'), 'utf8');
const compiled = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const { APP_IDENTITY_SVG_ICONS } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const outputDirectory = resolve(root, 'src/assets/app-icons/a4');

function paths(values = []) {
  return values.map(path => `<path d="${path}"/>`).join('');
}

function render(artwork) {
  const allStrokes = [...artwork.primary, ...(artwork.secondary ?? []), ...(artwork.accent ?? [])];
  return `<!doctype html>
<style>
  html, body { width: 192px; height: 192px; margin: 0; overflow: hidden; background: transparent; }
  svg { display: block; width: 192px; height: 192px; overflow: visible; filter: drop-shadow(0 1px 0 rgba(23, 50, 77, .12)); }
  path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .fill path { fill: #dceeff; stroke: none; opacity: .9; }
  .underlay path { stroke: rgba(255, 255, 255, .92); stroke-width: 2.65; }
  .primary path { stroke: #17324d; stroke-width: 1.72; }
  .secondary path { stroke: #2f80ed; stroke-width: 1.38; }
  .accent path { stroke: #ef5b5b; stroke-width: 1.92; }
</style>
<svg viewBox="-1 -1 26 26" xmlns="http://www.w3.org/2000/svg">
  <g class="fill">${paths(artwork.fills)}</g>
  <g class="underlay">${paths(allStrokes)}</g>
  <g class="primary">${paths(artwork.primary)}</g>
  <g class="secondary">${paths(artwork.secondary)}</g>
  <g class="accent">${paths(artwork.accent)}</g>
</svg>`;
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 192, height: 192 }, deviceScaleFactor: 1 });
  for (const [appId, definition] of Object.entries(APP_IDENTITY_SVG_ICONS)) {
    await page.setContent(render(definition.paperVariants?.a4 ?? definition));
    await page.locator('svg').screenshot({ path: resolve(outputDirectory, `${appId}.png`), omitBackground: true });
  }
} finally {
  await browser.close();
}

console.log(`Generated ${Object.keys(APP_IDENTITY_SVG_ICONS).length} modern A4 App icons.`);
