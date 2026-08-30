/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/theater/TheaterMixedContent.vue', import.meta.url), 'utf8');

test('theater text segments override standalone reader-body scrolling inside mixed content', () => {
  assert.match(
    source,
    /\.pc-detail-content\.pc-rendered-markdown\.pc-theater-text-segment\)[\s\S]*?height:\s*auto[\s\S]*?overflow:\s*visible/u,
  );
  assert.match(source, /<FrontendFrame[\s\S]*?embedded/u, 'HTML blocks keep the existing embedded frame bridge');
  assert.match(source, /<FrontendFrame[\s\S]*?flush-content/u, 'HTML blocks do not add shared frame padding');
  assert.match(source, /<FrontendFrame[\s\S]*?document-flow/u, 'HTML blocks use document-flow height measurement');
});
