use rusqlite::Connection;
use serde::{Deserialize, Serialize};

// ============================================
// STRUCTS DE CONFIGURAÇÃO POR CANAL
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmailConfig {
    pub smtp_host: String,
    pub smtp_port: Option<u16>,
    pub smtp_user: String,
    pub smtp_pass: String,
    pub destinatario: String,
    pub remetente: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TelegramConfig {
    pub bot_token: String,
    pub chat_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscordConfig {
    pub webhook_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WhatsappConfig {
    pub telefone: String,
    pub apikey: String,
}

// ============================================
// DADOS DO FEEDBACK PARA ENVIO
// ============================================

#[derive(Debug, Clone)]
pub struct FeedbackEnvio {
    pub tipo: String,
    pub titulo: String,
    pub descricao: String,
    pub prioridade: String,
    pub usuario_nome: String,
    pub empresa_nome: String,
    pub versao_app: String,
    pub criado_em: String,
}

// ============================================
// FORMATAÇÃO DE MENSAGENS
// ============================================

fn emoji_tipo(tipo: &str) -> &str {
    match tipo {
        "bug" => "🐛",
        "sugestao" => "💡",
        "melhoria" => "🚀",
        "nota" => "📝",
        _ => "📋",
    }
}

fn label_tipo(tipo: &str) -> &str {
    match tipo {
        "bug" => "Bug",
        "sugestao" => "Sugestão",
        "melhoria" => "Melhoria",
        "nota" => "Nota",
        _ => "Feedback",
    }
}

fn label_prioridade(p: &str) -> &str {
    match p {
        "baixa" => "Baixa",
        "normal" => "Normal",
        "alta" => "⚠️ Alta",
        "urgente" => "🔴 Urgente",
        _ => "Normal",
    }
}

fn formatar_texto(fb: &FeedbackEnvio) -> String {
    let emoji = emoji_tipo(&fb.tipo);
    let label = label_tipo(&fb.tipo);
    let prio = label_prioridade(&fb.prioridade);
    let desc = if fb.descricao.is_empty() {
        String::from("(sem descrição)")
    } else if fb.descricao.len() > 500 {
        format!("{}...", &fb.descricao[..497])
    } else {
        fb.descricao.clone()
    };

    format!(
        "{} *{}* — {}\n\n*{}*\n{}\n\nPrioridade: {}\nUsuário: {}\nData: {}\nVersão: {}",
        emoji, label, fb.empresa_nome,
        fb.titulo, desc,
        prio, fb.usuario_nome, fb.criado_em, fb.versao_app
    )
}

fn formatar_html(fb: &FeedbackEnvio) -> String {
    let emoji = emoji_tipo(&fb.tipo);
    let label = label_tipo(&fb.tipo);
    let prio = label_prioridade(&fb.prioridade);
    let desc_html = if fb.descricao.is_empty() {
        String::from("<em>(sem descrição)</em>")
    } else {
        fb.descricao.replace('\n', "<br>")
    };

    let cor = match fb.tipo.as_str() {
        "bug" => "#dc2626",
        "sugestao" => "#2563eb",
        "melhoria" => "#16a34a",
        _ => "#6b7280",
    };

    format!(
        r#"<div style="font-family:Arial,sans-serif;max-width:600px">
  <div style="border-left:4px solid {cor};padding:16px;background:#f9fafb;border-radius:8px">
    <h2 style="margin:0 0 4px">{emoji} {label}</h2>
    <p style="margin:0;color:#6b7280;font-size:14px">{empresa}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0">
    <h3 style="margin:0 0 8px">{titulo}</h3>
    <p style="margin:0;color:#374151">{desc}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0">
    <table style="font-size:13px;color:#6b7280">
      <tr><td style="padding-right:12px">Prioridade:</td><td><strong>{prio}</strong></td></tr>
      <tr><td style="padding-right:12px">Usuário:</td><td>{usuario}</td></tr>
      <tr><td style="padding-right:12px">Data:</td><td>{data}</td></tr>
      <tr><td style="padding-right:12px">Versão:</td><td>{versao}</td></tr>
    </table>
  </div>
</div>"#,
        cor = cor,
        emoji = emoji,
        label = label,
        empresa = fb.empresa_nome,
        titulo = fb.titulo,
        desc = desc_html,
        prio = prio,
        usuario = fb.usuario_nome,
        data = fb.criado_em,
        versao = fb.versao_app,
    )
}

// ============================================
// ENVIO — E-MAIL (lettre SMTP)
// ============================================

pub fn enviar_email(config: &EmailConfig, fb: &FeedbackEnvio) -> Result<(), String> {
    use lettre::message::{header::ContentType, Mailbox};
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::{Message, SmtpTransport, Transport};

    let emoji = emoji_tipo(&fb.tipo);
    let label = label_tipo(&fb.tipo);
    let assunto = format!("[{} {}] {} — {}", emoji, label, fb.titulo, fb.empresa_nome);

    let remetente_str = config.remetente.as_deref().unwrap_or(&config.smtp_user);
    let from: Mailbox = remetente_str
        .parse()
        .map_err(|e| format!("E-mail remetente inválido: {}", e))?;
    let to: Mailbox = config
        .destinatario
        .parse()
        .map_err(|e| format!("E-mail destinatário inválido: {}", e))?;

    let email = Message::builder()
        .from(from)
        .to(to)
        .subject(assunto)
        .header(ContentType::TEXT_HTML)
        .body(formatar_html(fb))
        .map_err(|e| format!("Erro ao montar e-mail: {}", e))?;

    let creds = Credentials::new(config.smtp_user.clone(), config.smtp_pass.clone());
    let porta = config.smtp_port.unwrap_or(587);

    let mailer = if porta == 465 {
        SmtpTransport::relay(&config.smtp_host)
            .map_err(|e| format!("Erro SMTP relay: {}", e))?
            .credentials(creds)
            .build()
    } else {
        SmtpTransport::starttls_relay(&config.smtp_host)
            .map_err(|e| format!("Erro SMTP STARTTLS: {}", e))?
            .credentials(creds)
            .port(porta)
            .build()
    };

    mailer
        .send(&email)
        .map_err(|e| format!("Falha ao enviar e-mail: {}", e))?;

    Ok(())
}

// ============================================
// ENVIO — TELEGRAM (Bot API POST)
// ============================================

pub fn enviar_telegram(config: &TelegramConfig, fb: &FeedbackEnvio) -> Result<(), String> {
    let url = format!(
        "https://api.telegram.org/bot{}/sendMessage",
        config.bot_token
    );
    let texto = formatar_texto(fb);

    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(&url)
        .json(&serde_json::json!({
            "chat_id": config.chat_id,
            "text": texto,
            "parse_mode": "Markdown"
        }))
        .send()
        .map_err(|e| format!("Falha Telegram: {}", e))?;

    if !resp.status().is_success() {
        let body = resp.text().unwrap_or_default();
        return Err(format!("Telegram retornou erro: {}", body));
    }
    Ok(())
}

// ============================================
// ENVIO — DISCORD (Webhook POST com embed)
// ============================================

pub fn enviar_discord(config: &DiscordConfig, fb: &FeedbackEnvio) -> Result<(), String> {
    let cor_decimal: u64 = match fb.tipo.as_str() {
        "bug" => 0xdc2626,
        "sugestao" => 0x2563eb,
        "melhoria" => 0x16a34a,
        _ => 0x6b7280,
    };

    let emoji = emoji_tipo(&fb.tipo);
    let label = label_tipo(&fb.tipo);
    let prio = label_prioridade(&fb.prioridade);

    let desc = if fb.descricao.is_empty() {
        "(sem descrição)".to_string()
    } else if fb.descricao.len() > 1000 {
        format!("{}...", &fb.descricao[..997])
    } else {
        fb.descricao.clone()
    };

    let payload = serde_json::json!({
        "embeds": [{
            "title": format!("{} {} — {}", emoji, label, fb.titulo),
            "description": desc,
            "color": cor_decimal,
            "fields": [
                { "name": "Empresa", "value": &fb.empresa_nome, "inline": true },
                { "name": "Prioridade", "value": prio, "inline": true },
                { "name": "Versão", "value": &fb.versao_app, "inline": true },
                { "name": "Usuário", "value": &fb.usuario_nome, "inline": true },
                { "name": "Data", "value": &fb.criado_em, "inline": true }
            ]
        }]
    });

    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(&config.webhook_url)
        .json(&payload)
        .send()
        .map_err(|e| format!("Falha Discord: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("Discord retornou {}: {}", status, body));
    }
    Ok(())
}

// ============================================
// ENVIO — WHATSAPP (CallMeBot GET)
// ============================================

pub fn enviar_whatsapp(config: &WhatsappConfig, fb: &FeedbackEnvio) -> Result<(), String> {
    let texto = formatar_texto(fb);
    let encoded = urlencoding::encode(&texto);
    let telefone = urlencoding::encode(&config.telefone);

    let url = format!(
        "https://api.callmebot.com/whatsapp.php?phone={}&text={}&apikey={}",
        telefone, encoded, config.apikey
    );

    let client = reqwest::blocking::Client::new();
    let resp = client
        .get(&url)
        .send()
        .map_err(|e| format!("Falha WhatsApp/CallMeBot: {}", e))?;

    if !resp.status().is_success() {
        let body = resp.text().unwrap_or_default();
        return Err(format!("CallMeBot retornou erro: {}", body));
    }
    Ok(())
}

// ============================================
// DESPACHO CENTRAL — tenta todos os canais ativos
// ============================================

pub struct DespachoResultado {
    pub canais_ok: Vec<String>,
    pub canais_erro: Vec<(String, String)>,
}

pub fn despachar_feedback(conn: &Connection, fb: &FeedbackEnvio) -> DespachoResultado {
    let mut resultado = DespachoResultado {
        canais_ok: Vec::new(),
        canais_erro: Vec::new(),
    };

    // Lê canais ativos
    let mut stmt = match conn.prepare(
        "SELECT canal, config FROM feedback_config WHERE ativo = 1",
    ) {
        Ok(s) => s,
        Err(_) => return resultado,
    };

    let canais: Vec<(String, String)> = match stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?))) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(_) => return resultado,
    };

    for (canal, config_json) in canais {
        let res = match canal.as_str() {
            "email" => {
                match serde_json::from_str::<EmailConfig>(&config_json) {
                    Ok(cfg) => enviar_email(&cfg, fb),
                    Err(e) => Err(format!("Config e-mail inválida: {}", e)),
                }
            }
            "telegram" => {
                match serde_json::from_str::<TelegramConfig>(&config_json) {
                    Ok(cfg) => enviar_telegram(&cfg, fb),
                    Err(e) => Err(format!("Config Telegram inválida: {}", e)),
                }
            }
            "discord" => {
                match serde_json::from_str::<DiscordConfig>(&config_json) {
                    Ok(cfg) => enviar_discord(&cfg, fb),
                    Err(e) => Err(format!("Config Discord inválida: {}", e)),
                }
            }
            "whatsapp" => {
                match serde_json::from_str::<WhatsappConfig>(&config_json) {
                    Ok(cfg) => enviar_whatsapp(&cfg, fb),
                    Err(e) => Err(format!("Config WhatsApp inválida: {}", e)),
                }
            }
            _ => Err(format!("Canal desconhecido: {}", canal)),
        };

        match res {
            Ok(()) => resultado.canais_ok.push(canal),
            Err(msg) => resultado.canais_erro.push((canal, msg)),
        }
    }

    resultado
}

// Monta FeedbackEnvio a partir de dados do banco
pub fn montar_feedback_envio(
    conn: &Connection,
    feedback_id: i64,
) -> Result<FeedbackEnvio, String> {
    let (tipo, titulo, descricao, prioridade, usuario_id, versao_app, criado_em): (
        String, String, Option<String>, String, Option<i64>, Option<String>, String,
    ) = conn
        .query_row(
            "SELECT tipo, titulo, descricao, prioridade, usuario_id, versao_app, criado_em
             FROM feedbacks WHERE id = ?1",
            rusqlite::params![feedback_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ))
            },
        )
        .map_err(|e| format!("Feedback não encontrado: {}", e))?;

    // Nome do usuário
    let usuario_nome = if let Some(uid) = usuario_id {
        conn.query_row(
            "SELECT nome FROM usuarios WHERE id = ?1",
            rusqlite::params![uid],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "Desconhecido".to_string())
    } else {
        "Sistema".to_string()
    };

    // Nome da empresa (da tabela configuracoes)
    let empresa_nome: String = conn
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

    Ok(FeedbackEnvio {
        tipo,
        titulo,
        descricao: descricao.unwrap_or_default(),
        prioridade,
        usuario_nome,
        empresa_nome,
        versao_app: versao_app.unwrap_or_else(|| "1.0.0".to_string()),
        criado_em,
    })
}

// Atualiza status do feedback no banco após despacho
pub fn atualizar_status_envio(
    conn: &Connection,
    feedback_id: i64,
    resultado: &DespachoResultado,
) {
    let status = if resultado.canais_erro.is_empty() && !resultado.canais_ok.is_empty() {
        "enviado"
    } else if resultado.canais_ok.is_empty() {
        "erro"
    } else {
        "parcial"
    };

    let canais_ok_str = resultado.canais_ok.join(",");
    let erros: Vec<String> = resultado
        .canais_erro
        .iter()
        .map(|(c, e)| format!("{}: {}", c, e))
        .collect();
    let erro_str = if erros.is_empty() {
        None
    } else {
        Some(erros.join("; "))
    };

    let _ = conn.execute(
        "UPDATE feedbacks SET status_envio = ?1, canais_enviados = ?2, erro_envio = ?3, enviado_em = datetime('now') WHERE id = ?4",
        rusqlite::params![status, canais_ok_str, erro_str, feedback_id],
    );
}
