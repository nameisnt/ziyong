/* eslint-disable import-x/no-nodejs-modules */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getInteractionContractScenarios } from './ui-interaction-contracts.mjs';
import {
  APPEARANCE_PERCEPTUAL_HASH_MAX_DISTANCE,
  getAppearanceContract,
  getAppearanceContractScenarios,
  perceptualHashDistance,
} from './ui-appearance-contracts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const visualBuildDir = resolve(root, 'tmp/ui-check/server');
const defaultVisualBaselinePath = resolve(root, 'scripts/baselines/ui-visual.json');
const defaultAppearanceBaselinePath = resolve(root, 'scripts/baselines/ui-appearance.json');
const defaultSizes = [
  { height: 700, label: 'default', width: 350 },
  { height: 844, label: 'phone-tall', width: 390 },
  { height: 900, label: 'wide-tall', width: 430 },
];
const businessFailedDraftReparseScenarios = Object.freeze({
  'diary-failed-draft-reparse': {
    content: '修复 XML 后保留的日记正文。',
    raw: '<result><title>重新解析成功</title><content>修复 XML 后保留的日记正文。</content></result>',
    title: '重新解析成功',
  },
  'digest-failed-draft-reparse': {
    content: '修复 XML 后保留的摘抄正文。',
    raw: '<result><title>重新解析成功</title><content>修复 XML 后保留的摘抄正文。</content></result>',
    title: '重新解析成功',
  },
  'forum-failed-draft-reparse': {
    content: '修复 XML 后保留的论坛正文。',
    raw: '<result><board>视觉板块</board><title>重新解析成功</title><author>视觉楼主</author><content>修复 XML 后保留的论坛正文。</content></result>',
    title: '重新解析成功',
  },
  'letters-failed-draft-reparse': {
    content: '修复 XML 后保留的书信正文。',
    raw: '<result><title>重新解析成功</title><content>修复 XML 后保留的书信正文。</content></result>',
    title: '重新解析成功',
  },
  'storylines-failed-draft-reparse': {
    content: '修复后保留的剧情线概述。',
    raw: '<result><line><title>重新解析成功</title><kind>main</kind><status>active</status><summary>修复后保留的剧情线概述。</summary></line></result>',
    title: '重新解析成功',
  },
});
let stopActiveCheck = null;

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void stopActiveCheck?.().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143));
  });
}

function parseArgs(argv) {
  const options = {
    appearanceBaselinePath: defaultAppearanceBaselinePath,
    appearanceContracts: false,
    baselinePath: defaultVisualBaselinePath,
    interactionContracts: false,
    listOnly: false,
    outDir: resolve(root, 'tmp/ui-check/latest'),
    port: null,
    scenarios: null,
    sizes: defaultSizes,
    writeBaselinePath: null,
    writeAppearanceBaselinePath: null,
  };

  argv.forEach(arg => {
    if (arg === '--appearance-contracts') options.appearanceContracts = true;
    if (arg === '--interaction-contracts') options.interactionContracts = true;
    if (arg === '--list') options.listOnly = true;
    if (arg === '--no-baseline') {
      options.appearanceBaselinePath = null;
      options.baselinePath = null;
    }
    if (arg.startsWith('--appearance-baseline=')) {
      options.appearanceBaselinePath = resolve(root, arg.slice('--appearance-baseline='.length));
    }
    if (arg.startsWith('--write-appearance-baseline=')) {
      options.writeAppearanceBaselinePath = resolve(root, arg.slice('--write-appearance-baseline='.length));
    }
    if (arg.startsWith('--baseline=')) options.baselinePath = resolve(root, arg.slice('--baseline='.length));
    if (arg.startsWith('--write-baseline=')) {
      options.writeBaselinePath = resolve(root, arg.slice('--write-baseline='.length));
    }
    if (arg.startsWith('--out=')) options.outDir = resolve(root, arg.slice('--out='.length));
    if (arg.startsWith('--port=')) {
      const port = Number(arg.slice('--port='.length));
      if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error(`无效端口：${arg}`);
      }
      options.port = port;
    }
    if (arg.startsWith('--scenarios=')) {
      options.scenarios = arg
        .slice('--scenarios='.length)
        .split(/[,\s]+/)
        .map(item => item.trim())
        .filter(Boolean);
    }
    if (arg.startsWith('--sizes=')) {
      options.sizes = arg
        .slice('--sizes='.length)
        .split(/[,\s]+/)
        .map(item => {
          const [width, height] = item.split('x').map(value => Number(value));
          return {
            height: Number.isFinite(height) ? height : 700,
            label: `${width}x${height}`,
            width: Number.isFinite(width) ? width : 350,
          };
        });
    }
  });

  if ((options.interactionContracts || options.appearanceContracts) && options.scenarios?.length) {
    throw new Error('不能同时使用契约场景参数和 --scenarios。');
  }

  return options;
}

function normalizeBaselineFinding(finding) {
  return {
    message: finding.message,
    selector: finding.selector ?? '',
    severity: finding.severity,
  };
}

function findingKey(finding) {
  const normalized = normalizeBaselineFinding(finding);
  return `${normalized.severity}\u0000${normalized.message}\u0000${normalized.selector}`;
}

function countFindingKeys(findings) {
  const counts = new Map();
  for (const finding of findings) {
    const key = findingKey(finding);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function createVisualBaseline(results, scenarioCount, sizes) {
  const findings = results.flatMap(result => result.findings);
  return {
    version: 1,
    defect: 'D-BASELINE-002',
    generatedAt: new Date().toISOString(),
    scenarioCount,
    sizes: sizes.map(size => `${size.width}x${size.height}`),
    summary: {
      fails: findings.filter(finding => finding.severity === 'fail').length,
      runs: results.length,
      warnings: findings.filter(finding => finding.severity === 'warning').length,
    },
    runs: results.map(result => ({
      findings: result.findings.map(normalizeBaselineFinding),
      scenario: result.scenario,
      size: result.size,
    })),
  };
}

function assertOfficialBaselineCoverage(options, { fullScenarioRun, harnessScenarioCount, results }) {
  if (!options.writeBaselinePath || resolve(options.writeBaselinePath) !== defaultVisualBaselinePath) return;

  const expectedSizes = defaultSizes.map(size => `${size.width}x${size.height}`).sort();
  const actualSizes = options.sizes.map(size => `${size.width}x${size.height}`).sort();
  const expectedRunCount = harnessScenarioCount * defaultSizes.length;
  if (
    !fullScenarioRun ||
    JSON.stringify(actualSizes) !== JSON.stringify(expectedSizes) ||
    results.length !== expectedRunCount
  ) {
    throw new Error(
      `Official visual baseline requires every scenario at ${expectedSizes.join(', ')}; received ${results.length}/${expectedRunCount} run(s).`,
    );
  }
}

function compareVisualBaseline(results, baseline, { fullScenarioRun, sizes }) {
  if (baseline.version !== 1 || !Array.isArray(baseline.runs) || !Array.isArray(baseline.sizes)) {
    return ['视觉基线格式无效或版本不受支持。'];
  }

  const expectedRuns = new Map();
  const mismatches = [];
  for (const run of baseline.runs) {
    const key = `${run.scenario}\u0000${run.size}`;
    if (expectedRuns.has(key)) mismatches.push(`视觉基线存在重复运行项：${run.scenario} / ${run.size}`);
    expectedRuns.set(key, run);
  }

  const currentRunKeys = new Set();
  for (const result of results) {
    const key = `${result.scenario}\u0000${result.size}`;
    currentRunKeys.add(key);
    const expected = expectedRuns.get(key);
    if (!expected) {
      mismatches.push(`当前运行没有登记基线：${result.scenario} / ${result.size}`);
      continue;
    }

    const actualCounts = countFindingKeys(result.findings);
    const expectedCounts = countFindingKeys(expected.findings ?? []);
    for (const [finding, count] of actualCounts) {
      const expectedCount = expectedCounts.get(finding) ?? 0;
      if (count !== expectedCount) {
        mismatches.push(
          `${result.scenario} / ${result.size} 出现未登记或数量变化的结果：${finding.replaceAll('\u0000', ' | ')} (${count}/${expectedCount})`,
        );
      }
    }
    for (const [finding, count] of expectedCounts) {
      if (!actualCounts.has(finding)) {
        mismatches.push(
          `${result.scenario} / ${result.size} 的旧基线结果已消失：${finding.replaceAll('\u0000', ' | ')} (0/${count})`,
        );
      }
    }
  }

  const currentSizes = sizes.map(size => `${size.width}x${size.height}`).sort();
  const baselineSizes = [...baseline.sizes].sort();
  const coversAllBaselineSizes = JSON.stringify(currentSizes) === JSON.stringify(baselineSizes);
  if (fullScenarioRun && coversAllBaselineSizes) {
    for (const [key, run] of expectedRuns) {
      if (!currentRunKeys.has(key)) mismatches.push(`基线运行项已不在当前全量场景中：${run.scenario} / ${run.size}`);
    }
  }

  return mismatches;
}

async function captureAppearanceEvidence(page, scenario, screenshotPath) {
  const contract = getAppearanceContract(scenario);
  if (!contract) return null;

  const targets = await page.evaluate(currentContract =>
    currentContract.targets.map(target => {
      const element = document.querySelector(target.selector);
      if (!element) return { missing: true, selector: target.selector, styles: {} };
      const computed = getComputedStyle(element);
      return {
        missing: false,
        selector: target.selector,
        styles: Object.fromEntries(target.properties.map(property => [property, computed[property]])),
      };
    }),
  contract);
  const png = await readFile(screenshotPath);
  const screenshotPerceptualHash = await page.evaluate(async base64 => {
    const binary = atob(base64);
    const encoded = Uint8Array.from(binary, character => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([encoded], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = 9;
    canvas.height = 8;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('无法创建截图像素读取上下文');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 0n;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const offset = (y * 9 + x) * 4;
        const nextOffset = offset + 4;
        const luminance = pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
        const nextLuminance =
          pixels[nextOffset] * 0.299 + pixels[nextOffset + 1] * 0.587 + pixels[nextOffset + 2] * 0.114;
        hash = (hash << 1n) | (luminance > nextLuminance ? 1n : 0n);
      }
    }
    return hash.toString(16).padStart(16, '0').toUpperCase();
  }, png.toString('base64'));
  return { screenshotPerceptualHash, targets };
}

async function prepareStableScreenshot(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    let style = document.querySelector('#pc-visual-stability');
    if (!style) {
      style = document.createElement('style');
      style.id = 'pc-visual-stability';
      style.textContent = `
        *, *::before, *::after {
          animation: none !important;
          caret-color: transparent !important;
          transition: none !important;
        }
      `;
      document.head.append(style);
    }
  });
  await page.waitForTimeout(100);
}

function createAppearanceBaseline(results, sizes) {
  return {
    version: 2,
    defect: 'D-VISUAL-001',
    generatedAt: new Date().toISOString(),
    scenarios: getAppearanceContractScenarios(),
    sizes: sizes.map(size => `${size.width}x${size.height}`),
    evidence: results
      .filter(result => result.appearance)
      .map(result => ({ appearance: result.appearance, scenario: result.scenario, size: result.size })),
  };
}

function assertAppearanceBaselineCoverage(results, sizes) {
  const scenarios = getAppearanceContractScenarios();
  const expectedSizes = defaultSizes.map(size => `${size.width}x${size.height}`).sort();
  const actualSizes = sizes.map(size => `${size.width}x${size.height}`).sort();
  const expectedKeys = new Set(scenarios.flatMap(scenario => expectedSizes.map(size => `${scenario}\u0000${size}`)));
  const actualKeys = new Set(
    results.filter(result => result.appearance).map(result => `${result.scenario}\u0000${result.size}`),
  );
  if (
    JSON.stringify(actualSizes) !== JSON.stringify(expectedSizes) ||
    actualKeys.size !== expectedKeys.size ||
    [...expectedKeys].some(key => !actualKeys.has(key))
  ) {
    throw new Error(`Appearance baseline requires ${scenarios.length} scenario(s) at ${expectedSizes.join(', ')}.`);
  }
}

function compareAppearanceBaseline(results, baseline, requireFullCoverage) {
  if (baseline.version !== 2 || !Array.isArray(baseline.evidence)) return ['外观证据基线格式无效。'];
  const expected = new Map(baseline.evidence.map(item => [`${item.scenario}\u0000${item.size}`, item.appearance]));
  const actualEntries = results.filter(result => result.appearance);
  const mismatches = [];
  for (const result of actualEntries) {
    const key = `${result.scenario}\u0000${result.size}`;
    const expectedAppearance = expected.get(key);
    if (!expectedAppearance) {
      mismatches.push(`当前外观运行没有登记基线：${result.scenario} / ${result.size}`);
    } else {
      if (JSON.stringify(result.appearance.targets) !== JSON.stringify(expectedAppearance.targets)) {
        mismatches.push(`计算样式发生变化：${result.scenario} / ${result.size}`);
      }
      const distance = perceptualHashDistance(
        result.appearance.screenshotPerceptualHash,
        expectedAppearance.screenshotPerceptualHash,
      );
      if (distance > APPEARANCE_PERCEPTUAL_HASH_MAX_DISTANCE) {
        mismatches.push(
          `关键截图感知差异过大：${result.scenario} / ${result.size} (${distance}/${APPEARANCE_PERCEPTUAL_HASH_MAX_DISTANCE})`,
        );
      }
    }
  }
  if (requireFullCoverage) {
    const actualKeys = new Set(actualEntries.map(result => `${result.scenario}\u0000${result.size}`));
    for (const [key] of expected) {
      if (!actualKeys.has(key)) mismatches.push(`外观基线运行项未执行：${key.replace('\u0000', ' / ')}`);
    }
  }
  return mismatches;
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error(
      [
        '缺少 Playwright，无法自动截图。',
        '安装后再运行：pnpm add -D playwright && pnpm exec playwright install chromium',
      ].join('\n'),
    );
    process.exitCode = 1;
    return null;
  }
}

async function buildVisualHarness() {
  const { build } = await import('vite');
  await build({
    base: './',
    clearScreen: false,
    mode: 'visual',
    root,
    build: {
      emptyOutDir: true,
      outDir: visualBuildDir,
      rollupOptions: {
        input: resolve(root, 'visual-harness.html'),
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });
}

function startVite(requestedPort) {
  let server = null;
  const ready = (async () => {
    const { preview } = await import('vite');
    await buildVisualHarness();
    server = await preview({
      clearScreen: false,
      mode: 'visual',
      root,
      build: { outDir: visualBuildDir },
      preview: {
        host: '127.0.0.1',
        port: requestedPort ?? 0,
        strictPort: requestedPort !== null,
      },
    });
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('无法确定视觉检查预览端口。');
    }
    return address.port;
  })();

  return {
    ready,
    async stop() {
      await server?.close();
    },
  };
}

function sanitizeName(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadHarnessScenarios(page, harnessUrl) {
  const pageErrors = [];
  const handlePageError = error => pageErrors.push(error.message);
  page.on('pageerror', handlePageError);
  try {
    await page.goto(harnessUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.__phoneVisualTest__));
    return await page.evaluate(() => window.__phoneVisualTest__?.scenarios ?? []);
  } catch (error) {
    const detail = pageErrors.length ? `\n浏览器异常：${pageErrors.join('\n')}` : '';
    throw new Error(`${error instanceof Error ? error.message : String(error)}${detail}`);
  } finally {
    page.off('pageerror', handlePageError);
  }
}

async function runDomChecks(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('.pc-phone-shell');
    const screen = document.querySelector('.pc-screen');
    const findings = [];
    if (!shell) {
      return [{ severity: 'fail', message: '没有找到 .pc-phone-shell' }];
    }

    const shellRect = shell.getBoundingClientRect();
    if (
      shellRect.left < -1 ||
      shellRect.top < -1 ||
      shellRect.right > window.innerWidth + 1 ||
      shellRect.bottom > window.innerHeight + 1
    ) {
      findings.push({ severity: 'fail', message: '手机壳超出浏览器视口' });
    }

    if (screen && screen.scrollWidth > screen.clientWidth + 2) {
      findings.push({ severity: 'fail', message: '.pc-screen 出现横向滚动' });
    }

    const activeDialogs = Array.from(shell.querySelectorAll('[role="dialog"]')).filter(
      element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden',
    );
    const activeDialog = activeDialogs.at(-1) ?? null;
    const isInActiveLayer = element => !activeDialog || element === activeDialog || activeDialog.contains(element);
    const controls = Array.from(shell.querySelectorAll('button,input,select,textarea')).filter(element => {
      return (
        isInActiveLayer(element) &&
        !element.hidden &&
        getComputedStyle(element).display !== 'none' &&
        getComputedStyle(element).visibility !== 'hidden' &&
        !element.closest('details:not([open])') &&
        !element.classList.contains('pc-hidden-input') &&
        element.getAttribute('type') !== 'hidden'
      );
    });
    const hasScrollableAncestor = element => {
      let current = element.parentElement;
      while (current && current !== shell) {
        const style = getComputedStyle(current);
        if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 2) return true;
        current = current.parentElement;
      }
      return false;
    };
    const hasHorizontalScrollableAncestor = element => {
      let current = element.parentElement;
      while (current && current !== shell) {
        const style = getComputedStyle(current);
        if (/(auto|scroll)/.test(style.overflowX) && current.scrollWidth > current.clientWidth + 2) return true;
        current = current.parentElement;
      }
      return false;
    };
    controls.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (!element.getClientRects().length) return;
      if (rect.width <= 0 || rect.height <= 0) {
        if (element.tagName.toLowerCase() === 'input' && element.getAttribute('type') === 'checkbox') return;
        findings.push({
          message: `${element.tagName.toLowerCase()} 可交互元素尺寸为 0`,
          selector: element.className || element.id || element.textContent?.trim().slice(0, 24) || element.tagName,
          severity: 'fail',
        });
      }
      if ((rect.top < shellRect.top - 2 || rect.bottom > shellRect.bottom + 2) && !hasScrollableAncestor(element)) {
        findings.push({
          message: '交互元素纵向超出手机壳且无法通过滚动触达',
          selector: element.className || element.id || element.textContent?.trim().slice(0, 24) || element.tagName,
          severity: 'fail',
        });
      }
    });

    const overflowing = Array.from(shell.querySelectorAll('*'))
      .filter(element => {
        if (!isInActiveLayer(element)) return false;
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 8 &&
          rect.height > 8 &&
          !hasHorizontalScrollableAncestor(element) &&
          (rect.left < shellRect.left - 2 || rect.right > shellRect.right + 2)
        );
      })
      .slice(0, 12);
    overflowing.forEach(element => {
      findings.push({
        message: '元素横向超出手机壳',
        selector: element.className || element.id || element.textContent?.trim().slice(0, 24) || element.tagName,
        severity: 'warning',
      });
    });

    const textOverflow = Array.from(shell.querySelectorAll('button,strong,p,span,small,label'))
      .filter(element => {
        if (!isInActiveLayer(element)) return false;
        if (element.matches('button') && element.children.length > 0) return false;
        if (element.scrollWidth <= element.clientWidth + 3 || element.clientWidth <= 0) return false;
        const style = getComputedStyle(element);
        const clipsOverflow =
          ['clip', 'hidden'].includes(style.overflowX) || ['clip', 'hidden'].includes(style.overflow);
        return !clipsOverflow && style.textOverflow !== 'ellipsis';
      })
      .slice(0, 12);
    textOverflow.forEach(element => {
      findings.push({
        message: '文本可能溢出容器',
        selector: element.className || element.id || element.textContent?.trim().slice(0, 24) || element.tagName,
        severity: 'warning',
      });
    });

    return findings;
  });
}

async function runInteractionChecks(page, scenario) {
  const findings = [];
  try {
    if (scenario === 'app:extras') {
      await page.locator('.pc-book-item').first().click();
      if ((await page.locator('.pc-extras-page').count()) === 0) {
        findings.push({ severity: 'fail', message: '左侧生成入口点击后没有进入番外生成页' });
      }
    }

    if (scenario === 'prompts-task-detail') {
      const dialog = page.locator('.pc-prompt-detail-dialog');
      const backdrop = page.locator('.pc-prompt-detail-backdrop');
      const screen = page.locator('.pc-screen');
      const trigger = page.locator('[data-task-template-app-id="diary"]');
      if ((await screen.evaluate(element => element.style.overflow)) !== 'hidden') {
        findings.push({ severity: 'fail', message: '提示词详情打开后没有锁定背景滚动' });
      }
      await page.locator('.pc-prompt-detail-head > .pc-icon-btn').click();
      if ((await backdrop.count()) > 0) {
        findings.push({ severity: 'fail', message: '右侧提示词详情关闭按钮点击后弹窗仍然存在' });
      }
      if ((await screen.evaluate(element => element.style.overflow)) === 'hidden') {
        findings.push({ severity: 'fail', message: '提示词详情关闭后没有恢复背景滚动' });
      }

      await trigger.click();
      await dialog.waitFor({ state: 'visible' });
      if (!(await dialog.evaluate(element => element === document.activeElement))) {
        findings.push({ severity: 'fail', message: '提示词详情重新打开后没有获得初始焦点' });
      }
      await page.keyboard.press('Escape');
      if ((await backdrop.count()) > 0) findings.push({ severity: 'fail', message: 'Escape 没有关闭提示词详情' });

      await trigger.click();
      await page.evaluate(() => window.dispatchEvent(new Event('phone-before-back', { cancelable: true })));
      if ((await backdrop.count()) > 0) findings.push({ severity: 'fail', message: '手机返回没有关闭提示词详情' });

      await trigger.click();
      await backdrop.click({ position: { x: 2, y: 2 } });
      if ((await backdrop.count()) > 0) findings.push({ severity: 'fail', message: '点击遮罩没有关闭提示词详情' });
    }

    if (scenario === 'diary-creation-mode') {
      const dialog = page.locator('.pc-creation-modal');
      const mask = page.locator('.pc-creation-modal-mask');
      const screen = page.locator('.pc-screen');
      const trigger = page.locator('.pc-diary-catalog-page .pc-book-item').last();
      if ((await screen.evaluate(element => element.style.overflow)) !== 'hidden') {
        findings.push({ severity: 'fail', message: '创建方式弹窗打开后没有锁定背景滚动' });
      }
      await mask.click({ position: { x: 10, y: 100 } });
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: '点击遮罩没有关闭创建方式弹窗' });

      await trigger.click();
      await dialog.waitFor({ state: 'visible' });
      if (!(await dialog.evaluate(element => element === document.activeElement))) {
        findings.push({ severity: 'fail', message: '创建方式弹窗重新打开后没有获得初始焦点' });
      }
      await page.keyboard.press('Escape');
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: 'Escape 没有关闭创建方式弹窗' });

      await trigger.click();
      await page.evaluate(() => window.dispatchEvent(new Event('phone-before-back', { cancelable: true })));
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: '手机返回没有关闭创建方式弹窗' });
      if ((await screen.evaluate(element => element.style.overflow)) === 'hidden') {
        findings.push({ severity: 'fail', message: '创建方式弹窗关闭后没有恢复背景滚动' });
      }
    }

    if (scenario === 'card-writer-reasoning-modal') {
      const dialog = page.locator('.pc-reasoning-card');
      const mask = page.locator('.pc-reasoning-mask');
      const screen = page.locator('.pc-screen');
      const trigger = page.locator('.pc-card-writer-reasoning');
      if ((await screen.evaluate(element => element.style.overflow)) !== 'hidden') {
        findings.push({ severity: 'fail', message: '思维链弹窗打开后没有锁定背景滚动' });
      }
      await page.locator('.pc-reasoning-head .pc-icon-btn').click();
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: '思维链关闭按钮没有关闭弹窗' });

      await trigger.click();
      await dialog.waitFor({ state: 'visible' });
      if (!(await dialog.evaluate(element => element === document.activeElement))) {
        findings.push({ severity: 'fail', message: '思维链弹窗重新打开后没有获得初始焦点' });
      }
      await page.keyboard.press('Escape');
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: 'Escape 没有关闭思维链弹窗' });

      await trigger.click();
      await page.evaluate(() => window.dispatchEvent(new Event('phone-before-back', { cancelable: true })));
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: '手机返回没有关闭思维链弹窗' });

      await trigger.click();
      await mask.click({ position: { x: 2, y: 2 } });
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: '点击遮罩没有关闭思维链弹窗' });
      if ((await screen.evaluate(element => element.style.overflow)) === 'hidden') {
        findings.push({ severity: 'fail', message: '思维链弹窗关闭后没有恢复背景滚动' });
      }
    }

    if (scenario === 'bagu-hit-details') {
      const dialog = page.locator('.pc-bagu-hit-modal');
      const mask = page.locator('.pc-bagu-hit-modal-mask');
      const screen = page.locator('.pc-screen');
      const trigger = page.locator('.pc-bagu-hit-detail-trigger').first();
      if ((await screen.evaluate(element => element.style.overflow)) !== 'hidden') {
        findings.push({ severity: 'fail', message: '八股命中详情打开后没有锁定背景滚动' });
      }
      await page.locator('.pc-bagu-hit-modal-head .pc-icon-btn').click();
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: '八股命中详情关闭按钮没有关闭弹窗' });

      await trigger.click();
      await dialog.waitFor({ state: 'visible' });
      if (!(await dialog.evaluate(element => element === document.activeElement))) {
        findings.push({ severity: 'fail', message: '八股命中详情重新打开后没有获得初始焦点' });
      }
      await page.keyboard.press('Escape');
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: 'Escape 没有关闭八股命中详情' });

      await trigger.click();
      await page.evaluate(() => window.dispatchEvent(new Event('phone-before-back', { cancelable: true })));
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: '手机返回没有关闭八股命中详情' });

      await trigger.click();
      await mask.click({ position: { x: 10, y: 100 } });
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: '点击遮罩没有关闭八股命中详情' });
      if ((await screen.evaluate(element => element.style.overflow)) === 'hidden') {
        findings.push({ severity: 'fail', message: '八股命中详情关闭后没有恢复背景滚动' });
      }
    }

    if (scenario === 'reader-text-edit-modal') {
      const dialog = page.locator('.pc-reader-edit-modal');
      const mask = page.locator('.pc-reader-edit-mask');
      const screen = page.locator('.pc-screen');
      if ((await screen.evaluate(element => element.style.overflow)) !== 'hidden') {
        findings.push({ severity: 'fail', message: '阅读文字编辑打开后没有锁定背景滚动' });
      }
      await page.keyboard.press('Escape');
      if ((await mask.count()) > 0) findings.push({ severity: 'fail', message: 'Escape 没有关闭阅读文字编辑' });
      if ((await screen.evaluate(element => element.style.overflow)) === 'hidden') {
        findings.push({ severity: 'fail', message: '阅读文字编辑关闭后没有恢复背景滚动' });
      }

    }

    if (scenario === 'content-transfer-dialog') {
      const dialog = page.locator('.pc-content-transfer-dialog');
      const backdrop = page.locator('.pc-content-transfer-backdrop');
      const screen = page.locator('.pc-screen');
      const trigger = page.locator('.pc-top-actions [aria-label="内容迁移"]');
      if ((await screen.evaluate(element => element.style.overflow)) !== 'hidden') {
        findings.push({ severity: 'fail', message: '内容迁移打开后没有锁定背景滚动' });
      }
      await dialog.locator('.pc-section-head .pc-icon-btn').click();
      if ((await backdrop.count()) > 0) findings.push({ severity: 'fail', message: '内容迁移关闭按钮没有关闭弹窗' });

      await trigger.click();
      await dialog.waitFor({ state: 'visible' });
      if (!(await dialog.evaluate(element => element === document.activeElement))) {
        findings.push({ severity: 'fail', message: '内容迁移重新打开后没有获得初始焦点' });
      }
      await page.keyboard.press('Escape');
      if ((await backdrop.count()) > 0) findings.push({ severity: 'fail', message: 'Escape 没有关闭内容迁移' });

      await trigger.click();
      await page.evaluate(() => window.dispatchEvent(new Event('phone-before-back', { cancelable: true })));
      if ((await backdrop.count()) > 0) findings.push({ severity: 'fail', message: '手机返回没有关闭内容迁移' });

      await trigger.click();
      await backdrop.click({ position: { x: 10, y: 100 } });
      if ((await backdrop.count()) > 0) findings.push({ severity: 'fail', message: '点击遮罩没有关闭内容迁移' });
      if ((await screen.evaluate(element => element.style.overflow)) === 'hidden') {
        findings.push({ severity: 'fail', message: '内容迁移关闭后没有恢复背景滚动' });
      }
    }

    if (scenario === 'entry-library-action-menu') {
      const menu = page.locator('.pc-entry-library-head .pc-action-menu').first();
      const summary = menu.locator('summary');
      if (!(await menu.evaluate(element => element.hasAttribute('open')))) {
        findings.push({ severity: 'fail', message: 'ActionMenu 没有通过 summary 打开' });
      }
      await page.keyboard.press('Escape');
      if (await menu.evaluate(element => element.hasAttribute('open'))) {
        findings.push({ severity: 'fail', message: 'Escape 没有关闭 ActionMenu' });
      }

      await summary.click();
      await page.evaluate(() => window.dispatchEvent(new Event('phone-before-back', { cancelable: true })));
      if (await menu.evaluate(element => element.hasAttribute('open'))) {
        findings.push({ severity: 'fail', message: '手机返回事件没有关闭 ActionMenu' });
      }

      await summary.click();
      await page.mouse.click(2, 2);
      if (await menu.evaluate(element => element.hasAttribute('open'))) {
        findings.push({ severity: 'fail', message: '点击 ActionMenu 外部没有关闭菜单' });
      }

      await summary.click();
      await menu.locator('.pc-action-menu-panel button:not([disabled])').first().click();
      if ((await menu.count()) > 0 && (await menu.evaluate(element => element.hasAttribute('open')))) {
        findings.push({ severity: 'fail', message: 'ActionMenu 执行可用动作后没有关闭' });
      }
    }

    if (scenario === 'summary-entry-detail') {
      const catalog = page.locator('.pc-catalog-card');
      const screen = page.locator('.pc-screen');
      if ((await screen.evaluate(element => element.style.overflow)) !== 'hidden') {
        findings.push({ severity: 'fail', message: '目录弹窗打开后没有锁定背景滚动' });
      }

      await catalog.locator('.pc-icon-btn').click();
      if ((await catalog.count()) > 0) findings.push({ severity: 'fail', message: '目录关闭按钮没有关闭弹窗' });
      if ((await screen.evaluate(element => element.style.overflow)) === 'hidden') {
        findings.push({ severity: 'fail', message: '目录关闭按钮关闭后没有恢复背景滚动' });
      }
      await page.locator('.pc-detail-nav .catalog').click();
      await catalog.waitFor({ state: 'visible' });
      if (!(await catalog.evaluate(element => element === document.activeElement))) {
        const activeElement = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 180) || 'none');
        findings.push({ severity: 'fail', message: `目录弹窗重新打开后没有获得初始焦点：${activeElement}` });
      }
      await page.keyboard.press('Escape');
      if ((await catalog.count()) > 0) findings.push({ severity: 'fail', message: 'Escape 没有关闭目录弹窗' });
      if ((await screen.evaluate(element => element.style.overflow)) === 'hidden') {
        findings.push({ severity: 'fail', message: '目录弹窗关闭后没有恢复背景滚动' });
      }

      await page.locator('.pc-detail-nav .catalog').click();
      await page.locator('.pc-catalog-mask').click({ position: { x: 2, y: 2 } });
      if ((await catalog.count()) > 0) findings.push({ severity: 'fail', message: '点击遮罩没有关闭目录弹窗' });

      await page.locator('.pc-detail-nav .catalog').click();
      await page.evaluate(() => window.dispatchEvent(new Event('phone-before-back', { cancelable: true })));
      if ((await catalog.count()) > 0) findings.push({ severity: 'fail', message: '手机返回事件没有先关闭目录弹窗' });
      await page.locator('.pc-detail-nav .catalog').click();
    }

    if (scenario === 'extras-chapter-detail') {
      const disclosure = page.locator('.pc-reasoning-disclosure');
      if ((await disclosure.count()) !== 1) {
        findings.push({ severity: 'fail', message: '阅读详情没有显示已保存思维链的折叠入口' });
      } else {
        if (await disclosure.evaluate(element => element.hasAttribute('open'))) {
          findings.push({ severity: 'fail', message: '思维链折叠入口没有保持默认收起' });
        }
        await disclosure.locator('summary').click();
        if (!(await disclosure.evaluate(element => element.hasAttribute('open')))) {
          findings.push({ severity: 'fail', message: '点击思维链标记后没有展开' });
        }
        if (!(await disclosure.locator('.pc-reasoning-body').isVisible())) {
          findings.push({ severity: 'fail', message: '思维链展开后正文不可见' });
        }
        await disclosure.locator('summary').click();
        if (await disclosure.evaluate(element => element.hasAttribute('open'))) {
          findings.push({ severity: 'fail', message: '再次点击思维链标记后没有折叠' });
        }
      }
    }

    if (scenario === 'content-version-interactions') {
      if ((await page.locator('.pc-extras-page').count()) !== 1) {
        findings.push({ severity: 'fail', message: '删除当前版本并返回后没有回到番外目录' });
      }
      if ((await page.locator('.pc-version-navigator').count()) > 0) {
        findings.push({ severity: 'fail', message: '删除当前版本并返回后仍停留在版本详情' });
      }
    }

    if (scenario === 'tutorial-scroll-return') {
      const screen = page.locator('.pc-screen');
      if ((await page.locator('.pc-tutorial-app .pc-tutorial-page').count()) !== 1 || (await screen.count()) !== 1) {
        findings.push({ severity: 'fail', message: '教程详情返回后没有恢复教程目录页' });
      } else if ((await screen.evaluate(element => element.scrollTop)) < 100) {
        findings.push({ severity: 'fail', message: '教程详情返回后没有保持原滚动位置' });
      }
    }

    if (scenario === 'summary-entry-detail' && (await page.locator('.pc-catalog-mask').count()) !== 1) {
      findings.push({ severity: 'fail', message: '阅读详情点击目录后没有打开目录弹窗' });
    }

    if (scenario === 'theater-failed-draft') {
      const editor = page.locator('.pc-failed-draft-page .pc-raw-editor-area');
      if ((await editor.count()) !== 1) {
        findings.push({ severity: 'fail', message: '解析失败草稿没有保留可编辑的原始输出' });
      } else {
        await editor.fill(
          '<result><title>重新解析成功</title><content>修复 XML 后保留的小剧场正文。</content></result>',
        );
        await page.waitForTimeout(50);
        await page.locator('.pc-failed-draft-page .pc-form-actions .pc-primary-btn').click();
        try {
          await page.locator('.pc-shared-generation-preview-page').waitFor({ state: 'visible' });
        } catch {
          const feedback = await page
            .locator('.toast-message, .pc-phone-notice, .pc-failed-draft-page')
            .allTextContents();
          const editorValue = await editor.inputValue();
          const reparseDisabled = await page
            .locator('.pc-failed-draft-page .pc-form-actions .pc-primary-btn')
            .isDisabled();
          findings.push({
            severity: 'fail',
            message: `修改原始输出并点击重新解析后没有进入生成预览（disabled=${reparseDisabled}; value=${editorValue.slice(0, 80)}; feedback=${feedback.join(' | ').slice(0, 160)}）`,
          });
        }
        if ((await page.locator('.pc-failed-draft-page').count()) > 0) {
          findings.push({ severity: 'fail', message: '重新解析成功后仍停留在失败草稿页' });
        }
      }
    }

    if (scenario === 'summary-failed-draft-reparse') {
      const editor = page.locator('.pc-failed-draft-page .pc-raw-editor-area');
      if ((await editor.count()) !== 1) {
        findings.push({ severity: 'fail', message: '总结失败草稿没有保留可编辑的原始输出' });
      } else {
        await editor.fill(
          '<result><title>重新解析成功</title><content>修复 XML 后保留的总结正文。</content></result>',
        );
        await page.locator('.pc-failed-draft-page .pc-form-actions .pc-primary-btn').click();
        try {
          await page.locator('.pc-shared-generation-preview-page').waitFor({ state: 'visible' });
        } catch {
          const feedback = await page
            .locator('.toast-message, .pc-phone-notice, .pc-failed-draft-page')
            .allTextContents();
          const editorValue = await editor.inputValue();
          const reparseDisabled = await page
            .locator('.pc-failed-draft-page .pc-form-actions .pc-primary-btn')
            .isDisabled();
          findings.push({
            severity: 'fail',
            message: `总结原始输出修复后没有进入预览（disabled=${reparseDisabled}; value=${editorValue.slice(0, 100)}; feedback=${feedback.join(' | ').slice(0, 180)}）`,
          });
        }
        const previewText = await page.locator('.pc-shared-generation-preview-page').textContent().catch(() => '');
        if (!previewText.includes('重新解析成功') || !previewText.includes('修复 XML 后保留的总结正文')) {
          findings.push({ severity: 'fail', message: '总结重解析预览没有保留修复后的标题与正文' });
        }
        if ((await page.locator('.pc-failed-draft-page').count()) > 0) {
          findings.push({ severity: 'fail', message: '总结重解析成功后仍停留在失败草稿页' });
        }
      }
    }

    if (scenario === 'forum-preview') {
      if ((await page.locator('.pc-bagu-scan').count()) !== 0) {
        findings.push({ severity: 'fail', message: '论坛生成预览初始状态不应直接展开八股检测' });
      }
      const baguButton = page.getByRole('button', { name: '八股', exact: true });
      await baguButton.click();
      if ((await page.locator('.pc-bagu-scan').count()) !== 1) {
        findings.push({ severity: 'fail', message: '论坛生成预览点击八股后没有切换到检测视图' });
      }
      await baguButton.click();

      await page.getByRole('button', { name: '原始输出', exact: true }).click();
      const rawEditor = page.locator('.pc-raw-editor-area');
      await rawEditor.fill(
        '<result><board>视觉板块</board><title>论坛预览重解析成功</title><author>视觉楼主</author><content>论坛预览修复后的主楼正文。</content></result>',
      );
      await page.getByRole('button', { name: '重新解析', exact: true }).last().click();
      const previewText = await page.locator('.pc-forum-preview-page').textContent().catch(() => '');
      if (!previewText.includes('论坛预览重解析成功') || !previewText.includes('论坛预览修复后的主楼正文')) {
        findings.push({ severity: 'fail', message: '论坛预览修改原始输出后重新解析没有更新主楼内容' });
      }
      if ((await page.locator('.pc-raw-editor').count()) !== 0) {
        findings.push({ severity: 'fail', message: '论坛预览重新解析成功后仍停留在原始输出视图' });
      }
    }

    const businessReparse = businessFailedDraftReparseScenarios[scenario];
    if (businessReparse) {
      const editor = page.locator('.pc-raw-editor-area');
      if ((await editor.count()) !== 1) {
        findings.push({ severity: 'fail', message: `${scenario} 没有保留可编辑的原始输出` });
      } else {
        await editor.fill(businessReparse.raw);
        const reparseButton = page.getByRole('button', { name: '重新解析', exact: true }).last();
        await reparseButton.click();
        const preview = page.locator('.pc-generation-preview-page, .pc-shared-generation-preview-page').first();
        try {
          await preview.waitFor({ state: 'visible' });
        } catch {
          const feedback = await page.locator('.toast-message, .pc-phone-notice, .pc-failed-draft-page').allTextContents();
          findings.push({
            severity: 'fail',
            message: `${scenario} 修复原文后没有进入预览（feedback=${feedback.join(' | ').slice(0, 180)}）`,
          });
        }
        const previewText = await preview.textContent().catch(() => '');
        if (!previewText.includes(businessReparse.title) || !previewText.includes(businessReparse.content)) {
          findings.push({ severity: 'fail', message: `${scenario} 的预览没有保留修复后的标题与正文` });
        }
        if ((await page.locator('.pc-failed-draft-page, .pc-repair-page').count()) > 0) {
          findings.push({ severity: 'fail', message: `${scenario} 重新解析成功后仍停留在失败草稿页` });
        }
      }
    }

    if (scenario === 'content-directory-sort-persistence') {
      const lettersSort = page.locator('.pc-letters-book-filter .pc-directory-sort');
      if ((await lettersSort.count()) !== 1 || (await lettersSort.getAttribute('title')) !== '当前倒序，切换正序') {
        findings.push({ severity: 'fail', message: '目录排序状态在跨页返回后没有保持' });
      }
    }
  } catch (error) {
    findings.push({
      severity: 'fail',
      message: `交互检查异常：${error instanceof Error ? error.message : String(error)}`,
    });
  }
  return findings;
}

function renderReport(results) {
  const rows = results
    .map(result => {
      const status = result.findings.some(item => item.severity === 'fail')
        ? 'fail'
        : result.findings.length
          ? 'warning'
          : 'pass';
      const findings = result.findings.length
        ? `<ul>${result.findings.map(item => `<li><strong>${item.severity}</strong> ${item.message}${item.selector ? `：${item.selector}` : ''}</li>`).join('')}</ul>`
        : '<p>未发现自动检测问题。</p>';
      return `
      <section class="card ${status}">
        <h2>${result.scenario} / ${result.size}</h2>
        <img src="${result.screenshot}" alt="${result.scenario} ${result.size}" />
        ${findings}
      </section>
    `;
    })
    .join('\n');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>UI Visual Check</title>
  <style>
    body { margin: 0; padding: 24px; font-family: system-ui, sans-serif; background: #f4f6fb; color: #20242c; }
    h1 { margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
    .card { padding: 14px; border-radius: 14px; background: #fff; box-shadow: 0 10px 24px rgba(18, 24, 38, 0.1); }
    .card.fail { outline: 3px solid #ef4565; }
    .card.warning { outline: 3px solid #f5a623; }
    .card.pass { outline: 3px solid #2fb36d; }
    img { width: 100%; border-radius: 10px; background: #eef1f7; }
    li { margin: 6px 0; }
  </style>
</head>
<body>
  <h1>UI Visual Check</h1>
  <div class="grid">${rows}</div>
</body>
</html>`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const playwright = await loadPlaywright();
  if (!playwright) return;

  if (!options.listOnly) {
    await mkdir(options.outDir, { recursive: true });
  }
  const vite = options.listOnly ? null : startVite(options.port);
  const results = [];
  let browser = null;
  let fullScenarioRun = false;
  let harnessScenarioCount = 0;

  const stop = async () => {
    await browser?.close();
    browser = null;
    await vite?.stop();
  };
  stopActiveCheck = stop;

  try {
    browser = await playwright.chromium.launch({
      args: options.listOnly ? ['--allow-file-access-from-files'] : [],
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(10_000);
    page.setDefaultNavigationTimeout(15_000);
    await page.setViewportSize({ height: 780, width: 520 });

    let harnessUrl;
    if (options.listOnly) {
      await buildVisualHarness();
      harnessUrl = `${pathToFileURL(resolve(visualBuildDir, 'visual-harness.html')).href}?manual=1`;
    } else {
      const activePort = await vite.ready;
      harnessUrl = `http://127.0.0.1:${activePort}/visual-harness.html?manual=1`;
    }

    const harnessScenarios = await loadHarnessScenarios(page, harnessUrl);
    harnessScenarioCount = harnessScenarios.length;
    const contractScenarios = [
      ...(options.interactionContracts ? getInteractionContractScenarios() : []),
      ...(options.appearanceContracts ? getAppearanceContractScenarios() : []),
    ];
    const requestedScenarios = contractScenarios.length ? [...new Set(contractScenarios)] : options.scenarios;
    fullScenarioRun = !requestedScenarios?.length || requestedScenarios.includes('all');
    const scenarios =
      fullScenarioRun ? harnessScenarios : requestedScenarios;

    if (options.listOnly) {
      console.log(scenarios.join('\n'));
      return;
    }

    const totalRuns = options.sizes.length * scenarios.length;
    let completedRuns = 0;
    for (const size of options.sizes) {
      await page.setViewportSize({ height: size.height + 80, width: Math.max(size.width + 120, 520) });
      for (const scenario of scenarios) {
        console.log(`[UI ${completedRuns + 1}/${totalRuns}] ${scenario} / ${size.width}x${size.height}`);
        await page.goto(harnessUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__phoneVisualTest__));
        await page.evaluate(
          ({ height, scenario, width }) => window.__phoneVisualTest__.applyScenario(scenario, { height, width }),
          {
            height: size.height,
            scenario,
            width: size.width,
          },
        );
        const shell = page.locator('.pc-phone-shell');
        await shell.waitFor({ state: 'visible' });
        await prepareStableScreenshot(page);
        const screenshotName = `${sanitizeName(scenario)}-${sanitizeName(size.label)}.png`;
        const screenshotPath = resolve(options.outDir, screenshotName);
        await shell.screenshot({ path: screenshotPath });
        const findings = await runDomChecks(page);
        findings.push(...(await runInteractionChecks(page, scenario)));
        const appearance = await captureAppearanceEvidence(page, scenario, screenshotPath);
        for (const target of appearance?.targets ?? []) {
          if (target.missing) {
            findings.push({ severity: 'fail', message: '外观契约选择器未找到', selector: target.selector });
          }
        }
        results.push({
          appearance,
          findings,
          scenario,
          screenshot: screenshotName,
          size: `${size.width}x${size.height}`,
        });
        completedRuns += 1;
      }
    }
  } finally {
    await stop();
    stopActiveCheck = null;
  }

  await writeFile(resolve(options.outDir, 'report.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  await writeFile(resolve(options.outDir, 'index.html'), renderReport(results), 'utf8');
  const failing = results.filter(result => result.findings.some(item => item.severity === 'fail'));
  let appearanceBaselineMismatches = [];
  let baselineMismatches = [];

  if (!failing.length && options.writeBaselinePath) {
    assertOfficialBaselineCoverage(options, { fullScenarioRun, harnessScenarioCount, results });
    const baseline = createVisualBaseline(results, harnessScenarioCount, options.sizes);
    await mkdir(dirname(options.writeBaselinePath), { recursive: true });
    await writeFile(options.writeBaselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    console.log(`Visual warning baseline written: ${options.writeBaselinePath}`);
  } else if (!failing.length && options.baselinePath) {
    const baseline = JSON.parse(await readFile(options.baselinePath, 'utf8'));
    baselineMismatches = compareVisualBaseline(results, baseline, {
      fullScenarioRun,
      sizes: options.sizes,
    });
  }

  if (!failing.length && options.writeAppearanceBaselinePath) {
    assertAppearanceBaselineCoverage(results, options.sizes);
    const appearanceBaseline = createAppearanceBaseline(results, options.sizes);
    await mkdir(dirname(options.writeAppearanceBaselinePath), { recursive: true });
    await writeFile(options.writeAppearanceBaselinePath, `${JSON.stringify(appearanceBaseline, null, 2)}\n`, 'utf8');
    console.log(`Appearance evidence baseline written: ${options.writeAppearanceBaselinePath}`);
  } else if (!failing.length && options.appearanceBaselinePath) {
    const appearanceBaseline = JSON.parse(await readFile(options.appearanceBaselinePath, 'utf8'));
    appearanceBaselineMismatches = compareAppearanceBaseline(
      results,
      appearanceBaseline,
      options.appearanceContracts || fullScenarioRun,
    );
  }

  console.log(`UI visual report: ${resolve(options.outDir, 'index.html')}`);
  if (failing.length) {
    console.error(`发现 ${failing.length} 个场景存在 fail。`);
    process.exitCode = 1;
  }
  if (baselineMismatches.length) {
    console.error(`视觉遗留基线不匹配，共 ${baselineMismatches.length} 项：`);
    baselineMismatches.forEach(item => console.error(`- ${item}`));
    process.exitCode = 1;
  } else if (!failing.length && !options.writeBaselinePath && options.baselinePath) {
    console.log(`Visual warning baseline passed: ${results.length} run(s).`);
  }
  if (appearanceBaselineMismatches.length) {
    console.error(`外观证据基线不匹配，共 ${appearanceBaselineMismatches.length} 项：`);
    appearanceBaselineMismatches.forEach(item => console.error(`- ${item}`));
    process.exitCode = 1;
  } else if (!failing.length && !options.writeAppearanceBaselinePath && options.appearanceBaselinePath) {
    const appearanceRuns = results.filter(result => result.appearance).length;
    if (appearanceRuns) console.log(`Appearance evidence baseline passed: ${appearanceRuns} run(s).`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
