/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const script = await readFile(new URL('../safe-push-dist.ps1', import.meta.url), 'utf8');

test('safe push preserves and verifies an existing clean local-ahead HEAD', () => {
  assert.match(script, /git merge-base --is-ancestor \$parent \$head/);
  assert.match(script, /index or worktree is not clean/);
  assert.match(script, /rev-parse', "\$head\^\{tree\}"/);
  assert.match(script, /candidate tree \(\$tree\) differs from local HEAD/);
  assert.match(script, /'push', 'origin', "\$head`:refs\/heads\/main"/);
  assert.match(script, /Expected \$head, got \$remoteHash/);
  assert.doesNotMatch(script, /DryRun is local-only and requires HEAD/);
});

test('non-interactive confirmation remains an explicit opt-in', () => {
  assert.match(script, /\[switch\]\$ConfirmPush/);
  assert.match(script, /if \(\$ConfirmPush\) \{ 'YES' \} else \{ Read-Host/);
});
