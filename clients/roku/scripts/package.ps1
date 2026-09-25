Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = (Resolve-Path "$scriptDir\..").Path
$distDir = "$sourceDir\dist"
$zipPath = "$distDir\channel.zip"

if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir -Force | Out-Null }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

$items = @(
    "manifest",
    "source\main.brs",
    "components\MainScene.brs",
    "components\MainScene.xml",
    "components\AnnotationFeedTask.xml",
    "components\AnnotationFeedTask.brs",
    "components\ReactionTask.xml",
    "components\ReactionTask.brs",
    "images\annotated_logo_512.png",
    "images\icon_fhd.png",
    "images\splash_fhd.png",
    "images\icon_bolt.png",
    "images\icon_fire.png",
    "images\icon_think.png",
    "images\icon_idea.png",
    "images\icon_100.png",
    "images\icon_down.png"
)

foreach ($item in $items) {
    $fullPath = Join-Path $sourceDir $item
    if (Test-Path $fullPath) {
        $entryName = $item.Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $entryName) | Out-Null
    } else {
        Write-Warning "Missing file: $fullPath"
    }
}
$zip.Dispose()
$legacyDist = "C:\Users\senti\OneDrive\Desktop\Extensions\Annotated\annotated-roku-channel\dist"
if (Test-Path $legacyDist) { Copy-Item -Path $zipPath -Destination "$legacyDist\channel.zip" -Force }
Write-Host "Created channel.zip with official logo!"
