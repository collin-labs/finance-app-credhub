# ============================================================
# BUILD PERSONALIZADO — Gera instalador com nome e icone do cliente
# ============================================================
# Uso:
#   .\scripts\build-personalizado.ps1 -NomeEmpresa "Finance Corp" -IconePath "C:\logos\finance.png"
#
# Pre-requisitos:
#   - ImageMagick instalado (winget install ImageMagick.ImageMagick)
#   - Rodar a partir da RAIZ do projeto
#   - Icone de origem: PNG quadrado, minimo 512x512 recomendado
# ============================================================

param(
    [Parameter(Mandatory = $true)]
    [string]$NomeEmpresa,

    [Parameter(Mandatory = $true)]
    [string]$IconePath,

    [string]$Slogan = ""
)

$ErrorActionPreference = "Stop"

# --- Validacoes ---
if (-not (Test-Path "src-tauri\tauri.conf.json")) {
    Write-Host "ERRO: rode este script a partir da raiz do projeto." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $IconePath)) {
    Write-Host "ERRO: icone nao encontrado em $IconePath" -ForegroundColor Red
    exit 1
}
$magick = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magick) {
    Write-Host "ERRO: ImageMagick nao encontrado. Instale com:" -ForegroundColor Red
    Write-Host "  winget install ImageMagick.ImageMagick" -ForegroundColor Yellow
    exit 1
}

$iconsDir  = "src-tauri\icons"
$backupDir = "src-tauri\icons-backup-original"
$confPath  = "src-tauri\tauri.conf.json"
$confBackup = "src-tauri\tauri.conf.json.original"

Write-Host ""
Write-Host "=== BUILD PERSONALIZADO ===" -ForegroundColor Cyan
Write-Host "Empresa: $NomeEmpresa"
Write-Host "Icone:   $IconePath"
Write-Host ""

# --- 1. Backup dos originais (so na primeira vez) ---
if (-not (Test-Path $backupDir)) {
    Write-Host "[1/6] Fazendo backup dos icones originais..." -ForegroundColor Yellow
    Copy-Item -Recurse $iconsDir $backupDir
} else {
    Write-Host "[1/6] Backup de icones ja existe (ok)" -ForegroundColor Green
}
if (-not (Test-Path $confBackup)) {
    Copy-Item $confPath $confBackup
}

# --- 2. Gera os tamanhos de icone ---
Write-Host "[2/6] Gerando icones nos tamanhos necessarios..." -ForegroundColor Yellow
magick $IconePath -resize 32x32   "$iconsDir\32x32.png"
magick $IconePath -resize 128x128 "$iconsDir\128x128.png"
magick $IconePath -resize 256x256 "$iconsDir\128x128@2x.png"
magick $IconePath -resize 512x512 "$iconsDir\icon.png"

# --- 3. Gera o .ico multi-resolucao (Windows) ---
Write-Host "[3/6] Gerando icon.ico (Windows)..." -ForegroundColor Yellow
magick $IconePath -define icon:auto-resize="256,128,96,64,48,32,16" "$iconsDir\icon.ico"

# --- 4. Atualiza tauri.conf.json ---
Write-Host "[4/6] Atualizando productName e title..." -ForegroundColor Yellow
$conf = Get-Content $confPath -Raw | ConvertFrom-Json
$conf.productName = $NomeEmpresa
if ($conf.app -and $conf.app.windows -and $conf.app.windows.Count -gt 0) {
    if ($Slogan) {
        $conf.app.windows[0].title = "$NomeEmpresa - $Slogan"
    } else {
        $conf.app.windows[0].title = $NomeEmpresa
    }
}
$conf | ConvertTo-Json -Depth 20 | Set-Content $confPath -Encoding UTF8

# --- 5. Build ---
Write-Host "[5/6] Rodando tauri build (isso demora alguns minutos)..." -ForegroundColor Yellow
npm run tauri build
$buildOk = $LASTEXITCODE -eq 0

# --- 6. Restaura os originais ---
Write-Host "[6/6] Restaurando arquivos originais..." -ForegroundColor Yellow
Copy-Item -Force "$backupDir\*" $iconsDir
Copy-Item -Force $confBackup $confPath

if ($buildOk) {
    Write-Host ""
    Write-Host "=== BUILD CONCLUIDO ===" -ForegroundColor Green
    Write-Host "Instalador personalizado em:" -ForegroundColor Green
    Write-Host "  src-tauri\target\release\bundle\nsis\" -ForegroundColor Cyan
    Get-ChildItem "src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  -> $($_.Name)" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "=== BUILD FALHOU ===" -ForegroundColor Red
    Write-Host "Arquivos originais foram restaurados. Verifique os erros acima." -ForegroundColor Yellow
    exit 1
}
