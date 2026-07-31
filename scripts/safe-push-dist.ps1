param(
  [string]$CommitMessage = '',
  [switch]$DryRun,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [string[]]$Arguments
  )

  Write-Host ">>> $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Command $($Arguments -join ' ')"
  }
}

function Invoke-Capture {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [string[]]$Arguments
  )

  Write-Host ">>> $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
  $output = & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Command $($Arguments -join ' ')"
  }
  return (($output | Out-String).Trim())
}

function Invoke-CheckedWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [string[]]$Arguments,
    [int]$Attempts = 3
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt += 1) {
    Write-Host ">>> $Command $($Arguments -join ' ') (attempt $attempt/$Attempts)" -ForegroundColor DarkGray
    & $Command @Arguments
    if ($LASTEXITCODE -eq 0) {
      return
    }
    if ($attempt -lt $Attempts) {
      $delaySeconds = 2 * $attempt
      Write-Host "Network command failed. Retrying in $delaySeconds seconds..." -ForegroundColor Yellow
      Start-Sleep -Seconds $delaySeconds
    }
  }

  Write-Host 'GitHub connection failed repeatedly. Check whether the Git proxy is running and retry later.' -ForegroundColor Red
  Write-Host 'Current proxy settings: git config --global --get-regexp "http.*proxy"' -ForegroundColor DarkGray
  throw "Command failed after $Attempts attempts: $Command $($Arguments -join ' ')"
}

function Normalize-RemoteUrl {
  param([string]$Url)
  return ($Url.Trim() -replace '/$', '')
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location -LiteralPath $repoRoot

Write-Host ''
Write-Host 'Safe push tracked changes to GitHub' -ForegroundColor Cyan
Write-Host 'All tracked changes will be published. Untracked files are ignored.' -ForegroundColor Cyan
Write-Host 'A temporary Git index is used. Existing staged changes are never overwritten.' -ForegroundColor Cyan
Write-Host ''

$expectedRemotes = @(
  'https://github.com/nameisnt/ziyong.git',
  'https://github.com/nameisnt/ziyong',
  'git@github.com:nameisnt/ziyong.git'
)
$excludedTrackedPaths = @(
  foreach ($line in Get-Content -LiteralPath '.gitignore' -Encoding UTF8) {
    $path = $line.Trim()
    if (
      $path -and
      -not $path.StartsWith('#') -and
      -not $path.StartsWith('!') -and
      -not $path.Contains('*') -and
      -not $path.Contains('?') -and
      -not $path.Contains('[')
    ) {
      $path -replace '/$', ''
    }
  }
)

$remoteUrl = Normalize-RemoteUrl (Invoke-Capture -Command git -Arguments @('remote', 'get-url', '--push', 'origin'))
if ($expectedRemotes -notcontains $remoteUrl) {
  throw "origin push url is not nameisnt/ziyong: $remoteUrl"
}

$branch = Invoke-Capture -Command git -Arguments @('branch', '--show-current')
if ($branch -ne 'main') {
  throw "Current branch is '$branch', expected 'main'. Stop to avoid pushing the wrong branch."
}

& git diff --cached --quiet --exit-code
$stagedDiffExitCode = $LASTEXITCODE
if ($stagedDiffExitCode -eq 1) {
  throw 'The normal staging area contains changes. Commit or unstage them before publishing.'
}
if ($stagedDiffExitCode -ne 0) {
  throw 'Failed to inspect the normal staging area.'
}

$runBuild = -not $SkipBuild
if ($runBuild) {
  $buildAnswer = Read-Host 'Run pnpm build after syncing main? Press Enter = yes, type n = skip'
  $runBuild = $buildAnswer.Trim().ToLowerInvariant() -notin @('n', 'no')
}

Invoke-CheckedWithRetry -Command git -Arguments @('fetch', 'origin', 'main')

$parent = Invoke-Capture -Command git -Arguments @('rev-parse', 'origin/main')
$head = Invoke-Capture -Command git -Arguments @('rev-parse', 'HEAD')
if ($head -ne $parent) {
  & git merge-base --is-ancestor $head $parent
  $ancestorExitCode = $LASTEXITCODE
  if ($ancestorExitCode -eq 1) {
    throw "Local main ($head) has diverged from origin/main ($parent). Resolve the branch before publishing."
  }
  if ($ancestorExitCode -ne 0) {
    throw 'Failed to compare local main with origin/main.'
  }

  $localChangedFiles = @(& git -c core.safecrlf=false diff --name-only HEAD --)
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect local tracked changes.'
  }
  $remoteChangedFiles = @(& git -c core.safecrlf=false diff --name-only $head $parent --)
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect remote tracked changes.'
  }
  $overlappingFiles = @($localChangedFiles | Where-Object { $remoteChangedFiles -contains $_ })
  $sourceOverlaps = @($overlappingFiles | Where-Object { -not $_.StartsWith('dist/') })
  if ($sourceOverlaps.Count) {
    $overlapList = $sourceOverlaps -join ', '
    throw "Local and remote changes overlap outside dist/: $overlapList"
  }
  if ($overlappingFiles.Count) {
    if (-not $runBuild) {
      throw 'Local and remote dist changes overlap. Allow the script to rebuild before publishing.'
    }
    Write-Host ''
    Write-Host 'Remote bundle changes overlap local dist/. Resetting generated files before the fast-forward.' -ForegroundColor Yellow
    Invoke-Checked -Command git -Arguments @('restore', '--worktree', "--source=$head", '--', 'dist')
  }

  Write-Host ''
  Write-Host 'Local main is behind origin/main. Fast-forwarding before the build...' -ForegroundColor Yellow
  Invoke-Checked -Command git -Arguments @('merge', '--ff-only', 'origin/main')
  $head = Invoke-Capture -Command git -Arguments @('rev-parse', 'HEAD')
  if ($head -ne $parent) {
    throw "Fast-forward finished at $head instead of expected origin/main $parent."
  }
}

if ($runBuild) {
  Invoke-Checked -Command pnpm -Arguments @('build')
}

if (-not (Test-Path -LiteralPath 'dist')) {
  throw 'dist/ does not exist. Run pnpm build first.'
}

Write-Host 'Build warnings such as the Vite chunk-size notice do not block publishing.' -ForegroundColor DarkGray

$distFiles = Get-ChildItem -LiteralPath 'dist' -File | Sort-Object Name
if (-not $distFiles.Count) {
  throw 'dist/ is empty. Run pnpm build first.'
}

$requiredFiles = @('index.css', 'index.js')
foreach ($fileName in $requiredFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path 'dist' $fileName))) {
    throw "Missing dist file: $fileName"
  }
}

Write-Host ''
Write-Host 'Current build artifacts:' -ForegroundColor Yellow
$distFiles | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
  $CommitMessage = 'update source and dist ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')
}
$messageInput = Read-Host "Commit message. Press Enter to use default: $CommitMessage"
if (-not [string]::IsNullOrWhiteSpace($messageInput)) {
  $trimmedMessage = $messageInput.Trim()
  if ($trimmedMessage.ToLowerInvariant() -eq 'yes') {
    Write-Host 'Input "yes" was treated as an accidental early confirmation. Keep default commit message.' -ForegroundColor Yellow
  } else {
    $CommitMessage = $trimmedMessage
  }
}

$originalIndex = $env:GIT_INDEX_FILE
$tmpIndex = Join-Path $env:TEMP ('ziyong-publish-index-' + [guid]::NewGuid().ToString())

try {
  $untrackedFiles = @(& git ls-files --others --exclude-standard)
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect untracked files.'
  }
  if ($untrackedFiles.Count) {
    Write-Host ''
    Write-Host 'Untracked files will be ignored:' -ForegroundColor DarkGray
    $untrackedFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
  }

  $env:GIT_INDEX_FILE = $tmpIndex
  Invoke-Checked -Command git -Arguments @('read-tree', $parent)
  Invoke-Checked -Command git -Arguments @('-c', 'core.safecrlf=false', 'add', '--update', '--', '.')

  $trackedExclusions = @()
  foreach ($path in $excludedTrackedPaths) {
    $matches = @(& git ls-files -- $path)
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to inspect excluded path: $path"
    }
    if ($matches.Count) {
      $trackedExclusions += $path
    }
  }
  if ($trackedExclusions.Count) {
    $restoreArguments = @('restore', '--staged', "--source=$parent", '--') + $trackedExclusions
    Invoke-Checked -Command git -Arguments $restoreArguments
  }

  & git diff --cached --quiet --exit-code $parent
  $diffExitCode = $LASTEXITCODE
  if ($diffExitCode -eq 0) {
    Write-Host 'There are no tracked changes compared with origin/main. Nothing to push.' -ForegroundColor Yellow
    exit 0
  }
  if ($diffExitCode -ne 1) {
    throw 'Failed to compare tracked changes with origin/main.'
  }

  Write-Host ''
  Write-Host 'Tracked files that will be published:' -ForegroundColor Yellow
  & git diff --cached --name-status $parent
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to show the staged file list.'
  }

  Write-Host ''
  Write-Host 'Diff summary:' -ForegroundColor Yellow
  & git diff --cached --stat $parent
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to show the staged diff.'
  }

  $tree = Invoke-Capture -Command git -Arguments @('write-tree')
  $parentTree = Invoke-Capture -Command git -Arguments @('rev-parse', "$parent^{tree}")
  if ($tree -eq $parentTree) {
    Write-Host 'The generated tree is identical to origin/main. Nothing to push.' -ForegroundColor Yellow
    exit 0
  }

  $confirm = Read-Host 'Push to https://github.com/nameisnt/ziyong main? Type YES to continue'
  if ($confirm -ne 'YES') {
    Write-Host 'Canceled. Nothing was pushed.' -ForegroundColor Yellow
    exit 0
  }

  $commit = Invoke-Capture -Command git -Arguments @('commit-tree', $tree, '-p', $parent, '-m', $CommitMessage)
  $actualParent = Invoke-Capture -Command git -Arguments @('rev-parse', "$commit^")
  if ($actualParent -ne $parent) {
    throw "Created commit parent mismatch. Expected $parent, got $actualParent."
  }

  Write-Host ''
  Write-Host "Created commit: $commit" -ForegroundColor Green

  if ($DryRun) {
    Write-Host 'DryRun mode: git push was not executed.' -ForegroundColor Yellow
    exit 0
  }

  Invoke-CheckedWithRetry -Command git -Arguments @('push', 'origin', "$commit`:refs/heads/main")

  $env:GIT_INDEX_FILE = $originalIndex
  Invoke-Checked -Command git -Arguments @('read-tree', $commit)
  try {
    Invoke-Checked -Command git -Arguments @('update-ref', 'refs/heads/main', $commit, $parent)
  } catch {
    Invoke-Checked -Command git -Arguments @('read-tree', $parent)
    throw
  }

  Write-Host ''
  Write-Host "Push succeeded: $commit" -ForegroundColor Green
  Write-Host 'Local main and the normal index were synchronized to the pushed commit.' -ForegroundColor Green
  Invoke-CheckedWithRetry -Command git -Arguments @('ls-remote', '--heads', 'origin', 'main')
}
finally {
  $env:GIT_INDEX_FILE = $originalIndex
  if (Test-Path -LiteralPath $tmpIndex) {
    Remove-Item -LiteralPath $tmpIndex -Force
  }
}
