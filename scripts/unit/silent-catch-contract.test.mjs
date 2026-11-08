/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourceRoot = resolve(root, 'src');

async function collectSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSources(full)));
    else if (/\.(ts|vue)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function stripComments(body) {
  return body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
}

function hasComment(body) {
  return /\/\/|\/\*/.test(body);
}

/** Removes every `console.x(...)` call (balanced parens) so only "real" statements remain. */
function withoutConsoleCalls(body) {
  let result = '';
  let index = 0;
  while (index < body.length) {
    const call = /console\.[a-z]+\(/.exec(body.slice(index));
    if (!call) {
      result += body.slice(index);
      break;
    }
    result += body.slice(index, index + call.index);
    let cursor = index + call.index + call[0].length;
    let depth = 1;
    while (cursor < body.length && depth > 0) {
      if (body[cursor] === '(') depth += 1;
      else if (body[cursor] === ')') depth -= 1;
      cursor += 1;
    }
    if (body[cursor] === ';') cursor += 1;
    index = cursor;
  }
  return result.trim();
}

function findCatchBlocks(source) {
  const blocks = [];
  const pattern = /catch\s*(?:\([^)]*\))?\s*\{/g;
  let match;
  while ((match = pattern.exec(source))) {
    let index = pattern.lastIndex;
    let depth = 1;
    while (index < source.length && depth > 0) {
      if (source[index] === '{') depth += 1;
      else if (source[index] === '}') depth -= 1;
      index += 1;
    }
    blocks.push({
      line: source.slice(0, match.index).split('\n').length,
      body: source.slice(pattern.lastIndex, index - 1),
    });
    pattern.lastIndex = index;
  }
  return blocks;
}

test('every swallowed catch explains itself', async () => {
  const files = await collectSources(sourceRoot);
  const violations = [];
  let scanned = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const block of findCatchBlocks(source)) {
      scanned += 1;
      const cleaned = stripComments(block.body);
      const onlyLogs = cleaned !== '' && withoutConsoleCalls(cleaned) === '';
      const swallowed = cleaned === '' || onlyLogs;
      if (!swallowed) continue;
      if (hasComment(block.body)) continue;
      violations.push(`${relative(root, file).split('\\').join('/')}:${block.line}`);
    }
  }

  assert.ok(scanned > 300, `expected to scan the whole source tree, only saw ${scanned} catch blocks`);
  assert.deepEqual(
    violations,
    [],
    `silent catches must carry a comment explaining why the failure is safe to swallow: ${violations.join(', ')}`,
  );
});

test('the generation service leaves failure reporting to its callers', async () => {
  const service = await readFile(resolve(sourceRoot, 'core/generationService.ts'), 'utf8');

  assert.match(service, /throw error;/, 'generation failures must propagate instead of being logged and dropped');
  assert.doesNotMatch(
    service,
    /catch\s*(?:\([^)]*\))?\s*\{\s*console\.(?:error|warn)\(/,
    'generation service must not downgrade a failure into a console warning',
  );
});
