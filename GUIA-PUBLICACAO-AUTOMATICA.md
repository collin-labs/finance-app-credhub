# GUIA COMPLETO — Publicação Automática e Como Testar

Este guia cobre 3 coisas, na ordem:
1. Subir o projeto pro GitHub (primeira vez)
2. Cadastrar os 2 segredos de assinatura no GitHub
3. Como publicar e testar uma atualização

Faça na ordem. Depois de configurado, publicar vira só dois cliques no `publicar.bat`.

---

# PARTE 1 — Subir o projeto pro GitHub (uma vez só)

## 1.1 — Verificar se o Git está instalado
Abra o PowerShell na pasta do projeto e digite:
```powershell
git --version
```
Se aparecer um número de versão, está instalado. Se der erro, instale em https://git-scm.com/download/win e reinicie o terminal.

## 1.2 — Iniciar o Git no projeto
Ainda no PowerShell, na pasta do projeto:
```powershell
git init
git add -A
git commit -m "Versao inicial 1.1.0 com auto-update"
```

> ⚠️ Antes de continuar, confira que a chave NÃO vai subir: rode `git status` e verifique que **NÃO** aparece nenhum arquivo `.key`. O `.gitignore` já protege isso, mas confirme. A chave privada fica em `C:\Users\Administrador\.tauri\`, fora do projeto, então está segura.

## 1.3 — Conectar ao seu repositório do GitHub
```powershell
git remote add origin https://github.com/collin-labs/finance-app-credhub.git
git branch -M main
git push -u origin main
```
Se pedir login, entre com sua conta do GitHub. Pode ser que abra uma janela do navegador para autorizar — é normal.

Pronto, o código está no GitHub.

---

# PARTE 2 — Cadastrar os 2 segredos (uma vez só)

O GitHub precisa da sua chave privada e senha para assinar as atualizações na nuvem. Eles ficam guardados de forma criptografada e nunca aparecem publicamente.

## 2.1 — Copiar o conteúdo da chave privada
No PowerShell:
```powershell
Get-Content $env:USERPROFILE\.tauri\credhub.key
```
Vai aparecer um texto de várias linhas. **Copie TUDO** (desde `untrusted comment:` até o fim).

## 2.2 — Abrir a página de segredos
No navegador, acesse:
```
https://github.com/collin-labs/finance-app-credhub/settings/secrets/actions
```
(ou: no seu repositório → aba **Settings** → menu lateral **Secrets and variables** → **Actions**)

## 2.3 — Criar o primeiro segredo (a chave)
- Clique no botão verde **New repository secret**
- Em **Name**, digite exatamente: `TAURI_SIGNING_PRIVATE_KEY`
- Em **Secret**, cole o texto da chave que você copiou no passo 2.1
- Clique em **Add secret**

## 2.4 — Criar o segundo segredo (a senha)
- Clique em **New repository secret** de novo
- Em **Name**, digite exatamente: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- Em **Secret**, digite a senha da chave (a que você criou ao gerar as chaves)
- Clique em **Add secret**

## 2.5 — Liberar permissão de escrita para o Actions
- Acesse: `https://github.com/collin-labs/finance-app-credhub/settings/actions`
- Role até **Workflow permissions**
- Marque **Read and write permissions**
- Clique em **Save**

Sem isso, o robô do GitHub não consegue criar a release.

---

# PARTE 3 — Publicar e testar uma atualização

## 3.1 — Publicar uma versão nova (o dia a dia)
Simplesmente dê **dois cliques** no arquivo `publicar.bat` na pasta do projeto.

Ele vai:
1. Perguntar a nova versão (ex: 1.2.0)
2. Perguntar o que mudou
3. Atualizar tudo, enviar pro GitHub e disparar o build automático

Você acompanha o build acontecendo em:
```
https://github.com/collin-labs/finance-app-credhub/actions
```

Em 5-10 minutos, aparece uma release em **rascunho** em:
```
https://github.com/collin-labs/finance-app-credhub/releases
```
Revise e clique em **Publish release** para liberar aos clientes.

---

## 3.2 — Como TESTAR se a atualização funciona

O teste real precisa de duas versões: uma instalada "antiga" e uma nova publicada. Passo a passo:

### Teste completo (recomendado)
1. **Instale a versão atual** (1.1.0) na sua máquina usando o instalador que você já gerou (`CredHub_1.1.0_x64-setup.exe`). Instale de verdade, não use o modo desenvolvimento.

2. **Abra o app instalado** e deixe aberto. Não deve aparecer aviso de update (afinal, é a versão mais nova que existe).

3. **Publique uma versão nova** com o `publicar.bat`. Use um número maior, ex: 1.2.0. Pode colocar nas notas algo como "Versão de teste". Espere o build terminar e **publique a release** (tire do rascunho).

4. **Feche e abra o app** instalado (o 1.1.0). Poucos segundos depois de abrir, deve surgir a janela **"Atualização Disponível — Versão 1.2.0"** com as notas que você escreveu.

5. **Clique em "Atualizar Agora"**. O app baixa, mostra a barra de progresso, instala e reinicia sozinho já na 1.2.0.

6. **Confirme**: abra Configurações → Atualizações e veja se a versão instalada agora é 1.2.0.

Se tudo isso aconteceu, o sistema está 100% funcional.

### Teste rápido (só a verificação)
Se quiser testar só se a checagem funciona sem instalar nada:
- No app instalado, vá em **Configurações → Atualizações**
- Clique em **Verificar Atualizações**
- Se houver versão nova publicada, ele avisa. Se não, diz que você está atualizado.

---

## Observações importantes

- **O cliente com a 1.0.0 não recebe update automático.** A 1.0.0 foi feita sem o sistema. Instale a 1.1.0 manualmente nele uma vez; da 1.1.0 em diante é automático.
- **Sempre use versão maior.** O sistema só oferece update se o número for maior que o instalado. 1.2.0 > 1.1.0 funciona; 1.1.0 = 1.1.0 não faz nada.
- **A release precisa estar publicada, não em rascunho**, para os clientes verem. Rascunho é só pra você revisar.
- **Números de versão**: use o padrão X.Y.Z. Suba o último número para correções pequenas (1.1.0 → 1.1.1), o do meio para novas funções (1.1.0 → 1.2.0), o primeiro para mudanças grandes (1.1.0 → 2.0.0).

---

## Resumo de bolso

```
CONFIGURACAO (uma vez):
  1. git init / add / commit / push  (Parte 1)
  2. Cadastrar 2 segredos no GitHub   (Parte 2)
  3. Liberar permissao de escrita     (Parte 2.5)

PUBLICAR (sempre):
  - Dois cliques no publicar.bat
  - Esperar o build no GitHub
  - Clicar em "Publish release"

TESTAR:
  - Instalar versao atual
  - Publicar versao maior
  - Reabrir app -> aviso de update aparece
```
