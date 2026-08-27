/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [serviceSource, editorSource, taskSource, backupSource, migrationSource] = await Promise.all([
  readFile(new URL('../../src/core/generationService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/components/RawOutputEditor.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/store/generationTasks.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/builtinBackup.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/util/previewDraftMigration.ts', import.meta.url), 'utf8'),
]);

test('generation keeps the complete model output while parsing a cleaned temporary input', () => {
  assert.match(serviceSource, /originalOutput:\s*normalized\.content/);
  assert.match(
    serviceSource,
    /const rawOutput = cleanedOutput\.originalOutput;\s*const parseInput = cleanedOutput\.content;/,
  );
  assert.match(serviceSource, /adapter\.parse\(parseInput, prepared\.parsedConfig\)/);
  assert.match(serviceSource, /rawOutputSemantics:\s*'original-v1'/);
  assert.doesNotMatch(serviceSource, /rawOutput:\s*parsed\.raw/);
});

test('raw editor forwards user content unchanged to the owning reparser', () => {
  assert.match(editorSource, /function requestReparse\(\)\s*\{\s*emit\('reparse'\);/);
  assert.doesNotMatch(editorSource, /cleanGenerationOutput|useSettingsStore/);
});

test('task and backup migrations distinguish legacy raw records from new complete outputs', () => {
  assert.match(taskSource, /rawOutputSemantics:\s*'original-v1'/);
  assert.match(taskSource, /rawOutputSemantics: task\.rawOutputSemantics \?\? 'legacy-unknown'/);
  assert.match(
    backupSource,
    /key:\s*'generation-tasks'[\s\S]*?migrateImport:\s*migrateGenerationTasksBackupData[\s\S]*?schemaVersion:\s*3/,
  );
  assert.match(migrationSource, /rawOutputSemantics: draft\.rawOutputSemantics \?\? 'legacy-unknown'/);
});
