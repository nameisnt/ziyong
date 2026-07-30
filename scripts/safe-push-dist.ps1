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
Write-Host 'Safe push dist to GitHub' -ForegroundColor Cyan
Write-Host 'Only dist/ will be published. Source/docs/reference/temp files are ignored.' -ForegroundColor Cyan
Write-Host 'A temporary Git index is used. Your working tree and normal staging area are not touched.' -ForegroundColor Cyan
Write-Host ''

$expectedRemotes = @(
  'https://github.com/nameisnt/ziyong.git',
  'https://github.com/nameisnt/ziyong',
  'git@github.com:nameisnt/ziyong.git'
)

$remoteUrl = Normalize-RemoteUrl (Invoke-Capture -Command git -Arguments @('remote', 'get-url', '--push', 'origin'))
if ($expectedRemotes -notcontains $remoteUrl) {
  throw "origin push url is not nameisnt/ziyong: $remoteUrl"
}

$branch = Invoke-Capture -Command git -Arguments @('branch', '--show-current')
if ($branch -ne 'main') {
  throw "Current branch is '$branch', expected 'main'. Stop to avoid pushing the wrong branch."
}

if (-not $SkipBuild) {
  $buildAnswer = Read-Host 'Run pnpm build first? Press Enter = yes, type n = skip'
  if ($buildAnswer.Trim().ToLowerInvariant() -notin @('n', 'no')) {
    Invoke-Checked -Command pnpm -Arguments @('build')
  }
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
Write-Host 'Only these dist files will be published:' -ForegroundColor Yellow
$distFiles | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
  $CommitMessage = 'update dist ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')
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
$tmpIndex = Join-Path $env:TEMP ('ziyong-dist-index-' + [guid]::NewGuid().ToString())

try {
  Invoke-CheckedWithRetry -Command git -Arguments @('fetch', 'origin', 'main')

  $env:GIT_INDEX_FILE = $tmpIndex
  Invoke-Checked -Command git -Arguments @('read-tree', 'origin/main')

  Write-Host ''
  Write-Host 'Note: git rm below only touches the temporary index. Local files will not be deleted.' -ForegroundColor Yellow
  Invoke-Checked -Command git -Arguments @('rm', '-r', '-f', '--cached', '--ignore-unmatch', 'dist')
  Invoke-Checked -Command git -Arguments @('add', '--', 'dist')

  & git diff --cached --quiet --exit-code origin/main -- dist
  if ($LASTEXITCODE -eq 0) {
    Write-Host 'dist has no changes compared with origin/main. Nothing to push.' -ForegroundColor Yellow
    exit 0
  }

  Write-Host ''
  Write-Host 'dist diff that will be pushed:' -ForegroundColor Yellow
  & git diff --cached --stat origin/main -- dist
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to show staged dist diff.'
  }

  $tree = Invoke-Capture -Command git -Arguments @('write-tree')
  $parent = Invoke-Capture -Command git -Arguments @('rev-parse', 'origin/main')
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

  Write-Host ''
  Write-Host "Push succeeded: $commit" -ForegroundColor Green
  Invoke-CheckedWithRetry -Command git -Arguments @('ls-remote', '--heads', 'origin', 'main')
}
finally {
  $env:GIT_INDEX_FILE = $originalIndex
  if (Test-Path -LiteralPath $tmpIndex) {
    Remove-Item -LiteralPath $tmpIndex -Force
  }
}
