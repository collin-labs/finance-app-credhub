import { useState, useEffect } from 'react';
import { listarFeedbackConfig, salvarFeedbackConfig, testarCanalFeedback } from '../../lib/api';
import { Usuario } from '../../lib/types';
import { EmptyState } from '../shared/EmptyState';
import { Tooltip } from '../shared/Tooltip';
import toast from 'react-hot-toast';
import {
  Shield, Mail, Send as SendIcon, MessageCircle, Hash,
  CheckCircle, Loader, Save, ExternalLink,
} from 'lucide-react';

interface Props {
  currentUser: Usuario;
}

interface CanalConfig {
  canal: string;
  ativo: boolean;
  config: string;
  testado_em?: string;
}

interface CanalUI {
  key: string;
  label: string;
  icon: React.ElementType;
  cor: string;
  bgCor: string;
  campos: CampoConfig[];
  ajudaUrl?: string;
  ajudaLabel?: string;
}

interface CampoConfig {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
}

const CANAIS: CanalUI[] = [
  {
    key: 'email',
    label: 'E-mail (SMTP)',
    icon: Mail,
    cor: 'text-blue-600',
    bgCor: 'bg-blue-50',
    campos: [
      { key: 'smtp_host', label: 'Servidor SMTP', placeholder: 'smtp.gmail.com' },
      { key: 'smtp_port', label: 'Porta', placeholder: '587', type: 'number' },
      { key: 'smtp_user', label: 'Usuário/E-mail', placeholder: 'seu@gmail.com' },
      { key: 'smtp_pass', label: 'Senha/App Password', placeholder: '••••••••', type: 'password' },
      { key: 'destinatario', label: 'E-mail de destino', placeholder: 'dev@empresa.com' },
    ],
    ajudaUrl: 'https://support.google.com/accounts/answer/185833',
    ajudaLabel: 'Como gerar senha de app no Gmail',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    cor: 'text-green-600',
    bgCor: 'bg-green-50',
    campos: [
      { key: 'telefone', label: 'Seu telefone', placeholder: '+5511999999999' },
      { key: 'apikey', label: 'API Key CallMeBot', placeholder: '123456' },
    ],
    ajudaUrl: 'https://www.callmebot.com/blog/free-api-whatsapp-messages/',
    ajudaLabel: 'Como configurar CallMeBot',
  },
  {
    key: 'telegram',
    label: 'Telegram',
    icon: SendIcon,
    cor: 'text-sky-600',
    bgCor: 'bg-sky-50',
    campos: [
      { key: 'bot_token', label: 'Token do Bot', placeholder: '123456:ABC-DEF...' },
      { key: 'chat_id', label: 'Chat ID', placeholder: '987654321' },
    ],
    ajudaUrl: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
    ajudaLabel: 'Como criar um bot no Telegram',
  },
  {
    key: 'discord',
    label: 'Discord',
    icon: Hash,
    cor: 'text-indigo-600',
    bgCor: 'bg-indigo-50',
    campos: [
      { key: 'webhook_url', label: 'URL do Webhook', placeholder: 'https://discord.com/api/webhooks/...' },
    ],
    ajudaUrl: 'https://support.discord.com/hc/en-us/articles/228383668',
    ajudaLabel: 'Como criar webhook no Discord',
  },
];

export function FeedbackConfig({ currentUser }: Props) {
  const [configs, setConfigs] = useState<Record<string, CanalConfig>>({});
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({});
  const [ativos, setAtivos] = useState<Record<string, boolean>>({});
  const [testando, setTestando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const isAdmin = currentUser.perfil === 'admin';

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function load() {
    try {
      const lista = await listarFeedbackConfig() as CanalConfig[];
      const cfgMap: Record<string, CanalConfig> = {};
      const formMap: Record<string, Record<string, string>> = {};
      const ativoMap: Record<string, boolean> = {};

      for (const c of lista) {
        cfgMap[c.canal] = c;
        ativoMap[c.canal] = c.ativo;
        try {
          formMap[c.canal] = JSON.parse(c.config);
        } catch {
          formMap[c.canal] = {};
        }
      }
      setConfigs(cfgMap);
      setForms(formMap);
      setAtivos(ativoMap);
    } catch { /* */ }
  }

  function setField(canal: string, campo: string, valor: string) {
    setForms(prev => ({
      ...prev,
      [canal]: { ...(prev[canal] || {}), [campo]: valor },
    }));
  }

  function toggleAtivo(canal: string) {
    setAtivos(prev => ({ ...prev, [canal]: !prev[canal] }));
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      for (const canalUI of CANAIS) {
        const k = canalUI.key;
        const ativo = ativos[k] || false;
        const configJson = JSON.stringify(forms[k] || {});
        await salvarFeedbackConfig(k, ativo, configJson);
      }
      toast.success('Configurações de notificação salvas!');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleTestar(canal: string) {
    // Salva primeiro para garantir que o teste usa a config atualizada
    const configJson = JSON.stringify(forms[canal] || {});
    try {
      await salvarFeedbackConfig(canal, ativos[canal] || false, configJson);
    } catch { /* continua mesmo se falhar */ }

    setTestando(canal);
    try {
      const msg = await testarCanalFeedback(canal) as string;
      toast.success(msg);
      load();
    } catch (e) {
      toast.error(`Teste falhou: ${(e as Error).message}`);
    } finally {
      setTestando(null);
    }
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Acesso restrito"
        description="Apenas administradores podem configurar os canais de notificação."
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-surface-900">Canais de Notificação</h3>
        <p className="text-xs text-surface-400 mt-0.5">
          Configure para onde os feedbacks dos usuários serão enviados. Cada canal é independente — ative apenas os que usar.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {CANAIS.map(canalUI => {
          const ativo = ativos[canalUI.key] || false;
          const form = forms[canalUI.key] || {};
          const cfg = configs[canalUI.key];
          const Icon = canalUI.icon;
          const isTestando = testando === canalUI.key;

          return (
            <div key={canalUI.key} className={`card overflow-hidden transition-all ${ativo ? 'ring-1 ring-brand-200' : ''}`}>
              {/* Header do canal */}
              <div className="flex items-center justify-between p-4 border-b border-surface-100">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${canalUI.bgCor} flex items-center justify-center`}>
                    <Icon className={`w-4.5 h-4.5 ${canalUI.cor}`} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-surface-800">{canalUI.label}</span>
                    {cfg?.testado_em && (
                      <p className="text-2xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" /> Último teste OK
                      </p>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleAtivo(canalUI.key)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${ativo ? 'bg-brand-500' : 'bg-surface-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Campos (expandem quando ativo) */}
              {ativo && (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {canalUI.campos.map(campo => (
                      <div key={campo.key} className={canalUI.campos.length === 1 ? 'col-span-2' : ''}>
                        <label className="block text-xs font-medium text-surface-600 mb-1">{campo.label}</label>
                        <input
                          type={campo.type || 'text'}
                          value={form[campo.key] || ''}
                          onChange={e => setField(canalUI.key, campo.key, e.target.value)}
                          className="input-field text-sm"
                          placeholder={campo.placeholder}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Ações do canal */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-100">
                    {canalUI.ajudaUrl && (
                      <a
                        href={canalUI.ajudaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-2xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                        onClick={e => {
                          e.preventDefault();
                          import('@tauri-apps/plugin-opener').then(({ openUrl }) => {
                            openUrl(canalUI.ajudaUrl!);
                          }).catch(() => window.open(canalUI.ajudaUrl, '_blank'));
                        }}
                      >
                        <ExternalLink className="w-3 h-3" /> {canalUI.ajudaLabel}
                      </a>
                    )}
                    <Tooltip content="Envia uma mensagem de teste para verificar se o canal está funcionando">
                      <button
                        onClick={() => handleTestar(canalUI.key)}
                        disabled={isTestando}
                        className="btn-secondary text-xs flex items-center gap-1.5"
                      >
                        {isTestando ? (
                          <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                          <SendIcon className="w-3 h-3" />
                        )}
                        {isTestando ? 'Testando...' : 'Enviar Teste'}
                      </button>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Salvar tudo */}
      <div className="flex justify-end">
        <button onClick={handleSalvar} disabled={salvando} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar Canais'}
        </button>
      </div>
    </div>
  );
}
