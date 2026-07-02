import { useState, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MANUAL, MANUAL_CATEGORIAS, MANUAL_VERSAO, MANUAL_ATUALIZADO, ManualSection } from '../../lib/manual-content';
import { salvarArquivoBinario } from '../../lib/salvar-arquivo';
import { toastArquivoSalvo } from '../../lib/toast-arquivo';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { Search, BookOpen, Printer, FileDown, ChevronRight, X, Sparkles, Settings, Users, LayoutGrid, LifeBuoy } from 'lucide-react';
import toast from 'react-hot-toast';

// Ícone por categoria do manual
const CATEGORIA_ICON: Record<string, React.ElementType> = {
  'Introdução': Sparkles,
  'Sistema': Settings,
  'Acesso e Usuários': Users,
  'Módulos': LayoutGrid,
  'Suporte': LifeBuoy,
};

// Score de relevância para busca inteligente
function scoreSection(section: ManualSection, termo: string): number {
  if (!termo) return 0;
  const t = termo.toLowerCase().trim();
  const palavras = t.split(/\s+/).filter(Boolean);
  let score = 0;

  for (const palavra of palavras) {
    if (section.titulo.toLowerCase().includes(palavra)) score += 10;
    for (const kw of section.keywords) {
      if (kw.toLowerCase().includes(palavra)) score += 6;
    }
    if (section.categoria.toLowerCase().includes(palavra)) score += 3;
    // conteúdo (peso menor)
    const ocorrencias = (section.conteudo.toLowerCase().match(new RegExp(palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    score += Math.min(ocorrencias, 5);
  }
  return score;
}

export function ManualView() {
  const { nomeExibicao } = useEmpresa();
  const [busca, setBusca] = useState('');
  const [activeId, setActiveId] = useState<string>(MANUAL[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  // Resultados da busca (ordenados por relevância)
  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return null;
    return MANUAL
      .map(s => ({ section: s, score: scoreSection(s, busca) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.section);
  }, [busca]);

  const activeSection = MANUAL.find(s => s.id === activeId) || MANUAL[0];

  // Seções agrupadas por categoria (quando não há busca)
  const porCategoria = useMemo(() => {
    const map: Record<string, ManualSection[]> = {};
    for (const cat of MANUAL_CATEGORIAS) {
      map[cat] = MANUAL.filter(s => s.categoria === cat);
    }
    return map;
  }, []);

  function selectSection(id: string) {
    setActiveId(id);
    setBusca('');
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function exportarPDF() {
    toast.loading('Gerando PDF...', { id: 'pdf' });
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      // Monta o documento completo com todas as seções
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'padding:40px;font-family:system-ui,sans-serif;color:#1a1a1a;background:#fff;width:794px;';
      wrapper.innerHTML = `
        <div style="text-align:center;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid #2563eb;">
          <h1 style="font-size:28px;color:#2563eb;margin:0;">${nomeExibicao}</h1>
          <p style="color:#666;font-size:14px;margin:8px 0 0;">Manual do Sistema · Versão ${MANUAL_VERSAO} · ${MANUAL_ATUALIZADO}</p>
        </div>
      `;

      for (const section of MANUAL) {
        const div = document.createElement('div');
        div.className = 'manual-body';
        div.style.cssText = 'margin-bottom:32px;page-break-inside:avoid;';
        div.innerHTML = markdownToHtml(section.conteudo);
        wrapper.appendChild(div);
      }

      const opt = {
        margin: [10, 10, 10, 10],
        filename: 'CredHub-Manual.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] },
      };

      // Gera o PDF como ArrayBuffer (em vez de baixar direto via link âncora)
      const pdfBlob: Blob = await html2pdf().set(opt).from(wrapper).outputPdf('blob');
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Salva usando o diálogo nativo do Tauri (funciona no app desktop)
      const caminho = await salvarArquivoBinario(bytes, `${nomeExibicao.replace(/\s+/g, '-')}-Manual.pdf`, ['pdf']);
      toast.dismiss('pdf');
      if (caminho) {
        toastArquivoSalvo(caminho, 'Manual PDF');
      }
    } catch (err) {
      console.error('Erro PDF:', err);
      toast.error('Erro ao gerar PDF: ' + ((err as Error).message || 'desconhecido'), { id: 'pdf' });
    }
  }

  function imprimir() {
    window.print();
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-600" />
          <div>
            <h2 className="text-lg font-bold text-surface-900">Manual do CredHub</h2>
            <p className="text-2xs text-surface-400">Versão {MANUAL_VERSAO} · Atualizado em {MANUAL_ATUALIZADO}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={imprimir} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
          <button onClick={exportarPDF} className="btn-primary flex items-center gap-1.5 text-xs">
            <FileDown className="w-3.5 h-3.5" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Pesquisar no manual... (ex: esqueci senha, comissão, backup)"
          className="input-field pl-9 pr-9"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar de navegação / resultados */}
        <div className="w-72 shrink-0 overflow-y-auto card p-0">
          {resultadosBusca ? (
            <div className="p-3">
              <p className="text-2xs font-semibold text-surface-400 uppercase tracking-wider px-2 mb-2">
                {resultadosBusca.length} resultado{resultadosBusca.length !== 1 ? 's' : ''}
              </p>
              {resultadosBusca.length === 0 ? (
                <p className="text-xs text-surface-400 px-2 py-4">Nenhuma seção encontrada. Tente outro termo.</p>
              ) : (
                resultadosBusca.map(s => (
                  <button key={s.id} onClick={() => selectSection(s.id)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-100 transition-colors group mb-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-surface-700 group-hover:text-brand-700">{s.titulo}</span>
                      <ChevronRight className="w-3 h-3 text-surface-300" />
                    </div>
                    <span className="text-2xs text-surface-400">{s.categoria}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="py-2">
              {MANUAL_CATEGORIAS.map((cat, idx) => {
                const CatIcon = CATEGORIA_ICON[cat] || BookOpen;
                return (
                  <div key={cat} className={idx > 0 ? 'mt-1' : ''}>
                    {/* Cabeçalho de categoria com ícone e separador */}
                    <div className="flex items-center gap-2 px-4 py-2 mt-2">
                      <div className="w-5 h-5 rounded-md bg-brand-50 flex items-center justify-center shrink-0">
                        <CatIcon className="w-3 h-3 text-brand-600" />
                      </div>
                      <p className="text-2xs font-bold text-surface-500 uppercase tracking-wider">{cat}</p>
                      <div className="flex-1 h-px bg-surface-100" />
                    </div>
                    {/* Itens da categoria */}
                    <div className="px-2">
                      {porCategoria[cat]?.map(s => (
                        <button
                          key={s.id}
                          onClick={() => selectSection(s.id)}
                          className={`relative w-full text-left pl-4 pr-3 py-2 rounded-lg text-xs transition-all mb-0.5 ${
                            activeId === s.id
                              ? 'bg-brand-50 text-brand-700 font-semibold'
                              : 'text-surface-600 hover:bg-surface-50 font-medium'
                          }`}
                        >
                          {activeId === s.id && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-600 rounded-r-full" />
                          )}
                          {s.titulo}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div ref={contentRef} className="flex-1 overflow-y-auto card p-8" id="manual-print-content">
          <div className="manual-body max-w-2xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {activeSection.conteudo}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// Conversor simples de markdown para HTML (usado no PDF)
function markdownToHtml(md: string): string {
  let html = md.trim();
  // headers
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:22px;color:#2563eb;margin:24px 0 12px;">$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:18px;color:#1e293b;margin:20px 0 10px;">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:15px;color:#334155;margin:16px 0 8px;">$1</h3>');

  // Tabelas markdown (GFM): linha de cabeçalho, separador |---|, linhas de dados
  html = html.replace(/(^\|.+\|\n\|[\s:|-]+\|\n(?:\|.+\|\n?)+)/gm, (bloco) => {
    const linhas = bloco.trim().split('\n');
    const parseRow = (linha: string) => linha.split('|').slice(1, -1).map(c => c.trim());
    const headers = parseRow(linhas[0]);
    const dados = linhas.slice(2).map(parseRow);
    let tabela = '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;">';
    tabela += '<thead><tr>' + headers.map(h => `<th style="border:1px solid #e2e8f0;padding:6px 10px;background:#f1f5f9;text-align:left;font-weight:600;color:#334155;">${h.replace(/\*\*/g, '')}</th>`).join('') + '</tr></thead>';
    tabela += '<tbody>' + dados.map((linha, i) => '<tr style="background:' + (i % 2 ? '#f8fafc' : '#fff') + ';">' + linha.map(c => `<td style="border:1px solid #e2e8f0;padding:6px 10px;color:#475569;">${c.replace(/\*\*/g, '')}</td>`).join('') + '</tr>').join('') + '</tbody>';
    tabela += '</table>';
    return tabela;
  });

  // bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 5px;border-radius:4px;font-size:13px;">$1</code>');
  // blockquote
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #2563eb;padding-left:12px;color:#475569;margin:12px 0;">$1</blockquote>');
  // lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin:4px 0;">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0;">$1</li>');
  html = html.replace(/(<li.*?<\/li>\n?)+/g, m => `<ul style="margin:8px 0;padding-left:24px;">${m}</ul>`);
  // paragraphs
  html = html.split('\n\n').map(block => {
    if (block.match(/^<(h1|h2|h3|ul|blockquote|li|table)/)) return block;
    if (block.trim() === '') return '';
    return `<p style="margin:8px 0;line-height:1.7;color:#334155;">${block}</p>`;
  }).join('\n');
  return html;
}
