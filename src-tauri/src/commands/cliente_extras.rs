use tauri::State;
use crate::AppState;
use serde::{Deserialize, Serialize};

// ============================================
// INTERAÇÕES DE CLIENTE
// ============================================

#[derive(Debug, Serialize)]
pub struct ClienteInteracao {
    pub id: i64,
    pub tipo: String,
    pub direcao: Option<String>,
    pub resumo: String,
    pub resultado: Option<String>,
    pub agendado_para: Option<String>,
    pub usuario_nome: Option<String>,
    pub criado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct ClienteInteracaoInput {
    pub cliente_id: i64,
    pub usuario_id: Option<i64>,
    pub tipo: String,
    pub direcao: Option<String>,
    pub resumo: String,
    pub resultado: Option<String>,
    pub agendado_para: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_interacoes_cliente(state: State<'_, AppState>, cliente_id: i64) -> Result<Vec<ClienteInteracao>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("
        SELECT ci.id, ci.tipo, ci.direcao, ci.resumo, ci.resultado, ci.agendado_para, u.nome, ci.criado_em
        FROM cliente_interacoes ci
        LEFT JOIN usuarios u ON ci.usuario_id = u.id
        WHERE ci.cliente_id = ?1 ORDER BY ci.criado_em DESC
    ").map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![cliente_id], |row| {
        Ok(ClienteInteracao {
            id: row.get(0)?, tipo: row.get(1)?, direcao: row.get(2)?,
            resumo: row.get(3)?, resultado: row.get(4)?, agendado_para: row.get(5)?,
            usuario_nome: row.get(6)?, criado_em: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_interacao_cliente(state: State<'_, AppState>, input: ClienteInteracaoInput) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO cliente_interacoes (cliente_id, usuario_id, tipo, direcao, resumo, resultado, agendado_para)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        rusqlite::params![input.cliente_id, input.usuario_id, input.tipo, input.direcao, input.resumo, input.resultado, input.agendado_para],
    ).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, input.usuario_id, "criar", "interacao_cliente", Some(novo_id), &format!("Interação '{}' no cliente #{}", input.tipo, input.cliente_id));
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn excluir_interacao_cliente(state: State<'_, AppState>, id: i64, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM cliente_interacoes WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "excluir", "interacao_cliente", Some(id), "Interação de cliente excluída");
    Ok(())
}

// ============================================
// DOCUMENTOS DE CLIENTE (base64 no banco)
// ============================================

#[derive(Debug, Serialize)]
pub struct ClienteDocumento {
    pub id: i64,
    pub tipo: String,
    pub nome_arquivo: String,
    pub tamanho: Option<i64>,
    pub criado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct ClienteDocumentoInput {
    pub cliente_id: i64,
    pub tipo: String,
    pub nome_arquivo: String,
    pub conteudo: String,  // base64 data URL
    pub tamanho: Option<i64>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn listar_documentos_cliente(state: State<'_, AppState>, cliente_id: i64) -> Result<Vec<ClienteDocumento>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("
        SELECT id, tipo, nome_arquivo, tamanho, criado_em
        FROM cliente_documentos WHERE cliente_id = ?1 ORDER BY criado_em DESC
    ").map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![cliente_id], |row| {
        Ok(ClienteDocumento {
            id: row.get(0)?, tipo: row.get(1)?, nome_arquivo: row.get(2)?,
            tamanho: row.get(3)?, criado_em: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn adicionar_documento_cliente(state: State<'_, AppState>, input: ClienteDocumentoInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // caminho fica vazio pois guardamos o conteúdo em base64
    db.execute(
        "INSERT INTO cliente_documentos (cliente_id, tipo, nome_arquivo, caminho, conteudo, tamanho)
         VALUES (?1,?2,?3,'',?4,?5)",
        rusqlite::params![input.cliente_id, input.tipo, input.nome_arquivo, input.conteudo, input.tamanho],
    ).map_err(|e| e.to_string())?;
    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "upload", "documento_cliente", Some(novo_id), &format!("Documento '{}' ({}) anexado ao cliente #{}", input.nome_arquivo, input.tipo, input.cliente_id));
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn obter_documento_cliente(state: State<'_, AppState>, id: i64) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conteudo: String = db.query_row(
        "SELECT conteudo FROM cliente_documentos WHERE id = ?1",
        rusqlite::params![id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(conteudo)
}

#[tauri::command(rename_all = "snake_case")]
pub fn excluir_documento_cliente(state: State<'_, AppState>, id: i64, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM cliente_documentos WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "excluir", "documento_cliente", Some(id), "Documento de cliente excluído");
    Ok(())
}

// ============================================
// ALERTAS INTELIGENTES (dashboard)
// ============================================

#[derive(Debug, Serialize)]
pub struct Alerta {
    pub tipo: String,        // 'proposta_parada', 'lead_sem_contato', 'comissao_atrasada', 'retorno_agendado'
    pub severidade: String,  // 'alta', 'media', 'baixa'
    pub titulo: String,
    pub descricao: String,
    pub quantidade: i64,
}

#[tauri::command(rename_all = "snake_case")]
pub fn obter_alertas(state: State<'_, AppState>) -> Result<Vec<Alerta>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut alertas = Vec::new();

    let conta = |sql: &str| -> i64 {
        db.query_row(sql, [], |r| r.get(0)).unwrap_or(0)
    };

    // 1. Propostas paradas há mais de 7 dias em status de andamento
    let propostas_paradas = conta("
        SELECT COUNT(*) FROM propostas
        WHERE status IN ('digitado','pendente','em_analise','aguardando_anuencia')
        AND julianday('now') - julianday(data_digitacao) > 7
    ");
    if propostas_paradas > 0 {
        alertas.push(Alerta {
            tipo: "proposta_parada".to_string(),
            severidade: "alta".to_string(),
            titulo: "Propostas paradas".to_string(),
            descricao: format!("{} proposta(s) sem movimentação há mais de 7 dias", propostas_paradas),
            quantidade: propostas_paradas,
        });
    }

    // 2. Leads novos sem nenhum contato há mais de 3 dias
    let leads_parados = conta("
        SELECT COUNT(*) FROM leads
        WHERE status = 'novo'
        AND julianday('now') - julianday(criado_em) > 3
    ");
    if leads_parados > 0 {
        alertas.push(Alerta {
            tipo: "lead_sem_contato".to_string(),
            severidade: "media".to_string(),
            titulo: "Leads aguardando contato".to_string(),
            descricao: format!("{} lead(s) novo(s) sem contato há mais de 3 dias", leads_parados),
            quantidade: leads_parados,
        });
    }

    // 3. Comissões a receber há mais de 30 dias
    let comissoes_atrasadas = conta("
        SELECT COUNT(*) FROM comissoes
        WHERE status_empresa = 'a_receber'
        AND julianday('now') - julianday(criado_em) > 30
    ");
    if comissoes_atrasadas > 0 {
        alertas.push(Alerta {
            tipo: "comissao_atrasada".to_string(),
            severidade: "media".to_string(),
            titulo: "Comissões a receber".to_string(),
            descricao: format!("{} comissão(ões) pendente(s) há mais de 30 dias", comissoes_atrasadas),
            quantidade: comissoes_atrasadas,
        });
    }

    // 4. Retornos agendados para hoje ou atrasados (leads)
    let retornos = conta("
        SELECT COUNT(*) FROM leads
        WHERE proximo_contato IS NOT NULL
        AND date(proximo_contato) <= date('now')
        AND status NOT IN ('convertido','descartado','sem_interesse')
    ");
    if retornos > 0 {
        alertas.push(Alerta {
            tipo: "retorno_agendado".to_string(),
            severidade: "alta".to_string(),
            titulo: "Retornos para hoje".to_string(),
            descricao: format!("{} lead(s) com retorno agendado para hoje ou atrasado", retornos),
            quantidade: retornos,
        });
    }

    Ok(alertas)
}
