# GitHub 安全推送流程

本文档用于让其他助手或人工把当前源码、脚本、文档和构建产物安全推送到 GitHub。

目标仓库：

- `https://github.com/nameisnt/ziyong.git`
- 分支：`main`
- 推送范围：当前所有有实际差异的已跟踪文件，以及脚本明确允许的正式新源码、根层 Markdown 文档、归档/执行文档、测试和基线
- 不推送：允许清单之外的未跟踪文件，以及被 `.gitignore` 排除的本地资料

重要原则：

- 不要执行 `git add -A`。
- 不要普通提交整个工作区。
- 本项目本地工作区可能有缓存和临时文件；未跟踪文件只有命中脚本明确允许边界时才进入候选。
- 使用临时 Git index 基于最新 `origin/main` 生成提交，不影响普通暂存区。
- 本地 `HEAD` 必须与最新 `origin/main` 一致，或是 `origin/main` 的后代；脚本不会覆盖已分叉的远端提交。本地领先且仍有后续工作区改动时，新候选提交会接在现有本地 `HEAD` 之后。

## 0. 推荐：直接运行安全脚本

仓库根目录已经提供双击脚本：

```text
一键安全推送dist到GitHub.cmd
```

它会调用：

```text
scripts/safe-push-dist.ps1
```

脚本特性：

- 会确认远端必须是 `nameisnt/ziyong`。
- 会确认当前分支是 `main`。
- 默认先询问是否执行 `pnpm build`。
- 把所有有实际差异的已跟踪文件写入临时 Git index。
- 不会 `git add -A`。
- 会提交已跟踪的源码、脚本、文档和构建产物。
- 只会纳入明确允许的新 `src/`、根层 `docs/*.md`、`docs/archive/`、`docs/execution/`、测试与基线文件。
- 不会纳入参考拓展、备份、临时文件或其他未跟踪路径。
- 不会删除本地工作区文件。
- 如果本地 `main` 落后于 `origin/main`，会在构建前自动快进。
- 如果本地 `main` 已领先且工作区还有后续改动，会保留既有本地提交，并以当前 `HEAD` 为父提交生成新的发布候选。
- 如果本地 `main` 已领先且没有可发布的后续改动，会验证并直接推送既有 `HEAD`，不会改写提交。
- 如果远端 Bundle 与本地 `dist/` 重叠，会先重置旧构建产物，快进后重新构建。
- 如果本地与远端发生分叉、文件冲突或普通暂存区已有内容，会停止发布。
- 推送成功后会同步本地 `main` 和普通 index，避免下次发布仍停留在旧提交。
- 最后必须输入 `YES` 才会推送。

如果只想演练不推送，可在 PowerShell 中执行：

```powershell
.\scripts\safe-push-dist.ps1 -DryRun
```

### 只取消 Git 跟踪、保留本地 ignored 目录

这不是普通发布操作。只有已经单独确认退出跟踪范围时，才可以先在普通 index 或本地提交中完整删除跟踪关系，再显式传入精确的 `.gitignore` 目录：

```powershell
.\scripts\safe-push-dist.ps1 -DryRun -SkipBuild -UntrackIgnoredPath '可参考拓展'
```

不传 `-UntrackIgnoredPath` 时，ignored 目录即使在普通 index 中显示删除，也会继续从发布候选排除。传入后脚本仍会逐项确认：

- 参数是 `.gitignore` 中无通配符的精确目录；
- `origin/main` 仍跟踪目标文件；
- 普通 index 已完整删除该目录，或本地领先提交已经完整删除；
- 本地 HEAD 与远端在目标目录没有内容分叉；
- 原文件仍在本地，并且 blob 与远端父提交完全一致。

任一条件不满足都会停止。脚本只在临时发布 index 中执行 `git rm --cached`，不会删除本地目录。正式运行前必须先用 `-DryRun` 确认候选只有预期的 `D` 项、没有同目录 `A` 项。

## 1. 进入项目目录

```powershell
cd E:\tavern_extension_template-main
```

## 2. 确认远端

```powershell
git remote -v
```

应看到：

```text
origin  https://github.com/nameisnt/ziyong.git (fetch)
origin  https://github.com/nameisnt/ziyong.git (push)
```

如果不是这个仓库，先停止，不要推送。

## 3. 构建 dist

```powershell
pnpm build
```

如果构建成功，`dist` 下通常会有：

```text
dist/index.css
dist/index.js
dist/panel.css
dist/panel.xxxxxxxx.chunk.js
```

其中 `panel.xxxxxxxx.chunk.js` 的 hash 每次构建可能不同，这是正常的。

## 4. 检查 dist

```powershell
Get-ChildItem -LiteralPath dist -Force | Select-Object Name,Length,LastWriteTime
```

确认 `dist` 存在且文件时间是刚构建后的时间。

## 5. 仅在没有新增正式文件时的手动方案

下列手动命令只有 `git add --update -- .`，不会纳入新增源码、测试或文档。当前工作树存在新增正式文件时必须使用第 0 节安全脚本，不能使用本节代替。

把下面脚本整段复制到 PowerShell 执行。

可以按本次改动修改 `$commitMessage`。

```powershell
cd E:\tavern_extension_template-main

$ErrorActionPreference = 'Stop'
$commitMessage = 'update source and dist'
$originalIndex = $env:GIT_INDEX_FILE
$tmpIndex = Join-Path $env:TEMP ("ziyong-index-" + [guid]::NewGuid().ToString())

try {
  git fetch origin main

  $parent = git rev-parse origin/main
  $head = git rev-parse HEAD
  if ($head -ne $parent) {
    throw 'Local HEAD is not the latest origin/main. Update main before publishing.'
  }

  $env:GIT_INDEX_FILE = $tmpIndex
  git read-tree $parent
  git add --update -- .

  git diff --cached --name-status $parent
  git diff --cached --stat $parent

  $tree = git write-tree
  $commit = git commit-tree $tree -p $parent -m $commitMessage

  git push origin "$commit`:refs/heads/main"

  Write-Output "PUSHED_COMMIT=$commit"
  git ls-remote --heads origin main
}
finally {
  $env:GIT_INDEX_FILE = $originalIndex
  if (Test-Path -LiteralPath $tmpIndex) {
    Remove-Item -LiteralPath $tmpIndex -Force
  }
}
```

## 6. 成功标志

成功时会看到类似：

```text
PUSHED_COMMIT=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx refs/heads/main
```

并且 `git push` 会显示远端 `main` 被更新。

## 7. 常见问题

### pnpm build 报 `spawn EPERM`

这是环境权限阻止 Vite/esbuild 启动子进程。需要在允许构建子进程的环境里重新执行：

```powershell
pnpm build
```

### git push 要求登录

需要先完成 GitHub 认证。可以使用 GitHub Desktop、浏览器凭据，或：

```powershell
gh auth login
```

认证完成后重新执行第 5 步。

### 远端被别人更新

第 5 步脚本每次都会先 `git fetch origin main`，并以最新 `origin/main` 为父提交。通常可直接重跑。

### 提示 `Local main is ahead` 且工作区不干净

新版脚本允许这种正常情况：只要 `origin/main` 仍是本地 `HEAD` 的祖先，后续改动会成为本地 `HEAD` 的子提交。若实际已经分叉，脚本仍会停止，不能强推覆盖。

### 不小心普通 git add 了很多文件

不要提交，不要推送。执行：

```powershell
git status --short
```

如果只是暂存区误加了文件，可以先联系当前写代码的人处理。不要用 `git reset --hard`。

## 8. 推送后给写代码方的信息

推送完成后，把以下信息发回：

- 推送成功
- commit hash
- 是否执行过 `pnpm build`
- 有无异常或警告
