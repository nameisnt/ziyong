/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';

const root = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1');

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(path)));
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) files.push(path);
  }
  return files;
}

const files = await collectSourceFiles(join(root, 'src'));
const sources = new Map(
  await Promise.all(files.map(async file => [relative(root, file).replaceAll('\\', '/'), await readFile(file, 'utf8')])),
);

test('failure reports are imported helpers, not methods on the phone store', () => {
  const offenders = [];
  for (const [file, source] of sources) {
    for (const match of source.matchAll(/phone\.(reportFailure|reportWarning)\(/gu)) {
      const line = source.slice(0, match.index).split('\n').length;
      offenders.push(`${file}:${line}`);
    }
  }
  assert.deepEqual(offenders, [], 'phone store has no reportFailure/reportWarning; import them from @/util/feedback');
});

test('catch blocks report the error they actually caught', () => {
  const offenders = [];
  for (const [file, source] of sources) {
    for (const match of source.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{/gu)) {
      const bound = match[1];
      const body = source.slice(match.index, match.index + 800);
      for (const call of body.matchAll(/report(?:Failure|Warning)\(\s*(?:'[^']*'|"[^"]*"|`[^`]*`)\s*,\s*([A-Za-z_$][\w$]*)\s*\)/gu)) {
        if (call[1] === 'error' && bound !== 'error') {
          const line = source.slice(0, match.index).split('\n').length;
          offenders.push(`${file}:${line} catches ${bound} but reports error`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], 'reportFailure(action, caught) must pass the caught binding');
});
