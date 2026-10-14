/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const frame = await readFile(new URL('../../src/components/FrontendFrame.vue', import.meta.url), 'utf8');
const frontend = await readFile(new URL('../../src/util/theaterFrontend.ts', import.meta.url), 'utf8');
const theater = await readFile(new URL('../../src/apps/theater/TheaterMixedContent.vue', import.meta.url), 'utf8');

test('theater opts into transparent backgrounds without changing other frame defaults', () => {
  assert.match(theater, /\s+transparent-background\s/u);
  assert.match(frame, /transparentBackground: false/u);
  assert.match(frame, /transparentBackground: props\.transparentBackground/u);
  assert.match(frame, /\.pc-frame-shell\.transparent-background\s*\{\s*background: transparent;/u);
  assert.match(frontend, /transparentBackground \? 'transparent' : palette\.background/u);
});

test('HTML fragments measure an isolated content wrapper instead of iframe viewport geometry', () => {
  assert.match(frontend, /id="pc-frame-content"/u);
  assert.match(frontend, /getElementById\('pc-frame-content'\)/u);
  assert.match(frontend, /content\.getBoundingClientRect\(\)\.height/u);
  assert.doesNotMatch(frontend, /root\?\.scrollHeight/u);
  assert.doesNotMatch(frontend, /setInterval\(postHeight/u);
});

test('full documents retain their root tree and attributes instead of being wrapped as fragments', () => {
  assert.match(frontend, /fullDocument: hasDocumentShell\(rawHtml\)/u);
  assert.match(frontend, /document\.documentElement\.outerHTML/u);
  assert.match(frontend, /FULL_DOCUMENT \? document\.body : document\.getElementById/u);
  assert.match(frontend, /createResizeBridgeScript\(options\.channelId, false, true\)/u);
  assert.match(frontend, /:where\(html\)/u);
  assert.match(frontend, /if \(securityMode === 'safe'\) stripUntrustedBehavior\(document\)/u);
});

test('fragment shell neutralizes document-height feedback while preserving natural content flow', () => {
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
  assert.match(frontend, /flowHeight <= 80 \? Math\.max\(flowHeight, getVisualHeight\(\)\) : flowHeight/u);
  assert.match(frontend, /attributeFilter: \["class", "style", "hidden", "open"\]/u);
  assert.match(frontend, /data-pc-frame-collapsed/u);
  assert.match(frontend, /type: 'layout-state'/u);
  assert.match(frontend, /type: 'runtime-error'/u);
  assert.match(frame, /layoutCompatibilityState/u);
  assert.match(frame, /网页内容仍被生成样式隐藏/u);
  assert.match(frame, /网页脚本执行失败/u);
});

test('closed accordions are excluded from visual measurement and normal visible text prevents layout repair', () => {
  assert.match(frontend, /child\.tagName !== 'DETAILS'/u);
  assert.match(frontend, /parent\.tagName !== "DETAILS" \|\| parent\.open/u);
  assert.match(frontend, /summary\?\.contains\(element\)/u);
  assert.match(frontend, /if \(isCollapsedContent\(element\)\) continue/u);
  assert.match(frontend, /if \(isCollapsedContent\(node\.parentElement\)\) continue/u);
  assert.match(frontend, /measuredHeight > 80 \|\| hasVisibleText\(\)/u);
});
