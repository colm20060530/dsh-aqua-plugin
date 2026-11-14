# Deploy the Aqua glassmorphism client plugin into the running DSH desktop profile.
#
# What it does (idempotent, backs up every file it edits):
#   1. installs the package under $DSH_HOME\plugins\@deepseek-ai\dsh-client-ui-aqua
#   2. links it into the profile's node_modules (junction)
#   3. records it in the profile package.json dependencies so a later `pnpm` run keeps it
#   4. writes (or rewrites) the `ui-aqua` loader row in the profile cordis.patch.yml
# The HMR service watches that patch file, so the host row mounts immediately; the
# browser half still needs an app restart (desktop builds load it once at start-up).
#
# Usage:
#   pwsh -File install.ps1                          # shipped defaults (still image wallpaper)
#   pwsh -File install.ps1 -Video 'D:/bg.mp4'       # video wallpaper streamed from disk
#   pwsh -File install.ps1 -Uninstall               # remove the row and the link

param(
    [string]$Source = (Join-Path $PSScriptRoot '..'),
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

function Remove-Link([string]$path) {
    $item = Get-Item $path -Force -ErrorAction SilentlyContinue
    if ($null -eq $item) { return }
    if ($item.LinkType) { [System.IO.Directory]::Delete($path) } else { Remove-Item $path -Recurse -Force }
}

if (-not (Test-Path $profileDir)) { throw "desktop profile not found: $profileDir" }

if ($Uninstall) {
    if (Test-Path $patchFile) {
        Copy-Item $patchFile "$patchFile.bak-aqua-uninstall-$stamp" -Force
        $text = Get-Content $patchFile -Raw -Encoding utf8
        $text = $text -replace "(?ms)\r?\n# ── Aqua 玻璃拟态.*?(?=\r?\n# ──|\z)", ''
        $text = $text -replace "(?ms)\r?\n- insert:\r?\n    - id: ui-aqua\r?\n      name: '@deepseek-ai/dsh-client-ui-aqua'\r?\n", "`n"
        [System.IO.File]::WriteAllText($patchFile, $text, (New-Object System.Text.UTF8Encoding $false))
    }
    Remove-Link $linkPath
    Write-Host "uninstalled (package kept at $target)"
    return
}

Write-Host "[1/4] installing package -> $target"
if (Test-Path $target) { Remove-Item $target -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
Copy-Item $Source $target -Recurse -Force
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
# Always rewrite our own block: the row now carries the wallpaper video path.
$blockPattern = "(?ms)^# ── Aqua 玻璃拟态.*?(?=^# ──|\z)"
$text = [regex]::Replace($text, $blockPattern, '')
$videoLiteral = $Video.Replace("'", "''")
if ($Video -eq '') {
    $configBlock = ''
} else {
    $configBlock = @"
      config:
        video: '$videoLiteral'

"@
}
$header = @"

# ── Aqua 玻璃拟态 ────────────────────────────────────────────────────────────
# 客户端插件（Aqua 主题 + 全局玻璃拟态覆盖层）。包位于 ``$target``，
# 由 profile 的 node_modules 软链接解析。
# ``video`` 是宿主半边从本地磁盘流出的壁纸（同源路由 /aqua/wallpaper.mp4）；
# 不写 config 时，客户端回落到包内自带的静态壁纸。
- insert:
    - id: ui-aqua
      name: '$plugin'

"@
$block = $header + $configBlock
[System.IO.File]::WriteAllText($patchFile, $text.TrimEnd() + $block, (New-Object System.Text.UTF8Encoding $false))

Write-Host ''
Write-Host "done. package: $target"
Write-Host "      link:    $linkPath"
Write-Host "      patch:   $patchFile"
