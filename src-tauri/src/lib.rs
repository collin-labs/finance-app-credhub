mod db;
mod models;
mod commands;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("Falha ao obter diretório de dados");
            std::fs::create_dir_all(&app_dir).expect("Falha ao criar diretório de dados");

            let db_path = app_dir.join("credhub.db");
            let conn = rusqlite::Connection::open(&db_path)
                .expect("Falha ao abrir banco de dados");

            // Configurações de performance do SQLite
            conn.execute_batch("
                PRAGMA journal_mode = WAL;
                PRAGMA synchronous = NORMAL;
                PRAGMA foreign_keys = ON;
                PRAGMA busy_timeout = 5000;
            ").expect("Falha ao configurar SQLite");

            // Criar/atualizar schema
            db::schema::initialize(&conn).expect("Falha ao inicializar schema");

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth::check_setup,
            commands::auth::setup_admin,
            commands::auth::login,
            commands::auth::listar_usuarios,
            commands::auth::criar_usuario,
            commands::auth::atualizar_usuario,
            commands::auth::resetar_senha_usuario,
            commands::auth::alterar_propria_senha,
            commands::auth::recuperar_senha_admin,
            commands::auth::gerar_novo_recovery_code,
            // Clientes
            commands::clientes::listar_clientes,
            commands::clientes::buscar_clientes,
            commands::clientes::obter_cliente,
            commands::clientes::criar_cliente,
            commands::clientes::atualizar_cliente,
            commands::clientes::excluir_cliente,
            commands::clientes::verificar_vinculos_cliente,
            // Propostas
            commands::propostas::listar_propostas,
            commands::propostas::obter_proposta,
            commands::propostas::criar_proposta,
            commands::propostas::atualizar_status_proposta,
            commands::propostas::obter_historico_proposta,
            // Bancos
            commands::bancos::listar_bancos,
            commands::bancos::criar_banco,
            commands::bancos::atualizar_banco,
            // Convenios
            commands::convenios::listar_convenios,
            commands::convenios::criar_convenio,
            commands::convenios::atualizar_convenio,
            // Dashboard
            commands::dashboard::obter_stats_dashboard,
            // Agentes
            commands::agentes::listar_agentes,
            commands::agentes::criar_agente,
            commands::agentes::atualizar_agente,
            commands::agentes::verificar_vinculos_agente,
            commands::agentes::excluir_agente,
            // Comissões
            commands::comissoes::listar_comissoes,
            commands::comissoes::marcar_comissao_recebida,
            commands::comissoes::marcar_comissao_agente_paga,
            commands::comissoes::listar_tabelas_comissao,
            commands::comissoes::criar_tabela_comissao,
            commands::comissoes::excluir_tabela_comissao,
            // Financeiro
            commands::financeiro::listar_lancamentos,
            commands::financeiro::criar_lancamento,
            commands::financeiro::marcar_lancamento_pago,
            commands::financeiro::obter_resumo_financeiro,
            // Backup
            commands::backup::fazer_backup,
            commands::backup::fazer_backup_automatico,
            commands::backup::listar_backups_automaticos,
            commands::backup::validar_backup,
            commands::backup::restaurar_backup,
            // Empresa
            commands::empresa::obter_identidade_empresa,
            commands::empresa::salvar_identidade_empresa,
            // Prospecção
            commands::prospeccao::listar_campanhas,
            commands::prospeccao::criar_campanha,
            commands::prospeccao::atualizar_status_campanha,
            commands::prospeccao::listar_leads,
            commands::prospeccao::criar_lead,
            commands::prospeccao::importar_leads,
            commands::prospeccao::atualizar_status_lead,
            commands::prospeccao::distribuir_leads,
            commands::prospeccao::listar_interacoes_lead,
            commands::prospeccao::criar_interacao_lead,
            commands::prospeccao::converter_lead_em_cliente,
            commands::prospeccao::excluir_lead,
            // Relatórios
            commands::relatorios::relatorio_producao,
            commands::relatorios::relatorio_financeiro,
            commands::relatorios::relatorio_comercial,
            // Sistema (abrir arquivos/pastas)
            commands::sistema::abrir_arquivo_sistema,
            commands::sistema::abrir_pasta_sistema,
            // Cliente extras (interações, documentos, alertas)
            commands::cliente_extras::listar_interacoes_cliente,
            commands::cliente_extras::criar_interacao_cliente,
            commands::cliente_extras::excluir_interacao_cliente,
            commands::cliente_extras::listar_documentos_cliente,
            commands::cliente_extras::adicionar_documento_cliente,
            commands::cliente_extras::obter_documento_cliente,
            commands::cliente_extras::excluir_documento_cliente,
            commands::cliente_extras::obter_alertas,
            // Feedback / Suporte
            commands::feedback::listar_feedbacks,
            commands::feedback::criar_feedback,
            commands::feedback::excluir_feedback,
            commands::feedback::reenviar_feedback,
            commands::feedback::reenviar_pendentes,
            commands::feedback::listar_feedback_config,
            commands::feedback::salvar_feedback_config,
            commands::feedback::testar_canal_feedback,
            // Audit Log
            commands::audit::listar_audit_log,
            commands::audit::contar_audit_log,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar CredHub");
}
