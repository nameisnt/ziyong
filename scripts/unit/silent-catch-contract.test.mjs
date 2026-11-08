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
  return body.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

function hasComment(body) {
  return /\/\/|\/\*/.test(body);
}

/** Splits a catch body into top-level statements so nested blocks stay intact. */
function splitStatements(body) {
  const statements = [];
  let current = '';
  let depth = 0;
  let quote = null;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote) {
      current += char;
      if (char === quote && body[index - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(' || char === '[' || char === '{') depth += 1;
    if (char === ')' || char === ']' || char === '}') depth -= 1;
    if (char === ';' && depth === 0) {
      statements.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter(Boolean);
}

/**
 * A statement that makes the failure disappear without saying anything:
 * a log call (dot or bracket access), a discarded `void` expression,
 * or a bare/literal `return`.
 */
const silentStatementPattern =
  /^(?:console(?:\.\w+|\[[^\]]+\])\s*\([\s\S]*\)|void\s+[\s\S]*|return(?:\s+(?:null|undefined|void\s+0|false|true))?|)$/u;

function isSilentStatement(statement) {
  return silentStatementPattern.test(statement.replace(/\s+/gu, ' ').trim());
}

/** True when the catch body only contains statements that hide the failure. */
export function isSwallowedCatchBody(body) {
  const statements = splitStatements(stripComments(body));
  if (statements.length === 0) return true;
  return statements.every(isSilentStatement);
}

function findCatchBlocks(source, offsetLines = 0) {
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
      line: offsetLines + source.slice(0, match.index).split('\n').length,
      body: source.slice(pattern.lastIndex, index - 1),
    });
    pattern.lastIndex = index;
  }
  return blocks;
}

test('the swallow detector covers logs, void discards and bare returns', () => {
  assert.equal(isSwallowedCatchBody(''), true, 'empty catch is swallowed');
  assert.equal(isSwallowedCatchBody('  // 说明\n'), true, 'comment-only body is swallowed');
  assert.equal(isSwallowedCatchBody('void 0;'), true, 'a discarded void expression is swallowed');
  assert.equal(isSwallowedCatchBody("console['error'](error);"), true, 'bracket-access logging is swallowed');
  assert.equal(isSwallowedCatchBody('console.warn(error); return;'), true, 'log plus bare return is swallowed');
  assert.equal(isSwallowedCatchBody('return null;'), true, 'returning a literal fallback is swallowed');
  assert.equal(isSwallowedCatchBody('void pending; return false;'), true, 'void plus literal return is swallowed');
  assert.equal(isSwallowedCatchBody('notifyFailure(error);'), false, 'reporting the failure is not swallowed');
  assert.equal(isSwallowedCatchBody('return recoverFrom(error);'), false, 'recovering with a computed value is not swallowed');
  assert.equal(isSwallowedCatchBody('if (verbose) throw error;'), false, 'rethrow or branch is not swallowed');
});

test('every swallowed catch explains itself', async () => {
  const files = await collectSources(sourceRoot);
  const violations = [];
  let scanned = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const block of findCatchBlocks(source)) {
      scanned += 1;
      if (!isSwallowedCatchBody(block.body)) continue;
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

test('the detection itself flags a freshly written silent catch', () => {
  const snippet = 'try { go(); } catch { void 0; }\ntry { go(); } catch { console.warn(1); return null; }';
  const blocks = findCatchBlocks(snippet);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks.map(block => isSwallowedCatchBody(block.body)), [true, true]);
  assert.deepEqual(blocks.map(block => block.line), [1, 2]);
});

test('the generation service leaves failure reporting to its callers', async () => {
  const service = await readFile(resolve(sourceRoot, 'core/generationService.ts'), 'utf8');

  assert.match(service, /throw error;/, 'generation failures must propagate instead of being logged and dropped');
  assert.doesNotMatch(
    service,
    /catch\s*(?:\([^)]*\))?\s*\{\s*console[.[]/,
    'generation service must not downgrade a failure into a console warning',
  );
});
