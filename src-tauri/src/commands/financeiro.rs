use tauri::State;
use crate::AppState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct LancamentoView {
    pub id: i64,
    pub tipo: String,
    pub categoria: String,
    pub descricao: String,
    pub valor: f64,
    pub data_vencimento: String,
    pub data_pagamento: Option<String>,
    pub status: String,
    pub proposta_id: Option<i64>,
    pub agente_nome: Option<String>,
    pub banco_nome: Option<String>,
    pub criado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct LancamentoInput {
    pub tipo: String,
    pub categoria: String,
    pub descricao: String,
    pub valor: f64,
    pub data_vencimento: String,
    pub data_pagamento: Option<String>,
    pub status: Option<String>,
    pub observacoes: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_lancamentos(state: State<'_, AppState>, tipo_filtro: Option<String>, status_filtro: Option<String>) -> Result<Vec<LancamentoView>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec!["1=1".to_string()];
    if let Some(ref t) = tipo_filtro { conditions.push(format!("fl.tipo = '{}'", t.replace('\'', "''"))); }
    if let Some(ref s) = status_filtro { conditions.push(format!("fl.status = '{}'", s.replace('\'', "''"))); }

    let sql = format!("
        SELECT fl.id, fl.tipo, fl.categoria, fl.descricao, fl.valor,
               fl.data_vencimento, fl.data_pagamento, fl.status,
               fl.proposta_id, ag.nome, b.nome, fl.criado_em
        FROM financeiro_lancamentos fl
        LEFT JOIN agentes ag ON fl.agente_id = ag.id
        LEFT JOIN bancos b ON fl.banco_id = b.id
        WHERE {}
        ORDER BY fl.data_vencimento DESC
        LIMIT 200
    ", conditions.join(" AND "));

    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(LancamentoView {
            id: row.get(0)?, tipo: row.get(1)?, categoria: row.get(2)?,
            descricao: row.get(3)?, valor: row.get(4)?, data_vencimento: row.get(5)?,
            data_pagamento: row.get(6)?, status: row.get(7)?, proposta_id: row.get(8)?,
            agente_nome: row.get(9)?, banco_nome: row.get(10)?, criado_em: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_lancamento(state: State<'_, AppState>, input: LancamentoInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let status = input.status.unwrap_or_else(|| "pendente".to_string());
    db.execute("INSERT INTO financeiro_lancamentos (tipo, categoria, descricao, valor, data_vencimento, data_pagamento, status) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        rusqlite::params![input.tipo, input.categoria, input.descricao, input.valor, input.data_vencimento, input.data_pagamento, status],
    ).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "criar", "lancamento", Some(novo_id), &format!("Lançamento {} — R$ {:.2}", input.tipo, input.valor));
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn marcar_lancamento_pago(state: State<'_, AppState>, id: i64, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE financeiro_lancamentos SET status = 'pago', data_pagamento = datetime('now'), atualizado_em = datetime('now') WHERE id = ?1",
        rusqlite::params![id]).map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "pagar", "lancamento", Some(id), "Lançamento marcado como pago");
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct ResumoFinanceiro {
    pub receitas_pendentes: f64,
    pub receitas_recebidas: f64,
    pub despesas_pendentes: f64,
    pub despesas_pagas: f64,
    pub saldo: f64,
    pub receitas_mes: f64,
    pub despesas_mes: f64,
}

#[tauri::command(rename_all = "snake_case")]
pub fn obter_resumo_financeiro(state: State<'_, AppState>) -> Result<ResumoFinanceiro, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let receitas_pendentes: f64 = db.query_row("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='receita' AND status='pendente'", [], |r| r.get(0)).unwrap_or(0.0);
    let receitas_recebidas: f64 = db.query_row("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='receita' AND status='pago'", [], |r| r.get(0)).unwrap_or(0.0);
    let despesas_pendentes: f64 = db.query_row("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='despesa' AND status='pendente'", [], |r| r.get(0)).unwrap_or(0.0);
    let despesas_pagas: f64 = db.query_row("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='despesa' AND status='pago'", [], |r| r.get(0)).unwrap_or(0.0);
    let receitas_mes: f64 = db.query_row("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='receita' AND status='pago' AND strftime('%Y-%m', data_pagamento)=strftime('%Y-%m','now')", [], |r| r.get(0)).unwrap_or(0.0);
    let despesas_mes: f64 = db.query_row("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='despesa' AND status='pago' AND strftime('%Y-%m', data_pagamento)=strftime('%Y-%m','now')", [], |r| r.get(0)).unwrap_or(0.0);

    Ok(ResumoFinanceiro {
        receitas_pendentes, receitas_recebidas, despesas_pendentes, despesas_pagas,
        saldo: receitas_recebidas - despesas_pagas,
        receitas_mes, despesas_mes,
    })
}
