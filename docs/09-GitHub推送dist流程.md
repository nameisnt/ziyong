# GitHub 推送 dist 流程

本文档用于让其他助手或人工只负责把当前构建产物推送到 GitHub。

目标仓库：

- `https://github.com/nameisnt/ziyong.git`
- 分支：`main`
- 只推送：`dist/`

重要原则：

- 不要执行 `git add -A`。
- 不要普通提交整个工作区。
- 本项目本地工作区通常有很多未跟踪源码、文档、临时文件，只允许把当前 `dist` 发布到远端。
- 使用临时 Git index 基于 `origin/main` 生成一个只包含 `dist` 的提交。

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
- 只把 `dist/` 写入临时 Git index。
- 不会 `git add -A`。
- 不会提交源码、文档、参考拓展或临时文件。
- 不会删除本地工作区文件。
- 最后必须输入 `YES` 才会推送。

如果只想演练不推送，可在 PowerShell 中执行：

```powershell
.\scripts\safe-push-dist.ps1 -DryRun
```

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

## 5. 只推送 dist

把下面脚本整段复制到 PowerShell 执行。

可以按本次改动修改 `$commitMessage`。

```powershell
cd E:\tavern_extension_template-main

$ErrorActionPreference = 'Stop'
$commitMessage = 'update dist'
$originalIndex = $env:GIT_INDEX_FILE
$tmpIndex = Join-Path $env:TEMP ("ziyong-index-" + [guid]::NewGuid().ToString())

try {
  git fetch origin main

  $env:GIT_INDEX_FILE = $tmpIndex
  git read-tree origin/main

  git rm -r -f --cached --ignore-unmatch dist
  git add -- dist

  $tree = git write-tree
  $parent = git rev-parse origin/main
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
