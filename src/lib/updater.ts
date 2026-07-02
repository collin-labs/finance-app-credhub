// ============================================
// AUTO-UPDATE — wrapper do tauri-plugin-updater
// ============================================
// Isola as chamadas ao plugin para o resto do app não depender
// diretamente das APIs do Tauri. Facilita reuso em outros projetos.

export interface UpdateInfo {
  disponivel: boolean;
  versao?: string;
  versaoAtual?: string;
  notas?: string;
  data?: string;
}

export type ProgressoCallback = (baixado: number, total: number | null) => void;

// Guarda o objeto Update entre o check e o download
let updatePendente: unknown = null;

/**
 * Verifica se há atualização disponível.
 * Retorna info da versão nova, ou { disponivel: false }.
 */
export async function verificarAtualizacao(): Promise<UpdateInfo> {
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const { getVersion } = await import('@tauri-apps/api/app');
    const versaoAtual = await getVersion();

    const update = await check();
    if (update && update.available) {
      updatePendente = update;
      return {
        disponivel: true,
        versao: update.version,
        versaoAtual,
        notas: update.body || undefined,
        data: update.date || undefined,
      };
    }
    return { disponivel: false, versaoAtual };
  } catch (e) {
    // Sem conexão, sem release, ou rodando fora do Tauri
    throw new Error((e as Error).message || 'Falha ao verificar atualizações');
  }
}

/**
 * Baixa e instala a atualização pendente (precisa chamar verificarAtualizacao antes).
 * O onProgresso é chamado durante o download.
 * Após instalar, o app é reiniciado automaticamente.
 */
export async function baixarInstalarAtualizacao(onProgresso?: ProgressoCallback): Promise<void> {
  if (!updatePendente) {
    throw new Error('Nenhuma atualização pendente. Verifique primeiro.');
  }

  const update = updatePendente as {
    downloadAndInstall: (cb: (event: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void) => Promise<void>;
  };

  let baixado = 0;
  let total: number | null = null;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        total = event.data?.contentLength ?? null;
        baixado = 0;
        break;
      case 'Progress':
        baixado += event.data?.chunkLength ?? 0;
        onProgresso?.(baixado, total);
        break;
      case 'Finished':
        onProgresso?.(total ?? baixado, total);
        break;
    }
  });

  // Reinicia o app para aplicar (no Windows o app já foi fechado pelo instalador,
  // mas relaunch garante o comportamento correto em todos os casos)
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

/**
 * Retorna a versão atual do app.
 */
export async function obterVersaoAtual(): Promise<string> {
  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    return await getVersion();
  } catch {
    return '1.1.0';
  }
}
