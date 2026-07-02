import { useState, useEffect } from 'react';
import { obterCliente, criarCliente, atualizarCliente, listarConvenios } from '../../lib/api';
import { ClienteInput, Convenio } from '../../lib/types';
import { Modal } from '../shared/Modal';
import { formatCPF, formatPhone, stripNonDigits } from '../../lib/formatters';
import toast from 'react-hot-toast';

interface Props {
  clienteId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = 'pessoal' | 'endereco' | 'consignacao' | 'bancario';

const ORIGENS = [
  { value: 'balcao', label: 'Balcão' },
  { value: 'mailing', label: 'Mailing' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'campanha', label: 'Campanha' },
];

const BENEFICIO_TIPOS = [
  { value: 'aposentadoria', label: 'Aposentadoria' },
  { value: 'pensao', label: 'Pensão' },
  { value: 'salario', label: 'Salário' },
  { value: 'bpc', label: 'BPC' },
];

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function ClienteForm({ clienteId, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('pessoal');
  const [loading, setLoading] = useState(false);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [form, setForm] = useState<ClienteInput>({ nome: '' });

  const isEditing = clienteId !== null;

  useEffect(() => {
    listarConvenios().then(c => setConvenios(c as Convenio[])).catch(() => {});
    if (clienteId) {
      obterCliente(clienteId).then((c: any) => {
        setForm({
          nome: c.nome, cpf: c.cpf || '', rg: c.rg || '', data_nascimento: c.data_nascimento || '',
          telefone1: c.telefone1 || '', telefone2: c.telefone2 || '', whatsapp: c.whatsapp || '', email: c.email || '',
          cep: c.cep || '', endereco: c.endereco || '', numero: c.numero || '', complemento: c.complemento || '',
          bairro: c.bairro || '', cidade: c.cidade || '', estado: c.estado || '',
          convenio_id: c.convenio_id ?? undefined, matricula: c.matricula || '', orgao: c.orgao || '',
          tipo_beneficio: c.tipo_beneficio || '', renda_bruta: c.renda_bruta ?? undefined,
          renda_liquida: c.renda_liquida ?? undefined, margem_total: c.margem_total ?? undefined,
          margem_disponivel: c.margem_disponivel ?? undefined, origem: c.origem || '',
          observacoes: c.observacoes || '',
        });
      }).catch(() => toast.error('Erro ao carregar cliente'));
    }
  }, [clienteId]);

  function set(fields: Partial<ClienteInput>) { setForm(prev => ({ ...prev, ...fields })); }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      const data = { ...form, cpf: form.cpf ? stripNonDigits(form.cpf) : undefined, telefone1: form.telefone1 ? stripNonDigits(form.telefone1) : undefined, telefone2: form.telefone2 ? stripNonDigits(form.telefone2) : undefined, whatsapp: form.whatsapp ? stripNonDigits(form.whatsapp) : undefined };
      if (isEditing) {
        await atualizarCliente(clienteId!, data);
        toast.success('Cliente atualizado');
      } else {
        await criarCliente(data);
        toast.success('Cliente cadastrado');
      }
      onSaved();
    } catch (err) { toast.error((err as Error).message); }
    setLoading(false);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'pessoal', label: 'Dados Pessoais' },
    { id: 'endereco', label: 'Endereço' },
    { id: 'consignacao', label: 'Consignação' },
    { id: 'bancario', label: 'Bancário' },
  ];

  return (
    <Modal open onClose={onClose} title={isEditing ? 'Editar Cliente' : 'Novo Cliente'} width="lg" footer={
      <>
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} disabled={loading} className="btn-primary">{loading ? 'Salvando...' : 'Salvar'}</button>
      </>
    }>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-100 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t.id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Dados Pessoais */}
      {tab === 'pessoal' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">Nome Completo *</label>
              <input value={form.nome} onChange={e => set({ nome: e.target.value })} className="input-field" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">CPF</label>
              <input value={form.cpf ? formatCPF(form.cpf) : ''} onChange={e => set({ cpf: stripNonDigits(e.target.value).slice(0, 11) })} className="input-field" placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">RG</label>
              <input value={form.rg || ''} onChange={e => set({ rg: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Data de Nascimento</label>
              <input type="date" value={form.data_nascimento || ''} onChange={e => set({ data_nascimento: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">E-mail</label>
              <input type="email" value={form.email || ''} onChange={e => set({ email: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Telefone 1</label>
              <input value={form.telefone1 ? formatPhone(form.telefone1) : ''} onChange={e => set({ telefone1: stripNonDigits(e.target.value) })} className="input-field" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Telefone 2</label>
              <input value={form.telefone2 ? formatPhone(form.telefone2) : ''} onChange={e => set({ telefone2: stripNonDigits(e.target.value) })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">WhatsApp</label>
              <input value={form.whatsapp ? formatPhone(form.whatsapp) : ''} onChange={e => set({ whatsapp: stripNonDigits(e.target.value) })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Origem</label>
            <select value={form.origem || ''} onChange={e => set({ origem: e.target.value })} className="input-field">
              <option value="">Selecione</option>
              {ORIGENS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Observações</label>
            <textarea value={form.observacoes || ''} onChange={e => set({ observacoes: e.target.value })} className="input-field h-16 resize-none" />
          </div>
        </div>
      )}

      {/* Endereço */}
      {tab === 'endereco' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">CEP</label>
              <input value={form.cep || ''} onChange={e => set({ cep: e.target.value })} className="input-field" placeholder="00000-000" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <label className="block text-xs font-medium text-surface-600 mb-1">Endereço</label>
              <input value={form.endereco || ''} onChange={e => set({ endereco: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Número</label>
              <input value={form.numero || ''} onChange={e => set({ numero: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Complemento</label>
            <input value={form.complemento || ''} onChange={e => set({ complemento: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Bairro</label>
              <input value={form.bairro || ''} onChange={e => set({ bairro: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Cidade</label>
              <input value={form.cidade || ''} onChange={e => set({ cidade: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Estado</label>
              <select value={form.estado || ''} onChange={e => set({ estado: e.target.value })} className="input-field">
                <option value="">UF</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Consignação */}
      {tab === 'consignacao' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Convênio</label>
              <select value={form.convenio_id ?? ''} onChange={e => set({ convenio_id: e.target.value ? parseInt(e.target.value) : undefined })} className="input-field">
                <option value="">Selecione</option>
                {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Matrícula / NB</label>
              <input value={form.matricula || ''} onChange={e => set({ matricula: e.target.value })} className="input-field" placeholder="Número do benefício ou matrícula" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Órgão</label>
              <input value={form.orgao || ''} onChange={e => set({ orgao: e.target.value })} className="input-field" placeholder="Órgão pagador" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tipo de Benefício</label>
              <select value={form.tipo_beneficio || ''} onChange={e => set({ tipo_beneficio: e.target.value })} className="input-field">
                <option value="">Selecione</option>
                {BENEFICIO_TIPOS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Renda Bruta</label>
              <input type="number" step="0.01" value={form.renda_bruta ?? ''} onChange={e => set({ renda_bruta: e.target.value ? parseFloat(e.target.value) : undefined })} className="input-field" placeholder="R$" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Renda Líquida</label>
              <input type="number" step="0.01" value={form.renda_liquida ?? ''} onChange={e => set({ renda_liquida: e.target.value ? parseFloat(e.target.value) : undefined })} className="input-field" placeholder="R$" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Margem Total</label>
              <input type="number" step="0.01" value={form.margem_total ?? ''} onChange={e => set({ margem_total: e.target.value ? parseFloat(e.target.value) : undefined })} className="input-field" placeholder="R$" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Margem Disponível</label>
              <input type="number" step="0.01" value={form.margem_disponivel ?? ''} onChange={e => set({ margem_disponivel: e.target.value ? parseFloat(e.target.value) : undefined })} className="input-field" placeholder="R$" />
            </div>
          </div>
        </div>
      )}

      {/* Bancário */}
      {tab === 'bancario' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-surface-400 mb-1">Dados bancários do cliente para recebimento do crédito</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Banco</label>
              <input value={form.banco_recebimento || ''} onChange={e => set({ banco_recebimento: e.target.value })} className="input-field" placeholder="Ex: Banco do Brasil" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tipo de Conta</label>
              <select value={form.tipo_conta || ''} onChange={e => set({ tipo_conta: e.target.value })} className="input-field">
                <option value="">Selecione</option>
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Agência</label>
              <input value={form.agencia_receb || ''} onChange={e => set({ agencia_receb: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Conta</label>
              <input value={form.conta_receb || ''} onChange={e => set({ conta_receb: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">PIX</label>
            <input value={form.pix || ''} onChange={e => set({ pix: e.target.value })} className="input-field" placeholder="CPF, telefone, e-mail ou chave aleatória" />
          </div>
        </div>
      )}
    </Modal>
  );
}
