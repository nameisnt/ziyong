/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [html, harness, bootstrap, visualBaseline, appearanceBaseline] = await Promise.all([
  readFile(new URL('../../visual-harness.html', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual-harness.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual-bootstrap.ts', import.meta.url), 'utf8'),
  readFile(new URL('../baselines/ui-visual.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../baselines/ui-appearance.json', import.meta.url), 'utf8').then(JSON.parse),
]);

test('visual bootstrap is the single owner of global fixture installation', () => {
  assert.match(html, /src="\/src\/testing\/visual-bootstrap\.ts"/u);
  assert.match(html, /src="\/src\/testing\/visual-harness\.ts"/u);
  assert.ok(html.indexOf('visual-bootstrap.ts') < html.indexOf('visual-harness.ts'));

  assert.match(harness, /import \{ setupVisualGlobals \} from '@\/testing\/visual-bootstrap'/u);
  assert.match(
    harness,
    /const \{ setReaderFixtureReasoning, setReaderFixtureSwipes \} = setupVisualGlobals\(\);/u,
  );
  assert.doesNotMatch(harness, /function (?:getByPath|setByPath|setupVisualGlobals)/u);
  assert.doesNotMatch(harness, /Object\.assign\(globalThis/u);

  assert.match(bootstrap, /export function setupVisualGlobals/u);
  assert.match(bootstrap, /Object\.assign\(globalThis, visualBaseGlobals\)/u);
  assert.match(bootstrap, /Object\.assign\(globalThis, \{/u);
  assert.match(bootstrap, /return \{ setReaderFixtureReasoning, setReaderFixtureSwipes \}/u);
  assert.match(bootstrap, /SillyTavern:/u);
  assert.match(bootstrap, /TavernHelper:/u);
});

test('bootstrap extraction keeps the registered visual evidence cardinality', () => {
  assert.equal(visualBaseline.scenarioCount, 314);
  assert.equal(visualBaseline.runs.length, 942);
  assert.deepEqual(visualBaseline.sizes, ['350x700', '390x844', '430x900']);
  assert.equal(appearanceBaseline.evidence.length, 15);
});
