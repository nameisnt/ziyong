/* eslint-disable import-x/no-nodejs-modules */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const vueParser = require('vue-eslint-parser');
const typescriptParser = require('@typescript-eslint/parser');

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const defaultBaselinePath = resolve(projectRoot, 'scripts/baselines/ui-contracts.json');

const protectedControlClasses = [
  'pc-primary-btn',
  'pc-soft-btn',
  'pc-icon-btn',
  'pc-segment',
  'pc-segment-btn',
  'pc-field',
  'pc-select',
  'pc-area',
  'pc-field-group',
  'pc-field-label',
  'pc-section-card',
  'pc-editor-card',
  'pc-form-actions',
  'pc-toggle',
];

const geometryProperties = new Set([
  'height',
  'min-height',
  'max-height',
  'block-size',
  'min-block-size',
  'max-block-size',
  'font-size',
  'line-height',
  'padding',
  'padding-block',
  'padding-block-start',
  'padding-block-end',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-radius',
]);

const themeColorProperties = new Set([
  'color',
  'background',
  'background-color',
  'border',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'box-shadow',
  'fill',
  'stroke',
  'accent-color',
]);

const messages = {
  'button-action': 'Native type="button" has no direct, delegated, or forwarded click action.',
  'icon-button-aria-label': 'Icon button must provide aria-label (static or bound).',
  'icon-button-title': 'Icon button must provide title (static or bound).',
  'protected-control-geometry': 'Scoped style overrides protected global control geometry.',
  'protected-control-theme-color': 'Scoped style applies a hard-coded theme color to a protected global control.',
  'vue-parse-error': 'Vue template could not be parsed by the UI contract guard.',
};

function createFinding(file, ruleId, line, excerpt = '') {
  return {
    excerpt: excerpt.replaceAll(/\s+/g, ' ').trim().slice(0, 180),
    file: file.replaceAll('\\', '/'),
    line,
    message: messages[ruleId],
    ruleId,
  };
}

function directiveName(attribute) {
  return attribute.directive ? attribute.key.name.name : null;
}

function directiveArgument(attribute) {
  if (!attribute.directive) return null;
  return attribute.key.argument?.type === 'VIdentifier' ? attribute.key.argument.name : null;
}

function hasAttribute(element, name) {
  return element.startTag.attributes.some(attribute => {
    if (!attribute.directive) return attribute.key.name === name;
    return directiveName(attribute) === 'bind' && directiveArgument(attribute) === name;
  });
}

function hasListener(element, eventName) {
  return element.startTag.attributes.some(attribute => {
    if (!attribute.directive || directiveName(attribute) !== 'on') return false;
    const argument = directiveArgument(attribute);
    return argument === eventName || argument === null;
  });
}

function forwardsAttributes(element, source) {
  return element.startTag.attributes.some(attribute => {
    if (!attribute.directive || directiveName(attribute) !== 'bind' || directiveArgument(attribute) !== null) return false;
    return source.slice(attribute.range[0], attribute.range[1]).includes('$attrs');
  });
}

function staticAttributeValue(element, name) {
  const attribute = element.startTag.attributes.find(item => !item.directive && item.key.name === name);
  return attribute?.value?.value ?? null;
}

function classMayContain(element, className, source) {
  return element.startTag.attributes.some(attribute => {
    if (!attribute.directive && attribute.key.name === 'class') {
      return (attribute.value?.value ?? '').split(/\s+/).includes(className);
    }
    if (attribute.directive && directiveName(attribute) === 'bind' && directiveArgument(attribute) === 'class') {
      return new RegExp(`(?:^|[^a-zA-Z0-9-])${className}(?:$|[^a-zA-Z0-9-])`).test(
        source.slice(attribute.range[0], attribute.range[1]),
      );
    }
    return false;
  });
}

function hasDelegatedClick(ancestors) {
  return ancestors.some(ancestor => ancestor.type === 'VElement' && hasListener(ancestor, 'click'));
}

function scanTemplate(source, file) {
  let ast;
  try {
    ast = vueParser.parse(source, {
      comment: true,
      filePath: file,
      loc: true,
      parser: typescriptParser,
      range: true,
      sourceType: 'module',
    });
  } catch (error) {
    const line = error && typeof error === 'object' && 'lineNumber' in error ? Number(error.lineNumber) : 1;
    return [createFinding(file, 'vue-parse-error', line, error instanceof Error ? error.message : String(error))];
  }

  if (!ast.templateBody) return [];
  const findings = [];

  function visit(node, ancestors) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VElement') {
      const excerpt = source.slice(node.startTag.range[0], node.startTag.range[1]);
      const isNativeButton = node.name === 'button';
      if (isNativeButton && classMayContain(node, 'pc-icon-btn', source)) {
        if (!hasAttribute(node, 'title')) {
          findings.push(createFinding(file, 'icon-button-title', node.loc.start.line, excerpt));
        }
        if (!hasAttribute(node, 'aria-label')) {
          findings.push(createFinding(file, 'icon-button-aria-label', node.loc.start.line, excerpt));
        }
      }

      if (
        isNativeButton &&
        staticAttributeValue(node, 'type') === 'button' &&
        !hasListener(node, 'click') &&
        !hasDelegatedClick(ancestors) &&
        !forwardsAttributes(node, source)
      ) {
        findings.push(createFinding(file, 'button-action', node.loc.start.line, excerpt));
      }
    }

    const nextAncestors = node.type === 'VElement' ? [...ancestors, node] : ancestors;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent' || key === 'tokens' || key === 'comments') continue;
      if (Array.isArray(value)) {
        value.forEach(child => {
          if (child && typeof child === 'object' && typeof child.type === 'string') visit(child, nextAncestors);
        });
      } else if (value && typeof value === 'object' && typeof value.type === 'string') {
        visit(value, nextAncestors);
      }
    }
  }

  visit(ast.templateBody, []);
  return findings;
}

function lineAtOffset(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function hasNumberedAllowance(comments) {
  return comments.some(comment => {
    if (!comment.includes('ui-reuse-allow:')) return false;
    return /\b(?:D|Q|UI|DESIGN)-[A-Z0-9]+(?:-[A-Z0-9]+)+\b/.test(comment);
  });
}

function parseDeclarations(body) {
  const declarations = [];
  const pattern = /(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;{}]+)/g;
  for (const match of body.matchAll(pattern)) {
    declarations.push({ property: match[1].toLowerCase(), value: match[2].trim() });
  }
  return declarations;
}

function containsHardCodedColor(value) {
  return /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(|\b(?:white|black)\b/i.test(value);
}

function scanScopedStyles(source, file) {
  const findings = [];
  const stylePattern = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;

  for (const styleMatch of source.matchAll(stylePattern)) {
    if (!/\bscoped\b/i.test(styleMatch[1])) continue;
    const styleSource = styleMatch[2];
    const styleOffset = styleMatch.index + styleMatch[0].indexOf(styleSource);
    const rulePattern = /([^{}]+)\{([^{}]*)\}/g;

    for (const ruleMatch of styleSource.matchAll(rulePattern)) {
      const comments = [...ruleMatch[1].matchAll(/\/\*([\s\S]*?)\*\//g)].map(match => match[1].trim());
      const selector = ruleMatch[1].replaceAll(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!selector || selector.startsWith('@')) continue;
      if (!protectedControlClasses.some(className => selector.includes(`.${className}`))) continue;
      if (hasNumberedAllowance(comments)) continue;

      const declarations = parseDeclarations(ruleMatch[2]);
      const line = lineAtOffset(source, styleOffset + ruleMatch.index);
      if (declarations.some(declaration => geometryProperties.has(declaration.property))) {
        findings.push(createFinding(file, 'protected-control-geometry', line, selector));
      }
      if (
        declarations.some(
          declaration => themeColorProperties.has(declaration.property) && containsHardCodedColor(declaration.value),
        )
      ) {
        findings.push(createFinding(file, 'protected-control-theme-color', line, selector));
      }
    }
  }

  return findings;
}

export function scanVueUiContracts(source, file = '<inline>.vue') {
  return [...scanTemplate(source, file), ...scanScopedStyles(source, file)].sort(
    (left, right) => left.line - right.line || left.ruleId.localeCompare(right.ruleId),
  );
}

async function collectVueFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectVueFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.vue')) files.push(path);
  }
  return files;
}

export async function scanProjectUiContracts(root = projectRoot) {
  const srcRoot = resolve(root, 'src');
  const files = await collectVueFiles(srcRoot);
  const findings = [];
  for (const filePath of files.sort()) {
    const source = await readFile(filePath, 'utf8');
    findings.push(...scanVueUiContracts(source, relative(root, filePath)));
  }
  return findings;
}

function findingKey(finding) {
  return `${finding.file}\u0000${finding.ruleId}\u0000${finding.message}\u0000${finding.excerpt ?? ''}`;
}

function countFindings(findings) {
  const counts = new Map();
  for (const finding of findings) {
    const key = findingKey(finding);
    counts.set(key, (counts.get(key) ?? 0) + (finding.count ?? 1));
  }
  return counts;
}

export function compareUiContractBaseline(actualFindings, expectedFindings) {
  const actualCounts = countFindings(actualFindings);
  const expectedCounts = countFindings(expectedFindings);
  const mismatches = [];

  for (const [key, count] of actualCounts) {
    const expected = expectedCounts.get(key) ?? 0;
    if (count !== expected) mismatches.push({ actual: count, expected, key, kind: 'unexpected/current' });
  }
  for (const [key, count] of expectedCounts) {
    if (!actualCounts.has(key)) mismatches.push({ actual: 0, expected: count, key, kind: 'missing/stale' });
  }
  return mismatches;
}

export function createUiContractBaseline(findings) {
  const counts = countFindings(findings);
  return [...counts.entries()]
    .map(([key, count]) => {
      const [file, ruleId, message, excerpt] = key.split('\u0000');
      return { count, excerpt, file, message, ruleId };
    })
    .sort((left, right) => left.file.localeCompare(right.file) || left.ruleId.localeCompare(right.ruleId));
}

function parseArgs(argv) {
  const baselineArg = argv.find(arg => arg.startsWith('--baseline='));
  return {
    baselinePath: baselineArg ? resolve(projectRoot, baselineArg.slice('--baseline='.length)) : defaultBaselinePath,
    verbose: argv.includes('--verbose'),
    writeBaseline: argv.includes('--write-baseline'),
  };
}

function printFindings(findings) {
  for (const finding of findings) {
    console.log(`${finding.file}:${finding.line} ${finding.ruleId} ${finding.message}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const findings = await scanProjectUiContracts();
  if (options.verbose || options.writeBaseline) printFindings(findings);

  if (options.writeBaseline) {
    const baseline = {
      defect: 'D-GUARD-001',
      findings: createUiContractBaseline(findings),
      version: 1,
    };
    await writeFile(options.baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    console.log(`UI contract baseline written: ${relative(projectRoot, options.baselinePath)} (${findings.length} finding(s)).`);
    return;
  }

  const baseline = JSON.parse(await readFile(options.baselinePath, 'utf8'));
  if (
    baseline.version !== 1 ||
    baseline.defect !== 'D-GUARD-001' ||
    !Array.isArray(baseline.findings) ||
    baseline.findings.some(finding => typeof finding.excerpt !== 'string')
  ) {
    throw new Error(`Invalid UI contract baseline: ${relative(projectRoot, options.baselinePath)}`);
  }
  const mismatches = compareUiContractBaseline(findings, baseline.findings);
  if (mismatches.length) {
    console.error('UI contract baseline mismatch:');
    for (const mismatch of mismatches) {
      const [file, ruleId, message, excerpt] = mismatch.key.split('\u0000');
      console.error(
        `- ${mismatch.kind}: ${file} | ${ruleId} | ${message} | ${excerpt} | current=${mismatch.actual}; baseline=${mismatch.expected}`,
      );
    }
    throw new Error('Update the numbered defect and baseline deliberately; do not silently accept UI contract regressions.');
  }

  console.log(`UI contract baseline passed: ${findings.length} registered legacy finding(s), 0 new finding(s).`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
