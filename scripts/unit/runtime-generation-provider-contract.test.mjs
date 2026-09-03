/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/util/runtime.ts', import.meta.url), 'utf8');

function readFunction(name, nextName) {
  const start = source.indexOf(`export function ${name}`);
  const end = source.indexOf(`\nexport function ${nextName}`, start);
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${nextName} must follow ${name}`);
  return source.slice(start, end);
}

test('Tavern generation wrappers bypass incompatible SillyTavern context functions', () => {
  const generateSource = readFunction('generateSafe', 'generateRawSafe');
  const generateRawSource = readFunction('generateRawSafe', 'registerMacroLikeSafe');

  assert.match(generateSource, /requiredTavernHelperMethod<[^;]+>\('generate'\)/su);
  assert.doesNotMatch(generateSource, /requiredGlobalFunction|getOptionalGlobalFunction/u);
  assert.match(generateRawSource, /requiredTavernHelperMethod<[^;]+>\('generateRaw'\)/su);
  assert.doesNotMatch(generateRawSource, /requiredGlobalFunction|getOptionalGlobalFunction/u);
});
