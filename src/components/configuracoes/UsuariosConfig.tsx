import { useState, useEffect } from 'react';
import { listarUsuarios, criarUsuario, atualizarUsuario, resetarSenhaUsuario, listarAgentes } from '../../lib/api';
import { Usuario, Agente } from '../../lib/types';
import { MODULOS, PERMISSOES_PADRAO, getPermissoes } from '../../lib/permissions';
import { Modal } from '../shared/Modal';
import { EmptyState } from '../shared/EmptyState';
import { formatDate } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { Plus, Pencil, Users2, KeyRound, Shield, Eye, EyeOff } from 'lucide-react';

interface Props {
  currentUser: Usuario;
}

const PERFIL_LABEL: Record<string, string> = { admin: 'Administrador', gerente: 'Gerente', agente: 'Agente' };

export function UsuariosConfig({ currentUser }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [resetTarget, setResetTarget] = useState<Usuario | null>(null);
  const [novaSenhaReset, setNovaSenhaReset] = useState('');

  const [form, setForm] = useState({
    nome: '', login: '', senha: '', perfil: 'agente',
    permissoes: [] as string[], ver_todos_dados: false, agente_id: '' as string,
    ativo: true,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setUsuarios(await listarUsuarios() as Usuario[]);
      setAgentes(await listarAgentes() as Agente[]);
    } catch { /* */ }
  }

  function openNew() {
    setEditing(null);
    setForm({ nome: '', login: '', senha: '', perfil: 'agente', permissoes: [...PERMISSOES_PADRAO.agente], ver_todos_dados: false, agente_id: '', ativo: true });
    setModalOpen(true);
  }

  function openEdit(u: Usuario) {
    setEditing(u);
    setForm({
      nome: u.nome, login: u.login, senha: '', perfil: u.perfil,
      permissoes: getPermissoes(u.perfil, u.permissoes),
      ver_todos_dados: u.ver_todos_dados,
      agente_id: u.agente_id ? String(u.agente_id) : '',
      ativo: u.ativo,
    });
    setModalOpen(true);
  }

  function onPerfilChange(perfil: string) {
    setForm(f => ({ ...f, perfil, permissoes: [...(PERMISSOES_PADRAO[perfil] || [])] }));
  }

  function toggleModulo(id: string) {
    setForm(f => ({
      ...f,
      permissoes: f.permissoes.includes(id) ? f.permissoes.filter(p => p !== id) : [...f.permissoes, id],
    }));
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!editing && (!form.login.trim() || !form.senha.trim())) { toast.error('Login e senha são obrigatórios'); return; }

    try {
      const permissoesJson = form.perfil === 'admin' ? null : JSON.stringify(form.permissoes);
      if (editing) {
        await atualizarUsuario({
          id: editing.id, nome: form.nome, perfil: form.perfil,
          permissoes: permissoesJson, ver_todos_dados: form.ver_todos_dados,
          agente_id: form.agente_id ? parseInt(form.agente_id) : null, ativo: form.ativo,
        });
        toast.success('Usuário atualizado');
      } else {
        await criarUsuario({
          nome: form.nome, login: form.login.trim().toLowerCase(), senha: form.senha,
          perfil: form.perfil, permissoes: permissoesJson,
          ver_todos_dados: form.ver_todos_dados,
          agente_id: form.agente_id ? parseInt(form.agente_id) : null,
        });
        toast.success('Usuário criado');
      }
      setModalOpen(false);
      load();
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleReset() {
    if (!resetTarget || !novaSenhaReset.trim()) { toast.error('Digite a nova senha'); return; }
    try {
      await resetarSenhaUsuario(resetTarget.id, novaSenhaReset, currentUser.id);
      toast.success(`Senha de ${resetTarget.nome} resetada`);
      setResetTarget(null);
      setNovaSenhaReset('');
    } catch (err) { toast.error((err as Error).message); }
  }

  const isAdmin = currentUser.perfil === 'admin';

  if (!isAdmin) {
    return <EmptyState icon={Shield} title="Acesso restrito" description="Apenas administradores podem gerenciar usuários." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-surface-900">Usuários do Sistema</h3>
          <p className="text-xs text-surface-400 mt-0.5">Gerencie quem acessa o sistema e o que cada um pode ver</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Novo Usuário
        </button>
      </div>

      {usuarios.length === 0 ? (
        <EmptyState icon={Users2} title="Nenhum usuário" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Login</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Perfil</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Vê dados</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Criado</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-surface-50 hover:bg-surface-50/50">
                  <td className="px-4 py-3 font-medium text-surface-900">
                    {u.nome}
                    {u.id === currentUser.id && <span className="ml-2 text-2xs text-brand-600">(você)</span>}
                  </td>
                  <td className="px-4 py-3 text-surface-500 font-mono text-xs">{u.login}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.perfil === 'admin' ? 'bg-purple-50 text-purple-700' : u.perfil === 'gerente' ? 'bg-blue-50 text-blue-700' : 'bg-surface-100 text-surface-600'}`}>
                      {PERFIL_LABEL[u.perfil]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-500">{u.ver_todos_dados ? 'Todos' : 'Próprios'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.ativo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-400 text-xs">{formatDate(u.criado_em)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== currentUser.id && (
                        <button onClick={() => setResetTarget(u)} className="p-1.5 rounded-lg hover:bg-amber-50 text-surface-400 hover:text-amber-600" title="Resetar senha">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar usuário */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Usuário' : 'Novo Usuário'} width="lg" footer={
        <>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Nome *</label>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input-field" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Login *</label>
              <input value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} className="input-field" disabled={!!editing} placeholder={editing ? '(não editável)' : 'login de acesso'} />
            </div>
          </div>

          {!editing && (
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Senha *</label>
              <input type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} className="input-field" placeholder="Senha inicial" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Perfil *</label>
              <select value={form.perfil} onChange={e => onPerfilChange(e.target.value)} className="input-field">
                <option value="agente">Agente</option>
                <option value="gerente">Gerente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {editing && (
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Status</label>
                <select value={form.ativo ? '1' : '0'} onChange={e => setForm({ ...form, ativo: e.target.value === '1' })} className="input-field">
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </select>
              </div>
            )}
          </div>

          {/* Vínculo com agente */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Vincular a um agente (opcional)</label>
            <select value={form.agente_id} onChange={e => setForm({ ...form, agente_id: e.target.value })} className="input-field">
              <option value="">Nenhum</option>
              {agentes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <p className="text-2xs text-surface-400 mt-1">Vincule se este usuário é um agente — usado para filtrar "só os próprios dados".</p>
          </div>

          {form.perfil === 'admin' ? (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex gap-2">
              <Shield className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-700">Administradores têm acesso total a todos os módulos e dados. Permissões não se aplicam.</p>
            </div>
          ) : (
            <>
              {/* Ver todos os dados */}
              <div className="bg-surface-50 rounded-lg p-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    {form.ver_todos_dados ? <Eye className="w-4 h-4 text-brand-600" /> : <EyeOff className="w-4 h-4 text-surface-400" />}
                    <div>
                      <p className="text-sm font-medium text-surface-700">Ver todos os dados</p>
                      <p className="text-2xs text-surface-400">Se desligado, vê apenas os clientes e propostas vinculados a ele.</p>
                    </div>
                  </div>
                  <input type="checkbox" checked={form.ver_todos_dados} onChange={e => setForm({ ...form, ver_todos_dados: e.target.checked })} />
                </label>
              </div>

              {/* Permissões por módulo */}
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-2">Módulos que pode acessar</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODULOS.map(m => {
                    const checked = form.permissoes.includes(m.id);
                    return (
                      <label key={m.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${checked ? 'border-brand-300 bg-brand-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleModulo(m.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-surface-700">{m.label}</span>
                            {m.sensivel && <span className="text-2xs text-amber-600">●</span>}
                          </div>
                          <p className="text-2xs text-surface-400 truncate">{m.descricao}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-2xs text-surface-400 mt-2"><span className="text-amber-600">●</span> Módulos sensíveis (financeiro, comissões). Cuidado ao liberar para agentes.</p>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal resetar senha */}
      <Modal open={!!resetTarget} onClose={() => { setResetTarget(null); setNovaSenhaReset(''); }} title="Resetar Senha" width="sm" footer={
        <>
          <button onClick={() => { setResetTarget(null); setNovaSenhaReset(''); }} className="btn-secondary">Cancelar</button>
          <button onClick={handleReset} className="btn-primary">Resetar Senha</button>
        </>
      }>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-surface-600">Defina uma nova senha para <strong>{resetTarget?.nome}</strong>. O usuário deverá trocá-la no próximo acesso.</p>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Nova Senha *</label>
            <input type="text" value={novaSenhaReset} onChange={e => setNovaSenhaReset(e.target.value)} className="input-field" placeholder="Senha temporária" autoFocus />
          </div>
        </div>
      </Modal>
    </div>
  );
}
