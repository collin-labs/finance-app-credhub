import { useState } from 'react';
import { alterarPropriaSenha, gerarNovoRecoveryCode } from '../../lib/api';
import { Usuario } from '../../lib/types';
import { Modal } from '../shared/Modal';
import toast from 'react-hot-toast';
import { Lock, KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';

interface Props {
  currentUser: Usuario;
}

export function MinhaContaConfig({ currentUser }: Props) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const [recoveryModal, setRecoveryModal] = useState(false);
  const [novoCode, setNovoCode] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!senhaAtual || !novaSenha) { toast.error('Preencha os campos'); return; }
    if (novaSenha !== confirmSenha) { toast.error('As senhas não coincidem'); return; }
    if (novaSenha.length < 4) { toast.error('A senha deve ter pelo menos 4 caracteres'); return; }
    setLoading(true);
    try {
      await alterarPropriaSenha(currentUser.id, senhaAtual, novaSenha);
      toast.success('Senha alterada com sucesso');
      setSenhaAtual(''); setNovaSenha(''); setConfirmSenha('');
    } catch (err) { toast.error((err as Error).message); }
    setLoading(false);
  }

  async function handleGerarRecovery() {
    try {
      const code = await gerarNovoRecoveryCode(currentUser.id);
      setNovoCode(code);
      setRecoveryModal(true);
    } catch (err) { toast.error((err as Error).message); }
  }

  function copyCode() {
    navigator.clipboard.writeText(novoCode);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  }

  const isAdmin = currentUser.perfil === 'admin';

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-surface-900">Minha Conta</h3>
        <p className="text-xs text-surface-400 mt-0.5">{currentUser.nome} · {currentUser.login}</p>
      </div>

      {currentUser.senha_temporaria && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Sua senha atual é temporária (definida pelo administrador). Recomendamos alterá-la agora.</p>
        </div>
      )}

      {/* Alterar senha */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-surface-700">Alterar Senha</span>
        </div>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Senha Atual</label>
            <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Nova Senha</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Confirmar</label>
              <input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} className="input-field" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary self-start mt-1">{loading ? 'Alterando...' : 'Alterar Senha'}</button>
        </form>
      </div>

      {/* Código de recuperação (só admin) */}
      {isAdmin && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-surface-700">Código de Recuperação</span>
          </div>
          <p className="text-xs text-surface-500 mb-4">Gere um novo código de recuperação caso tenha perdido o anterior. O código antigo deixará de funcionar.</p>
          <button onClick={handleGerarRecovery} className="btn-secondary text-xs">Gerar Novo Código</button>
        </div>
      )}

      {/* Modal novo recovery code */}
      <Modal open={recoveryModal} onClose={() => setRecoveryModal(false)} title="Novo Código de Recuperação" width="sm" footer={
        <button onClick={() => setRecoveryModal(false)} className="btn-primary">Já anotei</button>
      }>
        <div className="flex flex-col gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Guarde este código em local seguro. Ele não será mostrado novamente e o código anterior foi invalidado.</p>
          </div>
          <div className="bg-surface-900 rounded-lg p-4 flex items-center justify-between">
            <code className="text-lg font-mono font-bold text-white tracking-wider">{novoCode}</code>
            <button onClick={copyCode} className="p-2 rounded-lg hover:bg-surface-700 text-surface-300 hover:text-white">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
