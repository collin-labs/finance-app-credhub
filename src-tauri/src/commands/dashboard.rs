use tauri::State;
use crate::AppState;
use crate::models::{DashboardStats, StatusCount};

#[tauri::command(rename_all = "snake_case")]
pub fn obter_stats_dashboard(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let total_clientes: i64 = db.query_row("SELECT COUNT(*) FROM clientes WHERE ativo = 1", [], |r| r.get(0)).unwrap_or(0);

    let total_propostas_mes: i64 = db.query_row(
        "SELECT COUNT(*) FROM propostas WHERE strftime('%Y-%m', data_digitacao) = strftime('%Y-%m', 'now')", [], |r| r.get(0)
    ).unwrap_or(0);

    let valor_total_mes: f64 = db.query_row(
        "SELECT COALESCE(SUM(valor_emprestimo), 0) FROM propostas WHERE status = 'pago' AND strftime('%Y-%m', data_pagamento) = strftime('%Y-%m', 'now')", [], |r| r.get(0)
    ).unwrap_or(0.0);

    let comissoes_a_receber: f64 = db.query_row(
        "SELECT COALESCE(SUM(valor_comissao_empresa), 0) FROM comissoes WHERE status_empresa = 'a_receber'", [], |r| r.get(0)
    ).unwrap_or(0.0);

    let comissoes_a_pagar: f64 = db.query_row(
        "SELECT COALESCE(SUM(valor_comissao_agente), 0) FROM comissoes WHERE status_agente = 'a_pagar'", [], |r| r.get(0)
    ).unwrap_or(0.0);

    let total_leads_novos: i64 = db.query_row(
        "SELECT COUNT(*) FROM leads WHERE status = 'novo'", [], |r| r.get(0)
    ).unwrap_or(0);

    // Propostas por status
    let mut stmt = db.prepare("SELECT status, COUNT(*) FROM propostas WHERE status NOT IN ('cancelado','expirado') GROUP BY status ORDER BY status")
        .map_err(|e| e.to_string())?;
    let status_rows = stmt.query_map([], |row| {
        Ok(StatusCount { status: row.get(0)?, total: row.get(1)? })
    }).map_err(|e| e.to_string())?;
    let propostas_por_status = status_rows.collect::<Result<Vec<_>, _>>().unwrap_or_default();

    Ok(DashboardStats {
        total_clientes, total_propostas_mes, propostas_por_status,
        valor_total_mes, comissoes_a_receber, comissoes_a_pagar, total_leads_novos,
    })
}
