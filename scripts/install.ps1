# Deploy the Aqua glassmorphism client plugin into a DSH desktop profile.
#
# What it does (idempotent, backs up every file it edits):
#   1. installs the package under $DSH_HOME\plugins\@deepseek-ai\dsh-client-ui-aqua
#   2. links it into the profile's node_modules (junction)
#   3. records it in the profile package.json dependencies so a later `pnpm` run keeps it
#   4. inserts the `ui-aqua` loader row into the profile cordis.patch.yml
#
# Usage:
#   pwsh -File scripts/install.ps1                     # bundled still wallpaper
#   pwsh -File scripts/install.ps1 -Video 'D:/bg.mp4'  # your own video wallpaper
#   pwsh -File scripts/install.ps1 -Uninstall
#
# The default -Source is this repository's root (the repo itself is the package),
# so a plain `git clone` + this script is enough on a fresh machine.

param(
    [string]$Source = (Split-Path $PSScriptRoot -Parent),
    [string]$Video = '',
    [string]$DshHome = $env:DSH_HOME,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
if (-not $DshHome) { $DshHome = Join-Path $env:USERPROFILE '.dsh' }

$plugin      = '@deepseek-ai/dsh-client-ui-aqua'
$profileDir  = Join-Path $DshHome 'profiles\desktop'
$pluginsRoot = Join-Path $DshHome 'plugins'
$target      = Join-Path $pluginsRoot $plugin
$linkPath    = Join-Path $profileDir "node_modules\$plugin"
$patchFile   = Join-Path $profileDir 'cordis.patch.yml'
$manifest    = Join-Path $profileDir 'package.json'
$stamp       = Get-Date -Format 'yyyyMMdd-HHmmss'
# Files that make up the installed package (the repo also carries build/docs/scripts).
$packageItems = @('package.json', 'lib', 'assets', 'LICENSE')

function Remove-Link([string]$path) {
    $item = Get-Item $path -Force -ErrorAction SilentlyContinue
    if ($null -eq $item) { return }
    if ($item.LinkType) { [System.IO.Directory]::Delete($path) } else { Remove-Item $path -Recurse -Force }
}

if (-not (Test-Path $profileDir)) {
    throw "desktop profile not found: $profileDir`nOpen DeepSeek Harness once so it creates the profile, then re-run this script."
}

if ($Uninstall) {
    if (Test-Path $patchFile) {
        Copy-Item $patchFile "$patchFile.bak-aqua-uninstall-$stamp" -Force
        $text = Get-Content $patchFile -Raw -Encoding utf8
        $text = $text -replace "(?ms)\r?\n# ── Aqua 玻璃拟态.*?(?=\r?\n# ──|\z)", ''
        $text = $text -replace "(?ms)\r?\n- insert:\r?\n    - id: ui-aqua\r?\n      name: '@deepseek-ai/dsh-client-ui-aqua'\r?\n", "`n"
        [System.IO.File]::WriteAllText($patchFile, $text, (New-Object System.Text.UTF8Encoding $false))
        # An empty patch file parses as null; the loader wants a top-level array.
        if ([string]::IsNullOrWhiteSpace((Get-Content $patchFile -Raw -Encoding utf8))) {
            [System.IO.File]::WriteAllText($patchFile, "[]`n", (New-Object System.Text.UTF8Encoding $false))
        }
    }
    Remove-Link $linkPath
    Write-Host "uninstalled (package kept at $target)"
    return
}

Write-Host "[1/4] installing package -> $target"
if (Test-Path $target) { Remove-Item $target -Recurse -Force }
New-Item -ItemType Directory -Force -Path $target | Out-Null
foreach ($item in $packageItems) {
    $from = Join-Path $Source $item
    if (-not (Test-Path $from)) { throw "package item missing in ${Source}: $item" }
    Copy-Item $from (Join-Path $target $item) -Recurse -Force
}
if (-not (Test-Path (Join-Path $target 'lib\client.js'))) { throw "client bundle missing in $target" }

Write-Host "[2/4] linking -> $linkPath"
New-Item -ItemType Directory -Force -Path (Join-Path $profileDir 'node_modules\@deepseek-ai') | Out-Null
Remove-Link $linkPath
New-Item -ItemType Junction -Path $linkPath -Target $target | Out-Null
if (-not (Test-Path (Join-Path $linkPath 'lib\client.js'))) { throw "junction does not resolve: $linkPath" }

Write-Host "[3/4] recording the dependency in $manifest"
Copy-Item $manifest "$manifest.bak-before-aqua-$stamp" -Force
$pkg = Get-Content $manifest -Raw -Encoding utf8 | ConvertFrom-Json
if (-not $pkg.PSObject.Properties['dependencies']) {
    $pkg | Add-Member -MemberType NoteProperty -Name dependencies -Value ([pscustomobject]@{})
}
$linkSpec = 'link:' + ($target -replace '\\', '/')
if ($pkg.dependencies.PSObject.Properties[$plugin]) {
    $pkg.dependencies.$plugin = $linkSpec
} else {
    $pkg.dependencies | Add-Member -MemberType NoteProperty -Name $plugin -Value $linkSpec
}
$json = $pkg | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($manifest, $json + "`n", (New-Object System.Text.UTF8Encoding $false))

Write-Host "[4/4] writing the loader row in $patchFile"
Copy-Item $patchFile "$patchFile.bak-before-aqua-$stamp" -Force
$text = Get-Content $patchFile -Raw -Encoding utf8
# Always rewrite our own block: the row carries the optional wallpaper video path.
$blockPattern = "(?ms)^# ── Aqua 玻璃拟态.*?(?=^# ──|\z)"
$text = [regex]::Replace($text, $blockPattern, '')
# A fresh profile ships a bare `[]` (the empty top-level array). Leaving it in
# front of our insert block makes the file unparseable, so drop that one line.
$text = [regex]::Replace($text, '(?m)^[ \t]*\[\][ \t]*\r?\n?', '')
$videoLiteral = $Video.Replace("'", "''")
$videoLine = if ($Video) { "`n        video: '$videoLiteral'" } else { '' }
$block = @"

# ── Aqua 玻璃拟态 ────────────────────────────────────────────────────────────
# 客户端插件（Aqua 主题 + 全局玻璃拟态覆盖层）。包位于 ``$target``，
# 由 profile 的 node_modules 软链接解析；HMR 监听本文件，写入后即时挂载。
# ``video`` 可选：填本地 mp4 路径，由宿主半边以 /aqua/wallpaper.mp4 流出；
# 不填则使用包内静态壁纸。
- insert:
    - id: ui-aqua
      name: '$plugin'
      config:
        schema: 4$videoLine
"@
[System.IO.File]::WriteAllText($patchFile, $text.TrimEnd() + $block, (New-Object System.Text.UTF8Encoding $false))

Write-Host ''
Write-Host "done. package: $target"
Write-Host "      link:    $linkPath"
Write-Host "      patch:   $patchFile"
Write-Host 'restart DeepSeek Harness once so the renderer loads the new bundle.'
