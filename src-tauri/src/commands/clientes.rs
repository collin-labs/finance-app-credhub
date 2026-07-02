use tauri::State;
use crate::AppState;
use crate::models::{ClienteResumo, Cliente, ClienteInput};

#[tauri::command(rename_all = "snake_case")]
pub fn listar_clientes(state: State<'_, AppState>, limite: Option<i64>, offset: Option<i64>) -> Result<Vec<ClienteResumo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let lim = limite.unwrap_or(50);
    let off = offset.unwrap_or(0);

    let mut stmt = db.prepare("
        SELECT c.id, c.nome, c.cpf, c.telefone1, c.whatsapp, cv.nome, c.margem_disponivel,
               (SELECT COUNT(*) FROM propostas WHERE cliente_id = c.id), c.criado_em
        FROM clientes c
        LEFT JOIN convenios cv ON c.convenio_id = cv.id
        WHERE c.ativo = 1
        ORDER BY c.nome ASC
        LIMIT ?1 OFFSET ?2
    ").map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![lim, off], |row| {
        Ok(ClienteResumo {
            id: row.get(0)?,
            nome: row.get(1)?,
            cpf: row.get(2)?,
            telefone1: row.get(3)?,
            whatsapp: row.get(4)?,
            convenio_nome: row.get(5)?,
            margem_disponivel: row.get(6)?,
            total_propostas: row.get(7)?,
            criado_em: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn buscar_clientes(state: State<'_, AppState>, termo: String) -> Result<Vec<ClienteResumo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let busca = format!("%{}%", termo);

    let mut stmt = db.prepare("
        SELECT c.id, c.nome, c.cpf, c.telefone1, c.whatsapp, cv.nome, c.margem_disponivel,
               (SELECT COUNT(*) FROM propostas WHERE cliente_id = c.id), c.criado_em
        FROM clientes c
        LEFT JOIN convenios cv ON c.convenio_id = cv.id
        WHERE c.ativo = 1 AND (c.nome LIKE ?1 OR c.cpf LIKE ?1 OR c.telefone1 LIKE ?1 OR c.matricula LIKE ?1)
        ORDER BY c.nome ASC
        LIMIT 50
    ").map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![busca], |row| {
        Ok(ClienteResumo {
            id: row.get(0)?,
            nome: row.get(1)?,
            cpf: row.get(2)?,
            telefone1: row.get(3)?,
            whatsapp: row.get(4)?,
            convenio_nome: row.get(5)?,
            margem_disponivel: row.get(6)?,
            total_propostas: row.get(7)?,
            criado_em: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn obter_cliente(state: State<'_, AppState>, id: i64) -> Result<Cliente, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.query_row("
        SELECT c.*, cv.nome as convenio_nome
        FROM clientes c
        LEFT JOIN convenios cv ON c.convenio_id = cv.id
        WHERE c.id = ?1
    ", rusqlite::params![id], |row| {
        Ok(Cliente {
            id: row.get("id")?,
            nome: row.get("nome")?,
            cpf: row.get("cpf")?,
            rg: row.get("rg")?,
            data_nascimento: row.get("data_nascimento")?,
            telefone1: row.get("telefone1")?,
            telefone2: row.get("telefone2")?,
            whatsapp: row.get("whatsapp")?,
            email: row.get("email")?,
            cep: row.get("cep")?,
            endereco: row.get("endereco")?,
            numero: row.get("numero")?,
            complemento: row.get("complemento")?,
            bairro: row.get("bairro")?,
            cidade: row.get("cidade")?,
            estado: row.get("estado")?,
            convenio_id: row.get("convenio_id")?,
            convenio_nome: row.get("convenio_nome")?,
            matricula: row.get("matricula")?,
            orgao: row.get("orgao")?,
            tipo_beneficio: row.get("tipo_beneficio")?,
            renda_bruta: row.get("renda_bruta")?,
            renda_liquida: row.get("renda_liquida")?,
            margem_total: row.get("margem_total")?,
            margem_disponivel: row.get("margem_disponivel")?,
            margem_atualizada_em: row.get("margem_atualizada_em")?,
            origem: row.get("origem")?,
            agente_responsavel_id: row.get("agente_responsavel_id")?,
            observacoes: row.get("observacoes")?,
            ativo: row.get("ativo")?,
            criado_em: row.get("criado_em")?,
            atualizado_em: row.get("atualizado_em")?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn criar_cliente(state: State<'_, AppState>, input: ClienteInput, usuario_id: Option<i64>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.execute("
        INSERT INTO clientes (nome, cpf, rg, data_nascimento, telefone1, telefone2, whatsapp, email,
            cep, endereco, numero, complemento, bairro, cidade, estado,
            convenio_id, matricula, orgao, tipo_beneficio, renda_bruta, renda_liquida,
            margem_total, margem_disponivel, banco_recebimento, agencia_receb, conta_receb,
            tipo_conta, pix, origem, agente_responsavel_id, observacoes)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28,?29,?30,?31)
    ", rusqlite::params![
        input.nome, input.cpf, input.rg, input.data_nascimento,
        input.telefone1, input.telefone2, input.whatsapp, input.email,
        input.cep, input.endereco, input.numero, input.complemento,
        input.bairro, input.cidade, input.estado,
        input.convenio_id, input.matricula, input.orgao, input.tipo_beneficio,
        input.renda_bruta, input.renda_liquida, input.margem_total, input.margem_disponivel,
        input.banco_recebimento, input.agencia_receb, input.conta_receb,
        input.tipo_conta, input.pix, input.origem, input.agente_responsavel_id, input.observacoes,
    ]).map_err(|e| e.to_string())?;

    let novo_id = db.last_insert_rowid();
    super::audit::registrar_log(&db, usuario_id, "criar", "cliente", Some(novo_id), &format!("Cliente '{}' criado", input.nome));
    Ok(novo_id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn atualizar_cliente(state: State<'_, AppState>, id: i64, input: ClienteInput, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.execute("
        UPDATE clientes SET nome=?1, cpf=?2, rg=?3, data_nascimento=?4, telefone1=?5, telefone2=?6,
            whatsapp=?7, email=?8, cep=?9, endereco=?10, numero=?11, complemento=?12,
            bairro=?13, cidade=?14, estado=?15, convenio_id=?16, matricula=?17, orgao=?18,
            tipo_beneficio=?19, renda_bruta=?20, renda_liquida=?21, margem_total=?22,
            margem_disponivel=?23, banco_recebimento=?24, agencia_receb=?25, conta_receb=?26,
            tipo_conta=?27, pix=?28, origem=?29, agente_responsavel_id=?30, observacoes=?31,
            atualizado_em=datetime('now')
        WHERE id=?32
    ", rusqlite::params![
        input.nome, input.cpf, input.rg, input.data_nascimento,
        input.telefone1, input.telefone2, input.whatsapp, input.email,
        input.cep, input.endereco, input.numero, input.complemento,
        input.bairro, input.cidade, input.estado,
        input.convenio_id, input.matricula, input.orgao, input.tipo_beneficio,
        input.renda_bruta, input.renda_liquida, input.margem_total, input.margem_disponivel,
        input.banco_recebimento, input.agencia_receb, input.conta_receb,
        input.tipo_conta, input.pix, input.origem, input.agente_responsavel_id, input.observacoes,
        id,
    ]).map_err(|e| e.to_string())?;

    super::audit::registrar_log(&db, usuario_id, "editar", "cliente", Some(id), &format!("Cliente '{}' atualizado", input.nome));
    Ok(())
}

#[derive(serde::Serialize)]
pub struct VinculosCliente {
    pub propostas: i64,
    pub comissoes: i64,
    pub interacoes: i64,
    pub documentos: i64,
    pub leads: i64,
    pub total: i64,
    pub pode_excluir: bool,
}

#[tauri::command(rename_all = "snake_case")]
pub fn verificar_vinculos_cliente(state: State<'_, AppState>, id: i64) -> Result<VinculosCliente, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conta = |sql: &str| -> i64 {
        db.query_row(sql, rusqlite::params![id], |r| r.get(0)).unwrap_or(0)
    };
    let propostas = conta("SELECT COUNT(*) FROM propostas WHERE cliente_id = ?1");
    let comissoes = conta("SELECT COUNT(*) FROM comissoes c JOIN propostas p ON c.proposta_id = p.id WHERE p.cliente_id = ?1");
    let interacoes = conta("SELECT COUNT(*) FROM cliente_interacoes WHERE cliente_id = ?1");
    let documentos = conta("SELECT COUNT(*) FROM cliente_documentos WHERE cliente_id = ?1");
    let leads = conta("SELECT COUNT(*) FROM leads WHERE cliente_id = ?1");
    let total = propostas + comissoes + interacoes + documentos + leads;
    Ok(VinculosCliente { propostas, comissoes, interacoes, documentos, leads, total, pode_excluir: total == 0 })
}

#[tauri::command(rename_all = "snake_case")]
pub fn excluir_cliente(state: State<'_, AppState>, id: i64, forcar_desativar: bool, usuario_id: Option<i64>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conta = |sql: &str| -> i64 {
        db.query_row(sql, rusqlite::params![id], |r| r.get(0)).unwrap_or(0)
    };
    let total = conta("SELECT COUNT(*) FROM propostas WHERE cliente_id = ?1")
        + conta("SELECT COUNT(*) FROM comissoes c JOIN propostas p ON c.proposta_id = p.id WHERE p.cliente_id = ?1")
        + conta("SELECT COUNT(*) FROM leads WHERE cliente_id = ?1");

    if total == 0 && !forcar_desativar {
        // Sem vínculos relevantes → remove de vez (e limpa interações/documentos órfãos)
        db.execute("DELETE FROM cliente_interacoes WHERE cliente_id = ?1", rusqlite::params![id]).ok();
        db.execute("DELETE FROM cliente_documentos WHERE cliente_id = ?1", rusqlite::params![id]).ok();
        db.execute("DELETE FROM clientes WHERE id = ?1", rusqlite::params![id])
            .map_err(|e| e.to_string())?;
        super::audit::registrar_log(&db, usuario_id, "excluir", "cliente", Some(id), "Cliente excluído definitivamente");
        Ok("excluido".to_string())
    } else {
        db.execute("UPDATE clientes SET ativo = 0, atualizado_em = datetime('now') WHERE id = ?1", rusqlite::params![id])
            .map_err(|e| e.to_string())?;
        super::audit::registrar_log(&db, usuario_id, "desativar", "cliente", Some(id), "Cliente desativado (soft delete)");
        Ok("desativado".to_string())
    }
}
