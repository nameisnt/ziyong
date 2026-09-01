/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const [idleTask, fileRepository, floorBackup, generationTasks, statusDisplay] = await Promise.all([
  source('src/util/idleTask.ts'),
  source('src/store/fileRepository.ts'),
  source('src/util/chatFloorBackup.ts'),
  source('src/store/generationTasks.ts'),
  source('src/apps/status-display/StatusDisplayApp.vue'),
]);

test('idle background work uses one scheduler with a timer fallback', () => {
  assert.match(idleTask, /typeof window\.requestIdleCallback === 'function'/u);
  assert.match(idleTask, /window\.setTimeout\(callback, 0\)/u);
  assert.match(fileRepository, /scheduleIdleTask/u);
  assert.match(floorBackup, /scheduleIdleTask/u);
  assert.doesNotMatch(fileRepository, /window\.requestIdleCallback/u);
  assert.doesNotMatch(floorBackup, /window\.requestIdleCallback/u);
});

test('automatic snapshots skip unchanged data and active generation', () => {
  assert.match(fileRepository, /useGenerationTaskStore\(\)/u);
  assert.match(fileRepository, /generationTasks\.hasRunningTasks/u);
  assert.match(fileRepository, /function captureTrackedDataReferences\(\)/u);
  assert.match(fileRepository, /key\.startsWith\('sillytavern_phone'\) && key !== fileRepositoryField/u);
  assert.match(fileRepository, /function trackedDataChanged\(\)/u);
  assert.match(fileRepository, /if \(!trackedDataChanged\(\)\) return/u);
  assert.match(fileRepository, /onTavernEvent\('GENERATION_STARTED'/u);
  assert.match(fileRepository, /onTavernEvent\('GENERATION_ENDED'/u);
  assert.match(fileRepository, /if \(generationIsActive\(\)\)/u);
  assert.match(fileRepository, /scheduleRetry\(\)/u);
  assert.match(fileRepository, /const snapshotReferences = captureTrackedDataReferences\(\)/u);
  assert.match(fileRepository, /lastSnapshotReferences = snapshotReferences/u);
});

test('replacing floor backups clears and writes inside one transaction', () => {
  const replacementStart = floorBackup.indexOf('export async function replaceChatFloorBackups');
  const replacementEnd = floorBackup.indexOf('export async function captureCurrentChatFloorBackup');
  assert.ok(replacementStart >= 0 && replacementEnd > replacementStart);
  const replacement = floorBackup.slice(replacementStart, replacementEnd);
  assert.match(replacement, /parsed\.forEach\(assertBackupIdentity\)/u);
  assert.match(replacement, /runStoreTransaction\('readwrite'/u);
  assert.match(replacement, /store\.clear\(\)/u);
  assert.match(replacement, /store\.put\(backup\)/u);
  assert.doesNotMatch(replacement, /listChatFloorBackups|deleteChatFloorBackup|saveChatFloorBackup/u);
});

test('unchanged floor backups compare normalized messages before cloning stored records', () => {
  assert.match(floorBackup, /function sameCurrentMessages/u);
  assert.match(floorBackup, /if \(existing && sameCurrentMessages\(existing\.messages, currentMessages\)\)/u);
  assert.match(floorBackup, /messages: currentMessages\.map\(toBackupMessage\)/u);
});

test('generation tasks flush throttled raw output before stopping or disposal', () => {
  assert.match(generationTasks, /rawOutputFlushStatuses\.has\(status\)\) commitRawOutput\(taskId\)/u);
  assert.match(generationTasks, /function completeTask[\s\S]*?commitRawOutput\(taskId\)/u);
  assert.match(generationTasks, /onScopeDispose[\s\S]*?commitAllRawOutputs\(\)[\s\S]*?persist\(\)/u);
});

test('generation tasks persist through explicit mutations instead of a deep watcher', () => {
  assert.match(generationTasks, /const RAW_OUTPUT_PERSIST_INTERVAL_MS = 5000/u);
  assert.doesNotMatch(generationTasks, /watch\(settings, schedulePersist, \{ deep: true \}\)/u);
  assert.match(
    generationTasks,
    /function createTask[\s\S]*?settings\.value\.tasks = \[\.\.\.active, \.\.\.terminal\];[\s\S]*?schedulePersist\(\)/u,
  );
  assert.match(generationTasks, /function patchTask[\s\S]*?Object\.assign\(task, patch,[\s\S]*?schedulePersist\(\)/u);
  assert.match(generationTasks, /function startJob[\s\S]*?task\.updatedAt = nowIso\(\);[\s\S]*?schedulePersist\(\)/u);
  assert.match(generationTasks, /function finishJob[\s\S]*?task\.updatedAt = nowIso\(\);[\s\S]*?schedulePersist\(\)/u);
  assert.match(
    generationTasks,
    /function requestPause[\s\S]*?task\.updatedAt = nowIso\(\);[\s\S]*?schedulePersist\(\)/u,
  );
  assert.match(
    generationTasks,
    /function removeTask[\s\S]*?settings\.value\.tasks = settings\.value\.tasks\.filter[\s\S]*?schedulePersist\(\)/u,
  );
});

test('status display coalesces lifecycle and event refresh requests', () => {
  assert.match(statusDisplay, /function scheduleStatusRefresh\(\)/u);
  assert.match(statusDisplay, /queueMicrotask/u);
  assert.equal((statusDisplay.match(/void refreshStatus\(\)/gu) || []).length, 1);
  assert.match(statusDisplay, /onDeactivated\(stopRuntime\)/u);
});
