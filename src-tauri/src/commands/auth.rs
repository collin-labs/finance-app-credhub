use tauri::State;
use crate::AppState;
use serde::{Deserialize, Serialize};

// ============================================
// MODELOS
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Usuario {
    pub id: i64,
    pub nome: String,
    pub login: String,
    pub perfil: String,
    pub permissoes: Option<String>,
    pub ver_todos_dados: bool,
    pub agente_id: Option<i64>,
    pub senha_temporaria: bool,
    pub ativo: bool,
    pub criado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginInput {
    pub login: String,
    pub senha: String,
}

#[derive(Debug, Deserialize)]
pub struct SetupInput {
    pub nome: String,
    pub login: String,
    pub senha: String,
    pub empresa_nome: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SetupResult {
    pub usuario: Usuario,
    pub recovery_code: String,
}

#[derive(Debug, Deserialize)]
pub struct NovoUsuarioInput {
    pub nome: String,
    pub login: String,
    pub senha: String,
    pub perfil: String,
    pub permissoes: Option<String>,
    pub ver_todos_dados: bool,
    pub agente_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct AtualizarUsuarioInput {
    pub id: i64,
    pub nome: String,
    pub perfil: String,
    pub permissoes: Option<String>,
    pub ver_todos_dados: bool,
    pub agente_id: Option<i64>,
    pub ativo: bool,
}

// ============================================
// HELPERS
// ============================================

fn gerar_recovery_code() -> String {
    use uuid::Uuid;
    // Formato: XXXX-XXXX-XXXX-XXXX (16 chars do uuid, fácil de anotar)
    let raw = Uuid::new_v4().simple().to_string().to_uppercase();
    format!("{}-{}-{}-{}", &raw[0..4], &raw[4..8], &raw[8..12], &raw[12..16])
}

fn map_usuario(row: &rusqlite::Row) -> rusqlite::Result<Usuario> {
    Ok(Usuario {
        id: row.get("id")?,
        nome: row.get("nome")?,
        login: row.get("login")?,
        perfil: row.get("perfil")?,
        permissoes: row.get("permissoes")?,
        ver_todos_dados: row.get("ver_todos_dados")?,
        agente_id: row.get("agente_id")?,
        senha_temporaria: row.get("senha_temporaria")?,
        ativo: row.get("ativo")?,
        criado_em: row.get("criado_em")?,
    })
}

// ============================================
// SETUP / LOGIN
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn check_setup(state: State<'_, AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let count: i64 = db
        .query_row("SELECT COUNT(*) FROM usuarios WHERE perfil = 'admin'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

#[tauri::command(rename_all = "snake_case")]
pub fn setup_admin(state: State<'_, AppState>, input: SetupInput) -> Result<SetupResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let hash = bcrypt::hash(&input.senha, 10).map_err(|e| e.to_string())?;
    let recovery_code = gerar_recovery_code();
    let recovery_hash = bcrypt::hash(&recovery_code, 10).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO usuarios (nome, login, senha_hash, perfil, ver_todos_dados, recovery_hash) VALUES (?1, ?2, ?3, 'admin', 1, ?4)",
        rusqlite::params![input.nome, input.login, hash, recovery_hash],
    ).map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();

    if let Some(empresa_nome) = input.empresa_nome {
        db.execute(
            "INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES ('empresa_nome', ?1)",
            rusqlite::params![empresa_nome],
        ).ok();
    }

    let usuario = db.query_row(
        "SELECT * FROM usuarios WHERE id = ?1",
        rusqlite::params![id],
        map_usuario,
    ).map_err(|e| e.to_string())?;

    Ok(SetupResult { usuario, recovery_code })
}

#[tauri::command(rename_all = "snake_case")]
pub fn login(state: State<'_, AppState>, input: LoginInput) -> Result<Usuario, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let result = db.query_row(
        "SELECT id, senha_hash, ativo FROM usuarios WHERE login = ?1",
        rusqlite::params![input.login],
        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, bool>(2)?)),
    ).map_err(|_| "Usuário não encontrado".to_string())?;

    let (id, hash, ativo) = result;

    if !ativo {
        return Err("Usuário desativado. Contate o administrador.".to_string());
    }

    let valid = bcrypt::verify(&input.senha, &hash).map_err(|e| e.to_string())?;
    if !valid {
        return Err("Senha incorreta".to_string());
    }

    db.execute(
        "INSERT INTO audit_log (usuario_id, acao, entidade, detalhes) VALUES (?1, 'login', 'usuario', 'Login realizado')",
        rusqlite::params![id],
    ).ok();

    db.query_row("SELECT * FROM usuarios WHERE id = ?1", rusqlite::params![id], map_usuario)
        .map_err(|e| e.to_string())
}

// ============================================
// GERENCIAMENTO DE USUÁRIOS (admin)
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn listar_usuarios(state: State<'_, AppState>) -> Result<Vec<Usuario>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT * FROM usuarios ORDER BY perfil, nome").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], map_usuario).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_usuario(state: State<'_, AppState>, input: NovoUsuarioInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let hash = bcrypt::hash(&input.senha, 10).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO usuarios (nome, login, senha_hash, perfil, permissoes, ver_todos_dados, agente_id) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        rusqlite::params![input.nome, input.login, hash, input.perfil, input.permissoes, input.ver_todos_dados, input.agente_id],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") { "Já existe um usuário com esse login".to_string() }
        else { e.to_string() }
    })?;

    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "criar", "usuario", Some(novo_id), &format!("Usuário '{}' criado (perfil: {})", input.nome, input.perfil));
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn atualizar_usuario(state: State<'_, AppState>, input: AtualizarUsuarioInput, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Proteção: não permitir desativar o último admin
    if !input.ativo || input.perfil != "admin" {
        let perfil_atual: String = db.query_row("SELECT perfil FROM usuarios WHERE id=?1", rusqlite::params![input.id], |r| r.get(0)).map_err(|e| e.to_string())?;
        if perfil_atual == "admin" {
            let admins: i64 = db.query_row("SELECT COUNT(*) FROM usuarios WHERE perfil='admin' AND ativo=1", [], |r| r.get(0)).unwrap_or(0);
            if admins <= 1 {
                return Err("Não é possível alterar o último administrador ativo do sistema.".to_string());
            }
        }
    }

    db.execute(
        "UPDATE usuarios SET nome=?1, perfil=?2, permissoes=?3, ver_todos_dados=?4, agente_id=?5, ativo=?6, atualizado_em=datetime('now') WHERE id=?7",
        rusqlite::params![input.nome, input.perfil, input.permissoes, input.ver_todos_dados, input.agente_id, input.ativo, input.id],
    ).map_err(|e| e.to_string())?;

    super::audit::registrar_log(&db, usuario_id, "editar", "usuario", Some(input.id), &format!("Usuário '{}' atualizado", input.nome));
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn resetar_senha_usuario(state: State<'_, AppState>, usuario_id: i64, nova_senha: String, admin_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let hash = bcrypt::hash(&nova_senha, 10).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE usuarios SET senha_hash=?1, senha_temporaria=1, atualizado_em=datetime('now') WHERE id=?2",
        rusqlite::params![hash, usuario_id],
    ).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO audit_log (usuario_id, acao, entidade, entidade_id, detalhes) VALUES (?1, 'reset_senha', 'usuario', ?2, 'Senha resetada pelo admin')",
        rusqlite::params![admin_id, usuario_id],
    ).ok();

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn alterar_propria_senha(state: State<'_, AppState>, usuario_id: i64, senha_atual: String, nova_senha: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let hash_atual: String = db.query_row("SELECT senha_hash FROM usuarios WHERE id=?1", rusqlite::params![usuario_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    let valid = bcrypt::verify(&senha_atual, &hash_atual).map_err(|e| e.to_string())?;
    if !valid {
        return Err("Senha atual incorreta".to_string());
    }

    let novo_hash = bcrypt::hash(&nova_senha, 10).map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE usuarios SET senha_hash=?1, senha_temporaria=0, atualizado_em=datetime('now') WHERE id=?2",
        rusqlite::params![novo_hash, usuario_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================
// RECUPERAÇÃO DE SENHA DO ADMIN (offline)
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn recuperar_senha_admin(state: State<'_, AppState>, login: String, recovery_code: String, nova_senha: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let result = db.query_row(
        "SELECT id, recovery_hash FROM usuarios WHERE login=?1 AND perfil='admin'",
        rusqlite::params![login],
        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, Option<String>>(1)?)),
    ).map_err(|_| "Administrador não encontrado".to_string())?;

    let (id, recovery_hash) = result;
    let recovery_hash = recovery_hash.ok_or("Este administrador não tem código de recuperação configurado.".to_string())?;

    let code_normalizado = recovery_code.trim().to_uppercase();
    let valid = bcrypt::verify(&code_normalizado, &recovery_hash).map_err(|e| e.to_string())?;
    if !valid {
        return Err("Código de recuperação inválido".to_string());
    }

    let novo_hash = bcrypt::hash(&nova_senha, 10).map_err(|e| e.to_string())?;

    // Gera um novo código de recuperação (o antigo foi usado)
    let novo_recovery = gerar_recovery_code();
    let novo_recovery_hash = bcrypt::hash(&novo_recovery, 10).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE usuarios SET senha_hash=?1, recovery_hash=?2, atualizado_em=datetime('now') WHERE id=?3",
        rusqlite::params![novo_hash, novo_recovery_hash, id],
    ).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO audit_log (usuario_id, acao, entidade, detalhes) VALUES (?1, 'recuperacao_senha', 'usuario', 'Senha recuperada via código')",
        rusqlite::params![id],
    ).ok();

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn gerar_novo_recovery_code(state: State<'_, AppState>, usuario_id: i64) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let perfil: String = db.query_row("SELECT perfil FROM usuarios WHERE id=?1", rusqlite::params![usuario_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if perfil != "admin" {
        return Err("Apenas administradores têm código de recuperação".to_string());
    }

    let novo_code = gerar_recovery_code();
    let novo_hash = bcrypt::hash(&novo_code, 10).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE usuarios SET recovery_hash=?1, atualizado_em=datetime('now') WHERE id=?2",
        rusqlite::params![novo_hash, usuario_id],
    ).map_err(|e| e.to_string())?;

    Ok(novo_code)
}
