import { useState, useEffect, useRef } from 'react';
import {
  obterCliente, listarInteracoesCliente, criarInteracaoCliente, excluirInteracaoCliente,
  listarDocumentosCliente, adicionarDocumentoCliente, obterDocumentoCliente, excluirDocumentoCliente,
} from '../../lib/api';
import { Usuario } from '../../lib/types';
import { salvarArquivoBinario } from '../../lib/salvar-arquivo';
import { toastArquivoSalvo } from '../../lib/toast-arquivo';
import { Modal } from '../shared/Modal';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Tooltip } from '../shared/Tooltip';
import { formatCPF, formatPhone, formatMoney, formatDateTime } from '../../lib/formatters';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Phone, MessageCircle, StickyNote, Send, Clock, User,
  FileText, Upload, Download, Trash2, Calendar, MapPin, Briefcase,
} from 'lucide-react';

interface Props {
  clienteId: number;
  currentUser: Usuario;
  onBack: () => void;
}

type Tab = 'info' | 'historico' | 'documentos';

const TIPO_INTERACAO = [
  { value: 'ligacao', label: 'Ligação', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'visita', label: 'Visita', icon: User },
  { value: 'nota', label: 'Nota', icon: StickyNote },
];

const TIPO_DOCUMENTO = ['RG/CPF', 'Comprovante de Renda', 'Comprovante de Residência', 'Contracheque', 'Extrato', 'Contrato', 'Outro'];

export function ClienteDetalhes({ clienteId, currentUser, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('info');
  const [cliente, setCliente] = useState<any>(null);

  useEffect(() => {
    obterCliente(clienteId).then(c => setCliente(c)).catch(() => {});
  }, [clienteId]);

  if (!cliente) return <div className="text-center py-12 text-sm text-surface-400">Carregando...</div>;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
          <span className="text-brand-600 font-bold">{cliente.nome.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-surface-900">{cliente.nome}</h2>
          <p className="text-xs text-surface-400">{cliente.cpf ? formatCPF(cliente.cpf) : 'CPF não informado'}</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-1 w-fit">
        <TabBtn atual={tab} id="info" label="Informações" icon={User} onClick={setTab} />
        <TabBtn atual={tab} id="historico" label="Histórico" icon={Clock} onClick={setTab} />
        <TabBtn atual={tab} id="documentos" label="Documentos" icon={FileText} onClick={setTab} />
      </div>

      {tab === 'info' && <InfoTab cliente={cliente} />}
      {tab === 'historico' && <HistoricoTab clienteId={clienteId} currentUser={currentUser} />}
      {tab === 'documentos' && <DocumentosTab clienteId={clienteId} />}
    </div>
  );
}

function TabBtn({ atual, id, label, icon: Icon, onClick }: { atual: string; id: Tab; label: string; icon: React.ElementType; onClick: (t: Tab) => void }) {
  return (
    <button onClick={() => onClick(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${atual === id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ============================================
// ABA INFORMAÇÕES
// ============================================
function InfoTab({ cliente }: { cliente: any }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-surface-700">Dados Pessoais</h3>
        </div>
        <div className="space-y-2 text-sm">
          <Info label="Nome" value={cliente.nome} />
          {cliente.cpf && <Info label="CPF" value={formatCPF(cliente.cpf)} />}
          {cliente.rg && <Info label="RG" value={cliente.rg} />}
          {cliente.data_nascimento && <Info label="Nascimento" value={cliente.data_nascimento} />}
          {cliente.telefone1 && <Info label="Telefone" value={formatPhone(cliente.telefone1)} />}
          {cliente.whatsapp && <Info label="WhatsApp" value={formatPhone(cliente.whatsapp)} />}
          {cliente.email && <Info label="E-mail" value={cliente.email} />}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-surface-700">Consignação</h3>
        </div>
        <div className="space-y-2 text-sm">
          {cliente.tipo_beneficio && <Info label="Benefício" value={cliente.tipo_beneficio} />}
          {cliente.matricula && <Info label="Matrícula" value={cliente.matricula} />}
          {cliente.renda_liquida != null && <Info label="Renda Líquida" value={formatMoney(cliente.renda_liquida)} />}
          {cliente.margem_disponivel != null && <Info label="Margem Disponível" value={formatMoney(cliente.margem_disponivel)} />}
        </div>
      </div>

      {(cliente.endereco || cliente.cidade) && (
        <div className="card p-5 col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-surface-700">Endereço</h3>
          </div>
          <p className="text-sm text-surface-600">
            {[cliente.endereco, cliente.numero, cliente.bairro, cliente.cidade, cliente.estado, cliente.cep].filter(Boolean).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-surface-400">{label}</span>
      <span className="text-surface-700 font-medium text-right">{value}</span>
    </div>
  );
}

// ============================================
// ABA HISTÓRICO (interações)
// ============================================
function HistoricoTab({ clienteId, currentUser }: { clienteId: number; currentUser: Usuario }) {
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [tipo, setTipo] = useState('ligacao');
  const [resumo, setResumo] = useState('');
  const [resultado, setResultado] = useState('');
  const [agendado, setAgendado] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => { load(); }, [clienteId]);

  async function load() {
    try { setInteracoes(await listarInteracoesCliente(clienteId) as any[]); } catch { /* */ }
  }

  async function handleAdd() {
    if (!resumo.trim()) { toast.error('Descreva a interação'); return; }
    try {
      await criarInteracaoCliente({
        cliente_id: clienteId, usuario_id: currentUser.id,
        tipo, resumo, resultado: resultado || undefined,
        agendado_para: agendado || undefined,
      });
      toast.success('Interação registrada');
      setResumo(''); setResultado(''); setAgendado('');
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handleDelete() {
    if (deleteId == null) return;
    try {
      await excluirInteracaoCliente(deleteId);
      toast.success('Interação removida');
      setDeleteId(null);
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Registrar */}
      <div className="card p-5 h-fit">
        <h3 className="text-sm font-semibold text-surface-700 mb-3">Registrar Interação</h3>
        <div className="flex gap-1 mb-2 flex-wrap">
          {TIPO_INTERACAO.map(t => (
            <button key={t.value} onClick={() => setTipo(t.value)} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${tipo === t.value ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-surface-50 text-surface-500 border border-transparent'}`}>
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>
        <textarea value={resumo} onChange={e => setResumo(e.target.value)} className="input-field h-16 resize-none text-sm mb-2" placeholder="O que aconteceu?" />
        <input value={resultado} onChange={e => setResultado(e.target.value)} className="input-field text-sm mb-2" placeholder="Resultado (opcional)" />
        <div className="mb-2">
          <label className="block text-2xs text-surface-400 mb-1">Agendar retorno (opcional)</label>
          <input type="date" value={agendado} onChange={e => setAgendado(e.target.value)} className="input-field text-sm" />
        </div>
        <button onClick={handleAdd} className="btn-primary w-full text-xs flex items-center justify-center gap-1.5">
          <Send className="w-3.5 h-3.5" /> Registrar
        </button>
      </div>

      {/* Histórico */}
      <div>
        <h3 className="text-sm font-semibold text-surface-700 mb-3">Linha do Tempo</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {interacoes.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-8">Nenhuma interação registrada ainda</p>
          ) : (
            interacoes.map(i => {
              const t = TIPO_INTERACAO.find(x => x.value === i.tipo);
              const Icon = t?.icon || StickyNote;
              return (
                <div key={i.id} className="flex gap-2 p-3 rounded-lg bg-surface-50 group">
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-surface-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-surface-700">{i.resumo}</p>
                    {i.resultado && <p className="text-2xs text-surface-500 mt-0.5">→ {i.resultado}</p>}
                    {i.agendado_para && (
                      <p className="text-2xs text-amber-600 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> Retorno: {i.agendado_para}
                      </p>
                    )}
                    <p className="text-2xs text-surface-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {formatDateTime(i.criado_em)}
                      {i.usuario_nome && ` · ${i.usuario_nome}`}
                    </p>
                  </div>
                  <button onClick={() => setDeleteId(i.id)} className="opacity-0 group-hover:opacity-100 p-1 text-surface-300 hover:text-red-500 transition-all h-fit">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Interação"
        variant="danger"
        icon="trash"
        confirmLabel="Excluir"
        message="Remover esta interação do histórico?"
      />
    </div>
  );
}

// ============================================
// ABA DOCUMENTOS
// ============================================
function DocumentosTab({ clienteId }: { clienteId: number }) {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [uploadModal, setUploadModal] = useState(false);
  const [tipoDoc, setTipoDoc] = useState(TIPO_DOCUMENTO[0]);
  const [arquivo, setArquivo] = useState<{ nome: string; conteudo: string; tamanho: number } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [clienteId]);

  async function load() {
    try { setDocumentos(await listarDocumentosCliente(clienteId) as any[]); } catch { /* */ }
  }

  function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setArquivo({ nome: file.name, conteudo: reader.result as string, tamanho: file.size });
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!arquivo) { toast.error('Selecione um arquivo'); return; }
    try {
      await adicionarDocumentoCliente({
        cliente_id: clienteId, tipo: tipoDoc,
        nome_arquivo: arquivo.nome, conteudo: arquivo.conteudo, tamanho: arquivo.tamanho,
      });
      toast.success('Documento adicionado');
      setUploadModal(false);
      setArquivo(null);
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handleBaixar(doc: any) {
    try {
      const conteudo = await obterDocumentoCliente(doc.id) as string;
      // conteudo é um data URL base64 (ex: "data:application/pdf;base64,XXXX").
      // Converte para bytes e usa o diálogo NATIVO do Tauri (a âncora <a download>
      // não funciona dentro do WebView do app empacotado).
      const base64 = conteudo.includes(',') ? conteudo.split(',')[1] : conteudo;
      const binaria = atob(base64);
      const bytes = new Uint8Array(binaria.length);
      for (let i = 0; i < binaria.length; i++) bytes[i] = binaria.charCodeAt(i);

      const ext = (doc.nome_arquivo?.split('.').pop() || 'dat').toLowerCase();
      const caminho = await salvarArquivoBinario(bytes, doc.nome_arquivo, [ext]);
      if (caminho) toastArquivoSalvo(caminho, 'Documento');
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handleDelete() {
    if (deleteId == null) return;
    try {
      await excluirDocumentoCliente(deleteId);
      toast.success('Documento removido');
      setDeleteId(null);
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  function formatTamanho(bytes?: number) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setUploadModal(true)} className="btn-primary text-xs flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Adicionar Documento
        </button>
      </div>

      {documentos.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <p className="text-sm text-surface-400">Nenhum documento anexado</p>
          <p className="text-xs text-surface-400 mt-1">Adicione RG, comprovantes, contracheques, etc.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Arquivo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Tamanho</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Adicionado</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {documentos.map(doc => (
                <tr key={doc.id} className="border-b border-surface-50 hover:bg-surface-50/50 group">
                  <td className="px-4 py-3"><span className="badge bg-brand-50 text-brand-700">{doc.tipo}</span></td>
                  <td className="px-4 py-3 text-surface-600">{doc.nome_arquivo}</td>
                  <td className="px-4 py-3 text-surface-400 text-xs">{formatTamanho(doc.tamanho)}</td>
                  <td className="px-4 py-3 text-surface-400 text-xs">{formatDateTime(doc.criado_em)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip content="Baixar documento">
                        <button onClick={() => handleBaixar(doc)} className="p-1.5 rounded-lg hover:bg-brand-50 text-surface-400 hover:text-brand-600">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Excluir documento">
                        <button onClick={() => setDeleteId(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500">
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

      {/* Modal upload */}
      <Modal open={uploadModal} onClose={() => { setUploadModal(false); setArquivo(null); }} title="Adicionar Documento" footer={
        <>
          <button onClick={() => { setUploadModal(false); setArquivo(null); }} className="btn-secondary">Cancelar</button>
          <button onClick={handleUpload} className="btn-primary">Adicionar</button>
        </>
      }>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Tipo de Documento</label>
            <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)} className="input-field">
              {TIPO_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Arquivo</label>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-surface-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all">
              {arquivo ? (
                <div>
                  <FileText className="w-7 h-7 text-brand-500 mx-auto mb-1" />
                  <p className="text-xs font-medium text-surface-700">{arquivo.nome}</p>
                  <p className="text-2xs text-surface-400">{formatTamanho(arquivo.tamanho)}</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-7 h-7 text-surface-300 mx-auto mb-1" />
                  <p className="text-xs text-surface-500">Clique para selecionar</p>
                  <p className="text-2xs text-surface-400 mt-0.5">PDF, imagens, até 5 MB</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Documento"
        variant="danger"
        icon="trash"
        confirmLabel="Excluir"
        message="Remover este documento permanentemente?"
      />
    </div>
  );
}
