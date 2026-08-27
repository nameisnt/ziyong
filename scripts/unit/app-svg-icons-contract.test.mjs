/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/data/appSvgIcons.ts', import.meta.url), 'utf8');
const appIcon = await readFile(new URL('../../src/components/AppIcon.vue', import.meta.url), 'utf8');
const home = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');
const globalCss = await readFile(new URL('../../src/global.css', import.meta.url), 'utf8');
const compiled = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const library = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('home App entries resolve through the shared SVG icon library', () => {
  for (const icon of ['fa-briefcase', 'fa-book', 'fa-comments', 'fa-id-card', 'fa-sliders', 'fa-folder']) {
    assert.ok(library.getAppSvgIcon(icon), icon);
  }
  assert.match(appIcon, /v-else-if="svgPaths"/u);
  assert.match(appIcon, /class="pc-svg-app-icon"/u);
  assert.match(home, /<AppIcon/u);
});

test('paper themes apply distinct SVG stroke treatments', () => {
  for (const paper of ['a4', 'xuan', 'parchment', 'cardstock']) {
    assert.match(globalCss, new RegExp(`data-paper='${paper}'[^}]*pc-svg-app-icon`, 'su'));
  }
});
