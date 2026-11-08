/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const portableGit = resolve(root, 'tmp/mingit/cmd/git.exe');

function resolveGit() {
  if (process.env.GIT && existsSync(process.env.GIT)) return process.env.GIT;
  if (existsSync(portableGit)) return portableGit;
  return 'git';
}

const git = resolveGit();
try {
  execFileSync(git, ['config', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'inherit' });
  const current = execFileSync(git, ['config', 'core.hooksPath'], { cwd: root, encoding: 'utf8' }).trim();
  console.log(`hooks installed: core.hooksPath=${current}`);
  console.log('pre-push runs: pnpm verify:static');
} catch (error) {
  // postinstall 会在没有 git 或非仓库目录（打包产物、离线装机）时执行一次，
  // 装不上钩子不该让依赖安装整条失败，提示后继续。
  console.warn(`hooks not installed: ${error instanceof Error ? error.message : String(error)}`);
}
