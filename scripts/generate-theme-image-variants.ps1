param(
  [string]$IconRoot = 'src/assets/app-icons',
  [string]$PaperRoot = 'src/assets/paper'
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

& node (Join-Path $PSScriptRoot 'generate-modern-app-icons.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Modern A4 App icon generation failed.' }

$source = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;

public static class ThemeImageVariantGenerator
{
    private static int Clamp(double value)
    {
        return Math.Max(0, Math.Min(255, (int)Math.Round(value)));
    }

    private static Color Mix(Color left, Color right, double amount, int alpha)
    {
        var inverse = 1d - amount;
        return Color.FromArgb(
            alpha,
            Clamp(left.R * inverse + right.R * amount),
            Clamp(left.G * inverse + right.G * amount),
            Clamp(left.B * inverse + right.B * amount)
        );
    }

    private static Color Gradient(Color low, Color high, double amount, int alpha)
    {
        return Mix(low, high, Math.Max(0d, Math.Min(1d, amount)), alpha);
    }

    private static double Luma(Color color)
    {
        return (color.R * 0.2126 + color.G * 0.7152 + color.B * 0.0722) / 255d;
    }

    private static Color Transform(Color color, string variant)
    {
        if (color.A == 0) return color;
        var luma = Luma(color);

        switch (variant)
        {
            case "graphite":
                return Gradient(Color.FromArgb(36, 39, 44), Color.FromArgb(232, 235, 239), Math.Pow(luma, 0.82), color.A);
            case "velvet":
                return Mix(
                    Gradient(Color.FromArgb(54, 16, 35), Color.FromArgb(235, 203, 135), Math.Pow(luma, 0.9), color.A),
                    color,
                    0.12,
                    color.A
                );
            case "cypress":
                return Mix(
                    Gradient(Color.FromArgb(7, 31, 25), Color.FromArgb(218, 239, 224), Math.Pow(luma, 0.88), color.A),
                    color,
                    0.1,
                    color.A
                );
            case "sky":
                var lifted = Mix(color, Color.White, luma < 0.22 ? 0.14 : 0.3, color.A);
                return Mix(lifted, Color.FromArgb(190, 228, 250), 0.26, color.A);
            case "ocean":
                if (luma < 0.22)
                    return Mix(Color.FromArgb(6, 25, 39), color, 0.22, color.A);
                return Mix(color, Color.FromArgb(70, 177, 210), 0.2, color.A);
            default:
                throw new ArgumentOutOfRangeException("variant", variant, "Unknown theme image variant");
        }
    }

    public static void TransformPng(string inputPath, string outputPath, string variant)
    {
        using (var input = new Bitmap(inputPath))
        using (var output = new Bitmap(input.Width, input.Height, PixelFormat.Format32bppArgb))
        {
            for (var y = 0; y < input.Height; y++)
            {
                for (var x = 0; x < input.Width; x++)
                    output.SetPixel(x, y, Transform(input.GetPixel(x, y), variant));
            }

            var directory = System.IO.Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(directory)) System.IO.Directory.CreateDirectory(directory);
            output.Save(outputPath, ImageFormat.Png);
        }
    }

    public static void TintPaper(string inputPath, string outputPath, int red, int green, int blue, bool dark)
    {
        using (var input = new Bitmap(inputPath))
        using (var output = new Bitmap(input.Width, input.Height, PixelFormat.Format24bppRgb))
        {
            var target = Color.FromArgb(red, green, blue);
            for (var y = 0; y < input.Height; y++)
            {
                for (var x = 0; x < input.Width; x++)
                {
                    var source = input.GetPixel(x, y);
                    var luma = Luma(source);
                    var delta = dark ? (luma - 0.1) * 24d : (luma - 0.92) * 42d;
                    output.SetPixel(x, y, Color.FromArgb(
                        Clamp(target.R + delta),
                        Clamp(target.G + delta),
                        Clamp(target.B + delta)
                    ));
                }
            }

            var directory = System.IO.Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(directory)) System.IO.Directory.CreateDirectory(directory);
            output.Save(outputPath, ImageFormat.Jpeg);
        }
    }
}
'@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing

$variants = @(
  @{ Name = 'graphite'; Source = 'a4' },
  @{ Name = 'velvet'; Source = 'parchment' },
  @{ Name = 'cypress'; Source = 'xuan' },
  @{ Name = 'sky'; Source = 'cardstock' },
  @{ Name = 'ocean'; Source = 'cardstock' }
)

foreach ($variant in $variants) {
  $sourceDirectory = Join-Path $IconRoot $variant.Source
  $targetDirectory = Join-Path $IconRoot $variant.Name
  New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
  foreach ($file in Get-ChildItem -LiteralPath $sourceDirectory -File -Filter '*.png') {
    [ThemeImageVariantGenerator]::TransformPng(
      $file.FullName,
      (Join-Path $targetDirectory $file.Name),
      $variant.Name
    )
  }
}

$paperVariants = @(
  @{ Name = 'graphite'; Source = 'cardstock.jpg'; Color = @(24, 25, 27); Dark = $true },
  @{ Name = 'velvet'; Source = 'cardstock.jpg'; Color = @(37, 19, 31); Dark = $true },
  @{ Name = 'cypress'; Source = 'cardstock.jpg'; Color = @(16, 36, 31); Dark = $true },
  @{ Name = 'sky'; Source = 'a4.jpg'; Color = @(234, 246, 255); Dark = $false },
  @{ Name = 'ocean'; Source = 'cardstock.jpg'; Color = @(7, 25, 35); Dark = $true }
)

foreach ($paper in $paperVariants) {
  [ThemeImageVariantGenerator]::TintPaper(
    (Join-Path $PaperRoot $paper.Source),
    (Join-Path $PaperRoot ($paper.Name + '.jpg')),
    $paper.Color[0],
    $paper.Color[1],
    $paper.Color[2],
    $paper.Dark
  )
}

Write-Host "Generated $($variants.Count) App image variants and $($paperVariants.Count) paper textures."
