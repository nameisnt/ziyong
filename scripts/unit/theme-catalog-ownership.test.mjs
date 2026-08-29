/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const appPath = new URL('../../src/apps/theme/ThemeApp.vue', import.meta.url);
const catalogPath = new URL('../../src/apps/theme/themeCatalog.ts', import.meta.url);
const settingsStorePath = new URL('../../src/store/settings.ts', import.meta.url);
const [appSource, catalogSource, settingsStoreSource] = await Promise.all([
  readFile(appPath, 'utf8'),
  readFile(catalogPath, 'utf8'),
  readFile(settingsStorePath, 'utf8'),
]);
const catalogModule = transpileModule(catalogSource, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const catalog = await import(`data:text/javascript;base64,${Buffer.from(catalogModule).toString('base64')}`);

test('ThemeApp consumes one static catalog instead of owning duplicate declarations', () => {
  assert.match(appSource, /from ['"]\.\/themeCatalog['"]/);
  for (const declaration of [
    'type VisualTheme =',
    'type RadiusKey =',
    'type ColorKey =',
    'type IconStyleId =',
    'interface ThemePreset',
    'interface ThemePack',
    'interface BuiltinIconPack',
    'const themePresets',
    'const themePacks',
    'const fontOptions',
    'const iconOptions',
    'const iconStyleOptions',
    'const builtinIconPacks',
    'const colorControls',
    'const radiusControls',
  ]) {
    assert.doesNotMatch(appSource, new RegExp(declaration), declaration);
  }

  assert.doesNotMatch(catalogSource, /useSettingsStore|usePhoneStore|storeToRefs|\b(?:ref|computed|watch)\s*\(/);
});

test('theme and icon catalog identities keep their established order', () => {
  assert.deepEqual(
    catalog.themePacks.map(pack => [pack.id, pack.light.id, pack.dark.id, pack.iconStyle]),
    [
      ['clear-night', 'clear', 'graphite', 'soft'],
      ['rose-velvet', 'soft', 'velvet', 'soft'],
      ['mint-cypress', 'mint', 'cypress', 'unified'],
      ['sky-ocean', 'sky', 'ocean', 'unified'],
    ],
  );
  assert.deepEqual(
    catalog.builtinIconPacks.map(pack => pack.id),
    ['native', 'writing', 'workspace', 'media'],
  );
  assert.deepEqual(
    catalog.iconStyleOptions.map(option => option.id),
    ['native', 'soft', 'unified'],
  );
  assert.deepEqual(
    catalog.colorControls.map(control => control.key),
    ['accentColor', 'backgroundColor', 'surfaceColor', 'appIconColor', 'appIconBackgroundColor', 'dockColor'],
  );
  assert.deepEqual(
    catalog.radiusControls.map(control => [control.key, control.min, control.max]),
    [
      ['cardRadius', 8, 32],
      ['controlRadius', 8, 28],
      ['iconRadius', 8, 24],
    ],
  );
});

test('theme presets declare one supported paper texture', () => {
  const supportedTextures = new Set([
    'a4',
    'graphite',
    'parchment',
    'velvet',
    'xuan',
    'cypress',
    'sky',
    'ocean',
    'cardstock',
  ]);
  const presets = catalog.themePacks.flatMap(pack => [pack.light, pack.dark]);
  assert.ok(presets.length > 0);
  presets.forEach(preset => assert.ok(supportedTextures.has(preset.paperTextureId)));
});

test('legacy built-in theme profiles migrate paper identity without rewriting custom colors', () => {
  assert.match(settingsStoreSource, /visualTheme\.paperTextureId === 'a4' && background === '#eaf6ff'/u);
  for (const paper of ['ocean', 'cypress', 'graphite', 'velvet']) {
    assert.match(settingsStoreSource, new RegExp(`'#[0-9a-f]{6}': '${paper}'`, 'u'));
  }
  assert.match(settingsStoreSource, /\?\? 'cardstock'/u);
});

test('visual theme reset keeps the modern A4 and graphite pair', () => {
  assert.match(settingsStoreSource, /paperTextureId: settings\.value\.theme === 'dark' \? 'graphite' : 'a4'/u);
});
