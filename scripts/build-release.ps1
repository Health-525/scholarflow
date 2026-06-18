#Requires -Version 5.1
<#
.SYNOPSIS
    ScholarFlow 一键打包脚本
.DESCRIPTION
    依次执行：质量检查 → Next.js 生产构建 → postbuild 后处理（含 ABI 切换）→ electron-builder 打包
    任意步骤失败立即中止，输出带颜色的进度和耗时。
.PARAMETER SkipCheck
    跳过 TypeScript 类型检查、ESLint、单元测试（用于快速迭代）
.PARAMETER SkipBuild
    跳过 Next.js 生产构建，直接复用已生成的 .next/standalone
.PARAMETER OnlyDir
    只生成 win-unpacked 目录，不生成 installer/portable 安装包（最快验证）
.PARAMETER PrePackaged
    完全复用已有的 dist/win-unpacked，跳过 Next.js 构建、postbuild 和 packaging
.PARAMETER Target
    打包目标：'all'（默认，installer + portable）| 'installer' | 'portable'
.EXAMPLE
    .\scripts\build-release.ps1
    .\scripts\build-release.ps1 -SkipCheck
    .\scripts\build-release.ps1 -Target portable
    .\scripts\build-release.ps1 -SkipCheck -OnlyDir
    .\scripts\build-release.ps1 -SkipCheck -SkipBuild -Target installer
    .\scripts\build-release.ps1 -SkipCheck -PrePackaged -Target installer
#>
param(
    [switch]$SkipCheck,
    [switch]$SkipBuild,
    [switch]$OnlyDir,
    [switch]$PrePackaged,
    [ValidateSet('all', 'installer', 'portable')]
    [string]$Target = 'all'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── 颜色工具 ────────────────────────────────────────────────

function Write-Step {
    param([string]$Msg)
    Write-Host "`n▶  $Msg" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Msg, [string]$Duration = '')
    $suffix = if ($Duration) { "  ($Duration)" } else { '' }
    Write-Host "✔  $Msg$suffix" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Msg)
    Write-Host "`n✘  $Msg" -ForegroundColor Red
}

function Write-Info {
    param([string]$Msg)
    Write-Host "   $Msg" -ForegroundColor DarkGray
}

# ── 计时工具 ────────────────────────────────────────────────

function Get-Elapsed {
    param([datetime]$Start)
    $elapsed = (Get-Date) - $Start
    if ($elapsed.TotalMinutes -ge 1) {
        return '{0:0}m {1:00}s' -f [math]::Floor($elapsed.TotalMinutes), $elapsed.Seconds
    }
    return '{0:0.0}s' -f $elapsed.TotalSeconds
}

# ── 执行步骤（失败立即退出）────────────────────────────────

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Step $Name
    $t = Get-Date
    try {
        & $Action
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            Write-Fail "$Name 失败（exit code $LASTEXITCODE）"
            exit $LASTEXITCODE
        }
    } catch {
        Write-Fail "$Name 失败：$($_.Exception.Message)"
        exit 1
    }
    Write-Ok $Name (Get-Elapsed $t)
}

# ── 主流程 ──────────────────────────────────────────────────

$totalStart = Get-Date
$root = Split-Path $PSScriptRoot -Parent

Write-Host ''
Write-Host '╔══════════════════════════════════════════╗' -ForegroundColor Magenta
Write-Host '║       ScholarFlow  Release  Build        ║' -ForegroundColor Magenta
Write-Host '╚══════════════════════════════════════════╝' -ForegroundColor Magenta
Write-Host "   根目录  : $root"
Write-Host "   目标    : $Target"
Write-Host "   跳过检查: $($SkipCheck.IsPresent)"
Write-Host "   跳过构建: $($SkipBuild.IsPresent)"
Write-Host "   仅生成目录: $($OnlyDir.IsPresent)"
Write-Host "   复用产物: $($PrePackaged.IsPresent)"
Write-Host "   时间    : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# 检查 Node / npm 是否可用
Write-Info "Node $(node --version)  |  npm $(npm --version)"

Set-Location $root

# ── 步骤 1：质量检查（可跳过）──────────────────────────────

if (-not $SkipCheck) {
    Invoke-Step 'TypeScript 类型检查' {
        npx tsc --noEmit
    }

    Invoke-Step 'ESLint' {
        npx next lint
    }

    Invoke-Step '单元测试' {
        npx vitest run
    }
} else {
    Write-Host "`n⚠  已跳过质量检查（-SkipCheck）" -ForegroundColor Yellow
}

# ── 步骤 2：Next.js 生产构建（可跳过）───────────────────────

if (-not $SkipBuild) {
    Invoke-Step 'Next.js 生产构建' {
        npm run build
    }
} else {
    Write-Host "`n⚠  已跳过 Next.js 生产构建（-SkipBuild）" -ForegroundColor Yellow
}

# ── 步骤 3：postbuild 后处理（含 Electron ABI 切换）────────

if (-not $PrePackaged) {
    Invoke-Step 'Postbuild 后处理 & ABI 对齐' {
        node electron/postbuild.js
    }
} else {
    Write-Host "`n⚠  已跳过 Postbuild（-PrePackaged，复用 dist/win-unpacked）" -ForegroundColor Yellow
}

# ── 步骤 4：electron-builder 打包 ──────────────────────────

$builderArgs = if ($PrePackaged) {
    @('--win', '--prepackaged', 'dist/win-unpacked')
} elseif ($OnlyDir) {
    @('--win', '--dir')
} else {
    switch ($Target) {
        'installer' { @('--win', 'nsis') }
        'portable'  { @('--win', 'portable') }
        default     { @('--win') }   # all: nsis + portable（来自 package.json build.win.target）
    }
}

Invoke-Step "electron-builder 打包 [$Target]" {
    npx electron-builder @builderArgs
}

# ── 完成 ────────────────────────────────────────────────────

$total = Get-Elapsed $totalStart

Write-Host ''
Write-Host '╔══════════════════════════════════════════╗' -ForegroundColor Green
Write-Host "║   ✔  打包完成！总耗时 $total" -ForegroundColor Green
Write-Host '╚══════════════════════════════════════════╝' -ForegroundColor Green
Write-Host ''

# 列出产物
$distDir = Join-Path $root 'dist'
if (Test-Path $distDir) {
    Write-Host '📦 产物文件：' -ForegroundColor Cyan
    Get-ChildItem $distDir -File | Where-Object { $_.Extension -in '.exe', '.zip', '.dmg', '.AppImage' } |
        ForEach-Object {
            $size = '{0:0.0} MB' -f ($_.Length / 1MB)
            Write-Host "   $($_.Name)  ($size)" -ForegroundColor White
        }
}
Write-Host ''
