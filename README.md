# CredHub — Gestão de Crédito Consignado

## Setup rápido (primeira vez)

```bash
# 1. Instalar dependências do frontend
npm install

# 2. Rodar em modo desenvolvimento
npm run tauri dev
```

O Cargo vai baixar as deps Rust automaticamente no primeiro `tauri dev`.

## Estrutura

- `src/` — Frontend React 19 + TypeScript + Tailwind
- `src-tauri/` — Backend Rust (Tauri v2) + SQLite
- `src-tauri/src/db/schema.rs` — Schema do banco de dados
- `src-tauri/src/commands/` — Comandos Tauri (API local)
- `src-tauri/src/models/` — Structs de dados

## Banco de dados

SQLite embutido. Arquivo criado automaticamente em:
- Windows: `%APPDATA%/com.credhub.app/credhub.db`
- macOS: `~/Library/Application Support/com.credhub.app/credhub.db`
- Linux: `~/.local/share/com.credhub.app/credhub.db`

## Build de produção

```bash
npm run tauri build
```

Gera o instalador em `src-tauri/target/release/bundle/`
