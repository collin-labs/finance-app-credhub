import { useState } from 'react';
import { setupAdmin } from '../../lib/api';
import { Usuario } from '../../lib/types';
import toast from 'react-hot-toast';
import { Shield, ArrowRight, Copy, Check, AlertTriangle, KeyRound } from 'lucide-react';

interface Props {
  onComplete: (user: Usuario) => void;
}

interface SetupResult {
  usuario: Usuario;
  recovery_code: string;
}

export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState<'form' | 'recovery'>('form');
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaConfirm, setSenhaConfirm] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [createdUser, setCreatedUser] = useState<Usuario | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !login.trim() || !senha.trim()) { toast.error('Preencha todos os campos obrigatórios'); return; }
    if (senha !== senhaConfirm) { toast.error('As senhas não coincidem'); return; }
    if (senha.length < 4) { toast.error('A senha deve ter pelo menos 4 caracteres'); return; }

    setLoading(true);
    try {
      const result = await setupAdmin({
        nome: nome.trim(), login: login.trim().toLowerCase(), senha,
        empresa_nome: empresaNome.trim() || undefined,
      }) as SetupResult;
      setCreatedUser(result.usuario);
      setRecoveryCode(result.recovery_code);
      setStep('recovery');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  }

  function finish() {
    if (!confirmed) { toast.error('Confirme que guardou o código de recuperação'); return; }
    if (createdUser) onComplete(createdUser);
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-surface-950 to-brand-950 overflow-y-auto py-8">
      <div className="w-full max-w-md mx-4 animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{step === 'form' ? 'Configuração Inicial' : 'Código de Recuperação'}</h1>
          <p className="text-surface-400 text-sm mt-1">{step === 'form' ? 'Configure o administrador do sistema' : 'Guarde este código em local seguro'}</p>
        </div>

        {step === 'form' ? (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-surface-100">
              <Shield className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-medium text-surface-700">Dados do Administrador</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Nome da Empresa</label>
                <input type="text" value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} placeholder="Aparece nos relatórios (opcional)" className="input-field" />
              </div>
              <div className="h-px bg-surface-100" />
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Seu Nome *</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className="input-field" required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Login *</label>
                <input type="text" value={login} onChange={e => setLogin(e.target.value)} placeholder="Login de acesso (ex: admin)" className="input-field" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1.5">Senha *</label>
                  <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mín. 4 caracteres" className="input-field" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1.5">Confirmar *</label>
                  <input type="password" value={senhaConfirm} onChange={e => setSenhaConfirm(e.target.value)} placeholder="Repita a senha" className="input-field" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary mt-2 flex items-center justify-center gap-2">
                {loading ? 'Configurando...' : (<>Continuar <ArrowRight className="w-4 h-4" /></>)}
              </button>
            </form>
          </div>
        ) : (
          <div className="card p-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Anote este código agora!</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Se você esquecer sua senha, este é o <strong>único</strong> jeito de recuperar o acesso de administrador.
                  Guarde em local seguro (papel, gerenciador de senhas). Ele não será mostrado novamente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-medium text-surface-600">Seu código de recuperação</span>
            </div>

            <div className="bg-surface-900 rounded-lg p-4 mb-4 flex items-center justify-between">
              <code className="text-lg font-mono font-bold text-white tracking-wider">{recoveryCode}</code>
              <button onClick={copyCode} className="p-2 rounded-lg hover:bg-surface-700 text-surface-300 hover:text-white transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <label className="flex items-start gap-2 mb-5 cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5" />
              <span className="text-xs text-surface-600">Confirmo que anotei e guardei o código de recuperação em local seguro.</span>
            </label>

            <button onClick={finish} disabled={!confirmed} className="btn-primary w-full flex items-center justify-center gap-2">
              Acessar o CredHub <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
