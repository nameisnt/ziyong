param(
  [string]$CommitMessage = '',
  [switch]$DryRun,
  [switch]$SkipBuild,
  [switch]$ConfirmPush,
  [string[]]$UntrackIgnoredPath = @()
)

$ErrorActionPreference = 'Stop'
$utf8Encoding = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8Encoding
[Console]::OutputEncoding = $utf8Encoding
$OutputEncoding = $utf8Encoding

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

function Invoke-CaptureAllowFailure {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [string[]]$Arguments
  )

  $savedErrorActionPreference = $ErrorActionPreference
  $nativePreferenceVariable = Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue
  if ($nativePreferenceVariable) {
    $savedNativePreference = $nativePreferenceVariable.Value
  }

  try {
    $ErrorActionPreference = 'Continue'
    if ($nativePreferenceVariable) {
      Set-Variable -Name PSNativeCommandUseErrorActionPreference -Value $false
    }
    $output = @(& $Command @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $savedErrorActionPreference
    if ($nativePreferenceVariable) {
      Set-Variable -Name PSNativeCommandUseErrorActionPreference -Value $savedNativePreference
    }
  }

  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = $output
  }
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

function Normalize-RepositoryPath {
  param([string]$Path)
  return (($Path.Trim() -replace '\\', '/') -replace '/+$', '')
}

function Get-TreePaths {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Commit,
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $paths = @(& git -c core.quotepath=false ls-tree -r --name-only $Commit -- $Path)
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to inspect tracked paths at $Commit under $Path."
  }
  return $paths
}

function Test-SamePathSet {
  param(
    [object[]]$Left = @(),
    [object[]]$Right = @()
  )

  $leftKey = @($Left | Sort-Object) -join "`n"
  $rightKey = @($Right | Sort-Object) -join "`n"
  return $leftKey -ceq $rightKey
}

function Get-ThreeWayConflictPaths {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BaseCommit,
    [Parameter(Mandatory = $true)]
    [string]$TargetCommit
  )

  $savedIndex = $env:GIT_INDEX_FILE
  $checkIndex = Join-Path $env:TEMP ('ziyong-merge-check-index-' + [guid]::NewGuid().ToString())
  $checkPatch = Join-Path $env:TEMP ('ziyong-merge-check-' + [guid]::NewGuid().ToString() + '.patch')

  try {
    & git -c core.safecrlf=false diff --binary "--output=$checkPatch" $BaseCommit --
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to create the local tracked-change merge patch.'
    }
    if (-not (Test-Path -LiteralPath $checkPatch) -or (Get-Item -LiteralPath $checkPatch).Length -eq 0) {
      return @()
    }

    $env:GIT_INDEX_FILE = $checkIndex
    & git read-tree $TargetCommit
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to initialize the temporary merge index.'
    }

    $applyResult = Invoke-CaptureAllowFailure -Command git -Arguments @(
      'apply',
      '--cached',
      '--3way',
      '--whitespace=nowarn',
      $checkPatch
    )
    $applyExitCode = $applyResult.ExitCode
    if ($applyExitCode -eq 0) {
      return @()
    }
    $applyResult.Output | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }

    $unmergedEntries = @(& git -c core.quotepath=false ls-files -u)
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to inspect the temporary merge conflicts.'
    }
    $conflictPaths = @(
      $unmergedEntries | ForEach-Object {
        if ($_ -match '^\d+ [0-9a-f]+ [123]\t(.+)$') {
          $Matches[1]
        }
      } | Sort-Object -Unique
    )
    if (-not $conflictPaths.Count) {
      throw 'Three-way merge preflight failed without reporting conflict paths.'
    }
    return $conflictPaths
  }
  finally {
    $env:GIT_INDEX_FILE = $savedIndex
    if (Test-Path -LiteralPath $checkIndex) {
      Remove-Item -LiteralPath $checkIndex -Force
    }
    if (Test-Path -LiteralPath $checkPatch) {
      Remove-Item -LiteralPath $checkPatch -Force
    }
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location -LiteralPath $repoRoot

Write-Host ''
Write-Host 'Safe push source and tracked changes to GitHub' -ForegroundColor Cyan
Write-Host 'All tracked changes plus explicitly allowed new source, docs, and verification files will be published.' -ForegroundColor Cyan
Write-Host 'Other untracked files are ignored.' -ForegroundColor Cyan
Write-Host 'A temporary Git index is used. Existing staged changes are never overwritten.' -ForegroundColor Cyan
Write-Host ''

$rootDocumentationPaths = @(
  'docs/CURRENT.md',
  'docs/DECISIONS.md',
  'docs/CODEMAP.md'
)
$actualRootDocumentationPaths = @(
  Get-ChildItem -LiteralPath 'docs' -File -Filter '*.md' |
    Sort-Object Name |
    ForEach-Object { 'docs/' + $_.Name }
)
if (-not (Test-SamePathSet -Left $rootDocumentationPaths -Right $actualRootDocumentationPaths)) {
  throw "docs/ must contain only CURRENT.md, DECISIONS.md, and CODEMAP.md. Found: $($actualRootDocumentationPaths -join ', ')"
}

$allowedNewExactPaths = @($rootDocumentationPaths) + @(
  'scripts/backup-contract-check.mjs',
  'scripts/check-eslint-baseline.mjs',
  'scripts/check-style-guard.ps1',
  'scripts/config-recovery-contract-check.mjs',
  'scripts/recovery-contract-check.mjs',
  'scripts/structure-contract-check.mjs',
  'scripts/ui-appearance-contracts.mjs',
  'scripts/ui-interaction-contracts.mjs',
  'scripts/ui-contract-check.mjs'
)
$allowedNewPrefixes = @(
  'src/',
  'docs/archive/',
  'scripts/baselines/',
  'scripts/unit/'
)
$allowedPublishPaths = @('src') + @($rootDocumentationPaths) + @(
  'docs/archive',
  'scripts/backup-contract-check.mjs',
  'scripts/check-eslint-baseline.mjs',
  'scripts/check-style-guard.ps1',
  'scripts/config-recovery-contract-check.mjs',
  'scripts/recovery-contract-check.mjs',
  'scripts/baselines',
  'scripts/structure-contract-check.mjs',
  'scripts/ui-appearance-contracts.mjs',
  'scripts/ui-interaction-contracts.mjs',
  'scripts/ui-contract-check.mjs',
  'scripts/unit'
)

function Test-AllowedNewPath {
  param([Parameter(Mandatory = $true)][string]$Path)

  if ($allowedNewExactPaths -contains $Path) {
    return $true
  }
  return @($allowedNewPrefixes | Where-Object { $Path.StartsWith($_) }).Count -gt 0
}

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
$normalizedExcludedTrackedPaths = @(
  $excludedTrackedPaths |
    ForEach-Object { Normalize-RepositoryPath -Path $_ } |
    Where-Object { $_ } |
    Sort-Object -Unique
)
$requestedUntrackPaths = @(
  $UntrackIgnoredPath |
    ForEach-Object { Normalize-RepositoryPath -Path $_ } |
    Where-Object { $_ } |
    Sort-Object -Unique
)

$remoteUrl = Normalize-RemoteUrl (Invoke-Capture -Command git -Arguments @('remote', 'get-url', '--push', 'origin'))
if ($expectedRemotes -notcontains $remoteUrl) {
  throw "origin push url is not nameisnt/ziyong: $remoteUrl"
}

$branch = Invoke-Capture -Command git -Arguments @('branch', '--show-current')
if ($branch -ne 'main') {
  throw "Current branch is '$branch', expected 'main'. Stop to avoid pushing the wrong branch."
}

$runBuild = -not $SkipBuild -and -not $DryRun
if ($runBuild) {
  $buildAnswer = Read-Host 'Run pnpm build after syncing main? Press Enter = yes, type n = skip'
  $runBuild = $buildAnswer.Trim().ToLowerInvariant() -notin @('n', 'no')
}

if (-not $DryRun) {
  Invoke-CheckedWithRetry -Command git -Arguments @('fetch', 'origin', 'main')
}

$parent = Invoke-Capture -Command git -Arguments @('rev-parse', 'origin/main')
$head = Invoke-Capture -Command git -Arguments @('rev-parse', 'HEAD')
$pushExistingHead = $false
$appendToLocalHead = $false
$candidateParent = $parent
$previewBehindWithoutSync = $false
$localChangedFiles = @()
$preservedExcludedStagedDeletions = @()
if ($head -ne $parent) {
  & git merge-base --is-ancestor $parent $head
  $remoteAncestorExitCode = $LASTEXITCODE
  if ($remoteAncestorExitCode -eq 0) {
    & git diff --cached --quiet --exit-code
    $stagedDiffExitCode = $LASTEXITCODE
    & git diff --quiet --exit-code
    $worktreeDiffExitCode = $LASTEXITCODE
    $untrackedForAheadPush = @(& git ls-files --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to inspect untracked files before pushing the existing local HEAD.'
    }
    if ($stagedDiffExitCode -eq 0 -and $worktreeDiffExitCode -eq 0 -and -not $untrackedForAheadPush.Count) {
      $pushExistingHead = $true
      Write-Host "Local main is ahead of origin/main; the existing HEAD will be verified and pushed without rewriting it." -ForegroundColor Yellow
    } else {
      $appendToLocalHead = $true
      $candidateParent = $head
      Write-Host "Local main is ahead of origin/main and has later workspace changes; the publish candidate will be committed on top of the existing local HEAD." -ForegroundColor Yellow
    }
  } elseif ($remoteAncestorExitCode -ne 1) {
    throw 'Failed to determine whether origin/main is an ancestor of local HEAD.'
  }
}
if ($head -ne $parent -and -not $pushExistingHead -and -not $appendToLocalHead) {
  & git merge-base --is-ancestor $head $parent
  $ancestorExitCode = $LASTEXITCODE
  if ($ancestorExitCode -eq 1) {
    throw "Local main ($head) has diverged from origin/main ($parent). Resolve the branch before publishing."
  }
  if ($ancestorExitCode -ne 0) {
    throw 'Failed to compare local main with origin/main.'
  }

  $localChangedFiles = @(& git -c core.quotepath=false -c core.safecrlf=false diff --name-only HEAD --)
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect local tracked changes.'
  }
  $localDeletedFiles = @(& git -c core.quotepath=false -c core.safecrlf=false diff --name-only --diff-filter=D HEAD --)
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect locally deleted files.'
  }
  $remoteChangedFiles = @(& git -c core.quotepath=false -c core.safecrlf=false diff --name-only $head $parent --)
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect remote tracked changes.'
  }
  $overlappingFiles = @($localChangedFiles | Where-Object { $remoteChangedFiles -contains $_ })
  $distOverlaps = @($overlappingFiles | Where-Object { $_.StartsWith('dist/') })
  if ($distOverlaps.Count -and -not $runBuild) {
    throw 'Local and remote dist changes overlap. Allow the script to rebuild before publishing.'
  }

  $remoteAddedFiles = @(& git -c core.quotepath=false -c core.safecrlf=false diff --name-only --diff-filter=A $head $parent --)
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect files added by the remote branch.'
  }
  $untrackedBeforeSync = @(& git -c core.quotepath=false ls-files --others --exclude-standard)
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect untracked files before syncing main.'
  }
  $untrackedCollisions = @($untrackedBeforeSync | Where-Object { $remoteAddedFiles -contains $_ })
  if ($untrackedCollisions.Count) {
    throw "Remote main added paths that already exist as local untracked files: $($untrackedCollisions -join ', ')"
  }

  Write-Host ''
  Write-Host 'Preflighting local tracked changes against origin/main with a temporary index...' -ForegroundColor Yellow
  $preflightConflicts = @(Get-ThreeWayConflictPaths -BaseCommit $head -TargetCommit $parent)
  $sourceConflicts = @($preflightConflicts | Where-Object { -not $_.StartsWith('dist/') })
  if ($sourceConflicts.Count) {
    Write-Host ''
    Write-Host 'True line-level conflicts were found:' -ForegroundColor Yellow
    $sourceConflicts | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host 'The current local versions of these files will be kept automatically.' -ForegroundColor Yellow
  }

  if ($DryRun) {
    $previewBehindWithoutSync = $true
    Write-Host 'DryRun will preview the candidate on origin/main without changing the local branch or index.' -ForegroundColor Yellow
  } else {
    $stagedPaths = @(& git -c core.quotepath=false diff --cached --name-only HEAD --)
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to inspect the normal staging area.'
    }
    $stagedNonDeletions = @(& git -c core.quotepath=false diff --cached --name-only --diff-filter=ACMRTUXB HEAD --)
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to inspect staged change types.'
    }
    $stagedOutsideExcludedPaths = @()
    foreach ($stagedPath in $stagedPaths) {
      $isExcluded = $false
      foreach ($excludedPath in $normalizedExcludedTrackedPaths) {
        if ($stagedPath -eq $excludedPath -or $stagedPath.StartsWith("$excludedPath/")) {
          $isExcluded = $true
          break
        }
      }
      if (-not $isExcluded) {
        $stagedOutsideExcludedPaths += $stagedPath
      }
    }
    $blockingStagedPaths = @($stagedNonDeletions + $stagedOutsideExcludedPaths | Sort-Object -Unique)
    if ($blockingStagedPaths.Count -gt 0) {
      throw "The normal staging area contains publishable changes while main needs synchronization: $($blockingStagedPaths -join ', ')"
    }
    if ($stagedPaths.Count) {
      Write-Host "Preserving $($stagedPaths.Count) staged removals from excluded paths while synchronizing main." -ForegroundColor Yellow
    }
    $stagedRemoteOverlaps = @($stagedPaths | Where-Object { $remoteChangedFiles -contains $_ })
    if ($stagedRemoteOverlaps.Count) {
      throw "Remote main also changed staged excluded removals: $($stagedRemoteOverlaps -join ', ')"
    }
    $preservedExcludedStagedDeletions = @(
      $stagedPaths | Where-Object {
        $stagedPath = $_
        -not @(
          $requestedUntrackPaths | Where-Object {
            $stagedPath -eq $_ -or $stagedPath.StartsWith("$_/")
          }
        ).Count
      }
    )
    if ($stagedPaths.Count) {
      Invoke-Checked -Command git -Arguments (@('restore', '--staged', '--source=HEAD', '--') + $stagedPaths)
    }

    Write-Host ''
    Write-Host 'Local main is behind origin/main. Stashing tracked changes and fast-forwarding...' -ForegroundColor Yellow
    $stashCommit = ''
    & git diff --quiet --exit-code HEAD --
    $trackedDiffExitCode = $LASTEXITCODE
    if ($trackedDiffExitCode -eq 1) {
      Invoke-Checked -Command git -Arguments @('stash', 'push', '--keep-index', '-m', 'safe-push-dist automatic sync')
      $stashCommit = Invoke-Capture -Command git -Arguments @('rev-parse', 'refs/stash')
    } elseif ($trackedDiffExitCode -ne 0) {
      throw 'Failed to inspect tracked changes before syncing main.'
    }

    try {
      Invoke-Checked -Command git -Arguments @('merge', '--ff-only', 'origin/main')
    } catch {
      if ($stashCommit) {
        Write-Host 'Fast-forward failed. Your tracked changes remain stored in the automatic stash.' -ForegroundColor Red
        Write-Host "Automatic stash commit: $stashCommit" -ForegroundColor DarkGray
      }
      throw
    }

    if ($stashCommit) {
      Write-Host 'Reapplying local tracked changes...' -ForegroundColor Yellow
      $stashApplyResult = Invoke-CaptureAllowFailure -Command git -Arguments @('stash', 'apply', $stashCommit)
      $stashApplyExitCode = $stashApplyResult.ExitCode
      $stashApplyResult.Output | ForEach-Object { Write-Host $_ }
      $actualConflicts = @(& git -c core.quotepath=false diff --name-only --diff-filter=U)
      if ($LASTEXITCODE -ne 0) {
        throw 'Failed to inspect conflicts after applying the automatic stash.'
      }

      if ($actualConflicts.Count) {
        $unexpectedConflicts = @($actualConflicts | Where-Object { $preflightConflicts -notcontains $_ })
        if ($unexpectedConflicts.Count) {
          throw "Unexpected conflicts appeared while restoring local changes: $($unexpectedConflicts -join ', '). The automatic stash was kept."
        }

        foreach ($path in $actualConflicts) {
          if ($localDeletedFiles -contains $path) {
            Invoke-Checked -Command git -Arguments @('rm', '--', $path)
          } else {
            Invoke-Checked -Command git -Arguments @('checkout', '--theirs', '--', $path)
            Invoke-Checked -Command git -Arguments @('add', '--', $path)
          }
        }
      } elseif ($stashApplyExitCode -ne 0) {
        throw "Automatic stash apply failed without merge conflicts. The stash was kept at $stashCommit."
      }

      $remainingConflicts = @(& git -c core.quotepath=false diff --name-only --diff-filter=U)
      if ($LASTEXITCODE -ne 0 -or $remainingConflicts.Count) {
        throw "Conflicts remain after restoring local changes. The automatic stash was kept at $stashCommit."
      }

      Invoke-Checked -Command git -Arguments @('restore', '--staged', '--source=HEAD', '--', '.')

      $topStash = Invoke-Capture -Command git -Arguments @('rev-parse', 'refs/stash')
      if ($topStash -ne $stashCommit) {
        throw "The automatic stash is no longer at the top of the stash list. It was kept at $stashCommit."
      }
      Invoke-Checked -Command git -Arguments @('stash', 'drop', 'stash@{0}')
    }

    if ($stagedPaths.Count) {
      Invoke-Checked -Command git -Arguments (@('rm', '--cached', '--ignore-unmatch', '--') + $stagedPaths)
    }

    $head = Invoke-Capture -Command git -Arguments @('rev-parse', 'HEAD')
    if ($head -ne $parent) {
      throw "Fast-forward finished at $head instead of expected origin/main $parent."
    }
  }
}

$approvedUntrackPaths = @()

foreach ($path in $requestedUntrackPaths) {
  if ($normalizedExcludedTrackedPaths -notcontains $path) {
    throw "Requested untrack path is not an exact non-glob .gitignore entry: $path"
  }

  $parentPaths = @(Get-TreePaths -Commit $parent -Path $path)
  if (-not $parentPaths.Count) {
    throw "Requested untrack path has no tracked files in origin/main: $path"
  }

  $headPaths = @(Get-TreePaths -Commit $head -Path $path)
  $indexPaths = @(& git -c core.quotepath=false ls-files -- $path)
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to inspect the normal index under requested untrack path: $path"
  }
  if ($indexPaths.Count) {
    throw "Requested untrack path is still present in the normal index. Stage or commit its complete removal first: $path"
  }

  if ($headPaths.Count) {
    if (-not (Test-SamePathSet -Left $parentPaths -Right $headPaths)) {
      throw "Requested untrack path differs between local HEAD and origin/main: $path"
    }
    & git diff --quiet --exit-code $parent $head -- $path
    if ($LASTEXITCODE -ne 0) {
      throw "Requested untrack path has content changes between local HEAD and origin/main: $path"
    }
    $stagedDeletedPaths = @(& git -c core.quotepath=false diff --cached --name-only --diff-filter=D HEAD -- $path)
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to inspect staged removals under requested untrack path: $path"
    }
    if (-not (Test-SamePathSet -Left $parentPaths -Right $stagedDeletedPaths)) {
      throw "Requested untrack path is not completely staged for removal: $path"
    }
  } else {
    $committedDeletedPaths = @(& git -c core.quotepath=false diff --name-only --diff-filter=D $parent $head -- $path)
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to inspect committed removals under requested untrack path: $path"
    }
    if (-not (Test-SamePathSet -Left $parentPaths -Right $committedDeletedPaths)) {
      throw "Requested untrack path is not completely removed by local commits: $path"
    }
    $indexChanges = @(& git -c core.quotepath=false diff --cached --name-only HEAD -- $path)
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to inspect normal-index changes under requested untrack path: $path"
    }
    if ($indexChanges.Count) {
      throw "Requested untrack path has additional normal-index changes after its committed removal: $path"
    }
  }

  foreach ($file in $parentPaths) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
      throw "A locally preserved file is missing under requested untrack path: $file"
    }
    $parentBlob = Invoke-Capture -Command git -Arguments @('rev-parse', "${parent}:$file")
    $localBlob = Invoke-Capture -Command git -Arguments @('hash-object', '--', $file)
    if ($parentBlob -ne $localBlob) {
      throw "A locally preserved file differs from origin/main under requested untrack path: $file"
    }
  }

  $approvedUntrackPaths += $path
}

if ($approvedUntrackPaths.Count) {
  Write-Host ''
  Write-Host 'Explicit ignored paths approved for tracked removal:' -ForegroundColor Yellow
  $approvedUntrackPaths | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
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

if (-not $DryRun -and -not $pushExistingHead -and [string]::IsNullOrWhiteSpace($CommitMessage)) {
  $CommitMessage = 'update source and dist ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')
}
if (-not $DryRun -and -not $pushExistingHead) {
  $messageInput = Read-Host "Commit message. Press Enter to use default: $CommitMessage"
  if (-not [string]::IsNullOrWhiteSpace($messageInput)) {
    $trimmedMessage = $messageInput.Trim()
    if ($trimmedMessage.ToLowerInvariant() -eq 'yes') {
      Write-Host 'Input "yes" was treated as an accidental early confirmation. Keep default commit message.' -ForegroundColor Yellow
    } else {
      $CommitMessage = $trimmedMessage
    }
  }
}

$originalIndex = $env:GIT_INDEX_FILE
$tmpIndex = Join-Path $env:TEMP ('ziyong-publish-index-' + [guid]::NewGuid().ToString())

try {
  $untrackedFiles = @(& git -c core.quotepath=false ls-files --others --exclude-standard)
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to inspect untracked files.'
  }
  $allowedUntrackedFiles = @($untrackedFiles | Where-Object { Test-AllowedNewPath -Path $_ })
  $ignoredUntrackedFiles = @($untrackedFiles | Where-Object { -not (Test-AllowedNewPath -Path $_) })
  if ($allowedUntrackedFiles.Count) {
    Write-Host ''
    Write-Host 'Explicitly allowed new files that will be published:' -ForegroundColor Yellow
    $allowedUntrackedFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
  }
  if ($ignoredUntrackedFiles.Count) {
    Write-Host ''
    Write-Host 'Other untracked files will be ignored:' -ForegroundColor DarkGray
    $ignoredUntrackedFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
  }

  $env:GIT_INDEX_FILE = $tmpIndex
  Invoke-Checked -Command git -Arguments @('read-tree', $candidateParent)
  if ($previewBehindWithoutSync) {
    $previewLocalChangedFiles = @(
      $localChangedFiles | Where-Object {
        $localPath = $_
        -not @(
          $normalizedExcludedTrackedPaths | Where-Object {
            $localPath -eq $_ -or $localPath.StartsWith("$_/")
          }
        ).Count
      }
    )
    if ($previewLocalChangedFiles.Count) {
      Invoke-Checked -Command git -Arguments (@('-c', 'core.safecrlf=false', 'add', '--all', '--') + $previewLocalChangedFiles)
    }
  } else {
    Invoke-Checked -Command git -Arguments @('-c', 'core.safecrlf=false', 'add', '--update', '--', '.')
  }
  if ($previewBehindWithoutSync) {
    if ($allowedUntrackedFiles.Count) {
      Invoke-Checked -Command git -Arguments (@('-c', 'core.safecrlf=false', 'add', '--all', '--') + $allowedUntrackedFiles)
    }
  } else {
    foreach ($path in $allowedPublishPaths) {
      if (Test-Path -LiteralPath $path) {
        Invoke-Checked -Command git -Arguments @('-c', 'core.safecrlf=false', 'add', '--all', '--', $path)
      }
    }
  }

  foreach ($path in $approvedUntrackPaths) {
    Invoke-Checked -Command git -Arguments @('rm', '-r', '--cached', '--ignore-unmatch', '--', $path)
  }

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

  & git diff --cached --quiet --exit-code $candidateParent
  $diffExitCode = $LASTEXITCODE
  if ($diffExitCode -eq 0) {
    if ($appendToLocalHead) {
      $pushExistingHead = $true
      $head = $candidateParent
      Write-Host 'No publishable workspace changes remain after exclusions; the existing local HEAD will be verified instead.' -ForegroundColor Yellow
    } else {
      Write-Host 'There are no tracked changes compared with the publish parent. Nothing to push.' -ForegroundColor Yellow
      exit 0
    }
  }
  if ($diffExitCode -ne 1) {
    throw 'Failed to compare tracked changes with origin/main.'
  }

  Write-Host ''
  Write-Host 'Tracked files that will be published:' -ForegroundColor Yellow
  & git --no-pager diff --cached --name-status $candidateParent
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to show the staged file list.'
  }

  Write-Host ''
  Write-Host 'Diff summary:' -ForegroundColor Yellow
  & git --no-pager diff --cached --stat $candidateParent
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to show the staged diff.'
  }

  $tree = Invoke-Capture -Command git -Arguments @('write-tree')
  $candidateParentTree = Invoke-Capture -Command git -Arguments @('rev-parse', "$candidateParent^{tree}")
  if ($tree -eq $candidateParentTree -and -not $pushExistingHead) {
    Write-Host 'The generated tree is identical to the publish parent. Nothing to push.' -ForegroundColor Yellow
    exit 0
  }

  if ($pushExistingHead) {
    $headTree = Invoke-Capture -Command git -Arguments @('rev-parse', "$head^{tree}")
    if ($tree -ne $headTree) {
      throw "The safe publish candidate tree ($tree) differs from local HEAD ($headTree). Refusing to push an uncommitted or excluded change."
    }
  }

  if ($DryRun) {
    Write-Host ''
    Write-Host 'DryRun complete: no fetch, build, prompt, commit object, index update, or push was performed.' -ForegroundColor Green
    exit 0
  }

  $confirm = if ($ConfirmPush) { 'YES' } else { Read-Host 'Push to https://github.com/nameisnt/ziyong main? Type YES to continue' }
  if ($confirm -ne 'YES') {
    Write-Host 'Canceled. Nothing was pushed.' -ForegroundColor Yellow
    exit 0
  }

  if ($pushExistingHead) {
    Invoke-CheckedWithRetry -Command git -Arguments @('push', 'origin', "$head`:refs/heads/main")
    $remoteMain = Invoke-Capture -Command git -Arguments @('ls-remote', '--heads', 'origin', 'main')
    $remoteHash = ($remoteMain -split '\s+')[0]
    if ($remoteHash -ne $head) {
      throw "Push returned without synchronizing origin/main. Expected $head, got $remoteHash."
    }
    Write-Host ''
    Write-Host "Push succeeded: $head" -ForegroundColor Green
    Write-Host 'The existing local HEAD was preserved and origin/main now points to it.' -ForegroundColor Green
    exit 0
  }

  $commit = Invoke-Capture -Command git -Arguments @('commit-tree', $tree, '-p', $candidateParent, '-m', $CommitMessage)
  $actualParent = Invoke-Capture -Command git -Arguments @('rev-parse', "$commit^")
  if ($actualParent -ne $candidateParent) {
    throw "Created commit parent mismatch. Expected $candidateParent, got $actualParent."
  }

  Write-Host ''
  Write-Host "Created commit: $commit" -ForegroundColor Green

  Invoke-CheckedWithRetry -Command git -Arguments @('push', 'origin', "$commit`:refs/heads/main")

  $env:GIT_INDEX_FILE = $originalIndex
  Invoke-Checked -Command git -Arguments @('read-tree', $commit)
  try {
    Invoke-Checked -Command git -Arguments @('update-ref', 'refs/heads/main', $commit, $candidateParent)
  } catch {
    Invoke-Checked -Command git -Arguments @('read-tree', $candidateParent)
    if ($preservedExcludedStagedDeletions.Count) {
      Invoke-Checked -Command git -Arguments (@('rm', '--cached', '--ignore-unmatch', '--') + $preservedExcludedStagedDeletions)
    }
    throw
  }
  if ($preservedExcludedStagedDeletions.Count) {
    Invoke-Checked -Command git -Arguments (@('rm', '--cached', '--ignore-unmatch', '--') + $preservedExcludedStagedDeletions)
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
