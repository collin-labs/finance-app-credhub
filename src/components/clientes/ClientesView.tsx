import { useState, useEffect, useCallback } from 'react';
import { listarClientes, buscarClientes, excluirCliente, verificarVinculosCliente } from '../../lib/api';
import { ClienteResumo } from '../../lib/types';
import { ClienteForm } from './ClienteForm';
import { EmptyState } from '../shared/EmptyState';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Tooltip } from '../shared/Tooltip';
import { formatCPF, formatMoney } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { Plus, Search, Users, Eye, Pencil, Trash2 } from 'lucide-react';

interface Props {
  onOpenDetalhes?: (id: number) => void;
}

export function ClientesView({ onOpenDetalhes }: Props) {
  const [clientes, setClientes] = useState<ClienteResumo[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClienteResumo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = busca.trim()
        ? await buscarClientes(busca.trim())
        : await listarClientes(100, 0);
      setClientes(data as ClienteResumo[]);
    } catch { /* */ }
    setLoading(false);
  }, [busca]);

  useEffect(() => {
    const timer = setTimeout(load, busca ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, busca]);

  function handleNew() {
    setEditingId(null);
    setFormOpen(true);
  }

  function handleEdit(id: number) {
    setEditingId(id);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      // Verifica vínculos primeiro
      const v = await verificarVinculosCliente(deleteTarget.id) as { pode_excluir: boolean };
      const resultado = await excluirCliente(deleteTarget.id, !v.pode_excluir) as string;
      if (resultado === 'excluido') {
        toast.success('Cliente excluído definitivamente');
      } else {
        toast.success('Cliente desativado (histórico de propostas preservado)');
      }
      load();
    } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-surface-900">Clientes</h2>
          <p className="text-xs text-surface-400 mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} encontrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleNew} className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF, telefone ou matrícula..."
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-surface-400">Carregando...</div>
      ) : clientes.length === 0 ? (
        <EmptyState
          icon={Users}
          title={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={busca ? 'Tente outro termo de busca.' : 'Cadastre o primeiro cliente para começar a operar.'}
          action={!busca ? <button onClick={handleNew} className="btn-primary text-xs">Cadastrar primeiro cliente</button> : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Convênio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Margem Disp.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Propostas</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="font-medium text-surface-900">{c.nome}</span>
                  </td>
                  <td className="px-4 py-3 text-surface-500 font-mono text-xs">{c.cpf ? formatCPF(c.cpf) : '—'}</td>
                  <td className="px-4 py-3 text-surface-500">{c.telefone1 || c.whatsapp || '—'}</td>
                  <td className="px-4 py-3 text-surface-500">{c.convenio_nome || '—'}</td>
                  <td className="px-4 py-3">
                    {c.margem_disponivel != null ? (
                      <span className="text-success-600 font-medium">{formatMoney(c.margem_disponivel)}</span>
                    ) : <span className="text-surface-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-surface-500">{c.total_propostas}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onOpenDetalhes && (
                        <Tooltip content="Ver detalhes do cliente">
                          <button onClick={() => onOpenDetalhes(c.id)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-brand-600">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip content="Editar cliente">
                        <button onClick={() => handleEdit(c.id)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Excluir cliente">
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <ClienteForm
          clienteId={editingId}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Cliente"
        variant="danger"
        icon="trash"
        confirmLabel="Excluir"
        message={<span>Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>?</span>}
        warning="Se o cliente tiver propostas ou comissões, ele será apenas desativado para preservar o histórico. Se não tiver nenhum vínculo, será excluído definitivamente."
      />
    </div>
  );
}
