import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { checkSetup, fazerBackupAutomatico, setUsuarioSessao, reenviarPendentes } from './lib/api';
import { Usuario, Page } from './lib/types';
import { SetupWizard } from './components/auth/SetupWizard';
import { LoginScreen } from './components/auth/LoginScreen';
import { MainLayout } from './components/layout/MainLayout';
import { SplashScreen } from './components/auth/SplashScreen';
import { UpdateChecker } from './components/shared/UpdateChecker';
import { EmpresaProvider } from './contexts/EmpresaContext';

type AppState = 'loading' | 'setup' | 'login' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<Usuario | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    async function init() {
      try {
        const hasAdmin = await checkSetup();
        if (!hasAdmin) {
          setAppState('setup');
        } else {
          setAppState('login');
        }
      } catch {
        // Se deu erro, provavelmente é primeira execução
        setAppState('setup');
      }
    }
    // Simular splash de 1s
    setTimeout(init, 1000);
  }, []);

  // Backup automático ao fechar o app (mantém os 2 mais recentes)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    async function setupCloseHandler() {
      // Só ativa backup automático depois que o usuário logou (banco já tem dados)
      if (appState !== 'app') return;
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        unlisten = await win.onCloseRequested(async (event) => {
          try {
            // Previne o fechamento até o backup terminar
            event.preventDefault();
            await fazerBackupAutomatico(2);
          } catch {
            // Se falhar o backup, fecha mesmo assim
          } finally {
            // Fecha de verdade
            await win.destroy();
          }
        });
      } catch {
        // Não está em ambiente Tauri ou erro — ignora
      }
    }
    setupCloseHandler();
    return () => { if (unlisten) unlisten(); };
  }, [appState]);

  function handleSetupComplete(usuario: Usuario) {
    setUsuarioSessao(usuario.id);
    setUser(usuario);
    setAppState('app');
  }

  function handleLoginSuccess(usuario: Usuario) {
    setUsuarioSessao(usuario.id);
    setUser(usuario);
    setAppState('app');
    // Reenvia feedbacks pendentes em background (silencioso)
    reenviarPendentes().catch(() => {});
  }

  function handleLogout() {
    setUsuarioSessao(null);
    setUser(null);
    setAppState('login');
  }

  return (
    <EmpresaProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontFamily: 'inherit', fontSize: '0.875rem' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      {appState === 'loading' && <SplashScreen />}
      {appState === 'setup' && <SetupWizard onComplete={handleSetupComplete} />}
      {appState === 'login' && <LoginScreen onLogin={handleLoginSuccess} />}
      {appState === 'app' && user && (
        <>
          <MainLayout
            user={user}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
          />
          <UpdateChecker />
        </>
      )}
    </EmpresaProvider>
  );
}
