/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { readConfigFile, parseJsonConfigFileContent, sys } from 'typescript';

test('TypeScript root files and aliases stay within the project', () => {
  const root = resolve(import.meta.dirname, '../..');
  const config = readConfigFile(resolve(root, 'tsconfig.json'), sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = parseJsonConfigFileContent(config.config, sys, root);
  assert.equal(parsed.errors.length, 0);
  assert.ok(parsed.fileNames.length > 0);
  for (const file of parsed.fileNames) {
    const path = relative(root, file);
    assert.ok(!isAbsolute(path) && !path.startsWith('..'), `external root file: ${file}`);
  }
  assert.equal(config.config.compilerOptions.paths['@sillytavern/*'], undefined);
  assert.equal(parsed.options.skipLibCheck, undefined);
});

test('host globals use explicit declarations and toastr is not generated twice', async () => {
  const root = new URL('../../', import.meta.url);
  const declarations = await readFile(new URL('global.d.ts', root), 'utf8');
  for (const module of ['script', 'scripts/extensions', 'scripts/i18n']) {
    assert.ok(declarations.includes(`declare module '@sillytavern/${module}'`));
  }
  const imports = await readFile(new URL('auto-imports.d.ts', root), 'utf8');
  assert.doesNotMatch(imports, /const toastr:/u);
  const vite = await readFile(new URL('vite.config.ts', root), 'utf8');
  assert.match(vite, /ignoreDts: \['toastr'\]/u);
  assert.match(vite, /from: 'toastr', imports:/u);
});
