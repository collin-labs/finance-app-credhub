import { useState, useEffect, useCallback } from 'react';
import {
  listarCampanhas, criarCampanha, listarLeads, criarLead,
  atualizarStatusLead, converterLeadEmCliente, excluirLead,
} from '../../lib/api';
import { Usuario } from '../../lib/types';
import { Modal } from '../shared/Modal';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Tooltip } from '../shared/Tooltip';
import { EmptyState } from '../shared/EmptyState';
import { ImportarLeadsModal } from './ImportarLeadsModal';
import { LeadDetalhes } from './LeadDetalhes';
import { formatCPF, formatPhone, formatMoney, stripNonDigits } from '../../lib/formatters';
import toast from 'react-hot-toast';
import {
  Target, Plus, Upload, MessageCircle, UserPlus, Trash2,
  Megaphone, Users, Filter,
} from 'lucide-react';

interface Props {
  currentUser: Usuario;
}

const LEAD_STATUS: Record<string, { label: string; color: string }> = {
  novo:               { label: 'Novo', color: 'bg-blue-50 text-blue-700' },
  tentando_contato:   { label: 'Tentando Contato', color: 'bg-amber-50 text-amber-700' },
  contactado:         { label: 'Contactado', color: 'bg-cyan-50 text-cyan-700' },
  interessado:        { label: 'Interessado', color: 'bg-green-50 text-green-700' },
  agendado:           { label: 'Agendado', color: 'bg-purple-50 text-purple-700' },
  sem_interesse:      { label: 'Sem Interesse', color: 'bg-surface-100 text-surface-500' },
  telefone_errado:    { label: 'Tel. Errado', color: 'bg-red-50 text-red-600' },
  convertido:         { label: 'Convertido', color: 'bg-emerald-50 text-emerald-700' },
  descartado:         { label: 'Descartado', color: 'bg-surface-100 text-surface-400' },
};

const CAMPANHA_TIPOS = [
  { value: 'mailing', label: 'Mailing' },
  { value: 'refinanciamento', label: 'Refinanciamento' },
  { value: 'portabilidade', label: 'Portabilidade' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'outra', label: 'Outra' },
];

export function ProspeccaoView({ currentUser }: Props) {
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [campanhaSel, setCampanhaSel] = useState<number | undefined>(undefined);
  const [statusFiltro, setStatusFiltro] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [campanhaModal, setCampanhaModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [leadModal, setLeadModal] = useState(false);
  const [detalhesLead, setDetalhesLead] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [convertTarget, setConvertTarget] = useState<any | null>(null);

  const [formCampanha, setFormCampanha] = useState({ nome: '', tipo: 'mailing', observacoes: '' });
  const [formLead, setFormLead] = useState({ nome: '', cpf: '', telefone1: '', whatsapp: '', convenio_nome: '', beneficio: '', renda_estimada: '' });

  const loadCampanhas = useCallback(async () => {
    try { setCampanhas(await listarCampanhas() as any[]); } catch { /* */ }
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      setLeads(await listarLeads(campanhaSel, statusFiltro || undefined) as any[]);
    } catch { /* */ }
    setLoading(false);
  }, [campanhaSel, statusFiltro]);

  useEffect(() => { loadCampanhas(); }, [loadCampanhas]);
  useEffect(() => { loadLeads(); }, [loadLeads]);

  async function handleCriarCampanha() {
    if (!formCampanha.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      await criarCampanha(formCampanha);
      toast.success('Campanha criada');
      setCampanhaModal(false);
      setFormCampanha({ nome: '', tipo: 'mailing', observacoes: '' });
      loadCampanhas();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handleCriarLead() {
    if (!formLead.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      await criarLead({
        ...formLead,
        cpf: formLead.cpf ? stripNonDigits(formLead.cpf) : undefined,
        telefone1: formLead.telefone1 ? stripNonDigits(formLead.telefone1) : undefined,
        whatsapp: formLead.whatsapp ? stripNonDigits(formLead.whatsapp) : undefined,
        renda_estimada: formLead.renda_estimada ? parseFloat(formLead.renda_estimada) : undefined,
        campanha_id: campanhaSel,
      });
      toast.success('Lead adicionado');
      setLeadModal(false);
      setFormLead({ nome: '', cpf: '', telefone1: '', whatsapp: '', convenio_nome: '', beneficio: '', renda_estimada: '' });
      loadLeads();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function mudarStatus(lead: any, novoStatus: string) {
    try {
      await atualizarStatusLead({ lead_id: lead.id, novo_status: novoStatus, usuario_id: currentUser.id });
      loadLeads();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handleConverter() {
    if (!convertTarget) return;
    try {
      await converterLeadEmCliente(convertTarget.id);
      toast.success(`${convertTarget.nome} agora é cliente!`);
      loadLeads();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await excluirLead(deleteTarget.id);
      toast.success('Lead removido');
      loadLeads();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-600" />
          <div>
            <h2 className="text-lg font-bold text-surface-900">Prospecção</h2>
            <p className="text-xs text-surface-400">Campanhas, leads e fila de atendimento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setImportModal(true)} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Upload className="w-3.5 h-3.5" /> Importar Mailing
          </button>
          <button onClick={() => setCampanhaModal(true)} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Megaphone className="w-3.5 h-3.5" /> Nova Campanha
          </button>
          <button onClick={() => setLeadModal(true)} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Novo Lead
          </button>
        </div>
      </div>

      {/* Campanhas como chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setCampanhaSel(undefined)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${campanhaSel === undefined ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
        >
          Todos os leads
        </button>
        {campanhas.map(c => (
          <button
            key={c.id}
            onClick={() => setCampanhaSel(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${campanhaSel === c.id ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
          >
            {c.nome}
            <span className={`text-2xs ${campanhaSel === c.id ? 'text-white/70' : 'text-surface-400'}`}>({c.total_leads})</span>
          </button>
        ))}
      </div>

      {/* Resumo da campanha selecionada */}
      {campanhaSel !== undefined && (() => {
        const c = campanhas.find(x => x.id === campanhaSel);
        if (!c) return null;
        const taxa = c.total_leads > 0 ? ((c.propostas_geradas / c.total_leads) * 100).toFixed(0) : '0';
        return (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="card p-3"><p className="text-2xs text-surface-400">Total de Leads</p><p className="text-lg font-bold text-surface-900">{c.total_leads}</p></div>
            <div className="card p-3"><p className="text-2xs text-surface-400">Contactados</p><p className="text-lg font-bold text-cyan-600">{c.leads_contactados}</p></div>
            <div className="card p-3"><p className="text-2xs text-surface-400">Convertidos</p><p className="text-lg font-bold text-green-600">{c.propostas_geradas}</p></div>
            <div className="card p-3"><p className="text-2xs text-surface-400">Taxa de Conversão</p><p className="text-lg font-bold text-brand-600">{taxa}%</p></div>
          </div>
        );
      })()}

      {/* Filtro de status */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-3.5 h-3.5 text-surface-400" />
        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="input-field text-xs py-1.5 w-48">
          <option value="">Todos os status</option>
          {Object.entries(LEAD_STATUS).map(([val, s]) => <option key={val} value={val}>{s.label}</option>)}
        </select>
      </div>

      {/* Lista de leads (fila de atendimento) */}
      {loading ? (
        <div className="text-center py-12 text-sm text-surface-400">Carregando...</div>
      ) : leads.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum lead" description="Importe um mailing ou adicione leads manualmente para começar a prospecção." action={
          <div className="flex gap-2">
            <button onClick={() => setImportModal(true)} className="btn-secondary text-xs">Importar Mailing</button>
            <button onClick={() => setLeadModal(true)} className="btn-primary text-xs">Novo Lead</button>
          </div>
        } />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Convênio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Renda Est.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Tentativas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Status</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} className="border-b border-surface-50 hover:bg-surface-50/50 group">
                  <td className="px-4 py-3">
                    <button onClick={() => setDetalhesLead(lead)} className="text-left">
                      <span className="font-medium text-surface-900 hover:text-brand-600">{lead.nome}</span>
                      {lead.cpf && <span className="block text-2xs text-surface-400 font-mono">{formatCPF(lead.cpf)}</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-surface-500">{lead.telefone1 ? formatPhone(lead.telefone1) : (lead.whatsapp ? formatPhone(lead.whatsapp) : '—')}</td>
                  <td className="px-4 py-3 text-surface-500">{lead.convenio_nome || '—'}</td>
                  <td className="px-4 py-3 text-surface-500">{lead.renda_estimada ? formatMoney(lead.renda_estimada) : '—'}</td>
                  <td className="px-4 py-3 text-surface-500">{lead.tentativas_contato}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={e => mudarStatus(lead, e.target.value)}
                      className={`text-2xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer ${LEAD_STATUS[lead.status]?.color || 'bg-surface-100'}`}
                      disabled={lead.status === 'convertido'}
                    >
                      {Object.entries(LEAD_STATUS).map(([val, s]) => <option key={val} value={val}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {lead.whatsapp && (
                        <Tooltip content="Abrir WhatsApp">
                          <a href={`https://wa.me/55${stripNonDigits(lead.whatsapp)}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-green-50 text-surface-400 hover:text-green-600">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </Tooltip>
                      )}
                      {lead.status !== 'convertido' && (
                        <Tooltip content="Converter em cliente">
                          <button onClick={() => setConvertTarget(lead)} className="p-1.5 rounded-lg hover:bg-brand-50 text-surface-400 hover:text-brand-600">
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip content="Excluir lead">
                        <button onClick={() => setDeleteTarget(lead)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500">
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

      {/* Modal nova campanha */}
      <Modal open={campanhaModal} onClose={() => setCampanhaModal(false)} title="Nova Campanha" width="sm" footer={
        <>
          <button onClick={() => setCampanhaModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleCriarCampanha} className="btn-primary">Criar</button>
        </>
      }>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Nome *</label>
            <input value={formCampanha.nome} onChange={e => setFormCampanha({ ...formCampanha, nome: e.target.value })} className="input-field" placeholder="Ex: INSS Janeiro 2026" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Tipo</label>
            <select value={formCampanha.tipo} onChange={e => setFormCampanha({ ...formCampanha, tipo: e.target.value })} className="input-field">
              {CAMPANHA_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Observações</label>
            <textarea value={formCampanha.observacoes} onChange={e => setFormCampanha({ ...formCampanha, observacoes: e.target.value })} className="input-field h-16 resize-none" />
          </div>
        </div>
      </Modal>

      {/* Modal novo lead */}
      <Modal open={leadModal} onClose={() => setLeadModal(false)} title="Novo Lead" footer={
        <>
          <button onClick={() => setLeadModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleCriarLead} className="btn-primary">Adicionar</button>
        </>
      }>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Nome *</label>
              <input value={formLead.nome} onChange={e => setFormLead({ ...formLead, nome: e.target.value })} className="input-field" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">CPF</label>
              <input value={formLead.cpf ? formatCPF(formLead.cpf) : ''} onChange={e => setFormLead({ ...formLead, cpf: stripNonDigits(e.target.value).slice(0, 11) })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Telefone</label>
              <input value={formLead.telefone1 ? formatPhone(formLead.telefone1) : ''} onChange={e => setFormLead({ ...formLead, telefone1: stripNonDigits(e.target.value) })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">WhatsApp</label>
              <input value={formLead.whatsapp ? formatPhone(formLead.whatsapp) : ''} onChange={e => setFormLead({ ...formLead, whatsapp: stripNonDigits(e.target.value) })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Convênio</label>
              <input value={formLead.convenio_nome} onChange={e => setFormLead({ ...formLead, convenio_nome: e.target.value })} className="input-field" placeholder="INSS, etc" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Benefício</label>
              <input value={formLead.beneficio} onChange={e => setFormLead({ ...formLead, beneficio: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Renda Est.</label>
              <input type="number" value={formLead.renda_estimada} onChange={e => setFormLead({ ...formLead, renda_estimada: e.target.value })} className="input-field" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal importar */}
      {importModal && (
        <ImportarLeadsModal
          campanhaId={campanhaSel}
          campanhas={campanhas}
          onClose={() => setImportModal(false)}
          onImported={() => { setImportModal(false); loadLeads(); loadCampanhas(); }}
        />
      )}

      {/* Detalhes do lead */}
      {detalhesLead && (
        <LeadDetalhes
          lead={detalhesLead}
          currentUser={currentUser}
          onClose={() => setDetalhesLead(null)}
          onUpdated={() => loadLeads()}
        />
      )}

      {/* Confirmações */}
      <ConfirmDialog
        open={!!convertTarget}
        onClose={() => setConvertTarget(null)}
        onConfirm={handleConverter}
        title="Converter em Cliente"
        variant="info"
        icon="check"
        confirmLabel="Converter"
        message={<span>Criar um cliente a partir do lead <strong>{convertTarget?.nome}</strong>? Os dados serão copiados e você poderá criar propostas para ele.</span>}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Lead"
        variant="danger"
        icon="trash"
        confirmLabel="Excluir"
        message={<span>Excluir o lead <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.</span>}
      />
    </div>
  );
}
