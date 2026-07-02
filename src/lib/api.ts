import { invoke } from '@tauri-apps/api/core';

// ============================================
// SESSÃO — usuário logado (para audit log)
// ============================================
// Registrado uma vez no login; injetado automaticamente
// nos commands de escrita como usuario_id.
let usuarioSessaoId: number | null = null;

export function setUsuarioSessao(id: number | null) {
  usuarioSessaoId = id;
}

function uid(): number | null {
  return usuarioSessaoId;
}

// Wrapper genérico que abstrai invoke do Tauri
// No futuro, quando implementar modo cliente (fetch HTTP), troca aqui
export async function api<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const msg = typeof error === 'string' ? error : (error as Error).message || 'Erro desconhecido';
    throw new Error(msg);
  }
}

// Auth
export const checkSetup = () => api<boolean>('check_setup');
export const setupAdmin = (input: { nome: string; login: string; senha: string; empresa_nome?: string }) =>
  api('setup_admin', { input });
export const login = (input: { login: string; senha: string }) =>
  api('login', { input });

// Gerenciamento de usuários (admin)
export const listarUsuarios = () => api('listar_usuarios');
export const criarUsuario = (input: unknown) => api<number>('criar_usuario', { input, usuario_id: uid() });
export const atualizarUsuario = (input: unknown) => api('atualizar_usuario', { input, usuario_id: uid() });
export const resetarSenhaUsuario = (usuarioId: number, novaSenha: string, adminId: number) =>
  api('resetar_senha_usuario', { usuario_id: usuarioId, nova_senha: novaSenha, admin_id: adminId });
export const alterarPropriaSenha = (usuarioId: number, senhaAtual: string, novaSenha: string) =>
  api('alterar_propria_senha', { usuario_id: usuarioId, senha_atual: senhaAtual, nova_senha: novaSenha });
export const recuperarSenhaAdmin = (login: string, recoveryCode: string, novaSenha: string) =>
  api('recuperar_senha_admin', { login, recovery_code: recoveryCode, nova_senha: novaSenha });
export const gerarNovoRecoveryCode = (usuarioId: number) =>
  api<string>('gerar_novo_recovery_code', { usuario_id: usuarioId });

// Clientes
export const listarClientes = (limite?: number, offset?: number) =>
  api('listar_clientes', { limite, offset });
export const buscarClientes = (termo: string) =>
  api('buscar_clientes', { termo });
export const obterCliente = (id: number) =>
  api('obter_cliente', { id });
export const criarCliente = (input: unknown) =>
  api<number>('criar_cliente', { input, usuario_id: uid() });
export const atualizarCliente = (id: number, input: unknown) =>
  api('atualizar_cliente', { id, input, usuario_id: uid() });
export const excluirCliente = (id: number, forcarDesativar: boolean) =>
  api<string>('excluir_cliente', { id, forcar_desativar: forcarDesativar, usuario_id: uid() });
export const verificarVinculosCliente = (id: number) =>
  api('verificar_vinculos_cliente', { id });

// Propostas
export const listarPropostas = (statusFiltro?: string, limite?: number) =>
  api('listar_propostas', { status_filtro: statusFiltro, limite });
export const obterProposta = (id: number) =>
  api('obter_proposta', { id });
export const criarProposta = (input: unknown) =>
  api<number>('criar_proposta', { input, usuario_id: uid() });
export const atualizarStatusProposta = (update: unknown) =>
  api('atualizar_status_proposta', { update, usuario_id: uid() });
export const obterHistoricoProposta = (propostaId: number) =>
  api('obter_historico_proposta', { proposta_id: propostaId });

// Bancos
export const listarBancos = () => api('listar_bancos');
export const criarBanco = (input: unknown) => api<number>('criar_banco', { input, usuario_id: uid() });
export const atualizarBanco = (id: number, input: unknown) => api('atualizar_banco', { id, input, usuario_id: uid() });

// Convenios
export const listarConvenios = () => api('listar_convenios');
export const criarConvenio = (input: unknown) => api<number>('criar_convenio', { input, usuario_id: uid() });
export const atualizarConvenio = (id: number, input: unknown) => api('atualizar_convenio', { id, input, usuario_id: uid() });

// Agentes
export const listarAgentes = () => api('listar_agentes');
export const criarAgente = (input: unknown) => api<number>('criar_agente', { input, usuario_id: uid() });
export const atualizarAgente = (id: number, input: unknown) => api('atualizar_agente', { id, input, usuario_id: uid() });
export const verificarVinculosAgente = (id: number) => api('verificar_vinculos_agente', { id });
export const excluirAgente = (id: number, forcarDesativar: boolean) => api<string>('excluir_agente', { id, forcar_desativar: forcarDesativar, usuario_id: uid() });

// Dashboard
export const obterStatsDashboard = () => api('obter_stats_dashboard');

// Comissões
export const listarComissoes = (filtroStatus?: string) =>
  api('listar_comissoes', { filtro_status: filtroStatus });
export const marcarComissaoRecebida = (comissaoId: number) =>
  api('marcar_comissao_recebida', { comissao_id: comissaoId, usuario_id: uid() });
export const marcarComissaoAgentePaga = (comissaoId: number) =>
  api('marcar_comissao_agente_paga', { comissao_id: comissaoId, usuario_id: uid() });
export const listarTabelasComissao = () => api('listar_tabelas_comissao');
export const criarTabelaComissao = (input: unknown) => api<number>('criar_tabela_comissao', { input, usuario_id: uid() });
export const excluirTabelaComissao = (id: number) => api('excluir_tabela_comissao', { id, usuario_id: uid() });

// Financeiro
export const listarLancamentos = (tipoFiltro?: string, statusFiltro?: string) =>
  api('listar_lancamentos', { tipo_filtro: tipoFiltro, status_filtro: statusFiltro });
export const criarLancamento = (input: unknown) => api<number>('criar_lancamento', { input, usuario_id: uid() });
export const marcarLancamentoPago = (id: number) => api('marcar_lancamento_pago', { id, usuario_id: uid() });
export const obterResumoFinanceiro = () => api('obter_resumo_financeiro');

// Backup
export const fazerBackup = (destino: string) => api('fazer_backup', { destino, usuario_id: uid() });
export const fazerBackupAutomatico = (manter?: number) => api('fazer_backup_automatico', { manter });
export const listarBackupsAutomaticos = () => api('listar_backups_automaticos');
export const validarBackup = (caminho: string) => api('validar_backup', { caminho });
export const restaurarBackup = (caminho: string) => api<string>('restaurar_backup', { caminho, usuario_id: uid() });

// Empresa (identidade)
export const obterIdentidadeEmpresa = () => api('obter_identidade_empresa');
export const salvarIdentidadeEmpresa = (identidade: unknown) => api('salvar_identidade_empresa', { identidade, usuario_id: uid() });

// Prospecção — Campanhas
export const listarCampanhas = () => api('listar_campanhas');
export const criarCampanha = (input: unknown) => api<number>('criar_campanha', { input, usuario_id: uid() });
export const atualizarStatusCampanha = (id: number, status: string) => api('atualizar_status_campanha', { id, status, usuario_id: uid() });

// Prospecção — Leads
export const listarLeads = (campanhaId?: number, statusFiltro?: string, agenteId?: number) =>
  api('listar_leads', { campanha_id: campanhaId, status_filtro: statusFiltro, agente_id: agenteId });
export const criarLead = (input: unknown) => api<number>('criar_lead', { input, usuario_id: uid() });
export const importarLeads = (campanhaId: number | undefined, linhas: unknown[]) =>
  api('importar_leads', { campanha_id: campanhaId, linhas, usuario_id: uid() });
export const atualizarStatusLead = (update: unknown) => api('atualizar_status_lead', { update, usuario_id: uid() });
export const distribuirLeads = (leadIds: number[], agenteId: number) =>
  api('distribuir_leads', { lead_ids: leadIds, agente_id: agenteId, usuario_id: uid() });
export const listarInteracoesLead = (leadId: number) => api('listar_interacoes_lead', { lead_id: leadId });
export const criarInteracaoLead = (input: unknown) => api<number>('criar_interacao_lead', { input, usuario_id: uid() });
export const converterLeadEmCliente = (leadId: number) => api<number>('converter_lead_em_cliente', { lead_id: leadId, usuario_id: uid() });
export const excluirLead = (id: number) => api('excluir_lead', { id, usuario_id: uid() });

// Relatórios
export const relatorioProducao = (periodo: { data_inicio?: string; data_fim?: string }) =>
  api('relatorio_producao', { periodo });
export const relatorioFinanceiro = (periodo: { data_inicio?: string; data_fim?: string }) =>
  api('relatorio_financeiro', { periodo });
export const relatorioComercial = (periodo: { data_inicio?: string; data_fim?: string }) =>
  api('relatorio_comercial', { periodo });

// Cliente — Interações
export const listarInteracoesCliente = (clienteId: number) => api('listar_interacoes_cliente', { cliente_id: clienteId });
export const criarInteracaoCliente = (input: unknown) => api<number>('criar_interacao_cliente', { input });
export const excluirInteracaoCliente = (id: number) => api('excluir_interacao_cliente', { id, usuario_id: uid() });

// Cliente — Documentos
export const listarDocumentosCliente = (clienteId: number) => api('listar_documentos_cliente', { cliente_id: clienteId });
export const adicionarDocumentoCliente = (input: unknown) => api<number>('adicionar_documento_cliente', { input, usuario_id: uid() });
export const obterDocumentoCliente = (id: number) => api<string>('obter_documento_cliente', { id });
export const excluirDocumentoCliente = (id: number) => api('excluir_documento_cliente', { id, usuario_id: uid() });

// Alertas
export const obterAlertas = () => api('obter_alertas');

// Feedback / Suporte
export const listarFeedbacks = (tipoFiltro?: string, limite?: number) =>
  api('listar_feedbacks', { tipo_filtro: tipoFiltro, limite });
export const criarFeedback = (input: unknown) =>
  api('criar_feedback', { input });
export const excluirFeedback = (id: number) =>
  api('excluir_feedback', { id });
export const reenviarFeedback = (id: number) =>
  api('reenviar_feedback', { id });
export const reenviarPendentes = () =>
  api<number>('reenviar_pendentes');

// Feedback — Config dos canais (admin)
export const listarFeedbackConfig = () =>
  api('listar_feedback_config');
export const salvarFeedbackConfig = (canal: string, ativo: boolean, config: string) =>
  api('salvar_feedback_config', { canal, ativo, config });
export const testarCanalFeedback = (canal: string) =>
  api<string>('testar_canal_feedback', { canal });

// Audit Log (admin/gerente)
export const listarAuditLog = (filtros: unknown) => api('listar_audit_log', { filtros });
export const contarAuditLog = (filtros: unknown) => api<number>('contar_audit_log', { filtros });
