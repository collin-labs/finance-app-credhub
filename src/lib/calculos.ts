// ============================================
// BIBLIOTECA DE CÁLCULOS DE CRÉDITO CONSIGNADO
// Fórmulas validadas: Tabela Price, CET (TIR), margem consignável
// ============================================

/**
 * Calcula o valor da parcela pela Tabela Price (Sistema Francês).
 * PMT = PV × [ i × (1+i)^n ] / [ (1+i)^n − 1 ]
 * @param valorPresente valor do empréstimo (PV)
 * @param taxaMensal taxa de juros mensal em decimal (ex: 0.0185 para 1,85%)
 * @param numParcelas número de parcelas (n)
 */
export function calcularParcela(valorPresente: number, taxaMensal: number, numParcelas: number): number {
  if (numParcelas <= 0) return 0;
  if (taxaMensal === 0) return valorPresente / numParcelas;
  const fator = Math.pow(1 + taxaMensal, numParcelas);
  return valorPresente * (taxaMensal * fator) / (fator - 1);
}

/**
 * Calcula o valor presente (quanto pode ser emprestado) a partir da parcela desejada.
 * PV = PMT × [ (1+i)^n − 1 ] / [ i × (1+i)^n ]
 * Útil para "quanto consigo com essa margem de parcela?"
 */
export function calcularValorPresente(parcela: number, taxaMensal: number, numParcelas: number): number {
  if (numParcelas <= 0) return 0;
  if (taxaMensal === 0) return parcela * numParcelas;
  const fator = Math.pow(1 + taxaMensal, numParcelas);
  return parcela * (fator - 1) / (taxaMensal * fator);
}

/**
 * Converte taxa mensal para anual (juros compostos).
 * Taxa anual = (1+i)^12 − 1
 * Ex: 1,5% a.m. → 19,56% a.a. (NÃO 18%)
 */
export function taxaMensalParaAnual(taxaMensal: number): number {
  return Math.pow(1 + taxaMensal, 12) - 1;
}

/**
 * Calcula a margem consignável disponível.
 * @param rendaLiquida renda líquida do cliente
 * @param percentualMargem percentual permitido (ex: 0.35 para 35%)
 * @param parcelasExistentes soma das parcelas de consignados já ativos
 */
export function calcularMargem(rendaLiquida: number, percentualMargem: number, parcelasExistentes = 0): {
  margemTotal: number;
  margemDisponivel: number;
} {
  const margemTotal = rendaLiquida * percentualMargem;
  const margemDisponivel = Math.max(0, margemTotal - parcelasExistentes);
  return { margemTotal, margemDisponivel };
}

/**
 * Gera a tabela de amortização completa (mês a mês).
 */
export interface LinhaAmortizacao {
  parcela: number;
  valorParcela: number;
  juros: number;
  amortizacao: number;
  saldoDevedor: number;
}

export function gerarTabelaAmortizacao(valorPresente: number, taxaMensal: number, numParcelas: number): LinhaAmortizacao[] {
  const valorParcela = calcularParcela(valorPresente, taxaMensal, numParcelas);
  const tabela: LinhaAmortizacao[] = [];
  let saldo = valorPresente;

  for (let i = 1; i <= numParcelas; i++) {
    const juros = saldo * taxaMensal;
    const amortizacao = valorParcela - juros;
    saldo = Math.max(0, saldo - amortizacao);
    tabela.push({
      parcela: i,
      valorParcela,
      juros,
      amortizacao,
      saldoDevedor: saldo,
    });
  }
  return tabela;
}

/**
 * Calcula o IOF de operações de crédito (pessoa física, 2026).
 * IOF = IOF diário (0,0082% ao dia, limitado a 365 dias) + IOF adicional fixo (0,38%)
 * Aplicado sobre o valor financiado.
 */
export function calcularIOF(valorPrincipal: number, numParcelas: number): number {
  const IOF_DIARIO = 0.000082; // 0,0082% ao dia
  const IOF_ADICIONAL = 0.0038; // 0,38% fixo
  // Aproximação: prazo médio em dias (parcelas mensais)
  const dias = Math.min(numParcelas * 30, 365);
  const iofDiario = valorPrincipal * IOF_DIARIO * dias;
  const iofAdicional = valorPrincipal * IOF_ADICIONAL;
  return iofDiario + iofAdicional;
}

/**
 * Calcula o CET (Custo Efetivo Total) mensal usando TIR (Taxa Interna de Retorno).
 * Encontra a taxa que iguala o valor líquido recebido ao fluxo de parcelas.
 * @param valorLiberado valor que o cliente realmente recebe (líquido)
 * @param valorParcela valor de cada parcela
 * @param numParcelas número de parcelas
 * @returns taxa mensal do CET em decimal, ou null se não convergir
 */
export function calcularCET(valorLiberado: number, valorParcela: number, numParcelas: number): number | null {
  // Newton-Raphson / bisseção para achar a TIR
  // VPL(i) = -valorLiberado + Σ parcela/(1+i)^k = 0
  function vpl(taxa: number): number {
    let soma = -valorLiberado;
    for (let k = 1; k <= numParcelas; k++) {
      soma += valorParcela / Math.pow(1 + taxa, k);
    }
    return soma;
  }

  // Bisseção entre 0% e 100% ao mês
  let baixo = 0.0;
  let alto = 1.0;
  let meio = 0;

  // Se nem com taxa 0 o VPL é positivo, não há solução válida
  if (vpl(baixo) < 0) return null;

  for (let iter = 0; iter < 100; iter++) {
    meio = (baixo + alto) / 2;
    const valor = vpl(meio);
    if (Math.abs(valor) < 0.001) break;
    if (valor > 0) baixo = meio;
    else alto = meio;
  }

  return meio;
}

/**
 * Simulação completa de um empréstimo consignado.
 */
export interface SimulacaoResultado {
  valorEmprestimo: number;
  valorLiberado: number;
  valorParcela: number;
  numParcelas: number;
  taxaMensal: number;
  taxaAnual: number;
  totalPago: number;
  totalJuros: number;
  iof: number;
  cetMensal: number | null;
  cetAnual: number | null;
}

export interface SimulacaoParams {
  valorEmprestimo: number;
  taxaMensal: number; // decimal
  numParcelas: number;
  iof?: number;        // se informado, usa; senão calcula
  tac?: number;        // taxa de abertura de crédito
  seguro?: number;     // seguro prestamista
  incluirIOF?: boolean;
}

export function simularEmprestimo(params: SimulacaoParams): SimulacaoResultado {
  const { valorEmprestimo, taxaMensal, numParcelas, tac = 0, seguro = 0, incluirIOF = true } = params;

  const valorParcela = calcularParcela(valorEmprestimo, taxaMensal, numParcelas);
  const totalPago = valorParcela * numParcelas;
  const totalJuros = totalPago - valorEmprestimo;

  const iof = params.iof ?? (incluirIOF ? calcularIOF(valorEmprestimo, numParcelas) : 0);

  // Valor líquido = valor do empréstimo - custos descontados na liberação
  const valorLiberado = valorEmprestimo - iof - tac - seguro;

  // CET considera o que o cliente recebe vs o que paga
  const cetMensal = calcularCET(valorLiberado, valorParcela, numParcelas);
  const cetAnual = cetMensal !== null ? taxaMensalParaAnual(cetMensal) : null;

  return {
    valorEmprestimo,
    valorLiberado,
    valorParcela,
    numParcelas,
    taxaMensal,
    taxaAnual: taxaMensalParaAnual(taxaMensal),
    totalPago,
    totalJuros,
    iof,
    cetMensal,
    cetAnual,
  };
}

/**
 * Simulação de PORTABILIDADE com troco.
 * O cliente tem um contrato ativo em outro banco e migra para um novo com taxa menor.
 */
export interface PortabilidadeParams {
  saldoDevedor: number;       // quanto falta pagar no banco atual
  parcelaAtual: number;       // parcela atual
  parcelasRestantes: number;  // quantas parcelas faltam
  novaTaxaMensal: number;     // taxa do novo banco (menor)
  novoPrazo: number;          // novo prazo (pode aumentar para liberar troco)
}

export interface PortabilidadeResultado {
  saldoDevedor: number;
  novaParcela: number;
  parcelaAtual: number;
  economiaParcela: number;
  valorTroco: number;          // dinheiro extra que o cliente recebe
  novoValorContrato: number;
}

export function simularPortabilidade(params: PortabilidadeParams): PortabilidadeResultado {
  const { saldoDevedor, parcelaAtual, novaTaxaMensal, novoPrazo } = params;

  // Quanto o cliente consegue no novo banco mantendo a mesma parcela ou menor
  // Opção 1: mesma parcela, prazo menor → quita antes
  // Opção 2: refinancia o saldo + troco no novo prazo

  // Nova parcela só do saldo devedor portado
  const novaParcela = calcularParcela(saldoDevedor, novaTaxaMensal, novoPrazo);

  // Se a nova parcela é menor, podemos usar a margem liberada para troco
  // Valor que o cliente poderia ter com a parcela ATUAL no novo prazo/taxa
  const valorComParcelaAtual = calcularValorPresente(parcelaAtual, novaTaxaMensal, novoPrazo);
  const valorTroco = Math.max(0, valorComParcelaAtual - saldoDevedor);
  const novoValorContrato = saldoDevedor + valorTroco;

  return {
    saldoDevedor,
    novaParcela,
    parcelaAtual,
    economiaParcela: parcelaAtual - novaParcela,
    valorTroco,
    novoValorContrato,
  };
}

// Tetos de taxa por convênio (2026) — referência
export const TETOS_TAXA_2026: Record<string, { taxa: number; label: string }> = {
  inss:      { taxa: 0.0185, label: 'INSS — teto 1,85% a.m.' },
  servidor:  { taxa: 0.0160, label: 'Servidor público — ~1,60% a.m.' },
  clt:       { taxa: 0.0360, label: 'CLT — média 3,6% a.m.' },
};

// Percentuais de margem por tipo (2026)
export const MARGEM_PADRAO: Record<string, number> = {
  inss: 0.35,       // 35% empréstimo (45% total incluindo cartão)
  servidor: 0.35,   // varia por órgão
  clt: 0.35,        // 35% sobre salário líquido
};
