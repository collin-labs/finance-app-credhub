use tauri::State;
use crate::AppState;
use crate::models::{Proposta, PropostaInput, StatusUpdate, PropostaHistorico};

#[tauri::command(rename_all = "snake_case")]
pub fn listar_propostas(state: State<'_, AppState>, status_filtro: Option<String>, limite: Option<i64>) -> Result<Vec<Proposta>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let lim = limite.unwrap_or(100);

    let sql = if let Some(ref status) = status_filtro {
        format!("
            SELECT p.*, cl.nome as cliente_nome, ag.nome as agente_nome,
                   b.nome as banco_nome, cv.nome as convenio_nome, pr.nome as produto_nome
            FROM propostas p
            LEFT JOIN clientes cl ON p.cliente_id = cl.id
            LEFT JOIN agentes ag ON p.agente_id = ag.id
            LEFT JOIN bancos b ON p.banco_id = b.id
            LEFT JOIN convenios cv ON p.convenio_id = cv.id
            LEFT JOIN produtos pr ON p.produto_id = pr.id
            WHERE p.status = '{}'
            ORDER BY p.criado_em DESC LIMIT {}
        ", status.replace('\'', "''"), lim)
    } else {
        format!("
            SELECT p.*, cl.nome as cliente_nome, ag.nome as agente_nome,
                   b.nome as banco_nome, cv.nome as convenio_nome, pr.nome as produto_nome
            FROM propostas p
            LEFT JOIN clientes cl ON p.cliente_id = cl.id
            LEFT JOIN agentes ag ON p.agente_id = ag.id
            LEFT JOIN bancos b ON p.banco_id = b.id
            LEFT JOIN convenios cv ON p.convenio_id = cv.id
            LEFT JOIN produtos pr ON p.produto_id = pr.id
            ORDER BY p.criado_em DESC LIMIT {}
        ", lim)
    };

    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(Proposta {
            id: row.get("id")?,
            cliente_id: row.get("cliente_id")?,
            cliente_nome: row.get("cliente_nome")?,
            agente_id: row.get("agente_id")?,
            agente_nome: row.get("agente_nome")?,
            banco_id: row.get("banco_id")?,
            banco_nome: row.get("banco_nome")?,
            convenio_id: row.get("convenio_id")?,
            convenio_nome: row.get("convenio_nome")?,
            produto_id: row.get("produto_id")?,
            produto_nome: row.get("produto_nome")?,
            numero_proposta: row.get("numero_proposta")?,
            numero_contrato: row.get("numero_contrato")?,
            valor_emprestimo: row.get("valor_emprestimo")?,
            valor_liquido: row.get("valor_liquido")?,
            valor_parcela: row.get("valor_parcela")?,
            quantidade_parcelas: row.get("quantidade_parcelas")?,
            taxa_juros: row.get("taxa_juros")?,
            cet_mensal: row.get("cet_mensal")?,
            banco_origem_id: row.get("banco_origem_id")?,
            saldo_devedor: row.get("saldo_devedor")?,
            valor_troco: row.get("valor_troco")?,
            status: row.get("status")?,
            motivo_rejeicao: row.get("motivo_rejeicao")?,
            pendencias: row.get("pendencias")?,
            data_digitacao: row.get("data_digitacao")?,
            data_pagamento: row.get("data_pagamento")?,
            observacoes: row.get("observacoes")?,
            criado_em: row.get("criado_em")?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn obter_proposta(state: State<'_, AppState>, id: i64) -> Result<Proposta, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.query_row("
        SELECT p.*, cl.nome as cliente_nome, ag.nome as agente_nome,
               b.nome as banco_nome, cv.nome as convenio_nome, pr.nome as produto_nome
        FROM propostas p
        LEFT JOIN clientes cl ON p.cliente_id = cl.id
        LEFT JOIN agentes ag ON p.agente_id = ag.id
        LEFT JOIN bancos b ON p.banco_id = b.id
        LEFT JOIN convenios cv ON p.convenio_id = cv.id
        LEFT JOIN produtos pr ON p.produto_id = pr.id
        WHERE p.id = ?1
    ", rusqlite::params![id], |row| {
        Ok(Proposta {
            id: row.get("id")?,
            cliente_id: row.get("cliente_id")?,
            cliente_nome: row.get("cliente_nome")?,
            agente_id: row.get("agente_id")?,
            agente_nome: row.get("agente_nome")?,
            banco_id: row.get("banco_id")?,
            banco_nome: row.get("banco_nome")?,
            convenio_id: row.get("convenio_id")?,
            convenio_nome: row.get("convenio_nome")?,
            produto_id: row.get("produto_id")?,
            produto_nome: row.get("produto_nome")?,
            numero_proposta: row.get("numero_proposta")?,
            numero_contrato: row.get("numero_contrato")?,
            valor_emprestimo: row.get("valor_emprestimo")?,
            valor_liquido: row.get("valor_liquido")?,
            valor_parcela: row.get("valor_parcela")?,
            quantidade_parcelas: row.get("quantidade_parcelas")?,
            taxa_juros: row.get("taxa_juros")?,
            cet_mensal: row.get("cet_mensal")?,
            banco_origem_id: row.get("banco_origem_id")?,
            saldo_devedor: row.get("saldo_devedor")?,
            valor_troco: row.get("valor_troco")?,
            status: row.get("status")?,
            motivo_rejeicao: row.get("motivo_rejeicao")?,
            pendencias: row.get("pendencias")?,
            data_digitacao: row.get("data_digitacao")?,
            data_pagamento: row.get("data_pagamento")?,
            observacoes: row.get("observacoes")?,
            criado_em: row.get("criado_em")?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_proposta(state: State<'_, AppState>, input: PropostaInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.execute("
        INSERT INTO propostas (cliente_id, agente_id, banco_id, convenio_id, produto_id,
            numero_proposta, valor_emprestimo, valor_liquido, valor_parcela, quantidade_parcelas,
            taxa_juros, cet_mensal, banco_origem_id, saldo_devedor, valor_troco, observacoes)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
    ", rusqlite::params![
        input.cliente_id, input.agente_id, input.banco_id, input.convenio_id,
        input.produto_id, input.numero_proposta, input.valor_emprestimo, input.valor_liquido,
        input.valor_parcela, input.quantidade_parcelas, input.taxa_juros, input.cet_mensal,
        input.banco_origem_id, input.saldo_devedor, input.valor_troco, input.observacoes,
    ]).map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();

    // Registrar no histórico
    db.execute(
        "INSERT INTO proposta_historico (proposta_id, status_novo, observacao) VALUES (?1, 'digitado', 'Proposta criada')",
        rusqlite::params![id],
    ).ok();

    super::audit::registrar_log(&db, usuario_id, "criar", "proposta", Some(id), &format!("Proposta criada — R$ {:.2}", input.valor_emprestimo));
    Ok(id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn atualizar_status_proposta(state: State<'_, AppState>, update: StatusUpdate, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Buscar status atual
    let status_atual: String = db.query_row(
        "SELECT status FROM propostas WHERE id = ?1",
        rusqlite::params![update.proposta_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    // Atualizar status
    let mut sql = "UPDATE propostas SET status = ?1, atualizado_em = datetime('now')".to_string();
    if update.novo_status == "pago" {
        sql += ", data_pagamento = datetime('now')";
    } else if update.novo_status == "aprovado" {
        sql += ", data_aprovacao = datetime('now')";
    } else if update.novo_status == "averbado" {
        sql += ", data_averbacao = datetime('now')";
    }
    sql += &format!(" WHERE id = {}", update.proposta_id);

    db.execute(&sql, rusqlite::params![update.novo_status]).map_err(|e| e.to_string())?;

    // Registrar no histórico
    db.execute(
        "INSERT INTO proposta_historico (proposta_id, status_anterior, status_novo, usuario_id, observacao) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![update.proposta_id, status_atual, update.novo_status, update.usuario_id, update.observacao],
    ).map_err(|e| e.to_string())?;

    // Auto-gerar comissão quando muda pra "pago"
    // Idempotente: só gera se ainda não houver comissão para esta proposta
    // (evita duplicar comissão/lançamentos se o status reentrar em "pago").
    let comissao_ja_existe: i64 = db.query_row(
        "SELECT COUNT(*) FROM comissoes WHERE proposta_id = ?1",
        rusqlite::params![update.proposta_id],
        |r| r.get(0),
    ).unwrap_or(0);
    if update.novo_status == "pago" && comissao_ja_existe == 0 {
        // Buscar dados da proposta
        let (valor_emp, banco_id, produto_id, convenio_id, agente_id): (f64, i64, i64, i64, Option<i64>) = db.query_row(
            "SELECT valor_emprestimo, banco_id, produto_id, convenio_id, agente_id FROM propostas WHERE id = ?1",
            rusqlite::params![update.proposta_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        ).map_err(|e| e.to_string())?;

        // Buscar tabela de comissão (tenta com convênio, depois sem)
        let tabela = db.query_row(
            "SELECT comissao_empresa_percentual, comissao_agente_percentual FROM tabelas_comissao WHERE banco_id=?1 AND produto_id=?2 AND (convenio_id=?3 OR convenio_id IS NULL) AND ativo=1 ORDER BY convenio_id DESC LIMIT 1",
            rusqlite::params![banco_id, produto_id, convenio_id],
            |row| Ok((row.get::<_, Option<f64>>(0)?, row.get::<_, Option<f64>>(1)?)),
        ).ok();

        let (pct_empresa, pct_agente) = tabela.unwrap_or((Some(5.0), Some(2.0)));
        let com_empresa = valor_emp * pct_empresa.unwrap_or(5.0) / 100.0;
        let com_agente = if agente_id.is_some() { Some(valor_emp * pct_agente.unwrap_or(2.0) / 100.0) } else { None };

        // Criar registro de comissão
        db.execute(
            "INSERT INTO comissoes (proposta_id, valor_comissao_empresa, agente_id, valor_comissao_agente) VALUES (?1,?2,?3,?4)",
            rusqlite::params![update.proposta_id, com_empresa, agente_id, com_agente],
        ).ok();

        let comissao_id = db.last_insert_rowid();

        // Criar lançamento de receita (comissão do banco)
        db.execute(
            "INSERT INTO financeiro_lancamentos (tipo, categoria, descricao, valor, data_vencimento, status, proposta_id, comissao_id, banco_id) VALUES ('receita','comissao_banco',?1,?2,date('now','+30 days'),'pendente',?3,?4,?5)",
            rusqlite::params![format!("Comissão proposta #{}", update.proposta_id), com_empresa, update.proposta_id, comissao_id, banco_id],
        ).ok();

        // Criar lançamento de despesa (comissão do agente)
        if let (Some(ag_id), Some(val_ag)) = (agente_id, com_agente) {
            db.execute(
                "INSERT INTO financeiro_lancamentos (tipo, categoria, descricao, valor, data_vencimento, status, proposta_id, comissao_id, agente_id) VALUES ('despesa','comissao_agente',?1,?2,date('now','+15 days'),'pendente',?3,?4,?5)",
                rusqlite::params![format!("Comissão agente - proposta #{}", update.proposta_id), val_ag, update.proposta_id, comissao_id, ag_id],
            ).ok();
        }
    }

    super::audit::registrar_log(&db, usuario_id, "alterar_status", "proposta", Some(update.proposta_id), &format!("Status: {} → {}", status_atual, update.novo_status));
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn obter_historico_proposta(state: State<'_, AppState>, proposta_id: i64) -> Result<Vec<PropostaHistorico>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.prepare("
        SELECT id, status_anterior, status_novo, observacao, criado_em
        FROM proposta_historico
        WHERE proposta_id = ?1
        ORDER BY criado_em ASC
    ").map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![proposta_id], |row| {
        Ok(PropostaHistorico {
            id: row.get(0)?,
            status_anterior: row.get(1)?,
            status_novo: row.get(2)?,
            observacao: row.get(3)?,
            criado_em: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
