import { useState, useEffect } from 'react';
import { listarComissoes, marcarComissaoRecebida, marcarComissaoAgentePaga, listarLancamentos, criarLancamento, marcarLancamentoPago, obterResumoFinanceiro } from '../../lib/api';
import { StatCard } from '../shared/StatCard';
import { EmptyState } from '../shared/EmptyState';
import { Modal } from '../shared/Modal';
import { Tooltip } from '../shared/Tooltip';
import { formatMoney, formatDate } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { DollarSign, TrendingUp, ArrowDownRight, Wallet, Plus, Check, CircleDollarSign } from 'lucide-react';

type Tab = 'resumo' | 'comissoes' | 'receitas' | 'despesas';

const CATEGORIAS_DESPESA = ['aluguel', 'salario', 'marketing', 'transporte', 'telefone', 'material', 'outro'];

export function FinanceiroView() {
  const [tab, setTab] = useState<Tab>('resumo');
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [lancamentoModal, setLancamentoModal] = useState(false);
  const [formLanc, setFormLanc] = useState({ tipo: 'despesa', categoria: 'outro', descricao: '', valor: '', data_vencimento: '' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    obterResumoFinanceiro().then(r => setResumo(r)).catch(() => {});
    listarComissoes().then(c => setComissoes(c as any[])).catch(() => {});
    listarLancamentos().then(l => setLancamentos(l as any[])).catch(() => {});
  }

  async function handleReceberComissao(id: number) {
    try { await marcarComissaoRecebida(id); toast.success('Comissão marcada como recebida'); loadAll(); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function handlePagarAgente(id: number) {
    try { await marcarComissaoAgentePaga(id); toast.success('Comissão do agente marcada como paga'); loadAll(); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function handlePagarLancamento(id: number) {
    try { await marcarLancamentoPago(id); toast.success('Lançamento marcado como pago'); loadAll(); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function handleCriarLancamento() {
    if (!formLanc.descricao.trim() || !formLanc.valor || !formLanc.data_vencimento) {
      toast.error('Preencha todos os campos'); return;
    }
    try {
      await criarLancamento({ ...formLanc, valor: parseFloat(formLanc.valor) });
      toast.success('Lançamento criado');
      setLancamentoModal(false);
      setFormLanc({ tipo: 'despesa', categoria: 'outro', descricao: '', valor: '', data_vencimento: '' });
      loadAll();
    } catch (e) { toast.error((e as Error).message); }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'comissoes', label: `Comissões (${comissoes.length})` },
    { id: 'receitas', label: 'Receitas' },
    { id: 'despesas', label: 'Despesas' },
  ];

  const receitas = lancamentos.filter(l => l.tipo === 'receita');
  const despesas = lancamentos.filter(l => l.tipo === 'despesa');

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-surface-900">Financeiro</h2>
          <p className="text-xs text-surface-400 mt-0.5">Comissões, receitas e despesas</p>
        </div>
        <button onClick={() => setLancamentoModal(true)} className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Novo Lançamento
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t.id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* RESUMO */}
      {tab === 'resumo' && resumo && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="A Receber (Bancos)" value={formatMoney(resumo.receitas_pendentes)} icon={TrendingUp} color="success" />
            <StatCard title="Já Recebido" value={formatMoney(resumo.receitas_recebidas)} icon={DollarSign} color="brand" />
            <StatCard title="A Pagar (Agentes + Desp.)" value={formatMoney(resumo.despesas_pendentes)} icon={ArrowDownRight} color="warning" />
            <StatCard title="Saldo Líquido" value={formatMoney(resumo.saldo)} icon={Wallet} color={resumo.saldo >= 0 ? 'success' : 'danger'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <p className="text-xs font-medium text-surface-500">Receitas do Mês</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{formatMoney(resumo.receitas_mes)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium text-surface-500">Despesas do Mês</p>
              <p className="text-2xl font-bold text-red-500 mt-2">{formatMoney(resumo.despesas_mes)}</p>
            </div>
          </div>
        </div>
      )}

      {/* COMISSÕES */}
      {tab === 'comissoes' && (
        comissoes.length === 0 ? (
          <EmptyState icon={CircleDollarSign} title="Nenhuma comissão" description="Comissões são geradas automaticamente quando uma proposta é marcada como 'Pago'." />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Banco</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Valor Emp.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Comissão Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Status Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Agente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Comissão Agente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Status Agente</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {comissoes.map((c: any) => (
                  <tr key={c.id} className="border-b border-surface-50 hover:bg-surface-50/50">
                    <td className="px-4 py-3 font-medium text-surface-900">{c.cliente_nome || '—'}</td>
                    <td className="px-4 py-3 text-surface-500">{c.banco_nome || '—'}</td>
                    <td className="px-4 py-3 text-surface-500">{formatMoney(c.valor_emprestimo)}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatMoney(c.valor_comissao_empresa)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${c.status_empresa === 'recebido' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {c.status_empresa === 'recebido' ? 'Recebido' : 'A Receber'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-500">{c.agente_nome || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-red-500">{c.valor_comissao_agente ? formatMoney(c.valor_comissao_agente) : '—'}</td>
                    <td className="px-4 py-3">
                      {c.agente_id ? (
                        <span className={`badge ${c.status_agente === 'pago' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {c.status_agente === 'pago' ? 'Pago' : 'A Pagar'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {c.status_empresa === 'a_receber' && (
                          <Tooltip content="Marcar comissão como recebida do banco">
                            <button onClick={() => handleReceberComissao(c.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}
                        {c.agente_id && c.status_agente === 'a_pagar' && (
                          <Tooltip content="Marcar comissão do agente como paga">
                            <button onClick={() => handlePagarAgente(c.id)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* RECEITAS */}
      {tab === 'receitas' && <LancamentosTable items={receitas} tipo="receita" onPagar={handlePagarLancamento} />}

      {/* DESPESAS */}
      {tab === 'despesas' && <LancamentosTable items={despesas} tipo="despesa" onPagar={handlePagarLancamento} />}

      {/* Modal novo lançamento */}
      <Modal open={lancamentoModal} onClose={() => setLancamentoModal(false)} title="Novo Lançamento" width="sm" footer={
        <>
          <button onClick={() => setLancamentoModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleCriarLancamento} className="btn-primary">Criar</button>
        </>
      }>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tipo *</label>
              <select value={formLanc.tipo} onChange={e => setFormLanc({ ...formLanc, tipo: e.target.value })} className="input-field">
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Categoria</label>
              <select value={formLanc.categoria} onChange={e => setFormLanc({ ...formLanc, categoria: e.target.value })} className="input-field">
                {CATEGORIAS_DESPESA.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Descrição *</label>
            <input value={formLanc.descricao} onChange={e => setFormLanc({ ...formLanc, descricao: e.target.value })} className="input-field" placeholder="Ex: Aluguel do escritório" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Valor (R$) *</label>
              <input type="number" step="0.01" value={formLanc.valor} onChange={e => setFormLanc({ ...formLanc, valor: e.target.value })} className="input-field" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Vencimento *</label>
              <input type="date" value={formLanc.data_vencimento} onChange={e => setFormLanc({ ...formLanc, data_vencimento: e.target.value })} className="input-field" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function LancamentosTable({ items, tipo, onPagar }: { items: any[]; tipo: string; onPagar: (id: number) => void }) {
  if (items.length === 0) return <EmptyState icon={DollarSign} title={`Nenhuma ${tipo}`} description={tipo === 'receita' ? 'Receitas são geradas ao receber comissões dos bancos.' : 'Cadastre despesas operacionais como aluguel, salários etc.'} />;
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100">
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Descrição</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Categoria</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Valor</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Vencimento</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Status</th>
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((l: any) => (
            <tr key={l.id} className="border-b border-surface-50 hover:bg-surface-50/50">
              <td className="px-4 py-3 font-medium text-surface-900">{l.descricao}</td>
              <td className="px-4 py-3 text-surface-500 capitalize">{l.categoria.replace('_', ' ')}</td>
              <td className={`px-4 py-3 font-semibold ${tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>{formatMoney(l.valor)}</td>
              <td className="px-4 py-3 text-surface-500">{formatDate(l.data_vencimento)}</td>
              <td className="px-4 py-3">
                <span className={`badge ${l.status === 'pago' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {l.status === 'pago' ? 'Pago' : 'Pendente'}
                </span>
              </td>
              <td className="px-4 py-3">
                {l.status === 'pendente' && (
                  <button onClick={() => onPagar(l.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Marcar como pago">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
