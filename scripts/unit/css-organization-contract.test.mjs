/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

async function readVueSources(directory = new URL('../../src/', import.meta.url)) {
  const entries = await readdir(directory, { withFileTypes: true });
  const sources = [];
  for (const entry of entries) {
    const url = new URL(entry.name, directory);
    if (entry.isDirectory()) {
      sources.push(...(await readVueSources(new URL(`${entry.name}/`, directory))));
    } else if (entry.name.endsWith('.vue')) {
      sources.push({ source: await readFile(url, 'utf8'), url });
    }
  }
  return sources;
}

const [globalCss, detailFooter, theaterCatalog, baguScan, favorites, phoneOverlay] = await Promise.all([
  readSource('src/global.css'),
  readSource('src/components/DetailFooter.vue'),
  readSource('src/apps/theater/TheaterCatalogPage.vue'),
  readSource('src/components/BaguScanPanel.vue'),
  readSource('src/apps/favorites/FavoritesApp.vue'),
  readSource('src/components/PhoneOverlay.vue'),
]);

test('shared search wrappers own a single transparent-inner control surface', () => {
  assert.match(globalCss, /\.pc-search-field > input \{[\s\S]*background: transparent;/u);
  assert.doesNotMatch(globalCss, /\.pc-search-field > input \{[^}]*background[^;]*!important;/u);
  assert.match(globalCss, /:not\(\[type='search'\]\)/u);
  assert.match(theaterCatalog, /class="pc-search-field"/u);
  assert.match(baguScan, /class="pc-search-field pc-bagu-search"/u);
  assert.doesNotMatch(theaterCatalog, /^\.pc-search\s*\{/mu);
  assert.doesNotMatch(baguScan, /^\.pc-bagu-search input\s*\{/mu);
  assert.doesNotMatch(favorites, /^\.favorite-select\s*\{/mu);
});

test('form controls keep paper texture visible while popup surfaces remain readable', () => {
  const rootStyle = phoneOverlay.match(/const rootStyle = computed\(\(\) => \{([\s\S]*?)\n\}\);/u)?.[1] ?? '';

  assert.match(rootStyle, /const darkTheme = settings\.value\.theme === 'dark'/u);
  assert.match(rootStyle, /const strongSurface = cssColor\(visualTheme\.surfaceStrongColor\)/u);
  assert.match(
    rootStyle,
    /'--pc-form-control-bg':\s*`color-mix\(in srgb, \$\{strongSurface\} 62%, transparent 38%\)`/u,
  );
  assert.match(rootStyle, /'--pc-form-control-popup-bg':\s*strongSurface/u);
  assert.match(rootStyle, /'--pc-form-control-text':\s*darkTheme \? '#f5f5f7' : cssColor\(visualTheme\.textColor\)/u);
  assert.match(phoneOverlay, /\.pc-phone-root\[data-theme='light'\][\s\S]*--pc-form-control-bg:\s*#ffffff/u);
  assert.match(phoneOverlay, /\.pc-phone-root\[data-theme='dark'\][\s\S]*--pc-form-control-bg:\s*#2c2c2e/u);
  assert.match(globalCss, /\.pc-search-field\s*\{[\s\S]*background:\s*var\(--pc-form-control-bg\)/u);
  assert.match(globalCss, /select option, select optgroup[\s\S]*var\(--pc-form-control-popup-bg\)/u);
});

test('DetailFooter is the only owner of detail footer layout and action columns', () => {
  assert.doesNotMatch(globalCss, /\.pc-phone-root \.pc-detail-footer\s*\{/u);
  assert.match(detailFooter, /showNavigation\?: boolean/u);
  assert.match(detailFooter, /\.pc-detail-actions\.six/u);
});

test('shared page shells and global button states are not redefined in App styles', async () => {
  assert.match(globalCss, /\.pc-phone-root \.pc-app-fill\s*\{/u);
  assert.match(globalCss, /\.pc-phone-root \.pc-page-stack\s*\{/u);
  assert.match(globalCss, /\.pc-phone-root \.pc-page-grid\s*\{/u);

  const legacyPageBodies = [
    /display:\s*flex;\s*min-height:\s*100%;\s*flex-direction:\s*column;\s*gap:\s*14px;/u,
    /display:\s*grid;\s*min-height:\s*100%;\s*align-content:\s*start;\s*gap:\s*14px;/u,
  ];

  for (const { source, url } of await readVueSources()) {
    const style = source.match(/<style\b[^>]*>([\s\S]*?)<\/style>/u)?.[1] || '';
    assert.doesNotMatch(style, /^\s*\.pc-(?:soft-btn|icon-btn)\.danger\s*\{/mu, url.pathname);
    assert.doesNotMatch(source, /<style scoped>\s*<\/style>/u, url.pathname);
    for (const legacyBody of legacyPageBodies) {
      assert.doesNotMatch(style, legacyBody, url.pathname);
    }
  }
});
