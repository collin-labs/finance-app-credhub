use tauri::{State, Manager, AppHandle};
use crate::AppState;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize)]
pub struct BackupInfo {
    pub caminho: String,
    pub nome_arquivo: String,
    pub tamanho_kb: u64,
    pub criado_em: String,
}

#[derive(Debug, Serialize)]
pub struct BackupConteudo {
    pub valido: bool,
    pub integridade: String,
    pub total_clientes: i64,
    pub total_propostas: i64,
    pub total_comissoes: i64,
    pub total_usuarios: i64,
    pub data_backup: Option<String>,
}

// Diretório onde ficam os backups automáticos
fn backup_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

// ============================================
// FAZER BACKUP (VACUUM INTO — método seguro)
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn fazer_backup(state: State<'_, AppState>, destino: String, usuario_id: Option<i64>) -> Result<BackupInfo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // 1. Verifica integridade do banco-fonte ANTES
    let integridade: String = db.query_row("PRAGMA integrity_check", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if integridade != "ok" {
        return Err(format!("O banco de dados atual tem problemas de integridade ({}). Backup cancelado por segurança.", integridade));
    }

    // 2. Remove arquivo destino se já existe (VACUUM INTO falha se existir)
    if PathBuf::from(&destino).exists() {
        fs::remove_file(&destino).map_err(|e| format!("Não foi possível sobrescrever: {}", e))?;
    }

    // 3. VACUUM INTO — cópia consistente e compactada, lida com WAL
    let destino_escaped = destino.replace('\'', "''");
    db.execute(&format!("VACUUM INTO '{}'", destino_escaped), [])
        .map_err(|e| format!("Erro ao criar backup: {}", e))?;

    // 4. Coleta info do arquivo gerado
    let meta = fs::metadata(&destino).map_err(|e| e.to_string())?;
    let nome = PathBuf::from(&destino).file_name().and_then(|n| n.to_str()).unwrap_or("backup").to_string();

    super::audit::registrar_log(&db, usuario_id, "backup", "sistema", None, &format!("Backup manual criado: {}", nome));

    Ok(BackupInfo {
        caminho: destino.clone(),
        nome_arquivo: nome,
        tamanho_kb: meta.len() / 1024,
        criado_em: chrono::Local::now().format("%d/%m/%Y %H:%M:%S").to_string(),
    })
}

// ============================================
// BACKUP AUTOMÁTICO (ao fechar) com rotação
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn fazer_backup_automatico(app: AppHandle, state: State<'_, AppState>, manter: Option<usize>) -> Result<BackupInfo, String> {
    let dir = backup_dir(&app)?;
    let manter = manter.unwrap_or(2);

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let nome = format!("auto_{}.credhub-backup", timestamp);
    let destino = dir.join(&nome);

    // Faz o backup
    let info = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let integridade: String = db.query_row("PRAGMA integrity_check", [], |r| r.get(0)).unwrap_or_else(|_| "erro".to_string());
        if integridade != "ok" {
            return Err("Banco com problema de integridade — backup automático pulado.".to_string());
        }
        let destino_str = destino.to_string_lossy().replace('\'', "''");
        db.execute(&format!("VACUUM INTO '{}'", destino_str), [])
            .map_err(|e| format!("Erro no backup automático: {}", e))?;
        let meta = fs::metadata(&destino).map_err(|e| e.to_string())?;
        BackupInfo {
            caminho: destino.to_string_lossy().to_string(),
            nome_arquivo: nome.clone(),
            tamanho_kb: meta.len() / 1024,
            criado_em: chrono::Local::now().format("%d/%m/%Y %H:%M:%S").to_string(),
        }
    };

    // Rotação: mantém só os N mais recentes
    rotacionar_backups(&dir, manter)?;

    Ok(info)
}

fn rotacionar_backups(dir: &PathBuf, manter: usize) -> Result<(), String> {
    let mut backups: Vec<(PathBuf, std::time::SystemTime)> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            let nome = path.file_name()?.to_str()?;
            if nome.starts_with("auto_") && nome.ends_with(".credhub-backup") {
                let modified = entry.metadata().ok()?.modified().ok()?;
                Some((path, modified))
            } else { None }
        })
        .collect();

    // Ordena do mais novo pro mais antigo
    backups.sort_by(|a, b| b.1.cmp(&a.1));

    // Remove os que passam do limite
    for (path, _) in backups.into_iter().skip(manter) {
        let _ = fs::remove_file(path);
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_backups_automaticos(app: AppHandle) -> Result<Vec<BackupInfo>, String> {
    let dir = backup_dir(&app)?;
    let mut backups: Vec<BackupInfo> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            let nome = path.file_name()?.to_str()?.to_string();
            if !nome.ends_with(".credhub-backup") { return None; }
            let meta = entry.metadata().ok()?;
            let modified = meta.modified().ok()?;
            let datetime: chrono::DateTime<chrono::Local> = modified.into();
            Some(BackupInfo {
                caminho: path.to_string_lossy().to_string(),
                nome_arquivo: nome,
                tamanho_kb: meta.len() / 1024,
                criado_em: datetime.format("%d/%m/%Y %H:%M:%S").to_string(),
            })
        })
        .collect();
    backups.sort_by(|a, b| b.criado_em.cmp(&a.criado_em));
    Ok(backups)
}

// ============================================
// VALIDAR BACKUP (antes de restaurar — mostra conteúdo)
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn validar_backup(caminho: String) -> Result<BackupConteudo, String> {
    if !PathBuf::from(&caminho).exists() {
        return Err("Arquivo de backup não encontrado".to_string());
    }

    // Abre o backup em modo somente leitura
    let conn = rusqlite::Connection::open(&caminho)
        .map_err(|e| format!("Não foi possível abrir o arquivo: {}", e))?;

    // Verifica integridade
    let integridade: String = conn.query_row("PRAGMA integrity_check", [], |r| r.get(0))
        .unwrap_or_else(|_| "arquivo inválido".to_string());

    if integridade != "ok" {
        return Ok(BackupConteudo {
            valido: false,
            integridade,
            total_clientes: 0, total_propostas: 0, total_comissoes: 0, total_usuarios: 0,
            data_backup: None,
        });
    }

    // Conta os registros pra o admin validar que é o backup certo
    let total_clientes: i64 = conn.query_row("SELECT COUNT(*) FROM clientes", [], |r| r.get(0)).unwrap_or(0);
    let total_propostas: i64 = conn.query_row("SELECT COUNT(*) FROM propostas", [], |r| r.get(0)).unwrap_or(0);
    let total_comissoes: i64 = conn.query_row("SELECT COUNT(*) FROM comissoes", [], |r| r.get(0)).unwrap_or(0);
    let total_usuarios: i64 = conn.query_row("SELECT COUNT(*) FROM usuarios", [], |r| r.get(0)).unwrap_or(0);

    Ok(BackupConteudo {
        valido: true,
        integridade,
        total_clientes, total_propostas, total_comissoes, total_usuarios,
        data_backup: None,
    })
}

// ============================================
// RESTAURAR BACKUP (com cópia de segurança do atual)
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn restaurar_backup(app: AppHandle, state: State<'_, AppState>, caminho: String, usuario_id: Option<i64>) -> Result<String, String> {
    // 1. Valida o backup antes de qualquer coisa
    let conteudo = validar_backup(caminho.clone())?;
    if !conteudo.valido {
        return Err(format!("Backup inválido ({}). Restauração cancelada.", conteudo.integridade));
    }

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("credhub.db");

    // 2. Faz cópia de segurança do banco ATUAL antes de sobrescrever.
    //    Antes, força um checkpoint do WAL na conexão viva para a cópia ficar consistente.
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        super::audit::registrar_log(&db, usuario_id, "restaurar_backup", "sistema", None, &format!("Restauração de backup iniciada: {}", caminho));
        let _ = db.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
    } // libera o lock antes de mexer nos arquivos

    let seguranca_dir = app_dir.join("backups");
    fs::create_dir_all(&seguranca_dir).map_err(|e| e.to_string())?;
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let seguranca_path = seguranca_dir.join(format!("antes_restauracao_{}.credhub-backup", timestamp));

    if db_path.exists() {
        fs::copy(&db_path, &seguranca_path).map_err(|e| format!("Falha ao salvar cópia de segurança: {}", e))?;
    }

    // 3. Remove arquivos WAL/SHM antigos (importante — senão dados ficam inconsistentes)
    let wal = app_dir.join("credhub.db-wal");
    let shm = app_dir.join("credhub.db-shm");
    let _ = fs::remove_file(&wal);
    let _ = fs::remove_file(&shm);

    // 4. Substitui o banco pelo backup
    fs::copy(&caminho, &db_path).map_err(|e| format!("Falha ao restaurar: {}", e))?;

    // 5. Reinicia o PROCESSO de fato — recria a conexão SQLite no setup().
    //    (Não basta recarregar o WebView: a conexão antiga continuaria aberta sobre o
    //     arquivo trocado, podendo reverter/corromper a restauração.)
    app.restart()
}
