/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = {
  digest: await readFile(new URL('../../src/apps/digest/DigestApp.vue', import.meta.url), 'utf8'),
  gallery: await readFile(new URL('../../src/apps/gallery/GalleryApp.vue', import.meta.url), 'utf8'),
  global: await readFile(new URL('../../src/global.css', import.meta.url), 'utf8'),
  media: await readFile(new URL('../../src/apps/media/MediaGenerateApp.vue', import.meta.url), 'utf8'),
  video: await readFile(new URL('../../src/apps/video/VideoApp.vue', import.meta.url), 'utf8'),
  workbench: await readFile(new URL('../../src/apps/workbench/WorkbenchApp.vue', import.meta.url), 'utf8'),
};

function rulesFor(source, selector) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].split(',').some(item => item.trim() === selector))
    .map(match => match[2]);
}

function minHeightsFor(source, selector) {
  return rulesFor(source, selector).flatMap(body =>
    [...body.matchAll(/(?:^|;)\s*min-height\s*:\s*([^;{}]+)/g)].map(match => match[1].trim()),
  );
}

test('short textareas inherit the shared 96px compact-area density', () => {
  const failures = [];
  const sharedHeights = minHeightsFor(files.global, '.pc-phone-root .pc-area.compact');
  if (!sharedHeights.includes('96px')) failures.push('shared compact textarea does not define min-height: 96px');

  const localTargets = [
    ['digest .pc-area.compact', files.digest, '.pc-area.compact'],
    ['gallery .pc-area.compact', files.gallery, '.pc-area.compact'],
    ['media .pc-param-preview-area', files.media, '.pc-param-preview-area'],
    ['media .pc-area.compact', files.media, '.pc-area.compact'],
    ['video .pc-area.compact', files.video, '.pc-area.compact'],
    ['workbench direct compact area', files.workbench, '.pc-step-body > .pc-area.compact'],
  ];

  for (const [label, source, selector] of localTargets) {
    const heights = minHeightsFor(source, selector);
    if (heights.length) failures.push(`${label} still overrides min-height with ${heights.join(', ')}`);
  }

  assert.deepEqual(failures, []);
});
