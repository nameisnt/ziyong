param(
  [string]$JobsPath,
  [string]$SourceDirectory,
  [string]$OutputRoot
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class AppIconProcessor
{
    public static void Process(string inputPath, string outputPath)
    {
        using (var input = new Bitmap(inputPath))
        using (var keyed = new Bitmap(input.Width, input.Height, PixelFormat.Format32bppArgb))
        {
        var minX = input.Width;
        var minY = input.Height;
        var maxX = -1;
        var maxY = -1;

        for (var y = 0; y < input.Height; y++)
        {
            for (var x = 0; x < input.Width; x++)
            {
                var color = input.GetPixel(x, y);
                var greenExcess = color.G - Math.Max(color.R, color.B);
                var alpha = 255;
                var green = (int)color.G;

                if (color.G > 80 && greenExcess > 15)
                {
                    var removed = Math.Max(0, Math.Min(255, (greenExcess - 15) * 255 / 180));
                    alpha = 255 - removed;
                    green = Math.Min(color.G, Math.Max(color.R, color.B) + 5);
                }

                keyed.SetPixel(x, y, Color.FromArgb(alpha, color.R, green, color.B));
                if (alpha <= 20) continue;
                minX = Math.Min(minX, x);
                minY = Math.Min(minY, y);
                maxX = Math.Max(maxX, x);
                maxY = Math.Max(maxY, y);
            }
        }

        if (maxX < minX || maxY < minY)
            throw new InvalidOperationException("No foreground pixels found: " + inputPath);

        var crop = Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
        var scale = Math.Min(176d / crop.Width, 176d / crop.Height);
        var width = Math.Max(1, (int)Math.Round(crop.Width * scale));
        var height = Math.Max(1, (int)Math.Round(crop.Height * scale));

        using (var output = new Bitmap(192, 192, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(output))
            {
                graphics.Clear(Color.Transparent);
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.CompositingQuality = CompositingQuality.HighQuality;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                graphics.SmoothingMode = SmoothingMode.HighQuality;
                var destination = new Rectangle((192 - width) / 2, (192 - height) / 2, width, height);
                graphics.DrawImage(keyed, destination, crop, GraphicsUnit.Pixel);
            }

            var directory = System.IO.Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(directory)) System.IO.Directory.CreateDirectory(directory);
            output.Save(outputPath, ImageFormat.Png);
        }
        }
    }
}
'@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing

$jobs = if ($JobsPath) {
  Get-Content -LiteralPath $JobsPath -Raw -Encoding UTF8 | ConvertFrom-Json
} elseif ($SourceDirectory -and $OutputRoot) {
  Get-ChildItem -LiteralPath $SourceDirectory -File -Filter '*.png' | ForEach-Object {
    if ($_.BaseName -notmatch '^(?<app>.+)-(?<paper>xuan|parchment|cardstock)$') { return }
    [pscustomobject]@{
      input = $_.FullName
      output = Join-Path (Join-Path $OutputRoot $Matches.paper) ($Matches.app + '.png')
    }
  }
} else {
  throw 'Provide -JobsPath, or both -SourceDirectory and -OutputRoot.'
}

foreach ($job in $jobs) {
  [AppIconProcessor]::Process($job.input, $job.output)
  Write-Host "Processed $($job.output)"
}
