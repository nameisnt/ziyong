/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readMaybe(url) {
  try {
    return await readFile(url, 'utf8');
  } catch {
    return '';
  }
}

const catalog = await readMaybe(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url));
const harness = await readMaybe(new URL('../../src/testing/visual-harness.ts', import.meta.url));
const scenario = await readMaybe(new URL('../../src/testing/visual/chatInsertScenarios.ts', import.meta.url));

test('chat insert has one dedicated isolated operation scenario', () => {
  assert.match(catalog, /chat-insert-operations/);
  assert.match(harness, /applyChatInsertVisualScenario/);
  assert.match(scenario, /name !== 'chat-insert-operations'/);
});

test('the scenario submits all four modes through the shared write confirmation', () => {
  for (const mode of ['new-end', 'new-before', 'append-last', 'append-message']) {
    assert.match(scenario, new RegExp(mode));
  }
  assert.match(scenario, /confirmChatInsertWrite/);
  assert.match(scenario, /createChatMessages/);
  assert.match(scenario, /setChatMessages/);
  assert.match(scenario, /saveChat/);
});
