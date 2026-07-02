import { useState, useEffect } from 'react';
import { listarBancos, criarBanco, atualizarBanco } from '../../lib/api';
import { Banco, BancoInput } from '../../lib/types';
import { Modal } from '../shared/Modal';
import { EmptyState } from '../shared/EmptyState';
import toast from 'react-hot-toast';
import { Plus, Pencil, Building2 } from 'lucide-react';

export function BancosConfig() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Banco | null>(null);
  const [form, setForm] = useState<BancoInput>({ nome: '', codigo: '', contato: '', notas: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    try { setBancos(await listarBancos() as Banco[]); } catch { /* */ }
  }

  function openNew() {
    setEditing(null);
    setForm({ nome: '', codigo: '', contato: '', notas: '' });
    setModalOpen(true);
  }

  function openEdit(b: Banco) {
    setEditing(b);
    setForm({ nome: b.nome, codigo: b.codigo || '', contato: b.contato || '', notas: b.notas || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      if (editing) {
        await atualizarBanco(editing.id, form);
        toast.success('Banco atualizado');
      } else {
        await criarBanco(form);
        toast.success('Banco cadastrado');
      }
      setModalOpen(false);
      load();
    } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-surface-900">Bancos Parceiros</h3>
          <p className="text-xs text-surface-400 mt-0.5">Bancos onde a empresa tem convênio para operar</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Novo Banco
        </button>
      </div>

      {bancos.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhum banco cadastrado" description="Cadastre os bancos parceiros para poder criar propostas." action={
          <button onClick={openNew} className="btn-primary text-xs">Cadastrar primeiro banco</button>
        } />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Código</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Contato</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {bancos.map(b => (
                <tr key={b.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-surface-900">{b.nome}</td>
                  <td className="px-4 py-3 text-surface-500">{b.codigo || '—'}</td>
                  <td className="px-4 py-3 text-surface-500">{b.contato || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Banco' : 'Novo Banco'} width="sm" footer={
        <>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar</button>
        </>
      }>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Nome *</label>
            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input-field" placeholder="Ex: Banco PAN" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Código FEBRABAN</label>
            <input value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value })} className="input-field" placeholder="Ex: 623" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Contato</label>
            <input value={form.contato || ''} onChange={e => setForm({ ...form, contato: e.target.value })} className="input-field" placeholder="Telefone ou e-mail do gerente" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Notas</label>
            <textarea value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} className="input-field h-20 resize-none" placeholder="Observações" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
