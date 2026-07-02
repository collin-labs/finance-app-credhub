use tauri::State;
use crate::AppState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct ComissaoView {
    pub id: i64,
    pub proposta_id: i64,
    pub cliente_nome: Option<String>,
    pub banco_nome: Option<String>,
    pub produto_nome: Option<String>,
    pub valor_emprestimo: f64,
    pub valor_comissao_empresa: f64,
    pub status_empresa: String,
    pub data_recebimento_empresa: Option<String>,
    pub agente_id: Option<i64>,
    pub agente_nome: Option<String>,
    pub valor_comissao_agente: Option<f64>,
    pub status_agente: Option<String>,
    pub data_pagamento_agente: Option<String>,
    pub data_pagamento_proposta: Option<String>,
    pub criado_em: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_comissoes(state: State<'_, AppState>, filtro_status: Option<String>) -> Result<Vec<ComissaoView>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let where_clause = match filtro_status.as_deref() {
        Some("a_receber") => "AND c.status_empresa = 'a_receber'",
        Some("recebido") => "AND c.status_empresa = 'recebido'",
        Some("a_pagar") => "AND c.status_agente = 'a_pagar'",
        Some("pago_agente") => "AND c.status_agente = 'pago'",
        _ => "",
    };

    let sql = format!("
        SELECT c.id, c.proposta_id, cl.nome, b.nome, pr.nome, p.valor_emprestimo,
               c.valor_comissao_empresa, c.status_empresa, c.data_recebimento_empresa,
               c.agente_id, ag.nome, c.valor_comissao_agente, c.status_agente,
               c.data_pagamento_agente, p.data_pagamento, c.criado_em
        FROM comissoes c
        JOIN propostas p ON c.proposta_id = p.id
        LEFT JOIN clientes cl ON p.cliente_id = cl.id
        LEFT JOIN bancos b ON p.banco_id = b.id
        LEFT JOIN produtos pr ON p.produto_id = pr.id
        LEFT JOIN agentes ag ON c.agente_id = ag.id
        WHERE 1=1 {}
        ORDER BY c.criado_em DESC
        LIMIT 200
    ", where_clause);

    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(ComissaoView {
            id: row.get(0)?, proposta_id: row.get(1)?, cliente_nome: row.get(2)?,
            banco_nome: row.get(3)?, produto_nome: row.get(4)?, valor_emprestimo: row.get(5)?,
            valor_comissao_empresa: row.get(6)?, status_empresa: row.get(7)?,
            data_recebimento_empresa: row.get(8)?, agente_id: row.get(9)?,
            agente_nome: row.get(10)?, valor_comissao_agente: row.get(11)?,
            status_agente: row.get(12)?, data_pagamento_agente: row.get(13)?,
            data_pagamento_proposta: row.get(14)?, criado_em: row.get(15)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn marcar_comissao_recebida(state: State<'_, AppState>, comissao_id: i64, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE comissoes SET status_empresa = 'recebido', data_recebimento_empresa = datetime('now'), atualizado_em = datetime('now') WHERE id = ?1",
        rusqlite::params![comissao_id],
    ).map_err(|e| e.to_string())?;
    // Also update financial entry
    db.execute(
        "UPDATE financeiro_lancamentos SET status = 'pago', data_pagamento = datetime('now'), atualizado_em = datetime('now') WHERE comissao_id = ?1 AND tipo = 'receita'",
        rusqlite::params![comissao_id],
    ).ok();
    super::audit::registrar_log(&db, usuario_id, "receber", "comissao", Some(comissao_id), "Comissão da empresa marcada como recebida");
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn marcar_comissao_agente_paga(state: State<'_, AppState>, comissao_id: i64, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE comissoes SET status_agente = 'pago', data_pagamento_agente = datetime('now'), atualizado_em = datetime('now') WHERE id = ?1",
        rusqlite::params![comissao_id],
    ).map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE financeiro_lancamentos SET status = 'pago', data_pagamento = datetime('now'), atualizado_em = datetime('now') WHERE comissao_id = ?1 AND tipo = 'despesa'",
        rusqlite::params![comissao_id],
    ).ok();
    super::audit::registrar_log(&db, usuario_id, "pagar_agente", "comissao", Some(comissao_id), "Comissão do agente marcada como paga");
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct TabelaComissaoView {
    pub id: i64,
    pub banco_id: i64,
    pub banco_nome: String,
    pub produto_id: i64,
    pub produto_nome: String,
    pub convenio_id: Option<i64>,
    pub convenio_nome: Option<String>,
    pub comissao_empresa_percentual: Option<f64>,
    pub comissao_agente_percentual: Option<f64>,
    pub ativo: bool,
}

#[derive(Debug, Deserialize)]
pub struct TabelaComissaoInput {
    pub banco_id: i64,
    pub produto_id: i64,
    pub convenio_id: Option<i64>,
    pub comissao_empresa_percentual: Option<f64>,
    pub comissao_agente_percentual: Option<f64>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_tabelas_comissao(state: State<'_, AppState>) -> Result<Vec<TabelaComissaoView>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("
        SELECT tc.id, tc.banco_id, b.nome, tc.produto_id, pr.nome, tc.convenio_id, cv.nome,
               tc.comissao_empresa_percentual, tc.comissao_agente_percentual, tc.ativo
        FROM tabelas_comissao tc
        JOIN bancos b ON tc.banco_id = b.id
        JOIN produtos pr ON tc.produto_id = pr.id
        LEFT JOIN convenios cv ON tc.convenio_id = cv.id
        WHERE tc.ativo = 1
        ORDER BY b.nome, pr.nome
    ").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(TabelaComissaoView {
            id: row.get(0)?, banco_id: row.get(1)?, banco_nome: row.get(2)?,
            produto_id: row.get(3)?, produto_nome: row.get(4)?, convenio_id: row.get(5)?,
            convenio_nome: row.get(6)?, comissao_empresa_percentual: row.get(7)?,
            comissao_agente_percentual: row.get(8)?, ativo: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_tabela_comissao(state: State<'_, AppState>, input: TabelaComissaoInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT INTO tabelas_comissao (banco_id, produto_id, convenio_id, comissao_empresa_percentual, comissao_agente_percentual) VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![input.banco_id, input.produto_id, input.convenio_id, input.comissao_empresa_percentual, input.comissao_agente_percentual],
    ).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "criar", "tabela_comissao", Some(novo_id), "Tabela de comissão criada");
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn excluir_tabela_comissao(state: State<'_, AppState>, id: i64, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE tabelas_comissao SET ativo = 0 WHERE id = ?1", rusqlite::params![id]).map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "excluir", "tabela_comissao", Some(id), "Tabela de comissão desativada");
    Ok(())
}
