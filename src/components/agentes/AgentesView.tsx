import { useState, useEffect } from 'react';
import { listarAgentes, criarAgente, atualizarAgente, verificarVinculosAgente, excluirAgente } from '../../lib/api';
import { Agente, AgenteInput } from '../../lib/types';
import { Modal } from '../shared/Modal';
import { Tooltip } from '../shared/Tooltip';
import { EmptyState } from '../shared/EmptyState';
import { formatCPF, formatPhone, stripNonDigits } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { Plus, Pencil, UserCheck, Trash2, AlertTriangle } from 'lucide-react';

interface Vinculos {
  usuarios: number;
  propostas: number;
  comissoes: number;
  clientes: number;
  leads: number;
  total: number;
  pode_excluir: boolean;
}

const TIPOS = [
  { value: 'interno', label: 'Interno' },
  { value: 'externo', label: 'Externo' },
  { value: 'sub_correspondente', label: 'Sub-Correspondente' },
];

export function AgentesView() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agente | null>(null);
  const [form, setForm] = useState<AgenteInput>({ nome: '', tipo: 'interno' });

  // Exclusão
  const [deleteTarget, setDeleteTarget] = useState<Agente | null>(null);
  const [vinculos, setVinculos] = useState<Vinculos | null>(null);
  const [vinculosModalOpen, setVinculosModalOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setAgentes(await listarAgentes() as Agente[]); } catch { /* */ }
  }

  async function iniciarExclusao(a: Agente) {
    setDeleteTarget(a);
    try {
      const v = await verificarVinculosAgente(a.id) as Vinculos;
      setVinculos(v);
      setVinculosModalOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
      setDeleteTarget(null);
    }
  }

  async function confirmarExclusao() {
    if (!deleteTarget || !vinculos) return;
    try {
      // Se tem vínculos, desativa; senão, exclui de vez
      const resultado = await excluirAgente(deleteTarget.id, !vinculos.pode_excluir) as string;
      if (resultado === 'excluido') {
        toast.success(`Agente "${deleteTarget.nome}" excluído`);
      } else {
        toast.success(`Agente "${deleteTarget.nome}" desativado (histórico preservado)`);
      }
      setVinculosModalOpen(false);
      setDeleteTarget(null);
      setVinculos(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ nome: '', tipo: 'interno', cpf: '', telefone: '', whatsapp: '', email: '', pix: '', observacoes: '' });
    setModalOpen(true);
  }

  function openEdit(a: Agente) {
    setEditing(a);
    setForm({ nome: a.nome, tipo: a.tipo, cpf: a.cpf || '', telefone: a.telefone || '', whatsapp: a.whatsapp || '', email: a.email || '', pix: a.pix || '', observacoes: a.observacoes || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      const data = { ...form, cpf: form.cpf ? stripNonDigits(form.cpf) : undefined, telefone: form.telefone ? stripNonDigits(form.telefone) : undefined, whatsapp: form.whatsapp ? stripNonDigits(form.whatsapp) : undefined };
      if (editing) {
        await atualizarAgente(editing.id, data);
        toast.success('Agente atualizado');
      } else {
        await criarAgente(data);
        toast.success('Agente cadastrado');
      }
      setModalOpen(false);
      load();
    } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-surface-900">Agentes e Corretores</h2>
          <p className="text-xs text-surface-400 mt-0.5">{agentes.length} agente{agentes.length !== 1 ? 's' : ''} cadastrado{agentes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Novo Agente
        </button>
      </div>

      {agentes.length === 0 ? (
        <EmptyState icon={UserCheck} title="Nenhum agente cadastrado" description="Cadastre os agentes e corretores que trazem propostas. As comissões serão calculadas automaticamente." action={
          <button onClick={openNew} className="btn-primary text-xs">Cadastrar primeiro agente</button>
        } />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">PIX</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {agentes.map(a => (
                <tr key={a.id} className="border-b border-surface-50 hover:bg-surface-50/50">
                  <td className="px-4 py-3 font-medium text-surface-900">{a.nome}</td>
                  <td className="px-4 py-3"><span className="badge bg-brand-50 text-brand-700">{TIPOS.find(t => t.value === a.tipo)?.label || a.tipo}</span></td>
                  <td className="px-4 py-3 text-surface-500 font-mono text-xs">{a.cpf ? formatCPF(a.cpf) : '—'}</td>
                  <td className="px-4 py-3 text-surface-500">{a.telefone ? formatPhone(a.telefone) : '—'}</td>
                  <td className="px-4 py-3 text-surface-500">{a.whatsapp ? formatPhone(a.whatsapp) : '—'}</td>
                  <td className="px-4 py-3 text-surface-500 text-xs">{a.pix || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Tooltip content="Editar agente">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Excluir agente">
                        <button onClick={() => iniciarExclusao(a)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Agente' : 'Novo Agente'} footer={
        <>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar</button>
        </>
      }>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Nome *</label>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input-field" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input-field">
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">CPF</label>
              <input value={form.cpf ? formatCPF(form.cpf) : ''} onChange={e => setForm({ ...form, cpf: stripNonDigits(e.target.value).slice(0, 11) })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">E-mail</label>
              <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Telefone</label>
              <input value={form.telefone ? formatPhone(form.telefone) : ''} onChange={e => setForm({ ...form, telefone: stripNonDigits(e.target.value) })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">WhatsApp</label>
              <input value={form.whatsapp ? formatPhone(form.whatsapp) : ''} onChange={e => setForm({ ...form, whatsapp: stripNonDigits(e.target.value) })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">PIX</label>
            <input value={form.pix || ''} onChange={e => setForm({ ...form, pix: e.target.value })} className="input-field" placeholder="CPF, telefone, e-mail ou chave aleatória" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Observações</label>
            <textarea value={form.observacoes || ''} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="input-field h-16 resize-none" />
          </div>
        </div>
      </Modal>

      {/* Modal de vínculos — exclusão inteligente */}
      <Modal
        open={vinculosModalOpen}
        onClose={() => { setVinculosModalOpen(false); setDeleteTarget(null); setVinculos(null); }}
        title={vinculos?.pode_excluir ? 'Excluir Agente' : 'Agente com Vínculos'}
        width="sm"
        footer={
          <>
            <button onClick={() => { setVinculosModalOpen(false); setDeleteTarget(null); setVinculos(null); }} className="btn-secondary">Cancelar</button>
            <button onClick={confirmarExclusao} className={vinculos?.pode_excluir ? 'btn-danger' : 'btn-primary'}>
              {vinculos?.pode_excluir ? 'Excluir Definitivamente' : 'Desativar Agente'}
            </button>
          </>
        }
      >
        {vinculos && deleteTarget && (
          <div>
            {vinculos.pode_excluir ? (
              // Sem vínculos: pode excluir de vez
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-sm text-surface-600">
                  <p>O agente <strong>{deleteTarget.nome}</strong> não tem nenhum vínculo no sistema.</p>
                  <p className="mt-2">Ele pode ser <strong>excluído definitivamente</strong>. Esta ação não pode ser desfeita.</p>
                </div>
              </div>
            ) : (
              // Com vínculos: só pode desativar
              <div>
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-sm text-surface-600">
                    <p>O agente <strong>{deleteTarget.nome}</strong> está vinculado a registros importantes e <strong>não pode ser excluído</strong> para não quebrar o histórico.</p>
                  </div>
                </div>

                {/* Lista de vínculos */}
                <div className="bg-surface-50 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-surface-600 mb-2">Vínculos encontrados:</p>
                  <div className="space-y-1.5">
                    {vinculos.usuarios > 0 && <VinculoLinha label="Usuário(s) do sistema" valor={vinculos.usuarios} destaque />}
                    {vinculos.propostas > 0 && <VinculoLinha label="Proposta(s)" valor={vinculos.propostas} />}
                    {vinculos.comissoes > 0 && <VinculoLinha label="Comissão(ões)" valor={vinculos.comissoes} />}
                    {vinculos.clientes > 0 && <VinculoLinha label="Cliente(s)" valor={vinculos.clientes} />}
                    {vinculos.leads > 0 && <VinculoLinha label="Lead(s)" valor={vinculos.leads} />}
                  </div>
                </div>

                {vinculos.usuarios > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-amber-700">⚠️ Este agente está vinculado a um usuário que faz login no sistema. Desative com cuidado.</p>
                  </div>
                )}

                <p className="text-sm text-surface-600">
                  Em vez de excluir, você pode <strong>desativá-lo</strong>. Ele sairá da lista e não poderá receber novas propostas, mas todo o histórico fica preservado.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function VinculoLinha({ label, valor, destaque }: { label: string; valor: number; destaque?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={destaque ? 'text-amber-700 font-medium' : 'text-surface-500'}>{label}</span>
      <span className={`font-bold ${destaque ? 'text-amber-700' : 'text-surface-700'}`}>{valor}</span>
    </div>
  );
}
