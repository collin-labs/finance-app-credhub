import { useState, useEffect } from 'react';
import { listarFeedbacks, criarFeedback, excluirFeedback, reenviarFeedback, reenviarPendentes } from '../../lib/api';
import { Usuario } from '../../lib/types';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Tooltip } from '../shared/Tooltip';
import { EmptyState } from '../shared/EmptyState';
import toast from 'react-hot-toast';
import {
  Bug, Lightbulb, Rocket, StickyNote, Send, RefreshCw, Trash2,
  CheckCircle, AlertCircle, Clock, MessageSquarePlus, Filter,
} from 'lucide-react';

interface Props {
  currentUser: Usuario;
}

interface Feedback {
  id: number;
  tipo: string;
  titulo: string;
  descricao?: string;
  prioridade: string;
  status_envio: string;
  canais_enviados?: string;
  erro_envio?: string;
  usuario_nome?: string;
  versao_app?: string;
  criado_em: string;
  enviado_em?: string;
}

interface EnvioResultado {
  status: string;
  canais_ok: string[];
  erros: string[];
}

const TIPOS = [
  { value: 'bug', label: 'Bug', icon: Bug, cor: 'text-red-500', bg: 'bg-red-50 border-red-200', bgActive: 'bg-red-100 border-red-400 text-red-700' },
  { value: 'sugestao', label: 'Sugestão', icon: Lightbulb, cor: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', bgActive: 'bg-blue-100 border-blue-400 text-blue-700' },
  { value: 'melhoria', label: 'Melhoria', icon: Rocket, cor: 'text-green-500', bg: 'bg-green-50 border-green-200', bgActive: 'bg-green-100 border-green-400 text-green-700' },
  { value: 'nota', label: 'Nota', icon: StickyNote, cor: 'text-surface-500', bg: 'bg-surface-50 border-surface-200', bgActive: 'bg-surface-200 border-surface-400 text-surface-700' },
];

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

const STATUS_BADGE: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  enviado: { label: 'Enviado', icon: CheckCircle, cls: 'bg-green-50 text-green-700' },
  pendente: { label: 'Pendente', icon: Clock, cls: 'bg-amber-50 text-amber-700' },
  erro: { label: 'Erro', icon: AlertCircle, cls: 'bg-red-50 text-red-700' },
  parcial: { label: 'Parcial', icon: AlertCircle, cls: 'bg-amber-50 text-amber-700' },
};

export function FeedbackView({ currentUser }: Props) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [tipo, setTipo] = useState('bug');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('normal');
  const [filtro, setFiltro] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [reenviandoId, setReenviandoId] = useState<number | null>(null);

  useEffect(() => {
    load();
    // Reenviar pendentes silenciosamente ao abrir
    reenviarPendentes().then((n) => {
      if (n && (n as number) > 0) {
        load(); // Recarrega se houve reenvios
      }
    }).catch(() => {});
  }, []);

  async function load() {
    try {
      setFeedbacks(await listarFeedbacks(filtro) as Feedback[]);
    } catch { /* */ }
  }

  useEffect(() => { load(); }, [filtro]);

  async function handleSubmit() {
    if (!titulo.trim()) {
      toast.error('Informe um título para o feedback');
      return;
    }
    setSending(true);
    try {
      const resultado = await criarFeedback({
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        prioridade,
        usuario_id: currentUser.id,
        versao_app: '1.0.0',
      }) as EnvioResultado;

      if (resultado.status === 'enviado') {
        toast.success('Feedback enviado com sucesso!');
      } else if (resultado.status === 'parcial') {
        toast.success('Feedback salvo. Alguns canais falharam.');
      } else if (resultado.status === 'pendente') {
        toast.success('Feedback salvo localmente. Nenhum canal configurado.');
      } else {
        toast.error('Feedback salvo, mas o envio falhou. Será retentado.');
      }

      setTitulo('');
      setDescricao('');
      setPrioridade('normal');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleReenviar(id: number) {
    setReenviandoId(id);
    try {
      const resultado = await reenviarFeedback(id) as EnvioResultado;
      if (resultado.status === 'enviado') {
        toast.success('Reenviado com sucesso!');
      } else {
        toast.error(`Falha ao reenviar: ${resultado.erros.join(', ')}`);
      }
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReenviandoId(null);
    }
  }

  async function handleDelete() {
    if (deleteId == null) return;
    try {
      await excluirFeedback(deleteId);
      toast.success('Feedback removido');
      setDeleteId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function formatData(dt: string) {
    try {
      const d = new Date(dt + 'Z');
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dt;
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-surface-900">Feedback & Suporte</h2>
        <p className="text-xs text-surface-400 mt-0.5">
          Reporte problemas, sugira melhorias ou deixe notas. Seus feedbacks são enviados automaticamente para a equipe de desenvolvimento.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Formulário — 2 colunas */}
        <div className="col-span-2">
          <div className="card p-5 sticky top-4">
            <h3 className="text-sm font-semibold text-surface-700 mb-4">Novo Feedback</h3>

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {TIPOS.map(t => {
                const Icon = t.icon;
                const isActive = tipo === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTipo(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${isActive ? t.bgActive : `${t.bg} text-surface-600 hover:opacity-80`}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Prioridade */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-surface-600 mb-1">Prioridade</label>
              <select value={prioridade} onChange={e => setPrioridade(e.target.value)} className="input-field text-sm">
                {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Título */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-surface-600 mb-1">Título *</label>
              <input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className="input-field text-sm"
                placeholder="Resumo do feedback"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {/* Descrição */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-surface-600 mb-1">Descrição</label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="input-field text-sm h-28 resize-none"
                placeholder="Descreva em detalhes o que aconteceu, como reproduzir, ou o que sugere..."
              />
            </div>

            {/* Enviar */}
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Enviando...' : 'Enviar Feedback'}
            </button>
          </div>
        </div>

        {/* Histórico — 3 colunas */}
        <div className="col-span-3">
          {/* Filtro */}
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3.5 h-3.5 text-surface-400" />
            <div className="flex gap-1">
              <FilterBtn label="Todos" value={undefined} current={filtro} onClick={setFiltro} />
              {TIPOS.map(t => (
                <FilterBtn key={t.value} label={t.label} value={t.value} current={filtro} onClick={setFiltro} />
              ))}
            </div>
          </div>

          {/* Lista */}
          {feedbacks.length === 0 ? (
            <EmptyState
              icon={MessageSquarePlus}
              title="Nenhum feedback ainda"
              description="Envie seu primeiro feedback usando o formulário ao lado."
            />
          ) : (
            <div className="space-y-2">
              {feedbacks.map(fb => {
                const tipoInfo = TIPOS.find(t => t.value === fb.tipo) || TIPOS[3];
                const Icon = tipoInfo.icon;
                const statusInfo = STATUS_BADGE[fb.status_envio] || STATUS_BADGE.pendente;
                const StatusIcon = statusInfo.icon;
                const isReenviando = reenviandoId === fb.id;

                return (
                  <div key={fb.id} className="card p-4 group hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      {/* Ícone do tipo */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tipoInfo.bg} border`}>
                        <Icon className={`w-4 h-4 ${tipoInfo.cor}`} />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-surface-800 truncate">{fb.titulo}</span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${statusInfo.cls}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {statusInfo.label}
                          </span>
                        </div>

                        {fb.descricao && (
                          <p className="text-xs text-surface-500 line-clamp-2 mb-1">{fb.descricao}</p>
                        )}

                        <div className="flex items-center gap-3 text-2xs text-surface-400">
                          <span>{formatData(fb.criado_em)}</span>
                          {fb.usuario_nome && <span>por {fb.usuario_nome}</span>}
                          {fb.canais_enviados && (
                            <span className="text-green-600">via {fb.canais_enviados}</span>
                          )}
                          {fb.prioridade !== 'normal' && (
                            <span className={fb.prioridade === 'urgente' ? 'text-red-500 font-medium' : fb.prioridade === 'alta' ? 'text-amber-600' : 'text-surface-400'}>
                              {fb.prioridade === 'urgente' ? '🔴 Urgente' : fb.prioridade === 'alta' ? '⚠️ Alta' : 'Baixa'}
                            </span>
                          )}
                        </div>

                        {fb.erro_envio && (
                          <p className="text-2xs text-red-400 mt-1 truncate">Erro: {fb.erro_envio}</p>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {(fb.status_envio === 'erro' || fb.status_envio === 'pendente') && (
                          <Tooltip content="Reenviar">
                            <button
                              onClick={() => handleReenviar(fb.id)}
                              disabled={isReenviando}
                              className="p-1.5 rounded-lg hover:bg-brand-50 text-surface-400 hover:text-brand-600"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isReenviando ? 'animate-spin' : ''}`} />
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip content="Excluir">
                          <button
                            onClick={() => setDeleteId(fb.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Feedback"
        variant="danger"
        icon="trash"
        confirmLabel="Excluir"
        message="Remover este feedback do histórico?"
      />
    </div>
  );
}

function FilterBtn({ label, value, current, onClick }: {
  label: string;
  value: string | undefined;
  current: string | undefined;
  onClick: (v: string | undefined) => void;
}) {
  const isActive = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${isActive ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'text-surface-500 hover:text-surface-700 border border-transparent'}`}
    >
      {label}
    </button>
  );
}
