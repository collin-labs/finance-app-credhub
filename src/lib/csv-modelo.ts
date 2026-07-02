// ============================================
// MODELOS DE CSV PARA IMPORTAÇÃO DE MAILING
// Embutidos no app para download direto
// ============================================

// Cabeçalhos na ordem padrão
const HEADERS = 'nome;cpf;telefone;whatsapp;convenio;matricula;beneficio;renda';

// Modelo PREENCHIDO com exemplos didáticos (dados fictícios)
const LINHAS_EXEMPLO = [
  'Maria Aparecida da Silva;12345678901;11987654321;11987654321;INSS;1234567890;Aposentadoria por idade;2500.00',
  'Jose Carlos de Souza;98765432100;11912345678;11912345678;INSS;0987654321;Aposentadoria por tempo;3200.00',
  'Antonio Pereira Lima;45678912300;21987651234;21987651234;SIAPE;5544332211;Servidor Federal;5800.00',
  'Francisca das Chagas;78912345600;85988887777;85988887777;INSS;1122334455;Pensao por morte;1850.00',
  'Joao Batista Oliveira;32165498700;11955554444;;CLT;9988776655;Carteira assinada;2900.00',
];

export const MODELO_PREENCHIDO = [HEADERS, ...LINHAS_EXEMPLO].join('\n');
export const MODELO_VAZIO = HEADERS;

// Dados estruturados para exibir como tabela no manual / importador
export const COLUNAS_MODELO = [
  { campo: 'nome', label: 'Nome', obrigatorio: true, exemplo: 'Maria Aparecida da Silva', descricao: 'Nome completo do contato' },
  { campo: 'cpf', label: 'CPF', obrigatorio: false, exemplo: '12345678901', descricao: 'Só números, sem pontos ou traços' },
  { campo: 'telefone', label: 'Telefone', obrigatorio: false, exemplo: '11987654321', descricao: 'DDD + número, só dígitos' },
  { campo: 'whatsapp', label: 'WhatsApp', obrigatorio: false, exemplo: '11987654321', descricao: 'Pode ser igual ao telefone' },
  { campo: 'convenio', label: 'Convênio', obrigatorio: false, exemplo: 'INSS', descricao: 'INSS, SIAPE, CLT, etc.' },
  { campo: 'matricula', label: 'Matrícula', obrigatorio: false, exemplo: '1234567890', descricao: 'Matrícula ou número do benefício' },
  { campo: 'beneficio', label: 'Benefício', obrigatorio: false, exemplo: 'Aposentadoria', descricao: 'Tipo de benefício ou vínculo' },
  { campo: 'renda', label: 'Renda', obrigatorio: false, exemplo: '2500.00', descricao: 'Use ponto para centavos' },
];

// Linhas de exemplo estruturadas (para a tabela visual do manual)
export const LINHAS_EXEMPLO_VISUAL = [
  { nome: 'Maria Aparecida da Silva', cpf: '12345678901', telefone: '11987654321', whatsapp: '11987654321', convenio: 'INSS', matricula: '1234567890', beneficio: 'Aposentadoria por idade', renda: '2500.00' },
  { nome: 'Jose Carlos de Souza', cpf: '98765432100', telefone: '11912345678', whatsapp: '11912345678', convenio: 'INSS', matricula: '0987654321', beneficio: 'Aposentadoria por tempo', renda: '3200.00' },
  { nome: 'Antonio Pereira Lima', cpf: '45678912300', telefone: '21987651234', whatsapp: '21987651234', convenio: 'SIAPE', matricula: '5544332211', beneficio: 'Servidor Federal', renda: '5800.00' },
];

import { salvarArquivoTexto, ResultadoSalvar } from './salvar-arquivo';

/**
 * Salva um arquivo CSV usando o diálogo nativo do Tauri.
 * Retorna o caminho salvo, ou null se cancelou.
 */
export async function baixarCSV(conteudo: string, nomeArquivo: string): Promise<ResultadoSalvar> {
  return salvarArquivoTexto(conteudo, nomeArquivo, ['csv']);
}
