import { useState, useEffect } from 'react';
import { listarConvenios, criarConvenio, atualizarConvenio } from '../../lib/api';
import { Convenio, ConvenioInput, CONVENIO_TIPOS } from '../../lib/types';
import { Modal } from '../shared/Modal';
import { EmptyState } from '../shared/EmptyState';
import toast from 'react-hot-toast';
import { Plus, Pencil, ScrollText } from 'lucide-react';
import { formatPercent } from '../../lib/formatters';

const TIPOS = Object.entries(CONVENIO_TIPOS);
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function ConveniosConfig() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Convenio | null>(null);
  const [form, setForm] = useState<ConvenioInput>({ nome: '', tipo: 'inss' });

  useEffect(() => { load(); }, []);

  async function load() {
    try { setConvenios(await listarConvenios() as Convenio[]); } catch { /* */ }
  }

  function openNew() {
    setEditing(null);
    setForm({ nome: '', tipo: 'inss', estado: '', orgao: '', margem_maxima: undefined, prazo_maximo: undefined, taxa_teto: undefined, sistema_consulta: '', notas: '' });
    setModalOpen(true);
  }

  function openEdit(c: Convenio) {
    setEditing(c);
    setForm({ nome: c.nome, tipo: c.tipo, estado: c.estado || '', orgao: c.orgao || '', margem_maxima: c.margem_maxima ?? undefined, prazo_maximo: c.prazo_maximo ?? undefined, taxa_teto: c.taxa_teto ?? undefined, sistema_consulta: c.sistema_consulta || '', notas: c.notas || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      if (editing) {
        await atualizarConvenio(editing.id, form);
        toast.success('Convênio atualizado');
      } else {
        await criarConvenio(form);
        toast.success('Convênio cadastrado');
      }
      setModalOpen(false);
      load();
    } catch (err) { toast.error((err as Error).message); }
  }

  const showEstado = form.tipo === 'estadual' || form.tipo === 'municipal';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-surface-900">Convênios</h3>
          <p className="text-xs text-surface-400 mt-0.5">INSS, SEPLAG estaduais, CLT e outros órgãos</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Novo Convênio
        </button>
      </div>

      {convenios.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nenhum convênio cadastrado" description="Cadastre os convênios para vincular clientes e propostas." action={
          <button onClick={openNew} className="btn-primary text-xs">Cadastrar primeiro convênio</button>
        } />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Margem Máx.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Prazo Máx.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Taxa Teto</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {convenios.map(c => (
                <tr key={c.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-surface-900">{c.nome}</td>
                  <td className="px-4 py-3 text-surface-500">{CONVENIO_TIPOS[c.tipo] || c.tipo}</td>
                  <td className="px-4 py-3 text-surface-500">{c.margem_maxima ? formatPercent(c.margem_maxima) : '—'}</td>
                  <td className="px-4 py-3 text-surface-500">{c.prazo_maximo ? `${c.prazo_maximo} meses` : '—'}</td>
                  <td className="px-4 py-3 text-surface-500">{c.taxa_teto ? `${c.taxa_teto}%/mês` : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Convênio' : 'Novo Convênio'} footer={
        <>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar</button>
        </>
      }>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Nome *</label>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input-field" placeholder="Ex: INSS Aposentados" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input-field">
                {TIPOS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </div>
          </div>
          {showEstado && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Estado</label>
                <select value={form.estado || ''} onChange={e => setForm({ ...form, estado: e.target.value })} className="input-field">
                  <option value="">Selecione</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Órgão</label>
                <input value={form.orgao || ''} onChange={e => setForm({ ...form, orgao: e.target.value })} className="input-field" placeholder="Ex: SEPLAG-MG" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Margem Máx. (%)</label>
              <input type="number" step="0.1" value={form.margem_maxima ?? ''} onChange={e => setForm({ ...form, margem_maxima: e.target.value ? parseFloat(e.target.value) : undefined })} className="input-field" placeholder="40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Prazo Máx. (meses)</label>
              <input type="number" value={form.prazo_maximo ?? ''} onChange={e => setForm({ ...form, prazo_maximo: e.target.value ? parseInt(e.target.value) : undefined })} className="input-field" placeholder="84" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Taxa Teto (%/mês)</label>
              <input type="number" step="0.01" value={form.taxa_teto ?? ''} onChange={e => setForm({ ...form, taxa_teto: e.target.value ? parseFloat(e.target.value) : undefined })} className="input-field" placeholder="1.85" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Sistema de Consulta</label>
            <input value={form.sistema_consulta || ''} onChange={e => setForm({ ...form, sistema_consulta: e.target.value })} className="input-field" placeholder="Ex: Meu INSS, SouGov, e-Consig" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Notas</label>
            <textarea value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} className="input-field h-16 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
