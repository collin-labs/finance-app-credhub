// ============================================
// SALVAR ARQUIVOS — usa API nativa do Tauri
// Retorna o caminho salvo para permitir "abrir arquivo/pasta"
// ============================================

export type ResultadoSalvar = string | null;

/**
 * Salva um arquivo de texto (CSV, TXT) usando o diálogo nativo do Tauri.
 * Retorna o caminho salvo, ou null se cancelou.
 */
export async function salvarArquivoTexto(conteudo: string, nomeSugerido: string, extensoes: string[] = ['csv']): Promise<ResultadoSalvar> {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');

    const caminho = await save({
      defaultPath: nomeSugerido,
      filters: [{ name: extensoes[0].toUpperCase(), extensions: extensoes }],
    });

    if (!caminho) return null;

    await writeTextFile(caminho, '\uFEFF' + conteudo);
    return caminho;
  } catch {
    try {
      const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeSugerido;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return nomeSugerido;
    } catch {
      return null;
    }
  }
}

/**
 * Salva um arquivo binário (PDF) usando o diálogo nativo do Tauri.
 * Retorna o caminho salvo, ou null se cancelou.
 */
export async function salvarArquivoBinario(bytes: Uint8Array, nomeSugerido: string, extensoes: string[] = ['pdf']): Promise<ResultadoSalvar> {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    const caminho = await save({
      defaultPath: nomeSugerido,
      filters: [{ name: extensoes[0].toUpperCase(), extensions: extensoes }],
    });

    if (!caminho) return null;

    await writeFile(caminho, bytes);
    return caminho;
  } catch {
    try {
      const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeSugerido;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return nomeSugerido;
    } catch {
      return null;
    }
  }
}

/**
 * Abre o arquivo no programa padrão do sistema.
 * Usa comando Rust próprio (mais confiável), com fallback pro plugin.
 */
export async function abrirArquivo(caminho: string): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('abrir_arquivo_sistema', { caminho });
  } catch (e) {
    // Fallback pro plugin opener
    const { openPath } = await import('@tauri-apps/plugin-opener');
    await openPath(caminho);
  }
}

/**
 * Abre a pasta que contém o arquivo, destacando-o (Explorer no Windows).
 * Usa comando Rust próprio (mais confiável), com fallback pro plugin.
 */
export async function abrirPasta(caminho: string): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('abrir_pasta_sistema', { caminho });
  } catch (e) {
    const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
    await revealItemInDir(caminho);
  }
}
