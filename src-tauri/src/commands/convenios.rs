use tauri::State;
use crate::AppState;
use crate::models::{Convenio, ConvenioInput};

#[tauri::command(rename_all = "snake_case")]
pub fn listar_convenios(state: State<'_, AppState>) -> Result<Vec<Convenio>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT id, nome, tipo, estado, orgao, margem_maxima, prazo_maximo, taxa_teto, sistema_consulta, ativo, notas FROM convenios WHERE ativo = 1 ORDER BY nome")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Convenio { id: row.get(0)?, nome: row.get(1)?, tipo: row.get(2)?, estado: row.get(3)?, orgao: row.get(4)?, margem_maxima: row.get(5)?, prazo_maximo: row.get(6)?, taxa_teto: row.get(7)?, sistema_consulta: row.get(8)?, ativo: row.get(9)?, notas: row.get(10)? })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_convenio(state: State<'_, AppState>, input: ConvenioInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT INTO convenios (nome, tipo, estado, orgao, margem_maxima, prazo_maximo, taxa_teto, sistema_consulta, notas) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        rusqlite::params![input.nome, input.tipo, input.estado, input.orgao, input.margem_maxima, input.prazo_maximo, input.taxa_teto, input.sistema_consulta, input.notas]).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "criar", "convenio", Some(novo_id), &format!("Convênio '{}' criado", input.nome));
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn atualizar_convenio(state: State<'_, AppState>, id: i64, input: ConvenioInput, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE convenios SET nome=?1, tipo=?2, estado=?3, orgao=?4, margem_maxima=?5, prazo_maximo=?6, taxa_teto=?7, sistema_consulta=?8, notas=?9, atualizado_em=datetime('now') WHERE id=?10",
        rusqlite::params![input.nome, input.tipo, input.estado, input.orgao, input.margem_maxima, input.prazo_maximo, input.taxa_teto, input.sistema_consulta, input.notas, id]).map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "editar", "convenio", Some(id), &format!("Convênio '{}' atualizado", input.nome));
    Ok(())
}
