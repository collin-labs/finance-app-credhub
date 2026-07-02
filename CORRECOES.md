# CORREÇÕES APLICADAS — CredHub (pós-auditoria)

> Todas as alterações foram **cirúrgicas** (sem reescrever arquivos inteiros). Abaixo, o que mudou, onde e por quê. Itens marcados com ⚠️ ainda exigem build/teste na máquina do cliente (não foi possível compilar no ambiente da auditoria).

## 🔴 Críticos — corrigidos

| # | Arquivo | O que foi feito |
|---|---------|-----------------|
| C1 | `src-tauri/src/commands/prospeccao.rs` | `converter_lead_em_cliente`: coluna `agente_id` → `agente_responsavel_id` no `INSERT INTO clientes`. A conversão de lead em cliente estava 100% quebrada (coluna inexistente). |
| C2 | `src-tauri/src/commands/propostas.rs` | `atualizar_status_proposta`: adicionada guarda de **idempotência** — comissão e lançamentos só são gerados se ainda não existir comissão para a proposta. Antes, reentrar em "pago" duplicava comissões e lançamentos financeiros. |
| C3 | `src-tauri/src/commands/backup.rs` + `src/components/configuracoes/BackupConfig.tsx` | `restaurar_backup`: agora faz `PRAGMA wal_checkpoint(TRUNCATE)` na conexão viva, troca o arquivo e **reinicia o processo** com `app.restart()` (recria a conexão SQLite). Antes só recarregava o WebView (`window.location.reload()`), deixando a conexão antiga aberta sobre o arquivo trocado — risco de reverter/corromper a restauração. |

## 🟡 Importantes — corrigidos

| # | Arquivo | O que foi feito |
|---|---------|-----------------|
| I1 | `src-tauri/src/commands/clientes.rs` (x2) e `agentes.rs` (x2) | Colunas erradas em contagem de vínculos: `comissoes.cliente_id` → JOIN via `propostas`; `clientes.agente_id` → `clientes.agente_responsavel_id`. Antes retornavam sempre 0 (erro mascarado por `unwrap_or(0)`), enganando a verificação antes de excluir. |
| I2 | `src/components/clientes/ClienteDetalhes.tsx` | Download de documento do cliente agora usa o **diálogo nativo do Tauri** (`salvarArquivoBinario`) em vez da âncora `<a download>`, que não funciona dentro do WebView empacotado. |
| I3 | `src-tauri/capabilities/default.json` (**recriado**) | O diretório-fonte de capabilities estava ausente (só existia o gerado em `gen/schemas/`). Recriado para que as permissões sobrevivam a um rebuild limpo. |
| I4 | `src-tauri/src/commands/propostas.rs` e `financeiro.rs` | Filtros de status/tipo nas queries agora escapam aspas simples (mesmo padrão já usado em `relatorios.rs`), fechando o vetor de injeção nos filtros que ainda não escapavam. |

## 🟡 Importante — NÃO aplicado (decisão de roadmap, declarado por transparência)

| # | Item | Por que ficou de fora |
|---|------|------------------------|
| I5 | Autorização no backend (perfil do chamador) | Hoje as permissões admin/gerente/agente são aplicadas só no frontend. Forçar no backend exige propagar o usuário autenticado a todas as mutações e manter sessão no `AppState` — mudança ampla, fora do escopo de correção cirúrgica. Para um app **offline de máquina única** o risco é baixo. Recomendado se o produto evoluir para multiusuário/rede. |

## 🟢 Menores — mantidos (documentados na auditoria)

IOF como aproximação, `taxa_juros_anual`/`cet_anual` não gravados, `cmd /C start` no opener, limite de 100%/mês no CET, mistura `?`/interpolação segura no `WHERE id`, login sem rate-limit, backup-ao-fechar sem timeout. Nenhum quebra a aplicação; ver `RELATORIO-AUDITORIA-CREDHUB.md` para detalhes e correções sugeridas.

## Checklist de validação (rodar na máquina de build)

- [ ] `npm install`
- [ ] `npx tsc --noEmit` — sem erros de tipo
- [ ] `npm run build` — frontend compila
- [ ] `npm run tauri build` — gera o instalador/.exe ⚠️
- [ ] Testar: converter lead em cliente (C1), passar proposta para "pago" duas vezes e conferir que NÃO duplica comissão (C2), restaurar um backup e ver o app reiniciar (C3), baixar documento de cliente (I2), excluir agente com cliente vinculado e ver a contagem correta (I1).
