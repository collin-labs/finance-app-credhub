use tauri::State;
use crate::AppState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct EmpresaIdentidade {
    pub nome: Option<String>,
    pub slogan: Option<String>,
    pub sobre: Option<String>,
    pub cnpj: Option<String>,
    pub telefone: Option<String>,
    pub whatsapp: Option<String>,
    pub email: Option<String>,
    pub site: Option<String>,
    pub endereco: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub cep: Option<String>,
    // Redes sociais
    pub instagram: Option<String>,
    pub facebook: Option<String>,
    pub linkedin: Option<String>,
    pub youtube: Option<String>,
    pub tiktok: Option<String>,
    // Visual (base64 data URLs)
    pub logo: Option<String>,
    pub logo_horizontal: Option<String>,
    pub favicon: Option<String>,
    pub cor_primaria: Option<String>,
    pub cor_secundaria: Option<String>,
    pub modo_exibicao: Option<String>,
}

const CHAVES: &[&str] = &[
    "nome", "slogan", "sobre", "cnpj", "telefone", "whatsapp", "email", "site",
    "endereco", "cidade", "estado", "cep",
    "instagram", "facebook", "linkedin", "youtube", "tiktok",
    "logo", "logo_horizontal", "favicon", "cor_primaria", "cor_secundaria", "modo_exibicao",
];

#[tauri::command(rename_all = "snake_case")]
pub fn obter_identidade_empresa(state: State<'_, AppState>) -> Result<EmpresaIdentidade, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut id = EmpresaIdentidade::default();

    let mut stmt = db.prepare("SELECT chave, valor FROM configuracoes WHERE chave LIKE 'empresa_%'")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    for row in rows {
        let (chave, valor) = row.map_err(|e| e.to_string())?;
        let campo = chave.strip_prefix("empresa_").unwrap_or(&chave);
        match campo {
            "nome" => id.nome = Some(valor),
            "slogan" => id.slogan = Some(valor),
            "sobre" => id.sobre = Some(valor),
            "cnpj" => id.cnpj = Some(valor),
            "telefone" => id.telefone = Some(valor),
            "whatsapp" => id.whatsapp = Some(valor),
            "email" => id.email = Some(valor),
            "site" => id.site = Some(valor),
            "endereco" => id.endereco = Some(valor),
            "cidade" => id.cidade = Some(valor),
            "estado" => id.estado = Some(valor),
            "cep" => id.cep = Some(valor),
            "instagram" => id.instagram = Some(valor),
            "facebook" => id.facebook = Some(valor),
            "linkedin" => id.linkedin = Some(valor),
            "youtube" => id.youtube = Some(valor),
            "tiktok" => id.tiktok = Some(valor),
            "logo" => id.logo = Some(valor),
            "logo_horizontal" => id.logo_horizontal = Some(valor),
            "favicon" => id.favicon = Some(valor),
            "cor_primaria" => id.cor_primaria = Some(valor),
            "cor_secundaria" => id.cor_secundaria = Some(valor),
            "modo_exibicao" => id.modo_exibicao = Some(valor),
            _ => {}
        }
    }

    Ok(id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn salvar_identidade_empresa(state: State<'_, AppState>, identidade: EmpresaIdentidade, usuario_id: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    super::audit::registrar_log(&db, usuario_id, "editar", "empresa", None, "Identidade da empresa atualizada");

    let valores: Vec<(&str, Option<String>)> = vec![
        ("nome", identidade.nome), ("slogan", identidade.slogan), ("sobre", identidade.sobre),
        ("cnpj", identidade.cnpj), ("telefone", identidade.telefone), ("whatsapp", identidade.whatsapp),
        ("email", identidade.email), ("site", identidade.site), ("endereco", identidade.endereco),
        ("cidade", identidade.cidade), ("estado", identidade.estado), ("cep", identidade.cep),
        ("instagram", identidade.instagram), ("facebook", identidade.facebook),
        ("linkedin", identidade.linkedin), ("youtube", identidade.youtube), ("tiktok", identidade.tiktok),
        ("logo", identidade.logo), ("logo_horizontal", identidade.logo_horizontal),
        ("favicon", identidade.favicon),
        ("cor_primaria", identidade.cor_primaria), ("cor_secundaria", identidade.cor_secundaria),
        ("modo_exibicao", identidade.modo_exibicao),
    ];

    for (campo, valor) in valores {
        let chave = format!("empresa_{}", campo);
        match valor {
            Some(v) => {
                db.execute(
                    "INSERT OR REPLACE INTO configuracoes (chave, valor, atualizado_em) VALUES (?1, ?2, datetime('now'))",
                    rusqlite::params![chave, v],
                ).map_err(|e| e.to_string())?;
            }
            None => {
                db.execute("DELETE FROM configuracoes WHERE chave = ?1", rusqlite::params![chave]).ok();
            }
        }
    }

    Ok(())
}

// Mantém referência das chaves para evitar warning
#[allow(dead_code)]
fn _chaves_ref() -> &'static [&'static str] { CHAVES }
