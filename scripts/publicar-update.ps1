# ============================================================
# PUBLICAR UPDATE — Gera build assinado e prepara release no GitHub
# ============================================================
# Uso:
#   .\scripts\publicar-update.ps1 -Versao "1.2.0" -Notas "Corrigido X, adicionado Y"
#
# Pre-requisitos (uma vez):
#   1. Ter gerado as chaves de assinatura (ver COMO-PUBLICAR-UPDATE.md)
#   2. GitHub CLI instalado e autenticado (gh auth login) - opcional, para upload automatico
#   3. Rodar a partir da RAIZ do projeto
#
# O que faz:
#   1. Atualiza a versao em tauri.conf.json, Cargo.toml e package.json
#   2. Pede a senha da chave privada (nao fica salva)
#   3. Roda o build assinado (gera .exe + .exe.sig)
#   4. Gera o latest.json com a assinatura ja embutida
#   5. (Opcional) Cria a release no GitHub e sobe os arquivos
# ============================================================

param(
    [Parameter(Mandatory = $true)]
    [string]$Versao,

    [Parameter(Mandatory = $true)]
    [string]$Notas,

    [switch]$PublicarNoGitHub
)

$ErrorActionPreference = "Stop"
$REPO = "collin-labs/finance-app-credhub"

# --- Validacoes ---
if (-not (Test-Path "src-tauri\tauri.conf.json")) {
    Write-Host "ERRO: rode a partir da raiz do projeto." -ForegroundColor Red
    exit 1
}
if ($Versao -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host "ERRO: versao deve ser no formato X.Y.Z (ex: 1.2.0)" -ForegroundColor Red
    exit 1
}

# --- Chave privada ---
$keyPath = "$env:USERPROFILE\.tauri\credhub.key"
if (-not (Test-Path $keyPath)) {
    Write-Host "ERRO: chave privada nao encontrada em $keyPath" -ForegroundColor Red
    Write-Host "Gere as chaves primeiro (veja COMO-PUBLICAR-UPDATE.md)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== PUBLICAR UPDATE v$Versao ===" -ForegroundColor Cyan
Write-Host ""

# --- 1. Atualiza versoes ---
Write-Host "[1/5] Atualizando versao nos arquivos..." -ForegroundColor Yellow

# tauri.conf.json
$conf = Get-Content "src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
$conf.version = $Versao
$conf | ConvertTo-Json -Depth 20 | Set-Content "src-tauri\tauri.conf.json" -Encoding UTF8

# package.json
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$pkg.version = $Versao
$pkg | ConvertTo-Json -Depth 20 | Set-Content "package.json" -Encoding UTF8

# Cargo.toml (regex simples na linha version)
$cargo = Get-Content "src-tauri\Cargo.toml"
$cargo = $cargo -replace '^version = ".*"', "version = `"$Versao`""
$cargo | Set-Content "src-tauri\Cargo.toml" -Encoding UTF8

Write-Host "      versao $Versao aplicada" -ForegroundColor Green

# --- 2. Senha da chave ---
Write-Host "[2/5] Configurando assinatura..." -ForegroundColor Yellow
$senha = Read-Host "Senha da chave privada" -AsSecureString
$senhaText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($senha)
)
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $keyPath -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $senhaText

# --- 3. Build ---
Write-Host "[3/5] Gerando build assinado (demora alguns minutos)..." -ForegroundColor Yellow
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO no build. Abortando." -ForegroundColor Red
    # Limpa variaveis sensiveis
    $env:TAURI_SIGNING_PRIVATE_KEY = ""
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
    exit 1
}

# Limpa variaveis sensiveis da memoria
$env:TAURI_SIGNING_PRIVATE_KEY = ""
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

# --- 4. Gera latest.json ---
Write-Host "[4/5] Gerando latest.json..." -ForegroundColor Yellow
$nsisDir = "src-tauri\target\release\bundle\nsis"
$setupExe = Get-ChildItem "$nsisDir\*-setup.exe" | Select-Object -First 1
$sigFile  = Get-ChildItem "$nsisDir\*-setup.exe.sig" | Select-Object -First 1

if (-not $setupExe -or -not $sigFile) {
    Write-Host "ERRO: instalador ou .sig nao encontrados em $nsisDir" -ForegroundColor Red
    Write-Host "Verifique se createUpdaterArtifacts esta true no tauri.conf.json" -ForegroundColor Yellow
    exit 1
}

$assinatura = Get-Content $sigFile.FullName -Raw
$nomeArquivo = $setupExe.Name
$urlDownload = "https://github.com/$REPO/releases/download/v$Versao/$nomeArquivo"
$dataPub = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$latest = [ordered]@{
    version   = $Versao
    notes     = $Notas
    pub_date  = $dataPub
    platforms = [ordered]@{
        "windows-x86_64" = [ordered]@{
            signature = $assinatura.Trim()
            url       = $urlDownload
        }
    }
}
$latestJson = $latest | ConvertTo-Json -Depth 10
$latestPath = "$nsisDir\latest.json"
$latestJson | Set-Content $latestPath -Encoding UTF8

Write-Host "      latest.json gerado" -ForegroundColor Green

# --- 5. Publicar ---
Write-Host "[5/5] Preparando release..." -ForegroundColor Yellow

if ($PublicarNoGitHub) {
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $gh) {
        Write-Host "GitHub CLI (gh) nao encontrado. Faca o upload manual (veja abaixo)." -ForegroundColor Yellow
    } else {
        Write-Host "      Criando release v$Versao no GitHub..." -ForegroundColor Yellow
        gh release create "v$Versao" `
            "$($setupExe.FullName)" `
            "$latestPath" `
            --repo $REPO `
            --title "CredHub v$Versao" `
            --notes $Notas
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "=== RELEASE PUBLICADA! ===" -ForegroundColor Green
            Write-Host "Os clientes receberao a atualizacao ao abrir o app." -ForegroundColor Green
            exit 0
        }
    }
}

# Upload manual
Write-Host ""
Write-Host "=== BUILD PRONTO PARA PUBLICAR ===" -ForegroundColor Green
Write-Host ""
Write-Host "Suba estes 2 arquivos numa nova release GitHub com a tag 'v$Versao':" -ForegroundColor Cyan
Write-Host "  1. $($setupExe.FullName)" -ForegroundColor White
Write-Host "  2. $latestPath" -ForegroundColor White
Write-Host ""
Write-Host "Passo a passo:" -ForegroundColor Cyan
Write-Host "  - Acesse: https://github.com/$REPO/releases/new" -ForegroundColor White
Write-Host "  - Tag: v$Versao" -ForegroundColor White
Write-Host "  - Titulo: CredHub v$Versao" -ForegroundColor White
Write-Host "  - Anexe os 2 arquivos acima" -ForegroundColor White
Write-Host "  - Publique (Publish release)" -ForegroundColor White
