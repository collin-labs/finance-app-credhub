import { useState, useEffect, useCallback } from 'react';
import { listarPropostas, atualizarStatusProposta } from '../../lib/api';
import { Proposta, PropostaStatus, STATUS_LABELS } from '../../lib/types';
import { PropostaForm } from './PropostaForm';
import { StatusBadge } from '../shared/StatusBadge';
import { EmptyState } from '../shared/EmptyState';
import { Modal } from '../shared/Modal';
import { formatMoney, formatDate, formatPercent } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { Plus, List, LayoutGrid, FileText, ArrowRight } from 'lucide-react';

type ViewMode = 'lista' | 'kanban';

const KANBAN_COLUMNS: PropostaStatus[] = ['digitado', 'pendente', 'em_analise', 'aprovado', 'aguardando_anuencia', 'averbado', 'pago'];
const KANBAN_COLORS: Record<string, string> = {
  digitado: 'border-t-surface-400', pendente: 'border-t-amber-400', em_analise: 'border-t-cyan-400',
  aprovado: 'border-t-blue-400', aguardando_anuencia: 'border-t-purple-400', averbado: 'border-t-emerald-400', pago: 'border-t-green-500',
};

export function PropostasView() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<Proposta | null>(null);
  const [novoStatus, setNovoStatus] = useState<PropostaStatus>('digitado');
  const [obsStatus, setObsStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setPropostas(await listarPropostas(undefined, 200) as Proposta[]); } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openStatusChange(p: Proposta) {
    setStatusModal(p);
    setNovoStatus(p.status);
    setObsStatus('');
  }

  async function handleStatusChange() {
    if (!statusModal || novoStatus === statusModal.status) return;
    try {
      await atualizarStatusProposta({ proposta_id: statusModal.id, novo_status: novoStatus, observacao: obsStatus || undefined });
      toast.success(`Status alterado para ${STATUS_LABELS[novoStatus]}`);
      setStatusModal(null);
      load();
    } catch (err) { toast.error((err as Error).message); }
  }

  const byStatus = (status: PropostaStatus) => propostas.filter(p => p.status === status);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-surface-900">Esteira de Propostas</h2>
          <p className="text-xs text-surface-400 mt-0.5">{propostas.length} proposta{propostas.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-400'}`} title="Kanban">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('lista')} className={`p-1.5 rounded-md transition-all ${viewMode === 'lista' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-400'}`} title="Lista">
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setFormOpen(true)} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Nova Proposta
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-surface-400">Carregando...</div>
      ) : propostas.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhuma proposta" description="Crie a primeira proposta para começar a acompanhar a esteira." action={
          <button onClick={() => setFormOpen(true)} className="btn-primary text-xs">Criar primeira proposta</button>
        } />
      ) : viewMode === 'kanban' ? (
        /* KANBAN VIEW */
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 h-full min-w-max pb-2">
            {KANBAN_COLUMNS.map(status => {
              const items = byStatus(status);
              return (
                <div key={status} className="w-64 flex flex-col shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-semibold text-surface-600">{STATUS_LABELS[status]}</span>
                    <span className="text-2xs font-medium text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className={`flex-1 bg-surface-100/50 rounded-lg p-2 space-y-2 overflow-y-auto border-t-2 ${KANBAN_COLORS[status] || 'border-t-surface-300'}`}>
                    {items.map(p => (
                      <div key={p.id} onClick={() => openStatusChange(p)} className="card p-3 cursor-pointer hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-surface-900 truncate">{p.cliente_nome || `Cliente #${p.cliente_id}`}</p>
                        <p className="text-2xs text-surface-500 mt-0.5">{p.banco_nome} · {p.produto_nome}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-bold text-brand-700">{formatMoney(p.valor_emprestimo)}</span>
                          <span className="text-2xs text-surface-400">{p.quantidade_parcelas}x {formatMoney(p.valor_parcela)}</span>
                        </div>
                        {p.numero_proposta && <p className="text-2xs text-surface-400 mt-1 font-mono">#{p.numero_proposta}</p>}
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-2xs text-surface-400 text-center py-4">Vazio</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Banco</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Parcela</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Taxa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Data</th>
              </tr>
            </thead>
            <tbody>
              {propostas.map(p => (
                <tr key={p.id} onClick={() => openStatusChange(p)} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-surface-900">{p.cliente_nome || `#${p.cliente_id}`}</td>
                  <td className="px-4 py-3 text-surface-500">{p.banco_nome}</td>
                  <td className="px-4 py-3 text-surface-500">{p.produto_nome}</td>
                  <td className="px-4 py-3 font-medium text-surface-900">{formatMoney(p.valor_emprestimo)}</td>
                  <td className="px-4 py-3 text-surface-500">{p.quantidade_parcelas}x {formatMoney(p.valor_parcela)}</td>
                  <td className="px-4 py-3 text-surface-500">{formatPercent(p.taxa_juros)}/mês</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-surface-400 text-xs">{formatDate(p.data_digitacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {formOpen && <PropostaForm onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />}

      {/* Status change modal */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Alterar Status da Proposta" width="sm" footer={
        <>
          <button onClick={() => setStatusModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleStatusChange} className="btn-primary" disabled={!statusModal || novoStatus === statusModal?.status}>Confirmar</button>
        </>
      }>
        {statusModal && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-surface-500">Cliente:</span>
              <span className="font-medium">{statusModal.cliente_nome}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-surface-500">Valor:</span>
              <span className="font-bold text-brand-700">{formatMoney(statusModal.valor_emprestimo)}</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={statusModal.status} size="md" />
              <ArrowRight className="w-4 h-4 text-surface-400" />
              <select value={novoStatus} onChange={e => setNovoStatus(e.target.value as PropostaStatus)} className="input-field flex-1">
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Observação</label>
              <textarea value={obsStatus} onChange={e => setObsStatus(e.target.value)} className="input-field h-16 resize-none" placeholder="Motivo da mudança (opcional)" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
