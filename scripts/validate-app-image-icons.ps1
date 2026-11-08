param(
  [string]$IconRoot = 'src/assets/app-icons'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$papers = @('a4', 'graphite', 'parchment', 'velvet', 'xuan', 'cypress', 'sky', 'ocean', 'cardstock')
$expectedNames = @(
  Get-ChildItem -LiteralPath (Join-Path $IconRoot $papers[0]) -File -Filter '*.png' |
    Sort-Object Name |
    ForEach-Object Name
)
$errors = New-Object System.Collections.Generic.List[string]

foreach ($paper in $papers) {
  $directory = Join-Path $IconRoot $paper
  $names = @(Get-ChildItem -LiteralPath $directory -File -Filter '*.png' | Sort-Object Name | ForEach-Object Name)
  if (Compare-Object $expectedNames $names) {
    $errors.Add("$paper file set differs from $($papers[0])")
    continue
  }

  foreach ($name in $names) {
    $path = Join-Path $directory $name
    $image = New-Object System.Drawing.Bitmap $path
    try {
      if ($image.Width -ne 192 -or $image.Height -ne 192) {
        $errors.Add("$paper/$name is not 192x192")
        continue
      }

      foreach ($corner in @(@(0, 0), @(191, 0), @(0, 191), @(191, 191))) {
        if ($image.GetPixel($corner[0], $corner[1]).A -gt 5) {
          $errors.Add("$paper/$name has an opaque corner")
          break
        }
      }

      $foreground = 0
      $greenResidue = 0
      for ($y = 0; $y -lt 192; $y++) {
        for ($x = 0; $x -lt 192; $x++) {
          $color = $image.GetPixel($x, $y)
          if ($color.A -gt 20) { $foreground++ }
          if (
            $color.A -gt 100 -and
            $color.G -gt 140 -and
            $color.G - $color.R -gt 50 -and
            $color.G - $color.B -gt 50
          ) {
            $greenResidue++
          }
        }
      }

      $coverage = $foreground / (192 * 192)
      if ($coverage -lt 0.08 -or $coverage -gt 0.9) {
        $errors.Add("$paper/$name has implausible foreground coverage: $coverage")
      }
      if ($greenResidue -gt 0) {
        $errors.Add("$paper/$name has $greenResidue green-screen pixels")
      }
    } finally {
      $image.Dispose()
    }
  }
}

if ($errors.Count) {
  $errors | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "App image icon validation passed: $($expectedNames.Count) Apps x $($papers.Count) papers."
