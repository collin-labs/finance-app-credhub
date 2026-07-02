use serde::{Deserialize, Serialize};

// ============================================
// SISTEMA — Usuario, Login e Setup estão em commands/auth.rs
// ============================================

// ============================================
// CADASTROS BASE
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Convenio {
    pub id: i64,
    pub nome: String,
    pub tipo: String,
    pub estado: Option<String>,
    pub orgao: Option<String>,
    pub margem_maxima: Option<f64>,
    pub prazo_maximo: Option<i64>,
    pub taxa_teto: Option<f64>,
    pub sistema_consulta: Option<String>,
    pub ativo: bool,
    pub notas: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ConvenioInput {
    pub nome: String,
    pub tipo: String,
    pub estado: Option<String>,
    pub orgao: Option<String>,
    pub margem_maxima: Option<f64>,
    pub prazo_maximo: Option<i64>,
    pub taxa_teto: Option<f64>,
    pub sistema_consulta: Option<String>,
    pub notas: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Banco {
    pub id: i64,
    pub nome: String,
    pub codigo: Option<String>,
    pub contato: Option<String>,
    pub notas: Option<String>,
    pub ativo: bool,
}

#[derive(Debug, Deserialize)]
pub struct BancoInput {
    pub nome: String,
    pub codigo: Option<String>,
    pub contato: Option<String>,
    pub notas: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Produto {
    pub id: i64,
    pub nome: String,
    pub tipo: String,
    pub descricao: Option<String>,
    pub ativo: bool,
}

// ============================================
// CLIENTES
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Cliente {
    pub id: i64,
    pub nome: String,
    pub cpf: Option<String>,
    pub rg: Option<String>,
    pub data_nascimento: Option<String>,
    pub telefone1: Option<String>,
    pub telefone2: Option<String>,
    pub whatsapp: Option<String>,
    pub email: Option<String>,
    pub cep: Option<String>,
    pub endereco: Option<String>,
    pub numero: Option<String>,
    pub complemento: Option<String>,
    pub bairro: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub convenio_id: Option<i64>,
    pub convenio_nome: Option<String>,
    pub matricula: Option<String>,
    pub orgao: Option<String>,
    pub tipo_beneficio: Option<String>,
    pub renda_bruta: Option<f64>,
    pub renda_liquida: Option<f64>,
    pub margem_total: Option<f64>,
    pub margem_disponivel: Option<f64>,
    pub margem_atualizada_em: Option<String>,
    pub origem: Option<String>,
    pub agente_responsavel_id: Option<i64>,
    pub observacoes: Option<String>,
    pub ativo: bool,
    pub criado_em: String,
    pub atualizado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct ClienteInput {
    pub nome: String,
    pub cpf: Option<String>,
    pub rg: Option<String>,
    pub data_nascimento: Option<String>,
    pub telefone1: Option<String>,
    pub telefone2: Option<String>,
    pub whatsapp: Option<String>,
    pub email: Option<String>,
    pub cep: Option<String>,
    pub endereco: Option<String>,
    pub numero: Option<String>,
    pub complemento: Option<String>,
    pub bairro: Option<String>,
    pub cidade: Option<String>,
    pub estado: Option<String>,
    pub convenio_id: Option<i64>,
    pub matricula: Option<String>,
    pub orgao: Option<String>,
    pub tipo_beneficio: Option<String>,
    pub renda_bruta: Option<f64>,
    pub renda_liquida: Option<f64>,
    pub margem_total: Option<f64>,
    pub margem_disponivel: Option<f64>,
    pub banco_recebimento: Option<String>,
    pub agencia_receb: Option<String>,
    pub conta_receb: Option<String>,
    pub tipo_conta: Option<String>,
    pub pix: Option<String>,
    pub origem: Option<String>,
    pub agente_responsavel_id: Option<i64>,
    pub observacoes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ClienteResumo {
    pub id: i64,
    pub nome: String,
    pub cpf: Option<String>,
    pub telefone1: Option<String>,
    pub whatsapp: Option<String>,
    pub convenio_nome: Option<String>,
    pub margem_disponivel: Option<f64>,
    pub total_propostas: i64,
    pub criado_em: String,
}

// ============================================
// PROPOSTAS
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Proposta {
    pub id: i64,
    pub cliente_id: i64,
    pub cliente_nome: Option<String>,
    pub agente_id: Option<i64>,
    pub agente_nome: Option<String>,
    pub banco_id: i64,
    pub banco_nome: Option<String>,
    pub convenio_id: i64,
    pub convenio_nome: Option<String>,
    pub produto_id: i64,
    pub produto_nome: Option<String>,
    pub numero_proposta: Option<String>,
    pub numero_contrato: Option<String>,
    pub valor_emprestimo: f64,
    pub valor_liquido: Option<f64>,
    pub valor_parcela: f64,
    pub quantidade_parcelas: i64,
    pub taxa_juros: f64,
    pub cet_mensal: Option<f64>,
    pub banco_origem_id: Option<i64>,
    pub saldo_devedor: Option<f64>,
    pub valor_troco: Option<f64>,
    pub status: String,
    pub motivo_rejeicao: Option<String>,
    pub pendencias: Option<String>,
    pub data_digitacao: String,
    pub data_pagamento: Option<String>,
    pub observacoes: Option<String>,
    pub criado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct PropostaInput {
    pub cliente_id: i64,
    pub agente_id: Option<i64>,
    pub banco_id: i64,
    pub convenio_id: i64,
    pub produto_id: i64,
    pub numero_proposta: Option<String>,
    pub valor_emprestimo: f64,
    pub valor_liquido: Option<f64>,
    pub valor_parcela: f64,
    pub quantidade_parcelas: i64,
    pub taxa_juros: f64,
    pub cet_mensal: Option<f64>,
    pub banco_origem_id: Option<i64>,
    pub saldo_devedor: Option<f64>,
    pub valor_troco: Option<f64>,
    pub observacoes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StatusUpdate {
    pub proposta_id: i64,
    pub novo_status: String,
    pub observacao: Option<String>,
    pub usuario_id: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct PropostaHistorico {
    pub id: i64,
    pub status_anterior: Option<String>,
    pub status_novo: String,
    pub observacao: Option<String>,
    pub criado_em: String,
}

// ============================================
// AGENTES
// ============================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Agente {
    pub id: i64,
    pub nome: String,
    pub cpf: Option<String>,
    pub telefone: Option<String>,
    pub whatsapp: Option<String>,
    pub email: Option<String>,
    pub tipo: String,
    pub pix: Option<String>,
    pub ativo: bool,
    pub observacoes: Option<String>,
    pub criado_em: String,
}

#[derive(Debug, Deserialize)]
pub struct AgenteInput {
    pub nome: String,
    pub cpf: Option<String>,
    pub telefone: Option<String>,
    pub whatsapp: Option<String>,
    pub email: Option<String>,
    pub tipo: String,
    pub banco_pagamento: Option<String>,
    pub agencia: Option<String>,
    pub conta: Option<String>,
    pub pix: Option<String>,
    pub observacoes: Option<String>,
}

// ============================================
// DASHBOARD
// ============================================

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_clientes: i64,
    pub total_propostas_mes: i64,
    pub propostas_por_status: Vec<StatusCount>,
    pub valor_total_mes: f64,
    pub comissoes_a_receber: f64,
    pub comissoes_a_pagar: f64,
    pub total_leads_novos: i64,
}

#[derive(Debug, Serialize)]
pub struct StatusCount {
    pub status: String,
    pub total: i64,
}
