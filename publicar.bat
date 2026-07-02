@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title CredHub - Publicar Atualizacao

echo.
echo ========================================
echo    CREDHUB - PUBLICAR NOVA VERSAO
echo ========================================
echo.

REM --- Verifica se esta na pasta certa ---
if not exist "src-tauri\tauri.conf.json" (
    echo [ERRO] Este arquivo precisa estar na raiz do projeto.
    echo Coloque o publicar.bat na mesma pasta onde esta o src-tauri.
    echo.
    pause
    exit /b 1
)

REM --- Le a versao atual ---
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"\"version\"" src-tauri\tauri.conf.json') do (
    set VERSAO_ATUAL=%%~a
    goto :achou
)
:achou
echo Versao atual: !VERSAO_ATUAL!
echo.

REM --- Pede a nova versao ---
set /p NOVA_VERSAO="Digite a NOVA versao (ex: 1.2.0): "
if "!NOVA_VERSAO!"=="" (
    echo [ERRO] Voce nao digitou a versao.
    pause
    exit /b 1
)

REM --- Pede as notas ---
echo.
set /p NOTAS="Descreva o que mudou nesta versao: "
if "!NOTAS!"=="" set NOTAS=Melhorias e correcoes.

echo.
echo ========================================
echo  Versao nova: !NOVA_VERSAO!
echo  Notas: !NOTAS!
echo ========================================
echo.
set /p CONFIRMA="Confirma? (S/N): "
if /i not "!CONFIRMA!"=="S" (
    echo Cancelado.
    pause
    exit /b 0
)

echo.
echo [1/5] Atualizando numero da versao nos arquivos...

REM --- Atualiza tauri.conf.json (sem BOM) ---
powershell -NoProfile -Command "$u = New-Object System.Text.UTF8Encoding($false); $p = (Resolve-Path 'src-tauri\tauri.conf.json').Path; $c = Get-Content $p -Raw | ConvertFrom-Json; $c.version = '!NOVA_VERSAO!'; [System.IO.File]::WriteAllText($p, ($c | ConvertTo-Json -Depth 20), $u)"

REM --- Atualiza package.json (sem BOM) ---
powershell -NoProfile -Command "$u = New-Object System.Text.UTF8Encoding($false); $p = (Resolve-Path 'package.json').Path; $c = Get-Content $p -Raw | ConvertFrom-Json; $c.version = '!NOVA_VERSAO!'; [System.IO.File]::WriteAllText($p, ($c | ConvertTo-Json -Depth 20), $u)"

REM --- Atualiza Cargo.toml (sem BOM) ---
powershell -NoProfile -Command "$u = New-Object System.Text.UTF8Encoding($false); $p = (Resolve-Path 'src-tauri\Cargo.toml').Path; $c = (Get-Content $p -Raw) -replace '(?m)^version = \".*\"', 'version = \"!NOVA_VERSAO!\"'; [System.IO.File]::WriteAllText($p, $c, $u)"

echo       OK
echo.
echo [2/5] Salvando alteracoes no Git...
git add -A
git commit -m "Versao !NOVA_VERSAO!: !NOTAS!"

echo.
echo [3/5] Enviando codigo para o GitHub...
git push
if errorlevel 1 (
    echo [ERRO] Falha ao enviar. Verifique sua conexao ou login do Git.
    pause
    exit /b 1
)

echo.
echo [4/5] Criando a tag da versao...
git tag v!NOVA_VERSAO!

echo.
echo [5/5] Disparando a publicacao automatica...
git push origin v!NOVA_VERSAO!
if errorlevel 1 (
    echo [ERRO] Falha ao enviar a tag.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    PRONTO! PUBLICACAO INICIADA
echo ========================================
echo.
echo O GitHub esta buildando sua versao agora.
echo Acompanhe em:
echo   https://github.com/collin-labs/finance-app-credhub/actions
echo.
echo Em alguns minutos, a release aparecera como RASCUNHO em:
echo   https://github.com/collin-labs/finance-app-credhub/releases
echo.
echo Revise e clique em "Publish release" para liberar aos clientes.
echo.
pause
