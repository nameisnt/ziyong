/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const appPath = new URL('../../src/apps/theme/ThemeApp.vue', import.meta.url);
const catalogPath = new URL('../../src/apps/theme/themeCatalog.ts', import.meta.url);
const [appSource, catalogSource] = await Promise.all([readFile(appPath, 'utf8'), readFile(catalogPath, 'utf8')]);
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
      ['clear-night', 'clear', 'midnight', 'soft'],
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

test('theme catalog values and array order remain byte-for-byte equivalent as runtime data', () => {
  const value = {
    themePacks: catalog.themePacks,
    fontOptions: catalog.fontOptions,
    iconOptions: catalog.iconOptions,
    iconStyleOptions: catalog.iconStyleOptions,
    builtinIconPacks: catalog.builtinIconPacks,
    colorControls: catalog.colorControls,
    radiusControls: catalog.radiusControls,
  };
  const signature = createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(signature, '8e22d23b016488ede2a89d1ff5c5ca82d54384eb4fd46f95ea7dd3c9a8602e18');
});
