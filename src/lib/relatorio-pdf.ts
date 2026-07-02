import { salvarArquivoBinario } from './salvar-arquivo';
import { EmpresaIdentidade } from '../contexts/EmpresaContext';

interface SecaoPDF {
  titulo: string;
  // Cards de destaque (label + valor)
  cards?: { label: string; valor: string }[];
  // Tabelas (cabeçalhos + linhas)
  tabelas?: { titulo: string; colunas: string[]; linhas: string[][] }[];
}

interface OpcoesPDF {
  empresa: EmpresaIdentidade;
  nomeEmpresa: string;
  titulo: string;        // ex: "Relatório de Produção"
  periodo: string;       // ex: "Junho/2026" ou "Todo o período"
  secoes: SecaoPDF[];
}

/**
 * Gera um PDF de relatório formatado com a identidade da empresa e salva via Tauri.
 */
export async function gerarRelatorioPDF(opcoes: OpcoesPDF): Promise<string | null> {
  const html2pdf = (await import('html2pdf.js')).default;
  const { empresa, nomeEmpresa, titulo, periodo, secoes } = opcoes;
  const cor = empresa.cor_primaria || '#2563eb';
  const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'padding:36px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;background:#fff;width:794px;';

  // Cabeçalho com identidade
  const logoHtml = empresa.logo
    ? `<img src="${empresa.logo}" style="height:48px;object-fit:contain;" />`
    : `<div style="width:48px;height:48px;border-radius:10px;background:${cor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:bold;">${nomeEmpresa.charAt(0).toUpperCase()}</div>`;

  wrapper.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${cor};padding-bottom:16px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${logoHtml}
        <div>
          <div style="font-size:20px;font-weight:bold;color:${cor};">${nomeEmpresa}</div>
          ${empresa.cnpj ? `<div style="font-size:11px;color:#64748b;">CNPJ: ${empresa.cnpj}</div>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:16px;font-weight:600;color:#1e293b;">${titulo}</div>
        <div style="font-size:11px;color:#64748b;">Período: ${periodo}</div>
        <div style="font-size:10px;color:#94a3b8;">Gerado em ${dataGeracao}</div>
      </div>
    </div>
  `;

  for (const secao of secoes) {
    const div = document.createElement('div');
    div.style.cssText = 'margin-bottom:24px;page-break-inside:avoid;';

    let html = `<h2 style="font-size:15px;color:${cor};margin:0 0 12px;border-left:3px solid ${cor};padding-left:8px;">${secao.titulo}</h2>`;

    // Cards
    if (secao.cards && secao.cards.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">';
      for (const card of secao.cards) {
        html += `
          <div style="flex:1;min-width:130px;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;background:#f8fafc;">
            <div style="font-size:10px;color:#64748b;">${card.label}</div>
            <div style="font-size:16px;font-weight:bold;color:#1e293b;margin-top:2px;">${card.valor}</div>
          </div>
        `;
      }
      html += '</div>';
    }

    // Tabelas
    if (secao.tabelas) {
      for (const tabela of secao.tabelas) {
        if (tabela.linhas.length === 0) continue;
        html += `<div style="font-size:12px;font-weight:600;color:#334155;margin:10px 0 6px;">${tabela.titulo}</div>`;
        html += '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;">';
        html += '<thead><tr>';
        for (const col of tabela.colunas) {
          html += `<th style="border:1px solid #e2e8f0;padding:5px 8px;background:#f1f5f9;text-align:left;font-weight:600;color:#334155;">${col}</th>`;
        }
        html += '</tr></thead><tbody>';
        tabela.linhas.forEach((linha, i) => {
          html += `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'};">`;
          linha.forEach((celula, j) => {
            const align = j === 0 ? 'left' : 'right';
            html += `<td style="border:1px solid #e2e8f0;padding:5px 8px;text-align:${align};color:#475569;">${celula}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
      }
    }

    div.innerHTML = html;
    wrapper.appendChild(div);
  }

  // Rodapé
  const rodape = document.createElement('div');
  rodape.style.cssText = 'margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;';
  rodape.innerHTML = `${nomeEmpresa}${empresa.telefone ? ' · ' + empresa.telefone : ''}${empresa.email ? ' · ' + empresa.email : ''}`;
  wrapper.appendChild(rodape);

  const opt = {
    margin: [10, 10, 10, 10],
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css'] },
  };

  const pdfBlob: Blob = await html2pdf().set(opt).from(wrapper).outputPdf('blob');
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const nomeArquivo = `${titulo.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return salvarArquivoBinario(bytes, nomeArquivo, ['pdf']);
}