/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/components/reader/useReaderChatSession.ts', import.meta.url), 'utf8');

test('Reader fallback navigation cannot replace a ChatArchive detail route after an async load', () => {
  assert.match(
    source,
    /phone\.currentRoute\.appId === 'reader'\s*&&\s*phone\.currentRoute\.page === 'detail'/u,
    'Reader fallback must require that the active detail route still belongs to Reader',
  );
  assert.match(source, /phone\.replacePage\('detail'/u);
});
