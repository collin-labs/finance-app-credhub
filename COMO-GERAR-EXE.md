# COMO GERAR O .EXE — CredHub (para o cliente testar)

> **Importante:** o `.exe` precisa ser gerado em uma máquina **Windows**. Não dá para compilar um executável Windows de forma confiável a partir de Linux/Mac (o Tauri usa o WebView2 do Windows e o toolchain MSVC). Faça os passos abaixo num PC com Windows 10/11.

---

## 1. Pré-requisitos (instalar uma vez)

1. **Node.js LTS** (20 ou 22) — https://nodejs.org
2. **Rust** (via rustup) — https://rustup.rs → baixa o `rustup-init.exe`, executa, escolhe a opção padrão (1).
3. **Microsoft C++ Build Tools** — https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - No instalador, marque **"Desenvolvimento para desktop com C++"** (inclui o MSVC e o Windows SDK).
4. **WebView2 Runtime** — já vem no Windows 11 e na maioria dos Windows 10 atualizados. Se faltar: https://developer.microsoft.com/microsoft-edge/webview2/ (baixe o "Evergreen Standalone Installer").

Confira no PowerShell (devem responder uma versão):
```powershell
node -v
npm -v
rustc --version
cargo --version
```

## 2. Build do app

Abra o PowerShell **na pasta do projeto** (onde está o `package.json`) e rode:

```powershell
npm install
npm run tauri build
```

> `npm run tauri build` já compila o frontend (`npm run build`) e depois empacota o app nativo. A primeira vez demora (o Rust compila tudo, inclusive o SQLite). Builds seguintes são bem mais rápidos.

## 3. Onde fica o instalador / executável

Depois do build, procure em:

```
src-tauri/target/release/
├── CredHub.exe                     ← o executável "solto" (roda direto)
└── bundle/
    ├── nsis/
    │   └── CredHub_1.0.0_x64-setup.exe   ← INSTALADOR (recomendado p/ enviar ao cliente)
    └── msi/
        └── CredHub_1.0.0_x64_en-US.msi   ← instalador MSI (alternativa)
```

**Para o cliente testar:** envie o **`CredHub_1.0.0_x64-setup.exe`** (pasta `nsis`). É o instalador padrão, ele instala e cria atalho.

> Se quiser só um teste rápido sem instalar, dá para enviar o `CredHub.exe` solto da pasta `release/`, mas o instalador é mais "de verdade" para o cliente.

## 4. Dica de versão

Antes de gerar uma nova versão para o cliente, suba o número em **dois** lugares (têm que bater):
- `src-tauri/tauri.conf.json` → `"version"`
- `src-tauri/Cargo.toml` → `version`

**NÃO mude o `identifier` (`com.credhub.app`)** — ele define onde fica o banco de dados. Se mudar, o app "esquece" os dados do cliente (passa a usar outra pasta).

## 5. Erros comuns

- **"error: linker `link.exe` not found"** → faltou o C++ Build Tools (passo 1.3). Instale e reabra o terminal.
- **"WebView2 not found" ao abrir o app** → instale o WebView2 Runtime (passo 1.4).
- **Build trava/demora muito na 1ª vez** → normal; é o Rust compilando as dependências. Deixe terminar.
