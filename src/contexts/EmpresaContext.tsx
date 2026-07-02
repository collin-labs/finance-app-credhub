import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../lib/api';

export interface EmpresaIdentidade {
  nome?: string;
  slogan?: string;
  sobre?: string;
  cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  site?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  logo?: string;
  logo_horizontal?: string;  // logo retangular/paisagem (opcional)
  favicon?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  modo_exibicao?: string;    // 'icone' | 'logo' — o que mostrar na barra/sidebar
}

interface EmpresaContextValue {
  empresa: EmpresaIdentidade;
  nomeExibicao: string;       // nome da empresa ou "CredHub"
  loading: boolean;
  recarregar: () => Promise<void>;
}

const DEFAULT_NOME = 'CredHub';

const EmpresaContext = createContext<EmpresaContextValue>({
  empresa: {},
  nomeExibicao: DEFAULT_NOME,
  loading: true,
  recarregar: async () => {},
});

export function useEmpresa() {
  return useContext(EmpresaContext);
}

// Aplica a cor primária como variável CSS e atualiza o favicon
function aplicarTema(empresa: EmpresaIdentidade) {
  // Cor primária → sobrescreve a marca via CSS custom property
  if (empresa.cor_primaria) {
    document.documentElement.style.setProperty('--cor-empresa', empresa.cor_primaria);
  }
  // Favicon dinâmico
  if (empresa.favicon) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = empresa.favicon;
  }
  // Título da janela (nativo do Windows + aba do navegador)
  if (empresa.nome) {
    const titulo = empresa.nome;
    document.title = titulo;
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      try {
        getCurrentWindow().setTitle(titulo);
      } catch { /* não-Tauri */ }
    }).catch(() => {});
  }
  // Ícone da janela (barra de título + taskbar do Windows, em runtime).
  // Só PNG/ICO são decodificados pelo Tauri (features image-png / image-ico).
  // O ícone do .exe no Explorador/atalho é fixado no build — ver COMO-BUILD-PERSONALIZADO.md
  const icone = empresa.favicon || empresa.logo;
  if (icone && (icone.startsWith('data:image/png') || icone.startsWith('data:image/x-icon') || icone.startsWith('data:image/vnd.microsoft.icon'))) {
    try {
      const base64 = icone.includes(',') ? icone.split(',')[1] : icone;
      const binaria = atob(base64);
      const bytes = new Uint8Array(binaria.length);
      for (let i = 0; i < binaria.length; i++) bytes[i] = binaria.charCodeAt(i);
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().setIcon(bytes).catch(() => { /* formato não suportado */ });
      }).catch(() => {});
    } catch { /* base64 inválido — ignora */ }
  }
}

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaIdentidade>({});
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      const data = await api<EmpresaIdentidade>('obter_identidade_empresa');
      setEmpresa(data || {});
      aplicarTema(data || {});
    } catch {
      setEmpresa({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const nomeExibicao = empresa.nome?.trim() || DEFAULT_NOME;

  return (
    <EmpresaContext.Provider value={{ empresa, nomeExibicao, loading, recarregar }}>
      {children}
    </EmpresaContext.Provider>
  );
}
