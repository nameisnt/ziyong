/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/data/appSvgIcons.ts', import.meta.url), 'utf8');
const identitySource = await readFile(new URL('../../src/data/appIdentitySvgIcons.ts', import.meta.url), 'utf8');
const identityImageSource = await readFile(new URL('../../src/data/appIdentityImageIcons.ts', import.meta.url), 'utf8');
const appIcon = await readFile(new URL('../../src/components/AppIcon.vue', import.meta.url), 'utf8');
const home = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');
const theme = await readFile(new URL('../../src/apps/theme/ThemeApp.vue', import.meta.url), 'utf8');
const globalCss = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const compiled = transpileModule(source.replace(/export \{[\s\S]*?\} from '\.\/appIdentitySvgIcons';\s*/u, ''), {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const library = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const identityCompiled = transpileModule(identitySource, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const identityLibrary = await import(`data:text/javascript;base64,${Buffer.from(identityCompiled).toString('base64')}`);

const expectedIdentityIds = [
  'app-builder',
  'archive',
  'bagu',
  'card-writer',
  'chat-insert',
  'content-converter',
  'diary',
  'digest',
  'entry-library',
  'extension-transfer',
  'extras',
  'favorites',
  'file-repository',
  'forum',
  'game-2048',
  'game-gomoku',
  'game-guess-number',
  'game-minesweeper',
  'game-nonogram',
  'game-reversi',
  'game-sliding-puzzle',
  'game-snake',
  'game-solitaire',
  'game-sudoku',
  'letters',
  'macro-builder',
  'mvu-modifier',
  'preset-link',
  'preset-manager',
  'profiles',
  'prompts',
  'reader',
  'recovery',
  'regex-display',
  'regex-wizard',
  'relationship',
  'script-manager',
  'settings',
  'stats',
  'status-display',
  'status-display-settings',
  'summary',
  'theater',
  'theme',
  'timekeeper',
  'tutorial',
  'workbench',
  'world-slots',
  'worldbook-link',
].sort();

const showcaseIdentityIds = [
  'macro-builder',
  'preset-link',
  'preset-manager',
  'reader',
  'script-manager',
  'theater',
  'world-slots',
  'worldbook-link',
];

function assertArtworkPaths(appId, artwork, label) {
  assert.ok(artwork.primary.length, `${appId}/${label}: primary`);
  for (const channel of ['primary', 'secondary', 'accent', 'fills']) {
    for (const path of artwork[channel] ?? []) assert.match(path, /^M/u, `${appId}/${label}/${channel}: ${path}`);
  }
}

test('home App entries resolve through the shared SVG icon library', () => {
  for (const icon of ['fa-briefcase', 'fa-book', 'fa-comments', 'fa-id-card', 'fa-sliders', 'fa-folder']) {
    assert.ok(library.getAppSvgIcon(icon), icon);
  }
  assert.match(appIcon, /v-else-if="svgPaths"/u);
  assert.match(appIcon, /class="pc-svg-app-icon"/u);
  assert.match(home, /<AppIcon/u);
});

test('custom assets and icon overrides keep priority over built-in App identity SVGs', () => {
  const imageIndex = appIcon.indexOf('v-if="source && !sourceFailed"');
  const identityImageIndex = appIcon.indexOf('v-if="identityImage && !identityImageFailed"');
  const identityIndex = appIcon.indexOf('v-else-if="identityIcon"');
  const genericSvgIndex = appIcon.indexOf('v-else-if="svgPaths"');
  const fontAwesomeIndex = appIcon.indexOf('<i v-else');

  assert.ok(imageIndex >= 0 && imageIndex < identityImageIndex);
  assert.ok(identityImageIndex < identityIndex);
  assert.ok(identityIndex < genericSvgIndex);
  assert.ok(genericSvgIndex < fontAwesomeIndex);
  assert.match(appIcon, /props\.icon !== props\.defaultIcon/u);
});

test('paper image identities use transparent 192px PNGs with SVG fallback', async () => {
  const papers = ['xuan', 'parchment', 'cardstock', 'graphite', 'velvet', 'cypress', 'sky', 'ocean'];

  assert.match(identityImageSource, /import\.meta\.glob\('\.\.\/assets\/app-icons\/\*\*\/\*\.png'/u);
  assert.match(appIcon, /getAppIdentityImageIcon/u);
  assert.match(appIcon, /pc-app-identity-image/u);
  assert.match(appIcon, /paper\.value === 'a4'/u);
  assert.match(appIcon, /\?\.\[paper\.value as AppImagePaper\]/u);
  assert.doesNotMatch(appIcon, /v-for="\(url, paper\) in identityImages"/u);

  for (const paper of papers) {
    for (const appId of expectedIdentityIds) {
      const png = await readFile(new URL(`../../src/assets/app-icons/${paper}/${appId}.png`, import.meta.url));
      assert.equal(png.readUInt32BE(16), 192, `${paper}/${appId}: width`);
      assert.equal(png.readUInt32BE(20), 192, `${paper}/${appId}: height`);
      assert.equal(png[25], 6, `${paper}/${appId}: RGBA color type`);
    }
  }
});

test('home, Dock, group management and theme App previews pass identity context', () => {
  assert.ok((home.match(/:app-id=/gu) || []).length >= 3);
  assert.ok((home.match(/:default-icon=/gu) || []).length >= 3);
  assert.ok((theme.match(/:app-id=/gu) || []).length >= 4);
  assert.ok((theme.match(/:default-icon=/gu) || []).length >= 4);
});

test('paper themes apply distinct SVG stroke treatments', () => {
  assert.match(globalCss, /\.pc-svg-icon-primary/u);
  assert.match(globalCss, /\.pc-svg-icon-secondary/u);
  assert.match(globalCss, /\.pc-svg-icon-accent/u);
  assert.match(globalCss, /\.pc-svg-icon-echo/u);
  assert.match(globalCss, /\.pc-svg-icon-fill/u);
  assert.match(appIcon, /icon\?\.paperVariants\?\.\[paper\.value\] \?\? icon/u);
  assert.match(appIcon, /`pc-svg-paper-variant-\$\{paper\}`/u);
});

test('all built-in Apps have unique identity SVG geometry', () => {
  const entries = Object.entries(identityLibrary.APP_IDENTITY_SVG_ICONS);
  assert.deepEqual(entries.map(([appId]) => appId).sort(), expectedIdentityIds);

  const signatures = entries.map(([, definition]) => JSON.stringify(definition));
  assert.equal(new Set(signatures).size, entries.length);

  entries.forEach(([appId, definition]) => {
    assertArtworkPaths(appId, definition, 'base');
  });
});

test('eight showcase Apps have four genuinely separate paper artworks', () => {
  for (const appId of showcaseIdentityIds) {
    const variants = identityLibrary.APP_IDENTITY_SVG_ICONS[appId].paperVariants;
    assert.deepEqual(Object.keys(variants).sort(), ['a4', 'cardstock', 'parchment', 'xuan'], appId);
    for (const [paper, artwork] of Object.entries(variants)) assertArtworkPaths(appId, artwork, paper);
    assert.equal(new Set(Object.values(variants).map(artwork => JSON.stringify(artwork))).size, 4, appId);
    assert.ok(variants.xuan.fills?.length, `${appId}/xuan: fills`);
    assert.ok(variants.cardstock.fills?.length, `${appId}/cardstock: fills`);
  }
});

test('identity SVGs define every supported paper stroke profile', () => {
  const profiles = identityLibrary.APP_SVG_STROKE_PROFILES;
  assert.deepEqual(Object.keys(profiles).sort(), [
    'a4',
    'cardstock',
    'cypress',
    'graphite',
    'ocean',
    'parchment',
    'sky',
    'velvet',
    'xuan',
  ]);
  assert.deepEqual(
    new Set(Object.values(profiles).map(profile => profile.texture)),
    new Set(['clean', 'crayon', 'engraved', 'ink']),
  );
  assert.equal(profiles.graphite.texture, 'clean');
  assert.equal(profiles.velvet.texture, 'engraved');
  assert.equal(profiles.cypress.texture, 'ink');
  assert.equal(profiles.sky.texture, 'crayon');
  assert.equal(profiles.ocean.texture, 'crayon');
});
