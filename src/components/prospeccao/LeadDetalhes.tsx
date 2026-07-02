import { useState, useEffect } from 'react';
import { listarInteracoesLead, criarInteracaoLead, atualizarStatusLead } from '../../lib/api';
import { Usuario } from '../../lib/types';
import { Modal } from '../shared/Modal';
import { formatCPF, formatPhone, formatMoney, formatDateTime, stripNonDigits } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { Phone, MessageCircle, StickyNote, Send, Clock } from 'lucide-react';

interface Props {
  lead: any;
  currentUser: Usuario;
  onClose: () => void;
  onUpdated: () => void;
}

const TIPO_INTERACAO = [
  { value: 'ligacao', label: 'Ligação', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'nota', label: 'Nota', icon: StickyNote },
];

export function LeadDetalhes({ lead, currentUser, onClose, onUpdated }: Props) {
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [tipo, setTipo] = useState('ligacao');
  const [resumo, setResumo] = useState('');
  const [resultado, setResultado] = useState('');

  useEffect(() => { load(); }, [lead.id]);

  async function load() {
    try { setInteracoes(await listarInteracoesLead(lead.id) as any[]); } catch { /* */ }
  }

  async function handleAdd() {
    if (!resumo.trim()) { toast.error('Descreva a interação'); return; }
    try {
      await criarInteracaoLead({
        lead_id: lead.id, usuario_id: currentUser.id,
        tipo, resumo, resultado: resultado || undefined,
      });
      // Se a interação foi de contato, atualiza status do lead
      if (tipo === 'ligacao' || tipo === 'whatsapp') {
        await atualizarStatusLead({ lead_id: lead.id, novo_status: 'contactado', usuario_id: currentUser.id });
        onUpdated();
      }
      toast.success('Interação registrada');
      setResumo(''); setResultado('');
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Modal open onClose={onClose} title={lead.nome} width="lg">
      <div className="grid grid-cols-2 gap-5">
        {/* Coluna esquerda: dados */}
        <div>
          <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Dados do Lead</h4>
          <div className="space-y-2 text-sm">
            {lead.cpf && <InfoRow label="CPF" value={formatCPF(lead.cpf)} />}
            {lead.telefone1 && <InfoRow label="Telefone" value={formatPhone(lead.telefone1)} />}
            {lead.whatsapp && <InfoRow label="WhatsApp" value={formatPhone(lead.whatsapp)} />}
            {lead.convenio_nome && <InfoRow label="Convênio" value={lead.convenio_nome} />}
            {lead.matricula && <InfoRow label="Matrícula" value={lead.matricula} />}
            {lead.beneficio && <InfoRow label="Benefício" value={lead.beneficio} />}
            {lead.renda_estimada && <InfoRow label="Renda Est." value={formatMoney(lead.renda_estimada)} />}
            {lead.campanha_nome && <InfoRow label="Campanha" value={lead.campanha_nome} />}
            <InfoRow label="Tentativas" value={String(lead.tentativas_contato)} />
          </div>

          {/* Ações rápidas */}
          <div className="flex gap-2 mt-4">
            {lead.whatsapp && (
              <a href={`https://wa.me/55${stripNonDigits(lead.whatsapp)}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-green-600" /> WhatsApp
              </a>
            )}
            {lead.telefone1 && (
              <a href={`tel:${stripNonDigits(lead.telefone1)}`} className="btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center">
                <Phone className="w-3.5 h-3.5 text-blue-600" /> Ligar
              </a>
            )}
          </div>
        </div>

        {/* Coluna direita: interações */}
        <div>
          <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Registrar Interação</h4>

          {/* Tipo */}
          <div className="flex gap-1 mb-2">
            {TIPO_INTERACAO.map(t => (
              <button key={t.value} onClick={() => setTipo(t.value)} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${tipo === t.value ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-surface-50 text-surface-500 border border-transparent'}`}>
                <t.icon className="w-3 h-3" /> {t.label}
              </button>
            ))}
          </div>

          <textarea value={resumo} onChange={e => setResumo(e.target.value)} className="input-field h-16 resize-none text-sm mb-2" placeholder="O que aconteceu nesse contato?" />
          <input value={resultado} onChange={e => setResultado(e.target.value)} className="input-field text-sm mb-2" placeholder="Resultado (opcional)" />
          <button onClick={handleAdd} className="btn-primary w-full text-xs flex items-center justify-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Registrar
          </button>

          {/* Histórico */}
          <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mt-5 mb-2">Histórico</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {interacoes.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-4">Nenhuma interação ainda</p>
            ) : (
              interacoes.map(i => {
                const t = TIPO_INTERACAO.find(x => x.value === i.tipo);
                const Icon = t?.icon || StickyNote;
                return (
                  <div key={i.id} className="flex gap-2 p-2 rounded-lg bg-surface-50">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                      <Icon className="w-3 h-3 text-surface-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-surface-700">{i.resumo}</p>
                      {i.resultado && <p className="text-2xs text-surface-500 mt-0.5">→ {i.resultado}</p>}
                      <p className="text-2xs text-surface-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {formatDateTime(i.criado_em)}
                        {i.usuario_nome && ` · ${i.usuario_nome}`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-surface-400">{label}</span>
      <span className="text-surface-700 font-medium">{value}</span>
    </div>
  );
}
