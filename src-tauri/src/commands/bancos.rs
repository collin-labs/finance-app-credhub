use tauri::State;
use crate::AppState;
use crate::models::{Banco, BancoInput};

#[tauri::command(rename_all = "snake_case")]
pub fn listar_bancos(state: State<'_, AppState>) -> Result<Vec<Banco>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT id, nome, codigo, contato, notas, ativo FROM bancos WHERE ativo = 1 ORDER BY nome")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Banco { id: row.get(0)?, nome: row.get(1)?, codigo: row.get(2)?, contato: row.get(3)?, notas: row.get(4)?, ativo: row.get(5)? })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_banco(state: State<'_, AppState>, input: BancoInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT INTO bancos (nome, codigo, contato, notas) VALUES (?1,?2,?3,?4)",
        rusqlite::params![input.nome, input.codigo, input.contato, input.notas]).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "criar", "banco", Some(novo_id), &format!("Banco '{}' criado", input.nome));
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn atualizar_banco(state: State<'_, AppState>, id: i64, input: BancoInput, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE bancos SET nome=?1, codigo=?2, contato=?3, notas=?4 WHERE id=?5",
        rusqlite::params![input.nome, input.codigo, input.contato, input.notas, id]).map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "editar", "banco", Some(id), &format!("Banco '{}' atualizado", input.nome));
    Ok(())
}
