import { Usuario, Page } from '../../lib/types';
import { getPermissoes } from '../../lib/permissions';
import {
  LayoutDashboard, Users, FileText, Calculator, DollarSign,
  UserCheck, Target, BarChart3, Settings, LogOut, ChevronLeft, BookOpen, MessageSquarePlus, ScrollText
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { DashboardView } from '../dashboard/DashboardView';
import { ClientesView } from '../clientes/ClientesView';
import { ClienteDetalhes } from '../clientes/ClienteDetalhes';
import { PropostasView } from '../propostas/PropostasView';
import { ConfigView } from '../configuracoes/ConfigView';
import { FinanceiroView } from '../financeiro/FinanceiroView';
import { AgentesView } from '../agentes/AgentesView';
import { ManualView } from '../manual/ManualView';
import { SimuladorView } from '../simulador/SimuladorView';
import { ProspeccaoView } from '../prospeccao/ProspeccaoView';
import { RelatoriosView } from '../relatorios/RelatoriosView';
import { FeedbackView } from '../feedback/FeedbackView';
import { LogsView } from '../logs/LogsView';
import { useEmpresa } from '../../contexts/EmpresaContext';

interface Props {
  user: Usuario;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const NAV_ITEMS: { page: Page; label: string; icon: React.ElementType; section?: string }[] = [
  { page: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { page: 'clientes',      label: 'Clientes',      icon: Users,          section: 'Operação' },
  { page: 'propostas',     label: 'Propostas',     icon: FileText },
  { page: 'simulador',     label: 'Simulador',     icon: Calculator },
  { page: 'financeiro',    label: 'Financeiro',    icon: DollarSign,     section: 'Gestão' },
  { page: 'agentes',       label: 'Agentes',       icon: UserCheck },
  { page: 'prospeccao',    label: 'Prospecção',    icon: Target },
  { page: 'relatorios',    label: 'Relatórios',    icon: BarChart3,      section: 'Admin' },
  { page: 'logs',          label: 'Logs',          icon: ScrollText },
  { page: 'configuracoes', label: 'Configurações', icon: Settings },
  { page: 'manual',        label: 'Manual',        icon: BookOpen,       section: 'Ajuda' },
  { page: 'feedback',      label: 'Feedback',      icon: MessageSquarePlus },
];

const PERFIL_LABEL: Record<string, string> = { admin: 'Administrador', gerente: 'Gerente', agente: 'Agente' };

export function MainLayout({ user, currentPage, onNavigate, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [clienteDetalheId, setClienteDetalheId] = useState<number | null>(null);

  // Filtra os itens da sidebar pelas permissões do usuário
  // Configurações sempre aparece (todo mundo tem "Minha Conta")
  const permitidas = useMemo(() => {
    const perms = getPermissoes(user.perfil, user.permissoes);
    return new Set<Page>([...perms, 'configuracoes', 'manual', 'feedback']);
  }, [user.perfil, user.permissoes]);

  const visibleItems = NAV_ITEMS.filter(item => permitidas.has(item.page));

  // Se a página atual não é permitida, volta pro dashboard
  const safePage: Page = permitidas.has(currentPage) ? currentPage : 'dashboard';

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-50">
      {/* Barra superior com a cor da empresa */}
      <TopBar user={user} onLogout={onLogout} pageLabel={NAV_ITEMS.find(i => i.page === safePage)?.label || ''} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`${collapsed ? 'w-16' : 'w-56'} h-full bg-white border-r border-surface-200 flex flex-col transition-all duration-200 shrink-0`}>
          <nav className="flex-1 overflow-y-auto py-3 px-2">
            {visibleItems.map((item) => (
              <div key={item.page}>
                {item.section && !collapsed && (
                  <p className="text-2xs font-semibold text-surface-400 uppercase tracking-wider px-3 mt-4 mb-1.5">{item.section}</p>
                )}
              {item.section && collapsed && <div className="my-2 mx-2 h-px bg-surface-100" />}
                {item.section && collapsed && <div className="my-2 mx-2 h-px bg-surface-100" />}
                <button
                  onClick={() => { setClienteDetalheId(null); onNavigate(item.page); }}
                  className={`sidebar-item w-full ${safePage === item.page ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </div>
            ))}
          </nav>

          <div className="border-t border-surface-100 p-2 shrink-0">
            <button onClick={() => setCollapsed(!collapsed)} className="sidebar-item w-full justify-center" title={collapsed ? 'Expandir' : 'Recolher'}>
              <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            {clienteDetalheId !== null ? (
              <ClienteDetalhes
                clienteId={clienteDetalheId}
                currentUser={user}
                onBack={() => setClienteDetalheId(null)}
              />
            ) : (
              <PageContent page={safePage} user={user} onOpenCliente={setClienteDetalheId} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// Barra superior com a cor da empresa
function TopBar({ user, onLogout, pageLabel }: { user: Usuario; onLogout: () => void; pageLabel: string }) {
  const { empresa, nomeExibicao } = useEmpresa();
  const cor = empresa.cor_primaria || '#2563eb';
  const inicial = nomeExibicao.charAt(0).toUpperCase();

  // Decide o que mostrar: logo horizontal, ícone quadrado, ou inicial
  const usarLogoHorizontal = empresa.modo_exibicao === 'logo' && empresa.logo_horizontal;

  return (
    <header className="h-14 flex items-center justify-between px-4 shrink-0 shadow-sm" style={{ backgroundColor: cor }}>
      {/* Logo + nome da empresa */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {usarLogoHorizontal ? (
          // Logo retangular/paisagem — altura limitada, largura proporcional
          <img src={empresa.logo_horizontal} alt={nomeExibicao} className="h-9 max-w-[200px] object-contain" />
        ) : (
          <>
            {empresa.logo ? (
              <div className="w-9 h-9 rounded-lg bg-white/15 overflow-hidden flex items-center justify-center shrink-0">
                <img src={empresa.logo} alt={nomeExibicao} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-white text-base font-bold">{inicial}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">{nomeExibicao}</p>
              {empresa.slogan && <p className="text-white/70 text-2xs leading-tight truncate">{empresa.slogan}</p>}
            </div>
          </>
        )}
      </div>

      {/* Página atual (centro) */}
      <div className="hidden md:block text-white/90 text-sm font-medium px-4 shrink-0">{pageLabel}</div>

      {/* Usuário + sair */}
      <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
        <div className="text-right min-w-0">
          <p className="text-xs font-medium text-white truncate">{user.nome}</p>
          <p className="text-2xs text-white/70">{PERFIL_LABEL[user.perfil]}</p>
        </div>
        <button onClick={onLogout} className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors shrink-0" title="Sair">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function PageContent({ page, user, onOpenCliente }: { page: Page; user: Usuario; onOpenCliente: (id: number) => void }) {
  switch (page) {
    case 'dashboard': return <DashboardView />;
    case 'clientes': return <ClientesView onOpenDetalhes={onOpenCliente} />;
    case 'propostas': return <PropostasView />;
    case 'configuracoes': return <ConfigView currentUser={user} />;
    case 'financeiro': return <FinanceiroView />;
    case 'agentes': return <AgentesView />;
    case 'manual': return <ManualView />;
    case 'simulador': return <SimuladorView />;
    case 'prospeccao': return <ProspeccaoView currentUser={user} />;
    case 'relatorios': return <RelatoriosView currentUser={user} />;
    case 'feedback': return <FeedbackView currentUser={user} />;
    case 'logs': return <LogsView currentUser={user} />;
    default:
      return <DashboardView />;
  }
}
