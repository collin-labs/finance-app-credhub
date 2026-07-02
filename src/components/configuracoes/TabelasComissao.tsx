import { useState, useEffect } from 'react';
import { listarTabelasComissao, criarTabelaComissao, excluirTabelaComissao, listarBancos, listarConvenios } from '../../lib/api';
import { Banco, Convenio } from '../../lib/types';
import { Modal } from '../shared/Modal';
import { EmptyState } from '../shared/EmptyState';
import { formatPercent } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { Plus, Trash2, Percent } from 'lucide-react';

const PRODUTOS = [
  { id: 1, label: 'Consignado Novo' }, { id: 2, label: 'Refinanciamento' },
  { id: 3, label: 'Portabilidade' }, { id: 4, label: 'Cartão Consignado' },
  { id: 5, label: 'Cartão Benefício' }, { id: 6, label: 'Antecipação FGTS' },
  { id: 7, label: 'Empréstimo Pessoal' }, { id: 8, label: 'Seguro Prestamista' },
];

export function TabelasComissao() {
  const [tabelas, setTabelas] = useState<any[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ banco_id: '', produto_id: '1', convenio_id: '', comissao_empresa_percentual: '', comissao_agente_percentual: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    listarTabelasComissao().then(t => setTabelas(t as any[])).catch(() => {});
    listarBancos().then(b => setBancos(b as Banco[])).catch(() => {});
    listarConvenios().then(c => setConvenios(c as Convenio[])).catch(() => {});
  }

  async function handleSave() {
    if (!form.banco_id || !form.produto_id) { toast.error('Selecione banco e produto'); return; }
    try {
      await criarTabelaComissao({
        banco_id: parseInt(form.banco_id), produto_id: parseInt(form.produto_id),
        convenio_id: form.convenio_id ? parseInt(form.convenio_id) : null,
        comissao_empresa_percentual: form.comissao_empresa_percentual ? parseFloat(form.comissao_empresa_percentual) : null,
        comissao_agente_percentual: form.comissao_agente_percentual ? parseFloat(form.comissao_agente_percentual) : null,
      });
      toast.success('Tabela de comissão cadastrada');
      setModalOpen(false);
      setForm({ banco_id: '', produto_id: '1', convenio_id: '', comissao_empresa_percentual: '', comissao_agente_percentual: '' });
      load();
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleDelete(id: number) {
    try { await excluirTabelaComissao(id); toast.success('Tabela removida'); load(); }
    catch (err) { toast.error((err as Error).message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-surface-900">Tabelas de Comissão</h3>
          <p className="text-xs text-surface-400 mt-0.5">Percentual de comissão por banco × produto × convênio. Usado no cálculo automático ao pagar propostas.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Nova Tabela
        </button>
      </div>

      {tabelas.length === 0 ? (
        <EmptyState icon={Percent} title="Nenhuma tabela de comissão" description="Cadastre as tabelas para que as comissões sejam calculadas automaticamente quando uma proposta é paga. Sem tabela, o sistema usa 5% empresa / 2% agente como padrão." action={
          <button onClick={() => setModalOpen(true)} className="btn-primary text-xs">Cadastrar tabela</button>
        } />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Banco</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Convênio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">% Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">% Agente</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {tabelas.map((t: any) => (
                <tr key={t.id} className="border-b border-surface-50 hover:bg-surface-50/50">
                  <td className="px-4 py-3 font-medium text-surface-900">{t.banco_nome}</td>
                  <td className="px-4 py-3 text-surface-500">{t.produto_nome}</td>
                  <td className="px-4 py-3 text-surface-500">{t.convenio_nome || 'Todos'}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">{t.comissao_empresa_percentual != null ? formatPercent(t.comissao_empresa_percentual) : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{t.comissao_agente_percentual != null ? formatPercent(t.comissao_agente_percentual) : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Tabela de Comissão" width="sm" footer={
        <>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar</button>
        </>
      }>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Banco *</label>
            <select value={form.banco_id} onChange={e => setForm({ ...form, banco_id: e.target.value })} className="input-field">
              <option value="">Selecione</option>
              {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Produto *</label>
            <select value={form.produto_id} onChange={e => setForm({ ...form, produto_id: e.target.value })} className="input-field">
              {PRODUTOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Convênio (opcional — vazio = vale pra todos)</label>
            <select value={form.convenio_id} onChange={e => setForm({ ...form, convenio_id: e.target.value })} className="input-field">
              <option value="">Todos</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">% Comissão Empresa</label>
              <input type="number" step="0.1" value={form.comissao_empresa_percentual} onChange={e => setForm({ ...form, comissao_empresa_percentual: e.target.value })} className="input-field" placeholder="Ex: 5.0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">% Comissão Agente</label>
              <input type="number" step="0.1" value={form.comissao_agente_percentual} onChange={e => setForm({ ...form, comissao_agente_percentual: e.target.value })} className="input-field" placeholder="Ex: 2.0" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
