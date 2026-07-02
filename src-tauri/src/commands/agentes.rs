use tauri::State;
use crate::AppState;
use crate::models::{Agente, AgenteInput};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct VinculosAgente {
    pub usuarios: i64,
    pub propostas: i64,
    pub comissoes: i64,
    pub clientes: i64,
    pub leads: i64,
    pub total: i64,
    pub pode_excluir: bool,
}

/// Verifica todos os vínculos de um agente antes de excluir.
#[tauri::command(rename_all = "snake_case")]
pub fn verificar_vinculos_agente(state: State<'_, AppState>, id: i64) -> Result<VinculosAgente, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let conta = |sql: &str| -> i64 {
        db.query_row(sql, rusqlite::params![id], |r| r.get(0)).unwrap_or(0)
    };

    let usuarios = conta("SELECT COUNT(*) FROM usuarios WHERE agente_id = ?1");
    let propostas = conta("SELECT COUNT(*) FROM propostas WHERE agente_id = ?1");
    let comissoes = conta("SELECT COUNT(*) FROM comissoes WHERE agente_id = ?1");
    let clientes = conta("SELECT COUNT(*) FROM clientes WHERE agente_responsavel_id = ?1");
    let leads = conta("SELECT COUNT(*) FROM leads WHERE agente_id = ?1");

    let total = usuarios + propostas + comissoes + clientes + leads;

    Ok(VinculosAgente {
        usuarios, propostas, comissoes, clientes, leads, total,
        pode_excluir: total == 0,
    })
}

/// Exclui o agente DE VEZ (só se não tiver vínculos) ou desativa (se tiver).
#[tauri::command(rename_all = "snake_case")]
pub fn excluir_agente(state: State<'_, AppState>, id: i64, forcar_desativar: bool, usuario_id: Option<i64>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Conta vínculos
    let conta = |sql: &str| -> i64 {
        db.query_row(sql, rusqlite::params![id], |r| r.get(0)).unwrap_or(0)
    };
    let total = conta("SELECT COUNT(*) FROM usuarios WHERE agente_id = ?1")
        + conta("SELECT COUNT(*) FROM propostas WHERE agente_id = ?1")
        + conta("SELECT COUNT(*) FROM comissoes WHERE agente_id = ?1")
        + conta("SELECT COUNT(*) FROM clientes WHERE agente_responsavel_id = ?1")
        + conta("SELECT COUNT(*) FROM leads WHERE agente_id = ?1");

    if total == 0 && !forcar_desativar {
        // Sem vínculos → exclui de vez
        db.execute("DELETE FROM agentes WHERE id = ?1", rusqlite::params![id])
            .map_err(|e| e.to_string())?;
        super::audit::registrar_log(&db, usuario_id, "excluir", "agente", Some(id), "Agente excluído definitivamente");
        Ok("excluido".to_string())
    } else {
        // Tem vínculos → desativa (preserva histórico)
        db.execute("UPDATE agentes SET ativo = 0, atualizado_em = datetime('now') WHERE id = ?1", rusqlite::params![id])
            .map_err(|e| e.to_string())?;
        super::audit::registrar_log(&db, usuario_id, "desativar", "agente", Some(id), "Agente desativado (soft delete)");
        Ok("desativado".to_string())
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_agentes(state: State<'_, AppState>) -> Result<Vec<Agente>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT id, nome, cpf, telefone, whatsapp, email, tipo, pix, ativo, observacoes, criado_em FROM agentes WHERE ativo = 1 ORDER BY nome")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Agente { id: row.get(0)?, nome: row.get(1)?, cpf: row.get(2)?, telefone: row.get(3)?, whatsapp: row.get(4)?, email: row.get(5)?, tipo: row.get(6)?, pix: row.get(7)?, ativo: row.get(8)?, observacoes: row.get(9)?, criado_em: row.get(10)? })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_agente(state: State<'_, AppState>, input: AgenteInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT INTO agentes (nome, cpf, telefone, whatsapp, email, tipo, banco_pagamento, agencia, conta, pix, observacoes) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        rusqlite::params![input.nome, input.cpf, input.telefone, input.whatsapp, input.email, input.tipo, input.banco_pagamento, input.agencia, input.conta, input.pix, input.observacoes]).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "criar", "agente", Some(novo_id), &format!("Agente '{}' criado", input.nome));
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn atualizar_agente(state: State<'_, AppState>, id: i64, input: AgenteInput, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE agentes SET nome=?1, cpf=?2, telefone=?3, whatsapp=?4, email=?5, tipo=?6, banco_pagamento=?7, agencia=?8, conta=?9, pix=?10, observacoes=?11, atualizado_em=datetime('now') WHERE id=?12",
        rusqlite::params![input.nome, input.cpf, input.telefone, input.whatsapp, input.email, input.tipo, input.banco_pagamento, input.agencia, input.conta, input.pix, input.observacoes, id]).map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "editar", "agente", Some(id), &format!("Agente '{}' atualizado", input.nome));
    Ok(())
}
