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
  assert.match(frontend, /documentFlow/u);
  assert.match(
    frontend,
    /#pc-frame-content > \[data-pc-frame-flow-root\] \{[\s\S]*?height: auto !important;[\s\S]*?max-height: none !important;/u,
  );
  assert.match(frontend, /getComputedStyle\(child\)\.position/u);
  assert.match(frontend, /position === 'static' \|\| position === 'relative'/u);
  assert.doesNotMatch(frontend, /#pc-frame-content, #pc-frame-content \*/u);
});

test('frontend frame rejects repeated viewport-following growth or shrinkage and exposes the limited state', () => {
  assert.match(frame, /heightLimited/u);
  assert.match(frame, /viewportHeight/u);
  assert.match(frame, /feedbackStreak/u);
  assert.match(frame, /lastFeedbackRatio/u);
  assert.match(frame, /repeatsSameDelta \|\| repeatsSameRatio/u);
  assert.match(frame, /网页高度异常，已停止自动调整/u);
  assert.match(frame, /if \(nextHeight === frameHeight\.value\) return;/u);
});

test('frontend frame repairs collapsed generated layouts and reports remaining layout or runtime failures', () => {
  assert.match(frontend, /getVisualHeight/u);
  assert.match(frontend, /data-pc-frame-collapsed/u);
  assert.match(frontend, /type: 'layout-state'/u);
  assert.match(frontend, /type: 'runtime-error'/u);
  assert.match(frame, /layoutCompatibilityState/u);
  assert.match(frame, /网页内容仍被生成样式隐藏/u);
  assert.match(frame, /网页脚本执行失败/u);
});
