/* eslint-disable import-x/no-nodejs-modules */
import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const defaultBaselinePath = resolve(root, 'scripts/baselines/eslint-warnings.json');

function parseArgs(argv) {
  const baselineArg = argv.find(arg => arg.startsWith('--baseline='));
  return {
    baselinePath: baselineArg ? resolve(root, baselineArg.slice('--baseline='.length)) : defaultBaselinePath,
  };
}

function normalizePath(filePath) {
  return relative(root, filePath).replaceAll('\\', '/');
}

function warningKey(warning) {
  return `${warning.file}\u0000${warning.ruleId ?? ''}\u0000${warning.message}`;
}

function countWarnings(warnings) {
  const counts = new Map();
  for (const warning of warnings) {
    const key = warningKey(warning);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function describeWarningKey(key, count) {
  const [file, ruleId, message] = key.split('\u0000');
  return `${file} | ${ruleId || '<no-rule>'} | ${message} | count=${count}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseline = JSON.parse(await readFile(options.baselinePath, 'utf8'));
  if (baseline.version !== 1 || !Array.isArray(baseline.warnings)) {
    throw new Error(`Invalid ESLint warning baseline: ${options.baselinePath}`);
  }

  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintFiles(['.']);
  const formatter = await eslint.loadFormatter('stylish');
  const formatted = formatter.format(results);
  if (formatted.trim()) console.log(formatted);

  const errorCount = results.reduce(
    (total, result) => total + result.messages.filter(message => message.severity === 2).length,
    0,
  );
  if (errorCount) {
    throw new Error(`ESLint reported ${errorCount} error(s); warning baselines never allow errors.`);
  }

  const actualWarnings = results.flatMap(result =>
    result.messages
      .filter(message => message.severity === 1)
      .map(message => ({
        file: normalizePath(result.filePath),
        message: message.message,
        ruleId: message.ruleId,
      })),
  );
  const expectedWarnings = baseline.warnings.flatMap(warning =>
    Array.from({ length: warning.count ?? 1 }, () => ({
      file: warning.file,
      message: warning.message,
      ruleId: warning.ruleId,
    })),
  );
  const actualCounts = countWarnings(actualWarnings);
  const expectedCounts = countWarnings(expectedWarnings);
  const mismatches = [];

  for (const [key, count] of actualCounts) {
    const expectedCount = expectedCounts.get(key) ?? 0;
    if (count !== expectedCount) {
      mismatches.push(`unexpected/current: ${describeWarningKey(key, count)}; baseline=${expectedCount}`);
    }
  }
  for (const [key, count] of expectedCounts) {
    if (!actualCounts.has(key)) {
      mismatches.push(`missing/stale: ${describeWarningKey(key, count)}; current=0`);
    }
  }

  if (mismatches.length) {
    console.error('ESLint warning baseline mismatch:');
    mismatches.forEach(item => console.error(`- ${item}`));
    throw new Error('Update the numbered defect and baseline deliberately; do not silently accept new warnings.');
  }

  console.log(`ESLint warning baseline passed: ${actualWarnings.length}/${expectedWarnings.length} registered warning(s).`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
