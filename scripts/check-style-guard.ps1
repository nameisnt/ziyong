param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path -LiteralPath $Root
$srcRoot = Join-Path $projectRoot "src"
$globalCssPath = Join-Path $srcRoot "global.css"
$allowedGlobalImportantCount = 20
$allowedHighSpecificityRootCount = 0
$violations = New-Object System.Collections.Generic.List[string]

if (-not (Test-Path -LiteralPath $globalCssPath)) {
  throw "Cannot find src/global.css under $projectRoot"
}

$styleFiles = Get-ChildItem -LiteralPath $srcRoot -Recurse -File |
  Where-Object { $_.Extension -in @(".css", ".vue") }
foreach ($file in $styleFiles) {
  $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  $importantCount = [regex]::Matches($content, "!important").Count
  if ($importantCount -eq 0 -or $file.FullName -eq $globalCssPath) {
    continue
  }
  $relativePath = $file.FullName.Substring($projectRoot.Path.Length).TrimStart("\", "/")
  $violations.Add("$relativePath adds $importantCount !important declaration(s); App-local !important is forbidden.")
}

$globalCss = Get-Content -LiteralPath $globalCssPath -Raw -Encoding UTF8
$globalImportantCount = [regex]::Matches($globalCss, "!important").Count
if ($globalImportantCount -gt $allowedGlobalImportantCount) {
  $violations.Add(
    "src/global.css has $globalImportantCount !important declarations; migration baseline allows at most $allowedGlobalImportantCount."
  )
}

$highSpecificityRootCount = [regex]::Matches($globalCss, "(?:\.pc-phone-root){4,}").Count
if ($highSpecificityRootCount -gt $allowedHighSpecificityRootCount) {
  $violations.Add(
    "src/global.css has $highSpecificityRootCount repeated-root selectors; migration baseline allows at most $allowedHighSpecificityRootCount."
  )
}

if ($violations.Count -gt 0) {
  Write-Host "Style migration guard failed:" -ForegroundColor Red
  $violations | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
  exit 1
}

Write-Host (
  "Style migration guard passed: global !important {0}/{1}, repeated-root selectors {2}/{3}, App-local !important 0." -f
    $globalImportantCount,
    $allowedGlobalImportantCount,
    $highSpecificityRootCount,
    $allowedHighSpecificityRootCount
) -ForegroundColor Green
