/* eslint-disable import-x/no-nodejs-modules */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const defaultSizes = [
  { height: 700, label: 'default', width: 360 },
  { height: 844, label: 'phone-tall', width: 390 },
  { height: 900, label: 'wide-tall', width: 430 },
];
let stopActiveCheck = null;

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void stopActiveCheck?.().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143));
  });
}

function parseArgs(argv) {
  const options = {
    listOnly: false,
    outDir: resolve(root, 'tmp/ui-check/latest'),
    port: 5179,
    scenarios: null,
    sizes: defaultSizes,
  };

  argv.forEach(arg => {
    if (arg === '--list') options.listOnly = true;
    if (arg.startsWith('--out=')) options.outDir = resolve(root, arg.slice('--out='.length));
    if (arg.startsWith('--port=')) options.port = Number(arg.slice('--port='.length)) || options.port;
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
        .split(',')
        .map(item => {
          const [width, height] = item.split('x').map(value => Number(value));
          return {
            height: Number.isFinite(height) ? height : 700,
            label: `${width}x${height}`,
            width: Number.isFinite(width) ? width : 360,
          };
        });
    }
  });

  return options;
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

function startVite(port) {
  let server = null;
  const outDir = resolve(root, 'tmp/ui-check/server');
  const ready = (async () => {
    const { build, preview } = await import('vite');
    await build({
      clearScreen: false,
      mode: 'visual',
      root,
      build: {
        emptyOutDir: true,
        outDir,
        rollupOptions: {
          input: resolve(root, 'visual-harness.html'),
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    });
    server = await preview({
      clearScreen: false,
      mode: 'visual',
      root,
      build: { outDir },
      preview: {
        host: '127.0.0.1',
        port,
        strictPort: true,
      },
    });
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

async function loadHarnessScenarios(page, port) {
  const pageErrors = [];
  const handlePageError = error => pageErrors.push(error.message);
  page.on('pageerror', handlePageError);
  try {
    await page.goto(`http://127.0.0.1:${port}/visual-harness.html?manual=1`, { waitUntil: 'networkidle' });
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

    const controls = Array.from(shell.querySelectorAll('button,input,select,textarea')).filter(element => {
      return (
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
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 8 && rect.height > 8 && (rect.left < shellRect.left - 2 || rect.right > shellRect.right + 2)
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

  await mkdir(options.outDir, { recursive: true });
  const vite = startVite(options.port);
  const results = [];
  let browser = null;

  const stop = async () => {
    await browser?.close();
    browser = null;
    await vite.stop();
  };
  stopActiveCheck = stop;

  try {
    await vite.ready;
    browser = await playwright.chromium.launch();
    const page = await browser.newPage();
    page.setDefaultTimeout(10_000);
    page.setDefaultNavigationTimeout(15_000);
    await page.setViewportSize({ height: 780, width: 520 });
    const harnessScenarios = await loadHarnessScenarios(page, options.port);
    const scenarios =
      !options.scenarios?.length || options.scenarios.includes('all') ? harnessScenarios : options.scenarios;

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
        const url = `http://127.0.0.1:${options.port}/visual-harness.html?manual=1`;
        await page.goto(url, { waitUntil: 'networkidle' });
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
        const screenshotName = `${sanitizeName(scenario)}-${sanitizeName(size.label)}.png`;
        await shell.screenshot({ path: resolve(options.outDir, screenshotName) });
        results.push({
          findings: await runDomChecks(page),
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
  console.log(`UI visual report: ${resolve(options.outDir, 'index.html')}`);
  if (failing.length) {
    console.error(`发现 ${failing.length} 个场景存在 fail。`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
