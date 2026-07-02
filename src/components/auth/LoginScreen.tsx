import { useState } from 'react';
import { login as doLogin, recuperarSenhaAdmin } from '../../lib/api';
import { Usuario } from '../../lib/types';
import { useEmpresa } from '../../contexts/EmpresaContext';
import toast from 'react-hot-toast';
import { LogIn, KeyRound, ArrowLeft } from 'lucide-react';

interface Props {
  onLogin: (user: Usuario) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const { empresa, nomeExibicao } = useEmpresa();
  const [mode, setMode] = useState<'login' | 'recovery'>('login');
  const [loginVal, setLoginVal] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery
  const [recLogin, setRecLogin] = useState('');
  const [recCode, setRecCode] = useState('');
  const [recNovaSenha, setRecNovaSenha] = useState('');
  const [recConfirm, setRecConfirm] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginVal.trim() || !senha.trim()) { toast.error('Preencha login e senha'); return; }
    setLoading(true);
    try {
      const user = await doLogin({ login: loginVal.trim().toLowerCase(), senha }) as Usuario;
      if (user.senha_temporaria) {
        toast('Sua senha é temporária. Altere-a nas configurações.', { icon: '🔑', duration: 5000 });
      }
      toast.success(`Bem-vindo, ${user.nome}!`);
      onLogin(user);
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!recLogin.trim() || !recCode.trim() || !recNovaSenha.trim()) { toast.error('Preencha todos os campos'); return; }
    if (recNovaSenha !== recConfirm) { toast.error('As senhas não coincidem'); return; }
    if (recNovaSenha.length < 4) { toast.error('A senha deve ter pelo menos 4 caracteres'); return; }
    setLoading(true);
    try {
      await recuperarSenhaAdmin(recLogin.trim().toLowerCase(), recCode, recNovaSenha);
      toast.success('Senha redefinida! Faça login com a nova senha.');
      setMode('login');
      setLoginVal(recLogin);
      setSenha('');
      setRecLogin(''); setRecCode(''); setRecNovaSenha(''); setRecConfirm('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-surface-950 to-brand-950 overflow-y-auto py-8">
      <div className="w-full max-w-sm mx-4 animate-scale-in">
        <div className="text-center mb-8">
          {empresa.modo_exibicao === 'logo' && empresa.logo_horizontal ? (
            <img src={empresa.logo_horizontal} alt={nomeExibicao} className="h-16 max-w-[280px] object-contain mx-auto mb-4" />
          ) : empresa.logo ? (
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center mx-auto mb-4 bg-white/10">
              <img src={empresa.logo} alt={nomeExibicao} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: empresa.cor_primaria || '#2563eb' }}>
              <span className="text-white text-xl font-bold">{nomeExibicao.charAt(0).toUpperCase()}</span>
            </div>
          )}
          {/* Quando mostra logo horizontal, não repete o nome em texto grande */}
          {!(empresa.modo_exibicao === 'logo' && empresa.logo_horizontal) && (
            <h1 className="text-2xl font-bold text-white">{nomeExibicao}</h1>
          )}
          <p className="text-surface-400 text-sm mt-1">{empresa.slogan || 'Gestão de Crédito Consignado'}</p>
        </div>

        {mode === 'login' ? (
          <div className="card p-6">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Login</label>
                <input type="text" value={loginVal} onChange={e => setLoginVal(e.target.value)} placeholder="Seu login" className="input-field" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1.5">Senha</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" className="input-field" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                {loading ? 'Entrando...' : (<><LogIn className="w-4 h-4" /> Entrar</>)}
              </button>
            </form>
            <button onClick={() => setMode('recovery')} className="w-full text-center text-xs text-surface-400 hover:text-brand-600 mt-4 transition-colors">
              Esqueci minha senha (administrador)
            </button>
          </div>
        ) : (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-100">
              <KeyRound className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-medium text-surface-700">Recuperação de Senha</span>
            </div>
            <p className="text-xs text-surface-500 mb-4">Use seu código de recuperação (gerado na configuração inicial) para redefinir a senha de administrador.</p>
            <form onSubmit={handleRecovery} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Login do Admin</label>
                <input type="text" value={recLogin} onChange={e => setRecLogin(e.target.value)} className="input-field" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Código de Recuperação</label>
                <input type="text" value={recCode} onChange={e => setRecCode(e.target.value)} className="input-field font-mono" placeholder="XXXX-XXXX-XXXX-XXXX" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Nova Senha</label>
                <input type="password" value={recNovaSenha} onChange={e => setRecNovaSenha(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Confirmar Nova Senha</label>
                <input type="password" value={recConfirm} onChange={e => setRecConfirm(e.target.value)} className="input-field" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary mt-1">
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </button>
            </form>
            <button onClick={() => setMode('login')} className="w-full flex items-center justify-center gap-1 text-xs text-surface-400 hover:text-surface-600 mt-4 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Voltar ao login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
