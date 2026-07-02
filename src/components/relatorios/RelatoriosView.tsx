import { useState, useEffect, useCallback } from 'react';
import { relatorioProducao, relatorioFinanceiro, relatorioComercial } from '../../lib/api';
import { Usuario } from '../../lib/types';
import { EmptyState } from '../shared/EmptyState';
import { Tooltip } from '../shared/Tooltip';
import { salvarArquivoTexto } from '../../lib/salvar-arquivo';
import { gerarRelatorioPDF } from '../../lib/relatorio-pdf';
import { toastArquivoSalvo } from '../../lib/toast-arquivo';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { formatMoney } from '../../lib/formatters';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  BarChart3, TrendingUp, Users, FileDown, Calendar, DollarSign,
  Target, Wallet, Receipt, Shield, Printer,
} from 'lucide-react';

interface Props {
  currentUser: Usuario;
}

type Aba = 'producao' | 'financeiro' | 'comercial';

const CORES = ['#2563eb', '#0891b2', '#16a34a', '#9333ea', '#dc2626', '#ea580c', '#ca8a04', '#0f766e'];

// Períodos rápidos
function periodoRapido(tipo: string): { data_inicio?: string; data_fim?: string } {
  const hoje = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (tipo) {
    case 'mes': return { data_inicio: fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), data_fim: fmt(hoje) };
    case 'mes_passado': {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { data_inicio: fmt(ini), data_fim: fmt(fim) };
    }
    case 'ano': return { data_inicio: fmt(new Date(hoje.getFullYear(), 0, 1)), data_fim: fmt(hoje) };
    case 'tudo': return {};
    default: return {};
  }
}

const STATUS_LABEL: Record<string, string> = {
  digitado: 'Digitado', pendente: 'Pendente', em_analise: 'Em Análise',
  aprovado: 'Aprovado', aguardando_anuencia: 'Aguard. Anuência', averbado: 'Averbado',
  pago: 'Pago', rejeitado: 'Rejeitado', cancelado: 'Cancelado', expirado: 'Expirado',
  novo: 'Novo', tentando_contato: 'Tentando Contato', contactado: 'Contactado',
  interessado: 'Interessado', agendado: 'Agendado', sem_interesse: 'Sem Interesse',
  telefone_errado: 'Tel. Errado', convertido: 'Convertido', descartado: 'Descartado',
};

export function RelatoriosView({ currentUser }: Props) {
  const [aba, setAba] = useState<Aba>('producao');
  const [periodoTipo, setPeriodoTipo] = useState('mes');
  const periodo = periodoRapido(periodoTipo);

  const PERIODO_LABEL: Record<string, string> = {
    mes: 'Este mês', mes_passado: 'Mês passado', ano: 'Este ano', tudo: 'Todo o período',
  };
  const periodoLabel = PERIODO_LABEL[periodoTipo] || 'Período';

  const isAdmin = currentUser.perfil === 'admin';
  const isGerente = currentUser.perfil === 'gerente';
  const podeVer = isAdmin || isGerente;

  if (!podeVer) {
    return <EmptyState icon={Shield} title="Acesso restrito" description="Apenas administradores e gerentes podem ver os relatórios." />;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-600" />
          <div>
            <h2 className="text-lg font-bold text-surface-900">Relatórios</h2>
            <p className="text-xs text-surface-400">Visão gerencial do negócio</p>
          </div>
        </div>

        {/* Seletor de período */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-surface-400" />
          <select value={periodoTipo} onChange={e => setPeriodoTipo(e.target.value)} className="input-field text-xs py-1.5 w-40">
            <option value="mes">Este mês</option>
            <option value="mes_passado">Mês passado</option>
            <option value="ano">Este ano</option>
            <option value="tudo">Todo o período</option>
          </select>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-1 w-fit">
        <AbaTab atual={aba} id="producao" label="Produção" icon={TrendingUp} onClick={setAba} />
        <AbaTab atual={aba} id="financeiro" label="Financeiro" icon={Wallet} onClick={setAba} />
        <AbaTab atual={aba} id="comercial" label="Comercial" icon={Target} onClick={setAba} />
      </div>

      {aba === 'producao' && <RelatorioProducao periodo={periodo} periodoLabel={periodoLabel} />}
      {aba === 'financeiro' && <RelatorioFinanceiro periodo={periodo} periodoLabel={periodoLabel} />}
      {aba === 'comercial' && <RelatorioComercial periodo={periodo} periodoLabel={periodoLabel} />}
    </div>
  );
}

function AbaTab({ atual, id, label, icon: Icon, onClick }: { atual: string; id: Aba; label: string; icon: React.ElementType; onClick: (a: Aba) => void }) {
  return (
    <button onClick={() => onClick(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${atual === id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ============================================
// RELATÓRIO DE PRODUÇÃO
// ============================================
function RelatorioProducao({ periodo, periodoLabel }: { periodo: any; periodoLabel: string }) {
  const { empresa, nomeExibicao } = useEmpresa();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await relatorioProducao(periodo)); } catch (e) { toast.error((e as Error).message); }
    setLoading(false);
  }, [JSON.stringify(periodo)]);

  useEffect(() => { load(); }, [load]);

  async function exportar() {
    if (!data) return;
    const linhas = ['Categoria;Item;Quantidade;Valor'];
    data.por_agente.forEach((i: any) => linhas.push(`Agente;${i.label};${i.quantidade};${i.valor.toFixed(2)}`));
    data.por_banco.forEach((i: any) => linhas.push(`Banco;${i.label};${i.quantidade};${i.valor.toFixed(2)}`));
    data.por_convenio.forEach((i: any) => linhas.push(`Convênio;${i.label};${i.quantidade};${i.valor.toFixed(2)}`));
    data.por_produto.forEach((i: any) => linhas.push(`Produto;${i.label};${i.quantidade};${i.valor.toFixed(2)}`));
    const caminho = await salvarArquivoTexto(linhas.join('\n'), 'relatorio-producao.csv', ['csv']);
    if (caminho) toastArquivoSalvo(caminho, 'Relatório CSV');
  }

  async function imprimirPDF() {
    if (!data) return;
    setGerandoPdf(true);
    toast.loading('Gerando PDF...', { id: 'pdf-rel' });
    try {
      const r = data.resumo;
      const tabelaDe = (itens: any[]) => itens.map((i: any) => [i.label, String(i.quantidade), formatMoney(i.valor)]);
      const caminho = await gerarRelatorioPDF({
        empresa, nomeEmpresa: nomeExibicao,
        titulo: 'Relatório de Produção', periodo: periodoLabel,
        secoes: [
          {
            titulo: 'Resumo Geral',
            cards: [
              { label: 'Total de Propostas', valor: String(r.total_propostas) },
              { label: 'Valor Total', valor: formatMoney(r.total_valor) },
              { label: 'Propostas Pagas', valor: String(r.propostas_pagas) },
              { label: 'Valor Pago', valor: formatMoney(r.valor_pago) },
              { label: 'Ticket Médio', valor: formatMoney(r.ticket_medio) },
            ],
          },
          {
            titulo: 'Detalhamento',
            tabelas: [
              { titulo: 'Por Agente', colunas: ['Agente', 'Qtd', 'Valor'], linhas: tabelaDe(data.por_agente) },
              { titulo: 'Por Banco', colunas: ['Banco', 'Qtd', 'Valor'], linhas: tabelaDe(data.por_banco) },
              { titulo: 'Por Convênio', colunas: ['Convênio', 'Qtd', 'Valor'], linhas: tabelaDe(data.por_convenio) },
              { titulo: 'Por Produto', colunas: ['Produto', 'Qtd', 'Valor'], linhas: tabelaDe(data.por_produto) },
            ],
          },
        ],
      });
      toast.dismiss('pdf-rel');
      if (caminho) toastArquivoSalvo(caminho, 'PDF');
    } catch (e) {
      toast.error('Erro ao gerar PDF', { id: 'pdf-rel' });
    } finally { setGerandoPdf(false); }
  }

  if (loading) return <div className="text-center py-12 text-sm text-surface-400">Carregando...</div>;
  if (!data) return null;

  const r = data.resumo;

  return (
    <div>
      <div className="flex justify-end gap-2 mb-3">
        <Tooltip content="Gerar PDF para imprimir ou apresentar">
          <button onClick={imprimirPDF} disabled={gerandoPdf} className="btn-secondary text-xs flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Imprimir PDF
          </button>
        </Tooltip>
        <Tooltip content="Exportar dados para CSV (abre no Excel)">
          <button onClick={exportar} className="btn-secondary text-xs flex items-center gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </Tooltip>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <CardResumo label="Total de Propostas" valor={String(r.total_propostas)} sub={formatMoney(r.total_valor)} icon={Receipt} cor="brand" />
        <CardResumo label="Propostas Pagas" valor={String(r.propostas_pagas)} sub={formatMoney(r.valor_pago)} icon={DollarSign} cor="green" />
        <CardResumo label="Em Andamento" valor={String(r.propostas_andamento)} sub={formatMoney(r.valor_andamento)} icon={TrendingUp} cor="amber" />
        <CardResumo label="Ticket Médio" valor={formatMoney(r.ticket_medio)} sub="por proposta" icon={BarChart3} cor="purple" />
      </div>

      {/* Produção por mês */}
      {data.por_mes.length > 0 && (
        <div className="card p-5 mb-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Produção por Mês</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[...data.por_mes].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <ReTooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="valor" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabelas agrupadas */}
      <div className="grid grid-cols-2 gap-4">
        <TabelaAgrupada titulo="Por Agente" itens={data.por_agente} />
        <TabelaAgrupada titulo="Por Banco" itens={data.por_banco} />
        <TabelaAgrupada titulo="Por Convênio" itens={data.por_convenio} />
        <TabelaAgrupada titulo="Por Produto" itens={data.por_produto} />
      </div>
    </div>
  );
}

// ============================================
// RELATÓRIO FINANCEIRO
// ============================================
function RelatorioFinanceiro({ periodo, periodoLabel }: { periodo: any; periodoLabel: string }) {
  const { empresa, nomeExibicao } = useEmpresa();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await relatorioFinanceiro(periodo)); } catch (e) { toast.error((e as Error).message); }
    setLoading(false);
  }, [JSON.stringify(periodo)]);

  useEffect(() => { load(); }, [load]);

  async function imprimirPDF() {
    if (!data) return;
    setGerandoPdf(true);
    toast.loading('Gerando PDF...', { id: 'pdf-fin' });
    try {
      const caminho = await gerarRelatorioPDF({
        empresa, nomeEmpresa: nomeExibicao,
        titulo: 'Relatório Financeiro', periodo: periodoLabel,
        secoes: [
          {
            titulo: 'Resumo Financeiro',
            cards: [
              { label: 'Receitas', valor: formatMoney(data.total_receitas) },
              { label: 'Recebido', valor: formatMoney(data.receitas_recebidas) },
              { label: 'A Receber', valor: formatMoney(data.receitas_a_receber) },
              { label: 'Despesas', valor: formatMoney(data.total_despesas) },
              { label: 'Pago', valor: formatMoney(data.despesas_pagas) },
              { label: 'A Pagar', valor: formatMoney(data.despesas_a_pagar) },
              { label: 'Saldo', valor: formatMoney(data.saldo) },
            ],
          },
          {
            titulo: 'Comissões',
            cards: [
              { label: 'Comissões da Empresa', valor: formatMoney(data.comissoes_empresa) },
              { label: 'Comissões dos Agentes', valor: formatMoney(data.comissoes_agentes) },
            ],
          },
          {
            titulo: 'Movimentação por Mês',
            tabelas: [{
              titulo: 'Receitas vs Despesas',
              colunas: ['Mês', 'Receitas', 'Despesas'],
              linhas: data.por_mes.map((m: any) => [m.mes, formatMoney(m.receitas), formatMoney(m.despesas)]),
            }],
          },
        ],
      });
      toast.dismiss('pdf-fin');
      if (caminho) toastArquivoSalvo(caminho, 'PDF');
    } catch (e) {
      toast.error('Erro ao gerar PDF', { id: 'pdf-fin' });
    } finally { setGerandoPdf(false); }
  }

  if (loading) return <div className="text-center py-12 text-sm text-surface-400">Carregando...</div>;
  if (!data) return null;

  const chartData = [...data.por_mes].reverse().map((m: any) => ({
    mes: m.mes, Receitas: m.receitas, Despesas: m.despesas,
  }));

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Tooltip content="Gerar PDF para imprimir ou apresentar">
          <button onClick={imprimirPDF} disabled={gerandoPdf} className="btn-secondary text-xs flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Imprimir PDF
          </button>
        </Tooltip>
      </div>
      {/* Cards principais */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <CardResumo label="Receitas" valor={formatMoney(data.total_receitas)} sub={`${formatMoney(data.receitas_recebidas)} recebido`} icon={TrendingUp} cor="green" />
        <CardResumo label="Despesas" valor={formatMoney(data.total_despesas)} sub={`${formatMoney(data.despesas_pagas)} pago`} icon={Receipt} cor="red" />
        <CardResumo label="Saldo" valor={formatMoney(data.saldo)} sub="recebido - pago" icon={Wallet} cor={data.saldo >= 0 ? 'green' : 'red'} />
      </div>

      {/* A receber / a pagar */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4">
          <p className="text-xs text-surface-400">A Receber dos bancos</p>
          <p className="text-xl font-bold text-amber-600">{formatMoney(data.receitas_a_receber)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-surface-400">A Pagar aos agentes</p>
          <p className="text-xl font-bold text-red-500">{formatMoney(data.despesas_a_pagar)}</p>
        </div>
      </div>

      {/* Comissões */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4 bg-gradient-to-br from-brand-50/50 to-white">
          <p className="text-xs text-surface-400">Comissões da Empresa</p>
          <p className="text-xl font-bold text-brand-700">{formatMoney(data.comissoes_empresa)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-surface-400">Comissões dos Agentes</p>
          <p className="text-xl font-bold text-surface-700">{formatMoney(data.comissoes_agentes)}</p>
        </div>
      </div>

      {/* Gráfico receitas vs despesas */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Receitas vs Despesas por Mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <ReTooltip formatter={(v: number) => formatMoney(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Receitas" fill="#16a34a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Despesas" fill="#dc2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ============================================
// RELATÓRIO COMERCIAL (FUNIL)
// ============================================
function RelatorioComercial({ periodo, periodoLabel }: { periodo: any; periodoLabel: string }) {
  const { empresa, nomeExibicao } = useEmpresa();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await relatorioComercial(periodo)); } catch (e) { toast.error((e as Error).message); }
    setLoading(false);
  }, [JSON.stringify(periodo)]);

  useEffect(() => { load(); }, [load]);

  async function imprimirPDF() {
    if (!data) return;
    setGerandoPdf(true);
    toast.loading('Gerando PDF...', { id: 'pdf-com' });
    try {
      const caminho = await gerarRelatorioPDF({
        empresa, nomeEmpresa: nomeExibicao,
        titulo: 'Relatório Comercial', periodo: periodoLabel,
        secoes: [
          {
            titulo: 'Taxas de Conversão',
            cards: [
              { label: 'Conversão de Leads', valor: `${data.taxa_conversao_leads.toFixed(1)}%` },
              { label: 'Leads Convertidos', valor: `${data.leads_convertidos} de ${data.total_leads}` },
              { label: 'Conversão de Propostas', valor: `${data.taxa_conversao_propostas.toFixed(1)}%` },
              { label: 'Propostas Pagas', valor: `${data.propostas_pagas} de ${data.total_propostas}` },
            ],
          },
          {
            titulo: 'Funil de Propostas',
            tabelas: [{
              titulo: 'Por Status',
              colunas: ['Status', 'Quantidade', 'Valor'],
              linhas: data.funil_propostas.map((i: any) => [STATUS_LABEL[i.label] || i.label, String(i.quantidade), formatMoney(i.valor)]),
            }],
          },
          {
            titulo: 'Funil de Leads',
            tabelas: [{
              titulo: 'Por Status',
              colunas: ['Status', 'Quantidade'],
              linhas: data.funil_leads.map((i: any) => [STATUS_LABEL[i.label] || i.label, String(i.quantidade)]),
            }],
          },
        ],
      });
      toast.dismiss('pdf-com');
      if (caminho) toastArquivoSalvo(caminho, 'PDF');
    } catch (e) {
      toast.error('Erro ao gerar PDF', { id: 'pdf-com' });
    } finally { setGerandoPdf(false); }
  }

  if (loading) return <div className="text-center py-12 text-sm text-surface-400">Carregando...</div>;
  if (!data) return null;

  const funilPropostas = data.funil_propostas.map((i: any) => ({ ...i, nome: STATUS_LABEL[i.label] || i.label }));
  const funilLeads = data.funil_leads.map((i: any) => ({ ...i, nome: STATUS_LABEL[i.label] || i.label }));

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Tooltip content="Gerar PDF para imprimir ou apresentar">
          <button onClick={imprimirPDF} disabled={gerandoPdf} className="btn-secondary text-xs flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Imprimir PDF
          </button>
        </Tooltip>
      </div>
      {/* Taxas de conversão */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-surface-400">Conversão de Leads</p>
            <Users className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-3xl font-bold text-brand-600">{data.taxa_conversao_leads.toFixed(1)}%</p>
          <p className="text-2xs text-surface-400 mt-1">{data.leads_convertidos} de {data.total_leads} leads convertidos em clientes</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-surface-400">Conversão de Propostas</p>
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-600">{data.taxa_conversao_propostas.toFixed(1)}%</p>
          <p className="text-2xs text-surface-400 mt-1">{data.propostas_pagas} de {data.total_propostas} propostas pagas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Funil de propostas */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Funil de Propostas</h3>
          {funilPropostas.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-8">Nenhuma proposta no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={funilPropostas} dataKey="quantidade" nameKey="nome" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.nome}>
                  {funilPropostas.map((_: any, i: number) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <ReTooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Funil de leads */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Funil de Leads</h3>
          {funilLeads.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-8">Nenhum lead no período</p>
          ) : (
            <div className="space-y-2">
              {funilLeads.map((i: any, idx: number) => {
                const max = Math.max(...funilLeads.map((x: any) => x.quantidade));
                const pct = max > 0 ? (i.quantidade / max) * 100 : 0;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-surface-600">{i.nome}</span>
                      <span className="font-semibold text-surface-700">{i.quantidade}</span>
                    </div>
                    <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CORES[idx % CORES.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================
function CardResumo({ label, valor, sub, icon: Icon, cor }: { label: string; valor: string; sub: string; icon: React.ElementType; cor: string }) {
  const cores: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600', purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-500',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-2xs text-surface-400">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cores[cor]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-xl font-bold text-surface-900">{valor}</p>
      <p className="text-2xs text-surface-400 mt-0.5">{sub}</p>
    </div>
  );
}

function TabelaAgrupada({ titulo, itens }: { titulo: string; itens: any[] }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-surface-700 mb-3">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="text-xs text-surface-400 text-center py-4">Sem dados</p>
      ) : (
        <div className="space-y-1.5">
          {itens.slice(0, 6).map((i, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-surface-600 truncate flex-1">{i.label}</span>
              <span className="text-surface-400 mx-2">{i.quantidade}</span>
              <span className="font-semibold text-surface-700 w-24 text-right">{formatMoney(i.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
