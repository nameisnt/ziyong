/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const frame = await readFile(new URL('../../src/components/FrontendFrame.vue', import.meta.url), 'utf8');
const frontend = await readFile(new URL('../../src/util/theaterFrontend.ts', import.meta.url), 'utf8');

test('frontend document measures an isolated content wrapper instead of iframe viewport geometry', () => {
  assert.match(frontend, /id="pc-frame-content"/u);
  assert.match(frontend, /getElementById\('pc-frame-content'\)/u);
  assert.match(frontend, /content\.getBoundingClientRect\(\)\.height/u);
  assert.doesNotMatch(frontend, /root\?\.scrollHeight/u);
  assert.doesNotMatch(frontend, /setInterval\(postHeight/u);
});

test('frontend shell neutralizes document-height feedback while preserving natural content flow', () => {
  assert.match(frontend, /html, body \{[\s\S]*?height: auto !important;[\s\S]*?min-height: 0 !important;/u);
  assert.match(frontend, /#pc-frame-content \{[\s\S]*?display: flow-root;[\s\S]*?box-sizing: border-box;/u);
  assert.match(frontend, /viewportHeight: window\.innerHeight/u);
});

test('frontend frame rejects repeated viewport-following growth and exposes the limited state', () => {
  assert.match(frame, /heightLimited/u);
  assert.match(frame, /viewportHeight/u);
  assert.match(frame, /feedbackStreak/u);
  assert.match(frame, /网页高度异常，已停止自动扩张/u);
  assert.match(frame, /if \(nextHeight === frameHeight\.value\) return;/u);
});
