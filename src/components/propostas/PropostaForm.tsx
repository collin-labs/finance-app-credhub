import { useState, useEffect } from 'react';
import { criarProposta, listarBancos, listarConvenios, buscarClientes } from '../../lib/api';
import { Banco, Convenio, ClienteResumo, PropostaInput } from '../../lib/types';
import { Modal } from '../shared/Modal';
import { formatCPF } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

const PRODUTOS = [
  { id: 1, label: 'Consignado Novo' },
  { id: 2, label: 'Refinanciamento' },
  { id: 3, label: 'Portabilidade' },
  { id: 4, label: 'Cartão Consignado' },
  { id: 5, label: 'Cartão Benefício' },
  { id: 6, label: 'Antecipação FGTS' },
  { id: 7, label: 'Empréstimo Pessoal' },
  { id: 8, label: 'Seguro Prestamista' },
];

interface Props {
  onClose: () => void;
  onSaved: () => void;

}

export function PropostaForm({ onClose, onSaved }: Props) {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clientesResult, setClientesResult] = useState<ClienteResumo[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteResumo | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<Partial<PropostaInput>>({
    produto_id: 1,
    quantidade_parcelas: 84,
    taxa_juros: 1.80,
  });

  useEffect(() => {
    listarBancos().then(b => setBancos(b as Banco[])).catch(() => {});
    listarConvenios().then(c => setConvenios(c as Convenio[])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!buscaCliente.trim() || buscaCliente.length < 2) { setClientesResult([]); return; }
    const timer = setTimeout(async () => {
      try { setClientesResult(await buscarClientes(buscaCliente) as ClienteResumo[]); } catch { /* */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaCliente]);

  function set(fields: Partial<PropostaInput>) { setForm(prev => ({ ...prev, ...fields })); }

  function selectCliente(c: ClienteResumo) {
    setClienteSelecionado(c);
    set({ cliente_id: c.id, convenio_id: undefined });
    setBuscaCliente('');
    setClientesResult([]);
  }

  const isPortabilidade = form.produto_id === 3;
  const isRefinanciamento = form.produto_id === 2;

  async function handleSave() {
    if (!clienteSelecionado) { toast.error('Selecione um cliente'); return; }
    if (!form.banco_id) { toast.error('Selecione o banco'); return; }
    if (!form.convenio_id) { toast.error('Selecione o convênio'); return; }
    if (!form.valor_emprestimo || form.valor_emprestimo <= 0) { toast.error('Informe o valor do empréstimo'); return; }
    if (!form.valor_parcela || form.valor_parcela <= 0) { toast.error('Informe o valor da parcela'); return; }

    setLoading(true);
    try {
      await criarProposta({
        cliente_id: clienteSelecionado.id,
        banco_id: form.banco_id!,
        convenio_id: form.convenio_id!,
        produto_id: form.produto_id || 1,
        numero_proposta: form.numero_proposta,
        valor_emprestimo: form.valor_emprestimo!,
        valor_liquido: form.valor_liquido,
        valor_parcela: form.valor_parcela!,
        quantidade_parcelas: form.quantidade_parcelas || 84,
        taxa_juros: form.taxa_juros || 1.80,
        cet_mensal: form.cet_mensal,
        banco_origem_id: form.banco_origem_id,
        saldo_devedor: form.saldo_devedor,
        valor_troco: form.valor_troco,
        observacoes: form.observacoes,
      } as PropostaInput);
      toast.success('Proposta criada com sucesso!');
      onSaved();
    } catch (err) { toast.error((err as Error).message); }
    setLoading(false);
  }

  return (
    <Modal open onClose={onClose} title="Nova Proposta" width="lg" footer={
      <>
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} disabled={loading} className="btn-primary">{loading ? 'Salvando...' : 'Criar Proposta'}</button>
      </>
    }>
      <div className="flex flex-col gap-4">
        {/* Cliente */}
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1">Cliente *</label>
          {clienteSelecionado ? (
            <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
              <div>
                <span className="text-sm font-medium text-brand-900">{clienteSelecionado.nome}</span>
                {clienteSelecionado.cpf && <span className="text-xs text-brand-600 ml-2 font-mono">{formatCPF(clienteSelecionado.cpf)}</span>}
              </div>
              <button onClick={() => setClienteSelecionado(null)} className="text-xs text-brand-600 hover:text-brand-800">Trocar</button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} className="input-field pl-9" placeholder="Buscar cliente por nome ou CPF..." autoFocus />
              {clientesResult.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {clientesResult.map(c => (
                    <button key={c.id} onClick={() => selectCliente(c)} className="w-full text-left px-3 py-2 hover:bg-surface-50 transition-colors flex items-center justify-between">
                      <span className="text-sm text-surface-900">{c.nome}</span>
                      <span className="text-xs text-surface-400 font-mono">{c.cpf ? formatCPF(c.cpf) : ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-surface-100" />

        {/* Produto, Banco, Convênio */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Produto *</label>
            <select value={form.produto_id || 1} onChange={e => set({ produto_id: parseInt(e.target.value) })} className="input-field">
              {PRODUTOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Banco *</label>
            <select value={form.banco_id || ''} onChange={e => set({ banco_id: parseInt(e.target.value) })} className="input-field">
              <option value="">Selecione</option>
              {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Convênio *</label>
            <select value={form.convenio_id || ''} onChange={e => set({ convenio_id: parseInt(e.target.value) })} className="input-field">
              <option value="">Selecione</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Nº proposta */}
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1">Nº da Proposta no Banco</label>
          <input value={form.numero_proposta || ''} onChange={e => set({ numero_proposta: e.target.value })} className="input-field" placeholder="Número gerado pelo sistema do banco" />
        </div>

        <div className="h-px bg-surface-100" />

        {/* Valores */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Valor do Empréstimo (R$) *</label>
            <input type="number" step="0.01" value={form.valor_emprestimo ?? ''} onChange={e => set({ valor_emprestimo: parseFloat(e.target.value) || 0 })} className="input-field" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Valor Líquido (R$)</label>
            <input type="number" step="0.01" value={form.valor_liquido ?? ''} onChange={e => set({ valor_liquido: parseFloat(e.target.value) || undefined })} className="input-field" placeholder="Valor que o cliente recebe" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Valor da Parcela (R$) *</label>
            <input type="number" step="0.01" value={form.valor_parcela ?? ''} onChange={e => set({ valor_parcela: parseFloat(e.target.value) || 0 })} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Qtd Parcelas *</label>
            <input type="number" value={form.quantidade_parcelas ?? 84} onChange={e => set({ quantidade_parcelas: parseInt(e.target.value) || 84 })} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Taxa (%/mês) *</label>
            <input type="number" step="0.01" value={form.taxa_juros ?? 1.80} onChange={e => set({ taxa_juros: parseFloat(e.target.value) || 0 })} className="input-field" />
          </div>
        </div>

        {/* Portabilidade fields */}
        {(isPortabilidade || isRefinanciamento) && (
          <>
            <div className="h-px bg-surface-100" />
            <p className="text-xs font-medium text-surface-600">{isPortabilidade ? 'Dados da Portabilidade' : 'Dados do Refinanciamento'}</p>
            <div className="grid grid-cols-2 gap-3">
              {isPortabilidade && (
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Banco de Origem</label>
                  <select value={form.banco_origem_id || ''} onChange={e => set({ banco_origem_id: parseInt(e.target.value) || undefined })} className="input-field">
                    <option value="">Selecione</option>
                    {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Saldo Devedor (R$)</label>
                <input type="number" step="0.01" value={form.saldo_devedor ?? ''} onChange={e => set({ saldo_devedor: parseFloat(e.target.value) || undefined })} className="input-field" />
              </div>
              {isPortabilidade && (
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Valor do Troco (R$)</label>
                  <input type="number" step="0.01" value={form.valor_troco ?? ''} onChange={e => set({ valor_troco: parseFloat(e.target.value) || undefined })} className="input-field" />
                </div>
              )}
            </div>
          </>
        )}

        {/* Observações */}
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1">Observações</label>
          <textarea value={form.observacoes || ''} onChange={e => set({ observacoes: e.target.value })} className="input-field h-16 resize-none" />
        </div>
      </div>
    </Modal>
  );
}
