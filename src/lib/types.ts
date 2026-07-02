// ============================================
// SISTEMA
// ============================================

export interface Usuario {
  id: number;
  nome: string;
  login: string;
  perfil: 'admin' | 'gerente' | 'agente';
  permissoes?: string | null;
  ver_todos_dados: boolean;
  agente_id?: number | null;
  senha_temporaria: boolean;
  ativo: boolean;
  criado_em: string;
}

export interface LoginInput {
  login: string;
  senha: string;
}

export interface SetupInput {
  nome: string;
  login: string;
  senha: string;
  empresa_nome?: string;
}

// ============================================
// CADASTROS BASE
// ============================================

export interface Convenio {
  id: number;
  nome: string;
  tipo: 'inss' | 'federal' | 'estadual' | 'municipal' | 'clt' | 'militar' | 'outro';
  estado?: string;
  orgao?: string;
  margem_maxima?: number;
  prazo_maximo?: number;
  taxa_teto?: number;
  sistema_consulta?: string;
  ativo: boolean;
  notas?: string;
}

export interface ConvenioInput {
  nome: string;
  tipo: string;
  estado?: string;
  orgao?: string;
  margem_maxima?: number;
  prazo_maximo?: number;
  taxa_teto?: number;
  sistema_consulta?: string;
  notas?: string;
}

export interface Banco {
  id: number;
  nome: string;
  codigo?: string;
  contato?: string;
  notas?: string;
  ativo: boolean;
}

export interface BancoInput {
  nome: string;
  codigo?: string;
  contato?: string;
  notas?: string;
}

export interface Produto {
  id: number;
  nome: string;
  tipo: string;
  descricao?: string;
  ativo: boolean;
}

// ============================================
// CLIENTES
// ============================================

export interface Cliente {
  id: number;
  nome: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  telefone1?: string;
  telefone2?: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  convenio_id?: number;
  convenio_nome?: string;
  matricula?: string;
  orgao?: string;
  tipo_beneficio?: string;
  renda_bruta?: number;
  renda_liquida?: number;
  margem_total?: number;
  margem_disponivel?: number;
  margem_atualizada_em?: string;
  origem?: string;
  agente_responsavel_id?: number;
  observacoes?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ClienteInput {
  nome: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  telefone1?: string;
  telefone2?: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  convenio_id?: number;
  matricula?: string;
  orgao?: string;
  tipo_beneficio?: string;
  renda_bruta?: number;
  renda_liquida?: number;
  margem_total?: number;
  margem_disponivel?: number;
  banco_recebimento?: string;
  agencia_receb?: string;
  conta_receb?: string;
  tipo_conta?: string;
  pix?: string;
  origem?: string;
  agente_responsavel_id?: number;
  observacoes?: string;
}

export interface ClienteResumo {
  id: number;
  nome: string;
  cpf?: string;
  telefone1?: string;
  whatsapp?: string;
  convenio_nome?: string;
  margem_disponivel?: number;
  total_propostas: number;
  criado_em: string;
}

// ============================================
// PROPOSTAS
// ============================================

export type PropostaStatus =
  | 'digitado' | 'pendente' | 'em_analise' | 'aprovado'
  | 'aguardando_anuencia' | 'averbado' | 'pago'
  | 'rejeitado' | 'cancelado' | 'expirado';

export interface Proposta {
  id: number;
  cliente_id: number;
  cliente_nome?: string;
  agente_id?: number;
  agente_nome?: string;
  banco_id: number;
  banco_nome?: string;
  convenio_id: number;
  convenio_nome?: string;
  produto_id: number;
  produto_nome?: string;
  numero_proposta?: string;
  numero_contrato?: string;
  valor_emprestimo: number;
  valor_liquido?: number;
  valor_parcela: number;
  quantidade_parcelas: number;
  taxa_juros: number;
  cet_mensal?: number;
  banco_origem_id?: number;
  saldo_devedor?: number;
  valor_troco?: number;
  status: PropostaStatus;
  motivo_rejeicao?: string;
  pendencias?: string;
  data_digitacao: string;
  data_pagamento?: string;
  observacoes?: string;
  criado_em: string;
}

export interface PropostaInput {
  cliente_id: number;
  agente_id?: number;
  banco_id: number;
  convenio_id: number;
  produto_id: number;
  numero_proposta?: string;
  valor_emprestimo: number;
  valor_liquido?: number;
  valor_parcela: number;
  quantidade_parcelas: number;
  taxa_juros: number;
  cet_mensal?: number;
  banco_origem_id?: number;
  saldo_devedor?: number;
  valor_troco?: number;
  observacoes?: string;
}

export interface StatusUpdate {
  proposta_id: number;
  novo_status: PropostaStatus;
  observacao?: string;
  usuario_id?: number;
}

export interface PropostaHistorico {
  id: number;
  status_anterior?: string;
  status_novo: string;
  observacao?: string;
  criado_em: string;
}

// ============================================
// AGENTES
// ============================================

export interface Agente {
  id: number;
  nome: string;
  cpf?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  tipo: 'interno' | 'externo' | 'sub_correspondente';
  pix?: string;
  ativo: boolean;
  observacoes?: string;
  criado_em: string;
}

export interface AgenteInput {
  nome: string;
  cpf?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  tipo: string;
  banco_pagamento?: string;
  agencia?: string;
  conta?: string;
  pix?: string;
  observacoes?: string;
}

// ============================================
// DASHBOARD
// ============================================

export interface DashboardStats {
  total_clientes: number;
  total_propostas_mes: number;
  propostas_por_status: StatusCount[];
  valor_total_mes: number;
  comissoes_a_receber: number;
  comissoes_a_pagar: number;
  total_leads_novos: number;
}

export interface StatusCount {
  status: string;
  total: number;
}

// ============================================
// APP STATE
// ============================================

export type Page =
  | 'dashboard' | 'clientes' | 'propostas' | 'simulador'
  | 'financeiro' | 'agentes' | 'prospeccao' | 'convenios'
  | 'relatorios' | 'configuracoes' | 'manual' | 'feedback' | 'logs';

export const STATUS_LABELS: Record<PropostaStatus, string> = {
  digitado: 'Digitado',
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  aguardando_anuencia: 'Aguard. Anuência',
  averbado: 'Averbado',
  pago: 'Pago',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
};

export const CONVENIO_TIPOS: Record<string, string> = {
  inss: 'INSS',
  federal: 'Servidor Federal',
  estadual: 'Servidor Estadual',
  municipal: 'Servidor Municipal',
  clt: 'CLT',
  militar: 'Militar',
  outro: 'Outro',
};
