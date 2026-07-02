use tauri::State;
use crate::AppState;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

// ============================================
// HELPER — usado por todos os commands de escrita
// ============================================

pub fn registrar_log(
    conn: &Connection,
    usuario_id: Option<i64>,
    acao: &str,
    entidade: &str,
    entidade_id: Option<i64>,
    detalhes: &str,
) {
    // Log nunca deve quebrar a operação principal — erros são ignorados silenciosamente
    let _ = conn.execute(
        "INSERT INTO audit_log (usuario_id, acao, entidade, entidade_id, detalhes) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![usuario_id, acao, entidade, entidade_id, detalhes],
    );
}

// ============================================
// STRUCTS
// ============================================

#[derive(Debug, Serialize)]
pub struct AuditLogEntry {
    pub id: i64,
    pub usuario_id: Option<i64>,
    pub usuario_nome: Option<String>,
    pub acao: String,
    pub entidade: String,
    pub entidade_id: Option<i64>,
    pub detalhes: Option<String>,
    pub criado_em: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct AuditFiltros {
    pub entidade: Option<String>,
    pub usuario_id: Option<i64>,
    pub acao: Option<String>,
    pub data_inicio: Option<String>,
    pub data_fim: Option<String>,
    pub limite: Option<i64>,
    pub offset: Option<i64>,
}

// ============================================
// COMMANDS — consulta (admin/gerente)
// ============================================

fn montar_where(filtros: &AuditFiltros) -> (String, Vec<Box<dyn rusqlite::types::ToSql>>) {
    let mut conds: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref e) = filtros.entidade {
        if !e.is_empty() {
            params.push(Box::new(e.clone()));
            conds.push(format!("a.entidade = ?{}", params.len()));
        }
    }
    if let Some(uid) = filtros.usuario_id {
        params.push(Box::new(uid));
        conds.push(format!("a.usuario_id = ?{}", params.len()));
    }
    if let Some(ref ac) = filtros.acao {
        if !ac.is_empty() {
            params.push(Box::new(ac.clone()));
            conds.push(format!("a.acao = ?{}", params.len()));
        }
    }
    if let Some(ref di) = filtros.data_inicio {
        if !di.is_empty() {
            params.push(Box::new(format!("{} 00:00:00", di)));
            conds.push(format!("a.criado_em >= ?{}", params.len()));
        }
    }
    if let Some(ref df) = filtros.data_fim {
        if !df.is_empty() {
            params.push(Box::new(format!("{} 23:59:59", df)));
            conds.push(format!("a.criado_em <= ?{}", params.len()));
        }
    }

    let where_sql = if conds.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conds.join(" AND "))
    };

    (where_sql, params)
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_audit_log(
    state: State<'_, AppState>,
    filtros: AuditFiltros,
) -> Result<Vec<AuditLogEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (where_sql, mut params) = montar_where(&filtros);
    let limite = filtros.limite.unwrap_or(50);
    let offset = filtros.offset.unwrap_or(0);

    params.push(Box::new(limite));
    let lim_idx = params.len();
    params.push(Box::new(offset));
    let off_idx = params.len();

    let sql = format!(
        "SELECT a.id, a.usuario_id, u.nome, a.acao, a.entidade, a.entidade_id, a.detalhes, a.criado_em
         FROM audit_log a LEFT JOIN usuarios u ON a.usuario_id = u.id
         {} ORDER BY a.criado_em DESC, a.id DESC LIMIT ?{} OFFSET ?{}",
        where_sql, lim_idx, off_idx
    );

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(AuditLogEntry {
                id: row.get(0)?,
                usuario_id: row.get(1)?,
                usuario_nome: row.get(2)?,
                acao: row.get(3)?,
                entidade: row.get(4)?,
                entidade_id: row.get(5)?,
                detalhes: row.get(6)?,
                criado_em: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn contar_audit_log(state: State<'_, AppState>, filtros: AuditFiltros) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (where_sql, params) = montar_where(&filtros);
    let sql = format!(
        "SELECT COUNT(*) FROM audit_log a LEFT JOIN usuarios u ON a.usuario_id = u.id {}",
        where_sql
    );

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    db.query_row(&sql, params_refs.as_slice(), |r| r.get(0))
        .map_err(|e| e.to_string())
}
