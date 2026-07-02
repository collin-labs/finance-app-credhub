# RELATÓRIO DE AUDITORIA — CREDHUB

> Auditoria de código realizada arquivo por arquivo. Stack confirmada: Tauri 2, Rust (rusqlite 0.31 bundled), React 19, TypeScript 5.7, Vite 6, SQLite. ~12.000 linhas (Rust ~3.460, frontend ~8.700).

---

## RESUMO EXECUTIVO

O CredHub é um app desktop bem arquitetado para um produto feito em várias sessões. A camada de comunicação Frontend↔Backend — historicamente a maior fonte de bugs neste projeto — está hoje **impecável no nível de nomes de comando**: os 76 comandos invocados pelo JS batem 100% com os registrados no `lib.rs` e com as funções `#[tauri::command]` no Rust, todas usando `rename_all = "snake_case"` de forma consistente. Senhas e código de recuperação usam bcrypt; o backup usa `VACUUM INTO` com `integrity_check`; há soft delete, FKs e verificação de vínculos. As fórmulas financeiras (Tabela Price, CET por TIR, conversão de taxa composta) estão matematicamente corretas, e as constantes regulatórias (teto INSS 1,85% a.m., margem 35%) conferem com a regra vigente de 2026.

Os problemas que restam estão um nível abaixo: **nomes de COLUNA** que não existem no schema (mascarados em alguns pontos por `unwrap_or(0)`, mas fatais em um caminho), **falta de idempotência** na geração de comissões, e o **fluxo de restauração de backup que não reinicia o backend**. Foram encontrados **3 achados críticos, 5 importantes e 7 menores**. Nenhum é estrutural — são correções pontuais (a maioria de uma linha) que cabem na regra X6 (str_replace cirúrgico).

**Risco principal:** o app NÃO está pronto para produção enquanto C1, C2 e C3 não forem corrigidos — todos os três tocam dados reais (conversão de lead, valores de comissão e restauração de banco). Depois deles, é um produto sólido.

> **Observação de ambiente:** `node_modules` não está no pacote, então não foi possível rodar `npx tsc --noEmit` nem `npm run build` aqui. A verificação de build (Seção H) é estática.

---

## 🔴 CRÍTICOS (3 achados)

### [C1] Conversão de lead em cliente está quebrada — coluna `agente_id` não existe em `clientes`
- **Arquivo:** `src-tauri/src/commands/prospeccao.rs` — função `converter_lead_em_cliente`, linha ~374
- **Problema:** o `INSERT INTO clientes (..., agente_id) VALUES (...)` referencia a coluna `agente_id`, que **não existe** na tabela `clientes`. A coluna correta é `agente_responsavel_id` (ver `schema.rs`, linha 165). Diferente de outros pontos, aqui o erro **não é mascarado** — usa `.map_err(|e| e.to_string())?`.
- **Impacto:** toda tentativa de converter um lead em cliente falha com `table clientes has no column named agente_id`. É um fluxo central da Prospecção, 100% inoperante. O lead nunca vira cliente e o status nunca muda para `convertido`.
- **Correção:**
  ```rust
  // de:
  "INSERT INTO clientes (nome, cpf, telefone1, telefone2, whatsapp, matricula, tipo_beneficio, renda_liquida, margem_disponivel, origem, agente_id)
   VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)"
  // para (única mudança: agente_id -> agente_responsavel_id):
  "INSERT INTO clientes (nome, cpf, telefone1, telefone2, whatsapp, matricula, tipo_beneficio, renda_liquida, margem_disponivel, origem, agente_responsavel_id)
   VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)"
  ```

### [C2] Comissões e lançamentos financeiros DUPLICADOS ao reentrar no status "pago"
- **Arquivo:** `src-tauri/src/commands/propostas.rs` — função `atualizar_status_proposta`, bloco `if update.novo_status == "pago"`
- **Problema:** quando uma proposta vira `pago`, o código cria automaticamente um registro em `comissoes` + 1 ou 2 lançamentos em `financeiro_lancamentos`. **Não há nenhuma verificação se a comissão já existe.** Como o status pode ser alterado livremente (ex.: `pago` → `pendente` → `pago`, ou simplesmente reaplicar `pago`), cada passagem por `pago` gera uma nova comissão e novos lançamentos.
- **Impacto:** corrupção de dados financeiros. Comissões da empresa e do agente contadas em duplicidade, inflando "a receber"/"a pagar", relatórios e dashboard. Em um sistema de crédito, isso é dinheiro errado no caixa.
- **Correção:** tornar idempotente — só gerar se ainda não houver comissão para a proposta:
  ```rust
  if update.novo_status == "pago" {
      let ja_existe: i64 = db.query_row(
          "SELECT COUNT(*) FROM comissoes WHERE proposta_id = ?1",
          rusqlite::params![update.proposta_id], |r| r.get(0)
      ).unwrap_or(0);
      if ja_existe == 0 {
          // ... bloco atual de criação de comissão/lançamentos ...
      }
  }
  ```

### [C3] Restauração de backup não reabre a conexão do banco — `window.location.reload()` não reinicia o backend
- **Arquivos:** `src-tauri/src/commands/backup.rs` (`restaurar_backup`) + `src/components/configuracoes/BackupConfig.tsx` (linha ~108)
- **Problema:** `restaurar_backup` sobrescreve `credhub.db` no disco via `fs::copy`, mas **não acquire o lock `state.db` nem reabre a conexão**. A conexão SQLite criada no `setup` do `lib.rs` continua aberta, apontando para o arquivo que acabou de ser trocado por baixo dela. O frontend então chama `window.location.reload()`, que recarrega **apenas o WebView (JS)** — o processo Rust e a conexão SQLite permanecem os mesmos. A mensagem retornada ("o aplicativo será reiniciado") não corresponde ao que acontece.
- **Impacto:** comportamento indefinido após restaurar. A conexão antiga pode manter páginas em cache e, no próximo checkpoint/escrita, sobrescrever ou reverter parte dos dados restaurados; no Windows, `fs::copy` sobre um arquivo com handle aberto pode até falhar. Em um app financeiro, restauração não-confiável é inaceitável.
- **Correção (recomendada):** reiniciar o processo de fato após a cópia, em vez de recarregar o WebView.
  ```rust
  // ao final de restaurar_backup, em vez de devolver string e deixar o front dar reload:
  // 1) garantir flush/checkpoint e drop da conexão antes da cópia (idealmente abrir a conexão
  //    em modo que permita fechar), e
  // 2) reiniciar o app:
  app.restart(); // tauri::AppHandle::restart() — reabre o processo e recria a conexão no setup
  ```
  No frontend, trocar `setTimeout(() => window.location.reload(), 2000)` por uma mensagem de que o app vai reiniciar (o `app.restart()` cuida disso). Se preferir não reiniciar, a alternativa mínima é fechar e reabrir a `Connection` dentro do `AppState` sob o lock antes/depois da cópia.

---

## 🟡 IMPORTANTES (5 achados)

### [I1] Contagem de vínculos errada — colunas inexistentes mascaradas por `unwrap_or(0)` (padrão repetido, 4 ocorrências)
- **Arquivos / linhas:**
  - `src-tauri/src/commands/clientes.rs:188` e `:203` → `SELECT COUNT(*) FROM comissoes WHERE cliente_id = ?1` — a tabela `comissoes` **não tem** `cliente_id` (só `proposta_id` e `agente_id`).
  - `src-tauri/src/commands/agentes.rs:29` e `:52` → `SELECT COUNT(*) FROM clientes WHERE agente_id = ?1` — em `clientes` a coluna é `agente_responsavel_id`, não `agente_id`.
- **Problema:** as 4 queries erram em runtime, mas o erro é engolido por `db.query_row(...).unwrap_or(0)`, então **sempre retornam 0**. A contagem de vínculos fica errada.
- **Impacto:** `verificar_vinculos_cliente` sempre mostra "comissões: 0" e `verificar_vinculos_agente` sempre mostra "clientes: 0", enganando o admin na hora de excluir. Em `excluir_agente`, um agente que é responsável por clientes (mas sem outros vínculos) seria classificado como `total == 0` e tentaria DELETE — bloqueado pela FK `agente_responsavel_id REFERENCES agentes(id)`, resultando em erro confuso em vez de uma decisão informada. (A FK e a contagem correta de `propostas` evitam perda de dados real, por isso é Importante e não Crítico.)
- **Correção:**
  ```rust
  // clientes.rs — comissões do cliente passam pela proposta:
  let comissoes = conta("SELECT COUNT(*) FROM comissoes c JOIN propostas p ON c.proposta_id = p.id WHERE p.cliente_id = ?1");
  // agentes.rs — coluna correta:
  let clientes = conta("SELECT COUNT(*) FROM clientes WHERE agente_responsavel_id = ?1");
  ```

### [I2] Download de documento do cliente usa âncora `<a download>` como método primário — não funciona no WebView do Tauri
- **Arquivo:** `src/components/clientes/ClienteDetalhes.tsx` — `handleBaixar`, linhas ~303-307
- **Problema:** o download cria `document.createElement('a')` com `href = dataURL` + `link.download` e dá `.click()`. Diferente de `salvar-arquivo.ts` (que faz isso só como *fallback*), aqui a âncora é o **único** caminho. WebView2 (Windows) e WKWebView (macOS) frequentemente ignoram o atributo `download`, então o clique não baixa nada — falha silenciosa.
- **Impacto:** baixar documentos anexados ao cliente não funciona no app empacotado (mesmo "funcionando" no `vite dev` no navegador). É exatamente a classe de bug que o checklist C alerta.
- **Correção:** reaproveitar `salvarArquivoBinario` de `salvar-arquivo.ts` (já usa diálogo nativo). Converter o data URL base64 em bytes e salvar via API nativa, com o mesmo padrão de toast "abrir arquivo/pasta" usado no resto do app.

### [I3] Diretório-fonte de capabilities ausente — só existe o gerado em `gen/schemas/`
- **Arquivo:** falta `src-tauri/capabilities/*.json`; existe apenas `src-tauri/gen/schemas/capabilities.json` (gerado).
- **Problema:** no Tauri 2, as permissões são lidas de `src-tauri/capabilities/` (auto-descoberta) e o conteúdo em `gen/schemas/` é **gerado** a partir delas. Sem a fonte, um rebuild limpo (que regenera `gen/`) pode embarcar **nenhuma** capability.
- **Impacto:** num rebuild do zero, todas as chamadas a plugins (dialog/fs/store/opener) e IPC passariam a ser negadas em runtime ("not allowed"). Pode ser só um arquivo que ficou fora do ZIP — mas, como entregue, o projeto é frágil. As permissões em si (quando presentes) cobrem corretamente os 4 plugins usados, a janela `main` e os escopos.
- **Correção:** confirmar/versionar `src-tauri/capabilities/default.json` com o mesmo conteúdo hoje presente no `gen/schemas/capabilities.json`. Verificar se não foi apenas excluído do empacotamento (regra X9 — estrutura completa no ZIP).

### [I4] SQL montado por interpolação de string em filtros (padrão repetido)
- **Arquivos / funções:**
  - `propostas.rs::listar_propostas` → `WHERE p.status = '{}'` (status interpolado sem escape).
  - `financeiro.rs::listar_lancamentos` → `fl.tipo = '{}'` e `fl.status = '{}'` (sem escape).
  - `prospeccao.rs::listar_leads` → status escapa aspas, mas `campanha_id`/`agente_id` entram por interpolação (são `i64`, seguros).
  - `comissoes.rs::listar_comissoes` → usa `match` em valores fixos (seguro).
  - `relatorios.rs` → `periodo_where` **escapa** aspas simples das datas (`replace('\'', "''")`) — mitigado.
- **Problema:** embora hoje esses valores venham de *dropdowns* controlados (baixo risco de injeção real), o padrão é exatamente o que o checklist B aponta. `listar_propostas` e `listar_lancamentos` nem escapam — um valor com aspa quebraria a query.
- **Impacto:** risco de SQL injection baixo na prática (origem controlada), mas é dívida técnica e quebra com entrada inesperada. Em um app que guarda dados financeiros e PII, vale fechar.
- **Correção:** parametrizar com `?` + `rusqlite::params!`, ou no mínimo aplicar o mesmo `match`/escape de `comissoes.rs` e `relatorios.rs` em todos os filtros.

### [I5] Permissões (admin/gerente/agente) são aplicadas só no frontend — backend não valida o perfil do chamador
- **Arquivos:** `src/lib/permissions.ts` (gating de navegação) vs. comandos Rust. O único check de autorização no backend é em `auth.rs:303` (`gerar_novo_recovery_code`).
- **Problema:** comandos sensíveis (`criar_usuario`, `resetar_senha_usuario`, `excluir_cliente`, `atualizar_usuario`, etc.) não recebem nem verificam o usuário atual. A separação de perfis existe apenas escondendo botões na UI.
- **Impacto:** para um app **offline de máquina única**, o modelo de ameaça é limitado (quem roda o app já tem o arquivo do banco). Mas, como o checklist F pede explicitamente, registro: não há defesa em profundidade — qualquer um capaz de emitir IPC executa qualquer ação. Relevante se o produto evoluir para multiusuário/rede.
- **Correção (se aplicável ao roadmap):** passar o `usuario_id`/perfil autenticado às mutações sensíveis e validar no Rust, ou manter um estado de sessão no `AppState`.

---

## 🟢 MENORES (7 achados)

### [M1] Cálculo de IOF é aproximação que superestima
- **Arquivo:** `src/lib/calculos.ts::calcularIOF`. Aplica `principal × 0,0082%/dia × dias` sobre o principal cheio pelo prazo médio (cap 365 dias), em vez de incidir sobre o saldo decrescente parcela a parcela. O código já admite ser "Aproximação". Resultado: IOF um pouco acima do real. Aceitável para cotação, mas documentar/avisar. (Constantes 0,38% fixo + 0,0082%/dia conferem com a prática para PF.)

### [M2] `taxa_juros_anual` e `cet_anual` nunca são gravados
- **Arquivo:** `propostas.rs::criar_proposta`. As colunas existem no schema mas não entram no INSERT (sempre NULL). O frontend não as lê (calcula na hora via `calculos.ts`), então é inofensivo — colunas mortas. Ou popular no INSERT, ou remover do schema.

### [M3] `abrir_arquivo_sistema`/`abrir_pasta_sistema` via `cmd /C start` em vez do plugin opener
- **Arquivo:** `sistema.rs`. O projeto já tem `tauri-plugin-opener` registrado (e usado como fallback). Usar `std::process::Command` com `cmd /C start "" <caminho>` no Windows é menos robusto (parsing do `start`, caracteres especiais no caminho). Preferir o plugin opener como caminho primário reduz superfície.

### [M4] CET por bisseção limitado a 100% a.m.
- **Arquivo:** `calculos.ts::calcularCET`. A busca vai de 0 a 1,0 (100%/mês). CET acima disso (custos altos sobre valor líquido pequeno) não converge e retorna ~1,0 sem sinalizar. Caso de borda; ampliar o teto ou retornar `null` se ficar no limite.

### [M5] `atualizar_status_proposta` mistura parâmetro `?1` com `id` interpolado
- **Arquivo:** `propostas.rs`. O `WHERE id = {}` usa `format!` com `update.proposta_id`. Como é `i64`, é seguro contra injeção, mas é inconsistente com o resto. Padronizar para `?` por clareza.

### [M6] Login sem rate-limit / atraso progressivo
- **Arquivo:** `auth.rs::login`. Sem backoff após tentativas erradas. Risco baixo num app local offline, mas é uma boa prática barata (atraso após N falhas).

### [M7] Backup-ao-fechar sem timeout pode segurar o fechamento
- **Arquivo:** `App.tsx` (handler `onCloseRequested`). Faz `preventDefault()` → `fazerBackupAutomatico` → `destroy()`. Se o `VACUUM INTO` demorar (banco grande), o app demora a fechar sem feedback. Considerar timeout/indicador. (A lógica em si — backup antes de fechar — está correta.)

---

## ✅ O QUE ESTÁ BEM FEITO

- **Fronteira IPC impecável (nível comando):** 76 comandos JS ↔ `lib.rs` ↔ Rust 100% alinhados; `rename_all = "snake_case"` consistente; nomes de argumento batendo. (Verificado por cruzamento automático — 0 órfãos, 0 não-registrados.)
- **Segurança de senha:** bcrypt (cost 10) para senha e para o recovery code; verificação parametrizada; proteção contra desativar o último admin.
- **Backup robusto:** `VACUUM INTO` (consistente com WAL) + `PRAGMA integrity_check` antes de gerar e de restaurar + cópia de segurança do banco atual antes de sobrescrever + rotação dos N mais recentes. (Só falta o C3.)
- **`salvar-arquivo.ts`:** usa diálogo + fs nativos do Tauri como caminho primário; âncora só como fallback. Padrão correto.
- **Matemática financeira correta:** Tabela Price (parcela e valor presente), conversão mensal→anual composta `(1+i)^12−1`, amortização mês a mês e CET por TIR (bisseção, direção correta). Teto INSS 1,85% a.m. e margem 35% conferem com a regra de 2026.
- **Divisão por zero tratada:** ticket médio, taxas de conversão e somatórios com `COALESCE(...,0)`.
- **Integridade relacional:** FKs com `PRAGMA foreign_keys = ON`, soft delete, verificação de vínculos antes de excluir, limpeza de órfãos (interações/documentos) no hard delete de cliente.
- **React hooks corretos:** `load` memoizado com `useCallback([])`, então `useEffect(()=>{load()},[load])` não entra em loop. Recarregamento de dados após criar/editar/excluir presente. Nenhum `localStorage`/`sessionStorage` (proibido no Tauri). `try/catch` + toast nas chamadas de API.
- **Migrações idempotentes:** `ALTER TABLE ... ADD COLUMN` com erro ignorado (`let _ =`); colunas `NOT NULL` têm `DEFAULT`, então rodam em banco populado.
- **Índices** cobrindo as queries frequentes (cpf, nome, status de proposta/lead, agente, datas).

---

## NOTAS REGULATÓRIAS (roadmap, não-bug)

- **CET do consignado CLT (2026):** nova regra do MTE limita o CET a, no máximo, +1 ponto percentual sobre a taxa mensal contratada (acompanhamento via Dataprev). Como o app tem convênio `clt`, vale embutir essa validação no simulador/cadastro.
- **Margem 2026:** há reforma em curso para margem total "livre" de 40% (com redução programada a partir de 2027). O default de 35% para empréstimo segue válido; considerar tornar a composição de margem configurável por convênio.

---

## VEREDICTO FINAL

**Não está pronto para produção** — mas está perto. Há **3 bloqueadores** que tocam dados reais:

1. **C1** — conversão de lead→cliente quebrada (1 palavra: `agente_id` → `agente_responsavel_id`).
2. **C2** — comissões/lançamentos duplicados ao reentrar em "pago" (guarda de idempotência).
3. **C3** — restauração de backup não reinicia o backend (`app.restart()` em vez de `reload()`).

**Ordem de correção sugerida:** C1 → C2 → C3 (todos pequenos e cirúrgicos) → I1 (mesma família de C1, corrige 4 queries) → I2 (download nativo) → I3 (capabilities no ZIP) → I4 (parametrizar filtros) → I5 (decisão de roadmap). Os 🟢 entram em polimento.

Depois de C1–C3 e I1–I3, com `npx tsc --noEmit` e `npm run build` verdes (rodar localmente, não foi possível aqui) e `cargo build` sem erros, o app fica em estado sólido para produção. A arquitetura, a segurança de senha, o backup e a matemática financeira já estão no nível certo — o que falta é fechar nomes de coluna e os dois fluxos de estado (comissão e restauração).
