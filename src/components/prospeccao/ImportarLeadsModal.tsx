import { useState } from 'react';
import { importarLeads } from '../../lib/api';
import { Modal } from '../shared/Modal';
import { stripNonDigits } from '../../lib/formatters';
import { MODELO_PREENCHIDO, MODELO_VAZIO, COLUNAS_MODELO, LINHAS_EXEMPLO_VISUAL, baixarCSV } from '../../lib/csv-modelo';
import { toastArquivoSalvo } from '../../lib/toast-arquivo';
import toast from 'react-hot-toast';
import { FileSpreadsheet, ArrowRight, CheckCircle2, AlertCircle, Download, FileDown } from 'lucide-react';

interface Props {
  campanhaId?: number;
  campanhas: any[];
  onClose: () => void;
  onImported: () => void;
}

// Campos do sistema que podem ser mapeados
const CAMPOS = [
  { key: 'nome', label: 'Nome', obrigatorio: true },
  { key: 'cpf', label: 'CPF', obrigatorio: false },
  { key: 'telefone1', label: 'Telefone', obrigatorio: false },
  { key: 'whatsapp', label: 'WhatsApp', obrigatorio: false },
  { key: 'convenio_nome', label: 'Convênio', obrigatorio: false },
  { key: 'matricula', label: 'Matrícula/NB', obrigatorio: false },
  { key: 'beneficio', label: 'Benefício', obrigatorio: false },
  { key: 'renda_estimada', label: 'Renda', obrigatorio: false },
  { key: 'margem_estimada', label: 'Margem', obrigatorio: false },
];

// Detecta automaticamente colunas comuns
function autoMap(header: string): string {
  const h = header.toLowerCase().trim();
  if (h.includes('nome')) return 'nome';
  if (h.includes('cpf')) return 'cpf';
  if (h.includes('whats')) return 'whatsapp';
  if (h.includes('cel') || h.includes('tel') || h.includes('fone')) return 'telefone1';
  if (h.includes('conv')) return 'convenio_nome';
  if (h.includes('matr') || h.includes('benef') && h.includes('nb')) return 'matricula';
  if (h.includes('benef')) return 'beneficio';
  if (h.includes('renda') || h.includes('salar')) return 'renda_estimada';
  if (h.includes('margem')) return 'margem_estimada';
  return '';
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  // Detecta separador (; ou ,)
  const firstLine = text.split('\n')[0];
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

  const lines = text.split('\n').filter(l => l.trim());
  const parseLine = (line: string) => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === sep && !inQuotes) { result.push(cur.trim()); cur = ''; }
      else cur += char;
    }
    result.push(cur.trim());
    return result.map(c => c.replace(/^"|"$/g, ''));
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export function ImportarLeadsModal({ campanhaId, campanhas, onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'mapear'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapeamento, setMapeamento] = useState<Record<string, number>>({});
  const [campanhaDestino, setCampanhaDestino] = useState<number | undefined>(campanhaId);
  const [importing, setImporting] = useState(false);

  function handleFile(file: File) {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast.error('Use um arquivo CSV. Se tiver Excel, salve como CSV primeiro.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { headers, rows } = parseCSV(reader.result as string);
        if (headers.length === 0 || rows.length === 0) {
          toast.error('Arquivo vazio ou inválido');
          return;
        }
        setHeaders(headers);
        setRows(rows);
        // Auto-mapeia
        const auto: Record<string, number> = {};
        headers.forEach((h, i) => {
          const campo = autoMap(h);
          if (campo && auto[campo] === undefined) auto[campo] = i;
        });
        setMapeamento(auto);
        setStep('mapear');
      } catch {
        toast.error('Erro ao ler o arquivo');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function handleImport() {
    if (mapeamento.nome === undefined) {
      toast.error('Mapeie pelo menos a coluna de Nome');
      return;
    }
    setImporting(true);
    try {
      const linhas = rows.map(row => {
        const obj: any = {};
        for (const campo of CAMPOS) {
          const idx = mapeamento[campo.key];
          if (idx !== undefined && row[idx]) {
            let val: any = row[idx].trim();
            if (campo.key === 'cpf' || campo.key === 'telefone1' || campo.key === 'whatsapp') {
              val = stripNonDigits(val);
            } else if (campo.key === 'renda_estimada' || campo.key === 'margem_estimada') {
              val = parseFloat(val.replace(/[^\d,.-]/g, '').replace(',', '.')) || undefined;
            }
            obj[campo.key] = val;
          }
        }
        return obj;
      }).filter(o => o.nome);

      const result = await importarLeads(campanhaDestino, linhas) as { importados: number; ignorados: number };
      toast.success(`${result.importados} leads importados${result.ignorados > 0 ? `, ${result.ignorados} ignorados (duplicados/inválidos)` : ''}`);
      onImported();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Importar Mailing" width="lg" footer={
      step === 'mapear' ? (
        <>
          <button onClick={() => setStep('upload')} className="btn-secondary">Voltar</button>
          <button onClick={handleImport} disabled={importing} className="btn-primary">
            {importing ? 'Importando...' : `Importar ${rows.length} leads`}
          </button>
        </>
      ) : (
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
      )
    }>
      {step === 'upload' ? (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-semibold mb-1">Formato do arquivo</p>
              <p>Use um arquivo <strong>CSV</strong> com cabeçalho na primeira linha. Se você tem uma planilha Excel, abra e salve como "CSV (separado por vírgulas)". O sistema detecta as colunas automaticamente.</p>
            </div>
          </div>

          {/* Botões de download dos modelos — perto do upload (boa prática) */}
          <div className="bg-surface-50 border border-surface-100 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-surface-600 mb-2 flex items-center gap-1.5">
              <FileDown className="w-3.5 h-3.5" /> Não sabe como montar o arquivo? Baixe um modelo:
            </p>
            <div className="flex gap-2">
              <button onClick={async () => { const c = await baixarCSV(MODELO_PREENCHIDO, 'modelo-mailing-exemplo.csv'); if (c) toastArquivoSalvo(c, 'Modelo'); }} className="btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center">
                <Download className="w-3 h-3" /> Modelo com exemplos
              </button>
              <button onClick={async () => { const c = await baixarCSV(MODELO_VAZIO, 'modelo-mailing-vazio.csv'); if (c) toastArquivoSalvo(c, 'Modelo'); }} className="btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center">
                <Download className="w-3 h-3" /> Modelo em branco
              </button>
            </div>
            <p className="text-2xs text-surface-400 mt-2">Abra o modelo no Excel, substitua pelos seus dados e salve. Depois selecione o arquivo aqui.</p>
          </div>

          {/* Tabela visual de exemplo */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-surface-600 mb-2">Veja como o arquivo deve ficar:</p>
            <div className="border border-surface-100 rounded-lg overflow-x-auto">
              <table className="w-full text-2xs">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-100">
                    {COLUNAS_MODELO.map(c => (
                      <th key={c.campo} className="text-left px-2 py-1.5 text-surface-600 font-semibold whitespace-nowrap">
                        {c.label}{c.obrigatorio && <span className="text-red-500">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LINHAS_EXEMPLO_VISUAL.map((linha, i) => (
                    <tr key={i} className="border-b border-surface-50">
                      {COLUNAS_MODELO.map(c => (
                        <td key={c.campo} className="px-2 py-1.5 text-surface-500 whitespace-nowrap">{(linha as any)[c.campo]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-2xs text-surface-400 mt-1.5"><span className="text-red-500">*</span> Apenas o nome é obrigatório. As demais colunas são opcionais — quanto mais preencher, melhor.</p>
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-surface-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all">
              <FileSpreadsheet className="w-10 h-10 text-surface-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-surface-700">Clique para selecionar o arquivo CSV</p>
              <p className="text-xs text-surface-400 mt-1">ou arraste aqui</p>
            </div>
            <input type="file" accept=".csv,.txt" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <div>
          {/* Campanha de destino */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-surface-600 mb-1">Importar para a campanha</label>
            <select value={campanhaDestino ?? ''} onChange={e => setCampanhaDestino(e.target.value ? parseInt(e.target.value) : undefined)} className="input-field">
              <option value="">Sem campanha (avulso)</option>
              {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-700">{rows.length} linhas encontradas. Confira o mapeamento das colunas:</span>
          </div>

          {/* Mapeamento de colunas */}
          <div className="space-y-2 mb-4">
            {CAMPOS.map(campo => (
              <div key={campo.key} className="flex items-center gap-3">
                <div className="w-32 text-xs font-medium text-surface-600 flex items-center gap-1">
                  {campo.label}
                  {campo.obrigatorio && <span className="text-red-500">*</span>}
                </div>
                <ArrowRight className="w-3 h-3 text-surface-300" />
                <select
                  value={mapeamento[campo.key] ?? ''}
                  onChange={e => setMapeamento({ ...mapeamento, [campo.key]: e.target.value === '' ? undefined as any : parseInt(e.target.value) })}
                  className="input-field text-xs py-1.5 flex-1"
                >
                  <option value="">— Ignorar —</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Prévia */}
          <div className="border border-surface-100 rounded-lg overflow-hidden">
            <p className="text-2xs font-medium text-surface-500 px-3 py-2 bg-surface-50">Prévia (primeiras 3 linhas)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-2xs">
                <thead>
                  <tr className="border-b border-surface-100">
                    {CAMPOS.filter(c => mapeamento[c.key] !== undefined).map(c => (
                      <th key={c.key} className="text-left px-2 py-1.5 text-surface-500">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-b border-surface-50">
                      {CAMPOS.filter(c => mapeamento[c.key] !== undefined).map(c => (
                        <td key={c.key} className="px-2 py-1.5 text-surface-600">{row[mapeamento[c.key]] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
