use tauri::State;
use crate::AppState;
use serde::{Deserialize, Serialize};
use super::notificador;

// ============================================
// STRUCTS
// ============================================

#[derive(Debug, Serialize)]
pub struct Feedback {
    pub id: i64,
    pub tipo: String,
    pub titulo: String,
    pub descricao: Option<String>,
    pub prioridade: String,
    pub status_envio: String,
    pub canais_enviados: Option<String>,
    pub erro_envio: Option<String>,
    pub usuario_nome: Option<String>,
    pub versao_app: Option<String>,
    pub criado_em: String,
    pub enviado_em: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FeedbackInput {
    pub tipo: String,
    pub titulo: String,
    pub descricao: Option<String>,
    pub prioridade: Option<String>,
    pub usuario_id: Option<i64>,
    pub versao_app: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FeedbackConfigView {
    pub canal: String,
    pub ativo: bool,
    pub config: String,
    pub testado_em: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EnvioResultado {
    pub status: String,
    pub canais_ok: Vec<String>,
    pub erros: Vec<String>,
}

// ============================================
// COMMANDS — FEEDBACK (uso do cliente)
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn listar_feedbacks(
    state: State<'_, AppState>,
    tipo_filtro: Option<String>,
    limite: Option<i64>,
) -> Result<Vec<Feedback>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let lim = limite.unwrap_or(100);

    let (sql, params_vec): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(ref tipo) = tipo_filtro {
        (
            format!(
                "SELECT f.id, f.tipo, f.titulo, f.descricao, f.prioridade, f.status_envio,
                        f.canais_enviados, f.erro_envio, u.nome, f.versao_app, f.criado_em, f.enviado_em
                 FROM feedbacks f LEFT JOIN usuarios u ON f.usuario_id = u.id
                 WHERE f.tipo = ?1 ORDER BY f.criado_em DESC LIMIT ?2"
            ),
            vec![Box::new(tipo.clone()), Box::new(lim)],
        )
    } else {
        (
            format!(
                "SELECT f.id, f.tipo, f.titulo, f.descricao, f.prioridade, f.status_envio,
                        f.canais_enviados, f.erro_envio, u.nome, f.versao_app, f.criado_em, f.enviado_em
                 FROM feedbacks f LEFT JOIN usuarios u ON f.usuario_id = u.id
                 ORDER BY f.criado_em DESC LIMIT ?1"
            ),
            vec![Box::new(lim)],
        )
    };

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(Feedback {
                id: row.get(0)?,
                tipo: row.get(1)?,
                titulo: row.get(2)?,
                descricao: row.get(3)?,
                prioridade: row.get(4)?,
                status_envio: row.get(5)?,
                canais_enviados: row.get(6)?,
                erro_envio: row.get(7)?,
                usuario_nome: row.get(8)?,
                versao_app: row.get(9)?,
                criado_em: row.get(10)?,
                enviado_em: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_feedback(
    state: State<'_, AppState>,
    input: FeedbackInput,
) -> Result<EnvioResultado, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let prioridade = input.prioridade.as_deref().unwrap_or("normal");

    db.execute(
        "INSERT INTO feedbacks (tipo, titulo, descricao, prioridade, usuario_id, versao_app)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            input.tipo,
            input.titulo,
            input.descricao,
            prioridade,
            input.usuario_id,
            input.versao_app
        ],
    )
    .map_err(|e| e.to_string())?;

    let feedback_id = db.last_insert_rowid();

    // Monta dados e despacha
    match notificador::montar_feedback_envio(&db, feedback_id) {
        Ok(fb_envio) => {
            let resultado = notificador::despachar_feedback(&db, &fb_envio);
            notificador::atualizar_status_envio(&db, feedback_id, &resultado);

            let erros: Vec<String> = resultado
                .canais_erro
                .iter()
                .map(|(c, e)| format!("{}: {}", c, e))
                .collect();

            let status = if erros.is_empty() && !resultado.canais_ok.is_empty() {
                "enviado".to_string()
            } else if resultado.canais_ok.is_empty() && erros.is_empty() {
                // Nenhum canal ativo
                "pendente".to_string()
            } else if resultado.canais_ok.is_empty() {
                "erro".to_string()
            } else {
                "parcial".to_string()
            };

            Ok(EnvioResultado {
                status,
                canais_ok: resultado.canais_ok,
                erros,
            })
        }
        Err(e) => {
            // Salvo no banco mas falhou ao montar — retorna erro mas feedback ficou salvo
            Ok(EnvioResultado {
                status: "erro".to_string(),
                canais_ok: vec![],
                erros: vec![format!("Erro interno: {}", e)],
            })
        }
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn excluir_feedback(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM feedbacks WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn reenviar_feedback(state: State<'_, AppState>, id: i64) -> Result<EnvioResultado, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let fb_envio = notificador::montar_feedback_envio(&db, id)?;
    let resultado = notificador::despachar_feedback(&db, &fb_envio);
    notificador::atualizar_status_envio(&db, id, &resultado);

    let erros: Vec<String> = resultado
        .canais_erro
        .iter()
        .map(|(c, e)| format!("{}: {}", c, e))
        .collect();

    let status = if erros.is_empty() && !resultado.canais_ok.is_empty() {
        "enviado"
    } else if resultado.canais_ok.is_empty() {
        "erro"
    } else {
        "parcial"
    };

    Ok(EnvioResultado {
        status: status.to_string(),
        canais_ok: resultado.canais_ok,
        erros,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn reenviar_pendentes(state: State<'_, AppState>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare("SELECT id FROM feedbacks WHERE status_envio IN ('pendente', 'erro')")
        .map_err(|e| e.to_string())?;

    let ids: Vec<i64> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut reenviados: i64 = 0;
    for id in ids {
        if let Ok(fb_envio) = notificador::montar_feedback_envio(&db, id) {
            let resultado = notificador::despachar_feedback(&db, &fb_envio);
            if !resultado.canais_ok.is_empty() {
                notificador::atualizar_status_envio(&db, id, &resultado);
                reenviados += 1;
            }
        }
    }
    Ok(reenviados)
}

// ============================================
// COMMANDS — CONFIGURAÇÃO DOS CANAIS (admin)
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn listar_feedback_config(state: State<'_, AppState>) -> Result<Vec<FeedbackConfigView>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Garante que os 4 canais existam na tabela (INSERT OR IGNORE)
    for canal in &["email", "telegram", "discord", "whatsapp"] {
        let _ = db.execute(
            "INSERT OR IGNORE INTO feedback_config (canal) VALUES (?1)",
            rusqlite::params![canal],
        );
    }

    let mut stmt = db
        .prepare(
            "SELECT canal, ativo, config, testado_em FROM feedback_config ORDER BY
             CASE canal WHEN 'email' THEN 1 WHEN 'whatsapp' THEN 2 WHEN 'telegram' THEN 3 WHEN 'discord' THEN 4 END",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(FeedbackConfigView {
                canal: row.get(0)?,
                ativo: row.get::<_, i64>(1)? == 1,
                config: row.get(2)?,
                testado_em: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn salvar_feedback_config(
    state: State<'_, AppState>,
    canal: String,
    ativo: bool,
    config: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ativo_int: i64 = if ativo { 1 } else { 0 };

    db.execute(
        "INSERT INTO feedback_config (canal, ativo, config, atualizado_em)
         VALUES (?1, ?2, ?3, datetime('now'))
         ON CONFLICT(canal) DO UPDATE SET ativo = ?2, config = ?3, atualizado_em = datetime('now')",
        rusqlite::params![canal, ativo_int, config],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn testar_canal_feedback(
    state: State<'_, AppState>,
    canal: String,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Lê config do canal
    let config_json: String = db
        .query_row(
            "SELECT config FROM feedback_config WHERE canal = ?1",
            rusqlite::params![canal],
            |r| r.get(0),
        )
        .map_err(|_| format!("Canal '{}' não configurado", canal))?;

    // Monta feedback de teste
    let empresa_nome: String = db
        .query_row(
            "SELECT valor FROM configuracoes WHERE chave = 'empresa_identidade'",
            [],
            |r| r.get::<_, String>(0),
        )
        .ok()
        .and_then(|json| {
            serde_json::from_str::<serde_json::Value>(&json)
                .ok()?
                .get("nome")?
                .as_str()
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "CredHub".to_string());

    let fb_teste = notificador::FeedbackEnvio {
        tipo: "nota".to_string(),
        titulo: "Teste de conexão".to_string(),
        descricao: "Esta é uma mensagem de teste do sistema de feedback. Se você recebeu, o canal está funcionando corretamente!".to_string(),
        prioridade: "normal".to_string(),
        usuario_nome: "Sistema".to_string(),
        empresa_nome,
        versao_app: "1.0.0".to_string(),
        criado_em: chrono::Local::now().format("%d/%m/%Y %H:%M").to_string(),
    };

    let resultado = match canal.as_str() {
        "email" => {
            let cfg: notificador::EmailConfig =
                serde_json::from_str(&config_json).map_err(|e| format!("Config inválida: {}", e))?;
            notificador::enviar_email(&cfg, &fb_teste)
        }
        "telegram" => {
            let cfg: notificador::TelegramConfig =
                serde_json::from_str(&config_json).map_err(|e| format!("Config inválida: {}", e))?;
            notificador::enviar_telegram(&cfg, &fb_teste)
        }
        "discord" => {
            let cfg: notificador::DiscordConfig =
                serde_json::from_str(&config_json).map_err(|e| format!("Config inválida: {}", e))?;
            notificador::enviar_discord(&cfg, &fb_teste)
        }
        "whatsapp" => {
            let cfg: notificador::WhatsappConfig =
                serde_json::from_str(&config_json).map_err(|e| format!("Config inválida: {}", e))?;
            notificador::enviar_whatsapp(&cfg, &fb_teste)
        }
        _ => Err(format!("Canal desconhecido: {}", canal)),
    };

    match resultado {
        Ok(()) => {
            // Atualiza testado_em
            let _ = db.execute(
                "UPDATE feedback_config SET testado_em = datetime('now') WHERE canal = ?1",
                rusqlite::params![canal],
            );
            Ok("Mensagem de teste enviada com sucesso!".to_string())
        }
        Err(e) => Err(e),
    }
}
