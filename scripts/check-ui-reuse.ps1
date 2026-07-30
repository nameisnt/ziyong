param(
  [string]$Root = ".",
  [switch]$Strict
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path -LiteralPath $Root
$srcRoot = Join-Path $projectRoot "src"

if (-not (Test-Path -LiteralPath $srcRoot)) {
  throw "Cannot find src directory under $projectRoot"
}

$patterns = @(
  @{
    Name = "Scoped style repeats global UI classes"
    Regex = "^\s*\.(pc-primary-btn|pc-soft-btn|pc-icon-btn|pc-segment|pc-segment-btn|pc-field|pc-select|pc-area|pc-field-group|pc-field-label|pc-section-card|pc-editor-card|pc-form-actions|pc-toggle)\s*\{"
    Severity = "warn"
  },
  @{
    Name = "Uses non-theme accent variables"
    Regex = "--pc-accent($|-)|--pc-accent-soft|--pc-accent-contrast"
    Severity = "warn"
  },
  @{
    Name = "Impossible media query"
    Regex = "@media\s*\(\s*max-width\s*:\s*0px\s*\)"
    Severity = "warn"
  },
  @{
    Name = "Browser default-looking button reset inside App"
    Regex = "appearance\s*:\s*none|-webkit-appearance\s*:\s*none"
    Severity = "info"
  }
)

$files = Get-ChildItem -LiteralPath $srcRoot -Recurse -File -Include *.vue,*.css,*.ts |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\dist\\"
  }

$findings = New-Object System.Collections.Generic.List[object]

foreach ($file in $files) {
  $rootText = $projectRoot.Path.TrimEnd("\", "/")
  $relativePath = $file.FullName
  if ($relativePath.StartsWith($rootText, [System.StringComparison]::OrdinalIgnoreCase)) {
    $relativePath = $relativePath.Substring($rootText.Length).TrimStart("\", "/")
  }
  $lines = Get-Content -LiteralPath $file.FullName -Encoding UTF8
  for ($index = 0; $index -lt $lines.Count; $index += 1) {
    $line = $lines[$index]
    foreach ($pattern in $patterns) {
      if ($relativePath -eq "src\global.css" -and $pattern.Name -in @(
        "Scoped style repeats global UI classes",
        "Browser default-looking button reset inside App"
      )) {
        continue
      }
      $nearbyComment = @(
        $line,
        $(if ($index -ge 1) { $lines[$index - 1] } else { "" }),
        $(if ($index -ge 2) { $lines[$index - 2] } else { "" })
      ) -join "`n"
      if ($nearbyComment -match "ui-reuse-allow") {
        continue
      }
      if ($line -match $pattern.Regex) {
        $findings.Add([pscustomobject]@{
          File = $relativePath
          Line = $index + 1
          Rule = $pattern.Name
          Severity = $pattern.Severity
          Text = $line.Trim()
        })
      }
    }
  }
}

if (-not $findings.Count) {
  Write-Host "UI reuse check passed: no suspicious duplicated global UI styles found." -ForegroundColor Green
  exit 0
}

Write-Host "UI reuse check found possible issues:" -ForegroundColor Yellow
$findings |
  Sort-Object File, Line |
  Format-Table -AutoSize File, Line, Severity, Rule, Text

Write-Host ""
Write-Host "Please reuse global styles/components first. If a local override is intentional, add a short nearby comment explaining why." -ForegroundColor Yellow
if ($Strict) {
  exit 1
}
exit 0
