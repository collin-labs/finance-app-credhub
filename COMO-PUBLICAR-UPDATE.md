# COMO PUBLICAR ATUALIZAÇÕES (Auto-Update)

Este guia explica como funciona o sistema de auto-update do CredHub e como publicar novas versões que os clientes recebem automaticamente.

---

## Como funciona (visão geral)

1. Você builda uma versão nova, **assinada** com sua chave privada
2. Publica o instalador + um arquivo `latest.json` numa release no GitHub
3. Quando o cliente abre o app, ele consulta o `latest.json`, compara as versões
4. Se houver versão nova, mostra um aviso com botão "Atualizar Agora"
5. O app baixa, verifica a assinatura, instala e reinicia sozinho

O repositório de releases é: **https://github.com/collin-labs/finance-app-credhub**

---

## ⚠️ PASSO ZERO — Gerar as chaves de assinatura (UMA VEZ SÓ)

O Tauri exige assinatura criptográfica em toda atualização. Você gera um par de chaves uma única vez.

```powershell
npm run tauri signer generate -- -w $env:USERPROFILE\.tauri\credhub.key
```

Ele vai pedir uma **senha** para proteger a chave. Guarde essa senha.

O comando cria dois arquivos:
- `%USERPROFILE%\.tauri\credhub.key` — **chave PRIVADA** (NUNCA compartilhe, NUNCA suba no Git)
- `%USERPROFILE%\.tauri\credhub.key.pub` — **chave PÚBLICA**

### 🔴 CRÍTICO — Backup da chave privada
Se você **perder a chave privada ou a senha**, NUNCA MAIS conseguirá publicar atualizações para os apps já instalados nos clientes. Cada cliente teria que reinstalar manualmente.

**Faça backup agora:**
- Guarde `credhub.key` num gerenciador de senhas (Bitwarden, 1Password) ou cofre seguro
- Guarde a senha junto
- Não confie só na sua máquina

### Colar a chave pública no projeto
Abra o arquivo `credhub.key.pub`, copie TODO o conteúdo, e cole no `tauri.conf.json`:

```json
"plugins": {
  "updater": {
    "endpoints": [
      "https://github.com/collin-labs/finance-app-credhub/releases/latest/download/latest.json"
    ],
    "pubkey": "COLE_AQUI_O_CONTEUDO_DE_credhub.key.pub",
    "windows": { "installMode": "passive" }
  }
}
```

Substitua `COLE_AQUI_O_CONTEUDO_DE_credhub.key.pub` pelo conteúdo real. Sem isso, o app não valida as atualizações.

---

## ⚠️ A PRIMEIRA VERSÃO (1.1.0) É ESPECIAL

A versão 1.0.0 que seus clientes já têm foi feita **sem** o sistema de update. Então:

- Esta versão (1.1.0, a primeira com updater) precisa ser instalada **manualmente uma vez** em cada cliente
- Da 1.1.0 em diante (1.2.0, 1.3.0...), tudo é automático

Ou seja: gere a 1.1.0, mande o instalador pros clientes por onde você já manda hoje (WhatsApp, e-mail, pendrive), eles instalam. A partir daí você nunca mais precisa fazer isso manualmente.

---

## Publicando uma nova versão (o dia a dia)

Depois que a 1.1.0 estiver rodando nos clientes, publicar updates é simples.

### Opção A — Script automático (recomendado)

Com o GitHub CLI instalado e autenticado (`gh auth login`):

```powershell
.\scripts\publicar-update.ps1 -Versao "1.2.0" -Notas "Corrigido cálculo de comissão. Adicionado filtro por banco." -PublicarNoGitHub
```

O script faz tudo: atualiza versões, builda assinado, gera o `latest.json` e cria a release no GitHub. Pronto.

### Opção B — Script + upload manual

Sem o GitHub CLI:

```powershell
.\scripts\publicar-update.ps1 -Versao "1.2.0" -Notas "Descrição das novidades"
```

O script builda e gera os arquivos, depois te mostra exatamente quais 2 arquivos subir e como. Você cria a release manualmente no GitHub.

---

## O que o cliente vê

Ao abrir o app (ou em Configurações → Atualizações → Verificar):
- Um modal elegante aparece: "Atualização Disponível — Versão 1.2.0"
- Mostra as notas que você escreveu no `-Notas`
- Botões "Depois" e "Atualizar Agora"
- Ao clicar em atualizar: barra de progresso, download, e o app reinicia sozinho já atualizado

---

## Estrutura do latest.json (gerado automaticamente)

Você não precisa editar isso à mão — o script gera. Mas para referência:

```json
{
  "version": "1.2.0",
  "notes": "Descrição das novidades",
  "pub_date": "2026-07-01T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "conteúdo do arquivo .sig",
      "url": "https://github.com/collin-labs/finance-app-credhub/releases/download/v1.2.0/CredHub_1.2.0_x64-setup.exe"
    }
  }
}
```

---

## Checklist de cada release

- [ ] Testei a versão nova localmente e está funcionando
- [ ] Escolhi o número de versão certo (maior que o atual)
- [ ] Rodei o script de publicação
- [ ] A release apareceu em https://github.com/collin-labs/finance-app-credhub/releases
- [ ] A release tem os 2 arquivos: o `-setup.exe` E o `latest.json`
- [ ] Testei num cliente (ou máquina de teste) que o update aparece

---

## Solução de problemas

**"chave privada não encontrada"** → você ainda não gerou as chaves (Passo Zero) ou estão em outro caminho.

**Update não aparece pro cliente** → verifique se o `latest.json` está na release E se a versão nele é maior que a instalada. Confira também se a URL do instalador no `latest.json` está correta (deve apontar pro arquivo, não pra página da release).

**"Signature verification failed"** → a chave pública no `tauri.conf.json` não corresponde à privada usada no build. Confirme que colou a pubkey certa.

**Cliente na 1.0.0 não recebe update** → esperado. A 1.0.0 não tem o plugin. Instale a 1.1.0 manualmente uma vez.

**O app não reinicia após instalar** → no Windows isso é normal em alguns casos; o instalador fecha o app e o cliente reabre. A atualização foi aplicada mesmo assim.

---

## Resumo rápido (para colar na parede)

```
PRIMEIRA VEZ:
  1. npm run tauri signer generate -- -w %USERPROFILE%\.tauri\credhub.key
  2. Backup da chave + senha num lugar seguro
  3. Colar a pubkey no tauri.conf.json
  4. Buildar a 1.1.0 e instalar manualmente nos clientes

CADA NOVA VERSÃO:
  .\scripts\publicar-update.ps1 -Versao "X.Y.Z" -Notas "novidades" -PublicarNoGitHub
```
