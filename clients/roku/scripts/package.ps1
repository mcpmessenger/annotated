Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir  = (Resolve-Path "$scriptDir\..").Path
$distDir    = "$sourceDir\dist"
$zipPath    = "$distDir\channel.zip"

if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir -Force | Out-Null }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

$items = @(
    "manifest",
    "source\main.brs",
    "components\MainScene.brs",
    "components\MainScene.xml",
    "components\FloatingAnnotationBubble.xml",
    "components\FloatingAnnotationBubble.brs",
    "components\AnnotationFeedTask.xml",
    "components\AnnotationFeedTask.brs",
    "components\PostReactionTask.xml",
    "components\PostReactionTask.brs",
    "components\PostReportTask.xml",
    "components\PostReportTask.brs",
    "components\FactCheckTask.xml",
    "components\FactCheckTask.brs",
    "components\ChannelFeedTask.xml",
    "components\ChannelFeedTask.brs",
    "images\annotated_logo_512.png",
    "images\icon_fhd.png",
    "images\icon_hd.png",
    "images\splash_fhd.png",
    "images\splash_hd.png",
    "images\icon_bolt.png",
    "images\icon_fire.png",
    "images\icon_think.png",
    "images\icon_idea.png",
    "images\icon_100.png",
    "images\icon_down.png"
)

foreach ($item in $items) {
    if ($item -like "*.bak" -or $item -like "*~" -or $item.EndsWith(".bak")) {
        Write-Warning "Excluding backup file: $item"
        continue
    }
    $fullPath = Join-Path $sourceDir $item
    if (Test-Path $fullPath) {
        $entryName = $item.Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $entryName) | Out-Null
    } else {
        Write-Warning "Missing file: $fullPath"
    }
}

$zip.Dispose()
Write-Host "Done: channel.zip v1.2.1 (Vercel /api/react route, no Supabase keys)"
