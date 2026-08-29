/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('registered App pages load asynchronously while their capabilities register synchronously', async () => {
  const builtin = await source('src/apps/builtin.ts');
  assert.doesNotMatch(builtin, /import\s+\w+App\s+from\s+['"][^'"]+\.vue['"]/u);
  assert.equal((builtin.match(/defineAsyncComponent\(\(\) => import\(/gu) || []).length, 13);

  const appDirectories = await readdir(new URL('../../src/apps/', import.meta.url), { withFileTypes: true });
  for (const directory of appDirectories.filter(entry => entry.isDirectory())) {
    let indexSource = '';
    try {
      indexSource = await source(`src/apps/${directory.name}/index.ts`);
    } catch {
      continue;
    }
    if (!/component:\s*\w+App/u.test(indexSource)) continue;
    assert.match(indexSource, /defineAsyncComponent\(\(\) => import\([^)]*\.vue'\)\)/u, directory.name);
    assert.doesNotMatch(indexSource, /import\s+\w+App\s+from\s+['"][^'"]+\.vue['"]/u, directory.name);
  }
});

test('hidden and cached phone pages stop expensive foreground work', async () => {
  const [overlay, activity, status, snake] = await Promise.all([
    source('src/components/PhoneOverlay.vue'),
    source('src/components/home/HomeActivityPage.vue'),
    source('src/apps/status-display/StatusDisplayApp.vue'),
    source('src/apps/game-2048/SnakeGame.vue'),
  ]);

  assert.match(overlay, /v-if="isOpen && currentRoute\.appId === 'home'"/u);
  assert.match(overlay, /<KeepAlive :max="3">/u);
  assert.match(activity, /taskActivityRevision/u);
  assert.doesNotMatch(activity, /deep:\s*true/u);
  assert.match(status, /onDeactivated\(stopRuntime\)/u);
  assert.match(snake, /onDeactivated\(stopRuntime\)/u);
});

test('App icons render only the selected paper image', async () => {
  const appIcon = await source('src/components/AppIcon.vue');
  assert.match(appIcon, /v-if="identityImage && !identityImageFailed"/u);
  assert.match(appIcon, /paper\.value === 'a4'/u);
  assert.doesNotMatch(appIcon, /v-for="\(url, paper\) in identityImages"/u);
});
