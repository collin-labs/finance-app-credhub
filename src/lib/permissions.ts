import { Page } from './types';

// ============================================
// DEFINIÇÃO DE MÓDULOS E PERMISSÕES
// ============================================

export interface ModuloPermissao {
  id: Page;
  label: string;
  descricao: string;
  sensivel: boolean; // módulos sensíveis (financeiro, comissões) vêm desligados por padrão pra agente
}

export const MODULOS: ModuloPermissao[] = [
  { id: 'dashboard',     label: 'Dashboard',     descricao: 'Visão geral da operação', sensivel: false },
  { id: 'clientes',      label: 'Clientes',      descricao: 'Cadastro e gestão de clientes', sensivel: false },
  { id: 'propostas',     label: 'Propostas',     descricao: 'Esteira de propostas', sensivel: false },
  { id: 'simulador',     label: 'Simulador',     descricao: 'Simulação de crédito', sensivel: false },
  { id: 'financeiro',    label: 'Financeiro',    descricao: 'Comissões, receitas e despesas', sensivel: true },
  { id: 'agentes',       label: 'Agentes',       descricao: 'Gestão de agentes e corretores', sensivel: true },
  { id: 'prospeccao',    label: 'Prospecção',    descricao: 'Campanhas e leads', sensivel: false },
  { id: 'convenios',     label: 'Convênios',     descricao: 'Convênios e regras', sensivel: false },
  { id: 'relatorios',    label: 'Relatórios',    descricao: 'Relatórios gerenciais', sensivel: true },
  { id: 'configuracoes', label: 'Configurações', descricao: 'Bancos, produtos, comissões, usuários', sensivel: true },
  { id: 'manual',        label: 'Manual',        descricao: 'Manual e guia do sistema', sensivel: false },
  { id: 'feedback',      label: 'Feedback',      descricao: 'Enviar sugestões e reportar problemas', sensivel: false },
  { id: 'logs',          label: 'Logs',          descricao: 'Auditoria de ações do sistema', sensivel: true },
];

// Permissões-padrão por perfil
export const PERMISSOES_PADRAO: Record<string, Page[]> = {
  admin: MODULOS.map(m => m.id), // admin vê tudo sempre
  gerente: ['dashboard', 'clientes', 'propostas', 'simulador', 'financeiro', 'agentes', 'prospeccao', 'convenios', 'relatorios', 'manual', 'feedback', 'logs'],
  agente: ['dashboard', 'clientes', 'propostas', 'simulador', 'prospeccao', 'manual', 'feedback'], // sem financeiro, comissões, configurações
};

// Retorna a lista de páginas que o usuário pode acessar
export function getPermissoes(perfil: string, permissoesJson?: string | null): Page[] {
  // Admin sempre vê tudo
  if (perfil === 'admin') return MODULOS.map(m => m.id);

  // Se tem permissões customizadas salvas, usa elas
  if (permissoesJson) {
    try {
      const custom = JSON.parse(permissoesJson) as Page[];
      if (Array.isArray(custom) && custom.length > 0) return custom;
    } catch { /* fallback pro padrão */ }
  }

  // Senão, usa o padrão do perfil
  return PERMISSOES_PADRAO[perfil] || PERMISSOES_PADRAO.agente;
}

export function temPermissao(perfil: string, permissoesJson: string | null | undefined, page: Page): boolean {
  if (perfil === 'admin') return true;
  return getPermissoes(perfil, permissoesJson).includes(page);
}
