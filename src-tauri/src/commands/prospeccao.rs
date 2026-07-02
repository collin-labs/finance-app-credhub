use tauri::State;
use crate::AppState;
use serde::{Deserialize, Serialize};

// ============================================
// CAMPANHAS
// ============================================

#[derive(Debug, Serialize)]
pub struct Campanha {
    pub id: i64,
    pub nome: String,
    pub tipo: String,
    pub data_inicio: Option<String>,
    pub data_fim: Option<String>,
    pub total_leads: i64,
    pub leads_contactados: i64,
    pub propostas_geradas: i64,
    pub status: String,
    pub observacoes: Option<String>,
    pub criado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct CampanhaInput {
    pub nome: String,
    pub tipo: String,
    pub data_inicio: Option<String>,
    pub data_fim: Option<String>,
    pub status: Option<String>,
    pub observacoes: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_campanhas(state: State<'_, AppState>) -> Result<Vec<Campanha>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("
        SELECT c.id, c.nome, c.tipo, c.data_inicio, c.data_fim,
               (SELECT COUNT(*) FROM leads WHERE campanha_id = c.id) as total,
               (SELECT COUNT(*) FROM leads WHERE campanha_id = c.id AND status NOT IN ('novo')) as contactados,
               (SELECT COUNT(*) FROM leads WHERE campanha_id = c.id AND status = 'convertido') as convertidos,
               c.status, c.observacoes, c.criado_em
        FROM campanhas c ORDER BY c.criado_em DESC
    ").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Campanha {
            id: row.get(0)?, nome: row.get(1)?, tipo: row.get(2)?,
            data_inicio: row.get(3)?, data_fim: row.get(4)?,
            total_leads: row.get(5)?, leads_contactados: row.get(6)?,
            propostas_geradas: row.get(7)?, status: row.get(8)?,
            observacoes: row.get(9)?, criado_em: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_campanha(state: State<'_, AppState>, input: CampanhaInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let status = input.status.unwrap_or_else(|| "ativa".to_string());
    db.execute(
        "INSERT INTO campanhas (nome, tipo, data_inicio, data_fim, status, observacoes) VALUES (?1,?2,?3,?4,?5,?6)",
        rusqlite::params![input.nome, input.tipo, input.data_inicio, input.data_fim, status, input.observacoes],
    ).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "criar", "campanha", Some(novo_id), &format!("Campanha '{}' criada", input.nome));
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn atualizar_status_campanha(state: State<'_, AppState>, id: i64, status: String, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE campanhas SET status = ?1 WHERE id = ?2", rusqlite::params![status, id])
        .map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "alterar_status", "campanha", Some(id), &format!("Status alterado para '{}'", status));
    Ok(())
}

// ============================================
// LEADS
// ============================================

#[derive(Debug, Serialize)]
pub struct Lead {
    pub id: i64,
    pub nome: String,
    pub cpf: Option<String>,
    pub telefone1: Option<String>,
    pub telefone2: Option<String>,
    pub whatsapp: Option<String>,
    pub campanha_id: Option<i64>,
    pub campanha_nome: Option<String>,
    pub origem: Option<String>,
    pub convenio_nome: Option<String>,
    pub matricula: Option<String>,
    pub beneficio: Option<String>,
    pub renda_estimada: Option<f64>,
    pub margem_estimada: Option<f64>,
    pub agente_id: Option<i64>,
    pub agente_nome: Option<String>,
    pub status: String,
    pub tentativas_contato: i64,
    pub ultima_tentativa: Option<String>,
    pub proximo_contato: Option<String>,
    pub cliente_id: Option<i64>,
    pub observacoes: Option<String>,
    pub criado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct LeadInput {
    pub nome: String,
    pub cpf: Option<String>,
    pub telefone1: Option<String>,
    pub telefone2: Option<String>,
    pub whatsapp: Option<String>,
    pub campanha_id: Option<i64>,
    pub origem: Option<String>,
    pub convenio_nome: Option<String>,
    pub matricula: Option<String>,
    pub beneficio: Option<String>,
    pub renda_estimada: Option<f64>,
    pub margem_estimada: Option<f64>,
    pub agente_id: Option<i64>,
    pub observacoes: Option<String>,
}

fn map_lead(row: &rusqlite::Row) -> rusqlite::Result<Lead> {
    Ok(Lead {
        id: row.get("id")?, nome: row.get("nome")?, cpf: row.get("cpf")?,
        telefone1: row.get("telefone1")?, telefone2: row.get("telefone2")?, whatsapp: row.get("whatsapp")?,
        campanha_id: row.get("campanha_id")?, campanha_nome: row.get("campanha_nome")?,
        origem: row.get("origem")?, convenio_nome: row.get("convenio_nome")?,
        matricula: row.get("matricula")?, beneficio: row.get("beneficio")?,
        renda_estimada: row.get("renda_estimada")?, margem_estimada: row.get("margem_estimada")?,
        agente_id: row.get("agente_id")?, agente_nome: row.get("agente_nome")?,
        status: row.get("status")?, tentativas_contato: row.get("tentativas_contato")?,
        ultima_tentativa: row.get("ultima_tentativa")?, proximo_contato: row.get("proximo_contato")?,
        cliente_id: row.get("cliente_id")?, observacoes: row.get("observacoes")?,
        criado_em: row.get("criado_em")?,
    })
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_leads(state: State<'_, AppState>, campanha_id: Option<i64>, status_filtro: Option<String>, agente_id: Option<i64>) -> Result<Vec<Lead>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut cond = vec!["1=1".to_string()];
    if let Some(c) = campanha_id { cond.push(format!("l.campanha_id = {}", c)); }
    if let Some(ref s) = status_filtro { cond.push(format!("l.status = '{}'", s.replace('\'', "''"))); }
    if let Some(a) = agente_id { cond.push(format!("l.agente_id = {}", a)); }

    let sql = format!("
        SELECT l.*, c.nome as campanha_nome, ag.nome as agente_nome
        FROM leads l
        LEFT JOIN campanhas c ON l.campanha_id = c.id
        LEFT JOIN agentes ag ON l.agente_id = ag.id
        WHERE {}
        ORDER BY
            CASE l.status
                WHEN 'novo' THEN 1 WHEN 'tentando_contato' THEN 2
                WHEN 'interessado' THEN 3 WHEN 'agendado' THEN 4
                ELSE 5 END,
            l.criado_em DESC
        LIMIT 500
    ", cond.join(" AND "));

    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], map_lead).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_lead(state: State<'_, AppState>, input: LeadInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO leads (nome, cpf, telefone1, telefone2, whatsapp, campanha_id, origem, convenio_nome, matricula, beneficio, renda_estimada, margem_estimada, agente_id, observacoes)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        rusqlite::params![input.nome, input.cpf, input.telefone1, input.telefone2, input.whatsapp,
            input.campanha_id, input.origem, input.convenio_nome, input.matricula, input.beneficio,
            input.renda_estimada, input.margem_estimada, input.agente_id, input.observacoes],
    ).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "criar", "lead", Some(novo_id), &format!("Lead '{}' criado", input.nome));
    Ok(novo_id)
}

#[derive(Debug, Deserialize)]
pub struct LeadImportRow {
    pub nome: String,
    pub cpf: Option<String>,
    pub telefone1: Option<String>,
    pub whatsapp: Option<String>,
    pub convenio_nome: Option<String>,
    pub matricula: Option<String>,
    pub beneficio: Option<String>,
    pub renda_estimada: Option<f64>,
    pub margem_estimada: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub importados: i64,
    pub ignorados: i64,
}

#[tauri::command(rename_all = "snake_case")]
pub fn importar_leads(state: State<'_, AppState>, campanha_id: Option<i64>, linhas: Vec<LeadImportRow>, usuario_id: Option<i64>) -> Result<ImportResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut importados = 0;
    let mut ignorados = 0;

    for linha in linhas {
        if linha.nome.trim().is_empty() { ignorados += 1; continue; }

        // Evita duplicados por CPF dentro da mesma campanha
        if let Some(ref cpf) = linha.cpf {
            if !cpf.trim().is_empty() {
                let existe: i64 = db.query_row(
                    "SELECT COUNT(*) FROM leads WHERE cpf = ?1 AND (campanha_id = ?2 OR ?2 IS NULL)",
                    rusqlite::params![cpf, campanha_id],
                    |r| r.get(0),
                ).unwrap_or(0);
                if existe > 0 { ignorados += 1; continue; }
            }
        }

        let r = db.execute(
            "INSERT INTO leads (nome, cpf, telefone1, whatsapp, campanha_id, origem, convenio_nome, matricula, beneficio, renda_estimada, margem_estimada)
             VALUES (?1,?2,?3,?4,?5,'mailing',?6,?7,?8,?9,?10)",
            rusqlite::params![linha.nome, linha.cpf, linha.telefone1, linha.whatsapp, campanha_id,
                linha.convenio_nome, linha.matricula, linha.beneficio, linha.renda_estimada, linha.margem_estimada],
        );
        match r { Ok(_) => importados += 1, Err(_) => ignorados += 1 }
    }

    super::audit::registrar_log(&db, usuario_id, "importar", "lead", None, &format!("{} leads importados, {} ignorados", importados, ignorados));
    Ok(ImportResult { importados, ignorados })
}

#[derive(Debug, Deserialize)]
pub struct LeadStatusUpdate {
    pub lead_id: i64,
    pub novo_status: String,
    pub proximo_contato: Option<String>,
    pub observacao: Option<String>,
    pub usuario_id: Option<i64>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn atualizar_status_lead(state: State<'_, AppState>, update: LeadStatusUpdate, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Incrementa tentativas se for status de contato
    let incrementa = matches!(update.novo_status.as_str(), "tentando_contato" | "contactado");
    if incrementa {
        db.execute(
            "UPDATE leads SET status=?1, tentativas_contato=tentativas_contato+1, ultima_tentativa=datetime('now'), proximo_contato=?2, atualizado_em=datetime('now') WHERE id=?3",
            rusqlite::params![update.novo_status, update.proximo_contato, update.lead_id],
        ).map_err(|e| e.to_string())?;
    } else {
        db.execute(
            "UPDATE leads SET status=?1, proximo_contato=?2, atualizado_em=datetime('now') WHERE id=?3",
            rusqlite::params![update.novo_status, update.proximo_contato, update.lead_id],
        ).map_err(|e| e.to_string())?;
    }

    // Registra interação se houver observação
    if let Some(obs) = update.observacao {
        if !obs.trim().is_empty() {
            db.execute(
                "INSERT INTO lead_interacoes (lead_id, usuario_id, tipo, resumo, resultado) VALUES (?1,?2,'nota',?3,?4)",
                rusqlite::params![update.lead_id, update.usuario_id, obs, update.novo_status],
            ).ok();
        }
    }

    super::audit::registrar_log(&db, usuario_id.or(update.usuario_id), "alterar_status", "lead", Some(update.lead_id), &format!("Status alterado para '{}'", update.novo_status));
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn distribuir_leads(state: State<'_, AppState>, lead_ids: Vec<i64>, agente_id: i64, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut count = 0;
    for id in lead_ids {
        let r = db.execute(
            "UPDATE leads SET agente_id=?1, atualizado_em=datetime('now') WHERE id=?2",
            rusqlite::params![agente_id, id],
        );
        if r.is_ok() { count += 1; }
    }
    super::audit::registrar_log(&db, usuario_id, "distribuir", "lead", None, &format!("{} leads distribuídos para agente #{}", count, agente_id));
    Ok(count)
}

// ============================================
// INTERAÇÕES DO LEAD
// ============================================

#[derive(Debug, Serialize)]
pub struct LeadInteracao {
    pub id: i64,
    pub tipo: String,
    pub resumo: Option<String>,
    pub resultado: Option<String>,
    pub usuario_nome: Option<String>,
    pub criado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct InteracaoInput {
    pub lead_id: i64,
    pub usuario_id: Option<i64>,
    pub tipo: String,
    pub resumo: Option<String>,
    pub resultado: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_interacoes_lead(state: State<'_, AppState>, lead_id: i64) -> Result<Vec<LeadInteracao>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("
        SELECT li.id, li.tipo, li.resumo, li.resultado, u.nome, li.criado_em
        FROM lead_interacoes li
        LEFT JOIN usuarios u ON li.usuario_id = u.id
        WHERE li.lead_id = ?1 ORDER BY li.criado_em DESC
    ").map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![lead_id], |row| {
        Ok(LeadInteracao {
            id: row.get(0)?, tipo: row.get(1)?, resumo: row.get(2)?,
            resultado: row.get(3)?, usuario_nome: row.get(4)?, criado_em: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_interacao_lead(state: State<'_, AppState>, input: InteracaoInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO lead_interacoes (lead_id, usuario_id, tipo, resumo, resultado) VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![input.lead_id, input.usuario_id, input.tipo, input.resumo, input.resultado],
    ).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id.or(input.usuario_id), "criar", "interacao_lead", Some(novo_id), &format!("Interação '{}' no lead #{}", input.tipo, input.lead_id));
    Ok(novo_id)
}

// ============================================
// CONVERSÃO LEAD → CLIENTE
// ============================================

#[tauri::command(rename_all = "snake_case")]
pub fn converter_lead_em_cliente(state: State<'_, AppState>, lead_id: i64, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Busca dados do lead
    struct LeadData {
        nome: String, cpf: Option<String>, telefone1: Option<String>, telefone2: Option<String>,
        whatsapp: Option<String>, matricula: Option<String>, beneficio: Option<String>,
        renda: Option<f64>, margem: Option<f64>, origem: Option<String>, agente_id: Option<i64>,
        cliente_id: Option<i64>,
    }

    let lead = db.query_row(
        "SELECT nome, cpf, telefone1, telefone2, whatsapp, convenio_nome, matricula, beneficio, renda_estimada, margem_estimada, origem, agente_id, cliente_id FROM leads WHERE id = ?1",
        rusqlite::params![lead_id],
        |row| Ok(LeadData {
            nome: row.get(0)?, cpf: row.get(1)?, telefone1: row.get(2)?, telefone2: row.get(3)?,
            whatsapp: row.get(4)?, matricula: row.get(6)?, beneficio: row.get(7)?,
            renda: row.get(8)?, margem: row.get(9)?, origem: row.get(10)?, agente_id: row.get(11)?,
            cliente_id: row.get(12)?,
        }),
    ).map_err(|e| e.to_string())?;

    // Se já foi convertido, retorna o cliente existente
    if let Some(cliente_id) = lead.cliente_id {
        return Ok(cliente_id);
    }

    // Cria o cliente
    db.execute(
        "INSERT INTO clientes (nome, cpf, telefone1, telefone2, whatsapp, matricula, tipo_beneficio, renda_liquida, margem_disponivel, origem, agente_responsavel_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        rusqlite::params![lead.nome, lead.cpf, lead.telefone1, lead.telefone2, lead.whatsapp,
            lead.matricula, lead.beneficio, lead.renda, lead.margem, lead.origem, lead.agente_id],
    ).map_err(|e| e.to_string())?;

    let cliente_id = db.last_insert_rowid();

    // Marca o lead como convertido e vincula ao cliente
    db.execute(
        "UPDATE leads SET status='convertido', cliente_id=?1, atualizado_em=datetime('now') WHERE id=?2",
        rusqlite::params![cliente_id, lead_id],
    ).map_err(|e| e.to_string())?;

    super::audit::registrar_log(&db, usuario_id, "converter", "lead", Some(lead_id), &format!("Lead '{}' convertido em cliente #{}", lead.nome, cliente_id));
    Ok(cliente_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn excluir_lead(state: State<'_, AppState>, id: i64, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM lead_interacoes WHERE lead_id = ?1", rusqlite::params![id]).ok();
    db.execute("DELETE FROM leads WHERE id = ?1", rusqlite::params![id]).map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "excluir", "lead", Some(id), "Lead excluído");
    Ok(())
}
